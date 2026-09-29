import { apiFetch } from './api'

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
