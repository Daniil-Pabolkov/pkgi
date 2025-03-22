import { ScanResult } from './core/scan-result';
import Arborist from '@npmcli/arborist';
import { getMissing, getInvalid, getExtraneous } from './core/inspections';

export class ScanTask {
   private _inProgress = false;
   private _result: ScanResult | undefined;
   private _shouldRerun = false;
   private _arb?: Arborist;

   private _processPromise: Promise<ScanResult> | undefined;
   private _processResolver: undefined | ((value: ScanResult) => void);

   constructor(
      readonly folder: string,
   ) {}

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
      }
   }
}
