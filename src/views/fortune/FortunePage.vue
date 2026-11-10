<script setup lang="ts">
import { nextTick, onDeactivated, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { useFeatureResults } from '../../stores/featureResults'
import { analyzeFortune, type FortunePayload } from '../../api/fortune'
import { useAuthStore } from '../../stores/auth'

const emit = defineEmits<{ navigate: [page: 'home' | 'assistant' | 'fortune-result'] }>()
const auth = useAuthStore()
const defaults = () => ({ calendar: 'solar' as 'solar' | 'lunar', birthDate: '', time: '', gender: '' as '' | 'male' | 'female', leap: false, utcHours: 8 as number | undefined, longitude: undefined as number | undefined, lateZishi: 'next-day' as 'next-day' | 'current-day' })
const form = reactive(defaults())
const formRef = ref<FormInstance>()
const reports = useFeatureResults()
const busy = ref(false)
const error = ref('')
const moreOpen = ref(false)
const lunarDate = () => form.calendar === 'lunar'
const floatingOptions = { strategy: 'fixed' as const }
const defaultPickerDate = new Date(1990, 0, 1)
let controller: AbortController | null = null
let requestId = 0
let revision = 0
let validating = false

function disabledDate(date: Date) {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date.getFullYear() < 1900 || date > today
}

const rules: FormRules = {
  birthDate: [{ validator: (_rule, value, callback) => {
    if (!value) return callback(new Error('请选择出生日期'))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return callback(new Error('请按 YYYY-MM-DD 输入完整日期'))
    const [year, month, day] = String(value).split('-').map(Number) as [number, number, number]
    if (year < 1900 || year > 2050 || month < 1 || month > 12 || day < 1 || day > (lunarDate() ? 30 : 31)) return callback(new Error('请核对出生年月日'))
    if (!lunarDate()) {
      const date = new Date(year, month - 1, day)
      if (date.getMonth() !== month - 1 || date.getDate() !== day || disabledDate(date)) return callback(new Error('日期不存在或晚于今天'))
    }
    callback()
  }, trigger: ['blur', 'change'] }],
  time: [{ validator: (_rule, value, callback) => callback(value && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? undefined : new Error('请选择准确的出生时间')), trigger: ['blur', 'change'] }],
  gender: [{ required: true, message: '请选择排盘性别', trigger: 'change' }],
  utcHours: [{ validator: (_rule, value, callback) => callback(typeof value === 'number' && Number.isFinite(value) && value >= -12 && value <= 14 && Number.isInteger(value * 4) ? undefined : new Error('时区需在 -12 至 14 之间，以 0.25 为间隔')), trigger: ['blur', 'change'] }],
  longitude: [{ validator: (_rule, value, callback) => callback(value == null || (Number.isFinite(value) && value >= -180 && value <= 180) ? undefined : new Error('经度需在 -180 至 180 之间')), trigger: ['blur', 'change'] }],
}

function cancelPending() {
  requestId++
  controller?.abort()
  controller = null
  busy.value = false
}

watch(form, () => {
  revision++
  cancelPending()
  reports.fortune = null
  error.value = ''
})
watch(() => form.calendar, async () => {
  form.birthDate = ''
  form.leap = false
  await nextTick()
  formRef.value?.clearValidate('birthDate')
})
watch(() => [auth.token, auth.user?.id] as const, ([token, user], [previousToken, previousUser]) => {
  if ((previousToken && token !== previousToken) || (previousUser !== undefined && user !== previousUser)) {
    cancelPending()
    Object.assign(form, defaults())
    reports.fortune = null
    formRef.value?.clearValidate()
  }
})
onDeactivated(cancelPending)
onBeforeUnmount(cancelPending)

async function generate() {
  if (busy.value || validating || !formRef.value) return
  error.value = ''
  const beforeValidation = revision
  const beforeRequestId = requestId
  validating = true
  const valid = await formRef.value.validate().catch(() => false)
  validating = false
  if (!valid || beforeValidation !== revision || beforeRequestId !== requestId) {
    if (!valid) {
      if (form.utcHours == null) moreOpen.value = true
      await nextTick()
      document.querySelector<HTMLInputElement>('.fortune-page .is-error input')?.focus()
    }
    return
  }
  if (!form.birthDate || !form.time || !form.gender || form.utcHours == null) return
  const payload: FortunePayload = {
    calendar_type: form.calendar, birth_date: form.birthDate, birth_time: form.time,
    gender: form.gender, lunar_leap_month: lunarDate() && form.leap,
    utc_offset_minutes: Math.round(form.utcHours * 60),
    longitude: form.longitude ?? null, late_zishi: form.lateZishi,
  }
  const id = ++requestId
  controller = new AbortController()
  busy.value = true
  try {
    const data = await analyzeFortune(payload, controller.signal)
    if (id !== requestId) return
    reports.fortune = data
    emit('navigate', 'fortune-result')
  } catch (cause) {
    if (id === requestId) error.value = cause instanceof Error ? cause.message : '生成失败，请稍后重试'
  } finally {
    if (id === requestId) { busy.value = false; controller = null }
  }
}
</script>

<template>
  <el-config-provider :locale="zhCn">
    <div class="fortune-page">
      <header class="fortune-header">
        <el-button text class="back-button" aria-label="返回全部功能" @click="emit('navigate', 'home')"><AppIcon name="features" :size="16" /><span>全部功能</span></el-button>
        <span class="header-name">紫微斗数</span><el-tag effect="plain" round class="entertainment-tag">仅供娱乐</el-tag>
      </header>
      <main class="fortune-body">
        <div class="fortune-intro"><div class="intro-symbol" aria-hidden="true"><AppIcon name="compass" :size="30" /></div><div><p class="eyebrow">传统文化 · 新的视角</p><h1>紫微斗数</h1><p class="intro-description">以出生时刻为起点，查看本命盘、大限与逐年流年。</p></div></div>
        <div class="fortune-form-layout">
          <el-card class="birth-card" shadow="never">
            <div class="section-heading"><div><span class="section-kicker">从这里开始</span><h2>出生信息</h2></div><AppIcon class="quiet-symbol" name="calendar" :size="22" /></div>
            <el-form ref="formRef" :model="form" :rules="rules" label-position="top" hide-required-asterisk :aria-busy="busy" @submit.prevent="generate">
              <el-form-item label="历法">
                <div class="calendar-switch" :class="{ 'is-lunar': lunarDate() }"><span class="calendar-indicator" aria-hidden="true"></span><el-radio-group v-model="form.calendar" aria-label="历法"><el-radio-button value="solar">公历</el-radio-button><el-radio-button value="lunar">农历</el-radio-button></el-radio-group></div>
              </el-form-item>
              <el-form-item :label="lunarDate() ? '出生日期 · 农历' : '出生日期 · 公历'" prop="birthDate">
                <el-date-picker v-if="!lunarDate()" id="birth-date" v-model="form.birthDate" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" placeholder="请选择出生日期" :default-value="defaultPickerDate" :disabled-date="disabledDate" :teleported="true" popper-class="fortune-popper" :popper-options="floatingOptions" placement="bottom-start" />
                <el-input v-else id="birth-date" v-model="form.birthDate" placeholder="如 1990-04-23" maxlength="10" inputmode="numeric" clearable aria-describedby="lunar-help" />
              </el-form-item>
              <div v-if="lunarDate()" class="lunar-extra"><el-checkbox v-model="form.leap">出生于农历闰月</el-checkbox><p id="lunar-help" class="field-help">按农历年、月、日输入；不是闰月时无需勾选。</p></div>
              <div class="form-row">
                <el-form-item label="出生时间" prop="time"><el-time-picker id="birth-time" v-model="form.time" format="HH:mm" value-format="HH:mm" placeholder="时 : 分" arrow-control popper-class="fortune-popper" :popper-options="floatingOptions" placement="bottom-start" /></el-form-item>
                <el-form-item label="排盘性别" prop="gender"><el-select id="birth-gender" v-model="form.gender" placeholder="请选择" popper-class="fortune-popper" :popper-options="floatingOptions" placement="bottom-start"><el-option label="男" value="male"/><el-option label="女" value="female"/></el-select></el-form-item>
              </div>
              <p class="field-help time-help">默认北京时间 UTC+8。出生时间不确定时，请先核对。</p>
              <el-button text class="advanced-toggle" :aria-expanded="moreOpen" aria-controls="fortune-options" @click="moreOpen = !moreOpen"><span>更多排盘口径</span><AppIcon :name="moreOpen ? 'minus' : 'plus'" :size="16" /></el-button>
              <Transition name="fortune-reveal">
                <div v-show="moreOpen" id="fortune-options" class="advanced-fields">
                  <el-form-item label="标准时区 · UTC 小时偏移" prop="utcHours"><el-input-number id="birth-zone" v-model="form.utcHours" :min="-12" :max="14" :step="0.25" :precision="2" controls-position="right" align="left" aria-label="标准时区" /></el-form-item>
                  <p class="field-help">东八区填 8，纽约标准时区填 -5；夏令时记录需先换算为标准时间。</p>
                  <el-form-item label="出生地经度 · 选填" prop="longitude"><el-input-number id="birth-longitude" v-model="form.longitude" :min="-180" :max="180" :precision="4" :step="0.0001" :controls="false" :value-on-clear="null" align="left" placeholder="如 116.4074，西经填负数" aria-label="出生地经度" /></el-form-item>
                  <p class="field-help">填写经度后启用真太阳时；留空按标准时间排盘。</p>
                  <el-form-item label="晚子时 · 23:00–23:59"><el-select id="late-zishi" v-model="form.lateZishi" popper-class="fortune-popper" :popper-options="floatingOptions" placement="bottom-start"><el-option label="按次日排盘" value="next-day"/><el-option label="按当日排盘" value="current-day"/></el-select></el-form-item>
                  <p class="field-help">农历正月初一换年；闰月前十五日归本月，后半月归下月。</p>
                </div>
              </Transition>
              <el-alert v-if="error" class="fortune-error" :title="error" type="error" :closable="false" show-icon />
              <el-button class="generate-button" type="primary" native-type="submit" :disabled="busy" aria-live="polite"><span v-if="busy" class="loading-dot" aria-hidden="true"></span>{{ busy ? '正在生成命盘…' : '生成命盘与分析' }}<AppIcon v-if="!busy" name="compass" :size="18" /></el-button>
            </el-form>
            <div class="form-footer"><AppIcon name="chat" :size="18" /><p>想边聊边了解？<el-button link @click="emit('navigate', 'assistant')">问问阿福</el-button></p></div>
          </el-card>


        </div>
        <p class="fortune-disclaimer">仅供娱乐与传统文化交流，不作为人生、健康、财富或关系决策依据。</p>
      </main>
    </div>
  </el-config-provider>
</template>

<style src="./fortune.css"></style>
