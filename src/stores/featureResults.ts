import { defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { FortuneResult } from '../api/fortune'
import type { GaokaoGuideResult } from '../api/gaokao'
import type { NamingResult } from '../api/naming'

// Session memory only. Birth information and reports are never persisted locally.
export const useFeatureResults = defineStore('feature-results', () => {
  const fortune = shallowRef<FortuneResult | null>(null)
  const gaokao = shallowRef<GaokaoGuideResult | null>(null)
  const naming = shallowRef<NamingResult | null>(null)
  function clear() { fortune.value = null; gaokao.value = null; naming.value = null }
  return { fortune, gaokao, naming, clear }
})
