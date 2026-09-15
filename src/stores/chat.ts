import { defineStore } from 'pinia'
import type { Conversation, Message } from '../types/chat'

interface ChatState {
  conversations: Conversation[]
  currentConversationId: number | null
  messages: Message[]
  /** 当前会话：已发送、点火请求进行中（首个 token 未回，机器人 typing 中） */
  pending: boolean
  /** 当前会话：正在观看流式输出 */
  streaming: boolean
  /** 当前会话：后端还在生成，但用户已终止观看（可点「继续输出」重连） */
  detachedGenerating: boolean
  /** 后端有生成任务在跑的会话（从列表接口的 generating 标志同步） */
  generatingIds: number[]
  /** 当前订阅的断点（流 entry id），断线重连/继续输出用 */
  lastStreamEventId: string
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    conversations: [],
    currentConversationId: null,
    messages: [],
    pending: false,
    streaming: false,
    detachedGenerating: false,
    generatingIds: [],
    lastStreamEventId: '0',
  }),
  actions: {
    setConversations(list: Conversation[]) {
      this.conversations = list
      // 与服务端的生成中标记保持同步（已结束的自动移出）
      this.generatingIds = list.filter((c) => c.generating).map((c) => c.id)
    },
    setCurrentConversation(id: number | null) {
      this.currentConversationId = id
    },
    setMessages(list: Message[]) {
      this.messages = list
    },
    addMessage(msg: Message) {
      this.messages.push(msg)
    },
    /** 在最后一条消息前插入（刷新恢复时把用户气泡插回助手占位前） */
    insertMessageBeforeLast(msg: Message) {
      this.messages.splice(Math.max(this.messages.length - 1, 0), 0, msg)
    },
    appendToLastMessage(token: string, html?: string) {
      const last = this.messages[this.messages.length - 1]
      if (!last) return
      last.content += token
      if (html !== undefined) last.html = html
    },
    setPending(value: boolean) {
      this.pending = value
    },
    setStreaming(value: boolean) {
      this.streaming = value
    },
    setDetachedGenerating(value: boolean) {
      this.detachedGenerating = value
    },
    addGeneratingId(id: number) {
      if (!this.generatingIds.includes(id)) this.generatingIds.push(id)
    },
    removeGeneratingId(id: number) {
      this.generatingIds = this.generatingIds.filter((g) => g !== id)
    },
    setLastStreamEventId(id: string) {
      this.lastStreamEventId = id
    },
    /** 新对话：清空当前会话状态 */
    resetConversation() {
      this.currentConversationId = null
      this.messages = []
      this.detachedGenerating = false
      this.lastStreamEventId = '0'
    },
    removeConversation(id: number) {
      this.conversations = this.conversations.filter((c) => c.id !== id)
      this.removeGeneratingId(id)
      if (this.currentConversationId === id) {
        this.resetConversation()
      }
    },
  },
})
