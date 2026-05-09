const DEBUG = process.env.WECLAUDE_DEBUG === "1";

export function log(...args: unknown[]): void {
  if (DEBUG) {
    console.error("[weclaude]", ...args);
  }
}
