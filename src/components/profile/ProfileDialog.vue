<script setup lang="ts">
/**
 * 个人信息弹窗：昵称/邮箱修改 + 头像上传 + 退出登录。
 */
import { ref, watch } from 'vue'
import BaseDialog from '../common/BaseDialog.vue'
import UserAvatar from '../common/UserAvatar.vue'
import { updateMe, uploadAvatar } from '../../api/user'
import { useAuthStore } from '../../stores/auth'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  /** 退出登录后触发（父组件清空会话状态） */
  logout: []
}>()

const auth = useAuthStore()

const nickname = ref(auth.user?.nickname ?? '')
const email = ref(auth.user?.email ?? '')
const message = ref('')
const error = ref('')
const saving = ref(false)

// 弹窗打开时用户信息可能晚到，同步一次
watch(
  () => auth.user,
  (user) => {
    nickname.value = user?.nickname ?? ''
    email.value = user?.email ?? ''
  },
)

async function handleSave() {
  if (saving.value) return
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    const user = await updateMe({
      nickname: nickname.value || undefined,
      email: email.value || undefined,
    })
    auth.setUser(user)
    message.value = '保存成功'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function handleAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  message.value = ''
  try {
    auth.setUser(await uploadAvatar(file))
  } catch (err) {
    error.value = err instanceof Error ? err.message : '头像上传失败'
  }
}

function handleLogout() {
  auth.logout()
  emit('logout')
  emit('close')
}
</script>

<template>
  <BaseDialog :open="open" title="个人信息" @close="emit('close')">
    <div class="profile-body">
      <label class="avatar-upload">
        <UserAvatar role="user" :avatar-url="auth.user?.avatar_url" :size="72" />
        <span class="avatar-tip">点击更换头像</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          @change="handleAvatarChange"
        />
      </label>

      <label class="field">
        <span>用户名</span>
        <input :value="auth.user?.username" disabled />
      </label>
      <label class="field">
        <span>昵称</span>
        <input v-model="nickname" placeholder="请输入昵称" />
      </label>
      <label class="field">
        <span>邮箱</span>
        <input v-model="email" placeholder="请输入邮箱" />
      </label>

      <p v-if="message" class="ok">{{ message }}</p>
      <p v-if="error" class="fail">{{ error }}</p>

      <button class="save-btn" :disabled="saving" @click="handleSave">
        {{ saving ? '保存中…' : '保存' }}
      </button>
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </div>
  </BaseDialog>
</template>

<style scoped>
.profile-body {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
}

.avatar-tip {
  font-size: 0.75rem;
  color: var(--text, #6b6375);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  font-size: 0.8125rem;
  color: var(--text, #6b6375);
}

.field input {
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-family: inherit;
  color: var(--text-h, #08060d);
  background: var(--code-bg, #f4f3ec);
  outline: none;
}

.field input:focus {
  border-color: var(--accent, #aa3bff);
}

.field input:disabled {
  opacity: 0.6;
}

.ok {
  margin: 0;
  font-size: 0.8125rem;
  color: #2da44e;
}

.fail {
  margin: 0;
  font-size: 0.8125rem;
  color: #e5484d;
}

.save-btn {
  padding: 0.625rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: var(--accent, #aa3bff);
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.4;
}

.logout-btn {
  padding: 0.625rem;
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  color: var(--text, #6b6375);
  background: transparent;
  cursor: pointer;
}
</style>
