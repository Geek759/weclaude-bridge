import fs from "node:fs";
import { getSessionStorePath } from "../config/paths.js";
import { log } from "../util/logger.js";

interface SessionMap {
  [userID: string]: string; // userID -> claude sessionID
}

export class SessionStore {
  private data: SessionMap = {};
  private filePath: string;

  constructor() {
    this.filePath = getSessionStorePath();
    this.load();
  }

  private load(): void {
    if (fs.existsSync(this.filePath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      } catch {
        this.data = {};
      }
    }
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  get(userID: string): string | undefined {
    return this.data[userID];
  }

  set(userID: string, sessionID: string): void {
    this.data[userID] = sessionID;
    this.save();
  }

  delete(userID: string): void {
    delete this.data[userID];
    this.save();
  }

  clear(): void {
    this.data = {};
    this.save();
  }
}
