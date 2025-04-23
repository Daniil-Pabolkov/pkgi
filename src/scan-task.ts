import vscode from 'vscode';
import { ScanResult } from './core/scan-result';
import Arborist from '@npmcli/arborist';
import { getMissing, getInvalid, getExtraneous } from './core/inspections';
import path from 'path';

export class ScanTask {
   private _inProgress = false;
   private _result: ScanResult | undefined;
   private _shouldRerun = false;
   private _arb?: Arborist;

   private _processPromise: Promise<ScanResult> | undefined;
   private _processResolver: undefined | ((value: ScanResult) => void);


   readonly output: vscode.OutputChannel;

   constructor(
      readonly folder: string,
      readonly workspaceFolder?: vscode.WorkspaceFolder
   ) {
      this.output = vscode.window.createOutputChannel(`Pkgi: scan details [${this.getFolderWithWorkspaceInfo()}]`);
   }

   get isRan() {
      return this._inProgress;
   }

   get result() {
      return this._result;
   }

   wait() {
      return this._processPromise ?? Promise.resolve(this._result);
   }

   async run() {
      if (this._inProgress) {
         this._shouldRerun = true;
      } else {
         const {promise, resolve} = Promise.withResolvers<ScanResult>();

         this._processPromise = promise;
         this._processResolver = resolve;

         this.scan();
      }

      return this._processPromise;
   }

   showDetails() {
      this.output.show();
   }

   dispose() {
      this.output.dispose();
   }

   private get arb() {
      if (!this._arb) {
         this._arb = new Arborist({
            path: this.folder,
         });
      }

      return this._arb!;
   }

   private async scan() {
      this._shouldRerun = false;
      this._inProgress = true;
      this._result = new ScanResult(
         ...await Promise.all([
            getMissing(this.arb),
            getInvalid(this.arb),
            getExtraneous(this.arb),
         ])
      );

      if (this._shouldRerun) {
         this.scan();
      } else {
         this._arb = void 0;
         this._inProgress = false;
         this._shouldRerun = false;
         this._processResolver?.(this._result!);

         this.logResults();
      }
   }

   private getFolderPathRelWorkspace() {
      if (!this.workspaceFolder) {
         return this.folder || path.sep;
      }

      return path.relative(this.workspaceFolder.uri.fsPath, this.folder);
   }

   private getFolderWithWorkspaceInfo() {
      if (!this.workspaceFolder) {
         return this.folder || path.sep;
      }

      const relPath = this.getFolderPathRelWorkspace();
      let resultPath = this.workspaceFolder.name;

      if (relPath !== '') {
         resultPath += '::' + relPath;
      }


      return resultPath;
   }

   private logResults() {
      const projectPath = this.getFolderWithWorkspaceInfo();

      this.output.appendLine('');
      this.output.appendLine(`Project [${projectPath}]`);
      this.output.appendLine(`<full path: ${this.folder}>`);

      if (!this._result) {
         return void this.output.appendLine('ℹ️ Scan did not ran yet');
      }


      this.output.appendLine('• Found problems:');

      this.output.appendLine(this.getProblemTypeRow('Missing', this._result.missing.length));
      for (let i = 0, il = this._result.missing.length; i < il; ++i) {
         const node = this._result.missing[i];
         this.output.appendLine(this.getPackageRow(node, i >= il - 1));
      }

      this.output.appendLine(this.getProblemTypeRow('Invalid', this._result.invalid.length));
      for (let i = 0, il = this._result.invalid.length; i < il; ++i) {
         const node = this._result.invalid[i];
         const nodeEdges = Array.from(node.edgesIn).filter(edge => edge.invalid).map(edge => edge.spec);
         this.output.appendLine(this.getPackageRow(node, i >= il - 1) + ` (required ${nodeEdges[0]})`);
      }

      this.output.appendLine(this.getProblemTypeRow('Extraneous', this._result.extraneous.length, true));
      for (let i = 0, il = this._result.extraneous.length; i < il; ++i) {
         const node = this._result.extraneous[i];
         this.output.appendLine(this.getPackageRow(node, i >= il - 1, false));
      }

      this.output.appendLine('');
   }

   private getProblemTypeRow(type: string, amount: number, isLast = false): string {
      return `${isLast ? '└' : '├'}─${amount ? '┬' : '─'}─ ${type}: ${amount}`;
   }

   private getPackageRow(node: Arborist.Node, isLast = false, withNextTypeRow = true): string {
      return `${withNextTypeRow ? '┆' : ' '} ${isLast ? '└' : '├'}─── ${node.pkgid}`;
   }
}
