<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseDialog from './BaseDialog.vue'
import FilingLinks from './FilingLinks.vue'
import { getServiceInfo, type ModelSource } from '../../api/serviceInfo'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const models = ref<ModelSource[]>([])
const loading = ref(false)
const failed = ref(false)

async function loadSources() {
  if (loading.value) return
  loading.value = true
  failed.value = false
  try {
    models.value = (await getServiceInfo()).models
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (open) => {
  if (open) loadSources()
}, { immediate: true })
</script>

<template>
  <BaseDialog :open="open" title="关于与模型来源" @close="emit('close')">
    <div class="about-content">
      <p class="about-intro">阿福是个人开发的问答应用，通过第三方大模型 API 提供 AI 生成的文字回答，并结合知识库检索辅助作答。</p>
      <section aria-labelledby="model-source-title">
        <h3 id="model-source-title">当前模型来源</h3>
        <p v-if="loading" class="source-status" role="status">正在读取模型来源…</p>
        <div v-else-if="failed" class="source-status" role="status">
          模型来源信息暂时无法加载。
          <button class="retry-link" type="button" @click="loadSources">重新加载</button>
        </div>
        <dl v-else class="model-sources">
          <div v-for="source in models" :key="source.purpose" class="model-source">
            <dt>{{ source.purpose }}</dt>
            <dd><strong>{{ source.provider }}</strong><span>{{ source.model || '未配置模型名称' }}</span></dd>
          </div>
        </dl>
      </section>
      <p class="about-note">回答由 AI 生成，可能存在错误，请核实重要信息。涉及健康、法律、财务及升学等重要决策，请以专业机构和官方信息为准。</p>
      <div class="about-footer">
        <span>开发者 Conlin</span>
        <FilingLinks align="start" />
      </div>
    </div>
  </BaseDialog>
</template>

<style scoped>
.about-content { display: flex; flex-direction: column; gap: 1.25rem; color: var(--text-h); font-size: .875rem; line-height: 1.7; }
.about-intro, .about-note { margin: 0; }
h3 { margin: 0 0 .75rem; font-size: .875rem; font-weight: 600; }
.model-sources { margin: 0; }
.model-source { padding: .65rem 0; border-top: 1px solid var(--border); }
.model-source dt { margin-bottom: .2rem; color: var(--text); font-size: .75rem; }
.model-source dd { display: flex; flex-direction: column; margin: 0; overflow-wrap: anywhere; }
.model-source strong { font-weight: 500; }
.model-source dd span { color: var(--text); font-family: var(--mono); font-size: .75rem; }
.about-note { padding: .75rem; border-radius: .5rem; background: var(--code-bg); color: var(--text); font-size: .75rem; }
.source-status { margin: 0; color: var(--text); }
.retry-link { border: 0; padding: .2rem; color: var(--accent); background: transparent; font: inherit; cursor: pointer; text-decoration: underline; }
.about-footer { display: flex; flex-wrap: wrap; gap: .4rem 1rem; color: var(--text); font-size: .75rem; }
</style>
