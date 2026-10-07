import { apiFetch } from './api'

export function getResearcherIntelligence(token, filters = {}) {
  const query = new URLSearchParams()
  if (filters.domain && filters.domain !== 'all') query.append('domain', filters.domain)
  if (filters.year_from) query.append('year_from', filters.year_from)
  if (filters.year_to) query.append('year_to', filters.year_to)
  const qs = query.toString()
  return apiFetch(`/dashboard/researcher${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getDashboardPapers(token) {
  return apiFetch('/research-papers?page=1&page_size=100', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getResearchTrends(token) {
  return apiFetch('/research-papers/trends', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getFundingRecommendations(token) {
  return apiFetch('/funding/recommendations/me?limit=5', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getDashboardPatents(token) {
  return apiFetch('/patents?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getInnovationScore(token, technology) {
  return apiFetch(
    `/innovation/technologies/${encodeURIComponent(technology)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  )
}

export function getAdminMetrics(token) {
  return apiFetch('/dashboard/admin/metrics', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getAdminUsers(token, params = {}) {
  const query = new URLSearchParams()
  if (params.search) query.append('search', params.search)
  if (params.role && params.role !== 'all') query.append('role', params.role)
  if (params.limit) query.append('limit', params.limit)
  if (params.offset) query.append('offset', params.offset)
  const qs = query.toString()
  return apiFetch(`/dashboard/admin/users${qs ? `?${qs}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getAdminRecommendations(token) {
  return apiFetch('/dashboard/admin/recommendations', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getInnovationManagerDashboard(token) {
  return apiFetch('/dashboard/innovation-manager', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function getStartupFounderDashboard(token, domain = null) {
  const query = domain ? `?domain=${encodeURIComponent(domain)}` : ''
  return apiFetch(`/dashboard/startup${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function sendAdminBroadcast(token, payload) {
  return apiFetch('/dashboard/admin/broadcast', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
}


