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
 * 发送消息并以 SSE 流式接收回复。
 * 上下文由服务端按 conversationId 维护，无需前端传历史。
 * EventSource 不支持 POST，这里用 fetch + ReadableStream 手动解析。
 */
export async function streamChat(
  message: string,
  conversationId: number | null,
  callbacks: StreamCallbacks,
): Promise<void> {
  const auth = useAuthStore()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth.token) {
    headers['Authorization'] = `Bearer ${auth.token}`
  }

  const resp = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message, conversation_id: conversationId }),
  })

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

    // SSE 事件以空行分隔
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const event of events) {
      const line = event.trim()
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) {
          callbacks.onError(parsed.error)
        } else if (parsed.conversation_id !== undefined) {
          callbacks.onMeta?.(parsed.conversation_id, !!parsed.rag)
        } else if (parsed.delta || parsed.content) {
          callbacks.onToken(parsed.delta ?? parsed.content, parsed.html)
        }
      } catch {
        // 忽略不完整的 JSON 片段
      }
    }
  }
}
