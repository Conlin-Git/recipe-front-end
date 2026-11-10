<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ candidate?: number | null; reference?: number | null }>()
const comparison = computed(() => {
  const { candidate, reference } = props
  if (typeof candidate !== 'number' || typeof reference !== 'number' || !Number.isFinite(candidate) || !Number.isFinite(reference) || candidate <= 0 || reference <= 0) return null
  const max = Math.max(candidate, reference)
  return { candidate: candidate / max, reference: reference / max }
})
</script>

<template>
  <div v-if="comparison" class="rank-comparison" :aria-label="`位次对比：你的位次 ${candidate}，往年最低位次 ${reference}。数值越小越靠前，不代表录取概率。`">
    <div class="rank-caption" aria-hidden="true"><span>你的位次 <b>{{ candidate?.toLocaleString('zh-CN') }}</b></span><span>位次越小越靠前</span></div>
    <div class="rank-lines" aria-hidden="true">
      <span class="rank-line candidate"><i :style="{ '--rank-ratio': comparison.candidate }"></i></span>
      <span class="rank-line reference"><i :style="{ '--rank-ratio': comparison.reference }"></i></span>
    </div>
    <div class="rank-legend" aria-hidden="true"><span>你的位次</span><span>往年最低位次</span></div>
  </div>
</template>

<style scoped>
.rank-comparison { padding: 0 18px 14px; }
.rank-caption { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; margin-bottom: 8px; color: var(--text); font-size: 10px; line-height: 1.5; }
.rank-caption b { color: var(--text-h); font-weight: 600; font-variant-numeric: tabular-nums; }
.rank-lines { display: grid; gap: 3px; }
.rank-line { display: block; height: 3px; overflow: hidden; border-radius: 3px; background: var(--code-bg); }
.rank-line i { display: block; width: 100%; height: 100%; border-radius: inherit; background: var(--tier-gradient); transform-origin: left center; transform: translate3d(0, 0, 0) scaleX(var(--rank-ratio)); transition: transform 600ms var(--ease-out) calc(var(--card-delay, 0ms) + 80ms); }
.reference i { background: var(--rank-reference); }
.rank-legend { display: flex; gap: 14px; margin-top: 6px; font-size: 9px; line-height: 1; color: var(--text); }
.rank-legend span::before { content: ''; display: inline-block; width: 8px; height: 3px; margin: 0 4px 2px 0; border-radius: 2px; background: var(--tier); }
.rank-legend span + span::before { background: var(--rank-reference); }
@starting-style { .rank-line i { transform: translate3d(0, 0, 0) scaleX(0); } }
</style>
