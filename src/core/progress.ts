import { Sink } from './stream-controller';

export interface ProgressOptions {
   initMax?: number;
   initValue?: number;
}

export interface FullProgressOptions extends ProgressOptions {
   sink: Sink<number>;
}

type RequiredOnlyArgs = [Sink<number>];
type SinkAndInitMax = [Sink<number>, number];
type AllArgs = [Sink<number>, number, number];
type SinkAndOtions = [Sink<number>, ProgressOptions];
type OptionsOnly = [FullProgressOptions];

type Args = RequiredOnlyArgs | SinkAndInitMax | AllArgs | SinkAndOtions | OptionsOnly;

export class Progress {
   private _max: number;
   private _current: number;
   private _sink: Sink<number>;

   constructor(sink: Sink<number>);
   constructor(options: FullProgressOptions);
   constructor(sink: Sink<number>, initMax: number);
   constructor(sink: Sink<number>, options: ProgressOptions);
   constructor(sink: Sink<number>, initMax: number, initValue: number);
   constructor(...args: Args) {
      const fullOptions: Required<FullProgressOptions> = {
         sink: args[0] instanceof Sink ? args[0] : args[0].sink,
         initMax: (args[1] instanceof Object ? args[1].initMax : args[1]) ?? 0,
         initValue: (args[1] instanceof Object ? args[1].initValue : args[2]) ?? 0,
      };

      const { sink, initMax, initValue } = fullOptions;

      this._max = initMax;
      this._current = initValue;
      this._sink = sink;
   }

   get max() {
      return this._max;
   }

   get current() {
      return this._current;
   }

   get progress() {
      if (this._current === this._max) {
         return 100;
      }

      return this._current / this._max * 100;
   }

   private emit() {
      setImmediate(() => this._sink.push(this.progress));
   }

   updateMax(newMax: number) {
      this._max = newMax;
      this.emit();

      return this;
   }

   next(newValue: number) {
      this._current = newValue;
      this.emit();

      return this;
   }

   reduce(fn: (current: number) => number) {
      this.next(fn(this._current));

      return this;
   }
}
