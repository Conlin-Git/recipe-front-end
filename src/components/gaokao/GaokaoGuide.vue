<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getGaokaoGuide,
  getGaokaoOptions,
  type GaokaoCoverage,
  type GaokaoGuideResult,
  type GaokaoRecommendation,
  type GaokaoSchoolRecommendation,
} from '../../api/gaokao'

const emit = defineEmits<{ login: []; catalog: [] }>()
type TierFilter = '全部' | '冲' | '稳' | '保' | '数据不足'

const loading = ref(false)
const result = ref<GaokaoGuideResult | null>(null)
const coverage = ref<GaokaoCoverage | null>(null)
const tierFilter = ref<TierFilter>('全部')
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
  sort_by: 'min_score_desc' as 'min_score_desc' | 'min_rank_asc' | 'rank_gap_desc',
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

const tierCounts = computed(() => result.value?.summary?.tier_counts || { 冲: 0, 稳: 0, 保: 0, 数据不足: 0 })
const resultCoverage = computed(() => result.value?.coverage || coverage.value)
const hasQualifiedResults = computed(() => (tierCounts.value['冲'] + tierCounts.value['稳'] + tierCounts.value['保']) > 0)
const candidateProvince = computed(() => form.value.candidate_province || '当前省份')
const schoolItems = computed(() => {
  const items = result.value?.school_recommendations || []
  const filtered = tierFilter.value === '全部' ? items : items.filter((item) => item.tier === tierFilter.value)
  return tierFilter.value === '全部' && hasQualifiedResults.value ? filtered.filter((item) => item.tier !== '数据不足') : filtered
})

function syncProvinceOptions() {
  const nextTracks = provinceTracks.value[form.value.candidate_province] || tracks.value
  if (!nextTracks.includes(form.value.track)) form.value.track = nextTracks[0] || ''
  const nextBatches = availableBatches.value
  if (!nextBatches.includes(form.value.batch)) form.value.batch = nextBatches[0] || '本科普通批'
}

watch(() => form.value.candidate_province, syncProvinceOptions)
watch(() => form.value.reference_year, syncProvinceOptions)

onMounted(async () => {
  try {
    const options = await getGaokaoOptions()
    // 目前四川是已完整配置考生位次口径的入口；院校所在地范围由服务端公开返回。
    provinces.value = options.provinces?.length ? options.provinces : ['四川']
    schoolProvinces.value = options.school_provinces?.length ? options.school_provinces : schoolProvinces.value
    form.value.school_provinces = [...schoolProvinces.value]
    referenceYears.value = options.reference_years?.length ? options.reference_years : options.years
    tracks.value = options.tracks
    provinceTracks.value = options.province_tracks || {}
    provinceBatches.value = options.province_batches || {}
    provinceReferenceBatches.value = options.province_reference_batches || {}
    coverage.value = options.coverage || null
    form.value.candidate_province = provinces.value.includes(form.value.candidate_province) ? form.value.candidate_province : (provinces.value[0] || '四川')
    form.value.admission_province = form.value.candidate_province
    form.value.reference_year = referenceYears.value[0] || 2026
    form.value.candidate_year = Math.max(form.value.candidate_year, form.value.reference_year + 1)
    form.value.track ||= availableTracks.value.includes('物理类') ? '物理类' : (tracks.value[0] || '')
    syncProvinceOptions()
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('未登录') || message.includes('登录')) emit('login')
    else ElMessage.error('官方数据选项加载失败，请稍后重试。')
  }
})

watch(() => form.value.candidate_province, (province) => {
  form.value.admission_province = province
  syncProvinceOptions()
})

async function submit() {
  if (loading.value) return
  result.value = null
  tierFilter.value = '全部'
  if (!form.value.candidate_province || !form.value.school_provinces.length || !form.value.track) {
    ElMessage.warning('请先选择考生省份、院校所在地和科类。')
    return
  }
  if (!form.value.rank && form.value.score === undefined) {
    ElMessage.warning('请填写省内位次或高考分数，优先填写位次。')
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
      limit: 100,
      history_years: 5,
      sort_by: form.value.sort_by,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '查询失败，请稍后重试。'
    if (message.includes('未登录') || message.includes('登录')) emit('login')
    else ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

function handleSubmitClick(event: MouseEvent) {
  event.preventDefault()
  void submit()
}

function tierType(tier: GaokaoRecommendation['tier']) {
  return tier === '保' ? 'success' : tier === '稳' ? 'primary' : tier === '冲' ? 'warning' : 'info'
}

function displayGap(item: GaokaoRecommendation) {
  if (item.rank_gap === undefined || item.rank_gap === null) return '暂无可比位次'
  if (item.rank_gap > 0) return `领先 ${item.rank_gap} 位`
  if (item.rank_gap < 0) return `落后 ${Math.abs(item.rank_gap)} 位`
  return '与历史线持平'
}

function recordKindLabel(item: GaokaoRecommendation) {
  return item.record_kind === 'major_admit' ? '专业录取线' : '院校专业组投档/录取线'
}

function formatYears(years: number[]) {
  return years.length ? years.join('、') : '—'
}

function schoolRowKey(item: GaokaoSchoolRecommendation) {
  return `${item.university_name}-${item.school_province || 'unknown'}`
}
</script>

<template>
  <main class="gaokao-guide">
    <section class="guide-intro">
      <div>
        <el-tag type="primary" effect="light">官方数据查询</el-tag>
        <h2>生成志愿指南</h2>
        <p>填写考生本地省份和省内位次，按该省招生口径生成学校清单；专业详情可展开查看。</p>
      </div>
    </section>

    <el-card class="guide-card" shadow="never">
      <template #header>
        <div class="card-heading">
          <span>生成志愿指南</span>
        </div>
      </template>

      <el-form label-position="top" class="guide-form" @submit.prevent="submit">
        <div class="form-section form-section-wide">
          <div class="form-section-title"><span>1</span>确认成绩口径</div>
          <div class="form-grid">
            <el-form-item required>
              <template #label>考生省份</template>
              <el-select v-model="form.candidate_province" filterable placeholder="请选择考生省份">
                <el-option v-for="item in provinces" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item required>
              <template #label>科类 / 口径</template>
              <el-select v-model="form.track" filterable placeholder="请选择官方科类" clearable>
                <el-option v-for="item in availableTracks" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item required>
              <template #label>考生年份（预计）</template>
              <el-input-number v-model="form.candidate_year" :min="2022" :max="2100" :controls="false" class="full-width" />
            </el-form-item>
            <el-form-item>
              <template #label>省内位次（优先）</template>
              <el-input-number v-model="form.rank" :min="1" :controls="false" placeholder="如 38000" class="full-width" />
            </el-form-item>
            <el-form-item>
              <template #label>高考分数</template>
              <el-input-number v-model="form.score" :min="0" :max="1000" :controls="false" placeholder="可选" class="full-width" />
            </el-form-item>
          </div>
        </div>

        <div class="form-section form-section-wide">
          <div class="form-section-title"><span>2</span>选择比较范围</div>
          <div class="form-grid">
            <el-form-item required>
              <template #label>院校所在地</template>
              <el-select v-model="form.school_provinces" multiple collapse-tags placeholder="请选择院校所在地">
                <el-option v-for="item in schoolProvinces" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item required>
              <template #label>对比投档年份</template>
              <el-select v-model="form.reference_year" placeholder="请选择对比年份">
                <el-option v-for="item in referenceYears" :key="item" :label="String(item)" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="批次">
              <el-select v-model="form.batch" placeholder="请选择批次">
                <el-option v-for="item in availableBatches" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="院校 / 专业关键词">
              <el-input v-model="form.keywords" placeholder="可选，如 计算机" clearable />
            </el-form-item>
          </div>
        </div>

        <div class="form-section form-section-wide">
          <div class="form-section-title"><span>3</span>补充筛选与生成</div>
          <div class="form-grid">
            <el-form-item label="选科组合">
              <el-input v-model="form.subjects" placeholder="如 物理 化学" clearable />
            </el-form-item>
            <el-form-item label="结果排序">
              <el-select v-model="form.sort_by">
                <el-option label="最低投档/录取分：高 → 低" value="min_score_desc" />
                <el-option label="最低位次：优 → 劣" value="min_rank_asc" />
                <el-option label="安全余量：高 → 低" value="rank_gap_desc" />
              </el-select>
            </el-form-item>
            <el-form-item class="form-actions">
              <el-button type="primary" native-type="submit" :loading="loading" :disabled="loading" size="large" @click="handleSubmitClick">
                {{ loading ? '查询中…' : '生成志愿指南' }}
              </el-button>
            </el-form-item>
          </div>
        </div>
      </el-form>

    </el-card>

    <el-card v-if="result" class="guide-result" shadow="never">
      <div class="result-heading">
        <div>
          <h3>查询结果</h3>
          <p>已按 {{ result.summary?.sort_by === 'min_rank_asc' ? '最低位次' : result.summary?.sort_by === 'rank_gap_desc' ? '安全余量' : '最低投档/录取分' }} 排序</p>
        </div>
        <el-button text type="primary" @click="submit">重新查询</el-button>
      </div>
      <div class="summary-grid">
        <div class="summary-item summary-total"><strong>{{ result.summary?.matched_count ?? result.recommendations.length }}</strong><span>匹配记录</span></div>
        <button class="summary-item summary-risk" type="button" @click="tierFilter = '冲'"><strong>{{ tierCounts['冲'] }}</strong><span>冲</span></button>
        <button class="summary-item summary-stable" type="button" @click="tierFilter = '稳'"><strong>{{ tierCounts['稳'] }}</strong><span>稳</span></button>
        <button class="summary-item summary-safe" type="button" @click="tierFilter = '保'"><strong>{{ tierCounts['保'] }}</strong><span>保</span></button>
        <button class="summary-item summary-insufficient" type="button" @click="tierFilter = '数据不足'"><strong>{{ tierCounts['数据不足'] }}</strong><span>数据不足</span></button>
      </div>
      <div class="result-toolbar">
        <el-radio-group v-model="tierFilter" size="small">
          <el-radio-button label="全部">全部</el-radio-button>
          <el-radio-button label="冲">冲</el-radio-button>
          <el-radio-button label="稳">稳</el-radio-button>
          <el-radio-button label="保">保</el-radio-button>
          <el-radio-button label="数据不足">数据不足</el-radio-button>
        </el-radio-group>
        <span class="result-count">当前显示 {{ schoolItems.length }} 所学校</span>
      </div>

      <el-empty v-if="!hasQualifiedResults || !schoolItems.length" :description="`暂无可按${candidateProvince}省排位比较的学校结果；数据不足记录已收起`" />
      <div v-else class="result-table-wrap">
        <el-table :data="schoolItems" :row-key="schoolRowKey" border stripe height="620">
          <el-table-column type="expand" width="42">
            <template #default="scope">
              <div class="detail-panel">
                <p>{{ scope.row.reason }}</p>
                <p>学校维度最低分：{{ scope.row.min_score ?? '—' }}；最低位次：{{ scope.row.min_rank ?? '—' }}；数据质量：{{ scope.row.data_quality || '无可用数据' }}</p>
                <p>点击下方专业行查看具体专业的录取/投档数据。</p>
                <el-table :data="scope.row.majors" size="small" border>
                  <el-table-column prop="major_name" label="专业" min-width="180" />
                  <el-table-column prop="group_name" label="专业组" min-width="130" />
                  <el-table-column label="最低分" width="95"><template #default="major">{{ major.row.min_score ?? '—' }}</template></el-table-column>
                  <el-table-column label="最低位次" width="105"><template #default="major">{{ major.row.min_rank ?? '—' }}</template></el-table-column>
                  <el-table-column label="数据层级" min-width="150"><template #default="major">{{ recordKindLabel(major.row) }}</template></el-table-column>
                </el-table>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="档位" width="78" fixed>
            <template #default="scope"><el-tag :type="tierType(scope.row.tier)" effect="dark">{{ scope.row.tier }}</el-tag></template>
          </el-table-column>
          <el-table-column label="院校" min-width="230">
            <template #default="scope">
              <div class="school-cell"><strong>{{ scope.row.university_name }}</strong><span>{{ scope.row.school_province || '未标注' }} · 点击展开 {{ scope.row.major_count }} 个专业</span></div>
            </template>
          </el-table-column>
          <el-table-column prop="min_score" label="最低分" width="110" sortable>
            <template #default="scope"><span>{{ scope.row.min_score ?? '—' }}</span><small class="column-note">学校最低投档/录取分</small></template>
          </el-table-column>
          <el-table-column prop="min_rank" label="最低位次" width="110" sortable>
            <template #default="scope">{{ scope.row.min_rank ?? '—' }}</template>
          </el-table-column>
          <el-table-column label="与你差值" width="120">
            <template #default="scope"><span :class="scope.row.rank_gap < 0 ? 'gap-risk' : 'gap-safe'">{{ displayGap(scope.row) }}</span></template>
          </el-table-column>
          <el-table-column label="年份 / 数据" min-width="130">
            <template #default="scope"><span>{{ formatYears(scope.row.historical_years) }}</span><small class="column-note">{{ scope.row.data_quality || '无可用数据' }}</small></template>
          </el-table-column>
        </el-table>
      </div>

      <el-collapse v-if="result.sources.length" class="source-collapse">
        <el-collapse-item :title="`官方数据来源（${result.sources.length}）`" name="sources">
          <a v-for="source in result.sources" :key="source.id" :href="source.url" target="_blank" rel="noopener noreferrer">
            {{ source.publisher }} {{ source.year }} · {{ source.dataset_type }} · {{ source.validation_status }}
          </a>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <footer class="guide-footer-notes">
      <details>
        <summary>数据范围、生成规则与免责说明</summary>
        <p>填写规则：优先填写考生在本地省份的省内位次；没有位次时可填写分数。位次、科类和批次必须与考生本地口径一致。</p>
        <p>当前院校所在地范围：{{ resultCoverage?.selected_school_provinces?.join('、') || '四川、广东、上海' }}；仅展示已核验官方招生数据，不代表全部本科院校。</p>
        <p>{{ result?.rule_note || '生成规则：使用考生本地省内排位，比较学校在考生本地招生口径下的最低投档/录取门槛。' }}</p>
        <p v-for="warning in result?.warnings || []" :key="warning">{{ warning }}</p>
        <p>数据仅供志愿填报参考，不构成录取承诺；政策、计划、专业组和录取结果以当年省教育考试院及招生院校官方发布为准。</p>
        <button class="footer-catalog-link" type="button" @click="emit('catalog')">查询已收录高校表</button>
      </details>
    </footer>
  </main>
</template>

<style scoped>
.gaokao-guide { flex: 1; min-height: 0; overflow: auto; padding: 1.25rem clamp(1rem, 5vw, 5rem) 1.5rem; color: var(--text-h, #08060d); background: var(--bg, #fff); }
.guide-intro, .guide-card, .guide-result, .guide-footer-notes { width: min(70rem, 100%); margin-right: auto; margin-left: auto; }
.guide-intro { margin-bottom: .8rem; }
.guide-intro h2 { margin: .55rem 0 .3rem; font-size: 1.35rem; }
.guide-intro p { margin: 0; color: var(--text, #6b6375); font-size: .85rem; }
.guide-card, .guide-result { border-radius: .75rem; }
.card-heading { display: flex; align-items: center; gap: .4rem; font-weight: 600; }
.guide-form { display: grid; gap: .85rem; }
.form-section { padding: .85rem; border: 1px solid var(--el-border-color-lighter); border-radius: .65rem; background: color-mix(in srgb, var(--el-fill-color-light) 42%, transparent); }
.form-section-title { display: flex; align-items: center; gap: .45rem; margin-bottom: .75rem; color: var(--el-text-color-primary); font-weight: 650; font-size: .9rem; }
.form-section-title span { width: 1.35rem; height: 1.35rem; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: var(--el-color-primary); font-size: .75rem; }
.form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .1rem 1rem; }
.guide-form :deep(.el-form-item) { min-width: 0; margin-bottom: .55rem; }
.guide-form :deep(.el-select), .guide-form :deep(.el-input), .guide-form :deep(.el-input-number) { width: 100%; }
.column-note { display: block; color: var(--el-text-color-secondary); font-size: .72rem; line-height: 1.35; }
.full-width { width: 100%; }
.form-actions { grid-column: span 2; align-self: end; }
.form-actions :deep(.el-form-item__content) { justify-content: flex-end; }
.form-actions .el-button { min-width: 12rem; }
.guide-error { margin-top: .5rem; }
.guide-result { margin-top: .8rem; }
.result-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .75rem; }
.result-heading h3 { margin: 0; font-size: 1.05rem; }
.result-heading p { margin: .2rem 0 0; color: var(--el-text-color-secondary); font-size: .78rem; }
.summary-grid { display: grid; grid-template-columns: 1.4fr repeat(4, 1fr); gap: .55rem; margin-bottom: .75rem; }
.summary-item { min-height: 4.1rem; display: flex; flex-direction: column; justify-content: center; gap: .1rem; padding: .6rem .75rem; border: 1px solid var(--el-border-color-lighter); border-radius: .6rem; color: var(--el-text-color-secondary); background: var(--el-fill-color-light); text-align: left; }
button.summary-item { cursor: pointer; font: inherit; }
.summary-item strong { color: var(--el-text-color-primary); font-size: 1.35rem; line-height: 1.1; }
.summary-total strong { color: var(--el-color-primary); }
.summary-risk strong { color: var(--el-color-warning); }
.summary-stable strong { color: var(--el-color-primary); }
.summary-safe strong { color: var(--el-color-success); }
.summary-insufficient strong { color: var(--el-text-color-secondary); }
.result-rule { margin: .7rem 0; padding: .45rem .65rem; border-left: 3px solid var(--el-color-primary); color: var(--el-text-color-secondary); background: var(--el-fill-color-light); font-size: .75rem; line-height: 1.45; }
.result-toolbar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin: .8rem 0 .55rem; }
.result-count { color: var(--el-text-color-secondary); font-size: .78rem; }
.result-table-wrap { overflow: hidden; border-radius: .45rem; }
.result-table-wrap :deep(.el-table) { min-width: 980px; }
.school-cell { display: flex; flex-direction: column; gap: .12rem; min-width: 0; }
.school-cell strong { color: var(--el-text-color-primary); font-size: .84rem; }
.school-cell span { overflow: hidden; color: var(--el-text-color-secondary); font-size: .73rem; text-overflow: ellipsis; white-space: nowrap; }
.gap-risk { color: var(--el-color-warning); font-weight: 600; }
.gap-safe { color: var(--el-color-success); font-weight: 600; }
.detail-panel { padding: .45rem 1rem; color: var(--el-text-color-regular); font-size: .78rem; line-height: 1.6; }
.detail-panel p { margin: .15rem 0; }
.source-collapse { margin-top: .8rem; }
.source-collapse a { display: block; margin-top: .35rem; color: var(--el-color-primary); font-size: .8rem; }
.guide-footer-notes { margin-top: .85rem; padding: .45rem .1rem .1rem; color: var(--el-text-color-secondary); font-size: .7rem; line-height: 1.5; }
.guide-footer-notes summary { cursor: pointer; color: var(--el-text-color-regular); }
.guide-footer-notes p { margin: .35rem 0 0; }
.footer-catalog-link { margin-top: .35rem; padding: 0; border: 0; color: var(--el-color-primary); background: transparent; font: inherit; cursor: pointer; }
@media (max-width: 980px) { .form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .summary-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@media (max-width: 620px) { .form-grid { grid-template-columns: 1fr; } .form-actions { grid-column: auto; } .form-actions :deep(.el-form-item__content) { justify-content: stretch; } .form-actions .el-button { width: 100%; } .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .summary-total { grid-column: 1 / -1; } .result-toolbar { align-items: flex-start; flex-direction: column; } }
</style>
