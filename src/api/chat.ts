import { BASE_URL, request } from './request'
import { useAuthStore } from '../stores/auth'
import type { Conversation, Message, StreamCallbacks } from '../types/chat'

export function listConversations() {
  return request<Conversation[]>('/conversations')
}

export function getHistory(conversationId: number) {
  return request<Message[]>(`/conversations/${conversationId}/messages`)
}

export function deleteConversation(conversationId: number) {
  return request<void>(`/conversations/${conversationId}`, { method: 'DELETE' })
}

/**
 * 点火：起后台生成任务，立即返回会话ID。
 * token 事件由服务端缓存进 Redis Stream，凭返回的 ID 调 subscribeStream 订阅。
 */
export function startChat(message: string, conversationId: number | null) {
  return request<{ conversation_id: number }>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversation_id: conversationId }),
  })
}

/**
 * 订阅生成过程（SSE）：lastId 之后的事件重放 + 阻塞跟随，直到 done/error。
 * 生成在服务端独立进行，本连接可随时 abort（终止观看）或断线重连（断网续传），
 * 重连时带上最近收到的事件 id 即可从断点继续。
 * EventSource 不支持自定义 header，这里用 fetch + ReadableStream 手动解析。
 */
export async function subscribeStream(
  conversationId: number,
  lastId: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const auth = useAuthStore()
  const headers: Record<string, string> = {}
  if (auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`
  }

  const resp = await fetch(
    `${BASE_URL}/chat/${conversationId}/stream?last_id=${encodeURIComponent(lastId)}`,
    { headers, signal },
  )

  if (resp.status === 401) {
    // token 过期：清除登录态，头部会切换回登录按钮
    auth.logout()
    throw new Error('登录已过期，请重新登录')
  }
  if (!resp.ok || !resp.body) {
    throw new Error(`请求失败: ${resp.status}`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE 事件以空行分隔；心跳行（": ping"）不匹配 data: 前缀，自然忽略
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      const line = event.trim()
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed.id) callbacks.onId?.(parsed.id)
        if (parsed.type === 'meta') {
          callbacks.onMeta?.(parsed.conversation_id, !!parsed.rag, parsed.question)
        } else if (parsed.type === 'delta') {
          callbacks.onToken(parsed.delta, parsed.html)
        } else if (parsed.type === 'error') {
          callbacks.onError(parsed.message)
        } else if (parsed.type === 'done') {
          callbacks.onDone?.()
        }
      } catch {
        // 忽略不完整的 JSON 片段
      }
    }
  }
}
