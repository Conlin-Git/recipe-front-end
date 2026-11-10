<script setup lang="ts">
import { ref } from 'vue'
import ConversationList from '../../components/chat/ConversationList.vue'
import FilingLinks from '../../components/common/FilingLinks.vue'

const emit = defineEmits<{
  navigate: [page: 'assistant' | 'gaokao-guide' | 'naming' | 'fortune']
  settings: []
}>()
const navigation = ref<InstanceType<typeof ConversationList> | null>(null)
const features = [
  { page: 'assistant', title: '阿福问答', description: '高考咨询、菜谱、编程与日常交流', icon: 'chat' },
  { page: 'gaokao-guide', title: '高考指南', description: '按省份、科类与位次查看冲稳保院校', icon: 'school' },
  { page: 'naming', title: '命理命名分析', description: '生成人名、笔名、网名，或分析已有姓名', icon: 'naming' },
  { page: 'fortune', title: '紫微斗数', description: '本命、大限与逐年流年，仅供娱乐', icon: 'compass' },
] as const
</script>

<template>
  <div class="home-layout">
    <ConversationList ref="navigation" navigation-only @assistant="emit('navigate', 'assistant')" @settings="emit('settings')" />
    <header class="home-header">
      <el-button text class="menu-button" aria-label="展开侧栏" @click="navigation?.open()"><AppIcon name="menu" /></el-button>
      <span class="brand-name">阿福</span>
      <span class="brand-caption">你的智能助手</span>
    </header>
    <main class="home-page">
      <div class="home-content">
        <span class="home-eyebrow">阿福，随时为你</span>
        <h1>今天，从哪里开始？</h1>
        <p class="home-subtitle">选择一个功能，开启你的探索。</p>
        <nav class="feature-list" aria-label="全部功能">
          <el-button v-for="(feature, index) in features" :key="feature.page" class="feature-link" :class="{ 'feature-fortune': feature.page === 'fortune' }" :data-feature="feature.page" :style="{ '--enter-delay': `${index * 35}ms` }" @click="emit('navigate', feature.page)">
            <span class="feature-icon" aria-hidden="true"><AppIcon :name="feature.icon" :size="24" /></span>
            <span class="feature-copy"><strong>{{ feature.title }}</strong><small>{{ feature.description }}</small></span>
          </el-button>
        </nav>
        <p class="home-note">AI 回答仅供参考，请核实重要信息。</p>
        <footer class="home-footer"><FilingLinks align="start" /></footer>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home-layout { width: 100%; height: 100%; display: flex; flex-direction: column; background: var(--canvas); }
.home-header { flex-shrink: 0; display: flex; align-items: center; gap: 12px; height: 64px; padding: 0 24px; border-bottom: 1px solid var(--border); }
.menu-button { width: 36px; height: 36px; padding: 0; color: var(--text-h); }
.brand-name { font-size: 17px; font-weight: 600; color: var(--text-h); }
.brand-caption { padding-left: 12px; border-left: 1px solid var(--border); color: var(--text); font-size: 12px; }
.home-page { flex: 1; min-height: 0; overflow: auto; box-sizing: border-box; padding: clamp(32px, 9vh, 80px) 22px 32px; }
.home-content { max-width: 560px; margin: 0 auto; }
.home-eyebrow { color: var(--accent); font-size: 12px; letter-spacing: .08em; }
h1 { margin: 12px 0 10px; color: var(--text-h); font-size: 30px; font-weight: 600; letter-spacing: -.03em; }
.home-subtitle { margin: 0 0 30px; font-size: 14px; }
.feature-list { display: grid; gap: 12px; }
.feature-link.el-button { margin: 0; width: 100%; height: auto; padding: 22px; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); color: var(--text-h); text-align: left; white-space: normal; box-shadow: var(--surface-shadow); animation: feature-in 320ms var(--ease-out) var(--enter-delay) both; transition: transform 180ms var(--ease-out); }
.feature-link :deep(> span) { display: flex; align-items: center; gap: 16px; width: 100%; }
.feature-link:hover { border-color: var(--accent-border); transform: translate3d(0, -2px, 0); }
.feature-link:active { transform: scale(.99); }
.feature-icon { display: grid; place-items: center; flex-shrink: 0; width: 44px; height: 44px; border-radius: 13px; color: var(--accent); background: var(--accent-bg); }

.feature-copy { flex: 1; min-width: 0; }
.feature-arrow { flex-shrink: 0; color: var(--text); font-size: 18px; }
.feature-link strong, .feature-link small { display: block; }
.feature-link strong { font-size: 15px; font-weight: 600; }
.feature-link small { margin-top: 7px; color: var(--text); font-size: 12px; line-height: 1.6; }
.home-note { margin: 22px 0 0; font-size: 11px; line-height: 1.7; color: var(--text); }
.home-footer { margin-top: 32px; font-size: 11px; }
@keyframes feature-in { from { opacity: 0; transform: translate3d(0, 6px, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }

@media (max-width: 560px) { .home-header { height: 56px; padding: 0 14px; } .home-page { padding: 32px 18px 28px; } h1 { font-size: 25px; } .feature-link.el-button { padding: 18px 16px; } .feature-link :deep(> span) { gap: 12px; } }
@media (prefers-reduced-motion: reduce) { .feature-link.el-button { animation: none; transition: none; } }
</style>
