import fs from "node:fs";
import { getAuthPath } from "../config/paths.js";
import { fetchQRCode, pollQRStatus, loginWithTicket } from "./api.js";
import { log } from "../util/logger.js";

export interface AuthData {
  operatorUsername: string;
  botUin: string;
  accessToken: string;
  expireTime: number;
}

export async function loadAuth(): Promise<AuthData | null> {
  const p = getAuthPath();
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    if (data.expireTime && Date.now() > data.expireTime) {
      log("Auth token expired");
      return null;
    }
    return data as AuthData;
  } catch {
    return null;
  }
}

export async function saveAuth(auth: AuthData): Promise<void> {
  const p = getAuthPath();
  fs.writeFileSync(p, JSON.stringify(auth, null, 2), "utf-8");
  log("Auth saved to", p);
}

export async function login(): Promise<AuthData> {
  console.log("\nScan the QR code below to log in:\n");

  const qrResp = await fetchQRCode();
  if (qrResp.ret !== 0 || !qrResp.qrCodeUrl) {
    throw new Error(`Failed to get QR code: ${qrResp.errmsg}`);
  }

  // Display QR in terminal
  const qrt = (await import("qrcode-terminal")).default;
  qrt.generate(qrResp.qrCodeUrl, { small: true });

  // Also save QR image
  try {
    const QRCode = (await import("qrcode")).default;
    const { getMediaDir } = await import("../config/paths.js");
    const qrPath = getMediaDir() + "/login-qr.png";
    await QRCode.toFile(qrPath, qrResp.qrCodeUrl);
    console.log(`QR code saved to: ${qrPath}`);
  } catch (e) {
    log("Failed to save QR image:", e);
  }

  console.log("\nWaiting for scan...");

  const uuid = qrResp.uuid!;
  const startTime = Date.now();
  const TIMEOUT = 5 * 60 * 1000; // 5 minutes

  while (Date.now() - startTime < TIMEOUT) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusResp = await pollQRStatus(uuid);
    log("QR status:", statusResp.status);

    if (statusResp.status === "scanned") {
      console.log("\nQR scanned! Waiting for confirmation...");
    } else if (statusResp.status === "confirmed" && statusResp.ticket) {
      console.log("\nLogin confirmed!");
      const loginResp = await loginWithTicket(statusResp.ticket);
      if (loginResp.ret !== 0 || !loginResp.accessToken) {
        throw new Error(`Login failed: ${loginResp.errmsg}`);
      }

      const auth: AuthData = {
        operatorUsername: loginResp.operatorUsername || "",
        botUin: loginResp.botUin || "",
        accessToken: loginResp.accessToken,
        expireTime: loginResp.expireTime || Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      await saveAuth(auth);
      console.log(`\nLogged in as: ${auth.operatorUsername}`);
      console.log(`BotUin: ${auth.botUin}`);
      return auth;
    } else if (statusResp.status === "expired") {
      throw new Error("QR code expired. Please try again.");
    } else if (statusResp.status === "scanned_but_redirect") {
      console.log("\nQR scanned from different IDC. Getting new QR...");
      return login();
    }
  }

  throw new Error("Login timeout (5 minutes).");
}
