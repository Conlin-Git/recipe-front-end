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
  history_years?: number
  sort_by?: 'min_score_desc' | 'min_rank_asc' | 'rank_gap_desc'
}

export interface GaokaoRecommendation {
  tier: '冲' | '稳' | '保' | '数据不足'
  rank_status: '已超过' | '未达到' | '暂无位次'
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
  comparison_rank?: number
  plan_count?: number
  confidence: '高' | '中' | '低'
  data_quality?: '官方位次' | '换算位次' | '仅最低分' | '无可用数据'
  evidence: Array<{ year: number; min_rank?: number; min_score?: number; source_id: number; data_quality?: string }>
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
  summary: {
    matched_count: number
    returned_count: number
    tier_counts: Record<'冲' | '稳' | '保' | '数据不足', number>
    available_years?: number[]
    sort_by?: string
  }
  coverage: GaokaoCoverage
  school_recommendations: GaokaoSchoolRecommendation[]
  rule_note: string
}

export interface GaokaoSchoolRecommendation {
  tier: '冲' | '稳' | '保' | '数据不足'
  rank_status: '已超过' | '未达到' | '暂无位次'
  university_name: string
  school_province?: string
  min_score?: number
  min_rank?: number
  rank_gap?: number
  comparison_rank?: number
  major_count: number
  data_quality?: '官方位次' | '换算位次' | '仅最低分' | '无可用数据'
  historical_years: number[]
  confidence: '高' | '中' | '低'
  reason: string
  majors: GaokaoRecommendation[]
}

export interface GaokaoCoverage {
  selected_school_provinces: string[]
  supported_school_provinces: string[]
  verified_record_count: number
  university_count: number
  history_years?: number[]
  is_full_scope?: boolean
  is_full_catalog?: boolean
  scope_note?: string
  note?: string
}

export interface GaokaoCatalogItem {
  university_code: string
  university_name: string
  school_province?: string
  latest_year: number
  tracks: string[]
  years: number[]
  record_count: number
  min_score?: number
  min_rank?: number
  data_levels: string[]
  data_status: string
}

export interface GaokaoCatalogResult {
  items: GaokaoCatalogItem[]
  total: number
  page: number
  page_size: number
  coverage: GaokaoCoverage
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
    coverage?: GaokaoCoverage
  }>('/gaokao/options')
}

export function getGaokaoGuide(payload: GaokaoGuidePayload) {
  return request<GaokaoGuideResult>('/gaokao/guide', { method: 'POST', body: JSON.stringify(payload) })
}

export function getGaokaoCatalog(payload: {
  admission_province: string
  school_provinces: string[]
  year?: number
  track?: string
  batch?: string
  keywords: string
  page: number
  page_size: number
}) {
  return request<GaokaoCatalogResult>('/gaokao/catalog', { method: 'POST', body: JSON.stringify(payload) })
}

export function getGaokaoCoverage() {
  return request<GaokaoCoverage>('/gaokao/coverage')
}
