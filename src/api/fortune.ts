import { request } from './request'

export interface FortunePayload {
  calendar_type: 'solar' | 'lunar'
  birth_date: string
  birth_time: string
  gender: 'male' | 'female'
  lunar_leap_month: boolean
  utc_offset_minutes: number
  longitude: number | null
  late_zishi: 'next-day' | 'current-day'
}

export interface FortuneResult {
  interpretation?: FortuneInterpretation
  report: { markdown: string; html: string }
  chart: {
    lunarInfo: { lunarYear: number; fourPillars?: string[]; fourPillarsLunar?: string[] }
    currentAge: number; currentDaXianIndex: number; yinYangGender?: string
    mingGongBranch: number; shenGongBranch: number
    palaces: Array<{ name: string; branch: number; stem: number; stars: FortuneStar[]; daXianAge?: [number, number]; isMingGong?: boolean; isShenGong?: boolean; borrowedFromName?: string; borrowedStars?: string[] }>
  }
  details: {
    periods: Array<{ index: number; start_age: number; end_age: number; start_year: number; end_year: number; palace_branch: number; palace_name: string; sihua: FortuneMark[] }>
    years: Array<{ age: number; year: number; ganzhi: string; palace_branch: number; palace_name: string; period_index: number; period_branch: number; sihua: FortuneMark[]; period_sihua: FortuneMark[] }>
    palace_details: Array<{ branch: number; stem_branch: string; self_sihua: Array<{ siHua: string; starName: string }>; incoming: Array<{ star: string; type: string; from: string[] }>; spirits: string[] }>
    patterns: Array<{ name: string; level: string; description: string; palaces: string[]; source?: string; conditions?: { required: string[]; bonus?: string[]; breaking?: string[] } }>
    ming_summary: { stars: string[]; keywords: string[]; nature: string }
  }
  input: FortunePayload
  version: string
  disclaimer: string
  source: { name: string; url: string }
  timing: { solar_date: string; chart_date: string; clock: string; corrected: boolean; correction_minutes: number; branch_index: number }
  summary: { ming_branch: string; shen_branch: string; wuxing: string; ming_zhu: string; shen_zhu: string; lunar_date: string }
  palaces: Array<{ name: string; branch: string; is_ming: boolean; is_shen: boolean; stars: Array<{ name: string; type: string; siHua?: string; brightnessRaw?: string }>; borrowed_stars: string[] }>
  sihua: Array<{ star: string; type: string; palace: string }>
  analysis: Array<{ palace: string; title: string; evidence: string; text: string; borrowed: boolean }>
  conventions: string[]
}

export interface FortuneStar { name: string; type: string; siHua?: string; brightnessRaw?: string }
export interface FortuneMark { star: string; type: string; palace: string }

export function analyzeFortune(payload: FortunePayload, signal?: AbortSignal) {
  return request<FortuneResult>('/fortune/analyze', { method: 'POST', body: JSON.stringify(payload), signal })
}

export interface FortuneInterpretation {
  error_code?: string
  version?: string
  coverage?: string[]
  status: 'ready' | 'partial' | 'unavailable'
  missing_sections?: string[]
  markdown: string
  html: string
  message: string
  search_status: 'reference' | 'unavailable'
  sources: Array<{ title: string; url: string }>
  generated_at?: string
}

export function interpretFortune(birth: FortunePayload, signal?: AbortSignal, question = '完整AI智能解读') {
  return request<FortuneInterpretation>('/fortune/interpret', { method: 'POST', body: JSON.stringify({ birth, question }), signal })
}
