import { isImage, isVideo } from "./mime.js";
import type { Sender } from "../wechat/sender.js";
import { log } from "../util/logger.js";

export async function sendWeixinMediaFile(
  sender: Sender,
  toUser: string,
  filePath: string,
): Promise<void> {
  if (isImage(filePath)) {
    await sender.sendImage(toUser, filePath);
  } else if (isVideo(filePath)) {
    // Video upload not yet implemented, send as file
    await sender.sendFile(toUser, filePath);
  } else {
    await sender.sendFile(toUser, filePath);
  }
  log("Sent media:", filePath);
}
