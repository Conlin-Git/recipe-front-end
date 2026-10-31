<script setup lang="ts">
import GaokaoGuide from '../../components/gaokao/GaokaoGuide.vue'

const emit = defineEmits<{ navigate: ['home'] }>()
</script>

<template>
  <div class="gaokao-page">
    <header class="gaokao-page-header">
      <button class="back-home" type="button" title="返回主页面" @click="emit('navigate', 'home')">
        <span aria-hidden="true">‹</span> 主页面
      </button>
      <div class="page-title">
        <span class="page-title-mark" aria-hidden="true">▤</span>
        <div>
          <h1>高考指南</h1>
          <p>当前年度 · 官方来源优先</p>
        </div>
      </div>
      <span class="page-header-spacer" aria-hidden="true"></span>
    </header>

    <GaokaoGuide />

    <div class="gaokao-page-disclaimer" role="note">
      <span aria-hidden="true">⚠️</span>
      <span>高考指南仅供志愿填报参考，不构成录取承诺；政策、计划、专业组和录取结果以当年省教育考试院及招生院校官方发布为准。</span>
    </div>
  </div>
</template>

<style scoped>
.gaokao-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg, #fff);
}

.gaokao-page-header {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  padding: .8rem 1.25rem;
  border-bottom: 1px solid var(--border, #e5e4e7);
}

.back-home {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: .2rem;
  padding: .35rem .5rem;
  border: 0;
  border-radius: .4rem;
  background: transparent;
  color: var(--text, #6b6375);
  font: inherit;
  font-size: .8rem;
  cursor: pointer;
}

.back-home:hover { color: #2563eb; background: var(--code-bg, #f4f3ec); }

.page-title { display: flex; align-items: center; gap: .6rem; }
.page-title-mark { width: 2rem; height: 2rem; display: inline-flex; align-items: center; justify-content: center; border-radius: .55rem; color: #fff; background: #2563eb; }
.page-title h1 { margin: 0; font-size: 1.05rem; color: var(--text-h, #08060d); }
.page-title p { margin: .1rem 0 0; color: var(--text, #6b6375); font-size: .7rem; }
.page-header-spacer { justify-self: end; width: 4rem; }

.gaokao-page-disclaimer {
  flex-shrink: 0;
  display: flex;
  gap: .35rem;
  padding: .4rem 1.25rem .55rem;
  color: #a15c00;
  background: color-mix(in srgb, #fff7e6 82%, var(--bg, #fff));
  font-size: .72rem;
  line-height: 1.4;
}

@media (max-width: 520px) {
  .gaokao-page-header { grid-template-columns: 1fr auto; }
  .page-header-spacer { display: none; }
}
</style>
