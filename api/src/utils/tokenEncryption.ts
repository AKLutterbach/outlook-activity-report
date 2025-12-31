import crypto from 'crypto';

/**
 * Token encryption utility
 * Encrypts and decrypts refresh tokens for storage in Cosmos DB
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives an encryption key from the secret
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a refresh token
 * @param token - Refresh token to encrypt
 * @param secret - Encryption secret from environment
 * @returns Base64-encoded encrypted token
 */
export function encryptToken(token: string, secret: string): string {
  if (!secret) {
    throw new Error('Encryption secret not configured');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine salt + iv + tag + encrypted
  const combined = Buffer.concat([
    salt,
    iv,
    tag,
    Buffer.from(encrypted, 'hex'),
  ]);
  
  return combined.toString('base64');
}

/**
 * Decrypt a refresh token
 * @param encryptedToken - Base64-encoded encrypted token
 * @param secret - Encryption secret from environment
 * @returns Decrypted refresh token
 */
export function decryptToken(encryptedToken: string, secret: string): string {
  if (!secret) {
    throw new Error('Encryption secret not configured');
  }

  const combined = Buffer.from(encryptedToken, 'base64');
  
  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const key = deriveKey(secret, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
