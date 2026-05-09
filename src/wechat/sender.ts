import { sendMessage } from "./api.js";
import { MessageType } from "./types.js";
import type { AuthData } from "./auth.js";
import { uploadImage, uploadFile } from "../cdn/upload.js";
import { log } from "../util/logger.js";

export class Sender {
  private auth: AuthData;

  constructor(auth: AuthData) {
    this.auth = auth;
  }

  async sendText(toUser: string, content: string): Promise<void> {
    const resp = await sendMessage(
      {
        toUser,
        msgType: MessageType.TEXT,
        content,
      },
      this.auth,
    );
    if (resp.ret !== 0) {
      log("sendText error:", resp.errmsg);
    }
  }

  async sendImage(toUser: string, filePath: string): Promise<void> {
    const uploaded = await uploadImage(filePath, this.auth);
    const resp = await sendMessage(
      {
        toUser,
        msgType: MessageType.IMAGE,
        media: {
          filekey: uploaded.filekey,
          downloadEncryptedQueryParam: uploaded.downloadEncryptedQueryParam,
          aesKey: uploaded.aesKey,
          fileSize: uploaded.fileSizeCiphertext,
        },
      },
      this.auth,
    );
    if (resp.ret !== 0) {
      log("sendImage error:", resp.errmsg);
    }
  }

  async sendFile(toUser: string, filePath: string): Promise<void> {
    const uploaded = await uploadFile(filePath, this.auth);
    const resp = await sendMessage(
      {
        toUser,
        msgType: MessageType.FILE,
        media: {
          filekey: uploaded.filekey,
          downloadEncryptedQueryParam: uploaded.downloadEncryptedQueryParam,
          aesKey: uploaded.aesKey,
          fileSize: uploaded.fileSizeCiphertext,
        },
      },
      this.auth,
    );
    if (resp.ret !== 0) {
      log("sendFile error:", resp.errmsg);
    }
  }
}
