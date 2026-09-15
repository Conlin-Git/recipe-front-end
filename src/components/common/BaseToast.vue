<script setup lang="ts">
/**
 * toast 展示容器：挂载在 App 根，读取 useToast 的全局状态。
 */
import { toastState } from '../../composables/useToast'
</script>

<template>
  <!--  fixed 定位在视口顶部居中，不拦截下方点击 -->
  <div class="toast-host">
    <TransitionGroup name="toast">
      <div v-for="t in toastState.list" :key="t.id" class="toast-item" :class="t.type">
        {{ t.text }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  pointer-events: none;
}

.toast-item {
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #fff;
  box-shadow: var(--shadow);
  white-space: nowrap;
}

.toast-item.success {
  background: #2da44e;
}

.toast-item.error {
  background: #e5484d;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}
</style>
