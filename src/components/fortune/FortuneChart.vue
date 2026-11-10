<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FortuneResult } from '../../api/fortune'
const props = defineProps<{ result: FortuneResult; selected: string }>()
const emit = defineEmits<{ select: [palace: string] }>()
const view = ref<'mingpan' | 'daxian' | 'liunian'>('mingpan')
const age = ref(1)
const periodIndex = ref(-1)
const starName = ref('')
const detailsOpen = ref(false)
const patternsOpen = ref(false)
const floatingOptions = { strategy: 'fixed' as const }
const branches = '子丑寅卯辰巳午未申酉戌亥'
const positions: Record<number, string> = { 5: '1 / 1', 6: '1 / 2', 7: '1 / 3', 8: '1 / 4', 4: '2 / 1', 9: '2 / 4', 3: '3 / 1', 10: '3 / 4', 2: '4 / 1', 1: '4 / 2', 0: '4 / 3', 11: '4 / 4' }
const currentYear = computed(() => props.result.details.years.find(y => y.age === age.value) || props.result.details.years[0]!)
const period = computed(() => props.result.details.periods.find(p => p.index === periodIndex.value))
const yearsInPeriod = computed(() => props.result.details.years.filter(y => y.period_index === periodIndex.value))
const activePalace = computed(() => props.result.chart.palaces.find(p => p.name === props.selected) || props.result.chart.palaces[0]!)
const palaceDetails = computed(() => props.result.details.palace_details.find(p => p.branch === activePalace.value.branch))
const activeStar = computed(() => activePalace.value.stars.find(s => s.name === starName.value) || activePalace.value.stars[0])
const related = computed(() => [4, 6, 8].map(n => (activePalace.value.branch + n) % 12))
const relatedNames = computed(() => props.result.chart.palaces.filter(p => related.value.includes(p.branch)).map(p => p.name))
const overlay = computed(() => view.value === 'mingpan' ? [] : view.value === 'daxian' ? (period.value?.sihua || currentYear.value.period_sihua) : currentYear.value.sihua)
const marks = computed(() => view.value === 'mingpan' ? props.result.sihua : overlay.value)
const overlayLabel = computed(() => view.value === 'daxian' ? '限' : view.value === 'liunian' ? '年' : '')
const viewTitle = computed(() => view.value === 'mingpan' ? '本命盘' : view.value === 'daxian' ? (period.value ? `${period.value.start_age}–${period.value.end_age} 虚岁 · 大限` : `1–${props.result.details.periods[0]!.start_age - 1} 虚岁 · 童限`) : `${currentYear.value.year} ${currentYear.value.ganzhi}年 · ${age.value} 虚岁`)
const periodBranch = computed(() => period.value?.palace_branch ?? currentYear.value.period_branch)
const typeNames: Record<string, string> = { major: '主星', minor: '辅曜', lucky: '吉曜', sha: '煞曜' }
watch(() => props.result, result => {
  age.value = Math.max(1, Math.min(result.chart.currentAge, result.details.years.length))
  periodIndex.value = result.details.years.find(y => y.age === age.value)?.period_index ?? -1
  view.value = 'mingpan'; starName.value = ''; detailsOpen.value = false; patternsOpen.value = false
}, { immediate: true })
watch(age, () => { periodIndex.value = currentYear.value.period_index })
watch(() => props.selected, () => { starName.value = '' })
function selectPeriod(value: number) {
  if (currentYear.value.period_index !== value) age.value = props.result.details.years.find(y => y.period_index === value)?.age ?? 1
}
function selectPalace(name: string) { detailsOpen.value = true; emit('select', name) }
function starOverlay(name: string) { return overlay.value.find(mark => mark.star === name)?.type }
</script>

<template>
  <el-card class="chart-card" shadow="never">
    <div class="section-heading"><div><span class="section-kicker">命盘全览</span><h3>本命与运限</h3></div><el-tag effect="plain" round>仅供娱乐</el-tag></div>
    <div class="chart-toolbar">
      <el-radio-group v-model="view" class="chart-view-tabs" aria-label="命盘视图"><el-radio-button value="mingpan">本命</el-radio-button><el-radio-button value="daxian">大限</el-radio-button><el-radio-button value="liunian">流年</el-radio-button></el-radio-group>
      <span v-if="view === 'mingpan'" class="chart-view-help">点选宫位，查看完整星曜与三方四正</span>
      <div v-else class="cycle-selectors">
        <el-select v-model="periodIndex" aria-label="选择大限" popper-class="fortune-popper" :popper-options="floatingOptions" @change="selectPeriod">
          <el-option :value="-1" :label="`1–${result.details.periods[0]!.start_age - 1} 岁 · 童限`" />
          <el-option v-for="p in result.details.periods" :key="p.index" :value="p.index" :label="`${p.start_age}–${p.end_age} 岁 · ${p.palace_name}`" />
        </el-select>
        <el-select v-if="view === 'liunian'" v-model="age" filterable aria-label="选择年龄或流年" placeholder="搜索年龄或年份" popper-class="fortune-popper" :popper-options="floatingOptions">
          <el-option v-for="year in result.details.years" :key="year.age" :value="year.age" :label="`${year.age} 岁 · ${year.year} ${year.ganzhi}年`" />
        </el-select>
      </div>
    </div>
    <div v-if="view !== 'mingpan'" class="cycle-context" aria-live="polite">
      <strong>{{ viewTitle }}</strong>
      <p v-if="view === 'liunian'">流年命宫落在本命{{ currentYear.palace_name }}（{{ branches[currentYear.palace_branch] }}），{{ period ? `所属大限 ${period.start_age}–${period.end_age} 虚岁 · ${period.palace_name}` : '处于起大限前的童限' }}。</p>
      <p v-else>{{ period ? `${period.start_year}–${period.end_year} 农历流年 · 大限命宫落在本命${period.palace_name}` : `${age} 虚岁童限，按上游童限规则定位宫位` }}。四化叠加在本命盘上展示。</p>
      <div class="year-chips" aria-label="逐年查看"><el-button v-for="year in yearsInPeriod" :key="year.year" :class="{ 'is-current-year': year.age === age && view === 'liunian' }" :aria-pressed="year.age === age && view === 'liunian'" @click="age = year.age; view = 'liunian'"><span>{{ year.age }} 岁<small>{{ year.year }}</small></span></el-button></div>
      <p class="cycle-note">年龄统一使用虚岁，农历正月初一换年；每一岁均可单独查看。展示排盘规则，不代表实际事件预测。</p>
    </div>
    <div class="palace-grid" aria-label="完整十二宫命盘">
      <div class="chart-center">
        <AppIcon name="compass" :size="38" />
        <span class="center-title">紫微斗数</span><span class="center-caption">{{ viewTitle }}</span>
        <span class="center-masters">{{ result.chart.yinYangGender }} · {{ result.summary.wuxing }}<br/>命主 {{ result.summary.ming_zhu }} · 身主 {{ result.summary.shen_zhu }}</span>
        <div class="chart-pillars"><span>四柱 · 节气</span><strong>{{ result.chart.lunarInfo.fourPillars?.join('　') || '—' }}</strong><span>四柱 · 农历</span><strong>{{ result.chart.lunarInfo.fourPillarsLunar?.join('　') || '—' }}</strong></div>
      </div>
      <el-button v-for="(palace, index) in result.chart.palaces" :key="palace.name" class="palace-card" :class="{ selected: selected === palace.name, related: related.includes(palace.branch) }" :data-palace="palace.name" :style="{ gridArea: positions[palace.branch], '--enter-delay': `${Math.min(index, 7) * 24}ms` }" :aria-pressed="selected === palace.name" @click="selectPalace(palace.name)">
        <span class="palace-title"><strong>{{ palace.name }}</strong><span>{{ result.details.palace_details.find(p => p.branch === palace.branch)?.stem_branch }}</span></span>
        <span class="chart-star-list"><span v-for="star in palace.stars" :key="star.name" class="chart-star" :class="{ 'is-major': star.type === 'major' }"><strong>{{ star.name }}</strong><small v-if="star.brightnessRaw">{{ star.brightnessRaw }}</small><em v-if="star.siHua">{{ star.siHua }}</em><em v-if="starOverlay(star.name)" class="overlay-mark">{{ overlayLabel }}{{ starOverlay(star.name) }}</em></span></span>
        <span v-if="!palace.stars.some(s => s.type === 'major')" class="borrowed-hint">无主星 · 借{{ palace.borrowedFromName }} {{ palace.borrowedStars?.join('、') }}</span>
        <span class="palace-marks"><el-tag v-if="palace.isMingGong" size="small" effect="plain">命宫</el-tag><el-tag v-if="palace.isShenGong" size="small" effect="plain">身宫</el-tag><span v-if="palace.daXianAge">{{ palace.daXianAge[0] }}–{{ palace.daXianAge[1] }} 岁</span></span>
        <span v-if="view !== 'mingpan' && palace.branch === periodBranch" class="cycle-palace-mark">{{ period ? '大限命宫' : '童限命宫' }}</span>
        <span v-if="view === 'liunian' && palace.branch === currentYear.palace_branch" class="cycle-palace-mark">流年命宫</span>
      </el-button>
    </div>
    <p class="chart-legend">底色标出所选宫位，淡紫边框标出三方四正。禄 / 权 / 科 / 忌为生年四化；带“限 / 年”的标记为运限叠加。</p>
    <div class="sihua-row" :aria-label="`${view === 'mingpan' ? '生年' : view === 'daxian' ? '大限' : '流年'}四化`"><div v-for="mark in marks" :key="mark.type"><span class="sihua-symbol">{{ mark.type }}</span><span><strong>{{ mark.star }}</strong><small>{{ mark.palace }} · 化{{ mark.type }}</small></span></div></div>
    <el-button text class="chart-details-toggle" :aria-expanded="detailsOpen" @click="detailsOpen = !detailsOpen"><AppIcon :name="detailsOpen ? 'minus' : 'plus'" :size="16"/>{{ selected }} · 星曜详情</el-button>
    <div v-if="detailsOpen" class="palace-detail-panel">
      <h4>{{ selected }} · {{ palaceDetails?.stem_branch }}</h4><p>三方四正：{{ [selected, ...relatedNames].join('、') }}</p>
      <p v-if="activePalace.borrowedStars?.length">空宫借对宫：{{ activePalace.borrowedFromName }} · {{ activePalace.borrowedStars.join('、') }}</p>
      <div class="detail-star-tabs"><el-button v-for="star in activePalace.stars" :key="star.name" :type="activeStar?.name === star.name ? 'primary' : 'default'" plain size="small" @click="starName = star.name">{{ star.name }}</el-button></div>
      <div v-if="activeStar" class="star-detail" aria-live="polite"><strong>{{ activeStar.name }}</strong><span>{{ typeNames[activeStar.type] || activeStar.type }} · 亮度 {{ activeStar.brightnessRaw || '未标注' }}</span><span v-if="activeStar.siHua">生年化{{ activeStar.siHua }}</span><span v-if="starOverlay(activeStar.name)">{{ overlayLabel }}化{{ starOverlay(activeStar.name) }}</span></div>
      <p>宫干自化：{{ palaceDetails?.self_sihua.map(m => `${m.starName}自化${m.siHua}`).join('、') || '无' }}</p>
      <p v-for="mark in palaceDetails?.incoming" :key="mark.star">{{ mark.star }}化{{ mark.type }}的宫干来源：{{ mark.from.join('、') || '无' }}</p>
      <p>十二神：{{ palaceDetails?.spirits.join(' · ') }}</p>
    </div>
    <el-button text class="chart-details-toggle" :aria-expanded="patternsOpen" @click="patternsOpen = !patternsOpen"><AppIcon :name="patternsOpen ? 'minus' : 'plus'" :size="16"/>格局识别 · {{ result.details.patterns.length }} 项</el-button>
    <div v-if="patternsOpen" class="pattern-list">
      <p v-if="!result.details.patterns.length">本盘未匹配到开源规则中的特定格局。</p>
      <article v-for="pattern in result.details.patterns" :key="pattern.name"><h4>{{ pattern.name }}<el-tag size="small" effect="plain">{{ pattern.palaces.join(' · ') }}</el-tag></h4><p>{{ pattern.description }}</p><p v-if="pattern.conditions?.required.length">成立条件：{{ pattern.conditions.required.join('；') }}</p><p v-if="pattern.conditions?.bonus?.length">附加条件：{{ pattern.conditions.bonus.join('；') }}</p><p v-if="pattern.conditions?.breaking?.length">破格条件：{{ pattern.conditions.breaking.join('；') }}</p><small v-if="pattern.source">出处：{{ pattern.source }}</small></article>
      <p class="cycle-note">格局与术语来自开源传统规则，仅供文化研究，不作为现实吉凶判断。</p>
    </div>
  </el-card>
</template>
