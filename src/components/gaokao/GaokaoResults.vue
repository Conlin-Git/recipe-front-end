<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFeatureResults } from '../../stores/featureResults'
import type { GaokaoSchoolRecommendation } from '../../api/gaokao'
import RankComparison from './RankComparison.vue'
const emit = defineEmits<{ edit: []; catalog: [] }>()
const reports = useFeatureResults()
const result = computed(() => reports.gaokao)
type Tier = '冲' | '稳' | '保'

const TIERS: Array<{ key: Tier; hint: string }> = [
  { key: '冲', hint: '略低于往年录取线，有机会，但需要一点运气' },
  { key: '稳', hint: '和往年录取线接近，把握较大' },
  { key: '保', hint: '明显高于往年录取线，基本稳妥' },
]

const PAGE_STEP = 10
const activeTier = ref<Tier>('稳')
const visibleCount = ref(PAGE_STEP)
const expanded = ref(new Set<string>())
watch(activeTier, () => { visibleCount.value = PAGE_STEP })
watch(result, data => {
  const counts = data?.summary?.tier_counts
  activeTier.value = (['稳', '保', '冲'] as Tier[]).find(tier => (counts?.[tier] || 0) > 0) || '稳'
  visibleCount.value = PAGE_STEP
  expanded.value = new Set()
}, { immediate: true })
const tierCounts = computed(() => result.value?.summary?.tier_counts || { 冲: 0, 稳: 0, 保: 0, 数据不足: 0 })
const candidateRank = computed(() => {
  // 考生填写的位次优先；仅按分数查询时使用换算位次。
  const value = result.value?.profile?.rank ?? result.value?.profile?.resolved_rank
  return typeof value === 'number' ? value : null
})
const tierSchools = computed(() => (
  (result.value?.school_recommendations || []).filter((item) => item.tier === activeTier.value)
))
const shownSchools = computed(() => tierSchools.value.slice(0, visibleCount.value))
const activeHint = computed(() => TIERS.find((item) => item.key === activeTier.value)?.hint || '')
const activeTotal = computed(() => tierCounts.value[activeTier.value] || 0)
const hasAnyTier = computed(() => TIERS.some((item) => (tierCounts.value[item.key] || 0) > 0))

// Display the submitted profile, never an edited draft.
const conditionSummary = computed(() => {
  const submitted = result.value?.profile as Record<string, unknown> | undefined
  const rank = submitted?.rank as number | undefined
  const score = submitted?.score as number | undefined
  const metricText = rank ? `位次 ${formatNumber(rank)}` : score !== undefined && score !== null ? `${score} 分 ≈ 位次 ${formatNumber(candidateRank.value)}` : ''
  return [submitted?.candidate_province, submitted?.track, metricText].filter(Boolean).join(' · ')
})

function formatNumber(value?: number | null) {
  return typeof value === 'number' ? value.toLocaleString('zh-CN') : '—'
}
function schoolKey(item: GaokaoSchoolRecommendation) {
  return `${item.university_name}-${item.school_province || ''}`
}

function toggle(item: GaokaoSchoolRecommendation) {
  const key = schoolKey(item)
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

function gapText(item: GaokaoSchoolRecommendation) {
  if (item.rank_gap === undefined || item.rank_gap === null) return ''
  if (item.rank_gap > 0) return `领先 ${formatNumber(item.rank_gap)} 位`
  if (item.rank_gap < 0) return `落后 ${formatNumber(-item.rank_gap)} 位`
  return '与往年持平'
}

function qualityNote(item: GaokaoSchoolRecommendation) {
  return item.data_quality && item.data_quality !== '官方位次' ? item.data_quality : ''
}
</script>
<template><div class="gaokao-guide gaokao-results"><div class="guide-body">
      <section v-if="result" class="panel summary-bar" aria-label="当前条件">
        <span class="summary-text">{{ conditionSummary }}</span>
        <el-button text type="primary" @click="emit('edit')">修改条件</el-button>
      </section>

      <!-- 结果 -->
      <section v-if="result" class="results" :class="`tier-${activeTier}`" aria-label="查询结果">
        <el-alert v-for="warning in result.warnings" :key="warning" :title="warning" type="warning" show-icon :closable="false" class="result-alert" />

        <template v-if="hasAnyTier">
          <div class="results-heading"><h2>推荐院校</h2><span class="reference-badge">{{ result.profile.reference_year || '—' }} 年数据参考</span></div>
          <div class="tier-tabs" role="tablist" aria-label="冲稳保档位">
            <button
              v-for="tier in TIERS"
              :key="tier.key"
              type="button"
              role="tab"
              class="tier-tab"
              :id="`tier-tab-${tier.key}`"
              aria-controls="tier-school-panel"
              :class="[`tier-${tier.key}`, { active: activeTier === tier.key }]"
              :aria-selected="activeTier === tier.key"
              @click="activeTier = tier.key"
            >
              <span class="tier-tab-top"><strong>{{ tier.key }}</strong><AppIcon class="tier-tab-motif" :name="tier.key === '冲' ? 'top' : tier.key === '稳' ? 'compass' : 'check'" :size="18" /></span>
              <span class="tier-tab-bottom"><span>{{ tier.key === '冲' ? '探索可能' : tier.key === '稳' ? '把握方向' : '留足余地' }}</span><b>{{ tierCounts[tier.key] || 0 }} <small>所</small></b></span>
            </button>
          </div>
          <p class="tier-hint">
            {{ activeHint }}
            <template v-if="activeTotal > tierSchools.length">· 共 {{ formatNumber(activeTotal) }} 所，先看最值得关注的前 {{ tierSchools.length }} 所；想缩小范围可修改地区或关键词。</template>
          </p>

          <div id="tier-school-panel" role="tabpanel" :aria-labelledby="`tier-tab-${activeTier}`">
          <el-empty v-if="!tierSchools.length" :image-size="72" description="这一档暂时没有学校，看看其他档位" />
          <ul v-else :key="activeTier" class="school-list">
            <li v-for="(school, schoolIndex) in shownSchools" :key="schoolKey(school)" class="school" :class="{ open: expanded.has(schoolKey(school)) }" :style="{ '--card-delay': `${Math.min(schoolIndex % PAGE_STEP, 5) * 40}ms` }">
              <button type="button" class="school-row" :aria-expanded="expanded.has(schoolKey(school))" @click="toggle(school)">
                <span class="school-main">
                  <strong>{{ school.university_name }}</strong>
                  <small>
                    {{ school.school_province || '未标注' }}
                    <em v-if="qualityNote(school)" class="quality">{{ qualityNote(school) }}</em>
                  </small>
                </span>
                <span class="school-gap" :class="school.rank_gap !== null && school.rank_gap !== undefined && school.rank_gap < 0 ? 'behind' : 'ahead'">{{ gapText(school) }}</span>
                <span class="school-stat"><b>{{ formatNumber(school.min_rank) }}</b><small>往年最低位次</small></span>
                <span class="school-stat score"><b>{{ school.min_score ?? '—' }}</b><small>最低分</small></span>
              </button>
              <RankComparison v-if="school.comparison_mode !== 'score_only'" :candidate="candidateRank" :reference="school.min_rank" />
              <div v-if="expanded.has(schoolKey(school))" class="school-detail">
                <div v-for="(major, index) in school.majors" :key="index" class="major-row">
                  <span class="major-name">{{ major.major_name || major.group_name || '未标注专业' }}</span>
                  <span class="major-line">{{ major.min_score ?? '—' }} 分 · 位次 {{ formatNumber(major.min_rank) }}</span>
                </div>
                <p v-if="school.major_count > school.majors.length" class="detail-more">仅列出分数最高的 {{ school.majors.length }} 项，共 {{ school.major_count }} 项。</p>
              </div>
            </li>
          </ul>
          </div>
          <el-button v-if="tierSchools.length > visibleCount" class="more-btn" @click="visibleCount += PAGE_STEP">
            再看 {{ Math.min(PAGE_STEP, tierSchools.length - visibleCount) }} 所（还剩 {{ tierSchools.length - visibleCount }} 所）
          </el-button>
        </template>
        <el-empty v-else :image-size="88" description="没有找到可以按位次比较的学校，试试换个地区、批次，或清空关键词" />

        <el-collapse class="notes">
          <el-collapse-item title="数据说明与免责声明" name="notes">
            <p>{{ result.rule_note }}</p>
            <p>“冲 / 稳 / 保”按你的位次与学校往年最低录取位次的差距划分；学校的“最低位次”取该校可核验记录中最靠后的一条，展开可查看具体专业（组）。</p>
            <p>{{ result.disclaimer }}</p>
            <p v-if="result.sources.length">
              数据来源：
              <template v-for="(source, index) in result.sources" :key="source.id">
                <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.publisher }}（{{ source.year }}）</a>
                <span v-else>{{ source.publisher }}（{{ source.year }}）</span>
                <template v-if="index < result.sources.length - 1">、</template>
              </template>
            </p>
            <button type="button" class="catalog-link" @click="emit('catalog')"><AppIcon name="search" :size="16" /> 按校名查询已收录院校</button>
          </el-collapse-item>
        </el-collapse>
      </section>

<el-empty v-if="!result" description="请先填写报考条件"><el-button type="primary" @click="emit('edit')">填写报考信息</el-button></el-empty>
</div></div></template>
<style scoped src="./guide.css"></style>
