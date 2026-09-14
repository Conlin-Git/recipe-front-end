<script setup lang="ts">
/**
 * 消息滚动区：渲染消息列表，新消息自动滚动到底部。
 */
import { nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '../../stores/chat'
import { useAuthStore } from '../../stores/auth'
import MessageItem from './MessageItem.vue'

defineProps<{
  avatarUrl?: string | null
}>()

const emit = defineEmits<{
  login: []
}>()

const chatStore = useChatStore()
const authStore = useAuthStore()
const { messages } = storeToRefs(chatStore)

const listRef = ref<HTMLElement | null>(null)

// rAF 节流：流式输出时每个 token 都触发 watch，
// 合并到每帧最多滚动一次，避免频繁 layout
let rafId = 0
let pendingSmooth = false

async function scrollToBottom(smooth = false) {
  pendingSmooth = pendingSmooth || smooth
  if (rafId) return
  await nextTick()
  rafId = requestAnimationFrame(() => {
    rafId = 0
    const el = listRef.value
    if (el) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: pendingSmooth ? 'smooth' : 'auto',
      })
    }
    pendingSmooth = false
  })
}

// 新消息来临（平滑滚动）或流式内容更新（即时滚动）时滚到底部
watch(
  () => messages.value.length,
  () => scrollToBottom(true),
)
watch(
  () => messages.value[messages.value.length - 1]?.content,
  () => scrollToBottom(),
)

// 步骤图原图 404 时回退到 200_ 缩略图，缩略图也挂了就隐藏占位
//（img 的 error 不冒泡，需在容器上捕获阶段监听）
function handleImgError(e: Event) {
  const img = e.target
  if (!(img instanceof HTMLImageElement)) return
  if (!img.src.includes('/200_')) {
    img.src = img.src.replace(/\/([^/]+)$/, '/200_$1')
  } else {
    img.style.visibility = 'hidden'
  }
}

defineExpose({ scrollToBottom })
</script>

<template>
  <main ref="listRef" class="chat-messages" @error.capture="handleImgError">
    <div v-if="messages.length === 0" class="chat-empty">
      <p>哟，来啦！我是 Conlin 🍳</p>
      <p>白天写代码，下班颠勺，川菜随便问，前后端、AI Agent 也能唠～</p>
      <button v-if="!authStore.isLoggedIn" class="welcome-login-btn" @click="emit('login')">
        登录 / 注册
      </button>
    </div>

    <MessageItem
      v-for="(msg, index) in messages"
      :key="index"
      :message="msg"
      :avatar-url="avatarUrl"
    />
  </main>
</template>

<style scoped>
.chat-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chat-empty {
  margin: auto;
  text-align: center;
  color: var(--text, #6b6375);
  line-height: 2;
}

.welcome-login-btn {
  margin-top: 0.75rem;
  padding: 0.5rem 2rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-family: inherit;
  font-weight: 500;
  color: #fff;
  background: var(--accent, #aa3bff);
  cursor: pointer;
  transition: opacity 0.2s;
}

.welcome-login-btn:hover {
  opacity: 0.85;
}
</style>
