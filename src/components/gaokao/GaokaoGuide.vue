<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { getGaokaoGuide, getGaokaoOptions, type GaokaoGuideResult } from '../../api/gaokao'

const emit = defineEmits<{ login: [] }>()
const loading = ref(false)
const error = ref('')
const result = ref<GaokaoGuideResult | null>(null)
const provinces = ref<string[]>(['四川'])
const schoolProvinces = ref<string[]>(['四川', '广东', '上海'])
const referenceYears = ref<number[]>([2026])
const tracks = ref<string[]>([])
const provinceTracks = ref<Record<string, string[]>>({})
const provinceBatches = ref<Record<string, string[]>>({})
const provinceReferenceBatches = ref<Record<string, Record<string, string[]>>>({})
const form = ref({
  candidate_province: '四川',
  admission_province: '四川',
  school_provinces: ['四川', '广东', '上海'],
  candidate_year: new Date().getFullYear() + 1,
  reference_year: 2026,
  track: '',
  rank: undefined as number | undefined,
  score: undefined as number | undefined,
  batch: '本科普通批',
  subjects: '',
  keywords: '',
})

const resultSections = computed(() => {
  if (!result.value) return []
  const entries = Object.entries(result.value.sections || {}).filter(([, items]) => items.length)
  return entries.length
    ? entries.map(([province, items]) => ({ province, items }))
    : [{ province: '', items: result.value.recommendations }]
})

const availableTracks = computed(() => provinceTracks.value[form.value.candidate_province] || tracks.value)

function undergraduateBatches(batches: string[]) {
  const filtered = batches.filter((batch) => batch.includes('本科'))
  return filtered.length ? filtered : ['本科普通批']
}

const availableBatches = computed(() => (
  undergraduateBatches(
    provinceReferenceBatches.value[form.value.admission_province]?.[String(form.value.reference_year)]
      || provinceBatches.value[form.value.admission_province]
      || [],
  )
))

function syncProvinceOptions() {
  const province = form.value.candidate_province
  const nextTracks = provinceTracks.value[province] || tracks.value
  if (!nextTracks.includes(form.value.track)) form.value.track = nextTracks[0] || ''
  const nextBatches = availableBatches.value
  if (!nextBatches.includes(form.value.batch)) form.value.batch = nextBatches[0] || '本科普通批'
}

watch(() => form.value.candidate_province, syncProvinceOptions)
watch(() => form.value.reference_year, syncProvinceOptions)

const fieldTips = {
  province: '省份会决定分数线、位次和招生口径，不能跨省比较。',
  schoolProvince: '只比较所选院校所在地的院校，在考生省份的同口径招生记录。',
  candidateYear: '填写考生预计参加高考的年份；即使该年份还没有数据，也可以对比已发布的历史投档线。',
  referenceYear: '选择要拿来比较的历史院校投档年份。',
  track: '请选择与成绩单一致的官方科类，例如物理类、历史类或综合。',
  rank: '省内位次比原始分数更适合志愿判断，优先填写。',
  score: '填写分数后，系统会用同省同科类的一分一段表换算位次。',
}

onMounted(async () => {
  try {
    const options = await getGaokaoOptions()
    provinces.value = ['四川']
    schoolProvinces.value = options.school_provinces?.length ? options.school_provinces : schoolProvinces.value
    referenceYears.value = options.reference_years?.length ? options.reference_years : options.years
    tracks.value = options.tracks
    provinceTracks.value = options.province_tracks || {}
    provinceBatches.value = options.province_batches || {}
    provinceReferenceBatches.value = options.province_reference_batches || {}
    form.value.candidate_province = '四川'
    form.value.admission_province = '四川'
    form.value.reference_year = referenceYears.value[0] || 2026
    form.value.candidate_year = Math.max(form.value.candidate_year, form.value.reference_year + 1)
    form.value.track ||= availableTracks.value.includes('物理类') ? '物理类' : (tracks.value[0] || '')
    syncProvinceOptions()
  } catch (err) {
    error.value = '官方数据选项加载失败，请稍后重试。'
    const message = err instanceof Error ? err.message : ''
    if (message.includes('未登录') || message.includes('登录')) emit('login')
  }
})

function clearError() {
  error.value = ''
}

async function submit() {
  if (loading.value) return
  clearError()
  result.value = null
  if (!form.value.candidate_province || !form.value.admission_province || !form.value.school_provinces.length || !form.value.track) {
    error.value = '请先选择考生省份、院校所在地和科类。'
    return
  }
  if (!form.value.rank && !form.value.score) {
    error.value = '请填写省内位次或高考分数，优先填写位次。'
    return
  }
  loading.value = true
  try {
    result.value = await getGaokaoGuide({
      candidate_province: form.value.candidate_province,
      admission_province: form.value.admission_province,
      school_provinces: form.value.school_provinces,
      candidate_year: form.value.candidate_year,
      reference_year: form.value.reference_year,
      track: form.value.track,
      rank: form.value.rank,
      score: form.value.score,
      batch: form.value.batch,
      subjects: form.value.subjects.split(/[，,\s+]+/).filter(Boolean),
      preferred_regions: [],
      keywords: form.value.keywords,
      limit: 30,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : '查询失败，请稍后重试。'
    if (error.value.includes('未登录') || error.value.includes('登录')) emit('login')
    else ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

function handleSubmitClick(event: MouseEvent) {
  // Element Plus 的表单在部分移动端场景不会稳定派发原生 submit，
  // 点击按钮时显式提交；阻止默认行为避免与表单 submit 监听重复请求。
  event.preventDefault()
  void submit()
}
</script>

<template>
  <main class="gaokao-guide">
    <section class="guide-intro">
      <div>
        <el-tag type="primary" effect="light">官方数据查询</el-tag>
        <h2>按官方口径查询志愿信息</h2>
        <p>填写考生预计年份和省内位次，再选择历史投档年份进行对比。系统只展示有来源和校验状态的数据。</p>
      </div>
      <el-alert
        class="guide-intro-alert"
        title="填报前请以省教育考试院和招生院校最新公告为准"
        type="warning"
        :closable="false"
        show-icon
      />
    </section>

    <el-card class="guide-card" shadow="never">
      <template #header>
        <div class="card-heading">
          <span>考生信息</span>
          <el-tooltip content="省份、科类和对比投档年份会锁定数据口径，系统不会跨省推算。" placement="top">
            <el-icon class="help-icon"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>
      </template>

      <el-form label-position="top" class="guide-form" @submit.prevent="submit">
        <el-form-item required>
          <template #label><FieldLabel text="考生省份" :tip="fieldTips.province" /></template>
          <el-select v-model="form.candidate_province" filterable placeholder="请选择考生省份" clearable>
            <el-option v-for="item in provinces" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item required>
          <template #label><FieldLabel text="院校所在地" :tip="fieldTips.schoolProvince" /></template>
          <el-select v-model="form.school_provinces" multiple collapse-tags placeholder="请选择院校所在地">
            <el-option v-for="item in schoolProvinces" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item required>
          <template #label><FieldLabel text="考生年份（预计）" :tip="fieldTips.candidateYear" /></template>
          <el-input-number v-model="form.candidate_year" :min="2022" :max="2100" :controls="false" class="full-width" />
        </el-form-item>

        <el-form-item required>
          <template #label><FieldLabel text="对比投档年份" :tip="fieldTips.referenceYear" /></template>
          <el-select v-model="form.reference_year" placeholder="请选择对比年份">
            <el-option v-for="item in referenceYears" :key="item" :label="String(item)" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item required>
          <template #label><FieldLabel text="科类 / 口径" :tip="fieldTips.track" /></template>
          <el-select v-model="form.track" filterable placeholder="请选择官方科类" clearable>
            <el-option v-for="item in availableTracks" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item label="批次">
          <el-select v-model="form.batch" placeholder="请选择批次">
            <el-option v-for="item in availableBatches" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <template #label><FieldLabel text="省内位次（优先）" :tip="fieldTips.rank" /></template>
          <el-input-number v-model="form.rank" :min="1" :controls="false" placeholder="如 38000" class="full-width" />
        </el-form-item>

        <el-form-item>
          <template #label><FieldLabel text="高考分数" :tip="fieldTips.score" /></template>
          <el-input-number v-model="form.score" :min="0" :max="1000" :controls="false" placeholder="填写后自动换算位次" class="full-width" />
        </el-form-item>

        <el-form-item label="选科组合">
          <el-input v-model="form.subjects" placeholder="如 物理 化学" clearable title="如 物理 化学" />
        </el-form-item>

        <el-form-item label="院校 / 专业关键词">
          <el-input v-model="form.keywords" placeholder="可选，如 计算机" clearable title="可选，如 计算机" />
        </el-form-item>

        <el-form-item class="form-actions">
          <el-button
            type="primary"
            native-type="submit"
            :loading="loading"
            :disabled="loading"
            size="large"
            @click="handleSubmitClick"
          >
            {{ loading ? '查询中…' : '生成志愿指南' }}
          </el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="error"
        class="guide-error"
        :title="error"
        type="warning"
        :closable="false"
        show-icon
      />
    </el-card>

    <el-alert
      class="guide-notice"
      title="位次优先，口径必须一致"
      description="没有同省、同年份、同科类的已核验官方数据时，系统会明确提示数据不足，不会生成学校推荐。"
      type="info"
      :closable="false"
      show-icon
    />

    <el-card v-if="result" class="guide-result" shadow="never">
      <el-alert :title="result.disclaimer" type="warning" :closable="false" show-icon />
      <el-alert
        v-for="warning in result.warnings"
        :key="warning"
        class="result-warning"
        :title="warning"
        type="warning"
        :closable="false"
        show-icon
      />

      <el-empty v-if="!resultSections.length" description="暂无满足当前口径的已核验院校录取数据" />
      <div v-else class="recommendation-sections">
        <section v-for="section in resultSections" :key="section.province || 'all'" class="recommendation-section">
          <h3 v-if="section.province">院校所在地：{{ section.province }}</h3>
          <div class="recommendations">
            <article v-for="item in section.items" :key="`${item.university_name}-${item.group_name}-${item.major_name}`" class="recommendation-card">
              <el-tag :type="item.tier === '保' ? 'success' : item.tier === '稳' ? 'primary' : 'warning'" effect="dark">{{ item.tier }}</el-tag>
              <div class="recommendation-main">
                <strong>{{ item.university_name }}</strong>
                <span v-if="item.group_name"> · {{ item.group_name }}</span>
                <p v-if="item.major_name">{{ item.major_name }}</p>
                <small class="record-kind">位次比较：{{ item.rank_status }}</small>
                <small class="record-kind">院校所在地：{{ item.school_province || '未标注' }}</small>
                <small class="record-kind">数据层级：{{ item.record_kind === 'major_admit' ? '专业录取线' : '院校专业组投档/录取线' }}</small>
                <small v-if="item.admission_round && item.admission_round !== 'regular'" class="record-kind">征集轮次：{{ item.admission_round }}</small>
                <small v-if="item.min_score || item.min_rank">最低分：{{ item.min_score ?? '—' }} · 最低位次：{{ item.min_rank ?? '—' }}</small>
                <small>{{ item.historical_years.join('、') }}年最低位次：{{ item.historical_min_ranks.join('、') }} · 可信度：{{ item.confidence }}</small>
                <small>{{ item.reason }}{{ item.subject_requirements ? ` 选科要求：${item.subject_requirements}` : '' }}</small>
              </div>
            </article>
          </div>
        </section>
      </div>

      <el-collapse v-if="result.sources.length" class="source-collapse">
        <el-collapse-item :title="`官方数据来源（${result.sources.length}）`" name="sources">
          <a v-for="source in result.sources" :key="source.id" :href="source.url" target="_blank" rel="noopener noreferrer">
            {{ source.publisher }} {{ source.year }} · {{ source.dataset_type }} · {{ source.validation_status }}
          </a>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </main>
</template>

<script lang="ts">
import { defineComponent, h } from 'vue'
import { ElIcon, ElTooltip } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'

const FieldLabel = defineComponent({
  name: 'FieldLabel',
  props: { text: { type: String, required: true }, tip: { type: String, required: true } },
  setup(props) {
    return () => h('span', { class: 'field-label' }, [
      h('span', props.text),
      h(ElTooltip, { content: props.tip, placement: 'top' }, {
        default: () => h(ElIcon, { class: 'field-help', 'aria-label': props.tip }, { default: () => h(WarningFilled) }),
      }),
    ])
  },
})

export default { components: { FieldLabel, ElTooltip } }
</script>

<style scoped>
.gaokao-guide {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1.25rem clamp(1rem, 5vw, 5rem) 1rem;
  color: var(--text-h, #08060d);
  background: var(--bg, #fff);
}

.guide-intro,
.guide-card,
.guide-notice,
.guide-result {
  width: min(62rem, 100%);
  margin-right: auto;
  margin-left: auto;
}

.guide-intro { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.guide-intro h2 { margin: .6rem 0 .35rem; font-size: 1.35rem; }
.guide-intro p { margin: 0; color: var(--text, #6b6375); font-size: .85rem; }
.guide-intro-alert { max-width: 22rem; }
.guide-card { border-radius: .75rem; }
.card-heading { display: flex; align-items: center; gap: .4rem; font-weight: 600; }
.help-icon { color: var(--el-color-primary); cursor: help; }
.guide-form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .1rem 1rem; }
.guide-form :deep(.el-form-item) { min-width: 0; margin-bottom: .85rem; }
.guide-form :deep(.el-select),
.guide-form :deep(.el-input),
.guide-form :deep(.el-input-number) { width: 100%; }
.guide-form :deep(.el-input__inner),
.guide-form :deep(.el-select__placeholder) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.field-label { display: inline-flex; align-items: center; gap: .3rem; }
.field-help { color: var(--el-color-warning); cursor: help; }
.full-width { width: 100%; }
.form-actions { grid-column: 1 / -1; margin-top: .2rem; }
.form-actions :deep(.el-form-item__content) { justify-content: flex-end; }
.form-actions .el-button { min-width: 12rem; }
.guide-error { grid-column: 1 / -1; margin-top: .2rem; }
.guide-notice { margin-top: .8rem; }
.guide-result { margin-top: .8rem; }
.result-warning { margin-top: .55rem; }
.recommendation-sections { display: grid; gap: 1rem; margin-top: 1rem; }
.recommendation-section h3 { margin: 0 0 .55rem; font-size: .95rem; color: var(--el-text-color-primary); }
.recommendations { display: grid; gap: .6rem; margin-top: 1rem; }
.recommendation-section .recommendations { margin-top: 0; }
.recommendation-card { display: flex; align-items: flex-start; gap: .7rem; padding: .75rem; border: 1px solid var(--el-border-color); border-radius: .55rem; }
.recommendation-main { min-width: 0; display: flex; flex-direction: column; gap: .2rem; }
.recommendation-main strong { font-size: .95rem; }
.recommendation-main span { color: var(--el-text-color-regular); font-size: .84rem; }
.recommendation-main p { margin: .1rem 0; color: var(--el-text-color-regular); font-size: .82rem; }
.recommendation-main small { color: var(--el-text-color-secondary); font-size: .75rem; line-height: 1.4; }
.source-collapse { margin-top: .8rem; }
.source-collapse a { display: block; margin-top: .35rem; color: var(--el-color-primary); font-size: .8rem; }

@media (max-width: 840px) {
  .guide-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .guide-intro { flex-direction: column; }
  .guide-intro-alert { max-width: none; }
}

@media (max-width: 520px) {
  .guide-form { grid-template-columns: 1fr; }
  .form-actions { grid-column: auto; }
  .form-actions :deep(.el-form-item__content) { justify-content: stretch; }
  .form-actions .el-button { width: 100%; }
}
</style>
