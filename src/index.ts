import WebSocket, { WebSocketServer } from 'ws';
import { params, getCurrentTime } from './lib';
import * as readline from 'readline';

const { target, port } = params(process.argv);

if (!target || !port) {
    console.error('Usage: node src/index.ts --target <target> --port <port>');
    process.exit(1);
}

const server = new WebSocketServer({ port: parseInt(port) });
let rl: readline.Interface;

server.on('error', () => { });
server.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`\x1b[32m[${getCurrentTime()}] Alice > \x1b[0m${message.toString()}\n`);

        process.stdout.write(`\x1b[34m> \x1b[0m${rl.line}`);
        process.stdout.cursorTo(rl.line.length + 2);
    })
});

const clientConnect = async () => {
    let connected = false;
    
    while (!connected) {

        const client = new WebSocket(target);

        client.on('error', () => { })
        client.on('open', () => {
            console.log('Connected to target');
            connected = true;

            rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: true
            });

            rl.on('line', (line) => {
                const msg = line.trim();
            
                // Send the message
                client.send(msg);

                process.stdout.write('\r')
            
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);

                // Write the new prompt
                process.stdout.write(`\x1b[34m> \x1b[0m`);
                process.stdout.cursorTo(2);
            });

            process.stdout.write(`\x1b[A\x1b[34m> \x1b[0m`);
            process.stdout.cursorTo(2);
            //rl.prompt();

            client.on('close', () => {
                console.log('Connection closed');
                connected = false;

                if (rl) {
                    rl.close();
                }

                return clientConnect();
            })
        });

        // Delay for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

clientConnect();
