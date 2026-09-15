/**
 * 对话逻辑组合式函数：会话列表加载、历史加载、流式输出的观看控制。
 *
 * 生成与连接解耦（见后端 stream_service）：
 * - send 只点火（POST /chat），生成在服务端后台进行，token 缓存进 Redis Stream
 * - watchStream 订阅 SSE（可带断点 lastId 重连），支持终止观看（stop）/
 *   继续输出（resume）/ 断网自动重连 / 刷新页面自动续看
 * 上下文由服务端按 conversation_id 维护（Redis + MySQL）。
 */
import {
  deleteConversation,
  getHistory,
  listConversations,
  startChat,
  subscribeStream,
} from '../api/chat'
import { useChatStore } from '../stores/chat'

/** 断线自动重连次数上限（指数退避 1s/2s/4s） */
const MAX_RETRY = 3

export function useChatStream() {
  const chatStore = useChatStore()
  let abortController: AbortController | null = null

  async function loadConversations() {
    // setConversations 会顺带同步 generatingIds（服务端生成中标记）
    chatStore.setConversations(await listConversations())
  }

  /** 加载会话列表并自动进入最近一个会话（列表按更新时间倒序，第一个即最近） */
  async function loadLatestConversation() {
    await loadConversations()
    const latest = chatStore.conversations[0]
    if (latest && latest.id !== chatStore.currentConversationId) {
      chatStore.setCurrentConversation(latest.id)
      chatStore.setMessages(await getHistory(latest.id))
      await maybeResumeGenerating(latest.id)
    }
  }

  async function selectConversation(id: number) {
    if (chatStore.streaming || id === chatStore.currentConversationId) return
    chatStore.setCurrentConversation(id)
    // 终止态和断点都绑定具体会话，切换时重置
    chatStore.setDetachedGenerating(false)
    chatStore.setLastStreamEventId('0')
    chatStore.setMessages(await getHistory(id))
    await maybeResumeGenerating(id)
  }

  function startNewConversation() {
    if (chatStore.streaming) return
    chatStore.resetConversation()
  }

  async function removeConversation(id: number) {
    await deleteConversation(id)
    chatStore.removeConversation(id)
  }

  /**
   * 观看生成流：订阅 → 逐 token 渲染 → 结束清理。
   * rebuildUserBubble：刷新恢复场景——本轮用户消息还没落库、不在历史里，
   * 靠 meta 事件带回的 question 把用户气泡插回助手占位前。
   */
  async function watchStream(
    cid: number,
    fromId: string,
    rebuildUserBubble = false,
    attempt = 0,
  ): Promise<void> {
    const controller = new AbortController()
    abortController = controller
    chatStore.setStreaming(true)
    chatStore.setDetachedGenerating(false)
    let receivedAny = false

    try {
      await subscribeStream(
        cid,
        fromId,
        {
          onId: (id) => chatStore.setLastStreamEventId(id),
          onMeta: (_cid, _rag, question) => {
            if (rebuildUserBubble && question) {
              chatStore.insertMessageBeforeLast({ role: 'user', content: question })
              rebuildUserBubble = false
            }
          },
          onToken: (token, html) => {
            receivedAny = true
            chatStore.appendToLastMessage(token, html)
          },
          onError: (message) => {
            receivedAny = true
            chatStore.appendToLastMessage(`⚠️ ${message}`)
          },
        },
        controller.signal,
      )
      // 正常到 [DONE]：本轮生成结束
      chatStore.removeGeneratingId(cid)
      if (!receivedAny && chatStore.currentConversationId === cid) {
        // 缓冲已过期等场景：拉历史兜底，保证最终回答能显示
        chatStore.setMessages(await getHistory(cid))
      }
      loadConversations() // 刷新列表：updated_at 和 generating 标志
    } catch (e) {
      if (controller.signal.aborted) return // 主动终止：detached 由 stop() 设置
      if (attempt < MAX_RETRY) {
        // 断网等意外：带断点自动重连（指数退避）
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
        if (controller.signal.aborted) return
        return watchStream(
          cid,
          chatStore.lastStreamEventId,
          rebuildUserBubble,
          attempt + 1,
        )
      }
      chatStore.appendToLastMessage('⚠️ 连接中断，点「继续输出」重试')
      chatStore.setDetachedGenerating(true)
    } finally {
      // 重连递归会换新的 controller，旧帧不动全局状态
      if (abortController === controller) {
        chatStore.setStreaming(false)
        abortController = null
      }
    }
  }

  /** 后端在生成而本地没在观看（刷新/切换会话进来）：全量重放接上 */
  async function maybeResumeGenerating(cid: number) {
    if (!chatStore.generatingIds.includes(cid) || chatStore.streaming) return
    chatStore.setLastStreamEventId('0')
    chatStore.addMessage({ role: 'assistant', content: '' })
    await watchStream(cid, '0', true)
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || chatStore.streaming || chatStore.detachedGenerating) return

    const isNewConversation = chatStore.currentConversationId === null

    // 用户消息入列 + 系统消息占位
    chatStore.addMessage({ role: 'user', content })
    chatStore.addMessage({ role: 'assistant', content: '' })
    chatStore.setLastStreamEventId('0')

    let cid: number
    try {
      ;({ conversation_id: cid } = await startChat(
        content,
        chatStore.currentConversationId,
      ))
    } catch (e) {
      chatStore.appendToLastMessage(
        `⚠️ 出错了: ${e instanceof Error ? e.message : String(e)}`,
      )
      return
    }

    chatStore.setCurrentConversation(cid)
    chatStore.addGeneratingId(cid)
    // 新会话：刷新侧边栏列表，让新会话出现
    if (isNewConversation) loadConversations()
    await watchStream(cid, '0')
  }

  /** 终止观看：只断开本地连接，后端继续生成完（token 都在缓存里） */
  function stop() {
    abortController?.abort()
    chatStore.setStreaming(false)
    chatStore.setDetachedGenerating(true)
  }

  /** 继续输出：从断点重连，重放缓存后接上实时流 */
  async function resume() {
    const cid = chatStore.currentConversationId
    if (!cid || chatStore.streaming) return
    if (!chatStore.generatingIds.includes(cid)) return
    // 占位气泡：当前回答始终渲染在最后一条 assistant 上
    const last = chatStore.messages[chatStore.messages.length - 1]
    if (!last || last.role !== 'assistant') {
      chatStore.addMessage({ role: 'assistant', content: '' })
    }
    await watchStream(cid, chatStore.lastStreamEventId)
  }

  return {
    send,
    stop,
    resume,
    loadConversations,
    loadLatestConversation,
    selectConversation,
    startNewConversation,
    removeConversation,
  }
}
