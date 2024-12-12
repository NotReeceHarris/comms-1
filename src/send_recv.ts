import { deriveKey, encryptAes, decryptAes } from './encryption';
import crypto, { hash } from 'crypto';

const MESSAGE_SIZE = 15 * 1024 * 1024; // 5MB

let publicKey: string | undefined = undefined;

let ourCodes: string | undefined = undefined;
let theirCodes: string[] = [];

export async function send(data: string, encryptionDetails: any) {

    try {
        if (publicKey === undefined) {
            publicKey = encryptionDetails.targetPublicKey;
        }

        if (publicKey !== encryptionDetails.targetPublicKey) {
            publicKey = encryptionDetails.targetPublicKey;
            ourCodes = undefined;
            theirCodes = [];
        }

        const message = data.trim().toString()
        const delimiter = encryptionDetails.targetDelimiter;
    
        const ourProposedCode = crypto.randomBytes(255).toString('hex');
        let payload = JSON.stringify({
            message: message,
            timestamp: new Date().toISOString,
            code: ourProposedCode
        });
        
        if (theirCodes.length !== 0) {
            const derivedKey = await deriveKey(theirCodes[theirCodes.length-1], encryptionDetails.ourAesIv);
            payload = encryptAes(payload, derivedKey, encryptionDetails.targetAesIv);
        }
    
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
        
        ourCodes = ourProposedCode;
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

        let payload;

        if (!ourCodes) {
            payload = JSON.parse(finalData.toString());
        } else {
            try {
                const derivedKey = await deriveKey(ourCodes, encryptionDetails.targetAesIv);
                const decryptedPayload = decryptAes(finalData.toString(), derivedKey, encryptionDetails.ourAesIv);
                payload = JSON.parse(decryptedPayload);
            } catch (error) {
                console.log('They have encrypted with a dynamic code we don\'t have.');
            }
        }

        theirCodes.push(payload.code);
        return payload.message
    } catch (error) {
        console.log(error)
        return 'Error decrypting message';
    }
}