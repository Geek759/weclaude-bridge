# weclaude-bridge Design Spec

## Overview

A standalone TypeScript application that bridges WeChat to Claude Code. Extracts the WeChat API layer from the openclaw-weixin plugin, removes OpenClaw framework dependencies, and adds Claude CLI integration.

**Goal:** Send and receive text, images, and files between WeChat and Claude Code, with per-user session persistence and daemon mode.

## Architecture

```
WeChat User <-> iLink Bot API <-> weclaude-bridge <-> claude CLI
                                   |
                            +------+------+
                            | WeChat Layer|  (extracted from openclaw-weixin)
                            |  auth       |
                            |  messaging  |
                            |  CDN/crypto |
                            |  media      |
                            +-------------+
                            | Claude Layer|  (new)
                            |  CLI client |
                            |  sessions   |
                            +-------------+
                            | Main Loop   |  (new)
                            |  poller     |
                            |  daemon     |
                            +-------------+
```

## Directory Structure

```
weclaude-bridge/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # CLI entry point
│   ├── server.ts             # Main loop: poll -> process -> reply
│   ├── claude/
│   │   ├── client.ts         # Invoke claude CLI, parse JSON output
│   │   └── sessions.ts       # WeChat userID <-> Claude sessionID mapping
│   ├── wechat/
│   │   ├── api.ts            # iLink Bot HTTP client
│   │   ├── auth.ts           # QR code login flow
│   │   ├── poller.ts         # Long-poll getupdates
│   │   ├── sender.ts         # Send text + media messages
│   │   └── types.ts          # Message/item type definitions
│   ├── cdn/
│   │   ├── upload.ts         # AES encrypt + CDN upload
│   │   ├── download.ts       # CDN download + AES decrypt
│   │   └── aes.ts            # AES-128-ECB primitives
│   ├── media/
│   │   ├── send-media.ts     # Route by MIME type to upload+send
│   │   └── mime.ts           # MIME type detection
│   └── config/
│       └── paths.ts          # ~/.weclaude-bridge/ path management
```

## Key Components

### 1. WeChat API Client (wechat/api.ts)
- `POST /ilink/bot/getupdates` - long-poll messages
- `POST /ilink/bot/sendmessage` - send messages
- `POST /ilink/bot/getuploadurl` - get CDN upload presigned URL
- `POST /ilink/bot/qrcode` - login QR code
- `POST /ilink/bot/qrcode/status` - poll login status

### 2. Auth (wechat/auth.ts)
- QR code login via iLink API
- Terminal display + image file on Windows
- Token persistence to ~/.weclaude-bridge/auth.json

### 3. CDN Crypto (cdn/aes.ts, cdn/upload.ts, cdn/download.ts)
- AES-128-ECB encryption with PKCS7 padding
- Upload: read file -> hash -> gen AES key -> getUploadUrl -> POST ciphertext
- Download: fetch CDN -> AES decrypt

### 4. Claude Client (claude/client.ts)
- Wraps `claude` CLI: `--dangerously-skip-permissions --output-format json -p <msg>`
- Session resume: `--resume <sessionID>`
- 5 minute timeout, JSON output parsing

### 5. Session Store (claude/sessions.ts)
- Maps WeChat userID -> Claude sessionID
- Persists to ~/.weclaude-bridge/sessions.json
- Reset commands: /reset, /new, /clear

### 6. Main Loop (server.ts)
- Load auth (or trigger login)
- Start long-poll loop
- Dedup messages
- Forward to Claude CLI
- Send reply (text + media if applicable)
