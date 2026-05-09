# weclaude-bridge

WeChat ↔ Claude Code 桥接工具。通过微信 iLink Bot API 将微信消息转发到 Claude Code CLI，支持文本、图片和文件的双向传递。

## 架构

```
微信用户 <-> iLink Bot API <-> weclaude-bridge <-> claude CLI
```

## 功能

- 微信扫码登录
- 文本对话（支持会话上下文持久化）
- 图片收发（AES-128-ECB 加密上传/下载）
- 文件收发
- 会话管理（/reset 重置会话）
- 自动检测 Claude 输出中的文件引用并发送到微信

## 前置要求

- Node.js >= 22
- [Claude Code CLI](https://claude.ai/code) 已安装并可用
- 微信账号

## 安装

```bash
git clone https://github.com/Geek759/weclaude-bridge.git
cd weclaude-bridge
npm install
npm run build
```

## 使用

### 登录

```bash
node dist/index.js login
```

扫描终端显示的二维码完成微信登录。

### 启动桥接服务

```bash
node dist/index.js
```

启动后会自动监听微信消息，收到消息后转发给 Claude Code，再将回复发送回微信。

### 其他命令

```bash
node dist/index.js status   # 查看登录状态
node dist/index.js reset    # 重置所有会话
node dist/index.js logout   # 退出登录
node dist/index.js version  # 显示版本
node dist/index.js help     # 显示帮助
```

### 微信内命令

在微信对话中发送以下消息可以控制会话：

- `/reset` - 重置当前会话
- `/new` - 开始新会话
- `/clear` - 清除会话历史

## 配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `WECLAUDE_DEBUG` | 启用调试日志 | `0` |

## 数据存储

所有数据保存在 `~/.weclaude-bridge/` 目录下：

- `auth.json` - 登录凭证
- `sessions.json` - 会话映射（微信用户 ID → Claude 会话 ID）
- `media/temp/` - 临时媒体文件

## 项目结构

```
src/
├── index.ts              # CLI 入口
├── server.ts             # 主循环：轮询 → 处理 → 回复
├── claude/
│   ├── client.ts         # Claude CLI 调用
│   └── sessions.ts       # 会话管理
├── wechat/
│   ├── api.ts            # iLink Bot API 客户端
│   ├── auth.ts           # 扫码登录
│   ├── poller.ts         # 消息轮询
│   ├── sender.ts         # 消息发送
│   └── types.ts          # 类型定义
├── cdn/
│   ├── aes.ts            # AES-128-ECB 加密
│   ├── upload.ts         # CDN 上传
│   └── download.ts       # CDN 下载
├── media/
│   ├── send-media.ts     # 媒体路由
│   └── mime.ts           # MIME 类型检测
└── config/
    └── paths.ts          # 路径管理
```

## 致谢

- [openclaw-weixin](https://github.com/nicepkg/openclaw-weixin) - 微信 iLink Bot API 层
- [Claude Code](https://claude.ai/code) - AI 编程助手

## License

MIT
