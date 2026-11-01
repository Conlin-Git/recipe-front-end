<script setup lang="ts">
const emit = defineEmits<{ navigate: [page: 'assistant' | 'gaokao-guide'] }>()
</script>

<template>
  <main class="home-page">
    <section class="home-hero" aria-labelledby="home-title">
      <p class="home-kicker">CONLIN · 智能服务</p>
      <h1 id="home-title">你想先从哪里开始？</h1>
      <p class="home-subtitle">选择一个入口，之后可以随时返回这里切换模式。</p>
    </section>

    <section class="mode-grid" aria-label="功能入口">
      <button class="mode-card mode-card-primary" type="button" @click="emit('navigate', 'assistant')">
        <span class="mode-icon" aria-hidden="true">✦</span>
        <span class="mode-card-body">
          <strong>智能问答</strong>
          <span>聊菜谱、技术问题、命理与日常问题，保留多轮会话上下文。</span>
        </span>
        <span class="mode-arrow" aria-hidden="true">→</span>
      </button>

      <button class="mode-card mode-card-guide" type="button" @click="emit('navigate', 'gaokao-guide')">
        <span class="mode-icon" aria-hidden="true">▤</span>
        <span class="mode-card-body">
          <strong>高考指南</strong>
          <span>按省份、科类、位次和官方数据查询当前年度志愿信息。</span>
        </span>
        <span class="mode-arrow" aria-hidden="true">→</span>
      </button>
    </section>

    <p class="home-disclaimer" role="note">
      <span aria-hidden="true">⚠️</span>
      <span>AI 内容和高考数据仅供参考。招生政策、计划及录取结果以官方发布为准，请自行核验。</span>
    </p>
  </main>
</template>

<style scoped>
.home-page {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: auto;
  padding: clamp(3rem, 12vh, 8rem) 1.25rem 2rem;
  color: var(--text-h, #08060d);
  background:
    radial-gradient(circle at 50% 0, rgba(170, 59, 255, .12), transparent 38rem),
    var(--bg, #fff);
}

.home-hero,
.mode-grid,
.home-disclaimer {
  width: min(54rem, 100%);
  margin-right: auto;
  margin-left: auto;
}

.home-kicker {
  margin: 0 0 .75rem;
  color: var(--accent, #aa3bff);
  font-size: .75rem;
  font-weight: 700;
  letter-spacing: .16em;
}

.home-hero h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.25rem);
  line-height: 1.15;
  letter-spacing: -.04em;
}

.home-subtitle {
  margin: .9rem 0 0;
  color: var(--text, #6b6375);
  font-size: 1rem;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 2.5rem;
}

.mode-card {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: .9rem;
  padding: 1.25rem;
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 1rem;
  color: var(--text-h, #08060d);
  text-align: left;
  cursor: pointer;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}

.mode-card:hover {
  transform: translateY(-.2rem);
  border-color: var(--accent-border, rgba(170, 59, 255, .5));
  box-shadow: 0 .8rem 2rem rgba(33, 17, 54, .1);
}

.mode-card-primary { background: linear-gradient(135deg, rgba(170, 59, 255, .14), var(--bg, #fff)); }
.mode-card-guide { background: linear-gradient(135deg, rgba(31, 132, 255, .12), var(--bg, #fff)); }

.mode-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: .75rem;
  color: #fff;
  background: var(--accent, #aa3bff);
  font-size: 1.2rem;
}

.mode-card-guide .mode-icon { background: #2563eb; }

.mode-card-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: .35rem;
}

.mode-card-body strong { font-size: 1.05rem; }
.mode-card-body span { color: var(--text, #6b6375); font-size: .82rem; line-height: 1.5; }
.mode-arrow { color: var(--text, #6b6375); font-size: 1.2rem; }

.home-disclaimer {
  display: flex;
  gap: .4rem;
  margin-top: 1.5rem;
  color: #a15c00;
  font-size: .76rem;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .mode-grid { grid-template-columns: 1fr; margin-top: 1.75rem; }
  .home-page { padding-top: 3.5rem; }
}
</style>
