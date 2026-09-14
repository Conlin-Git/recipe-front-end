<script setup lang="ts">
/**
 * 统一头像组件：有 avatar_url 显示图片，否则显示默认 emoji。
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    role?: 'user' | 'assistant'
    avatarUrl?: string | null
    size?: number
  }>(),
  { role: 'assistant', avatarUrl: null, size: 36 },
)

const showImage = computed(() => props.role === 'user' && !!props.avatarUrl)

// size 按 px 数值传入，内部换算成 rem（根字号 16px）
const sizeRem = computed(() => `${props.size / 16}rem`)
</script>

<template>
  <div class="avatar" :class="role" :style="{ width: sizeRem, height: sizeRem }">
    <img v-if="showImage" :src="avatarUrl!" alt="用户头像" class="avatar-img" />
    <span v-else>{{ role === 'assistant' ? '🤖' : '👤' }}</span>
  </div>
</template>

<style scoped>
.avatar {
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  background: var(--code-bg, #f4f3ec);
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
