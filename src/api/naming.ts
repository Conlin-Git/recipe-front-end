import { request } from './request'

export type NamingPurpose = 'person_name' | 'pen_name' | 'screen_name'

export interface NamingPayload {
  calendar_type: 'solar' | 'lunar'
  birth_date: string
  birth_time?: string
  lunar_leap_month: boolean
  timezone: string
  birth_place?: string
  purpose: NamingPurpose
  surname: string
  name?: string
  style?: string
  avoid_chars: string
  generation_char?: string
  given_length: number
  preferred_elements: string[]
  variant_index: number
}

export interface NamingResult {
  id: number
  input_fingerprint: string
  purpose: NamingPurpose
  ruleset_version: string
  knowledge_snapshot_id: string
  variant_index: number
  created_at: string
  result: {
    report_markdown: string
    bazi: { pillars: string[]; element_counts: Record<string, number>; least_elements: string[] }
    candidates?: Array<{ name: string; score: number; score_breakdown: Record<string, unknown> }>
    score_breakdown?: Record<string, unknown>
    references: Array<{ id: string; title: string; url: string; usage: string }>
  }
}

export function analyzeNaming(payload: NamingPayload) {
  return request<NamingResult>('/naming/analyze', { method: 'POST', body: JSON.stringify(payload) })
}

export function scoreNaming(payload: NamingPayload) {
  return request<NamingResult>('/naming/score', { method: 'POST', body: JSON.stringify(payload) })
}
