import { encryptRSA, decryptRSA } from './encryption';
import crypto from 'crypto';

const MESSAGE_SIZE = 1024 / 2; // 1KB

function generateRandomString(length: number, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      // Use crypto.randomInt for cryptographically secure random numbers 
        const randomIndex = crypto.randomInt(0, chars.length);
        result += chars[randomIndex];
    }
    return result;
}

export async function send(data: string, encryptionDetails: any) {

    const message = data.trim().toString()

    if (message.length > MESSAGE_SIZE) {
        console.error('Message too large');
        return;
    }

    const obj = [
        generateRandomString(100),
        {
            'message': message
        },
        generateRandomString(100)
    ]

    return encryptRSA(encryptionDetails.targetPublicKey, JSON.stringify(obj))
}

export async function recv(data: string, encryptionDetails: any) {
    try {
        const decrypted = decryptRSA(encryptionDetails.privateKey, data);

        if (decrypted === undefined) {
            return 'Error decrypting message';
        }

        const obj = JSON.parse(decrypted);

        return obj[1].message;
    } catch (error) {
        return 'Error decrypting message';
    }
}