<script setup lang="ts">
/**
 * 消息滚动区：渲染消息列表，新消息自动滚动到底部。
 */
import { nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '../../stores/chat'
import { useAuthStore } from '../../stores/auth'
import MessageItem from './MessageItem.vue'

const props = defineProps<{
  avatarUrl?: string | null
  /** 下拉加载更早历史（滚动到顶部触发），由父组件向服务端取数 */
  loadMore?: () => Promise<void>
}>()

const emit = defineEmits<{
  login: []
  stop: []
  resume: []
}>()

const chatStore = useChatStore()
const authStore = useAuthStore()
const { messages, streaming, detachedGenerating, hasMoreHistory } =
  storeToRefs(chatStore)

const listRef = ref<HTMLElement | null>(null)

// 「回到底部」悬浮按钮：距底部超过阈值才显示
const BOTTOM_THRESHOLD = 200
const showBackToBottom = ref(false)

// 下拉加载更早历史：滚动到顶部附近触发；加载期间冻结自动滚动
const TOP_THRESHOLD = 60
const loadingOlder = ref(false)

async function handleLoadMore() {
  const el = listRef.value
  if (!el || !props.loadMore || loadingOlder.value || !hasMoreHistory.value) return
  loadingOlder.value = true
  // 记住加载前滚动高度，前插后补偿，让视口停在原来的消息上
  const prevHeight = el.scrollHeight
  const prevTop = el.scrollTop
  try {
    await props.loadMore()
    await nextTick()
    el.scrollTop = el.scrollHeight - prevHeight + prevTop
  } finally {
    loadingOlder.value = false
  }
}

function handleScroll() {
  const el = listRef.value
  if (!el) return
  showBackToBottom.value =
    el.scrollHeight - el.scrollTop - el.clientHeight > BOTTOM_THRESHOLD
  if (el.scrollTop < TOP_THRESHOLD) handleLoadMore()
}

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

// 新消息来临（平滑滚动）或流式内容更新（即时滚动）时滚到底部；
// 下拉加载前插历史时不要滚（视口位置由 handleLoadMore 补偿）
watch(
  () => messages.value.length,
  () => {
    if (!loadingOlder.value) scrollToBottom(true)
  },
)
watch(
  () => messages.value[messages.value.length - 1]?.content,
  () => scrollToBottom(),
)
// 停止生成/继续生成按钮出现或消失时滚到底部，保证按钮可见
watch([streaming, detachedGenerating], () => scrollToBottom())

// 步骤图原图 404 时回退到 200_ 缩略图，缩略图也挂了就隐藏占位
//（img 的 error 不冒泡，需在容器上捕获阶段监听）
// 注意：永不重新赋值相同 URL——空 src（解析成页面 URL）或以 / 结尾的 src
// 会让 replace 匹配不到、赋回原值，触发 error → 重赋值 → error 的死循环
function handleImgError(e: Event) {
  const img = e.target
  if (!(img instanceof HTMLImageElement)) return
  const next = img.src.replace(/\/([^/]+)$/, '/200_$1')
  if (img.src.includes('/200_') || next === img.src) {
    img.style.visibility = 'hidden'
  } else {
    img.src = next
  }
}

defineExpose({ scrollToBottom })
</script>

<template>
  <div class="chat-messages-wrap">
    <main
      ref="listRef"
      class="chat-messages"
      @scroll.passive="handleScroll"
      @error.capture="handleImgError"
    >
      <!-- 顶部：下拉加载状态（到顶自动加载更早历史） -->
      <div v-if="loadingOlder" class="history-loading">加载更早的消息…</div>
      <div
        v-else-if="messages.length > 0 && !hasMoreHistory"
        class="history-loading"
      >
        没有更早的消息了
      </div>

      <div v-if="messages.length === 0" class="chat-empty">
        <p>哟，来啦！我是 Conlin 🍳</p>
        <p>白天写代码，下班颠勺，天南海北的菜随便问，JS 红宝书我倒背如流～</p>
        <button v-if="!authStore.isLoggedIn" class="welcome-login-btn" @click="emit('login')">
          登录 / 注册
        </button>
      </div>

      <MessageItem
        v-for="(msg, index) in messages"
        :key="index"
        :message="msg"
        :avatar-url="avatarUrl"
        :streaming="streaming && index === messages.length - 1 && msg.role === 'assistant'"
      />

      <!-- 生成控制：流式渲染中显示「停止生成」，停止后（后端仍在生成）显示「继续生成」 -->
      <div v-if="streaming || detachedGenerating" class="gen-control">
        <button v-if="streaming" class="gen-btn gen-stop-btn" @click="emit('stop')">
          停止生成
        </button>
        <button v-else class="gen-btn" @click="emit('resume')">继续生成</button>
      </div>
    </main>

    <Transition name="fade">
      <button
        v-show="showBackToBottom"
        class="back-to-bottom"
        title="回到底部"
        @click="scrollToBottom(true)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<style scoped>
/* 包裹层提供定位上下文，让悬浮按钮相对滚动区定位（不随内容滚动） */
.chat-messages-wrap {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
}

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

/* 停止/继续生成按钮：跟在流式消息下面，居中展示 */
.gen-control {
  display: flex;
  justify-content: center;
}

.gen-btn {
  padding: 0.375rem 1.25rem;
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 1rem;
  font-size: 0.8125rem;
  font-family: inherit;
  color: var(--text, #6b6375);
  background: var(--bg, #fff);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.gen-btn:hover {
  color: var(--accent, #aa3bff);
  border-color: var(--accent, #aa3bff);
}

/* 停止生成：红色描边，与继续生成的主操作样式区分 */
.gen-stop-btn {
  color: #e5484d;
  border-color: #e5484d;
}

.gen-stop-btn:hover {
  color: #e5484d;
  border-color: #e5484d;
  background: #fdf0f0;
}

.back-to-bottom {
  position: absolute;
  right: 1.5rem;
  bottom: 1.5rem;
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 50%;
  color: var(--text, #6b6375);
  background: var(--bg, #fff);
  box-shadow: 0 2px 8px rgb(0 0 0 / 12%);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.back-to-bottom:hover {
  color: var(--accent, #aa3bff);
  border-color: var(--accent, #aa3bff);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

.chat-empty {
  margin: auto;
  text-align: center;
  color: var(--text, #6b6375);
  line-height: 2;
}

/* 顶部下拉加载提示：小字弱化，不抢视觉 */
.history-loading {
  text-align: center;
  font-size: 0.75rem;
  color: var(--text, #6b6375);
  opacity: 0.5;
  padding-bottom: 0.25rem;
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
