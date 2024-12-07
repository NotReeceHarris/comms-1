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


export function getCurrentTime(): string {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();

    // Pad hours and minutes with leading zeros if necessary
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

    return `${formattedHours}:${formattedMinutes}`;
}