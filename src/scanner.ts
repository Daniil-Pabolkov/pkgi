import vscode from 'vscode';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import type { ScanResult } from './core/scan-result';
import { notifyByResults } from './core/notifications/problems-notify';
import { ScanTask } from './scan-task';

export class Scanner {
   readonly packageJsonWatcher = vscode.workspace.createFileSystemWatcher('**/package.json');
   readonly lockFilesWatcher = vscode.workspace.createFileSystemWatcher('**/package-lock.json');
   readonly nodeModulesWatcher = vscode.workspace.createFileSystemWatcher('**/node_modules/**');

   private readonly _projectScanners = new Map<string, ScanTask>();
   private readonly _results = new Map<string, ScanResult>();
   private readonly _runedTasks = new Set<ScanTask>();

   private readonly _workspaceByProjectRoot = new Map<string, vscode.WorkspaceFolder>();

   private _progressPromise: Promise<void> = Promise.resolve();
   private _progressResolver?: () => void;

   // package.json full path => package.json dependencies hash
   private packageJsonHashMap = new Map<string, string>();

   constructor() {
      // package.json
      this.packageJsonWatcher.onDidChange(changedFile => {
         try {
            const packageJson = JSON.parse(fs.readFileSync(changedFile.fsPath, 'utf-8'));
            const {dependencies, devDependencies, peerDependencies} = packageJson;
            const hash = crypto.hash('md5', JSON.stringify(dependencies) + JSON.stringify(devDependencies) + JSON.stringify(peerDependencies));

            const actualHash = this.packageJsonHashMap.get(changedFile.fsPath);
            if (actualHash === hash) {
               return;
            }

            this.packageJsonHashMap.set(changedFile.fsPath, hash);
         } catch {
            return;
         }

         // При изменении запускаем проверку
         if (this.isProjectRootPath(changedFile)) {
            this.scan(changedFile);
         }
      });
      this.packageJsonWatcher.onDidDelete(deletedFile => {
         // При удалении package.json удаляем сканнер для проекта
         if (this.isProjectRootPath(deletedFile)) {
            this.deleteScanner(deletedFile);
         }
      });
      this.packageJsonWatcher.onDidCreate(createdFile => {
         if (this.isProjectRootPath(createdFile)) {
            this.scan(createdFile);
         }
      });

      // package-lock.json
      this.lockFilesWatcher.onDidChange(changedFile => {
         if (this.isProjectRootPath(changedFile)) {
            this.scan(changedFile);
         }
      });

      // node_modules
      this.nodeModulesWatcher.onDidDelete(deletedFile => this.scan(deletedFile));
   }

   * disposableItems() {
      yield this.packageJsonWatcher;
      yield this.lockFilesWatcher;
      yield this.nodeModulesWatcher;
   }

   force() {
      vscode.workspace.findFiles('**/package-lock.json', '**/node_modules/**').then(uris => {
         uris.forEach(this.scan.bind(this));
      });
   }

   scan(fileUri: vscode.Uri) {
      const rootFolder = this.getProjectFolder(fileUri);

      if (!fs.existsSync(path.join(rootFolder, 'package.json'))) {
         return;
      }

      const task = this._projectScanners.get(rootFolder) ?? new ScanTask(rootFolder);

      if (!this._projectScanners.has(rootFolder)) {
         this._projectScanners.set(rootFolder, task);
      }

      if (this._runedTasks.has(task)) {
         task.run();
      } else {
         this.startScan(task);
      }
   }

   private startScan(task: ScanTask) {
      if (this._runedTasks.size === 0) {
         const {promise, resolve} = Promise.withResolvers<void>();
         this._progressPromise = promise;
         this._progressResolver = resolve;

         vscode.window.withProgress(
            {
               location: vscode.ProgressLocation.Window,
               title: 'pkgi: scan',
            },
            () => this._progressPromise.then(this.notify.bind(this))
         );
      }

      this._runedTasks.add(task);
      task.run().then(() => this.finishScan(task));
   }

   private finishScan(task: ScanTask) {
      this._runedTasks.delete(task);

      if (task.result) {
         this._results.set(task.folder, task.result);
      }

      if (this._runedTasks.size === 0) {
         this._progressResolver?.();
      }
   }

   private deleteScanner(fileUri: vscode.Uri) {
      const folder = this.getProjectFolder(fileUri);
      const task = this._projectScanners.get(folder);
      this._projectScanners.delete(folder);

      if (task) {
         this.finishScan(task);
      }
   }

   private notify() {
      let problemAmount = 0;

      for (const [folder, result] of this._results) {
         const workspaceFolder = this.getWorkspaceForFolder(folder);
         if (!workspaceFolder || !result.hasProblems) {
            continue;
         }

         problemAmount++;
         notifyByResults(result, folder, workspaceFolder);
      }

      if (problemAmount === 0) {
         vscode.window.showInformationMessage('All rights!');
      }
   }

   private getProjectFolder(fileUri: vscode.Uri): string {
      const nodeModulesIndex = fileUri.fsPath.indexOf('/node_modules/');
      const nnmPath = nodeModulesIndex > -1
         ? path.resolve(fileUri.fsPath.substring(0, nodeModulesIndex))
         : fileUri.fsPath;

      if (fs.lstatSync(nnmPath).isDirectory()) {
         return nnmPath;
      }

      return path.dirname(nnmPath);
   }

   private isProjectRootPath(uri: vscode.Uri): boolean {
      return !uri.fsPath.includes('/node_modules/');
   }

   private getWorkspaceForFolder(folder: string): vscode.WorkspaceFolder | undefined {
      if (!this._workspaceByProjectRoot.has(folder)) {
         const workspaces = vscode.workspace.workspaceFolders ?? [];

         for (const ws of workspaces) {
            if (folder.startsWith(ws.uri.fsPath)) {
               this._workspaceByProjectRoot.set(folder, ws);
               break;
            }
         }
      }

      return this._workspaceByProjectRoot.get(folder);
   }
}
