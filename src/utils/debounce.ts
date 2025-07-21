import {log} from './log';

export function debounce<T extends Function>(func: T, delay: number): T {
   let timer!: number | NodeJS.Timeout;
   const target = `Debounce ${Intl.NumberFormat('ru').format(delay / 1_000)}s`;

   const fn = (...args: unknown[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
   };

   return fn as Function as T;
}
