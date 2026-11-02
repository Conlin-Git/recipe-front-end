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
  assert.match(guide, /暂无满足\$\{candidateProvince\}省口径的本科投档数据/)
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
  assert.doesNotMatch(guide, /<el-tooltip/)
  assert.match(guide, /<details v-for="school in pagedSchoolItems"/)
  assert.doesNotMatch(catalog, /<details>/)
  assert.match(catalog, /数据范围、生成规则与免责说明/)
  assert.match(catalog, /v-model="form\.admission_province"/)
})

test('高考页面移动端切换为卡片，桌面端保留表格', async () => {
  const [guide, catalog, guidePage, catalogPage] = await Promise.all([
    source('components/gaokao/GaokaoGuide.vue'),
    source('components/gaokao/GaokaoCatalog.vue'),
    source('views/gaokao/GaokaoGuidePage.vue'),
    source('views/gaokao/GaokaoCatalogPage.vue'),
  ])
  assert.match(guide, /result-cards-mobile/)
  assert.match(guide, /@media \(max-width: 720px\)/)
  assert.match(guide, /result-table-desktop \{ display: none; \}/)
  assert.match(catalog, /catalog-mobile-list/)
  assert.match(catalog, /@media \(max-width: 680px\)/)
  assert.match(catalog, /catalog-table-desktop \{ display: none; \}/)
  assert.match(catalog, /catalog-meta :deep\(\.el-pagination\).*flex-wrap: nowrap/)
  assert.match(catalog, /catalog-meta :deep\(\.el-pagination \.el-pager\).*flex-wrap: nowrap/)
  assert.match(guidePage, /grid-template-columns: 2\.25rem minmax\(0, 1fr\) 2\.25rem/)
  assert.match(catalogPage, /grid-template-columns: 2\.25rem minmax\(0, 1fr\) 2\.25rem/)
})

test('组合矩阵覆盖三省、位次优先、分数换算和空态安全边界', async () => {
  const [guide, catalog, api] = await Promise.all([
    source('components/gaokao/GaokaoGuide.vue'),
    source('components/gaokao/GaokaoCatalog.vue'),
    source('api/gaokao.ts'),
  ])

  // 省份维度：切换考生省份后，招生省份必须同步，不能误用学校所在地口径。
  assert.match(guide, /schoolProvinces\.value = options\.school_provinces/)
  assert.match(guide, /全国院校（不限地区）/)
  assert.match(guide, /form\.value\.admission_province = province/)
  assert.match(guide, /candidate_province: form\.value\.candidate_province/)
  assert.match(guide, /admission_province: form\.value\.admission_province/)

  // 成绩维度：位次和分数均可提交，空成绩只能 toast，不得触发请求。
  assert.match(guide, /rank: form\.value\.rank/)
  assert.match(guide, /score: form\.value\.score/)
  assert.match(guide, /if \(!form\.value\.rank && form\.value\.score === undefined\)/)
  assert.match(guide, /ElMessage\.warning\('请填写省内位次或高考分数，优先填写位次。'\)/)

  // 结果维度：0 条结果只能展示空态；学校列表必须以学校聚合，专业只在展开后出现。
  assert.match(guide, /v-if="!hasRows"/)
  assert.match(guide, /school_recommendations/)
  assert.match(guide, /scope\.row\.majors/)
  assert.match(guide, /v-for="school in pagedSchoolItems"/)

  // 分档与排序维度：默认展示稳档，用户可切换冲/稳/保；数据不足不作为展示档位。
  for (const tier of ['冲', '稳', '保']) assert.match(guide, new RegExp(`label="${tier}"`))
  assert.doesNotMatch(guide, /label="全部"/)
  assert.doesNotMatch(guide, /label="数据不足"/)
  assert.match(guide, /resultPageSize = 10/)
  assert.match(guide, /<el-pagination/)
  assert.match(guide, /min_score_desc/)
  assert.match(guide, /min_rank_asc/)
  assert.match(guide, /rank_gap_desc/)

  // 总表维度：广东筛广东必须把招生省份和院校所在地同时传给接口；空结果使用可解释空态。
  assert.match(catalog, /admission_province: form\.value\.admission_province/)
  assert.match(catalog, /school_provinces: form\.value\.school_provinces/)
  assert.match(catalog, /loaded && !result\?\.items\.length/)
  assert.match(api, /getGaokaoCatalog/)
  assert.doesNotMatch(guide, /result\.agent_plan/)
})

test('总表和指南的页面级返回入口、底部提示和响应式断言完整', async () => {
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
  for (const content of [guide, catalog]) {
    assert.match(content, /footer-/)
    assert.doesNotMatch(content, /<details>/)
    assert.match(content, /@media \(max-width:/)
  }
})
