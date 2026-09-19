import { apiFetch } from './api'

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export function fetchResearchPapers(token, { search = '', year = '', researchDomain = '', source = '', page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams()
  if (search && search.trim()) params.append('search', search.trim())
  if (year && String(year).trim().length === 4 && !isNaN(year)) {
    params.append('year', String(year).trim())
  }
  if (researchDomain && researchDomain.trim()) {
    params.append('research_domain', researchDomain.trim())
  }
  if (source && source.trim()) {
    params.append('source', source.trim())
  }
  params.append('page', String(page))
  params.append('page_size', String(pageSize))

  return apiFetch(`/research-papers?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function createResearchPaper(token, paperData) {
  return apiFetch('/research-papers', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(paperData),
  })
}

export function getResearchPaper(token, paperId) {
  return apiFetch(`/research-papers/${paperId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function importResearchPapers(token, { search, per_page = 20 }) {
  return apiFetch('/research-papers/import', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ search, per_page }),
  })
}

export function getPaperAnalysis(token, paperId, autoGenerate = false) {
  return apiFetch(`/research-papers/${paperId}/analysis?auto_generate=${autoGenerate}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function analyzePaper(token, paperId, forceRefresh = false) {
  return apiFetch(`/research-papers/${paperId}/analyze`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ force_refresh: forceRefresh }),
  })
}
