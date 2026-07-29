import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function parseKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("TOKEN_ENCRYPTION_KEY is missing");
  }
  let key: Buffer;
  try {
    key = Buffer.from(trimmed, "base64");
  } catch {
    throw new Error("TOKEN_ENCRYPTION_KEY must be valid base64");
  }
  if (key.length !== KEY_LENGTH) {
    // try hex
    key = Buffer.from(trimmed, "hex");
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return key;
}

export function getTokenEncryptionKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is missing");
  return parseKey(raw);
}

/**
 * AES-256-GCM encrypt. Format: base64url(iv || ciphertext || authTag)
 */
export function encryptAesGcm(plaintext: string, key?: Buffer): string {
  const k = key ?? getTokenEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64url");
}

export function decryptAesGcm(payload: string, key?: Buffer): string {
  const k = key ?? getTokenEncryptionKey();
  const buf = Buffer.from(payload, "base64url");
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Invalid ciphertext");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", k, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
