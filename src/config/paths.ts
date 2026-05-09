import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const HOME = os.homedir();
const BASE_DIR = path.join(HOME, ".weclaude-bridge");

export const AUTH_FILE = "auth.json";
export const SESSION_STORE_FILE = "sessions.json";
export const DAEMON_PID_FILE = "daemon.pid";
export const LOG_FILE = "bridge.log";

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getBaseDir(): string {
  ensureDir(BASE_DIR);
  return BASE_DIR;
}

export function getAuthPath(): string {
  return path.join(getBaseDir(), AUTH_FILE);
}

export function getSessionStorePath(): string {
  return path.join(getBaseDir(), SESSION_STORE_FILE);
}

export function getDaemonPidPath(): string {
  return path.join(getBaseDir(), DAEMON_PID_FILE);
}

export function getLogPath(): string {
  return path.join(getBaseDir(), LOG_FILE);
}

export function getMediaDir(): string {
  const dir = path.join(getBaseDir(), "media", "temp");
  ensureDir(dir);
  return dir;
}
