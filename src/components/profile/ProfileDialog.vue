<script setup lang="ts">
/**
 * 个人信息弹窗：昵称修改 + 头像上传。（退出登录在「设置」弹窗里）
 */
import { ref, watch } from 'vue'
import BaseDialog from '../common/BaseDialog.vue'
import UserAvatar from '../common/UserAvatar.vue'
import { updateMe, uploadAvatar } from '../../api/user'
import { useAuthStore } from '../../stores/auth'
import { toast } from '../../composables/useToast'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const auth = useAuthStore()

const nickname = ref(auth.user?.nickname ?? '')
const error = ref('')
const saving = ref(false)
const avatarUploading = ref(false)

// 弹窗打开时用户信息可能晚到，同步一次
watch(
  () => auth.user,
  (user) => {
    nickname.value = user?.nickname ?? ''
  },
)

async function handleSave() {
  if (saving.value) return
  saving.value = true
  error.value = ''
  try {
    const user = await updateMe({
      nickname: nickname.value || undefined,
    })
    auth.setUser(user)
    // 成功反馈走全局 toast，弹窗立即关闭
    toast.success('保存成功')
    emit('close')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function handleAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement
  const raw = input.files?.[0]
  // 清空 value：连续选同一张图也要触发 change
  input.value = ''
  if (!raw) return
  error.value = ''
  avatarUploading.value = true
  try {
    // 原图直接上传，压缩在后端做（上限 10MB）
    auth.setUser(await uploadAvatar(raw))
    toast.success('头像已更新')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '头像上传失败'
  } finally {
    avatarUploading.value = false
  }
}

</script>

<template>
  <BaseDialog :open="open" title="个人信息" @close="emit('close')">
    <div class="profile-body">
      <label class="avatar-upload">
        <UserAvatar role="user" :avatar-url="auth.user?.avatar_url" :size="72" />
        <span class="avatar-tip">{{ avatarUploading ? '上传中…' : '点击更换头像' }}</span>
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

      <p v-if="error" class="fail">{{ error }}</p>

      <button class="save-btn" :disabled="saving" @click="handleSave">
        {{ saving ? '保存中…' : '保存' }}
      </button>
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
</style>
