import WebSocket, { WebSocketServer } from 'ws';
import { params, getCurrentTime } from './lib';
import { decryptRSA, encryptRSA, generateRSAKeyPair, generateAesKey } from './encryption';
import { send, recv } from './send_recv';
import * as readline from 'readline';
import { createHash } from 'crypto';

const { target, port } = params(process.argv);

if (!target || !port) {
    console.error('Usage: node src/index.ts --target <target> --port <port>');
    process.exit(1);
}

const server = new WebSocketServer({ port: parseInt(port) });

let serverWs: WebSocket;
let client: WebSocket;
let rl: readline.Interface;

let encryptionDetails: {
    privateKey: string | undefined
    publicKey: string | undefined,
    targetPublicKey: string | undefined,
    ourAesKey: Buffer | undefined,
    ourAesIV: Buffer | undefined,
    thereAesKey: Buffer | undefined,
    thereAesIV: Buffer | undefined,
} = {
    privateKey: undefined,
    publicKey: undefined,
    targetPublicKey: undefined,
    ourAesKey: undefined,
    ourAesIV: undefined,
    thereAesKey: undefined,
    thereAesIV: undefined,
}

const isEstablished = () => {

    if (!serverWs || !client) return;
    if (serverWs.readyState !== WebSocket.OPEN  || client.readyState !== WebSocket.OPEN ) return;
    if (encryptionDetails.targetPublicKey === undefined) return;
    if (encryptionDetails.ourAesKey === undefined && encryptionDetails.ourAesIV === undefined) return;
    if (encryptionDetails.thereAesKey === undefined && encryptionDetails.thereAesIV === undefined) return;

    process.stdout.write(`──────────────────────────
                        \rConnection established
                        \rtarget: ${target}
                        \rfingerprint: ${createHash('md5').update(encryptionDetails.targetPublicKey).digest('hex')}
                        \r──────────────────────────\n`);
    
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    });

    rl.on('line', async (line) => {
        const encrypted = await send(line, encryptionDetails);

        if (!encrypted) {
            process.stdout.write(`\r\x1b[31m> \x1b[0m`);
            process.stdout.cursorTo(2);
            return;
        }

        client.send(encrypted);
        process.stdout.write(`\r\x1b[34m> \x1b[0m`);
        process.stdout.cursorTo(2);
    });

    if (rl) {
        process.stdout.write(`\n\x1b[A\x1b[34m> \x1b[0m`);
        process.stdout.cursorTo(2);
    }
    
    return;
    
}

server.on('error', ()=>{});
server.on('connection', (ws) => {

    serverWs = ws;
    process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Client connected\x1b[0m\n`);

    ws.on('message', async (message) => {

        if (client.readyState === WebSocket.OPEN 
            && encryptionDetails.targetPublicKey === undefined 
            && message.toString().startsWith('-----BEGIN PUBLIC KEY-----')) {
            encryptionDetails.targetPublicKey = message.toString();
                process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Client Sent Public Key\x1b[0m\n`);
                process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Sending AES Details\x1b[0m\n`);

                const aesKeys = generateAesKey();
                encryptionDetails.ourAesKey = aesKeys.key;
                encryptionDetails.ourAesIV = aesKeys.iv;

                client.send(encryptRSA(encryptionDetails.targetPublicKey, JSON.stringify({
                    key: encryptionDetails.ourAesKey.toString('base64'),
                    iv: encryptionDetails.ourAesIV.toString('base64')
                })));

                return isEstablished();
        }

        if (encryptionDetails.privateKey !== undefined
            && encryptionDetails.targetPublicKey !== undefined
            && encryptionDetails.ourAesKey !== undefined && encryptionDetails.ourAesIV !== undefined
            && encryptionDetails.thereAesKey === undefined && encryptionDetails.thereAesIV === undefined)  {

                try {
                    const decrypted = decryptRSA(encryptionDetails.privateKey, message.toString());
                    console.log(decrypted);
                    //process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Client Send There AES Keys\x1b[0m\n`);
                } catch (error) {
                    return
                }

        }

        if (
            encryptionDetails.thereAesKey === undefined && encryptionDetails.thereAesIV === undefined
        ) {
            return
        }

        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`\x1b[32m[${getCurrentTime()}] Alice > \x1b[0m${await recv(message.toString(), encryptionDetails)}\n\x1b[34m> \x1b[0m${rl !== undefined ? rl.line : ''}`);
        if (rl) process.stdout.cursorTo(rl.line.length + 2);
    })

    ws.on('close', () => {
        encryptionDetails.targetPublicKey = undefined;
        process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Client disconnected\x1b[0m\n`);
    })
});

const clientConnect = async () => {
    let connected = false;
    
    while (!connected) {

        client = new WebSocket(target);
        client.on('error', ()=>{})
        client.on('open', () => {
            connected = true;

            const keyPair = generateRSAKeyPair();
            encryptionDetails.privateKey = keyPair.privateKey;
            encryptionDetails.publicKey = keyPair.publicKey;

            if (client.readyState === WebSocket.OPEN) {
                process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Sending Public Key to client\x1b[0m\n`);
                client.send(encryptionDetails.publicKey);
            } else {
                process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Failed to send public key to client\x1b[0m\n`);
            }
            
            process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Connected to client\x1b[0m\n`);
            isEstablished();

            client.on('close', () => {
                connected = false;
                if (rl) rl.close();
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(`\x1b[31m[${getCurrentTime()}] Alert > Connection closed\x1b[0m\n`);
                return clientConnect();
            })
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

clientConnect();
