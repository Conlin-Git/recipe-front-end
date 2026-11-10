<script setup lang="ts">
import { computed } from 'vue'
import ResultPageLayout from '../../components/common/ResultPageLayout.vue'
import { useFeatureResults } from '../../stores/featureResults'
const emit = defineEmits<{ navigate: [page: 'home' | 'naming'] }>()
const reports = useFeatureResults()
const result = computed(() => reports.naming)
</script>
<template>
  <ResultPageLayout title="命名分析结果" @edit="emit('navigate', 'naming')" @home="emit('navigate', 'home')">
    <div v-if="result" class="naming-result">
      <div class="naming-result-heading"><span class="naming-result-icon"><AppIcon name="naming" :size="24" /></span><div><h2>你的命名报告</h2><p>规则版本 {{ result.ruleset_version }} · 仅供传统文化参考</p></div></div>
      <div class="pillars"><div v-for="(pillar, i) in result.result.bazi.pillars" :key="i"><span>{{ ['年柱', '月柱', '日柱', '时柱'][i] }}</span><strong>{{ pillar }}</strong></div></div>
      <p class="elements">低频五行：{{ result.result.bazi.least_elements.join('、') }}</p>
      <el-card shadow="never"><pre>{{ result.result.report_markdown }}</pre></el-card>
    </div>
    <el-empty v-else description="请先填写命名信息"><el-button type="primary" @click="emit('navigate', 'naming')">填写命名信息</el-button></el-empty>
  </ResultPageLayout>
</template>
<style scoped>
.naming-result { max-width: 780px; margin: 0 auto; padding: 32px 24px; }
.naming-result-heading { display: flex; gap: 14px; align-items: center; margin-bottom: 26px; }
.naming-result-icon { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 14px; background: var(--accent-bg); color: var(--accent); }
h2 { margin: 0; color: var(--text-h); font-size: 22px; } p { color: var(--text); font-size: 12px; }
.pillars { display: grid; grid-template-columns: repeat(4, 1fr); padding: 20px 0; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; }
.pillars > div { display: flex; flex-direction: column; gap: 10px; align-items: center; } .pillars > div + div { border-left: 1px solid var(--border); }.pillars span { font-size: 11px; color: var(--text); }.pillars strong { font-size: 23px; color: var(--text-h); font-weight: 500; }
.elements { margin: 16px 0 24px; } .el-card { background: var(--surface); border-color: var(--border); border-radius: 16px; }
pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--text-h); font: inherit; font-size: 14px; line-height: 1.95; }
@media(max-width: 560px) { .naming-result { padding: 24px 16px; } pre { font-size: 13px; } }
</style>
