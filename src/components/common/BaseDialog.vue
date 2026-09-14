<script setup lang="ts">
/**
 * 通用弹窗容器：遮罩 + 居中卡片，点遮罩或 × 关闭。
 * open 控制显隐，进出场有淡入缩放动画（Transition 在 Teleport 内，退场动画有效）。
 */
defineProps<{
  title: string
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="dialog-overlay" @click.self="emit('close')">
        <div class="dialog-card" role="dialog" :aria-label="title">
          <div class="dialog-header">
            <h2 class="dialog-title">{{ title }}</h2>
            <button class="dialog-close" title="关闭" @click="emit('close')">×</button>
          </div>
          <div class="dialog-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.dialog-card {
  width: 100%;
  max-width: 24rem;
  max-height: 85%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0 1rem;
  padding: 1.5rem 2rem 2rem;
  border-radius: 0.75rem;
  background: var(--bg, #fff);
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

/* 进出场动画：遮罩淡入淡出 + 卡片缩放上浮（transform/opacity，GPU 友好） */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .dialog-card,
.dialog-leave-active .dialog-card {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-card,
.dialog-leave-to .dialog-card {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.97);
}

.dialog-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.dialog-title {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-h, #08060d);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-close {
  flex-shrink: 0;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--text, #6b6375);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.dialog-close:hover {
  color: var(--text-h, #08060d);
  background: var(--code-bg, #f4f3ec);
}

.dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
