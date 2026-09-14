import { request } from './request'
import type { User } from '../types/user'

export function getMe() {
  return request<User>('/users/me')
}

export function updateMe(data: { nickname?: string; email?: string }) {
  return request<User>('/users/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function uploadAvatar(file: File) {
  const form = new FormData()
  form.append('file', file)
  return request<User>('/users/me/avatar', {
    method: 'POST',
    body: form,
  })
}
