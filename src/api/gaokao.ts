import { request } from './request'

export interface GaokaoGuidePayload {
  candidate_province: string
  admission_province: string
  school_provinces: string[]
  candidate_year: number
  reference_year: number
  track: string
  rank?: number
  score?: number
  batch: string
  subjects: string[]
  preferred_regions: string[]
  keywords: string
  limit: number
}

export interface GaokaoRecommendation {
  tier: '冲' | '稳' | '保'
  rank_status: '已超过' | '未达到'
  record_kind?: 'group投档' | 'group_admit' | 'major_admit'
  admission_round?: string
  university_name: string
  school_province?: string
  group_name: string
  major_name: string
  subject_requirements?: string
  min_score?: number
  min_rank?: number
  avg_score?: number
  max_score?: number
  admission_count?: number
  submission_count?: number
  admission_status?: string
  historical_years: number[]
  historical_min_ranks: number[]
  rank_gap?: number
  plan_count?: number
  confidence: '高' | '中' | '低'
  evidence: Array<{ year: number; min_rank?: number; min_score?: number; source_id: number }>
  reason: string
}

export interface GaokaoGuideResult {
  disclaimer: string
  data_status: 'ok' | 'insufficient'
  profile: Record<string, unknown>
  recommendations: GaokaoRecommendation[]
  sections?: Record<string, GaokaoRecommendation[]>
  sources: Array<{ id: number; publisher: string; year: number; dataset_type: string; url: string; validation_status: string }>
  warnings: string[]
}

export function getGaokaoOptions() {
  return request<{
    provinces: string[]
    years: number[]
    reference_years?: number[]
    score_band_years?: number[]
    tracks: string[]
    province_tracks: Record<string, string[]>
    province_batches: Record<string, string[]>
    province_reference_batches?: Record<string, Record<string, string[]>>
    school_provinces?: string[]
  }>('/gaokao/options')
}

export function getGaokaoGuide(payload: GaokaoGuidePayload) {
  return request<GaokaoGuideResult>('/gaokao/guide', { method: 'POST', body: JSON.stringify(payload) })
}
