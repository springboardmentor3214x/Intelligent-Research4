import { apiFetch } from './api'

export const patentService = {
  async getPatents(keyword = '', limit = 50) {
    const params = new URLSearchParams()
    if (keyword) params.append('keyword', keyword)
    if (limit) params.append('limit', limit)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    return apiFetch(`/patents${queryString}`)
  },

  async searchPatents(query = '', domain = null, assignee = null, limit = 50) {
    const params = new URLSearchParams()
    if (query) params.append('q', query)
    if (domain) params.append('domain', domain)
    if (assignee) params.append('assignee', assignee)
    if (limit) params.append('limit', limit)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    return apiFetch(`/patents/search${queryString}`)
  },

  async getPatentSuggestions(query = '', limit = 8) {
    if (!query || !query.trim()) return { query: '', suggestions: [] }
    const params = new URLSearchParams({ q: query.trim(), limit })
    return apiFetch(`/patents/suggestions?${params.toString()}`)
  },

  async getPatentById(patentId) {
    return apiFetch(`/patents/${patentId}`)
  },

  async getSimilarPatents(patentId, topK = 5) {
    return apiFetch(`/patents/${patentId}/similar?top_k=${topK}`)
  },

  async getPatentClusters(nClusters = null, maxPatents = 500) {
    const params = new URLSearchParams()
    if (nClusters) params.append('n_clusters', nClusters)
    if (maxPatents) params.append('max_patents', maxPatents)
    const queryString = params.toString() ? `?${params.toString()}` : ''
    return apiFetch(`/patents/clusters${queryString}`)
  },

  async runPatentClustering(nClusters = null, maxPatents = 500) {
    return apiFetch('/patents/clusters/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        n_clusters: nClusters ? Number.parseInt(nClusters, 10) : null,
        max_patents: Number.parseInt(maxPatents, 10),
      }),
    })
  },

  async importPatents(keyword, limit = 5) {
    return apiFetch('/patents/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword,
        limit: Number.parseInt(limit, 10),
      }),
    })
  },

  async analyzePatentIdea(idea, { focusCountry = 'all', minSimilarity = 0.0, limit = 20 } = {}) {
    return apiFetch('/patents/analyze-idea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idea,
        focus_country: focusCountry,
        min_similarity: minSimilarity,
        limit,
      }),
    })
  },
}

export default patentService
