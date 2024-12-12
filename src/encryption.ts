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
    try {
        return crypto.privateDecrypt({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha512",
        }, Buffer.from(encrypted, 'base64')).toString();
    } catch (error) {
        return undefined;
    }
}

export function encryptAes(plaintext: string, key: Buffer, iv: Buffer): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return encrypted;
}

export function decryptAes(encryptedText: string, key: Buffer, iv: Buffer): string {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    // Decrypt the encrypted text
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
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

export function generateAesKey() {
    return {
        key: crypto.randomBytes(32),
        iv: crypto.randomBytes(16)
    }
}

export function deriveKey(randomString: string, iv: Buffer): Promise<Buffer> {
    // Define the key length based on the desired AES key size (e.g., 32 bytes for AES-256)
    const keyLength = 32; 
    // Use the IV as salt for scrypt. Note: Typically, salt should be unique for each key derivation,
    // but here we're using IV for demonstration. In practice, you might want a separate salt.
    const salt = iv;

    return new Promise((resolve, reject) => {
        crypto.scrypt(randomString, salt, keyLength, (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
        });
    });
}