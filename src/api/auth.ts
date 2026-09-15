import { request } from './request'
import { clearCachedPublicKey, encryptPassword } from '../utils/passwordCrypto'
import type { LoginParams, RegisterParams, TokenResult, User } from '../types/user'

export async function login(params: LoginParams) {
  // 密码 RSA 加密后传输，不落明文；失败时清公钥缓存（后端重启可能换钥），下次重试会重拉
  try {
    const password = await encryptPassword(params.password)
    return await request<TokenResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...params, password }),
    })
  } catch (e) {
    clearCachedPublicKey()
    throw e
  }
}

export async function register(params: RegisterParams) {
  try {
    const password = await encryptPassword(params.password)
    return await request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...params, password }),
    })
  } catch (e) {
    clearCachedPublicKey()
    throw e
  }
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' })
}
