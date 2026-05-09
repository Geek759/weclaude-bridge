import crypto from "node:crypto";

const ALGORITHM = "aes-128-ecb";

export function encryptAesEcb(data: Buffer, key: Buffer): Buffer {
  const cipher = crypto.createCipheriv(ALGORITHM, key, null);
  return Buffer.concat([cipher.update(data), cipher.final()]);
}

export function decryptAesEcb(data: Buffer, key: Buffer): Buffer {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, null);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function aesEcbPaddedSize(size: number): number {
  // PKCS7 padding: rounds up to next 16-byte boundary
  return Math.ceil(size / 16) * 16;
}
