import { execFile } from "node:child_process";
import { log } from "../util/logger.js";

export interface ClaudeResult {
  result: string;
  session_id: string;
  is_error: boolean;
}

export function askClaude(
  message: string,
  sessionID?: string,
): Promise<ClaudeResult> {
  return new Promise((resolve, reject) => {
    const args = [
      "--dangerously-skip-permissions",
      "--output-format",
      "json",
      "-p",
      message,
    ];

    if (sessionID) {
      args.push("--resume", sessionID);
    }

    log("Spawning claude with args:", args.slice(0, -1), "[message]");

    const child = execFile(
      "claude",
      args,
      { timeout: 5 * 60 * 1000 }, // 5 min timeout
      (error, stdout, stderr) => {
        if (error) {
          log("Claude error:", error.message);
          reject(error);
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          resolve({
            result: parsed.result || parsed.content || "",
            session_id: parsed.session_id || "",
            is_error: parsed.is_error || false,
          });
        } catch {
          // If JSON parse fails, treat stdout as plain text result
          resolve({
            result: stdout.trim(),
            session_id: "",
            is_error: false,
          });
        }
      },
    );
  });
}
