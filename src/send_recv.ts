import { deriveKey, encryptAes, decryptAes, encryptRSA, decryptRSA } from './encryption';
import crypto, { hash } from 'crypto';

const MESSAGE_SIZE = 10 * 1024 * 1024; // 10MB

let publicKey: string | undefined = undefined;

export async function send(data: string, encryptionDetails: any) {

    try {
        if (publicKey === undefined) {
            publicKey = encryptionDetails.targetPublicKey;
        }

        if (publicKey !== encryptionDetails.targetPublicKey) {
            publicKey = encryptionDetails.targetPublicKey;
        }

        const message = data.trim().toString()
        const delimiter = encryptionDetails.targetDelimiter;
    
        let payload = JSON.stringify({
            message: message,
            timestamp: new Date().toISOString,
        });

        payload = encryptRSA(encryptionDetails.targetPublicKey, payload);
    
        if ((payload.length + delimiter.length) > MESSAGE_SIZE) {
            console.error('Message too large');
            return;
        }
    
        const RAND_DATA_SIZE = (MESSAGE_SIZE - (payload.length + (delimiter.length * 2))) / 2;
    
        const bufferMessage = Buffer.from(payload);
        const randomBytesStart = crypto.randomBytes(RAND_DATA_SIZE);
        const randomBytesEnd = crypto.randomBytes(RAND_DATA_SIZE);
    
        const rawData = Buffer.concat([randomBytesStart, delimiter, bufferMessage, delimiter, randomBytesEnd]);
        const encodedData = rawData.toString('base64');
        const encrypted = encryptAes(encodedData, encryptionDetails.targetAesKey, encryptionDetails.targetAesIv)
        
        return encrypted;
    } catch (error) {
        return;
    }
}

export async function recv(data: string, encryptionDetails: any) {

    try {
        const decrypted = decryptAes(data, encryptionDetails.ourAesKey, encryptionDetails.ourAesIv);

        if (decrypted === undefined) {
            return 'Error decrypting message';
        }

        const rawData = Buffer.from(decrypted, 'base64');
        const delimiter = encryptionDetails.ourDelimiter;
        const startDelimiterPos = rawData.indexOf(delimiter) + delimiter.length;
        const frontTrimmedData = rawData.slice(startDelimiterPos, rawData.length)
        const endDelimiterPos = frontTrimmedData.indexOf(delimiter);
        const finalData = frontTrimmedData.slice(0, endDelimiterPos);

        let encryptedPayload = decryptRSA(encryptionDetails.privateKey, finalData.toString());

        if (encryptedPayload === undefined) {
            return 'Error decrypting message';
        }

        const payload = JSON.parse(encryptedPayload);

        return payload.message
    } catch (error) {
        console.log(error)
        return 'Error decrypting message';
    }
}