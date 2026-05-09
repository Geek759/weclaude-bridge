import type {
  GetUpdatesReq,
  GetUpdatesResp,
  SendMessageReq,
  SendMessageResp,
  GetUploadUrlReq,
  GetUploadUrlResp,
  QRCodeResp,
  QRStatusResp,
  LoginResp,
} from "./types.js";
import { loadAuth, type AuthData } from "./auth.js";
import { log } from "../util/logger.js";

const BASE_URL = "https://ilinkai.weixin.qq.com";

function randomBase64(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildHeaders(auth?: AuthData): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-WECHAT-UIN": randomBase64(16),
    AuthorizationType: "ilink_bot_token",
  };
  if (auth?.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return headers;
}

async function apiPost<T>(
  path: string,
  body: unknown,
  auth?: AuthData,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  log("API POST", path);
  const resp = await fetch(url, {
    method: "POST",
    headers: buildHeaders(auth),
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new Error(`API error ${resp.status}: ${resp.statusText}`);
  }
  return (await resp.json()) as T;
}

export async function getUpdates(
  req: GetUpdatesReq,
  auth?: AuthData,
): Promise<GetUpdatesResp> {
  return apiPost<GetUpdatesResp>("/ilink/bot/getupdates", req, auth);
}

export async function sendMessage(
  req: SendMessageReq,
  auth?: AuthData,
): Promise<SendMessageResp> {
  return apiPost<SendMessageResp>("/ilink/bot/sendmessage", req, auth);
}

export async function getUploadUrl(
  req: GetUploadUrlReq,
  auth?: AuthData,
): Promise<GetUploadUrlResp> {
  return apiPost<GetUploadUrlResp>("/ilink/bot/getuploadurl", req, auth);
}

export async function fetchQRCode(): Promise<QRCodeResp> {
  return apiPost<QRCodeResp>("/ilink/bot/qrcode", {}, undefined);
}

export async function pollQRStatus(uuid: string): Promise<QRStatusResp> {
  return apiPost<QRStatusResp>(
    "/ilink/bot/qrcode/status",
    { uuid },
    undefined,
  );
}

export async function loginWithTicket(
  ticket: string,
): Promise<LoginResp> {
  return apiPost<LoginResp>(
    "/ilink/bot/login",
    { ticket },
    undefined,
  );
}
