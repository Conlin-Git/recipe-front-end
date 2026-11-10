/** Local Vite browser harness. Uses synthetic chart data and intercepts only its reading API. */
import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import '../src/style.css'
import FortuneResultPage from '../src/views/fortune/FortuneResultPage.vue'
import AppIcon from '../src/components/common/AppIcon.vue'
import { useFeatureResults } from '../src/stores/featureResults'

export async function mountFortuneFixture(chart) {
  const originalFetch = window.fetch
  const calls = []
  const pending = []
  let delay = false
  window.fetch = async (url, options) => {
    if (url !== '/api/v1/fortune/interpret') return originalFetch(url, options)
    const body = JSON.parse(options.body)
    calls.push(body)
    // Intentionally ignore abort to verify late replies cannot replace the current report.
    if (delay) await new Promise(resolve => pending.push(resolve))
    const text = body.question + '，出生日期 ' + body.birth.birth_date
    return new Response(JSON.stringify({ status: 'ready', version: 'plain-v2', coverage: [], markdown: text,
      html: `<h3>${body.question}</h3><p>${text}</p><p>命盘依据：示例原始数据。</p>`, sources: [], search_status: 'unavailable', message: '' }))
  }
  const root = document.createElement('div')
  root.style.height = '100vh'
  document.body.append(root)
  const pinia = createPinia()
  const store = useFeatureResults(pinia)
  store.fortune = chart
  const app = createApp(FortuneResultPage).use(pinia).use(ElementPlus).component('AppIcon', AppIcon)
  app.mount(root)
  await nextTick()
  return { calls, pending, setDelay(value) { delay = value },
    replaceChart(value) { store.fortune = value },
    async cleanup() { app.unmount(); root.remove(); window.fetch = originalFetch; await nextTick() } }
}
