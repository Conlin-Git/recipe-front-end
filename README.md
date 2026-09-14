# recipe-front-end

菜谱智能助手前端。Vue 3 + TypeScript 单页应用，提供注册登录、会话管理和 SSE 流式对话界面，实时渲染后端返回的 Markdown/HTML 回答（含菜谱步骤配图）。

配套后端仓库：[recipe-back-end](../recipe-back-end)。

## 功能特性

- **流式对话**：通过 SSE 接收后端逐字生成的回答，直接渲染服务端推送的全量 HTML，打字机效果
- **会话管理**：会话列表（按更新时间倒序）、新建 / 切换 / 删除会话、历史消息加载，进入应用自动打开最近会话
- **用户体系**：注册 / 登录弹窗（JWT 存本地）、个人资料修改、头像上传
- **Markdown 展示**：回答含列表、小标题、代码块及菜谱步骤配图
- **状态管理**：Pinia 分模块管理登录态（auth）与对话状态（chat）

## 技术栈

Vue 3（`<script setup>`）· TypeScript · Vite · Pinia · 原生 fetch（SSE / REST 统一封装）

## 目录结构

```
src/
├── main.ts / App.vue / style.css
├── views/
│   └── chat/ChatView.vue          # 聊天主页面
├── components/
│   ├── chat/                      # ConversationList 会话列表 / MessageList 消息列表
│   │                              # MessageItem 单条消息 / ChatInput 输入框
│   ├── auth/AuthDialog.vue        # 登录注册弹窗
│   ├── profile/ProfileDialog.vue  # 个人资料弹窗
│   └── common/                    # BaseDialog / UserAvatar 通用组件
├── stores/
│   ├── auth.ts                    # 登录态、token、当前用户
│   └── chat.ts                    # 会话列表、当前会话、消息流、streaming 状态
├── composables/
│   └── useChatStream.ts           # 对话逻辑：列表/历史加载、SSE 流式发送
├── api/
│   ├── request.ts                 # fetch 统一封装：baseURL、token 注入、统一错误格式
│   ├── chat.ts                    # 对话与会话接口（streamChat 解析 SSE）
│   ├── auth.ts / user.ts          # 认证与用户接口
└── types/                         # chat / user 的 TS 类型定义
```

## 架构要点

- **SSE 流式接收**：`api/chat.ts` 用 fetch + ReadableStream 读取 `text/event-stream`，逐帧解析 `data:` 事件——首帧拿 `conversation_id` 与 RAG 命中标记，后续帧的 `html` 字段直接替换渲染（服务端已做 Markdown → HTML 与安全消毒），收到 `[DONE]` 结束
- **上下文在服务端维护**：前端只传 `conversation_id` 和当前消息，多轮上下文（热缓存 + 滚动摘要）由后端管理
- **请求封装**：组件不直接 fetch，统一走 `api/request.ts`（自动注入 JWT、统一抛 `ApiError`）
- **开发代理**：Vite 把 `/api` 和 `/uploads`（头像等上传文件）代理到本地 8000 端口的后端，见 [vite.config.ts](vite.config.ts)

## 快速开始

前置：后端已启动在 `http://localhost:8000`（见后端 README）。

```bash
npm install
npm run dev        # 开发服务器（默认 :5173，/api 代理到 :8000）
```

其他命令：

```bash
npm run build      # vue-tsc 类型检查 + 生产构建
npm run preview    # 本地预览构建产物
```

## 后端接口依赖

前端消费后端 `/api/v1` 下的接口：`POST /chat`（SSE）、`POST /auth/register|login`、`GET|DELETE /conversations`、`GET /conversations/{id}/messages`、`GET|PUT /users/me`、`POST /users/me/avatar`。详见后端 README 的 API 概览。
