<script setup lang="ts">
import NamingForm from '../../components/naming/NamingForm.vue'

const emit = defineEmits<{ navigate: [page: 'home' | 'naming-result'] }>()
</script>

<template>
  <div class="naming-page">
    <header class="naming-header">
      <button class="back-icon" type="button" aria-label="返回全部功能" title="返回全部功能" @click="emit('navigate', 'home')"><AppIcon name="back" /></button>
      <h1>命理命名分析</h1>
      <span aria-hidden="true"></span>
    </header>
    <main class="naming-body"><NamingForm @complete="emit('navigate', 'naming-result')" /></main>
  </div>
</template>

<style scoped>
.naming-page { display: flex; flex-direction: column; width: 100%; height: 100%; background: var(--canvas); }
.naming-header { flex-shrink: 0; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--border); }
.naming-header h1 { margin: 0; color: var(--text-h); font-size: 16px; font-weight: 600; }
.back-icon { justify-self: start; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 8px; color: var(--text); background: transparent; font-size: 22px; cursor: pointer; }
.back-icon:hover { color: var(--accent); background: var(--accent-bg); }
.naming-body { flex: 1; min-height: 0; overflow: auto; padding: 28px 24px; }
.naming-body > :deep(.naming-form) { max-width: 600px; margin: 0 auto; }
@media (max-width: 560px) {
  .naming-header { padding: 10px 12px; }
  .naming-body { padding: 16px 14px 28px; }
}
</style>
