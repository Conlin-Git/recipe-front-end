<script setup lang="ts">
import { nextTick, ref } from 'vue'

const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const input = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)

/** 输入时自动增高，超过 max-height 出现内部滚动 */
async function autoResize() {
  await nextTick()
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function handleSend() {
  const text = input.value.trim()
  if (!text || props.disabled) return
  emit('send', text)
  input.value = ''
  autoResize()
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
      ref="inputRef"
      v-model="input"
      class="chat-input"
      placeholder="请输入你的菜谱问题"
      title="Enter 发送，Shift+Enter 换行"
      rows="1"
      @input="autoResize"
      @keydown="onKeydown"
    ></textarea>
    <button class="chat-send-btn" :disabled="disabled || !input.trim()" @click="handleSend">
      发送
    </button>
  </footer>
</template>

<style scoped>
.chat-input-area {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  gap: 0.625rem;
  padding: 0.875rem 1.25rem;
  border-top: 1px solid var(--border, #e5e4e7);
  background: var(--bg, #fff);
}

.chat-input {
  flex: 1;
  resize: none;
  max-height: 7.5rem;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 0.625rem;
  font-size: 0.9375rem;
  font-family: inherit;
  line-height: 1.5;
  color: var(--text-h, #08060d);
  background: var(--code-bg, #f4f3ec);
  outline: none;
  overflow-y: auto;
  transition: border-color 0.2s, box-shadow 0.2s;
}

/* 空值时（显示暗文）：单行展示，超出省略号，防止暗文换行滚动 */
.chat-input:placeholder-shown {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
</style>
