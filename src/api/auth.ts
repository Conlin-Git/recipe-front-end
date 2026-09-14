import { request } from './request'
import type { LoginParams, RegisterParams, TokenResult, User } from '../types/user'

export function login(params: LoginParams) {
  return request<TokenResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export function register(params: RegisterParams) {
  return request<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
