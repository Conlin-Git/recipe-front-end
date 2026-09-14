import { defineStore } from 'pinia'
import type { User } from '../types/user'

const TOKEN_KEY = 'recipe_token'

/**
 * 登录态有效期（24小时）由后端 JWT exp 强制控制。
 * 前端只负责带 token；接口返回 401 时 request.ts / streamChat 会调用 logout() 清空。
 */
interface AuthState {
  token: string
  user: User | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem(TOKEN_KEY) ?? '',
    user: null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    setToken(token: string) {
      this.token = token
      localStorage.setItem(TOKEN_KEY, token)
    },
    setUser(user: User) {
      this.user = user
    },
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem(TOKEN_KEY)
    },
  },
})
