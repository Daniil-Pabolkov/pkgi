import { EventEmitter } from 'stream';

const EventName = Symbol();

export class Sink<Data> {
   constructor(
      private event: EventEmitter
   ) {}

   push(data: Data) {
      this.event.emit(EventName, data);
   }
}

export class Pipe<Data> {
   constructor(
      private event: EventEmitter
   ) {}

   listen(fn: (data: Data) => void) {
      this.event.on(EventName, fn);
   }
}

export class StreamControler<Data> {
   readonly sink: Sink<Data>;
   readonly pipe: Pipe<Data>;

   constructor() {
      const eventEmitter = new EventEmitter();
      this.sink = new Sink(eventEmitter);
      this.pipe = new Pipe(eventEmitter);
   }
}
