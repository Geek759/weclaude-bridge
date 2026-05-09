import { decryptAesEcb } from "./aes.js";
import { log } from "../util/logger.js";

export function parseAesKey(raw: string): Buffer {
  // Handle both raw base64 and hex-encoded base64
  try {
    const decoded = Buffer.from(raw, "base64");
    if (decoded.length === 16) return decoded;
  } catch {}
  // Try hex decode first, then base64
  try {
    const hexDecoded = Buffer.from(raw, "hex").toString("utf-8");
    return Buffer.from(hexDecoded, "base64");
  } catch {}
  // Direct base64
  return Buffer.from(raw, "base64");
}

export async function downloadAndDecrypt(
  encryptedQueryParam: string,
  aesKeyRaw: string,
): Promise<Buffer> {
  const key = parseAesKey(aesKeyRaw);

  // Build CDN download URL
  const url = `https://cdn.wx.qq.com/cgi-bin/mmwebwx-bin/webwxgetmedia?${encryptedQueryParam}`;

  log("Downloading from CDN:", url.substring(0, 80) + "...");
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`CDN download failed: ${resp.status}`);
  }

  const encrypted = Buffer.from(await resp.arrayBuffer());
  log("Downloaded", encrypted.length, "bytes, decrypting...");

  const decrypted = decryptAesEcb(encrypted, key);
  return decrypted;
}
