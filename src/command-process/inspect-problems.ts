import vscode from 'vscode';
import type {Inspector} from '../core';
import {notifyByResults} from '../core/notifications/problems-notify';

export async function inspectProblems(inspector: Inspector, commandDispone: vscode.Disposable) {
   if (inspector.isEmpty) {
      return;
   }

   const {promise, resolve} = Promise.withResolvers();

   vscode.window.withProgress(
      {
         location: vscode.ProgressLocation.Notification,
         title: 'Scan problems',
      },
      (progress) => {
         inspector.onProgress((increment) => {
            progress.report({
               increment,
               message: `[${inspector.progress.current} / ${inspector.progress.max}]`,
            });
         });

         return promise;
      }
   );

   const result = await inspector.scan();
   resolve(result);

   for (const [workspaceFolder, scanResult] of result) {
      notifyByResults(scanResult, inspector.size === 1 ? void 0 : workspaceFolder);
   }
}
