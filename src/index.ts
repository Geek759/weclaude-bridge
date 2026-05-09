#!/usr/bin/env node

import { runServer } from "./server.js";
import { getAuthPath, getSessionStorePath, getMediaDir } from "./config/paths.js";
import { loadAuth } from "./wechat/auth.js";
import { SessionStore } from "./claude/sessions.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cmd = process.argv[2];

const HELP = `
weclaude-bridge - WeChat ↔ Claude Code Bridge

Usage:
  weclaude [command]

Commands:
  login    Start QR code login flow
  status   Show current auth status
  reset    Reset session store
  logout   Clear saved auth
  version  Show version
  help     Show this help

Default (no command): Start the bridge server
`;

const pkgPath = path.resolve(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

switch (cmd) {
  case "login": {
    const { login } = await import("./wechat/auth.js");
    await login();
    break;
  }
  case "status": {
    const auth = await loadAuth();
    if (auth) {
      console.log("Authenticated:", auth.operatorUsername);
      console.log("BotUin:", auth.botUin);
      console.log("Token expires:", new Date(auth.expireTime).toISOString());
    } else {
      console.log("Not authenticated. Run: weclaude login");
    }
    break;
  }
  case "reset": {
    const sp = getSessionStorePath();
    if (fs.existsSync(sp)) {
      fs.unlinkSync(sp);
      console.log("Session store cleared.");
    } else {
      console.log("No session store found.");
    }
    break;
  }
  case "logout": {
    const ap = getAuthPath();
    if (fs.existsSync(ap)) {
      fs.unlinkSync(ap);
      console.log("Auth cleared.");
    } else {
      console.log("No auth found.");
    }
    break;
  }
  case "version":
    console.log(pkg.version);
    break;
  case "help":
  case "--help":
  case "-h":
    console.log(HELP);
    break;
  default:
    await runServer();
    break;
}
