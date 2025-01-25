import type {WorkspaceFolder} from 'vscode';

import { WorkspaceInspector } from './workspace-inspector';
import { Progress } from './progress';
import { StreamControler } from './stream-controller';
import type { ScanResult } from './scan-result';

interface WorkspaceScanMeta {
   folder: WorkspaceFolder;
   inspector: WorkspaceInspector;
}

export class Inspector {
   private scannersMeta = new Map<string, WorkspaceScanMeta>();
   private streamController = new StreamControler<number>();

   readonly progress = new Progress(this.streamController.sink);

   get isEmpty() {
      return this.scannersMeta.size === 0;
   }

   get size() {
      return this.scannersMeta.size;
   }

   get folders() {
      return this.scannersMeta.values();
   }

   private getWorspaceScanMeta(folder: WorkspaceFolder): WorkspaceScanMeta {
      if (!this.scannersMeta.has(folder.uri.fsPath)) {
         this.scannersMeta.set(folder.uri.fsPath, {
            folder,
            inspector: new WorkspaceInspector(folder.uri.fsPath),
         });
      }

      return this.scannersMeta.get(folder.uri.fsPath)!;
   }

   onProgress(callback: (progress: number) => void) {
      this.streamController.pipe.listen(callback);
   }

   addFolder(folder: WorkspaceFolder) {
      return this.getWorspaceScanMeta(folder);
   }

   removeFolder(folder: WorkspaceFolder) {
      this.scannersMeta.delete(folder.uri.fsPath);
   }

   private * foldersToGenerator(folders?: WorkspaceFolder[]) {
      for (const folder of folders ?? []) {
         yield this.getWorspaceScanMeta(folder);
      }
   }

   /**
    * Сканирует либо все ({@link folders не передан}) или только указанные в {@link folders} папки. \
    * Возвращает Map-результат, где ключ – директория workspace; значение – перечень проблем по типам (см {@link ScanResult}).
    */
   async scan(folders?: WorkspaceFolder[]) {
      const foldersIter = folders ? this.foldersToGenerator(folders) : this.scannersMeta.values();

      const scanPromises: Promise<void>[] = [];
      const scanResults = new Map<WorkspaceFolder, ScanResult>();

      for (const scanner of foldersIter) {
         const promise = scanner.inspector
            .scan(this.progress)
            .then(result => {
               if (result.hasProblems) {
                  scanResults.set(scanner.folder, result);
               }
            });
         scanPromises.push(promise);
      }

      await Promise.all(scanPromises ?? []);

      return scanResults;
   }
}