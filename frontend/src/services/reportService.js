import { apiFetch } from './api'

export const reportService = {
  async getFundingReport(params = {}) {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })

    const queryString = query.toString()

    return apiFetch(
      `/reports/funding${queryString ? `?${queryString}` : ''}`
    )
  },

  async getPatentReport(params = {}) {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })

    const queryString = query.toString()

    return apiFetch(
      `/reports/patents${queryString ? `?${queryString}` : ''}`
    )
  },

  async getResearchTrendReport(params = {}) {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })

    const queryString = query.toString()

    return apiFetch(
      `/reports/research-trends${queryString ? `?${queryString}` : ''}`
    )
  },

  async getInnovationReport(params = {}) {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })

    const queryString = query.toString()

    return apiFetch(
      `/reports/innovation${queryString ? `?${queryString}` : ''}`
    )
  },

  async getCommercializationReport(params = {}) {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })

    const queryString = query.toString()

    return apiFetch(
      `/reports/commercialization${queryString ? `?${queryString}` : ''}`
    )
  },
}