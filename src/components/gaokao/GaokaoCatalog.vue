<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getGaokaoCatalog, getGaokaoOptions, type GaokaoCatalogResult } from '../../api/gaokao'

const emit = defineEmits<{ guide: []; login: [] }>()
const loading = ref(false)
const error = ref('')
const loaded = ref(false)
const result = ref<GaokaoCatalogResult | null>(null)
const provinces = ref<string[]>(['四川', '广东', '上海'])
const schoolProvinces = ref<string[]>([])
const years = ref<number[]>([2026])
const tracks = ref<string[]>([])
const page = ref(1)
const form = ref({
  admission_province: '四川',
  school_provinces: [] as string[],
  year: 2026 as number | undefined,
  track: '',
  batch: '本科普通批',
  keywords: '',
})

watch(page, () => { void load() })
watch(() => form.value.admission_province, (province) => {
  tracks.value = provinceTracks.value[province] || tracks.value
  if (form.value.track && !tracks.value.includes(form.value.track)) form.value.track = tracks.value[0] || ''
})
const provinceTracks = ref<Record<string, string[]>>({})

onMounted(async () => {
  try {
    const options = await getGaokaoOptions()
    provinces.value = options.provinces?.length ? options.provinces : provinces.value
    form.value.admission_province = provinces.value.includes(form.value.admission_province) ? form.value.admission_province : (provinces.value[0] || '四川')
    schoolProvinces.value = options.school_provinces?.length ? options.school_provinces : schoolProvinces.value
    years.value = options.reference_years?.length ? options.reference_years : options.years
    form.value.year = years.value[0] || 2026
    provinceTracks.value = options.province_tracks || {}
    tracks.value = provinceTracks.value[form.value.admission_province] || options.tracks
    form.value.track = tracks.value.includes('物理类') ? '物理类' : (tracks.value[0] || '')
    await load()
  } catch (err) {
    handleError(err, '查询选项加载失败，请稍后重试。')
  }
})

async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    result.value = await getGaokaoCatalog({
      admission_province: form.value.admission_province,
      school_provinces: form.value.school_provinces,
      year: form.value.year || undefined,
      track: form.value.track || undefined,
      batch: form.value.batch,
      keywords: form.value.keywords,
      page: page.value,
      page_size: 10,
    })
    loaded.value = true
  } catch (err) {
    handleError(err, '院校总表暂时无法加载，请稍后重试。')
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  void load()
}

function handleError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback
  error.value = message
  if (message.includes('未登录') || message.includes('登录')) emit('login')
  else ElMessage.error(message)
}
</script>

<template>
  <main class="catalog-content">
    <section class="catalog-intro">
      <div>
        <el-tag type="primary" effect="light">已收录高校查询</el-tag>
        <h2>本科院校总表</h2>
      </div>
      <div class="catalog-actions">
        <el-button text type="primary" @click="emit('guide')">生成志愿指南</el-button>
        <el-button :icon="Refresh" text :loading="loading" title="刷新" aria-label="刷新" @click="load" />
      </div>
    </section>

    <p class="catalog-scope">选择考生生源地（四川、广东或上海），再按需筛选全国院校所在地。</p>
    <div class="catalog-filters">
      <el-select popper-class="app-popper" :popper-options="{ strategy: 'fixed' }" v-model="form.admission_province" filterable placeholder="考生生源地">
        <el-option v-for="province in provinces" :key="province" :label="province" :value="province" />
      </el-select>
      <el-select popper-class="app-popper" :popper-options="{ strategy: 'fixed' }" v-model="form.school_provinces" multiple collapse-tags filterable clearable placeholder="全国院校（不限地区）">
        <el-option v-for="province in schoolProvinces" :key="province" :label="province" :value="province" />
      </el-select>
      <el-select popper-class="app-popper" :popper-options="{ strategy: 'fixed' }" v-model="form.year" clearable placeholder="年份"><el-option v-for="year in years" :key="year" :label="String(year)" :value="year" /></el-select>
      <el-select popper-class="app-popper" :popper-options="{ strategy: 'fixed' }" v-model="form.track" clearable placeholder="科类"><el-option v-for="track in tracks" :key="track" :label="track" :value="track" /></el-select>
      <el-select popper-class="app-popper" :popper-options="{ strategy: 'fixed' }" v-model="form.batch" placeholder="批次"><el-option label="普通本科批" value="本科普通批" /><el-option label="本科提前批" value="提前批" /></el-select>
      <el-input v-model="form.keywords" clearable placeholder="院校或专业关键词" @keyup.enter="search" />
      <el-button type="primary" :loading="loading" @click="search">查询</el-button>
    </div>

    <el-empty v-if="loaded && !result?.items.length" description="当前筛选没有已收录院校记录" />
    <template v-else>
      <el-table v-loading="loading" :data="result?.items || []" border stripe class="catalog-table catalog-table-desktop">
        <el-table-column prop="university_name" label="院校" min-width="210" fixed />
        <el-table-column prop="school_province" label="所在地" width="90" />
        <el-table-column prop="latest_year" label="最新年份" width="100" />
        <el-table-column label="科类" min-width="130"><template #default="scope">{{ scope.row.tracks.join('、') }}</template></el-table-column>
        <el-table-column label="最低分" width="90"><template #default="scope">{{ scope.row.min_score ?? '—' }}</template></el-table-column>
        <el-table-column label="最低位次" width="100"><template #default="scope">{{ scope.row.min_rank ?? '—' }}</template></el-table-column>
        <el-table-column prop="record_count" label="记录数" width="80" />
        <el-table-column label="数据层级" min-width="180"><template #default="scope">{{ scope.row.data_levels.join('、') }}</template></el-table-column>
      </el-table>
      <div v-loading="loading" class="catalog-mobile-list" aria-label="已收录院校列表">
        <article v-for="item in result?.items || []" :key="item.university_code" class="catalog-mobile-card">
          <div class="catalog-mobile-card-heading">
            <strong>{{ item.university_name }}</strong>
            <span>{{ item.school_province || '未标注' }}</span>
          </div>
          <div class="catalog-mobile-card-grid">
            <span><small>最新年份</small>{{ item.latest_year }}</span>
            <span><small>科类</small>{{ item.tracks.join('、') || '—' }}</span>
            <span><small>最低分</small>{{ item.min_score ?? '—' }}</span>
            <span><small>最低位次</small>{{ item.min_rank ?? '—' }}</span>
          </div>
          <p>{{ item.data_levels.join('、') }} · {{ item.record_count }} 条记录</p>
        </article>
      </div>
    </template>
    <div v-if="result" class="catalog-meta">
      <span>共 {{ result.total }} 所已收录院校</span>
      <el-pagination v-model:current-page="page" layout="prev, pager, next" :pager-count="5" :page-size="result.page_size" :total="result.total" background small />
    </div>

    <footer class="catalog-footer-notes">
      <p class="catalog-footer-title">数据范围、生成规则与免责说明</p>
      <p>展示已收录的官方投档/录取记录；截断校名以院校代码显示。</p>
      <p>当前已收录院校所在地：{{ result?.coverage.selected_school_provinces.join('、') || '不限' }}。总表按已收录记录查询，不代表对应省份全部本科院校。</p>
      <p>数据仅供志愿填报参考，不构成录取承诺；政策、计划、专业组和录取结果以当年省教育考试院及招生院校官方发布为准。</p>
    </footer>
  </main>
</template>

<style scoped>
.catalog-content { --el-text-color-primary: var(--text-h); --el-text-color-regular: var(--text-h); --el-text-color-secondary: var(--text); --el-text-color-placeholder: var(--text); --el-bg-color: var(--surface); --el-bg-color-overlay: var(--surface); --el-fill-color-blank: var(--surface); --el-fill-color-light: var(--code-bg); --el-fill-color-lighter: var(--code-bg); --el-border-color: var(--border); --el-border-color-light: var(--border); --el-border-color-lighter: var(--border); flex: 1; min-width: 0; min-height: 0; overflow: auto; padding: 1rem clamp(1rem, 5vw, 5rem) 1.2rem; color: var(--text-h, #08060d); }
.catalog-scope, .catalog-intro, .catalog-filters, .catalog-table, .catalog-meta, .catalog-footer-notes, .catalog-error { width: min(70rem, 100%); margin-right: auto; margin-left: auto; }
.catalog-intro { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .8rem; }
.catalog-intro h2 { margin: .5rem 0 .25rem; font-size: 1.35rem; }
.catalog-intro p { margin: 0; color: var(--text, #6b6375); font-size: .82rem; }
.catalog-actions { display: flex; align-items: center; gap: .25rem; }
.catalog-filters { display: grid; grid-template-columns: .8fr 1.2fr .8fr .9fr 1.4fr auto; gap: .6rem; margin-bottom: .8rem; }
.catalog-filters :deep(.el-select), .catalog-filters :deep(.el-input) { width: 100%; }
.catalog-table { width: 100%; }
.catalog-mobile-list { display: none; }
.catalog-meta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-width: 0; max-width: 100%; overflow: hidden; margin-top: .8rem; color: var(--text, #6b6375); font-size: .75rem; }
.catalog-meta > span { flex: 0 0 auto; }
.catalog-meta :deep(.el-pagination) { min-width: 0; max-width: 100%; flex: 1 1 auto; flex-wrap: nowrap; justify-content: flex-end; overflow: hidden; }
.catalog-meta :deep(.el-pagination .el-pager) { flex-wrap: nowrap; }
.catalog-footer-notes { margin-top: .9rem; color: var(--text, #6b6375); font-size: .7rem; line-height: 1.5; }
.catalog-footer-title { color: var(--text-h, #08060d); font-weight: 600; }
.catalog-footer-notes p { margin: .35rem 0 0; }
@media (max-width: 900px) { .catalog-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) { .catalog-intro { align-items: flex-start; flex-direction: column; } .catalog-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) {
  .catalog-content { padding: .75rem .75rem 1rem; }
  .catalog-intro { margin-bottom: .65rem; }
  .catalog-intro h2 { font-size: 1.15rem; }
  .catalog-actions { width: 100%; justify-content: space-between; }
  .catalog-table-desktop { display: none; }
  .catalog-mobile-list { display: grid; gap: .6rem; }
  .catalog-mobile-card { padding: .8rem; border: 1px solid var(--el-border-color-lighter); border-radius: .7rem; background: var(--el-bg-color, var(--bg, #fff)); box-shadow: 0 .15rem .5rem rgb(15 23 42 / 5%); }
  .catalog-mobile-card-heading { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; }
  .catalog-mobile-card-heading strong { min-width: 0; overflow: hidden; color: var(--el-text-color-primary); font-size: .92rem; text-overflow: ellipsis; white-space: nowrap; }
  .catalog-mobile-card-heading span { flex-shrink: 0; color: var(--el-text-color-secondary); font-size: .72rem; }
  .catalog-mobile-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .45rem .7rem; margin-top: .65rem; }
  .catalog-mobile-card-grid span { display: flex; flex-direction: column; gap: .12rem; color: var(--el-text-color-primary); font-size: .82rem; }
  .catalog-mobile-card-grid small { color: var(--el-text-color-secondary); font-size: .68rem; }
  .catalog-mobile-card p { margin: .6rem 0 0; color: var(--el-text-color-secondary); font-size: .7rem; }
  .catalog-meta { align-items: stretch; flex-direction: column; gap: .55rem; }
  .catalog-meta :deep(.el-pagination) { width: 100%; justify-content: flex-start; flex-wrap: nowrap; padding-bottom: .15rem; }
  .catalog-meta :deep(.el-pagination .el-pager) { flex-wrap: nowrap; }
}
@media (max-width: 520px) { .catalog-filters { grid-template-columns: 1fr; } }
</style>
