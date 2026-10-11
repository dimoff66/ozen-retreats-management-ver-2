import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "scrypt$v1";
const KEY_LENGTH = 64;
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 3;
const SCRYPT_MAX_MEMORY = 128 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      }
    );
  });
}

export function isPasswordHash(value: string): boolean {
  return value.startsWith(`${HASH_PREFIX}$`);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);

  return [
    HASH_PREFIX,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedPassword: string): Promise<boolean> {
  if (!isPasswordHash(storedPassword)) {
    const provided = Buffer.from(password);
    const stored = Buffer.from(storedPassword);

    return provided.length === stored.length && timingSafeEqual(provided, stored);
  }

  const parts = storedPassword.split("$");

  if (parts.length !== 7) {
    return false;
  }

  const n = Number(parts[2]);
  const r = Number(parts[3]);
  const p = Number(parts[4]);
  const salt = Buffer.from(parts[5], "base64url");
  const expectedKey = Buffer.from(parts[6], "base64url");

  if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P || expectedKey.length !== KEY_LENGTH) {
    return false;
  }

  const actualKey = await deriveKey(password, salt);

  return actualKey.length === expectedKey.length && timingSafeEqual(actualKey, expectedKey);
}
