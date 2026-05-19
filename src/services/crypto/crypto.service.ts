import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { createLogger } from "@/lib/logger";

const log = createLogger("CryptoService");

/**
 * AES-256-GCM encryption/decryption service for Telegram session strings.
 * Uses a 32-byte key from the ENCRYPTION_KEY environment variable.
 */

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  return Buffer.from(key, "hex");
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns the ciphertext, IV, and authentication tag — all as hex strings.
 */
export function encryptSession(plaintext: string): EncryptedData {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(16); // 128-bit IV
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    return {
      encrypted,
      iv: iv.toString("hex"),
      authTag,
    };
  } catch (error) {
    log.error("Failed to encrypt session", error);
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Requires the ciphertext, IV, and authentication tag (all as hex strings).
 */
export function decryptSession(
  encrypted: string,
  iv: string,
  authTag: string
): string {
  try {
    const key = getEncryptionKey();
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    log.error("Failed to decrypt session", error);
    throw new Error("Decryption failed — key may have changed or data is corrupted");
  }
}
