import vscode from 'vscode';

const output = vscode.window.createOutputChannel('Pkgi → Logs');

let _lastLevel: number = 0;

function log(target: string, message: string): void;
function log(target: string, level: number, message: string): void;
function log(...args: [string, string] | [string, number, string]) {
   const [a, b, c] = args;
   const withLevel = typeof b === 'number';

   const target = a;
   const level = withLevel ? b : 0;
   const message = withLevel ? c : b;

   const tabs = '\t'.repeat(level) + (level > 0 ? '↳' : '');
   const eol = _lastLevel === 0 ? '\n' : '';
   const now = new Date();
   const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;

   output.appendLine(`[pkgi] ${tabs}${target}: ${message} [${time}] ${eol}`);

   _lastLevel = level;
}

export {log};
