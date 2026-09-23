import { request, ApiError } from './request'
import { clearCachedPublicKey, encryptPassword } from '../utils/passwordCrypto'
import type { LoginParams, RegisterParams, TokenResult, User } from '../types/user'

/** 只有密文无效（400，后端重启换钥）才清公钥缓存，下次点击会重拉；
 *  密码错误（401）等业务失败不动缓存——否则每次登录失败都会白拉一次公钥 */
function clearKeyOnRotation(e: unknown) {
  if (e instanceof ApiError && e.status === 400) clearCachedPublicKey()
}

export async function login(params: LoginParams) {
  // 密码 RSA 加密后传输，不落明文
  try {
    const password = await encryptPassword(params.password)
    return await request<TokenResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...params, password }),
    })
  } catch (e) {
    clearKeyOnRotation(e)
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
    clearKeyOnRotation(e)
    throw e
  }
}

export function logout() {
  return request<void>('/auth/logout', { method: 'POST' })
}
