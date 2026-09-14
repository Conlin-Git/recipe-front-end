/**
 * 对话逻辑组合式函数：会话列表加载、历史加载、SSE 流式发送。
 * 上下文由服务端按 conversation_id 维护（Redis + MySQL）。
 */
import { deleteConversation, getHistory, listConversations, streamChat } from '../api/chat'
import { useChatStore } from '../stores/chat'

export function useChatStream() {
  const chatStore = useChatStore()

  async function loadConversations() {
    chatStore.setConversations(await listConversations())
  }

  /** 加载会话列表并自动进入最近一个会话（列表按更新时间倒序，第一个即最近） */
  async function loadLatestConversation() {
    await loadConversations()
    const latest = chatStore.conversations[0]
    if (latest && latest.id !== chatStore.currentConversationId) {
      chatStore.setCurrentConversation(latest.id)
      chatStore.setMessages(await getHistory(latest.id))
    }
  }

  async function selectConversation(id: number) {
    if (chatStore.streaming || id === chatStore.currentConversationId) return
    chatStore.setCurrentConversation(id)
    chatStore.setMessages(await getHistory(id))
  }

  function startNewConversation() {
    if (chatStore.streaming) return
    chatStore.resetConversation()
  }

  async function removeConversation(id: number) {
    await deleteConversation(id)
    chatStore.removeConversation(id)
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || chatStore.streaming) return

    const isNewConversation = chatStore.currentConversationId === null

    // 用户消息入列 + 系统消息占位
    chatStore.addMessage({ role: 'user', content })
    chatStore.addMessage({ role: 'assistant', content: '' })
    chatStore.setStreaming(true)

    try {
      await streamChat(content, chatStore.currentConversationId, {
        onMeta: (conversationId) => {
          chatStore.setCurrentConversation(conversationId)
          // 新会话：刷新侧边栏列表，让新会话出现
          if (isNewConversation) loadConversations()
        },
        onToken: (token, html) => chatStore.appendToLastMessage(token, html),
        onError: (message) => {
          chatStore.appendToLastMessage(`⚠️ ${message}`)
        },
      })
    } catch (e) {
      chatStore.appendToLastMessage(
        `⚠️ 出错了: ${e instanceof Error ? e.message : String(e)}`,
      )
    } finally {
      chatStore.setStreaming(false)
    }
  }

  return {
    send,
    loadConversations,
    loadLatestConversation,
    selectConversation,
    startNewConversation,
    removeConversation,
  }
}
