<script setup lang="ts">
import GaokaoGuide from '../../components/gaokao/GaokaoGuide.vue'

const emit = defineEmits<{
  navigate: [page: 'home' | 'gaokao-catalog']
  login: []
}>()
</script>

<template>
  <div class="gaokao-subpage">
    <header class="gaokao-subpage-header">
      <button class="back-icon" type="button" title="返回主页面" aria-label="返回主页面" @click="emit('navigate', 'home')">
        <span aria-hidden="true">←</span>
      </button>
      <div class="page-title">
        <span class="page-title-mark" aria-hidden="true">▤</span>
        <div><h1>生成志愿指南</h1><p>按考生本地省排位比较本地招生数据</p></div>
      </div>
      <span class="page-header-spacer" aria-hidden="true"></span>
    </header>
    <GaokaoGuide @catalog="emit('navigate', 'gaokao-catalog')" @login="emit('login')" />
  </div>
</template>

<style scoped>
.gaokao-subpage { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: var(--bg, #fff); }
.gaokao-subpage-header { flex-shrink: 0; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem; padding: .8rem 1.25rem; border-bottom: 1px solid var(--border, #e5e4e7); }
.back-icon { justify-self: start; width: 2.25rem; height: 2.25rem; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: .5rem; color: var(--text, #6b6375); background: transparent; font-size: 1.35rem; cursor: pointer; }
.back-icon:hover { color: #2563eb; background: var(--code-bg, #f4f3ec); }
.page-title { display: flex; align-items: center; gap: .6rem; }
.page-title-mark { width: 2rem; height: 2rem; display: inline-flex; align-items: center; justify-content: center; border-radius: .55rem; color: #fff; background: #2563eb; }
.page-title h1 { margin: 0; font-size: 1.05rem; color: var(--text-h, #08060d); }
.page-title p { margin: .1rem 0 0; color: var(--text, #6b6375); font-size: .7rem; }
.page-header-spacer { justify-self: end; width: 2.25rem; }
@media (max-width: 520px) { .gaokao-subpage-header { grid-template-columns: 2.25rem 1fr 2.25rem; } .page-title { justify-self: center; } }
</style>
