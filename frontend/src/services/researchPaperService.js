import { apiFetch } from './api'

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export const ALL_RESEARCH_SOURCES = [
  'OpenAlex',
  'Crossref',
  'Semantic Scholar',
  'CORE',
  'arXiv',
  'Europe PMC',
  'PubMed',
  'DOAJ',
  'OpenAIRE',
  'Zenodo',
  'bioRxiv',
  'medRxiv',
  'BASE',
]

export function fetchResearchPapers(token, { search = '', year = '', researchDomain = '', source = '', page = 1, pageSize = 50 } = {}) {
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

export function importResearchPapers(token, { search, target_count = 50, per_page = 50, sources = ALL_RESEARCH_SOURCES, year_from = null, year_to = null, research_domain = null }) {
  return apiFetch('/research-papers/import', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      search,
      target_count,
      per_page,
      sources,
      year_from: year_from ? Number(year_from) : null,
      year_to: year_to ? Number(year_to) : null,
      research_domain,
    }),
  })
}

export function batchCorpusIngest(token, { topics = null, target_per_topic = 100, sources = ALL_RESEARCH_SOURCES } = {}) {
  return apiFetch('/research-papers/batch-corpus-ingest', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      topics,
      target_per_topic,
      sources,
    }),
  })
}

export function getCorpusStats(token) {
  return apiFetch('/research-papers/corpus-stats', {
    headers: { Authorization: `Bearer ${token}` },
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
