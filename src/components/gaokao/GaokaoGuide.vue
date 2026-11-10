<script setup lang="ts">
import { computed, onMounted, onDeactivated, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useFeatureResults } from '../../stores/featureResults'
import {
  getGaokaoGuide,
  getGaokaoOptions,
} from '../../api/gaokao'

const emit = defineEmits<{ login: []; catalog: []; complete: [] }>()

type Metric = 'rank' | 'score'
const PER_TIER_LIMIT = 30
const loading = ref(false)
const showMore = ref(false)
const reports = useFeatureResults()
let requestId = 0
let controller: AbortController | null = null
function cancelPending() { requestId++; controller?.abort(); controller = null; loading.value = false }
onDeactivated(cancelPending)
onBeforeUnmount(cancelPending)

const provinces = ref<string[]>(['四川'])
const schoolProvinces = ref<string[]>([])
const referenceYears = ref<number[]>([2026])
const tracks = ref<string[]>([])
const provinceTracks = ref<Record<string, string[]>>({})
const provinceBatches = ref<Record<string, string[]>>({})
const provinceReferenceBatches = ref<Record<string, Record<string, string[]>>>({})
const scoreBandProvinces = ref<Set<string>>(new Set())

const metric = ref<Metric>('rank')
const form = ref({
  candidate_province: '四川',
  school_provinces: [] as string[],
  candidate_year: new Date().getFullYear() + 1,
  reference_year: 2026,
  track: '',
  rank: undefined as number | undefined,
  score: undefined as number | undefined,
  batch: '本科普通批',
  keywords: '',
})

const availableTracks = computed(() => provinceTracks.value[form.value.candidate_province] || tracks.value)
const canUseScore = computed(() => scoreBandProvinces.value.has(form.value.candidate_province))

function undergraduateBatches(batches: string[]) {
  const filtered = batches.filter((batch) => batch.includes('本科') || batch === '提前批')
  return filtered.length ? filtered : ['本科普通批']
}

const availableBatches = computed(() => undergraduateBatches(
  provinceReferenceBatches.value[form.value.candidate_province]?.[String(form.value.reference_year)]
    || provinceBatches.value[form.value.candidate_province]
    || [],
))

function syncProvinceOptions() {
  const nextTracks = provinceTracks.value[form.value.candidate_province] || tracks.value
  if (!nextTracks.includes(form.value.track)) form.value.track = nextTracks.includes('物理类') ? '物理类' : (nextTracks[0] || '')
  const nextBatches = availableBatches.value
  if (!nextBatches.includes(form.value.batch)) {
    form.value.batch = nextBatches.find((b) => b === '本科批次B段') || nextBatches.find((b) => !b.includes('提前')) || nextBatches[0] || '本科普通批'
  }
  // 没有一分一段表的省份无法把分数换算成位次，只能按位次查。
  if (!canUseScore.value) metric.value = 'rank'
}

watch(() => form.value.candidate_province, syncProvinceOptions)
watch(() => form.value.reference_year, syncProvinceOptions)
watch([form, metric], () => { cancelPending(); reports.gaokao = null }, { deep: true })

onMounted(async () => {
  try {
    const options = await getGaokaoOptions()
    provinces.value = options.provinces?.length ? options.provinces : ['四川']
    schoolProvinces.value = options.school_provinces || []
    referenceYears.value = options.reference_years?.length ? options.reference_years : options.years
    tracks.value = options.tracks
    provinceTracks.value = options.province_tracks || {}
    provinceBatches.value = options.province_batches || {}
    provinceReferenceBatches.value = options.province_reference_batches || {}
    scoreBandProvinces.value = new Set(Object.keys(options.province_score_band_years || {}))
    form.value.candidate_province = provinces.value.includes(form.value.candidate_province) ? form.value.candidate_province : (provinces.value[0] || '四川')
    form.value.reference_year = referenceYears.value[0] || 2026
    form.value.candidate_year = Math.max(form.value.candidate_year, form.value.reference_year + 1)
    syncProvinceOptions()
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('登录')) emit('login')
    else ElMessage.error('查询选项加载失败，请稍后重试。')
  }
})

async function submit() {
  if (loading.value) return
  if (!form.value.candidate_province || !form.value.track) {
    ElMessage.warning('请先选择省份和科类。')
    return
  }
  const value = metric.value === 'rank' ? form.value.rank : form.value.score
  if (!value && value !== 0) {
    ElMessage.warning(metric.value === 'rank' ? '请填写省内位次。' : '请填写高考分数。')
    return
  }
  const id = ++requestId
  controller = new AbortController()
  loading.value = true
  try {
    const data = await getGaokaoGuide({
      candidate_province: form.value.candidate_province,
      admission_province: form.value.candidate_province,
      school_provinces: form.value.school_provinces,
      candidate_year: form.value.candidate_year,
      reference_year: form.value.reference_year,
      track: form.value.track,
      rank: metric.value === 'rank' ? form.value.rank : undefined,
      score: metric.value === 'score' ? form.value.score : undefined,
      batch: form.value.batch,
      subjects: [],
      preferred_regions: [],
      keywords: form.value.keywords.trim(),
      limit: PER_TIER_LIMIT,
      history_years: 5,
      sort_by: 'smart',
    }, controller.signal)
    if (id !== requestId) return
    reports.gaokao = data
    emit('complete')
  } catch (err) {
    if (id !== requestId) return
    const message = err instanceof Error ? err.message : '查询失败，请稍后重试。'
    if (message.includes('登录')) emit('login')
    else ElMessage.error(message)
  } finally {
    if (id === requestId) loading.value = false
  }
}

</script>

<template>
  <main class="gaokao-guide">
    <div class="guide-body">
      <!-- 独立填写页；成功后由父页面切换到结果页。 -->
      <section class="panel form-panel" aria-label="填写条件">
        <h2 class="panel-title">填写报考信息</h2>
        <el-form label-position="top" class="guide-form" @submit.prevent="submit">
          <div class="field-row">
            <el-form-item label="省份">
              <el-select popper-class="app-popper" :popper-options="{ strategy: 'fixed' }" v-model="form.candidate_province" placeholder="选择省份">
                <el-option v-for="item in provinces" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="科类">
              <el-select popper-class="app-popper" :popper-options="{ strategy: 'fixed' }" v-model="form.track" placeholder="选择科类">
                <el-option v-for="item in availableTracks" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </div>

          <el-form-item class="metric-item">
            <template #label>
              <span class="metric-label">
                我的成绩
                <el-radio-group v-model="metric" size="small" class="metric-switch">
                  <el-radio-button value="rank">省内位次</el-radio-button>
                  <el-radio-button value="score" :disabled="!canUseScore">高考分数</el-radio-button>
                </el-radio-group>
              </span>
            </template>
            <el-input-number v-if="metric === 'rank'" v-model="form.rank" :min="1" :controls="false" placeholder="例如 38000" class="full-width" @keyup.enter="submit" />
            <el-input-number v-else v-model="form.score" :min="0" :max="1000" :controls="false" placeholder="例如 590" class="full-width" @keyup.enter="submit" />
            <p class="field-tip">
              <template v-if="!canUseScore">{{ form.candidate_province }}暂无一分一段表，请填写位次（成绩单或省考试院查询）。</template>
              <template v-else-if="metric === 'rank'">位次比分数更准，推荐优先填写。</template>
              <template v-else>将按最近一年的一分一段表换算成位次。</template>
            </p>
          </el-form-item>

          <el-form-item label="想去哪些地区（可选，不选就是全国）">
            <el-select popper-class="app-popper" :popper-options="{ strategy: 'fixed' }" v-model="form.school_provinces" multiple collapse-tags collapse-tags-tooltip filterable clearable placeholder="全国">
              <el-option v-for="item in schoolProvinces" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>

          <button type="button" class="more-toggle" :aria-expanded="showMore" @click="showMore = !showMore">
            {{ showMore ? '收起' : '更多条件' }}（批次、对比年份、关键词）<AppIcon :name="showMore ? 'minus' : 'plus'" :size="14" />
          </button>
          <div v-show="showMore" class="field-row more-fields">
            <el-form-item label="批次">
              <el-select popper-class="app-popper" :popper-options="{ strategy: 'fixed' }" v-model="form.batch"><el-option v-for="item in availableBatches" :key="item" :label="item" :value="item" /></el-select>
            </el-form-item>
            <el-form-item label="对比哪一年的投档线">
              <el-select popper-class="app-popper" :popper-options="{ strategy: 'fixed' }" v-model="form.reference_year"><el-option v-for="item in referenceYears" :key="item" :label="`${item} 年`" :value="item" /></el-select>
            </el-form-item>
            <el-form-item label="院校 / 专业关键词" class="span-all">
              <el-input v-model="form.keywords" placeholder="例如 计算机、师范" clearable @keyup.enter="submit" />
            </el-form-item>
          </div>

          <el-button type="primary" native-type="submit" size="large" class="submit-btn" :loading="loading" @click.prevent="submit">
            {{ loading ? '查询中…' : '看看能上哪些学校' }}
          </el-button>
        </el-form>
      </section>


      <p class="foot-link">
        <button type="button" class="catalog-link" @click="emit('catalog')">只想查某所学校？<AppIcon name="search" :size="16" /> 按校名查询已收录院校</button>
      </p>
    </div>
  </main>
</template>

<style scoped src="./guide.css"></style>
