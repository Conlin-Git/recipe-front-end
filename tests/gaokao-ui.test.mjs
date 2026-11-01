import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')

async function source(relativePath) {
  return readFile(path.join(sourceRoot, relativePath), 'utf8')
}

test('高考总入口把指南与总表拆成可返回的独立页面', async () => {
  const [chat, guidePage, catalogPage] = await Promise.all([
    source('views/chat/ChatView.vue'),
    source('views/gaokao/GaokaoGuidePage.vue'),
    source('views/gaokao/GaokaoCatalogPage.vue'),
  ])

  assert.match(chat, /'gaokao-guide': markRaw\(GaokaoGuidePage\)/)
  assert.match(chat, /gaokao-catalog/)
  assert.match(guidePage, /aria-label="返回主页面"/)
  assert.match(catalogPage, /aria-label="返回志愿指南"/)
  assert.doesNotMatch(chat, /GaokaoPage/)
})

test('指南按考生本地省份提交并用 toast 提示缺少成绩', async () => {
  const guide = await source('components/gaokao/GaokaoGuide.vue')
  assert.match(guide, /form\.value\.admission_province = province/)
  assert.match(guide, /请填写省内位次或高考分数，优先填写位次。/)
  assert.match(guide, /ElMessage\.warning\(/)
  assert.match(guide, /暂无可按\$\{candidateProvince\}省排位比较的学校结果/)
})

test('指南按学校展示并在展开行查看专业，提示统一位于页底', async () => {
  const guide = await source('components/gaokao/GaokaoGuide.vue')
  const catalog = await source('components/gaokao/GaokaoCatalog.vue')
  assert.match(guide, /school_recommendations/)
  assert.match(guide, /scope\.row\.majors/)
  assert.match(guide, /数据范围、生成规则与免责说明/)
  assert.match(guide, /查询已收录高校表/)
  assert.match(guide, /填写规则：优先填写考生在本地省份的省内位次/)
  assert.doesNotMatch(guide, /查看本科院校总表/)
  assert.doesNotMatch(guide, /<el-alert/)
  assert.doesNotMatch(guide, /<el-tooltip/)
  assert.match(catalog, /数据范围、生成规则与免责说明/)
  assert.match(catalog, /v-model="form\.admission_province"/)
})
