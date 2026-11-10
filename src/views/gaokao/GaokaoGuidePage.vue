<script setup lang="ts">
import GaokaoGuide from '../../components/gaokao/GaokaoGuide.vue'

const emit = defineEmits<{
  navigate: [page: 'home' | 'gaokao-catalog' | 'gaokao-result']
  login: []
}>()
</script>

<template>
  <div class="gaokao-subpage">
    <header class="gaokao-subpage-header">
      <button class="back-icon" type="button" title="返回主页面" aria-label="返回主页面" @click="emit('navigate', 'home')">
        <AppIcon name="back" />
      </button>
      <div class="page-title">
        <span class="page-title-mark" aria-hidden="true"><AppIcon name="school" :size="20" /></span>
        <div><h1>高考志愿参考</h1><p>输入位次或分数，按冲 / 稳 / 保查看可报院校</p></div>
      </div>
      <span class="page-header-spacer" aria-hidden="true"></span>
    </header>
    <GaokaoGuide @complete="emit('navigate', 'gaokao-result')" @catalog="emit('navigate', 'gaokao-catalog')" @login="emit('login')" />
  </div>
</template>

<style scoped>
.gaokao-subpage { width: 100%; height: 100%; min-width: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--canvas); }
.gaokao-subpage-header { flex-shrink: 0; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem; padding: .8rem 1.25rem; border-bottom: 1px solid var(--border, #e5e4e7); }
.back-icon { justify-self: start; width: 2.25rem; height: 2.25rem; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: .5rem; color: var(--text, #6b6375); background: transparent; font-size: 1.35rem; cursor: pointer; }
.back-icon:hover { color: #2563eb; background: var(--code-bg, #f4f3ec); }
.page-title { min-width: 0; display: flex; align-items: center; gap: .6rem; }
.page-title > div { min-width: 0; }
.page-title-mark { width: 2rem; height: 2rem; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--accent-border); border-radius: 10px; color: var(--accent); background: var(--accent-bg); }
.page-title h1 { margin: 0; font-size: 1.05rem; color: var(--text-h, #08060d); }
.page-title p { margin: .1rem 0 0; color: var(--text, #6b6375); font-size: .7rem; }
.page-header-spacer { justify-self: end; width: 2.25rem; }
@media (max-width: 680px) {
  .gaokao-subpage-header { grid-template-columns: 2.25rem minmax(0, 1fr) 2.25rem; gap: .55rem; padding: .6rem .7rem; }
  .page-title { justify-self: stretch; }
  .page-title h1 { overflow: hidden; font-size: .95rem; text-overflow: ellipsis; white-space: nowrap; }
  .page-title p { overflow: hidden; font-size: .64rem; text-overflow: ellipsis; white-space: nowrap; }
  .page-title-mark { width: 1.85rem; height: 1.85rem; flex-shrink: 0; }
  .back-icon, .page-header-spacer { width: 2rem; height: 2rem; }
}
</style>
