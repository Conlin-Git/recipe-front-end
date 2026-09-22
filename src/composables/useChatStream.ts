/**
 * 对话逻辑组合式函数：会话列表加载、历史加载、流式输出的观看控制。
 *
 * 生成与连接解耦（见后端 stream_service）：
 * - send 只点火（POST /chat），生成在服务端后台进行，token 缓存进 Redis Stream
 * - watchStream 订阅 SSE（可带断点 lastId 重连），支持停止生成（stop，真取消）/
 *   继续输出（resume）/ 断网自动重连 / 刷新页面自动续看
 * - 生成中可自由切换会话：切走只是停止观看，后端继续生成；侧边栏显示
 *   生成中动画，完成后（你不在这个会话时）由服务端 unread 标志打未读红点，
 *   靠 startPolling 定期同步
 * 上下文由服务端按 conversation_id 维护（Redis + MySQL）。
 */
import {
  deleteConversation,
  getHistory,
  listConversations,
  markConversationRead,
  startChat,
  stopChat,
  subscribeStream,
} from '../api/chat'
import { ApiError } from '../api/request'
import { useChatStore } from '../stores/chat'

/** 断线自动重连次数上限（指数退避 1s/2s/4s） */
const MAX_RETRY = 3

/** 后台生成轮询间隔：有会话在生成时同步列表（生成中动画/未读红点） */
const POLL_INTERVAL = 5000

export function useChatStream() {
  const chatStore = useChatStore()
  let abortController: AbortController | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function loadConversations() {
    // setConversations 会顺带同步 generatingIds（服务端生成中标记）
    chatStore.setConversations(await listConversations())
  }

  /** 后台生成轮询：登录后启动，生成中的会话完成后未读红点靠它及时出现 */
  function startPolling() {
    if (pollTimer) return
    pollTimer = setInterval(() => {
      if (chatStore.generatingIds.length > 0) loadConversations()
    }, POLL_INTERVAL)
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  /** 断开当前观看（≠停止生成）：切换会话/新对话/停止生成时调用，后端不受影响 */
  function stopWatching() {
    abortController?.abort()
    abortController = null
    chatStore.setStreaming(false)
  }

  /** 加载会话列表并自动进入最近一个会话（列表按更新时间倒序，第一个即最近） */
  async function loadLatestConversation() {
    await loadConversations()
    const latest = chatStore.conversations[0]
    if (latest && latest.id !== chatStore.currentConversationId) {
      chatStore.setCurrentConversation(latest.id)
      const page = await getHistory(latest.id)
      chatStore.setMessages(page.messages, page.has_more)
      chatStore.markConversationRead(latest.id)
      await maybeResumeGenerating(latest.id)
    }
  }

  async function selectConversation(id: number) {
    if (id === chatStore.currentConversationId) return
    // 生成中也可自由切换：切走只是停止观看，后端继续生成（完成后来未读红点）
    stopWatching()
    chatStore.setCurrentConversation(id)
    // 终止态和断点都绑定具体会话，切换时重置
    chatStore.setDetachedGenerating(false)
    chatStore.setLastStreamEventId('0')
    // 首屏只取最近一页（够上下文即可），更早的下拉加载
    const page = await getHistory(id)
    chatStore.setMessages(page.messages, page.has_more)
    // getHistory 服务端查看即已读，本地同步清红点
    chatStore.markConversationRead(id)
    await maybeResumeGenerating(id)
  }

  /** 下拉加载更早的历史：以当前最早一条消息的 id 为游标，取更早一页前插 */
  async function loadOlderMessages() {
    const cid = chatStore.currentConversationId
    const firstId = chatStore.messages[0]?.id
    if (!cid || !firstId || !chatStore.hasMoreHistory) return
    const page = await getHistory(cid, firstId)
    chatStore.prependMessages(page.messages)
    chatStore.setHasMoreHistory(page.has_more)
  }

  function startNewConversation() {
    // 生成中也可开新对话：旧会话后台继续，完成后打未读
    stopWatching()
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
        const page = await getHistory(cid)
        chatStore.setMessages(page.messages, page.has_more)
      }
      // 回答落库晚于进入会话时的已读标记：正在观看的当前会话补一次已读
      if (chatStore.currentConversationId === cid) {
        chatStore.markConversationRead(cid)
        markConversationRead(cid).catch(() => {})
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
    if (!content || chatStore.pending || chatStore.streaming || chatStore.detachedGenerating)
      return

    const isNewConversation = chatStore.currentConversationId === null

    // 用户消息入列 + 系统消息占位，随即进入 typing（pending）态：禁止再次输入
    chatStore.addMessage({ role: 'user', content })
    chatStore.addMessage({ role: 'assistant', content: '' })
    chatStore.setLastStreamEventId('0')
    chatStore.setPending(true)

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
      chatStore.setPending(false)
      return
    }

    // 点火成功，进入流式观看（watchStream 会置 streaming），typing 态结束
    chatStore.setPending(false)
    chatStore.setCurrentConversation(cid)
    chatStore.addGeneratingId(cid)
    // 新会话：刷新侧边栏列表，让新会话出现
    if (isNewConversation) loadConversations()
    await watchStream(cid, '0')
  }

  /**
   * 停止生成：真正中断后端任务（唯一会终止生成的操作）。
   * 已输出的部分被后端抛弃、只留用户问题，拉历史对齐后输入框立即可用。
   */
  async function stop() {
    const cid = chatStore.currentConversationId
    if (!cid) return
    try {
      await stopChat(cid)
    } catch (e) {
      // 409 = 生成刚好已完成：同样走收尾刷新；其他错误保持观看并提示
      if (!(e instanceof ApiError && e.status === 409)) {
        chatStore.appendToLastMessage(
          `⚠️ 停止失败: ${e instanceof Error ? e.message : String(e)}`,
        )
        return
      }
    }
    stopWatching()
    chatStore.removeGeneratingId(cid)
    // 后端只落库了用户问题（部分输出已抛弃）：拉历史对齐（顺带标已读）
    const page = await getHistory(cid)
    chatStore.setMessages(page.messages, page.has_more)
    chatStore.markConversationRead(cid)
    loadConversations()
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
    startPolling,
    stopPolling,
    loadOlderMessages,
  }
}
