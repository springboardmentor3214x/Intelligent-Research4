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

  // Full unified analytical breakdown
  async getTechnologyFullAnalysis(id) {
    return apiFetch(`/technologies/${id}/analysis`)
  },

  // Maturity analysis
  async getTechnologyMaturity(id) {
    return apiFetch(`/technologies/${id}/maturity`)
  },

  // Readiness analysis
  async getTechnologyReadiness(id) {
    return apiFetch(`/technologies/${id}/readiness`)
  },

  // Adoption tracking
  async getTechnologyAdoption(id) {
    return apiFetch(`/technologies/${id}/adoption`)
  },

  // Trend analysis
  async getTechnologyTrends(id) {
    return apiFetch(`/technologies/${id}/trends`)
  },

  // Cross-technology analytics
  async getAllTrends() {
    return apiFetch('/technologies/analytics/trends')
  },

  async getAllMaturities() {
    return apiFetch('/technologies/analytics/maturity')
  },

  async getAllAdoptions() {
    return apiFetch('/technologies/analytics/adoption')
  },

  // Dynamic Custom Technology Query Analysis
  async analyzeCustomTechnology(query) {
    const params = new URLSearchParams({ query: query.trim() })
    return apiFetch(`/technologies/analyze?${params.toString()}`)
  },
}
