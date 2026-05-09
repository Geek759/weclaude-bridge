import { getUpdates } from "./api.js";
import { MessageType } from "./types.js";
import type { MessageItem, WeixinMessage } from "./types.js";
import type { AuthData } from "./auth.js";
import { downloadAndDecrypt } from "../cdn/download.js";
import { getMediaDir } from "../config/paths.js";
import { log } from "../util/logger.js";
import fs from "node:fs";
import path from "node:path";

export class Poller {
  private auth: AuthData;
  private lastMsgId: string | null = null;

  constructor(auth: AuthData) {
    this.auth = auth;
  }

  async pollOnce(): Promise<WeixinMessage[]> {
    const resp = await getUpdates({ timeout: 35 }, this.auth);
    if (resp.ret !== 0) {
      log("getUpdates error:", resp.errmsg);
      return [];
    }
    if (!resp.msgList || resp.msgList.length === 0) return [];

    const messages: WeixinMessage[] = [];
    for (const item of resp.msgList) {
      // Skip already seen messages
      if (this.lastMsgId && item.msgId <= this.lastMsgId) continue;

      const msg = await this.parseMessage(item);
      messages.push(msg);
    }

    // Update last seen
    if (resp.msgList.length > 0) {
      this.lastMsgId = resp.msgList[resp.msgList.length - 1].msgId;
    }

    return messages;
  }

  async start(
    signal: AbortSignal,
    onMessage: (msg: WeixinMessage) => void,
  ): Promise<void> {
    log("Poller started");
    while (!signal.aborted) {
      try {
        const messages = await this.pollOnce();
        for (const msg of messages) {
          onMessage(msg);
        }
      } catch (e) {
        log("Poll error:", e);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    log("Poller stopped");
  }

  private async parseMessage(item: MessageItem): Promise<WeixinMessage> {
    const msg: WeixinMessage = {
      msgId: item.msgId,
      fromUser: item.fromUser,
      toUser: item.toUser,
      content: item.content,
      createTime: item.createTime,
      msgType: item.msgType,
      state: item.state,
    };

    // Download media if present
    if (
      item.media &&
      (item.msgType === MessageType.IMAGE ||
        item.msgType === MessageType.FILE ||
        item.msgType === MessageType.VIDEO)
    ) {
      try {
        const localPath = await this.downloadMedia(item.media, item.msgType);
        if (localPath) {
          msg.content = localPath;
        }
      } catch (e) {
        log("Media download failed:", e);
      }
    }

    return msg;
  }

  private async downloadMedia(
    media: { filekey: string; downloadEncryptedQueryParam: string; aesKey: string; fileSize: number },
    msgType: number,
  ): Promise<string | null> {
    const ext =
      msgType === MessageType.IMAGE
        ? ".jpg"
        : msgType === MessageType.VIDEO
          ? ".mp4"
          : "";
    const filename = `${media.filekey}${ext}`;
    const outPath = path.join(getMediaDir(), filename);

    if (fs.existsSync(outPath)) return outPath;

    const decrypted = await downloadAndDecrypt(
      media.downloadEncryptedQueryParam,
      media.aesKey,
    );
    fs.writeFileSync(outPath, decrypted);
    log("Downloaded media:", outPath);
    return outPath;
  }
}
