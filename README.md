# recipe-front-end

多智能体智能问答助手前端。Vue 3 + TypeScript 单页应用，提供注册登录、会话管理和**断点续传**的流式对话界面，实时渲染后端多 Agent 系统返回的 Markdown/HTML 回答——菜谱步骤配图、开发问答的代码块、日常闲聊，一个对话框全覆盖。

配套后端仓库：[recipe-back-end](../recipe-back-end)。

## 功能特性

- **流式对话（点火 / 订阅两段式）**：`POST /chat` 点火拿会话 ID，`GET /chat/{id}/stream` 带断点订阅 SSE——服务端渲染的全量 HTML 逐帧替换，打字机效果
- **断网续传**：生成在服务端后台跑，与连接解耦——终止观看 / 断网 / 刷新页面都不中断生成：
  - 意外断线：指数退避（1s/2s/4s）自动带断点重连
  - 终止观看：只断本地连接，随时点「继续输出」从断点重放接上
  - 刷新页面：按会话列表的 `generating` 标记自动重放续看进行中的回答
- **会话管理**：会话列表（按更新时间倒序、生成中打标）、新建 / 切换 / 删除会话、历史消息加载，进入应用自动打开最近会话
- **用户体系**：注册 / 登录弹窗（JWT 存本地）、个人资料修改、头像上传
- **Markdown 展示**：列表、小标题、代码块（开发问答）及菜谱步骤配图
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
│   └── chat.ts                    # 会话列表、generatingIds、当前会话、消息流、streaming 状态
├── composables/
│   └── useChatStream.ts           # 订阅生命周期：点火/观看/终止/续看/断网重连/刷新恢复
├── api/
│   ├── request.ts                 # fetch 统一封装：baseURL、token 注入、统一错误格式
│   ├── chat.ts                    # startChat 点火 + watchStream SSE 订阅（带断点）
│   ├── auth.ts / user.ts          # 认证与用户接口
└── types/                         # chat / user 的 TS 类型定义
```

## 架构要点

- **两段式流式协议**：`api/chat.ts` —— `startChat` POST 点火返回 `conversation_id`；`watchStream` 用 fetch + ReadableStream 订阅 `/chat/{id}/stream?last_id=`，逐帧解析 `data:` 事件：meta 帧拿 RAG 命中标记（刷新恢复场景用 `question` 重建尚未落库的用户气泡），delta 帧的 `html` 字段全量替换渲染（服务端已做 Markdown → HTML 与安全消毒），done/error 帧收尾；每帧的流 entry id 记为断点
- **观看与生成解耦**：`useChatStream` 只管本地订阅生命周期——终止观看只断开连接（后端照跑，token 都在 Redis 缓冲里）；断网按指数退避自动重连（上限 3 次）；切换会话时重置断点与终止态；刷新后若会话在 `generatingIds` 里且本地没在观看，自动从 `'0'` 全量重放续看
- **上下文在服务端维护**：前端只传 `conversation_id` 和当前消息，多轮上下文（热缓存 + 滚动摘要）、多 Agent 编排路由都由后端管理
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

前端消费后端 `/api/v1` 下的接口：`POST /chat`（点火）、`GET /chat/{id}/stream`（SSE 订阅）、`POST /auth/register|login`、`GET|DELETE /conversations`、`GET /conversations/{id}/messages`、`GET|PUT /users/me`、`POST /users/me/avatar`。详见后端 README 的 API 概览。
