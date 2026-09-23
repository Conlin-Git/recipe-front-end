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

  // 204 No Content
  if (resp.status === 204) return undefined as T
  // 标准封装：{code, data, msg}——code 0 正常，其他异常（HTTP 状态码保留语义）
  const body = await resp.json().catch(() => null)
  if (resp.status === 401) {
    // 带 token 的 401 = 登录过期（清登录态）；登录接口自身的 401（密码错误）
    // 没有 token，直接用后端 msg 提示，不误报「登录过期」
    if (auth.token) auth.logout()
    throw new ApiError(401, body?.msg ?? '未登录或登录已过期')
  }
  if (!resp.ok) {
    throw new ApiError(resp.status, body?.msg ?? `请求失败: ${resp.status}`)
  }
  if (body && typeof body === 'object' && 'code' in body) {
    if (body.code !== 0) {
      throw new ApiError(resp.status, body.msg || '请求失败')
    }
    return body.data as T
  }
  return body as T
}

export { BASE_URL }
