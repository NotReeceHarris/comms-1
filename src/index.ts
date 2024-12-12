import WebSocket, { WebSocketServer } from 'ws';
import { params, getCurrentTime, write } from './lib';
import { generateRSAKeyPair, generateAesKey, encryptRSA, decryptRSA } from './encryption';
import { send, recv } from './send_recv';
import * as readline from 'readline';
import { createHash, randomBytes } from 'crypto';

const { target, port, codeword } = params(process.argv);

if (!target || !port || !codeword) {
    console.error('Usage: node src/index.ts --target <target> --port <port> --codeword <codeword>');
    process.exit(1);
}

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

const server = new WebSocketServer({ port: parseInt(port) });

let serverWs: WebSocket | undefined;
let client: WebSocket;
let rl: readline.Interface | undefined;

let encryptionDetails: {
    privateKey: string | undefined
    publicKey: string | undefined,
    targetPublicKey: string | undefined,
    ourAesKey: Buffer | undefined,
    ourAesIv: Buffer | undefined,
    ourDelimiter: Buffer | undefined
    targetAesKey: Buffer | undefined,
    targetAesIv: Buffer | undefined,
    targetDelimiter: Buffer | undefined,
    targetCodeword: string | undefined
} = {
    privateKey: undefined,
    publicKey: undefined,
    targetPublicKey: undefined,
    ourAesKey: undefined,
    ourAesIv: undefined,
    ourDelimiter: undefined,
    targetAesKey: undefined,
    targetAesIv: undefined,
    targetDelimiter: undefined,
    targetCodeword: undefined
}

const isEstablished = () => {

    if (!serverWs || !client) return;
    if (serverWs.readyState !== WebSocket.OPEN  || client.readyState !== WebSocket.OPEN ) return;
    if (encryptionDetails.targetPublicKey === undefined) return;

    if (encryptionDetails.targetAesKey === undefined || encryptionDetails.targetAesIv === undefined) {
        if (encryptionDetails.ourAesKey === undefined || encryptionDetails.ourAesIv === undefined || encryptionDetails.ourDelimiter === undefined) {
            const {key, iv} = generateAesKey();
            encryptionDetails.ourAesKey = key;
            encryptionDetails.ourAesIv = iv;
            encryptionDetails.ourDelimiter = randomBytes(6);
        }

        const codewordHash = createHash('sha256').update(codeword).digest('hex');
        const encrypted = encryptRSA(encryptionDetails.targetPublicKey, `${encryptionDetails.ourAesKey.toString('base64')}:${encryptionDetails.ourAesIv.toString('base64')}:${encryptionDetails.ourDelimiter.toString('base64')}:${Buffer.from(codewordHash).toString('base64')}`);
        client.send(encrypted);
        return;
    };
    
    const codewordHash = createHash('sha256').update(codeword).digest('hex');

    write(`──────────────────────────
    \rConnection established
    \rtarget: ${target}
    \rcodewords: ${encryptionDetails.targetCodeword === codewordHash ? '\x1b[32mMatching\x1b[0m' : '\x1b[31mClashing\x1b[0m'}
    \r──────────────────────────\n`);
    
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true
    });

    rl.on('line', async (line) => {
        
        const message = line.trim();

        if (message === '') {
            write(`\r\x1b[31m> \x1b[0m`);
            process.stdout.cursorTo(2);
            return;
        }

        const encrypted = await send(message, encryptionDetails);

        if (!encrypted) {
            write(`\r\x1b[31m> \x1b[0m`);
            process.stdout.cursorTo(2);
            return;
        }

        if (client) client.send(encrypted);
        write(`\r\x1b[34m> \x1b[0m`);
        process.stdout.cursorTo(2);
    });

    if (rl) {
        write(`\n\x1b[A\x1b[34m> \x1b[0m`);
        process.stdout.cursorTo(2);
    }
    
    return;
    
}

server.on('error', ()=>{});
server.on('connection', (ws) => {

    serverWs = ws;
    write(`\x1b[31m[${getCurrentTime()}] Alert > Client connected\x1b[0m\n`)

    ws.on('message', async (message) => {

        if (encryptionDetails.targetPublicKey === undefined && message.toString().startsWith('-----BEGIN PUBLIC KEY-----')) {
            encryptionDetails.targetPublicKey = message.toString();
            write(`\x1b[31m[${getCurrentTime()}] Alert > Client Sent Public Key\x1b[0m\n`)
            return isEstablished();
        }

        if (encryptionDetails.privateKey !== undefined &&
            encryptionDetails.targetAesKey === undefined && encryptionDetails.targetAesIv === undefined) {
            const decrypted = decryptRSA(encryptionDetails.privateKey, message.toString());
            if (decrypted === undefined) {
                write(`\x1b[31m[${getCurrentTime()}] Alert > Error decrypting AES Key and IV\x1b[0m\n`);
                return;
            }

            const [key, iv, delimiter, targetCodeword] = decrypted.split(':').map((x) => Buffer.from(x, 'base64'));

            encryptionDetails.targetAesKey = key;
            encryptionDetails.targetAesIv = iv;
            encryptionDetails.targetDelimiter = delimiter;
            encryptionDetails.targetCodeword = targetCodeword.toString();

            write(`\x1b[31m[${getCurrentTime()}] Alert > AES Key and IV received from client\x1b[0m\n`);
            return isEstablished();
        }

        write(`\x1b[32m[${getCurrentTime()}] Them > \x1b[0m${await recv(message.toString(), encryptionDetails)}\n\x1b[34m> \x1b[0m${rl !== undefined ? rl.line : ''}`, true)
        if (rl) process.stdout.cursorTo(rl.line.length + 2);
    })

    ws.on('close', () => {
        encryptionDetails.targetPublicKey = undefined;
        encryptionDetails.targetAesKey = undefined;
        encryptionDetails.targetAesIv = undefined;
        encryptionDetails.ourAesKey = undefined;
        encryptionDetails.ourAesIv = undefined;
        encryptionDetails.ourDelimiter = undefined;
        encryptionDetails.targetCodeword = undefined;
        if (client) client.terminate();
        serverWs = undefined;
        write(`\x1b[31m[${getCurrentTime()}] Alert > Client disconnected\x1b[0m\n`, true);
    })
});

const clientConnect = async () => {
    let connected = false;
    
    while (!connected) {

        client = new WebSocket(target);
        client.on('error', ()=>{})
        client.on('open', () => {

            connected = true;
            write(`\x1b[31m[${getCurrentTime()}] Alert > Connected to client\x1b[0m\n`);

            const {privateKey, publicKey} = generateRSAKeyPair();
            encryptionDetails.privateKey = privateKey;
            encryptionDetails.publicKey = publicKey;

            if (client.readyState === WebSocket.OPEN) {
                write(`\x1b[31m[${getCurrentTime()}] Alert > Sending Public Key to client\x1b[0m\n`);
                client.send(encryptionDetails.publicKey);
            } else {
                write(`\x1b[31m[${getCurrentTime()}] Alert > Failed to send public key to client\x1b[0m\n`);
            }
            
            isEstablished();

            client.on('close', () => {
                connected = false;
                if (rl) rl.close();
                write(`\x1b[31m[${getCurrentTime()}] Alert > Connection closed\x1b[0m\n`, true);
                return clientConnect();
            })
        });

        await new Promise(resolve => setTimeout(resolve, 500));

    }
}

clientConnect();
