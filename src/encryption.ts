import crypto from 'crypto';

export function encryptRSA(publicKey: string, plaintext: string) {
    const buffer = Buffer.from(plaintext);
    return crypto.publicEncrypt({
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha512",
    }, buffer).toString('base64');
}

// Helper function to decrypt with RSA (private key)
export function decryptRSA(privateKey: string, encrypted: string) {
    return crypto.privateDecrypt({
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha512",
    }, Buffer.from(encrypted, 'base64')).toString();
}

export function generateRSAKeyPair() {
    // Generate a new RSA key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096, // Key size in bits
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    return { publicKey, privateKey };
}