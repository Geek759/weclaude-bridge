# weclaude-bridge Implementation Plan

**Goal:** Build a standalone TypeScript app that bridges WeChat to Claude Code with full media support.

**Architecture:** Extract WeChat API layer from openclaw-weixin, remove OpenClaw dependencies, add Claude CLI integration.

**Tech Stack:** TypeScript, Node.js 22+, claude CLI, iLink Bot API, AES-128-ECB crypto

## Tasks

1. Project Scaffold - package.json, tsconfig.json, types, paths, logger
2. Crypto Layer - AES-128-ECB encrypt/decrypt, CDN URL builders
3. WeChat API Client - HTTP client for iLink Bot API
4. Auth (QR Login) - QR code generation, scan polling, token persistence
5. CDN Upload & Download - Media upload with encryption, download with decryption
6. Messaging - Sender (text/image/file), MIME detection, media routing
7. Claude Integration - CLI wrapper, session store
8. Main Loop & CLI - Poller, server, CLI entry point
9. Install Dependencies & Build
10. End-to-End Test