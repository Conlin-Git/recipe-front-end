<script setup lang="ts">
import { ref } from 'vue'
import BaseDialog from '../common/BaseDialog.vue'
import { analyzeNaming, scoreNaming, type NamingPayload, type NamingPurpose, type NamingResult } from '../../api/naming'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const mode = ref<'analyze' | 'score'>('analyze')
const loading = ref(false)
const error = ref('')
const result = ref<NamingResult | null>(null)
const form = ref({
  birth_date: '', birth_time: '12:00', calendar_type: 'solar' as 'solar' | 'lunar',
  purpose: 'person_name' as NamingPurpose, surname: '', name: '', style: '', avoid_chars: '',
  given_length: 2, variant_index: 0,
})

function payload(): NamingPayload {
  return {
    ...form.value,
    birth_time: form.value.birth_time || undefined,
    birth_place: undefined,
    lunar_leap_month: false,
    timezone: 'Asia/Shanghai',
    preferred_elements: [],
    generation_char: undefined,
    name: form.value.name || undefined,
  }
}

async function submit() {
  error.value = ''
  result.value = null
  if (!form.value.birth_date) { error.value = '请先填写出生日期'; return }
  if (mode.value === 'score' && !form.value.name) { error.value = '评分模式需要填写待分析姓名'; return }
  loading.value = true
  try {
    result.value = mode.value === 'analyze' ? await analyzeNaming(payload()) : await scoreNaming(payload())
  } catch (err) {
    error.value = err instanceof Error ? err.message : '分析失败，请稍后重试'
  } finally { loading.value = false }
}
</script>

<template>
  <BaseDialog title="命理命名分析" :open="open" @close="emit('close')">
    <div class="naming-tabs">
      <button :class="{ active: mode === 'analyze' }" @click="mode = 'analyze'">生成候选</button>
      <button :class="{ active: mode === 'score' }" @click="mode = 'score'">姓名评分</button>
    </div>
    <p class="hint">支持人名、笔名、网名。报告会保留规则版本、康熙笔画与参考出处。</p>
    <div class="form-grid">
      <label>历法<select v-model="form.calendar_type"><option value="solar">公历</option><option value="lunar">农历（非闰月）</option></select></label>
      <label>出生日期<input v-model="form.birth_date" type="date" /></label>
      <label>出生时间<input v-model="form.birth_time" type="time" /></label>
      <label>用途<select v-model="form.purpose"><option value="person_name">人名</option><option value="pen_name">笔名</option><option value="screen_name">网名</option></select></label>
      <label>姓氏（可空）<input v-model="form.surname" maxlength="10" placeholder="如：林" /></label>
      <label v-if="mode === 'score'">待评分姓名<input v-model="form.name" maxlength="20" placeholder="如：林清" /></label>
      <label>风格偏好<input v-model="form.style" maxlength="100" placeholder="清雅、现代、古典" /></label>
      <label>避用字<input v-model="form.avoid_chars" maxlength="50" placeholder="用连续字符填写" /></label>
      <label>名字字数<input v-model.number="form.given_length" type="number" min="1" max="3" /></label>
      <label>候选变体<input v-model.number="form.variant_index" type="number" min="0" max="99" /></label>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <button class="submit" :disabled="loading" @click="submit">{{ loading ? '分析中…' : '开始分析' }}</button>
    <section v-if="result" class="result">
      <div class="bazi">四柱：{{ result.result.bazi.pillars.join(' ') }} · 低频五行：{{ result.result.bazi.least_elements.join('、') }}</div>
      <pre>{{ result.result.report_markdown }}</pre>
    </section>
  </BaseDialog>
</template>

<style scoped>
.naming-tabs { display: flex; gap: .5rem; margin-bottom: .75rem; }
.naming-tabs button { flex: 1; border: 1px solid var(--border,#e5e4e7); border-radius: .4rem; background: transparent; padding: .45rem; cursor: pointer; }
.naming-tabs button.active { color: var(--accent,#aa3bff); border-color: var(--accent,#aa3bff); background: var(--accent-bg,rgba(170,59,255,.08)); }
.hint { margin: 0 0 .8rem; color: var(--text,#6b6375); font-size: .8rem; line-height: 1.45; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .65rem; }
label { display: flex; flex-direction: column; gap: .25rem; color: var(--text,#6b6375); font-size: .78rem; }
input, select { width: 100%; min-height: 2rem; border: 1px solid var(--border,#e5e4e7); border-radius: .35rem; padding: .35rem .45rem; box-sizing: border-box; background: var(--bg,#fff); color: var(--text-h,#08060d); }
.submit { width: 100%; margin-top: .9rem; border: none; border-radius: .45rem; padding: .55rem; color: #fff; background: var(--accent,#aa3bff); cursor: pointer; }
.submit:disabled { opacity: .55; cursor: wait; }
.error { color: #c0392b; font-size: .82rem; }
.result { margin-top: 1rem; border-top: 1px solid var(--border,#e5e4e7); padding-top: .8rem; }
.bazi { font-size: .82rem; color: var(--text,#6b6375); margin-bottom: .5rem; }
pre { max-height: 18rem; overflow: auto; white-space: pre-wrap; word-break: break-word; margin: 0; font: inherit; font-size: .78rem; line-height: 1.55; color: var(--text-h,#08060d); }
</style>
