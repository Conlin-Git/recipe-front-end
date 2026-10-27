import { defineStore } from 'pinia'
import type { User } from '../types/user'
import { getFilingReviewToken, isTokenUnexpired } from '../utils/filingReview'

const TOKEN_KEY = 'recipe_token'
const REVIEW_TOKEN = import.meta.env.VITE_FILING_REVIEW_TOKEN?.trim() ?? ''

function initialToken() {
  const saved = localStorage.getItem(TOKEN_KEY) ?? ''
  if (isTokenUnexpired(saved)) return saved
  localStorage.removeItem(TOKEN_KEY)
  // 公开审核凭证只从当前构建读取，不写入浏览器，撤下配置后刷新即停用。
  return getFilingReviewToken(REVIEW_TOKEN)
}

/**
 * 普通登录态 24 小时，内置审核态 30 天，由后端 JWT exp 强制控制。
 * 前端只负责带 token；接口返回 401 时 request.ts / streamChat 会调用 logout() 清空。
 */
interface AuthState {
  token: string
  user: User | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: initialToken(),
    user: null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isReviewSession: (state) => !!state.token && state.token === REVIEW_TOKEN,
  },
  actions: {
    setToken(token: string) {
      this.token = token
      localStorage.setItem(TOKEN_KEY, token)
    },
    useReviewSession() {
      const token = getFilingReviewToken(REVIEW_TOKEN)
      if (!token) return false
      this.token = token
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      return true
    },
    setUser(user: User) {
      this.user = user
    },
    logout() {
      const token = this.token
      const isReviewSession = this.isReviewSession
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
      // 通知后端吊销 token（fire-and-forget）。
      // 直接 fetch 不走 request()：401 时 request() 会回调 logout()，走它会无限递归
      if (token && !isReviewSession) {
        fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
    },
  },
})
