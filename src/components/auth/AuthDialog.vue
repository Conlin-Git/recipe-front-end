<script setup lang="ts">
/**
 * 登录/注册弹窗：一个弹窗内切换两种模式，注册成功自动登录。
 */
import { ref } from 'vue'
import BaseDialog from '../common/BaseDialog.vue'
import { login, register } from '../../api/auth'
import { getMe } from '../../api/user'
import { useAuthStore } from '../../stores/auth'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  /** 登录/注册成功后触发（父组件可借此加载会话列表） */
  success: []
}>()

const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

function switchMode(target: 'login' | 'register') {
  mode.value = target
  error.value = ''
}

async function afterLogin() {
  auth.setUser(await getMe())
  emit('success')
  emit('close')
}

async function handleSubmit() {
  error.value = ''
  const name = username.value.trim()
  if (!name || !password.value || loading.value) return

  if (mode.value === 'register' && password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    if (mode.value === 'register') {
      await register({ username: name, password: password.value })
    }
    const { access_token } = await login({ username: name, password: password.value })
    auth.setToken(access_token)
    await afterLogin()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '操作失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BaseDialog :open="open" :title="mode === 'login' ? '登录' : '注册'" @close="emit('close')">
    <form class="auth-form" @submit.prevent="handleSubmit">
      <input v-model="username" class="auth-input" placeholder="用户名" autocomplete="username" />
      <input
        v-model="password"
        class="auth-input"
        type="password"
        :placeholder="mode === 'login' ? '密码' : '密码（至少6位）'"
        :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
      />
      <input
        v-if="mode === 'register'"
        v-model="confirmPassword"
        class="auth-input"
        type="password"
        placeholder="确认密码"
        autocomplete="new-password"
      />
      <p v-if="error" class="auth-error">{{ error }}</p>
      <button class="auth-btn" type="submit" :disabled="loading">
        {{ loading ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录' }}
      </button>
      <p class="auth-switch">
        <template v-if="mode === 'login'">
          没有账号？<a href="javascript:;" @click="switchMode('register')">去注册</a>
        </template>
        <template v-else>
          已有账号？<a href="javascript:;" @click="switchMode('login')">去登录</a>
        </template>
      </p>
    </form>
  </BaseDialog>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.auth-input {
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-family: inherit;
  color: var(--text-h, #08060d);
  background: var(--code-bg, #f4f3ec);
  outline: none;
}

.auth-input:focus {
  border-color: var(--accent, #aa3bff);
}

.auth-error {
  margin: 0;
  font-size: 0.8125rem;
  color: #e5484d;
}

.auth-btn {
  padding: 0.625rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #fff;
  background: var(--accent, #aa3bff);
  cursor: pointer;
}

.auth-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.auth-switch {
  margin: 0;
  font-size: 0.8125rem;
  text-align: center;
  color: var(--text, #6b6375);
}

.auth-switch a {
  color: var(--accent, #aa3bff);
  text-decoration: none;
}
</style>
