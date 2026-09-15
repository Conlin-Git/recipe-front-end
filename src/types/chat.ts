export interface Message {
  role: 'user' | 'assistant'
  /** 原始 Markdown 文本（用于多轮 history 回传） */
  content: string
  /** 后端渲染好的完整 HTML（assistant 消息直接 v-html 展示） */
  html?: string
}

export interface Conversation {
  id: number
  title: string
  created_at: string
  updated_at: string
  /** 后端是否有生成任务在进行（刷新页面后据此自动续看） */
  generating?: boolean
}

/** SSE 流式回调（生成与连接解耦版：事件带断点 id，可断线重连） */
export interface StreamCallbacks {
  /** 每个事件的流 entry id：断线重连的断点 */
  onId?: (id: string) => void
  /** meta 事件：会话ID + 是否命中RAG + 原始问题（刷新恢复时重建用户气泡用） */
  onMeta?: (conversationId: number, rag: boolean, question?: string) => void
  /** token: 原始 Markdown 增量；html: 后端渲染的完整 HTML 快照 */
  onToken: (token: string, html?: string) => void
  /** 服务端发来的业务错误事件（流随后正常结束） */
  onError: (message: string) => void
  /** 生成正常完成 */
  onDone?: () => void
}
