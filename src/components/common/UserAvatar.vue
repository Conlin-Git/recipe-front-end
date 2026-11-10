<script setup lang="ts">
/**
 * 统一头像组件：有 avatar_url 显示图片，否则使用 Element 图标。
 */
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    role?: 'user' | 'assistant'
    avatarUrl?: string | null
    size?: number
  }>(),
  { role: 'assistant', avatarUrl: null, size: 36 },
)

const showImage = computed(() => props.role === 'user' && !!props.avatarUrl)
const imageFailed = ref(false)

watch(() => props.avatarUrl, () => {
  imageFailed.value = false
})

function handleImageError() {
  imageFailed.value = true
}

// size 按 px 数值传入，内部换算成 rem（根字号 16px）
const sizeRem = computed(() => `${props.size / 16}rem`)
</script>

<template>
  <div class="avatar" :class="role" :style="{ width: sizeRem, height: sizeRem }">
    <img
      v-if="showImage && !imageFailed"
      :src="avatarUrl!"
      alt="用户头像"
      class="avatar-img"
      @error="handleImageError"
    />
    <AppIcon v-else-if="role === 'assistant'" name="chat" :size="20" />
    <AppIcon v-else name="user" :size="20" />
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
.avatar.assistant { border-radius: 11px; color: var(--accent); background: var(--accent-bg); }
</style>
