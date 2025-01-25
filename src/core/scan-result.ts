import Arborist from '@npmcli/arborist';

export class ScanResult {
   readonly hasProblems: boolean;

   constructor(
      readonly missing: Arborist.Node[],
      readonly invalid: Arborist.Node[],
      readonly extraneous: Arborist.Node[],
   ) {
      this.hasProblems = Boolean(
         this.missing.length ||
         this.invalid.length ||
         this.extraneous.length
      );
   }
}