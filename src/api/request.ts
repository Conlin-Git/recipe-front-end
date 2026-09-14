/**
 * fetch 统一封装：baseURL、token 注入、统一错误格式。
 * 所有 api/*.ts 都走这里，组件不直接 fetch。
 */
import { useAuthStore } from '../stores/auth'

const BASE_URL = '/api/v1'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const auth = useAuthStore()
  const headers = new Headers(options.headers)
  // FormData 不能手动设 Content-Type——浏览器会自动带上 multipart boundary，写死会破坏上传
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (auth.token) {
    headers.set('Authorization', `Bearer ${auth.token}`)
  }

  const resp = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (resp.status === 401) {
    auth.logout()
    throw new ApiError(401, '未登录或登录已过期')
  }
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new ApiError(resp.status, body.message ?? `请求失败: ${resp.status}`)
  }
  // 204 No Content
  if (resp.status === 204) return undefined as T
  return resp.json()
}

export { BASE_URL }
