import { apiFetch } from './api'

export const technologyService = {
  // Sync technologies across papers, patents, funding
  async syncTechnologies() {
    return apiFetch('/technologies/sync', {
      method: 'POST',
    })
  },

  // Get all technology intelligence records
  async getTechnologies() {
    return apiFetch('/technologies')
  },

  // Get emerging technologies
  async getEmergingTechnologies() {
    return apiFetch('/technologies/emerging')
  },

  // Search technologies
  async searchTechnologies(keyword) {
    const params = new URLSearchParams({ keyword })
    return apiFetch(`/technologies/search?${params.toString()}`)
  },

  // Get single technology basic details
  async getTechnology(id) {
    return apiFetch(`/technologies/${id}`)
  },

  // Get year-wise activity for single technology
  async getTechnologyActivity(id) {
    return apiFetch(`/technologies/${id}/activity`)
  },

  // Get multi-technology historical activity summary
  async getActivitySummary() {
    return apiFetch('/technologies/activity/summary')
  },

  // Full unified analytical breakdown for ID
  async getTechnologyFullAnalysis(id) {
    return apiFetch(`/technologies/${id}/analysis`)
  },

  // Dynamic custom technology query analysis (Data-Driven, Explainable, Multi-Year)
  async analyzeCustomTechnology(query) {
    const params = new URLSearchParams({ query: query.trim() })
    return apiFetch(`/technologies/analysis?${params.toString()}`)
  },

  // Maturity analysis
  async getTechnologyMaturity(id) {
    return apiFetch(`/technologies/${id}/maturity`)
  },

  // Readiness analysis
  async getTechnologyReadiness(id) {
    return apiFetch(`/technologies/${id}/readiness`)
  },

  // Independent Adoption tracking
  async getTechnologyAdoption(id) {
    return apiFetch(`/technologies/${id}/adoption`)
  },

  // Multi-year Trend analysis
  async getTechnologyTrends(id) {
    return apiFetch(`/technologies/${id}/trends`)
  },

  // 3D Technology Landscape multi-node dataset
  async getTechnologyLandscape() {
    return apiFetch('/technologies/landscape')
  },

  // Multi-Source adapter status & capabilities
  async getSourcesStatus() {
    return apiFetch('/technologies/sources/status')
  },
}
