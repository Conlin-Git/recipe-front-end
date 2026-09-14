import { defineStore } from 'pinia'
import type { Conversation, Message } from '../types/chat'

interface ChatState {
  conversations: Conversation[]
  currentConversationId: number | null
  messages: Message[]
  streaming: boolean
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    conversations: [],
    currentConversationId: null,
    messages: [],
    streaming: false,
  }),
  actions: {
    setConversations(list: Conversation[]) {
      this.conversations = list
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
    appendToLastMessage(token: string, html?: string) {
      const last = this.messages[this.messages.length - 1]
      if (!last) return
      last.content += token
      if (html !== undefined) last.html = html
    },
    setStreaming(value: boolean) {
      this.streaming = value
    },
    /** 新对话：清空当前会话状态 */
    resetConversation() {
      this.currentConversationId = null
      this.messages = []
    },
    removeConversation(id: number) {
      this.conversations = this.conversations.filter((c) => c.id !== id)
      if (this.currentConversationId === id) {
        this.resetConversation()
      }
    },
  },
})
