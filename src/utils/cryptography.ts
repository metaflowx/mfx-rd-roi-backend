import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Path to the keys
const PUBLIC_KEY = path.join(__dirname, '../../scripts/AccessTokenPublicKey.pem')
const PRIVATE_KEY = path.join(__dirname, '../../scripts/AccessTokenPrivateKey.pem')

// Read the public and private keys
export const accessTokenPublicKey = fs.readFileSync(PUBLIC_KEY, 'utf8')
export const accessTokenPrivateKey = fs.readFileSync(PRIVATE_KEY, 'utf8')

/// Generate a random salt
export function generateSalt(): string {
    /// 16 bytes = 128 bits
    return crypto.randomBytes(16).toString('hex')
  }
  
/// Derive IV from userId and salt using a key derivation function (KDF)
function deriveIV(userId: string, salt: string): Buffer {
    /// 16 bytes = 128 bits
    return crypto.scryptSync(userId, salt, 16)
  }

/// Generate a random symmetric key for AES: step1
export const generateSymmetricKey = (): string => {
    /// 256-bit key for AES-256
    return crypto.randomBytes(32).toString('hex')
}

/// Encrypt data using AES: step2
export const encryptWithAES = (key: string, data: string, userId: string, salt: string): string => {
    /// Initialization vector
    const iv = deriveIV(userId,salt)
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv)
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return encrypted
}

/// Encrypt symmetric key using RSA public key: step3
export const encryptWithRSA = (publicKey: string, data: string): string => {
    const buffer = Buffer.from(data, 'utf8')
    const encrypted = crypto.publicEncrypt(publicKey, buffer)
    return encrypted.toString('base64')
}


/// Decrypt symmetric key using RSA private key: step4
export const decryptWithRSA = (privateKey: string, encryptedData: string): string => {
    const buffer = Buffer.from(encryptedData, 'base64')
    const decrypted = crypto.privateDecrypt(privateKey, buffer)
    return decrypted.toString('utf8')
}

/// Decrypt data using AES: step5
export const decryptWithAES = (key: string, encryptedData: string, userId: string, salt: string): string => {
    const iv = deriveIV(userId, salt)
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex'),
      iv
    )
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
}

/// Hybrid encryption: Encrypt data using AES and encrypt the symmetric key using RSA
export const hybridEncrypt = (publicKey:string,data: string, userId: string): {
    encryptedData: string
    encryptedSymmetricKey: string
    salt: string
  } => {
    /// Step 1: Generate a symmetric key
    const symmetricKey = generateSymmetricKey()
  
    /// Step 2: Generate a salt
    const salt = generateSalt()
  
    /// Step 3: Encrypt the data with AES
    const encryptedData = encryptWithAES(symmetricKey, data, userId, salt)
  
    /// Step 4: Encrypt the symmetric key with RSA
    const encryptedSymmetricKey = encryptWithRSA(publicKey,symmetricKey)
  
    return {
      encryptedData,
      encryptedSymmetricKey,
      salt
    }
  }
  
  /// Hybrid decryption: Decrypt the symmetric key using RSA and then decrypt the data using AES
  export const hybridDecrypt = (
    privateKey: string,
    encryptedData: string,
    encryptedSymmetricKey: string,
    userId: string,
    salt: string
  ): string => {
    /// Step 1: Decrypt the symmetric key with RSA
    const symmetricKey = decryptWithRSA(privateKey,encryptedSymmetricKey)
  
    /// Step 2: Decrypt the data with AES
    const decryptedData = decryptWithAES(symmetricKey, encryptedData, userId, salt)
  
    return decryptedData
  }