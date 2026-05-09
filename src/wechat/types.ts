// WeChat iLink Bot API types

export const MessageType = {
  TEXT: 1,
  IMAGE: 2,
  VOICE: 3,
  FILE: 4,
  VIDEO: 5,
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

export const UploadMediaType = {
  IMAGE: 1,
  VIDEO: 2,
  FILE: 3,
} as const;

export type UploadMediaTypeValue =
  (typeof UploadMediaType)[keyof typeof UploadMediaType];

export const MessageState = {
  NORMAL: 0,
  REVOKED: 1,
} as const;

export interface WeixinMessage {
  msgId: string;
  fromUser: string;
  toUser: string;
  content: string;
  createTime: number;
  msgType: number;
  state: number;
  media?: CDNMedia;
}

export interface CDNMedia {
  filekey: string;
  downloadEncryptedQueryParam: string;
  aesKey: string;
  fileSize: number;
}

export interface MessageItem {
  msgId: string;
  fromUser: string;
  toUser: string;
  content: string;
  createTime: number;
  msgType: number;
  state: number;
  media?: CDNMedia;
}

export interface GetUpdatesReq {
  offset?: number;
  limit?: number;
  timeout?: number;
}

export interface GetUpdatesResp {
  ret: number;
  errmsg: string;
  msgList: MessageItem[];
}

export interface SendMessageReq {
  toUser: string;
  msgType: number;
  content?: string;
  media?: {
    filekey: string;
    downloadEncryptedQueryParam: string;
    aesKey: string;
    fileSize: number;
  };
}

export interface SendMessageResp {
  ret: number;
  errmsg: string;
  msgId?: string;
}

export interface GetUploadUrlReq {
  fileType: string;
  mediaType: number;
  fileSize: number;
}

export interface GetUploadUrlResp {
  ret: number;
  errmsg: string;
  filekey: string;
  uploadUrl: string;
  downloadEncryptedQueryParam: string;
  aesKey: string;
  expireTime: number;
}

export interface QRCodeResp {
  ret: number;
  errmsg: string;
  qrCodeUrl?: string;
  uuid?: string;
}

export interface QRStatusResp {
  ret: number;
  errmsg: string;
  status?: string;
  ticket?: string;
  redirectUrl?: string;
}

export interface LoginResp {
  ret: number;
  errmsg: string;
  operatorUsername?: string;
  botUin?: string;
  accessToken?: string;
  expireTime?: number;
}

export interface UploadedFileInfo {
  filekey: string;
  downloadEncryptedQueryParam: string;
  aesKey: string;
  fileSize: number;
  fileSizeCiphertext: number;
}
