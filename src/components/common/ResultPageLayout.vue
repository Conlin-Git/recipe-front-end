<script setup lang="ts">
import { nextTick, onActivated, ref } from 'vue'
defineProps<{ title: string; editLabel?: string }>()
const emit = defineEmits<{ edit: []; home: [] }>()
const heading = ref<HTMLElement>()
const scrollArea = ref<HTMLElement>()
onActivated(async () => {
  await nextTick()
  if (scrollArea.value) scrollArea.value.scrollTop = 0
  heading.value?.focus({ preventScroll: true })
})
</script>
<template>
  <div class="result-page-layout">
    <header class="result-page-header">
      <el-button text class="result-edit" @click="emit('edit')"><AppIcon name="naming" :size="16"/><span>{{ editLabel || '修改信息' }}</span></el-button>
      <h1 ref="heading" tabindex="-1">{{ title }}</h1>
      <el-button text class="result-home" @click="emit('home')"><AppIcon name="features" :size="16"/><span>全部功能</span></el-button>
    </header>
    <main ref="scrollArea" class="result-page-scroll"><slot /></main>
  </div>
</template>
<style scoped>
.result-page-layout { width: 100%; height: 100%; min-width: 0; display: flex; flex-direction: column; background: var(--canvas); }
.result-page-header { flex-shrink: 0; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; min-height: 64px; gap: 12px; padding: 0 24px; border-bottom: 1px solid var(--border); }
h1 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-h); }
.result-edit { justify-self: start; }.result-home { justify-self: end; }
.result-page-header .el-button { margin: 0; padding: 8px 0; font-size: 12px; color: var(--text); }
.result-page-header :deep(.el-button > span) { gap: 7px; }
.result-page-scroll { flex: 1; min-height: 0; overflow: auto; scroll-padding-top: 24px; }
@media (max-width: 560px) { .result-page-header { min-height: 56px; padding: 0 12px; gap: 8px; } h1 { font-size: 14px; } .result-page-header .el-button { font-size: 11px; } .result-page-header :deep(.el-button > span) { gap: 4px; } }
</style>
