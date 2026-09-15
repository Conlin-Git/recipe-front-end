/**
 * 全局轻量 toast：单例状态 + BaseToast 组件渲染。
 * 用法：toast.success('保存成功') / toast.error('xxx')
 */
import { reactive } from 'vue'

export interface ToastItem {
  id: number
  type: 'success' | 'error'
  text: string
}

export const toastState = reactive<{ list: ToastItem[] }>({ list: [] })

let nextId = 0
const DURATION = 2000

function push(type: ToastItem['type'], text: string) {
  const id = ++nextId
  toastState.list.push({ id, type, text })
  setTimeout(() => {
    const i = toastState.list.findIndex((t) => t.id === id)
    if (i !== -1) toastState.list.splice(i, 1)
  }, DURATION)
}

export const toast = {
  success: (text: string) => push('success', text),
  error: (text: string) => push('error', text),
}
