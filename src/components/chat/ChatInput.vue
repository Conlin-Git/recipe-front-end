<script setup lang="ts">
import { nextTick, ref } from 'vue'

/** idle：正常输入发送；streaming：观看生成中（可终止）；detached：已终止但后端还在生成（可继续输出） */
export type InputMode = 'idle' | 'streaming' | 'detached'

const props = defineProps<{
  mode?: InputMode
}>()

const emit = defineEmits<{
  send: [text: string]
  stop: []
  resume: []
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
  if (!text || props.mode !== 'idle') return
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
      :placeholder="mode === 'idle' ? '请输入你的问题' : '上一条还在生成中…'"
      :disabled="mode !== 'idle'"
      title="Enter 发送，Shift+Enter 换行"
      rows="1"
      @input="autoResize"
      @keydown="onKeydown"
    ></textarea>
    <button
      v-if="mode === 'streaming'"
      class="chat-send-btn chat-stop-btn"
      @click="emit('stop')"
    >
      终止
    </button>
    <button
      v-else-if="mode === 'detached'"
      class="chat-send-btn"
      @click="emit('resume')"
    >
      继续输出
    </button>
    <button v-else class="chat-send-btn" :disabled="!input.trim()" @click="handleSend">
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

/* 终止按钮：红色描边样式，与主操作区分 */
.chat-stop-btn {
  color: #e5484d;
  background: #fff;
  border: 1px solid #e5484d;
}

.chat-stop-btn:hover {
  opacity: 1;
  background: #fdf0f0;
}

.chat-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
