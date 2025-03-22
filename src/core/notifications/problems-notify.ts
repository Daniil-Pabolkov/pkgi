import vscode from 'vscode';
import path from 'path';

import type { ScanResult } from '../scan-result';
import { NotifyActions } from './consts';

function withPlural(
   count: number,
   word: string,
   fn: (count: number, word: string) => string
) {
   return fn(count, count > 1 ? word + 's' : word);
}

function withPluralFactory(
   word: string,
   fn: (count: number, word: string) => string
) {
   return (count: number) => withPlural(count, word, fn);
}

function countWord(count: number, word: string) {
   return `${count} ${word}`;
}

const problems = withPluralFactory('problem', countWord);
const packages = withPluralFactory('package', countWord);

export async function notifyByResults(
   scanResults: ScanResult,
   projectPath?: string,
   workspaceFolder?: vscode.WorkspaceFolder
) {
   const totalCount = scanResults.missing.length + scanResults.invalid.length + scanResults.extraneous.length;

   if (totalCount === 0) {
      return 0;
   }

   const hasFatals = 0 < (scanResults.missing.length + scanResults.invalid.length);
   const relativePath = workspaceFolder
      ? (!projectPath || workspaceFolder.uri.fsPath === projectPath
         ? workspaceFolder.name
         : path.relative(path.join(workspaceFolder.uri.fsPath, '..'), projectPath))
      : projectPath;

   let message = `Found ${problems(totalCount)}`;

   if (relativePath) {
      message += ` in "${relativePath}"`;
   }

   const list = [];

   if (scanResults.missing.length) {
      list.push(`${scanResults.missing.length} missing`);
   }

   if (scanResults.invalid.length) {
      list.push(`${scanResults.invalid.length} invalid versions`);
   }

   if (scanResults.extraneous.length) {
      list.push(`${scanResults.extraneous.length} extraneous`);
   }

   message += ': ' + list.join('; ');

   let action: NotifyActions | undefined;

   if (hasFatals) {
      action = await vscode.window.showErrorMessage(message, NotifyActions.Close, NotifyActions.OpenTerminal);
   } else {
      action = await vscode.window.showWarningMessage(message, NotifyActions.Close, NotifyActions.OpenTerminal);
   }

   if (action === NotifyActions.OpenTerminal) {
      const tmlMessage = (
         `${problems(totalCount)} founds`
         + (relativePath ? ` in "${relativePath}"` : '')
         + ':\n\r'
         + `\tMissing:    ${packages(scanResults.missing.length)}\n\r`
         + `\tInvalid:    ${packages(scanResults.invalid.length)}\n\r`
         + `\tExtraneous: ${packages(scanResults.extraneous.length)}\n\n`
      );

      // todo: Нужно не пересоздавать каждый раз, а переиспользоваться как-то, либо убрать сия функцию.
      const terminal = vscode.window.createTerminal({
         name: relativePath ?? problems(totalCount),
         cwd: projectPath ?? process.cwd(),
         message: tmlMessage,
         isTransient: false,
         hideFromUser: true,
      });
      terminal.show();
   }

   return totalCount;
}
