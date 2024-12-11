export function params(argv: string[]): { target: string | null, port: string | null } {
    const args: string[] = argv.slice(2);
    let target: string | null = null;
    let port: string | null = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--target') {
            target = 'ws://' + args[i + 1];
        } else if (args[i] === '--port') {
            port = args[i + 1];
        }
    }

    return { target, port };
}

import moment from 'moment';

export function getCurrentTime(): string {
    return moment().format('YYYY-MM-DD HH:mm:ss')
}