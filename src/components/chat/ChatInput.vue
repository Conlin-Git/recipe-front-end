<script setup lang="ts">
import { ref } from 'vue'

/** 生成中（streaming / detached）时输入框和发送按钮都禁用 */
const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const input = ref('')

function handleSend() {
  const text = input.value.trim()
  if (!text || props.disabled) return
  emit('send', text)
  input.value = ''
}

function onKeydown(e: KeyboardEvent) {
  // Enter 发送，Shift+Enter 换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <footer class="chat-input-area">
    <textarea
      v-model="input"
      class="chat-input"
      :placeholder="disabled ? '上一条还在生成中…' : '请输入你的问题'"
      :disabled="disabled"
      title="Enter 发送，Shift+Enter 换行"
      rows="3"
      @keydown="onKeydown"
    ></textarea>
    <button
      class="chat-send-btn"
      :disabled="disabled || !input.trim()"
      @click="handleSend"
    >
      发送
    </button>
  </footer>
</template>

<style scoped>
.chat-input-area {
  flex-shrink: 0;
  display: flex;
  /* 垂直居中对齐：输入框固定高度，发送按钮始终与其对齐 */
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--border, #e5e4e7);
  background: var(--bg, #fff);
}

.chat-input {
  flex: 1;
  resize: none;
  /* 固定高度（3 行），超出内部滚动 */
  height: 1.5rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 0.625rem;
  /* 必须 ≥16px：iOS 微信/Safari 聚焦小于 16px 的输入框会自动放大页面，且失焦不缩回 */
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  color: var(--text-h, #08060d);
  background: var(--code-bg, #f4f3ec);
  outline: none;
  overflow-y: auto;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.chat-input:focus {
  border-color: var(--accent, #aa3bff);
  box-shadow: 0 0 0 0.1875rem var(--accent-bg, rgba(170, 59, 255, 0.1));
}

.chat-send-btn {
  flex-shrink: 0;
  padding: 0.625rem 1.375rem;
  border: none;
  border-radius: 0.625rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: var(--accent, #aa3bff);
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}

.chat-send-btn:hover:not(:disabled) {
  opacity: 0.85;
}

/* 按下的微交互反馈 */
.chat-send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.chat-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chat-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
