/** Run in a local Vite page:
 * const { runAnswerPresentationTests } = await import('/tests/answer-presentation.browser.mjs')
 * await runAnswerPresentationTests()
 */
export async function runAnswerPresentationTests() {
  const { createAnswerPresentation, presentAnswer } = await import('/src/utils/answerPresentation.ts')
  const results = []
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const test = (name, run) => { run(); results.push(name) }
  const root = document.createElement('div')
  test('保留文本、链接、代码、表格和 emoji；院校与专业仅作展示高亮', () => {
    root.innerHTML = '<p>推荐四川大学和电子科技大学的<strong>计算机科学与技术</strong>，位次 38,000。👨‍👩‍👧‍👦</p><p><a href="/school">四川大学</a></p><pre><code>const x = "四川大学"</code></pre><table><tr><td>内容 &amp; 数据</td></tr></table>'
    presentAnswer(root, false, createAnswerPresentation())
    assert(root.textContent.includes('推荐四川大学和电子科技大学的计算机科学与技术，位次 38,000。👨‍👩‍👧‍👦'), '正文必须完整保留')
    assert(root.querySelectorAll('.entity-school').length === 2, '分别识别相邻院校')
    assert(root.querySelector('.entity-major')?.textContent === '计算机科学与技术', '专业高亮')
    assert(root.querySelector('.entity-rank')?.textContent === '位次 38,000', '位次高亮')
    assert(!root.querySelector('a mark, code mark'), '不能装饰链接、代码')
    assert(root.querySelector('a').getAttribute('href') === '/school' && root.querySelector('.answer-record')?.textContent === '内容 & 数据', '链接保留，表格内容转文字')
    assert(root.querySelectorAll('.stream-char').length === 0, '历史回答不拆字')
  })
  test('旧表格改为带字段名的段落，链接与代码不丢失，重复渲染不重复字段', () => {
    root.innerHTML = '<table><thead><tr><th>年份</th><th>说明</th></tr></thead><tbody><tr><td>2026</td><td><a href="/source">来源</a> <code>a | b</code></td></tr><tr><td>2027</td><td>继续观察</td></tr></tbody></table>'
    const state = createAnswerPresentation()
    presentAnswer(root, true, state)
    assert(!root.querySelector('table'), '聊天不展示表格')
    assert(root.querySelectorAll('.answer-record').length === 2, '每行一组')
    assert(root.querySelector('a')?.getAttribute('href') === '/source', '引用链接保留')
    assert(root.querySelector('code')?.textContent === 'a | b', '代码内容保留')
    const before = root.textContent
    presentAnswer(root, false, state)
    assert(root.textContent === before, '完成流式渲染不重复添加字段')
    assert(root.textContent.includes('年份：2026') && root.textContent.includes('说明：继续观察'), '字段标签明确')
  })
  test('高频完整 HTML 快照保留字符出生时间，旧文字不重新播放', () => {
    const state = createAnswerPresentation()
    root.textContent = '建议关注四川大学'
    presentAnswer(root, true, state)
    const born = state.births.get(0)
    root.textContent += '，位次 38,000。'
    presentAnswer(root, true, state)
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) assert(state.births.get(0) === born, '已接收字符时间保持不变')
    const before = root.textContent
    presentAnswer(root, false, state)
    assert(root.textContent === before, '结束流不能丢字')
    assert(root.querySelectorAll('.stream-char').length === 0 && state.births.size === 0, '结束后释放逐字节点与时间表')
  })
  test('普通学校泛称、位次标点不误标成数据', () => {
    root.textContent = '这所大学是重点大学。对照历史位次，同时关注排名。位次 38,000，排位为 32000。'
    presentAnswer(root, false, createAnswerPresentation())
    assert(!root.querySelector('.entity-school'), '学校泛称不是院校实体')
    assert(root.querySelectorAll('.entity-rank').length === 2, '只有包含数字的位次才高亮')
    assert([...root.querySelectorAll('.entity-rank')].every(n => /\d/.test(n.textContent)), '逗号不是位次数字')
  })
  test('长回答限制活跃动效节点，保留完整内容，兼容快照修订', () => {
    const state = createAnswerPresentation()
    const value = '这是完整历史回答。'.repeat(1500) + '😀' + '尾'.repeat(63)
    root.textContent = value
    presentAnswer(root, true, state)
    assert(root.textContent === value, '长回答必须逐字保留')
    assert(root.querySelectorAll('.stream-char').length <= 64 && state.births.size <= 64, '动画不能随全文增长')
    assert(root.childNodes.length <= 70, '稳定文本不能拆为海量文本节点')
    assert([...root.querySelectorAll('.stream-char')].every(n => !/^[\uDC00-\uDFFF]$/u.test(n.textContent)), '不得拆开 emoji 代理对')
    root.textContent = '重新渲染的内容，专业是软件工程。'
    presentAnswer(root, true, state)
    assert(root.querySelector('.entity-major')?.textContent === '软件工程', '修订后仍正常高亮')
  })
  test('系统减弱动态效果时不生成动画字符', () => {
    root.textContent = '四川大学，位次 38000'
    presentAnswer(root, true, createAnswerPresentation())
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) assert(!root.querySelector('.stream-char'), '减弱动态效果立即显示文字')
  })
  return { passed: results.length, tests: results }
}
