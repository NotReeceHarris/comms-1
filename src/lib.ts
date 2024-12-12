export function params(argv: string[]): { target: string | null, port: string | null, codeword: string | null } {
    const args: string[] = argv.slice(2);
    let target: string | null = null;
    let port: string | null = null;
    let codeword: string | null = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--target') {
            target = 'ws://' + args[i + 1];
        } else if (args[i] === '--port') {
            port = args[i + 1];
        } else if (args[i] === '--codeword') {
            codeword = args[i + 1];
        }
    }

    return { target, port, codeword };
}

import moment from 'moment';

export function getCurrentTime(): string {
    return moment().format('YYYY-MM-DD HH:mm:ss')
}

export function write (str: string, clear: boolean = false) {
    if (clear) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }
    
    process.stdout.write(str);
}