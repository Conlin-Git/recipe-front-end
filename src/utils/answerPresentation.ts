/** Presentation only: preserve server text, links and code; never write back to chat state. */
export interface AnswerPresentationState {
  text: string
  births: Map<number, number>
}

export function createAnswerPresentation(): AnswerPresentationState {
  return { text: '', births: new Map() }
}

const excluded = 'pre, code, a, button, script, style, textarea, kbd, svg, math'
const entities = /[\p{Script=Han}·]{2,24}?(?:大学|学院)|计算机科学与技术|电子信息工程|软件工程|人工智能|数据科学与大数据技术|临床医学|口腔医学|电气工程及其自动化|机械设计制造及其自动化|汉语言文学|法学|会计学|金融学|(?:位次|排位|排名)(?:约为|约|为|是)?[\s：:第]*(?:\d{1,3}(?:[,，]\d{3})+|\d+)(?:\.\d+)?\s*万?(?:名|位)?|第\s*(?:\d{1,3}(?:[,，]\d{3})+|\d+)\s*名/gu
const schoolPrefix = /^.*(?:推荐|考虑|关注|选择|例如|比如|包括|以及|建议|可以|了解|首选|对比|报考|可选|就读|毕业于|来自|参考|和|与|及|是)/u
const genericSchool = /^(?:这所|那所|一所|某所|很多|所有|部分|这些|那些|普通|重点|综合|知名|哪些|什么|心仪|理想)(?:大学|学院)$/u

/** Historical/model-generated tables become readable rows without losing links or code. */
export function tablesToParagraphs(root: HTMLElement) {
  root.querySelectorAll('table').forEach((table) => {
    const section = document.createElement('div')
    section.className = 'answer-records'
    const heading = table.tHead?.rows[0]
    const headers = heading ? Array.from(heading.cells).map(cell => cell.textContent?.trim() || '') : []
    if (table.caption) {
      const caption = document.createElement('p')
      caption.append(...Array.from(table.caption.childNodes).map(node => node.cloneNode(true)))
      section.append(caption)
    }
    const rows = Array.from(table.rows).filter(row => row !== heading)
    if (!rows.length && headers.length) {
      const paragraph = document.createElement('p')
      paragraph.textContent = headers.join(' · ')
      section.append(paragraph)
    }
    rows.forEach((row) => {
      const record = document.createElement('div')
      record.className = 'answer-record'
      Array.from(row.cells).forEach((cell, index) => {
        const paragraph = document.createElement('p')
        if (headers[index]) {
          const label = document.createElement('strong')
          label.textContent = `${headers[index]}：`
          paragraph.append(label)
        }
        paragraph.append(...Array.from(cell.childNodes).map(node => node.cloneNode(true)))
        record.append(paragraph)
      })
      section.append(record)
    })
    table.replaceWith(section)
  })
}

/** Conservative display hints, not an entity extractor: ambiguous prose stays unmarked. */
function entityRanges(text: string) {
  return Array.from(text.matchAll(entities)).flatMap((match) => {
    let value = match[0]
    let start = match.index
    const school = /(?:大学|学院)$/.test(value)
    if (school) {
      const prefix = value.match(schoolPrefix)?.[0] || ''
      start += prefix.length
      value = value.slice(prefix.length)
      if (value.length < 4 || value.length > 16 || genericSchool.test(value)) return []
    }
    return [{ start, end: start + value.length, kind: school ? 'school' : /\d/.test(value) ? 'rank' : 'major' }]
  })
}

/** Decorate only the existing DOM. At most 64 newly received characters animate at once.
 * Birth times survive full HTML snapshots: old letters never restart their animation.
 * No timers, layout reads, per-character reactive state or streaming/network changes.
 */
export function presentAnswer(root: HTMLElement, streaming: boolean, state: AnswerPresentationState) {
  tablesToParagraphs(root)
  root.querySelectorAll('[data-answer-decoration]').forEach((node) => node.replaceWith(...node.childNodes))
  root.normalize()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) nodes.push(node as Text)
  const text = nodes.map((item) => item.data).join('')
  const now = performance.now()
  const animate = streaming && !matchMedia('(prefers-reduced-motion: reduce)').matches
  let prefix = 0
  if (animate) {
    while (prefix < text.length && prefix < state.text.length && text[prefix] === state.text[prefix]) prefix++
  }
  for (const [offset, born] of state.births) {
    if (!animate || offset < text.length - 64 || offset >= prefix || now - born >= 240) state.births.delete(offset)
  }
  if (animate) {
    const start = Math.max(prefix, text.length - 64)
    for (let i = start; i < text.length; i++) state.births.set(i, now + Math.min((i - start) * 7, 70))
  }
  state.text = text
  const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
  let offset = 0
  for (const node of nodes) {
    const value = node.data
    const base = offset
    offset += value.length
    if (!value.trim() || node.parentElement?.closest(excluded)) continue
    const ranges = entityRanges(value)
    const fragment = document.createDocumentFragment()
    let cursor = 0
    const appendText = (parent: Node, start: number, end: number) => {
      let part = value.slice(start, end)
      // Leave settled text as a single text node. Never split the entire response into spans.
      if (!animate || base + end <= text.length - 64) {
        parent.appendChild(document.createTextNode(part))
        return
      }
      let settledLength = Math.max(0, text.length - 64 - base - start)
      // Do not cut a surrogate pair at the moving animation budget boundary.
      if (settledLength && /[\uDC00-\uDFFF]/u.test(part[settledLength] || '')) settledLength--
      if (settledLength) {
        parent.appendChild(document.createTextNode(part.slice(0, settledLength)))
        part = part.slice(settledLength)
        start += settledLength
      }
      for (const { segment, index } of segmenter.segment(part)) {
        const born = state.births.get(base + start + index)
        if (born === undefined || now - born >= 240 || /\s/u.test(segment)) {
          parent.appendChild(document.createTextNode(segment))
          continue
        }
        const span = document.createElement('span')
        span.dataset.answerDecoration = ''
        span.className = 'stream-char'
        span.style.animationDelay = `${born - now}ms`
        span.textContent = segment
        parent.appendChild(span)
      }
    }
    for (const range of ranges) {
      appendText(fragment, cursor, range.start)
      const mark = document.createElement('mark')
      mark.dataset.answerDecoration = ''
      mark.className = `answer-entity entity-${range.kind}`
      appendText(mark, range.start, range.end)
      fragment.appendChild(mark)
      cursor = range.end
    }
    appendText(fragment, cursor, value.length)
    node.replaceWith(fragment)
  }
}
