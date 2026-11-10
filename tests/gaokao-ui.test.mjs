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
  assert.match(guide, /admission_province: form\.value\.candidate_province/)
  assert.match(guide, /请填写省内位次。/)
  assert.match(guide, /请填写高考分数。/)
  assert.match(guide, /ElMessage\.warning\(/)
})

test('指南首屏只保留省份、科类、成绩、地区四项，其余收进“更多条件”', async () => {
  const guide = await source('components/gaokao/GaokaoGuide.vue')
  assert.match(guide, /更多条件/)
  assert.match(guide, /v-show="showMore"/)
  // 旧版的选科（后端并不使用）、排序、考生年份输入已移除，避免无效选项。
  assert.doesNotMatch(guide, /选科组合/)
  assert.doesNotMatch(guide, /结果排序/)
  assert.doesNotMatch(guide, /考生年份/)
  assert.doesNotMatch(guide, /result\.agent_plan/)
})

test('独立结果页保留冲稳保、默认稳档、分批展示与专业展开', async () => {
  const [guide, result, css, api] = await Promise.all([
    source('components/gaokao/GaokaoGuide.vue'), source('components/gaokao/GaokaoResults.vue'),
    source('components/gaokao/guide.css'), source('api/gaokao.ts'),
  ])
  for (const tier of ['冲', '稳', '保']) assert.match(result, new RegExp(`key: '${tier}'`))
  assert.match(guide, /sort_by: 'smart'/)
  assert.match(guide, /PER_TIER_LIMIT = 30/)
  assert.match(result, /PAGE_STEP = 10/)
  assert.match(result, /\['稳', '保', '冲'\]/)
  assert.match(result, /再看 \{\{ Math\.min\(PAGE_STEP/)
  assert.match(css, /position: sticky/)
  assert.doesNotMatch(result, /<el-table|<el-pagination/)
  assert.match(result, /school\.majors/)
  assert.match(api, /'smart'/)
})

test('成功生成进入独立结果组件，结果显示提交条件和换算位次', async () => {
  const [guide, result, page, chat] = await Promise.all([
    source('components/gaokao/GaokaoGuide.vue'), source('components/gaokao/GaokaoResults.vue'),
    source('views/gaokao/GaokaoGuidePage.vue'), source('views/chat/ChatView.vue'),
  ])
  assert.match(guide, /emit\('complete'\)/)
  assert.doesNotMatch(guide, /aria-label="查询结果"/)
  assert.doesNotMatch(result, /<el-form/)
  assert.match(page, /gaokao-result/)
  assert.match(chat, /'gaokao-result': markRaw\(GaokaoResultPage\)/)
  assert.match(result, /修改条件/)
  assert.match(result, /resolved_rank/)
  assert.match(result, /result\.warnings/)
})

test('没有一分一段表的省份只能按位次查询', async () => {
  const [guide, api] = await Promise.all([
    source('components/gaokao/GaokaoGuide.vue'),
    source('api/gaokao.ts'),
  ])
  assert.match(api, /province_score_band_years/)
  assert.match(guide, /canUseScore/)
  assert.match(guide, /:disabled="!canUseScore"/)
  assert.match(guide, /if \(!canUseScore\.value\) metric\.value = 'rank'/)
})

test('指南与总表的说明统一收在页底，总表保留响应式表格', async () => {
  const guide = await source('components/gaokao/GaokaoResults.vue')
  const catalog = await source('components/gaokao/GaokaoCatalog.vue')
  assert.match(guide, /数据说明与免责声明/)
  assert.match(guide, /按校名查询已收录院校/)
  assert.match(catalog, /数据范围、生成规则与免责说明/)
  assert.match(catalog, /v-model="form\.admission_province"/)
  assert.match(catalog, /catalog-mobile-list/)
  assert.match(catalog, /@media \(max-width: 680px\)/)
  assert.match(catalog, /catalog-table-desktop \{ display: none; \}/)
  assert.match(catalog, /admission_province: form\.value\.admission_province/)
  assert.match(catalog, /school_provinces: form\.value\.school_provinces/)
  assert.match(catalog, /loaded && !result\?\.items\.length/)
})

test('总表和指南的页面级返回入口与响应式断言完整', async () => {
  const [chat, guidePage, catalogPage, guide, catalog] = await Promise.all([
    source('views/chat/ChatView.vue'),
    source('views/gaokao/GaokaoGuidePage.vue'),
    source('views/gaokao/GaokaoCatalogPage.vue'),
    source('components/gaokao/GaokaoGuide.vue'),
    source('components/gaokao/GaokaoCatalog.vue'),
  ])
  assert.match(chat, /'gaokao-catalog': markRaw\(GaokaoCatalogPage\)/)
  assert.match(guidePage, /aria-label="返回主页面"/)
  assert.match(catalogPage, /aria-label="返回志愿指南"/)
  assert.match(guidePage, /grid-template-columns: 2\.25rem minmax\(0, 1fr\) 2\.25rem/)
  assert.match(catalogPage, /grid-template-columns: 2\.25rem minmax\(0, 1fr\) 2\.25rem/)
  assert.match(await source('components/gaokao/guide.css'), /@media \(max-width:/)
  assert.match(catalog, /@media \(max-width:/)
})
