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
const schoolProvinces = ref<string[]>(['四川', '广东', '上海'])
const years = ref<number[]>([2026])
const tracks = ref<string[]>([])
const page = ref(1)
const form = ref({
  admission_province: '四川',
  school_provinces: ['四川', '广东', '上海'],
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
    form.value.school_provinces = [...schoolProvinces.value]
    years.value = options.reference_years?.length ? options.reference_years : options.years
    form.value.year = years.value[0] || 2026
    provinceTracks.value = options.province_tracks || {}
    tracks.value = provinceTracks.value[form.value.admission_province] || options.tracks
    form.value.track = tracks.value.includes('物理类') ? '物理类' : (tracks.value[0] || '')
    await load()
  } catch (err) {
    handleError(err, '官方数据选项加载失败，请稍后重试。')
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
      page_size: 30,
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

    <div class="catalog-filters">
      <el-select v-model="form.admission_province" filterable placeholder="招生省份">
        <el-option v-for="province in provinces" :key="province" :label="province" :value="province" />
      </el-select>
      <el-select v-model="form.school_provinces" multiple collapse-tags placeholder="院校所在地">
        <el-option v-for="province in schoolProvinces" :key="province" :label="province" :value="province" />
      </el-select>
      <el-select v-model="form.year" clearable placeholder="年份"><el-option v-for="year in years" :key="year" :label="String(year)" :value="year" /></el-select>
      <el-select v-model="form.track" clearable placeholder="科类"><el-option v-for="track in tracks" :key="track" :label="track" :value="track" /></el-select>
      <el-input v-model="form.keywords" clearable placeholder="院校或专业关键词" @keyup.enter="search" />
      <el-button type="primary" :loading="loading" @click="search">查询</el-button>
    </div>

    <el-empty v-if="loaded && !result?.items.length" description="当前筛选没有已收录院校记录" />
    <el-table v-else v-loading="loading" :data="result?.items || []" border stripe class="catalog-table">
      <el-table-column prop="university_name" label="院校" min-width="210" fixed />
      <el-table-column prop="school_province" label="所在地" width="90" />
      <el-table-column prop="latest_year" label="最新年份" width="100" />
      <el-table-column label="科类" min-width="130"><template #default="scope">{{ scope.row.tracks.join('、') }}</template></el-table-column>
      <el-table-column label="最低分" width="90"><template #default="scope">{{ scope.row.min_score ?? '—' }}</template></el-table-column>
      <el-table-column label="最低位次" width="100"><template #default="scope">{{ scope.row.min_rank ?? '—' }}</template></el-table-column>
      <el-table-column prop="record_count" label="记录数" width="80" />
      <el-table-column label="数据层级" min-width="180"><template #default="scope">{{ scope.row.data_levels.join('、') }}</template></el-table-column>
    </el-table>
    <div v-if="result" class="catalog-meta">
      <span>共 {{ result.total }} 所已收录院校</span>
      <el-pagination v-model:current-page="page" layout="prev, pager, next" :page-size="result.page_size" :total="result.total" background />
    </div>

    <footer class="catalog-footer-notes">
      <details>
        <summary>数据范围、生成规则与免责说明</summary>
        <p>只展示已核验的官方招生记录；没有公开记录的院校不会被补写分数。</p>
        <p>当前已收录院校所在地：{{ result?.coverage.selected_school_provinces.join('、') || '四川、广东、上海' }}。总表基于已核验官方录取数据，不代表对应省份全部本科院校。</p>
        <p>数据仅供志愿填报参考，不构成录取承诺；政策、计划、专业组和录取结果以当年省教育考试院及招生院校官方发布为准。</p>
      </details>
    </footer>
  </main>
</template>

<style scoped>
.catalog-content { flex: 1; min-height: 0; overflow: auto; padding: 1rem clamp(1rem, 5vw, 5rem) 1.2rem; color: var(--text-h, #08060d); }
.catalog-intro, .catalog-filters, .catalog-table, .catalog-meta, .catalog-footer-notes, .catalog-error { width: min(70rem, 100%); margin-right: auto; margin-left: auto; }
.catalog-intro { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .8rem; }
.catalog-intro h2 { margin: .5rem 0 .25rem; font-size: 1.35rem; }
.catalog-intro p { margin: 0; color: var(--text, #6b6375); font-size: .82rem; }
.catalog-actions { display: flex; align-items: center; gap: .25rem; }
.catalog-filters { display: grid; grid-template-columns: .8fr 1.2fr .8fr .9fr 1.4fr auto; gap: .6rem; margin-bottom: .8rem; }
.catalog-filters :deep(.el-select), .catalog-filters :deep(.el-input) { width: 100%; }
.catalog-table { min-width: 840px; }
.catalog-meta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: .8rem; color: var(--text, #6b6375); font-size: .75rem; }
.catalog-footer-notes { margin-top: .9rem; color: var(--text, #6b6375); font-size: .7rem; line-height: 1.5; }
.catalog-footer-notes summary { cursor: pointer; }
.catalog-footer-notes p { margin: .35rem 0 0; }
@media (max-width: 900px) { .catalog-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) { .catalog-intro { align-items: flex-start; flex-direction: column; } .catalog-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 520px) { .catalog-filters { grid-template-columns: 1fr; } .catalog-meta { align-items: flex-start; flex-direction: column; } }
</style>
