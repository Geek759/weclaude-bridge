import fs from "node:fs";
import { logger } from "./util/logger.js";
import { loadAuth, login, type Auth } from "./wechat/auth.js";
import { Poller, type InboundMessage } from "./wechat/poller.js";
import { sendText } from "./wechat/sender.js";
import { sendWeixinMediaFile } from "./media/send-media.js";
import { askClaude, findTerminalSessionId } from "./claude/client.js";
import { SessionStore } from "./claude/sessions.js";

const MAX_MSG_LEN = 4000;
const RESET_COMMANDS = new Set(["/reset", "reset", "/new", "新对话", "新会话"]);

function splitText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end >= text.length) { chunks.push(text.slice(start)); break; }
    const nl = text.lastIndexOf("\n", end);
    if (nl > start) end = nl + 1;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

export class Server {
  private auth: Auth;
  private sessions = new SessionStore();
  private processing = new Set<string>();
  private poller: Poller;
  private sharedSessionId: string | null = null;

  constructor(auth: Auth, sharedSessionId?: string) {
    this.auth = auth;
    this.sharedSessionId = sharedSessionId || null;
    this.poller = new Poller({
      baseUrl: auth.base_url, token: auth.bot_token,
      cdnBaseUrl: auth.base_url.replace("ilinkai", "cdn"),
    });
  }

  async start(): Promise<void> {
    logger.info(`已登录: ${this.auth.user_id || this.auth.bot_id}`);
    if (this.sharedSessionId) {
      logger.info(`复用终端会话: ${this.sharedSessionId}`);
    } else {
      logger.info("未找到终端会话，将为每个用户创建独立会话");
    }
    const controller = new AbortController();
    process.on("SIGINT", () => { logger.info("收到退出信号..."); controller.abort(); });
    process.on("SIGTERM", () => { logger.info("收到终止信号..."); controller.abort(); });

    await this.poller.start(controller.signal, (msg) => this.handleMessage(msg));
  }

  private async handleMessage(msg: InboundMessage): Promise<void> {
    const { userID, text, contextToken } = msg;
    logger.info(`[${new Date().toLocaleTimeString()}] ${userID}: ${text.slice(0, 80)}`);

    if (this.processing.has(userID)) {
      await sendText(userID, "上一条消息还在处理中，请稍候...", { baseUrl: this.auth.base_url, token: this.auth.bot_token, contextToken }).catch(() => {});
      return;
    }
    this.processing.add(userID);

    try {
      // Reset
      if (RESET_COMMANDS.has(text.trim().toLowerCase())) {
        this.sessions.delete(userID);
        await sendText(userID, "对话已重置，开始新的会话。", { baseUrl: this.auth.base_url, token: this.auth.bot_token, contextToken });
        return;
      }

      // Build prompt
      let prompt = text;
      if (msg.mediaPath) {
        prompt = prompt
          ? `${prompt}\n\n[用户发送了文件: ${msg.mediaPath}]`
          : `[用户发送了文件: ${msg.mediaPath}]`;
      }

      // Ask Claude - use shared terminal session or per-user session
      const sessionID = this.sharedSessionId || this.sessions.get(userID);
      logger.debug(`claude session: ${sessionID || "new"}`);

      let result: { text: string; sessionID: string };
      try {
        result = await askClaude(prompt, sessionID);
      } catch (err) {
        const errMsg = String(err);
        if (sessionID && errMsg.includes("No conversation found")) {
          logger.info(`session ${sessionID} 已失效，创建新会话`);
          result = await askClaude(prompt);
        } else {
          throw err;
        }
      }

      if (result.sessionID) this.sessions.set(userID, result.sessionID);

      const reply = result.text;
      if (!reply) {
        await sendText(userID, "(Claude 未返回回复)", { baseUrl: this.auth.base_url, token: this.auth.bot_token, contextToken });
        return;
      }

      // Check for file references in reply
      const fileMatches = reply.match(/(?:\/[\w./-]+\.\w+|[A-Z]:\\[\\w\\. -]+)/g);
      const sendOpts = { baseUrl: this.auth.base_url, token: this.auth.bot_token, contextToken };

      if (fileMatches) {
        for (const filePath of fileMatches) {
          if (fs.existsSync(filePath)) {
            try {
              await sendWeixinMediaFile({
                filePath, to: userID, text: "", opts: sendOpts,
                cdnBaseUrl: this.auth.base_url.replace("ilinkai", "cdn"),
              });
            } catch (err) {
              logger.error(`发送文件失败 ${filePath}: ${err}`);
            }
          }
        }
      }

      // Send text reply
      for (const chunk of splitText(reply, MAX_MSG_LEN)) {
        await sendText(userID, chunk, sendOpts);
      }

      logger.info(`[${new Date().toLocaleTimeString()}] -> ${userID} (${reply.length} chars)`);
    } catch (err) {
      logger.error(`处理消息失败: ${err}`);
      await sendText(userID, `抱歉，处理出错了: ${String(err).slice(0, 200)}`, {
        baseUrl: this.auth.base_url, token: this.auth.bot_token, contextToken,
      }).catch(() => {});
    } finally {
      this.processing.delete(userID);
    }
  }
}

export async function runServer(): Promise<void> {
  let auth = loadAuth();
  if (!auth) {
    logger.info("未登录，开始扫码登录...");
    auth = await login();
  }

  // Try to find and reuse the current terminal's Claude session
  const terminalSessionId = process.env.CLAUDE_SESSION_ID || findTerminalSessionId();

  const server = new Server(auth, terminalSessionId || undefined);
  await server.start();
}
