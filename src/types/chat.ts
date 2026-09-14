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
}

/** SSE 流式回调 */
export interface StreamCallbacks {
  /** 首个事件：会话ID + 是否命中RAG检索 */
  onMeta?: (conversationId: number, rag: boolean) => void
  /** token: 原始 Markdown 增量；html: 后端渲染的完整 HTML 快照 */
  onToken: (token: string, html?: string) => void
  onError: (message: string) => void
}
