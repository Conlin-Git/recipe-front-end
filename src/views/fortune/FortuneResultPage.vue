<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import ResultPageLayout from '../../components/common/ResultPageLayout.vue'
import FortuneChart from '../../components/fortune/FortuneChart.vue'
import { useFeatureResults } from '../../stores/featureResults'
import { interpretFortune, type FortuneInterpretation } from '../../api/fortune'
import { tablesToParagraphs } from '../../utils/answerPresentation'
const emit = defineEmits<{ navigate: [page: 'home' | 'fortune'] }>()
const reports = useFeatureResults()
const result = computed(() => reports.fortune)
const selectedPalace = ref('命宫')
const notesOpen = ref(false)
const display = ref<'reading' | 'chart' | 'text'>('reading')
const readingBusy = ref(false)
const readingError = ref('')
const readingSelection = ref('full')
const reading = ref<FortuneInterpretation>()
const readingCache = new Map<string, FortuneInterpretation>()
const readingQuestion = computed(() => {
  if (readingSelection.value === 'childhood') return '童限解读'
  const [kind, value] = readingSelection.value.split(':')
  if (kind === 'period') {
    const period = result.value?.details.periods.find(p => p.index === Number(value))
    if (period) return `${period.start_age}岁所属大限的AI智能解读`
  }
  if (kind === 'year') return `${value}岁流年的AI智能解读`
  return '完整AI智能解读'
})
const currentPeriod = computed(() => result.value?.details.periods.find(p => p.start_age <= result.value!.chart.currentAge && p.end_age >= result.value!.chart.currentAge))
const ageRange = computed(() => {
  const years = result.value?.details.years || []
  return years.length ? `${years[0]!.age}–${years[years.length - 1]!.age} 虚岁` : '暂无逐年数据'
})
const readingHtml = computed(() => {
  const root = document.createElement('div')
  root.innerHTML = reading.value?.html || ''
  tablesToParagraphs(root)
  for (const paragraph of root.querySelectorAll('p')) {
    if (!paragraph.textContent?.startsWith('命盘依据：')) continue
    const details = document.createElement('details')
    details.className = 'reading-evidence'
    const summary = document.createElement('summary')
    summary.textContent = '查看对应的命盘依据'
    paragraph.replaceWith(details)
    details.append(summary, paragraph)
  }
  return root.innerHTML
})
let controller: AbortController | null = null
let requestId = 0
function cancelReading() { requestId++; controller?.abort(); controller = null; readingBusy.value = false }
async function loadReading() {
  const chart = result.value
  if (!chart || readingBusy.value) return
  cancelReading()
  const id = requestId
  const selection = readingSelection.value
  controller = new AbortController()
  readingBusy.value = true
  readingError.value = ''
  try {
    const response = await interpretFortune(chart.input, controller.signal, readingQuestion.value)
    if (id !== requestId || result.value !== chart) return
    response.message = response.message.replace(/AI\s*解读/g, 'AI智能解读')
    if (response.status === 'unavailable' && reading.value?.html) {
      readingError.value = response.message
      return
    }
    reading.value = response
    if (response.status === 'ready') readingCache.set(selection, response)
    if (selection === 'full') chart.interpretation = response
  } catch (cause) {
    if (id === requestId) readingError.value = cause instanceof Error ? cause.message : '解读暂时不可用，请稍后重试'
  } finally {
    if (id === requestId) { readingBusy.value = false; controller = null }
  }
}
watch(result, () => {
  cancelReading()
  selectedPalace.value = '命宫'; notesOpen.value = false; display.value = 'reading'
  readingError.value = ''; readingCache.clear()
  readingSelection.value = 'full'
  const saved = result.value?.interpretation
  reading.value = saved?.version === 'reference-v1' && saved.status === 'ready' ? saved : undefined
  if (reading.value) readingCache.set('full', reading.value)
  if (result.value && !reading.value) void loadReading()
}, { immediate: true })
watch(readingSelection, () => {
  cancelReading()
  readingError.value = ''
  reading.value = readingCache.get(readingSelection.value)
  if (!reading.value) void loadReading()
})
onDeactivated(cancelReading)
onActivated(() => { if (result.value && !reading.value && !readingBusy.value) void loadReading() })
onBeforeUnmount(cancelReading)
function selectPalace(name: string) { selectedPalace.value = name }
async function copyReport() {
  if (!result.value) return
  const text = display.value === 'reading' ? reading.value?.markdown : result.value.report?.markdown
  if (!text) return
  const sources = reading.value?.sources.map(s => `${s.title}：${s.url}`).join('\n')
  const content = display.value === 'reading' ? [text, sources, result.value.disclaimer].filter(Boolean).join('\n\n') : text
  try { await navigator.clipboard.writeText(content); ElMessage.success('报告已复制') }
  catch { ElMessage.warning('复制失败，请选择报告文字手动复制') }
}
</script>
<template>
  <el-config-provider :locale="zhCn">
    <ResultPageLayout class="fortune-page" title="紫微命盘" edit-label="修改生辰" @edit="emit('navigate', 'fortune')" @home="emit('navigate', 'home')">
      <div v-if="result" class="fortune-result-body">
            <div class="result-area" aria-label="紫微斗数分析结果">
              <div class="result-heading"><div><p class="section-kicker">本命盘 · 已生成</p><h2 tabindex="-1">你的命盘</h2></div><el-tag v-if="result.timing.corrected" effect="plain" round>真太阳时</el-tag></div>
              <p class="result-date">公历 {{ result.timing.solar_date }} · 农历 {{ result.summary.lunar_date }}</p>
              <p class="result-date secondary-date">排盘 {{ result.timing.chart_date }} · {{ result.timing.clock }} · UTC{{ result.input.utc_offset_minutes >= 0 ? '+' : '' }}{{ result.input.utc_offset_minutes / 60 }}</p>
              <div v-if="display === 'chart'" class="summary-grid"><el-statistic title="命宫" :value="result.summary.ming_branch"/><el-statistic title="身宫" :value="result.summary.shen_branch"/><el-statistic title="五行局" :value="result.summary.wuxing"/></div>
              <div class="report-view-toolbar">
                <el-radio-group v-model="display" aria-label="结果展示方式"><el-radio-button value="reading">AI智能解读</el-radio-button><el-radio-button value="chart">命盘</el-radio-button><el-radio-button value="text">排盘详情</el-radio-button></el-radio-group>
                <el-button v-if="display === 'text' || (display === 'reading' && (reading?.status === 'ready' || reading?.status === 'partial'))" text @click="copyReport"><AppIcon name="copy" :size="16"/>复制</el-button>
              </div>
              <div v-if="display === 'reading'" class="reading-controls">
                <label for="fortune-reading-scope">想了解哪一部分</label>
                <el-select id="fortune-reading-scope" v-model="readingSelection" filterable aria-label="选择AI智能解读范围" popper-class="fortune-popper">
                  <el-option value="full" label="AI智能解读 · 七部分分析与12个大限" />
                  <el-option value="childhood" label="童限 · 进入第一个十年阶段以前" />
                  <el-option-group label="大限 · 每十年的生活主题">
                    <el-option v-for="p in result.details.periods" :key="p.index" :value="`period:${p.index}`" :label="`${p.start_age}–${p.end_age} 虚岁 · ${p.start_year}–${p.end_year}年`" />
                  </el-option-group>
                  <el-option-group label="流年 · 单独看这一年">
                    <el-option v-for="y in result.details.years" :key="y.age" :value="`year:${y.age}`" :label="`${y.year}年 · ${y.age} 虚岁${y.age === result.chart.currentAge ? '（今年）' : ''}`" />
                  </el-option-group>
                </el-select>
                <p>当前 {{ result.chart.currentAge }} 虚岁；{{ currentPeriod ? `正处于 ${currentPeriod.start_age}–${currentPeriod.end_age} 虚岁的十年阶段` : result.chart.currentAge < result.details.periods[0]!.start_age ? '尚未进入第一个十年阶段' : '当前年龄已超出本盘计算范围' }}。虚岁在农历新年增加一岁。</p>
              </div>
              <el-card v-if="display === 'reading'" class="engine-report-card ai-reading-card" shadow="never" :aria-busy="readingBusy">
                <div v-if="readingBusy && !reading?.html" class="reading-loading" role="status"><span class="loading-dot" aria-hidden="true"></span><h3>正在进行AI智能解读…</h3><p>正在逐段解释你选择的内容；完整报告覆盖 12 个十年阶段，共 120 年的排盘范围，不代表寿命；用时会更长。</p><el-skeleton :rows="5" animated /></div>
                <template v-else-if="(reading?.status === 'ready' || reading?.status === 'partial')">
                  <div v-if="reading?.status === 'partial'" class="reading-network-note" role="status">
                    <p>{{ readingError || reading.message }}</p><p>待补齐：{{ reading.missing_sections?.join('、') }}</p>
                    <el-button :loading="readingBusy" @click="loadReading">补齐未完成章节</el-button>
                  </div>
                  <p class="reading-label">AI智能解读 · {{ reading.search_status === 'reference' ? '已读取参考资料' : '未取得参考资料' }}</p>
                  <article class="engine-report plain-reading" aria-label="AI智能解读" v-html="readingHtml"></article>
                  <details v-if="reading.sources.length" class="reading-sources"><summary>参考资料 · {{ reading.sources.length }} 条</summary><ul><li v-for="source in reading.sources" :key="source.url"><a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a></li></ul></details>
                  <p v-if="reading.search_status === 'unavailable'" class="reading-network-note">本次未能读取 参考资料，内容由 AI 根据命盘作文化解释。</p>
                </template>
                <div v-else class="reading-empty" role="status"><h3>命盘已生成</h3><p>{{ readingError || reading?.message || '点击下方按钮，生成这张命盘的AI智能解读。' }}</p><el-button type="primary" @click="loadReading">{{ readingError || reading ? '重新生成AI智能解读' : '生成AI智能解读' }}</el-button><el-button text @click="display = 'chart'">先看命盘</el-button></div>
              </el-card>
              <FortuneChart v-show="display === 'chart'" :result="result" :selected="selectedPalace" @select="selectPalace" />
              <el-card v-if="display === 'text'" class="engine-report-card" shadow="never">
                <div class="report-content-counts"><span>12 宫完整星曜</span><span>{{ result.details.periods.length }} 个大限</span><span>当前 {{ result.chart.currentAge }} 虚岁</span></div>
                <p class="engine-report-source">这里保留原始排盘数据，解读内容请切换“AI智能解读”。计算范围为 {{ ageRange }}，由十二个十年阶段展开，末尾年龄不是当前年龄，也不是寿命预测。</p>
                <article v-if="result.report" class="engine-report" aria-label="引擎完整文字报告" v-html="result.report.html"></article>
                <el-alert v-else title="请返回修改生辰并重新生成，以读取完整文字报告。" type="info" :closable="false" />
              </el-card>
              <el-button text class="notes-toggle" :aria-expanded="notesOpen" aria-controls="fortune-notes" @click="notesOpen = !notesOpen">排盘口径与来源 <AppIcon :name="notesOpen ? 'minus' : 'plus'" :size="14" /></el-button>
              <Transition name="fortune-reveal"><div v-if="notesOpen" id="fortune-notes" class="result-notes"><ul><li v-for="note in result.conventions" :key="note">{{ note }}</li></ul><p>排盘基于 <el-link :href="result.source.url" target="_blank" rel="noopener noreferrer" :underline="false">{{ result.source.name }}</el-link>，文字报告按引擎结果编排。</p></div></Transition>
            </div>
        <p class="fortune-disclaimer">仅供娱乐与传统文化交流，不作为人生、健康、财富或关系决策依据。</p>
      </div>
      <el-empty v-else description="请先填写出生信息，生成你的命盘"><el-button type="primary" @click="emit('navigate', 'fortune')">填写出生信息</el-button></el-empty>
    </ResultPageLayout>
  </el-config-provider>
</template>
<style src="./fortune.css"></style>
