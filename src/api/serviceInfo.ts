import { request } from './request'

export interface ModelSource {
  purpose: string
  provider: string
  model: string
}

export function getServiceInfo() {
  return request<{ models: ModelSource[] }>('/service-info', {
    signal: AbortSignal.timeout(8000),
  })
}
