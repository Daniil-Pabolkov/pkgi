import Arborist from '@npmcli/arborist';
import { getExtraneous, getInvalid, getMissing } from './inspections';
import { Progress } from './progress';
import { ScanResult } from './scan-result';

export class WorkspaceInspector {
   private _lastScanRetuls?: ScanResult;

   constructor(
      private workspacePath: string
   ) {}

   withProgress<T>(promiseOrCb: (() => Promise<T>) | Promise<T>, progress?: Progress) : Promise<T> {
      const fn = promiseOrCb instanceof Function ? promiseOrCb : () => promiseOrCb;

      if (progress) {
         progress.updateMax(progress.max + 1);

         return fn()
            .then((result) => {
               progress.reduce(current => current + 1);
               return result;
            });
      }

      return fn();
   }

   get lastScanResult() {
      return this._lastScanRetuls;
   }

   async scan(progress?: Progress): Promise<ScanResult> {
      const arb = new Arborist({
         path: this.workspacePath,
      });

      return this._lastScanRetuls = new ScanResult(
         ...await Promise.all([
            this.withProgress(() => getMissing(arb), progress),
            this.withProgress(() => getInvalid(arb), progress),
            this.withProgress(() => getExtraneous(arb), progress),
         ])
      );
   }
}
