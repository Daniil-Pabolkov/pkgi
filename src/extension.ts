import vscode from 'vscode';
import { inspectProblems } from './command-process/inspect-problems';
import { Inspector } from './core';

export function activate(context: vscode.ExtensionContext) {
   const inspector = new Inspector();
   context.globalState.update('inspector', inspector);

   vscode.workspace.workspaceFolders?.forEach(folder => {
      inspector.addFolder(folder);
   });

   vscode.workspace.onDidChangeWorkspaceFolders((event) => {
      event.added.forEach((folder) => {
         inspector.addFolder(folder);
      });
      event.removed.forEach((folder) => {
         inspector.removeFolder(folder);
      });
   });

   const inspectCommand = vscode.commands.registerCommand('pkgi.inspect', () => {
      inspectProblems(inspector, inspectCommand);
   });

   context.subscriptions.push(inspectCommand);
}

export function deactivate() { }
