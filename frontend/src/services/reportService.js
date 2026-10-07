import { apiFetch, API_BASE_URL } from './api'

export const reportService = {
  async getFundingReport(params = {}, token = null) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })
    const qs = query.toString()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch(`/reports/funding${qs ? `?${qs}` : ''}`, { headers })
  },

  async getPatentReport(params = {}, token = null) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })
    const qs = query.toString()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch(`/reports/patents${qs ? `?${qs}` : ''}`, { headers })
  },

  async getResearchTrendReport(params = {}, token = null) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })
    const qs = query.toString()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch(`/reports/research-trends${qs ? `?${qs}` : ''}`, { headers })
  },

  async getInnovationReport(params = {}, token = null) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })
    const qs = query.toString()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch(`/reports/innovation${qs ? `?${qs}` : ''}`, { headers })
  },

  async getCommercializationReport(params = {}, token = null) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value)
      }
    })
    const qs = query.toString()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch(`/reports/commercialization${qs ? `?${qs}` : ''}`, { headers })
  },

  async generateUnifiedReport(payload, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch('/reports/unified', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
  },

  async exportReport(format, payload, token = null) {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    const response = await fetch(`${API_BASE_URL}/reports/${format}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let detail = 'Report export failed'
      try {
        const data = await response.json()
        detail = data.detail || detail
      } catch {
        /* ignore non-json */
      }
      throw new Error(detail)
    }

    return response.blob()
  },
}
