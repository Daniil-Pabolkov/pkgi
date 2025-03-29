import vscode from 'vscode';

import { Scanner } from './scanner';

export function activate(context: vscode.ExtensionContext) {
   const scanner = new Scanner();

   context.subscriptions.push(...scanner.disposableItems());

   context.subscriptions.push(
      vscode.commands.registerCommand('pkgi.inspect', () => {
         scanner.force();
      })
   );

   scanner.force();
}

export function deactivate() { }
