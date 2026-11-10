<script setup lang="ts">
/**
 * 聊天主页（单页面应用）：左侧会话列表 + 右侧（上标题 / 中消息 / 下输入）。
 * 登录/注册、个人信息、设置均为弹窗交互，无路由跳转。
 */
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import ConversationList from '../../components/chat/ConversationList.vue'
import MessageList from '../../components/chat/MessageList.vue'
import ChatInput from '../../components/chat/ChatInput.vue'
import UserAvatar from '../../components/common/UserAvatar.vue'
import FilingLinks from '../../components/common/FilingLinks.vue'
import AuthDialog from '../../components/auth/AuthDialog.vue'
import ProfileDialog from '../../components/profile/ProfileDialog.vue'
import { useChatStore } from '../../stores/chat'
import { useAuthStore } from '../../stores/auth'
import { getMe } from '../../api/user'
import { useChatStream } from '../../composables/useChatStream'

const chatStore = useChatStore()
const authStore = useAuthStore()
const { pending, streaming, detachedGenerating } = storeToRefs(chatStore)
const {
  send,
  stop,
  resume,
  loadLatestConversation,
  selectConversation,
  startNewConversation,
  removeConversation,
  startPolling,
  stopPolling,
  stopWatching,
  loadOlderMessages,
} = useChatStream()

const activeDialog = ref<'auth' | 'profile' | null>(null)

/** 会话列表抽屉引用，头部按钮触发展开 */
const conversationListRef = ref<InstanceType<typeof ConversationList> | null>(null)

const emit = defineEmits<{ navigate: ['home']; settings: [] }>()

function handleSend(text: string) {
  // 未登录先弹登录框
  if (!authStore.isLoggedIn) {
    activeDialog.value = 'auth'
    return
  }
  send(text)
}

function handleRetry(text: string) {
  if (!text || pending.value || streaming.value || detachedGenerating.value) return
  send(text)
}

function handleLogout() {
  stopPolling()
  stopWatching()
  chatStore.setConversations([])
  chatStore.resetConversation()
}

// 默认先展示未登录聊天页；从任意入口登录后，都要初始化会话。
watch(() => authStore.token, async (token) => {
  if (!token) {
    handleLogout()
    return
  }
  // 刷新页面时 token 还在但 user 为空，补拉用户信息（token过期会401并自动logout）
  if (!authStore.user) {
    try {
      authStore.setUser(await getMe())
    } catch {
      return
    }
  }
  if (authStore.token !== token) return
  startPolling()
  await loadLatestConversation()
}, { immediate: true })
</script>

<template>
  <div class="chat-layout">
    <!-- 左侧：历史会话与平台入口；访客也可进入功能页和设置。 -->
    <ConversationList
      ref="conversationListRef"
      @select="selectConversation"
      @create="startNewConversation"
      @remove="removeConversation"
      @settings="emit('settings')"
      @features="emit('navigate', 'home')"
    />

    <div class="chat-container">
      <!-- 头部：左（展开会话列表）/ 中（标题）/ 右（用户入口） -->
      <header class="chat-header">
        <div class="chat-header-left">
          <button
            class="icon-btn"
            title="展开侧栏"
            aria-label="展开侧栏"
            @click="conversationListRef?.open()"
          >
            <AppIcon name="menu" />
          </button>
        </div>
        <div class="chat-header-center">
          <h1 class="chat-header-title">阿福</h1>
        </div>
        <div class="chat-header-right">
          <button
            v-if="authStore.isLoggedIn"
            class="chat-header-user"
            title="个人信息"
            @click="activeDialog = 'profile'"
          >
            <UserAvatar role="user" :avatar-url="authStore.user?.avatar_url" :size="32" />
          </button>
        </div>
      </header>

      <!-- 中间：消息滚动区（未登录时欢迎语下展示登录/注册按钮；
           生成中在流式消息下方展示停止生成/继续生成按钮） -->
      <MessageList
        
        :avatar-url="authStore.user?.avatar_url"
        :load-more="loadOlderMessages"
        @login="activeDialog = 'auth'"
        @stop="stop"
        @resume="resume"
        @retry="handleRetry"
      />

      <!-- 底部：输入框 + 发送按钮（typing/生成中禁用；未登录不展示） -->
      <div class="assistant-disclaimer" role="note">
        <span>回答由 AI 生成，请核实重要信息。</span>
      </div>

      <ChatInput
        v-if="authStore.isLoggedIn"
        :disabled="pending || streaming || detachedGenerating"
        @send="handleSend"
      />

      <!-- 审核访问时也直接展示备案信息。 -->
      <footer class="icp-footer">
        <FilingLinks />
      </footer>
    </div>

    <!-- 弹窗：登录/注册、个人信息（常驻挂载，open 控制显隐以支持退场动画） -->
    <AuthDialog
      :open="activeDialog === 'auth'"
      @close="activeDialog = null"
    />
    <ProfileDialog
      :open="activeDialog === 'profile'"
      @close="activeDialog = null"
    />
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--canvas);
}

.chat-container {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-width: 56rem;
  margin: 0 auto;
}

.chat-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--border, #e5e4e7);
  background: var(--canvas);
}

/* 左右等宽，保证中间标题真正居中 */
.chat-header-left,
.chat-header-right {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.chat-header-right {
  justify-content: flex-end;
  gap: .5rem;
}

.chat-header-center {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.icon-btn {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--text, #6b6375);
  font-size: 0.875rem;
  cursor: pointer;
  transition: transform 180ms var(--ease-spring), opacity 180ms ease;
}

.icon-btn:hover {
  background: var(--code-bg, #f4f3ec);
  color: var(--accent, #aa3bff);
}

.chat-header-icon {
  font-size: 1.5rem;
}

.chat-header-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-h, #08060d);
}

.chat-header-user {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--text, #6b6375);
  cursor: pointer;
  transition: transform 180ms var(--ease-spring), opacity 180ms ease;
}

.chat-header-user:hover {
  color: var(--accent, #aa3bff);
  background: var(--code-bg, #f4f3ec);
}

.assistant-disclaimer {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  gap: .35rem;
  justify-content: center;
  padding: .5rem 1.25rem;
  color: var(--text);
  font-size: .72rem;
  line-height: 1.4;
}

/* 所有访问状态都保留 ICP 和公安备案链接。 */
.icp-footer {
  flex-shrink: 0;
  padding: .4rem .75rem .65rem;
  text-align: center;
  font-size: 0.6875rem;
}

@media (max-width: 680px) {
  .chat-header { padding: .6rem .75rem; }
  .chat-header-title { font-size: 1rem; }
  .chat-header-center { gap: .4rem; }
  .chat-header-user { width: 2rem; height: 2rem; }
  .assistant-disclaimer { padding: .35rem .75rem .2rem; font-size: .66rem; }
}

</style>
