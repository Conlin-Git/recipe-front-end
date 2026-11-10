<script setup lang="ts">
import { onBeforeUnmount, onDeactivated, ref, watch } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { analyzeNaming, scoreNaming, type NamingPayload, type NamingPurpose } from '../../api/naming'
import { useFeatureResults } from '../../stores/featureResults'

const emit = defineEmits<{ complete: [] }>()
const reports = useFeatureResults()
const mode = ref<'analyze' | 'score'>('analyze')
const loading = ref(false)
const error = ref('')
const form = ref({
  birth_date: '', birth_time: '12:00', calendar_type: 'solar' as 'solar' | 'lunar',
  purpose: 'person_name' as NamingPurpose, surname: '', name: '', style: '', avoid_chars: '',
  given_length: 2, variant_index: 0,
})
const floatingOptions = { strategy: 'fixed' as const }
let requestId = 0
let controller: AbortController | null = null
function cancelPending() { requestId++; controller?.abort(); controller = null; loading.value = false }
onDeactivated(cancelPending)
onBeforeUnmount(cancelPending)
watch([form, mode], () => { cancelPending(); reports.naming = null; error.value = '' }, { deep: true })
watch(() => form.value.calendar_type, () => { form.value.birth_date = '' })

function payload(): NamingPayload {
  return { ...form.value, birth_time: form.value.birth_time || undefined, birth_place: undefined,
    lunar_leap_month: false, timezone: 'Asia/Shanghai', preferred_elements: [], generation_char: undefined, name: form.value.name || undefined }
}
async function submit() {
  if (loading.value) return
  error.value = ''
  if (!form.value.birth_date) { error.value = '请先填写出生日期'; return }
  if (mode.value === 'score' && !form.value.name.trim()) { error.value = '评分模式需要填写待分析姓名'; return }
  const id = ++requestId
  controller = new AbortController()
  loading.value = true
  try {
    const data = mode.value === 'analyze' ? await analyzeNaming(payload(), controller.signal) : await scoreNaming(payload(), controller.signal)
    if (id !== requestId) return
    reports.naming = data
    emit('complete')
  } catch (err) {
    if (id === requestId) error.value = err instanceof Error ? err.message : '分析失败，请稍后重试'
  } finally { if (id === requestId) loading.value = false }
}
</script>
<template>
  <el-config-provider :locale="zhCn">
    <el-card class="naming-form" shadow="never">
      <el-radio-group v-model="mode" class="naming-tabs" aria-label="命名方式"><el-radio-button value="analyze">生成候选</el-radio-button><el-radio-button value="score">姓名评分</el-radio-button></el-radio-group>
      <p class="hint">支持人名、笔名、网名。报告保留规则版本、康熙笔画与参考出处。</p>
      <el-form label-position="top" @submit.prevent="submit">
        <div class="form-grid">
          <el-form-item label="历法"><el-select v-model="form.calendar_type" aria-label="历法" popper-class="app-popper" :popper-options="floatingOptions"><el-option value="solar" label="公历"/><el-option value="lunar" label="农历（非闰月）"/></el-select></el-form-item>
          <el-form-item label="出生日期"><el-date-picker v-if="form.calendar_type === 'solar'" v-model="form.birth_date" type="date" value-format="YYYY-MM-DD" format="YYYY-MM-DD" placeholder="请选择出生日期" popper-class="app-popper" :popper-options="floatingOptions"/><el-input v-else v-model="form.birth_date" placeholder="农历 YYYY-MM-DD" maxlength="10"/></el-form-item>
          <el-form-item label="出生时间"><el-time-picker v-model="form.birth_time" format="HH:mm" value-format="HH:mm" popper-class="app-popper" :popper-options="floatingOptions"/></el-form-item>
          <el-form-item label="用途"><el-select v-model="form.purpose" aria-label="用途" popper-class="app-popper" :popper-options="floatingOptions"><el-option value="person_name" label="人名"/><el-option value="pen_name" label="笔名"/><el-option value="screen_name" label="网名"/></el-select></el-form-item>
          <el-form-item label="姓氏 · 选填"><el-input v-model="form.surname" maxlength="10" placeholder="如：林"/></el-form-item>
          <el-form-item v-if="mode === 'score'" label="待评分姓名"><el-input v-model="form.name" maxlength="20" placeholder="如：林清"/></el-form-item>
          <el-form-item label="风格偏好"><el-input v-model="form.style" maxlength="100" placeholder="清雅、现代、古典"/></el-form-item>
          <el-form-item label="避用字"><el-input v-model="form.avoid_chars" maxlength="50" placeholder="用连续字符填写"/></el-form-item>
          <el-form-item label="名字字数"><el-input-number v-model="form.given_length" :min="1" :max="3" :precision="0" :value-on-clear="2" controls-position="right"/></el-form-item>
          <el-form-item label="候选变体"><el-input-number v-model="form.variant_index" :min="0" :max="99" :precision="0" :value-on-clear="0" controls-position="right"/></el-form-item>
        </div>
        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
        <el-button class="submit" type="primary" native-type="submit" :disabled="loading"><AppIcon name="naming" :size="18"/><span>{{ loading ? '分析中…' : '生成命名报告' }}</span></el-button>
      </el-form>
    </el-card>
  </el-config-provider>
</template>
<style scoped>
.naming-form { --el-text-color-primary: var(--text-h); --el-text-color-regular: var(--text-h); --el-fill-color-blank: var(--surface); --el-border-color: var(--border); border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface); box-shadow: var(--surface-shadow); }
.naming-form :deep(.el-card__body) { padding: 28px; }
.naming-tabs { display: flex; margin-bottom: 18px; }.naming-tabs :deep(.el-radio-button) { flex: 1; }.naming-tabs :deep(.el-radio-button__inner) { width: 100%; padding: 13px; }
.hint { margin: 0 0 24px; color: var(--text); font-size: 12px; line-height: 1.8; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
:deep(.el-form-item) { min-width: 0; margin-bottom: 22px; }:deep(.el-form-item__label) { color: var(--text); font-size: 12px; }
:deep(.el-input), :deep(.el-select), :deep(.el-input-number), :deep(.el-date-editor.el-input) { width: 100%; min-width: 0; }
:deep(.el-input__wrapper), :deep(.el-select__wrapper) { min-height: 42px; border-radius: 9px; }
.submit { width: 100%; min-height: 44px; margin-top: 14px; border-radius: 10px; background: #2862d9; border: 0; }.submit :deep(> span) { gap: 8px; }
.naming-form :deep(*) { transition-property: transform, opacity !important; }
@media (max-width: 560px) { .naming-form :deep(.el-card__body) { padding: 20px; } .form-grid { grid-template-columns: 1fr; } }
</style>
