/**
 * Document Encryption Utility
 *
 * Uses AES-256-GCM for encrypting sensitive documents
 * - Encryption at rest for uploaded files
 * - Secure key management via environment variables
 * - Unique IV (Initialization Vector) for each file
 *
 * SECURITY NOTES:
 * - ENCRYPTION_KEY must be 32 bytes (256 bits) in hex format
 * - Generate key: openssl rand -hex 32
 * - Store in environment variables, never commit to git
 * - Rotate keys periodically (every 90 days recommended)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // For key derivation

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('[Encryption] ENCRYPTION_KEY not set - encryption disabled');
}

/**
 * Derive a key from the master encryption key and a salt
 * This allows us to use different keys for different files
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    Buffer.from(masterKey, 'hex'),
    salt,
    100000, // iterations
    32, // key length (256 bits)
    'sha256'
  );
}

/**
 * Encrypt a file buffer
 *
 * Returns: {
 *   encrypted: Buffer,      // Encrypted data
 *   iv: string,            // Initialization vector (hex)
 *   authTag: string,       // Authentication tag (hex)
 *   salt: string,          // Salt for key derivation (hex)
 * }
 */
export function encryptFile(fileBuffer: Buffer): {
  encrypted: Buffer;
  iv: string;
  authTag: string;
  salt: string;
} | null {
  if (!ENCRYPTION_KEY) {
    console.warn('[Encryption] Encryption disabled - returning null');
    return null;
  }

  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive encryption key from master key
    const key = deriveKey(ENCRYPTION_KEY, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the file
    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      salt: salt.toString('hex'),
    };
  } catch (error) {
    console.error('[Encryption] Failed to encrypt file:', error);
    return null;
  }
}

/**
 * Decrypt a file buffer
 */
export function decryptFile(
  encryptedBuffer: Buffer,
  iv: string,
  authTag: string,
  salt: string
): Buffer | null {
  if (!ENCRYPTION_KEY) {
    console.warn('[Encryption] Encryption disabled - returning null');
    return null;
  }

  try {
    // Derive the same key using the stored salt
    const key = deriveKey(ENCRYPTION_KEY, Buffer.from(salt, 'hex'));

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'hex')
    );

    // Set authentication tag
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    // Decrypt the file
    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);

    return decrypted;
  } catch (error) {
    console.error('[Encryption] Failed to decrypt file:', error);
    return null;
  }
}

/**
 * Encrypt a string (for sensitive text fields)
 */
export function encryptString(text: string): {
  encrypted: string;
  iv: string;
  authTag: string;
  salt: string;
} | null {
  const result = encryptFile(Buffer.from(text, 'utf8'));

  if (!result) {
    return null;
  }

  return {
    encrypted: result.encrypted.toString('base64'),
    iv: result.iv,
    authTag: result.authTag,
    salt: result.salt,
  };
}

/**
 * Decrypt a string
 */
export function decryptString(
  encrypted: string,
  iv: string,
  authTag: string,
  salt: string
): string | null {
  const result = decryptFile(
    Buffer.from(encrypted, 'base64'),
    iv,
    authTag,
    salt
  );

  if (!result) {
    return null;
  }

  return result.toString('utf8');
}

/**
 * Hash sensitive data (one-way, for verification)
 * Use for data that doesn't need to be decrypted
 */
export function hashData(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Example: Encrypt and upload document
 *
 * ```ts
 * const file = req.files.resume;
 * const encrypted = encryptFile(file.buffer);
 *
 * if (encrypted) {
 *   // Upload encrypted buffer to S3/storage
 *   await uploadToS3(encrypted.encrypted, 'resume.enc');
 *
 *   // Store metadata in database
 *   await prisma.employeeProfile.update({
 *     data: {
 *       resumeUrl: 'https://s3.../resume.enc',
 *       resumeIv: encrypted.iv,
 *       resumeAuthTag: encrypted.authTag,
 *       resumeSalt: encrypted.salt,
 *     },
 *   });
 * }
 * ```
 *
 * Example: Download and decrypt document
 *
 * ```ts
 * const profile = await prisma.employeeProfile.findUnique(...);
 * const encryptedBuffer = await downloadFromS3(profile.resumeUrl);
 *
 * const decrypted = decryptFile(
 *   encryptedBuffer,
 *   profile.resumeIv,
 *   profile.resumeAuthTag,
 *   profile.resumeSalt
 * );
 *
 * if (decrypted) {
 *   res.setHeader('Content-Type', 'application/pdf');
 *   res.send(decrypted);
 * }
 * ```
 */

/**
 * Key rotation utility
 * Encrypts data with a new key while keeping it accessible
 */
export async function rotateEncryption(
  oldEncrypted: Buffer,
  oldIv: string,
  oldAuthTag: string,
  oldSalt: string,
  newMasterKey: string
): Promise<{
  encrypted: Buffer;
  iv: string;
  authTag: string;
  salt: string;
} | null> {
  // Decrypt with old key
  const decrypted = decryptFile(oldEncrypted, oldIv, oldAuthTag, oldSalt);

  if (!decrypted) {
    return null;
  }

  // Re-encrypt with new key
  const oldKey = process.env.ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = newMasterKey;

  const reencrypted = encryptFile(decrypted);

  // Restore old key
  process.env.ENCRYPTION_KEY = oldKey;

  return reencrypted;
}

/**
 * Verify encryption setup
 */
export function verifyEncryptionSetup(): boolean {
  if (!ENCRYPTION_KEY) {
    console.error('[Encryption] ENCRYPTION_KEY not configured');
    return false;
  }

  if (ENCRYPTION_KEY.length !== 64) {
    // 32 bytes in hex = 64 characters
    console.error('[Encryption] ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    return false;
  }

  // Test encryption/decryption
  try {
    const testData = Buffer.from('test data');
    const encrypted = encryptFile(testData);

    if (!encrypted) {
      return false;
    }

    const decrypted = decryptFile(
      encrypted.encrypted,
      encrypted.iv,
      encrypted.authTag,
      encrypted.salt
    );

    if (!decrypted || !decrypted.equals(testData)) {
      console.error('[Encryption] Encryption test failed');
      return false;
    }

    console.log('[Encryption] Setup verified successfully');
    return true;
  } catch (error) {
    console.error('[Encryption] Setup verification failed:', error);
    return false;
  }
}

// Verify on module load
if (process.env.NODE_ENV === 'production' && ENCRYPTION_KEY) {
  verifyEncryptionSetup();
}
