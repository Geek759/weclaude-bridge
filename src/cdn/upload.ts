import fs from "node:fs";
import crypto from "node:crypto";
import { encryptAesEcb, aesEcbPaddedSize } from "./aes.js";
import { getUploadUrl } from "../wechat/api.js";
import type { AuthData } from "../wechat/auth.js";
import type { UploadedFileInfo } from "../wechat/types.js";
import { UploadMediaType } from "../wechat/types.js";
import { log } from "../util/logger.js";

export async function uploadMediaToCdn(
  filePath: string,
  mediaType: number,
  auth: AuthData,
): Promise<UploadedFileInfo> {
  const fileData = fs.readFileSync(filePath);
  const fileSize = fileData.length;

  // Hash the file
  const fileHash = crypto.createHash("md5").update(fileData).digest("hex");

  // Generate AES key
  const aesKeyBuffer = crypto.randomBytes(16);
  const aesKeyBase64 = aesKeyBuffer.toString("base64");

  // Get upload URL from API
  const ext = filePath.split(".").pop() || "";
  const uploadUrlResp = await getUploadUrl(
    {
      fileType: ext,
      mediaType,
      fileSize: aesEcbPaddedSize(fileSize),
    },
    auth,
  );

  if (uploadUrlResp.ret !== 0) {
    throw new Error(`Get upload URL failed: ${uploadUrlResp.errmsg}`);
  }

  // Encrypt file data
  const encrypted = encryptAesEcb(fileData, aesKeyBuffer);

  // Upload to CDN
  log("Uploading to CDN:", uploadUrlResp.uploadUrl);
  const resp = await fetch(uploadUrlResp.uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: encrypted,
  });

  if (!resp.ok) {
    throw new Error(`CDN upload failed: ${resp.status}`);
  }

  log("Upload complete, size:", fileSize, "-> encrypted:", encrypted.length);

  return {
    filekey: uploadUrlResp.filekey,
    downloadEncryptedQueryParam: uploadUrlResp.downloadEncryptedQueryParam,
    aesKey: uploadUrlResp.aesKey,
    fileSize,
    fileSizeCiphertext: encrypted.length,
  };
}

export async function uploadImage(
  filePath: string,
  auth: AuthData,
): Promise<UploadedFileInfo> {
  return uploadMediaToCdn(filePath, UploadMediaType.IMAGE, auth);
}

export async function uploadVideo(
  filePath: string,
  auth: AuthData,
): Promise<UploadedFileInfo> {
  return uploadMediaToCdn(filePath, UploadMediaType.VIDEO, auth);
}

export async function uploadFile(
  filePath: string,
  auth: AuthData,
): Promise<UploadedFileInfo> {
  return uploadMediaToCdn(filePath, UploadMediaType.FILE, auth);
}
