/**
 * 密码传输加密：RSA-OAEP(SHA-256)，用浏览器原生 WebCrypto，无第三方依赖。
 * 登录/注册前用服务端公钥加密密码，密文传输，服务端私钥解密。
 * （注意：WebCrypto 仅在安全上下文可用——localhost 或 HTTPS）
 */
import { request } from '../api/request'

let cachedKey: CryptoKey | null = null

/** PEM 转 DER：去头尾和换行后 base64 解码 */
function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function getPublicKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const { public_key } = await request<{ public_key: string }>('/auth/public-key')
  cachedKey = await crypto.subtle.importKey(
    'spki',
    pemToDer(public_key),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  return cachedKey
}

/** 后端重启（开发环境临时密钥轮换）后公钥会换，调用方失败时可清缓存重试 */
export function clearCachedPublicKey() {
  cachedKey = null
}

export async function encryptPassword(plain: string): Promise<string> {
  const key = await getPublicKey()
  const cipher = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    new TextEncoder().encode(plain),
  )
  const bytes = new Uint8Array(cipher)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
