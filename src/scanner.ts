import vscode from 'vscode';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import type { ScanResult } from './core/scan-result';
import { notifyByResults } from './core/notifications/problems-notify';
import { ScanTask } from './scan-task';
import {debounce} from './utils/debounce';
import {log} from './utils/log';

export class Scanner {
   readonly packageJsonWatcher = vscode.workspace.createFileSystemWatcher('**/package.json');
   readonly lockFilesWatcher = vscode.workspace.createFileSystemWatcher('**/package-lock.json');
   readonly nodeModulesWatcher = vscode.workspace.createFileSystemWatcher('**/node_modules/**');

   private readonly _projectScanners = new Map<string, ScanTask>();
   private readonly _finishedTasks = new Map<string, ScanTask>();
   private readonly _runedTasks = new Set<ScanTask>();

   private readonly _workspaceByProjectRoot = new Map<string, vscode.WorkspaceFolder>();

   private _progressPromise: Promise<void> = Promise.resolve();
   private _progressResolver?: () => void;

   // package.json full path => package.json dependencies hash
   private _packageJsonHashMap = new Map<string, string>();
   // pakcage-lock.json full path => package-lock.json hash
   private _lockfileJsonHashMap = new Map<string, string>();

   constructor() {
      // package.json
      this.packageJsonWatcher.onDidCreate(this.packageCreateHandler.bind(this));
      this.packageJsonWatcher.onDidDelete(deletedFile => {
         // При удалении package.json удаляем сканнер для проекта
         if (this.isProjectRootPath(deletedFile)) {
            this.deleteScanner(deletedFile);
         }
      });
      vscode.workspace.findFiles('**/package.json', '**/node_modules/**')
         .then((uris: vscode.Uri[]) => uris.forEach(this.packageCreateHandler.bind(this)));

      // package-lock.json
      this.lockFilesWatcher.onDidCreate(this.packageCreateHandler.bind(this));
      this.lockFilesWatcher.onDidDelete(deletedFile => {
         // При удалении package-lock.json удаляем сканнер для проекта
         if (this.isProjectRootPath(deletedFile)) {
            this.deleteScanner(deletedFile);
         }
      });
      vscode.workspace.findFiles('**/package-lock.json', '**/node_modules/**')
         .then((uris: vscode.Uri[]) => uris.forEach(this.packageCreateHandler.bind(this)));

      // node_modules
      const debouncedScan = debounce(this.scan.bind(this), 10_000);
      this.nodeModulesWatcher.onDidDelete(debouncedScan);
      this.nodeModulesWatcher.onDidChange(debouncedScan);
      this.nodeModulesWatcher.onDidCreate(debouncedScan);
   }


   * disposableItems() {
      yield this.packageJsonWatcher;
      yield this.lockFilesWatcher;
      yield this.nodeModulesWatcher;
   }

   force() {
      vscode.workspace.findFiles('**/package-lock.json', '**/node_modules/**').then(uris => {
         uris.forEach(this.packageCreateHandler.bind(this));
      });
   }

   scan(fileUri: vscode.Uri) {
      const rootFolder = this.getProjectFolder(fileUri);

      if (!fs.existsSync(path.join(rootFolder, 'package.json'))) {
         return;
      }

      const task = this._projectScanners.get(rootFolder) ?? new ScanTask(rootFolder, this.getWorkspaceForFolder(rootFolder));

      if (!this._projectScanners.has(rootFolder)) {
         this._projectScanners.set(rootFolder, task);
      }

      if (this._runedTasks.has(task)) {
         log('Scan', `exists for ${rootFolder}`);
         task.run();
      } else {
         log('Scan', `run for ${rootFolder}`);
         this.startScan(task);
      }
   }

   private isPackageWasChanged(fileUri: vscode.Uri) {
      try {
         const projectRoot = this.getProjectFolder(fileUri);
         const packagePath = path.join(projectRoot, 'package.json');
         const lockfilePath = path.join(projectRoot, 'package-lock.json');

         const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
         const {dependencies, devDependencies, peerDependencies} = packageJson;
         const packageHash = crypto.hash('md5', JSON.stringify(dependencies) + JSON.stringify(devDependencies) + JSON.stringify(peerDependencies));
         const lockfileHash = crypto.hash('md5', fs.readFileSync(lockfilePath));

         const actualPackageHash = this._packageJsonHashMap.get(packagePath);
         const actualLockfileHash = this._lockfileJsonHashMap.get(lockfilePath);
         if (actualPackageHash === packageHash && actualLockfileHash === lockfileHash) {
            return false;
         }

         this._packageJsonHashMap.set(packagePath, packageHash);
         this._lockfileJsonHashMap.set(lockfilePath, lockfileHash);
      } catch {
         return false;
      }

      return true;
   }

   private packageCreateHandler(fileUri: vscode.Uri) {
      const projectPath = this.getProjectFolder(fileUri);

      log('Watcher', `for ${fileUri.fsPath}`);

      if (this._projectScanners.has(projectPath)) {
         log('Watcher', 1, 'Is already exists');
         return;
      }

      log('Watcher', 1, 'Is new – create watch handler for package.json and package-lock.json');

      this.scanProject(fileUri);

      const lockfilePath = path.join(projectPath, 'package-lock.json');
      const packagePath = path.join(projectPath, 'package.json');

      fs.watchFile(lockfilePath, () => {
         this.packageChangedHandler(vscode.Uri.parse(lockfilePath));
      });
      fs.watchFile(packagePath, () => {
         this.packageChangedHandler(vscode.Uri.parse(lockfilePath));
      });
   }

   private packageChangedHandler(fileUri: vscode.Uri) {
      if (!this.isPackageWasChanged(fileUri)) {
         return;
      }

      // При изменении запускаем проверку
      this.scanProject(fileUri);
   }

   private scanProject(fileUri: vscode.Uri) {
      if (this.isProjectRootPath(fileUri)) {
         this.scan(fileUri);
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
         this._finishedTasks.set(task.folder, task);
      }

      if (this._runedTasks.size === 0) {
         log('Scan', `for ${task.folder} finished`);
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

      for (const [folder, task] of this._finishedTasks) {
         const workspaceFolder = this.getWorkspaceForFolder(folder);
         // Здесь task.result должен быть всегда, т.к. это завершённые задачи,
         // но проверку по типам всё равно оставим – лишним не будет)
         if (!workspaceFolder || !task.result || !task.result.hasProblems) {
            continue;
         }

         problemAmount++;
         notifyByResults(task.result, {
            projectPath: folder,
            workspaceFolder,
            outputChannel: task.output
         });
      }

      this._finishedTasks.clear();

      if (problemAmount === 0) {
         if (vscode.workspace.getConfiguration().get('pkgi.notifications.success')) {
            vscode.window.showInformationMessage('All rights!');
         }
         log('Scan', 'Scan is completed successful');
      }
   }

   private getProjectFolder(fileUri: vscode.Uri): string {
      const rootPath = fileUri.fsPath.replace(/\/node_modules(\/.*)?$/, '');

      if (fs.lstatSync(rootPath).isDirectory()) {
         return rootPath;
      }

      return path.dirname(rootPath);
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
