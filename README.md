# recipe-front-end

多智能体智能问答助手前端。Vue 3 + TypeScript 单页应用，提供注册登录（密码 RSA 加密传输）、会话管理（未读红点 / 生成中动画 / 历史分页）和**断点续传**的流式对话界面，实时渲染后端多 Agent 系统返回的 Markdown/HTML 回答——菜谱步骤配图、开发问答的代码块、日常闲聊，一个对话框全覆盖。

配套后端仓库：[recipe-back-end](../recipe-back-end)。

## 功能特性

- **流式对话（点火 / 订阅两段式）**：`POST /chat` 点火拿会话 ID，`GET /chat/{id}/stream` 带断点订阅 SSE——服务端渲染的全量 HTML 逐帧替换，打字机效果；发送后到首个 token 返回前有 typing（pending）态，期间禁止重复输入
- **停止生成 / 断网续传**：生成在服务端后台跑，与连接解耦——
  - 「停止生成」：`POST /chat/{id}/stop` 真正中断后端任务（唯一会终止生成的操作），已输出部分被后端抛弃，历史只留用户问题
  - 意外断线：指数退避（1s/2s/4s）自动带断点重连；重连失败出现「继续生成」按钮，从断点重放接上
  - 切换会话 / 新对话：生成中可自由切走，只是停止观看，后端继续生成
  - 刷新页面：按会话列表的 `generating` 标记自动重放续看进行中的回答
- **会话管理**：会话列表按更新时间倒序——生成中的会话打脉动点，切走后生成完成的打**未读红点**（5s 轮询同步，查看即已读）；新建 / 切换 / 删除会话，进入应用自动打开最近会话；历史消息首屏只取最近一页，滚动到顶自动**下拉加载**更早消息（游标分页，前插时保持滚动位置）
- **用户体系**：注册 / 登录弹窗——密码先经 WebCrypto 用 RSA-OAEP 公钥加密再传输（公钥进页面即预热缓存，后端换钥导致 400 时自动清缓存重拉）；个人资料弹窗改昵称、传头像（原图直传 ≤10MB，压缩在后端做）；设置弹窗（关于我们 / 退出登录）
- **全局轻提示**：操作成功/失败走单例 toast（`useToast` + `BaseToast`），不阻塞弹窗交互
- **Markdown 展示**：列表、小标题、代码块（开发问答）及菜谱步骤配图（经后端图片代理出图，原图加载失败自动回退 200_ 缩略图）
- **移动端适配**：禁缩放 viewport + `position: fixed`  body，防 iOS 微信聚焦输入框自动放大、页面级橡皮筋滚动；`public/` 内置微信域名验证文件
- **状态管理**：Pinia 分模块管理登录态（auth）与对话状态（chat）

## 技术栈

Vue 3（`<script setup>`）· TypeScript · Vite · Pinia · 原生 fetch（SSE / REST 统一封装）

## 目录结构

```
src/
├── main.ts / App.vue / style.css  # App 挂载全局 toast、预热登录公钥
├── views/
│   └── chat/ChatView.vue          # 聊天主页面（弹窗调度、后台生成轮询启停）
├── components/
│   ├── chat/                      # ConversationList 会话列表（生成中脉动点/未读红点）
│   │                              # MessageList 消息列表（下拉加载历史/停止·继续生成按钮）
│   │                              # MessageItem 单条消息（图片缩略图回退）/ ChatInput 输入框
│   ├── auth/AuthDialog.vue        # 登录注册弹窗
│   ├── profile/ProfileDialog.vue  # 个人资料弹窗（昵称 + 头像）
│   ├── settings/SettingsDialog.vue  # 设置弹窗（关于我们 / 退出登录）
│   └── common/                    # BaseDialog / BaseToast / UserAvatar 通用组件
├── stores/
│   ├── auth.ts                    # 登录态、token、当前用户
│   └── chat.ts                    # 会话列表、generatingIds、当前会话、消息流、
│                                # pending/streaming 状态、历史分页 hasMoreHistory
├── composables/
│   ├── useChatStream.ts           # 订阅生命周期：点火/观看/停止生成/续看/断网重连/
│   │                              # 刷新恢复/后台生成轮询/历史分页加载
│   └── useToast.ts                # 全局轻提示单例
├── utils/
│   └── passwordCrypto.ts          # RSA-OAEP 密码加密（WebCrypto，公钥缓存与换钥重拉）
├── api/
│   ├── request.ts                 # fetch 统一封装：baseURL、token 注入、
│   │                              # {code,data,msg} 标准封装解析、统一 ApiError
│   ├── chat.ts                    # startChat 点火 + subscribeStream SSE 订阅（带断点）
│   │                              # + stopChat 停止生成 + 历史分页/已读接口
│   ├── auth.ts / user.ts          # 认证（密码加密后传输）与用户接口
└── types/                         # chat / user 的 TS 类型定义
```

## 架构要点

- **两段式流式协议**：`api/chat.ts` —— `startChat` POST 点火返回 `conversation_id`；`subscribeStream` 用 fetch + ReadableStream 订阅 `/chat/{id}/stream?last_id=`，逐帧解析 `data:` 事件：meta 帧拿 RAG 命中标记（刷新恢复场景用 `question` 重建尚未落库的用户气泡），delta 帧的 `html` 字段全量替换渲染（服务端已做 Markdown → HTML 与安全消毒），done/stopped/error 帧收尾（stopped 是手动停止的终态，按完成处理）；每帧的流 entry id 记为断点
- **观看与生成解耦**：`useChatStream` 只管本地订阅生命周期——断网按指数退避自动重连（上限 3 次）；切换会话/新对话只是 `stopWatching`（断本地连接，后端照跑）；「停止生成」才调 `stopChat` 真正中断后端任务，随后拉历史对齐（后端只落库了用户问题）；刷新后若会话在 `generatingIds` 里且本地没在观看，自动从 `'0'` 全量重放续看
- **后台生成感知**：登录后启动 5s 轮询——有会话在生成时同步列表，生成中脉动点与完成后的未读红点都靠它及时刷新；正在观看的会话在生成结束后补调 `markConversationRead`（消息落库晚于进入会话时的已读标记）
- **历史游标分页**：`getHistory(cid, beforeId?)` 首屏取最新一页，滚动到顶以最早一条消息的 id 为游标取更早一页前插；`MessageList` 记住加载前滚动高度做补偿，视口停在原消息上不跳动
- **密码加密传输**：`utils/passwordCrypto.ts` 进页面即预热拉取 `/auth/public-key`（SPKI），登录/注册用 WebCrypto `RSA-OAEP(SHA-256)` 加密密码成 base64 密文再提交；后端重启换钥导致密文 400 时清缓存、下次重拉（401 密码错误不动缓存）
- **统一响应封装**：`api/request.ts` 解析后端 `{code, data, msg}` 标准封装——`code !== 0` 或 HTTP 非 2xx 统一抛 `ApiError`（带后端 msg）；带 token 的 401 清登录态，登录接口自身的 401（密码错误）直接展示后端提示
- **上下文在服务端维护**：前端只传 `conversation_id` 和当前消息，多轮上下文（热缓存 + 滚动摘要）、多 Agent 编排路由都由后端管理
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

前端消费后端 `/api/v1` 下的接口：`POST /chat`（点火）、`GET /chat/{id}/stream`（SSE 订阅）、`POST /chat/{id}/stop`（停止生成）、`GET /auth/public-key`（密码加密公钥）、`POST /auth/register|login`、`GET|DELETE /conversations`、`GET /conversations/{id}/messages?before_id=`（游标分页）、`POST /conversations/{id}/read`（已读）、`GET|PUT /users/me`、`POST /users/me/avatar`。菜谱步骤配图经 `GET /image-proxy/{host}/{path}` 中转。所有 JSON 响应均为 `{code, data, msg}` 标准封装，详见后端 README 的 API 概览。
