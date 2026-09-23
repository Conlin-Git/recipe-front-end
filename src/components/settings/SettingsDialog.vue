<script setup lang="ts">
/**
 * 设置弹窗（左侧栏「⚙ 设置」入口）：关于我们（备案号/作者/代码仓库）+ 退出登录。
 */
import BaseDialog from '../common/BaseDialog.vue'
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

function handleLogout() {
  auth.logout()
  emit('logout')
  emit('close')
}
</script>

<template>
  <BaseDialog :open="open" title="设置" @close="emit('close')">
    <div class="settings-body">
      <section class="about">
        <h3 class="about-title">关于我们</h3>
        <div class="about-row">
          <span class="about-label">作者</span>
          <span>Conlin</span>
        </div>
        <div class="about-row">
          <span class="about-label">代码仓库</span>
          <a href="https://github.com/Conlin-Git" target="_blank" rel="noopener noreferrer">
            github.com/Conlin-Git
          </a>
        </div>
        <div class="about-row">
          <span class="about-label">备案号</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
            粤ICP备2026143546号
          </a>
        </div>
      </section>

      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </div>
  </BaseDialog>
</template>

<style scoped>
.settings-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.about {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.about-title {
  margin: 0 0 0.125rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text, #6b6375);
}

.about-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9375rem;
  color: var(--text-h, #08060d);
}

.about-label {
  flex-shrink: 0;
  width: 4.5rem;
  font-size: 0.8125rem;
  color: var(--text, #6b6375);
}

.about-row a {
  color: var(--accent, #aa3bff);
  text-decoration: none;
}

.about-row a:hover {
  text-decoration: underline;
}

.logout-btn {
  padding: 0.625rem;
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-family: inherit;
  color: #e5484d;
  background: transparent;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}

.logout-btn:hover {
  border-color: #e5484d;
  background: #fdf0f0;
}
</style>
