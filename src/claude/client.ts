import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logger } from "../util/logger.js";

const claudeBin = process.env.CLAUDE_BIN || "claude";

interface ClaudeOutput {
  result: string;
  session_id: string;
  is_error: boolean;
}

export interface TerminalSession {
  sessionId: string;
  cwd: string;
  pid: number;
}

/** Find the session ID and working directory of the currently running Claude Code terminal session */
export function findTerminalSession(): TerminalSession | null {
  const sessionsDir = path.join(os.homedir(), ".claude", "sessions");
  try {
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith(".json"));
    const sorted = files
      .map(f => ({
        name: f,
        mtime: fs.statSync(path.join(sessionsDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    for (const file of sorted) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(sessionsDir, file.name), "utf-8"));
        if (data.sessionId && data.cwd && data.kind === "interactive") {
          try {
            process.kill(data.pid, 0);
            logger.info(`Found terminal session: ${data.sessionId} (pid=${data.pid}, cwd=${data.cwd})`);
            return { sessionId: data.sessionId, cwd: data.cwd, pid: data.pid };
          } catch {
            // Process not alive, skip
          }
        }
      } catch {}
    }
  } catch {}
  return null;
}

export async function askClaude(message: string, sessionID?: string, cwd?: string): Promise<{ text: string; sessionID: string }> {
  const args = ["--dangerously-skip-permissions", "--output-format", "json", "-p", message];
  if (sessionID) args.unshift("--resume", sessionID);

  logger.debug(`claude ${args.slice(0, 5).join(" ")}...`);

  const result = await spawnClaude(args, cwd);

  try {
    const out: ClaudeOutput = JSON.parse(result);
    if (out.is_error) throw new Error(`Claude error: ${out.result}`);
    return { text: out.result, sessionID: out.session_id };
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`Claude output parse failed: ${result.slice(0, 300)}`);
    }
    throw err;
  }
}

function spawnClaude(args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(claudeBin, args, {
      env: { ...process.env },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: cwd || process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    proc.on("error", (err) => {
      reject(new Error(`claude failed: ${err.message}\n${stderr.slice(0, 300)}`));
    });

    // 5 minute timeout
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("claude timeout (5 min)"));
    }, 5 * 60_000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !stdout) {
        reject(new Error(`claude exited with code ${code}\n${stderr.slice(0, 300)}`));
        return;
      }
      if (stderr) logger.debug(`[claude stderr] ${stderr.slice(0, 200)}`);
      resolve(stdout);
    });
  });
}
