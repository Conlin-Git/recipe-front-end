<script setup lang="ts">
/**
 * 聊天主页（单页面应用）：左侧会话列表 + 右侧（上标题 / 中消息 / 下输入）。
 * 登录/注册、个人信息均为弹窗交互，无路由跳转。
 */
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import ConversationList from '../../components/chat/ConversationList.vue'
import MessageList from '../../components/chat/MessageList.vue'
import ChatInput from '../../components/chat/ChatInput.vue'
import UserAvatar from '../../components/common/UserAvatar.vue'
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
} = useChatStream()

const activeDialog = ref<'auth' | 'profile' | null>(null)

/** 会话列表抽屉引用，头部按钮触发展开 */
const conversationListRef = ref<InstanceType<typeof ConversationList> | null>(null)

function handleSend(text: string) {
  // 未登录先弹登录框
  if (!authStore.isLoggedIn) {
    activeDialog.value = 'auth'
    return
  }
  send(text)
}

async function handleAuthSuccess() {
  await loadLatestConversation()
}

function handleLogout() {
  chatStore.setConversations([])
  chatStore.resetConversation()
}

onMounted(async () => {
  if (!authStore.isLoggedIn) return
  // 刷新页面时 token 还在但 user 为空，补拉用户信息（token过期会401并自动logout）
  if (!authStore.user) {
    try {
      authStore.setUser(await getMe())
    } catch {
      return // 401 时 request.ts 已 logout
    }
  }
  await loadLatestConversation()
})
</script>

<template>
  <div class="chat-layout">
    <!-- 左侧：历史会话列表（未登录不展示） -->
    <ConversationList
      v-if="authStore.isLoggedIn"
      ref="conversationListRef"
      @select="selectConversation"
      @create="startNewConversation"
      @remove="removeConversation"
      @settings="activeDialog = 'profile'"
    />

    <div class="chat-container">
      <!-- 头部：左（展开会话列表）/ 中（标题）/ 右（用户入口） -->
      <header class="chat-header">
        <div class="chat-header-left">
          <button
            v-if="authStore.isLoggedIn"
            class="icon-btn"
            title="展开会话列表"
            @click="conversationListRef?.open()"
          >
            »
          </button>
        </div>
        <div class="chat-header-center">
          <span class="chat-header-icon">🍳</span>
          <h1 class="chat-header-title">Conlin</h1>
        </div>
        <div class="chat-header-right">
          <button
            v-if="authStore.isLoggedIn"
            class="chat-header-user"
            title="个人信息"
            @click="activeDialog = 'profile'"
          >
            <UserAvatar role="user" :avatar-url="authStore.user?.avatar_url" :size="32" />
            <span class="nickname">{{ authStore.user?.nickname ?? authStore.user?.username }}</span>
          </button>
        </div>
      </header>

      <!-- 中间：消息滚动区（未登录时欢迎语下展示登录/注册按钮；
           生成中在流式消息下方展示停止生成/继续生成按钮） -->
      <MessageList
        :avatar-url="authStore.user?.avatar_url"
        @login="activeDialog = 'auth'"
        @stop="stop"
        @resume="resume"
      />

      <!-- 底部：输入框 + 发送按钮（typing/生成中禁用；未登录不展示） -->
      <ChatInput
        v-if="authStore.isLoggedIn"
        :disabled="pending || streaming || detachedGenerating"
        @send="handleSend"
      />
    </div>

    <!-- 弹窗：登录/注册、个人信息（常驻挂载，open 控制显隐以支持退场动画） -->
    <AuthDialog
      :open="activeDialog === 'auth'"
      @close="activeDialog = null"
      @success="handleAuthSuccess"
    />
    <ProfileDialog
      :open="activeDialog === 'profile'"
      @close="activeDialog = null"
      @logout="handleLogout"
    />
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg, #fff);
}

.chat-container {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--border, #e5e4e7);
  background: var(--bg, #fff);
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
  transition: background 0.2s, color 0.2s;
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
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-h, #08060d);
}

.chat-header-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 40%;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--text, #6b6375);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.chat-header-user:hover {
  color: var(--accent, #aa3bff);
  background: var(--code-bg, #f4f3ec);
}

/* 昵称超长省略号 */
.nickname {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>
