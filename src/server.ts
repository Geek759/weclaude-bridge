import { loadAuth, login } from "./wechat/auth.js";
import { Poller } from "./wechat/poller.js";
import { Sender } from "./wechat/sender.js";
import { askClaude } from "./claude/client.js";
import { SessionStore } from "./claude/sessions.js";
import { log } from "./util/logger.js";
import fs from "node:fs";
import path from "node:path";

const RESET_COMMANDS = new Set(["/reset", "/new", "/clear", "/restart"]);

export class Server {
  private sender!: Sender;
  private sessions: SessionStore;
  private processedMsgIds = new Set<string>();

  constructor() {
    this.sessions = new SessionStore();
  }

  async handleMessage(msg: {
    msgId: string;
    fromUser: string;
    content: string;
    msgType: number;
  }): Promise<void> {
    // Dedup
    if (this.processedMsgIds.has(msg.msgId)) return;
    this.processedMsgIds.add(msg.msgId);

    // Keep set from growing unbounded
    if (this.processedMsgIds.size > 10000) {
      const arr = [...this.processedMsgIds];
      this.processedMsgIds = new Set(arr.slice(-5000));
    }

    const userID = msg.fromUser;
    const text = msg.content.trim();

    // Reset command
    if (RESET_COMMANDS.has(text)) {
      this.sessions.delete(userID);
      await this.sender.sendText(userID, "Session reset.");
      return;
    }

    // Ask Claude
    const sessionID = this.sessions.get(userID);
    try {
      const result = await askClaude(text, sessionID);

      if (result.session_id) {
        this.sessions.set(userID, result.session_id);
      }

      // Send reply
      if (result.result) {
        await this.sender.sendText(userID, result.result);

        // Check if Claude output references local files
        await this.sendFileReferences(userID, result.result);
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      log("Claude error:", errMsg);
      await this.sender.sendText(userID, `Error: ${errMsg}`);
    }
  }

  private async sendFileReferences(userID: string, text: string): Promise<void> {
    // Match file paths in Claude output
    const pathRegex =
      /(?:^|[\s"'`])([A-Za-z]:\\[\S]+|\/[\S]+\.[a-zA-Z0-9]{1,5})(?:[\s"'`]|$)/gm;
    const matches = text.matchAll(pathRegex);

    for (const match of matches) {
      const filePath = match[1].replace(/["'`,.:;]+$/, "");
      try {
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            log("Sending file reference:", filePath);
            if (/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filePath)) {
              await this.sender.sendImage(userID, filePath);
            } else {
              await this.sender.sendFile(userID, filePath);
            }
          }
        }
      } catch {
        // Ignore file send errors
      }
    }
  }
}

export async function runServer(): Promise<void> {
  console.log("\n=== weclaude-bridge ===");

  let auth = await loadAuth();
  if (!auth) {
    console.log("Not logged in. Starting login flow...");
    auth = await login();
  }

  console.log(`\nLogged in as: ${auth.operatorUsername}`);
  console.log("Starting message poller...\n");

  const poller = new Poller(auth);
  const server = new Server();
  server["sender"] = new Sender(auth);

  const ac = new AbortController();

  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    ac.abort();
  });

  process.on("SIGTERM", () => {
    ac.abort();
  });

  await poller.start(ac.signal, (msg) => {
    server.handleMessage(msg).catch((e) => log("handleMessage error:", e));
  });
}
