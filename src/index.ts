import WebSocket, { WebSocketServer } from 'ws';
import { params, getCurrentTime } from './lib';
import { encryptRSA, decryptRSA, generateRSAKeyPair } from './encryption';
import * as readline from 'readline';

const { target, port } = params(process.argv);

if (!target || !port) {
    console.error('Usage: node src/index.ts --target <target> --port <port>');
    process.exit(1);
}

const server = new WebSocketServer({ port: parseInt(port) });
let rl: readline.Interface;

let privateKey: string;
let publicKey: string;
let targetPublicKey: string;

process.stdout.clearLine(0);
process.stdout.cursorTo(0);
process.stdout.write('┌────────────────────────┐\n│ Waiting for connection │\n└────────────────────────┘\n');

let sentHandshake = false;

server.on('error', ()=>{});
server.on('connection', (ws) => {

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Client connected\x1b[0m\n`);

    if (rl) {
        process.stdout.write(`\x1b[A\x1b[34m> \x1b[0m`);
        process.stdout.cursorTo(2);
    }

    ws.on('message', (message) => {

        if (!sentHandshake) {
            if (message.toString().startsWith('-----BEGIN PUBLIC KEY-----')) {
                targetPublicKey = message.toString();
                sentHandshake = true;

                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Client Sent Public Key\x1b[0m\n`);

                process.stdout.write(`\x1b[34m> \x1b[0m`);
                process.stdout.cursorTo(2);
                return
            }
        }

        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`\x1b[32m[${getCurrentTime()}] Alice > \x1b[0m${decryptRSA(privateKey, message.toString())}\n`);
        process.stdout.write(`\x1b[34m> \x1b[0m${rl !== undefined ? rl.line : ''}`);
        if (rl) process.stdout.cursorTo(rl.line.length + 2);
    })

    ws.on('close', () => {

        sentHandshake = false;

        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Client disconnected\x1b[0m\n`);
    })
});

const clientConnect = async () => {
    let connected = false;
    
    while (!connected) {

        const client = new WebSocket(target);

        client.on('error', ()=>{})
        client.on('open', () => {
            connected = true;

            const keyPair = generateRSAKeyPair();
            privateKey = keyPair.privateKey;
            publicKey = keyPair.publicKey;

            client.send(publicKey);

            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Connected to client\x1b[0m\n\n`);

            rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: true
            });

            rl.on('line', (line) => {

                client.send(encryptRSA(targetPublicKey, line.trim().toString()));
                process.stdout.write(`\x1b[34m> \x1b[0m`);
                process.stdout.cursorTo(2);
            });

            process.stdout.write(`\x1b[A\x1b[34m> \x1b[0m`);
            process.stdout.cursorTo(2);

            client.on('close', () => {
                connected = false;
                if (rl) rl.close();

                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Connection closed\x1b[0m\n`);

                return clientConnect();
            })
        });

        // Delay for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

clientConnect();
