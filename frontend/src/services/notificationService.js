import { apiFetch } from './api'

export const notificationService = {
  async getNotifications(params = {}, token = null) {
    const query = new URLSearchParams()
    if (params.unread_only) query.append('unread_only', 'true')
    if (params.category && params.category !== 'ALL') query.append('category', params.category)
    if (params.limit) query.append('limit', params.limit)
    if (params.offset) query.append('offset', params.offset)

    const qs = query.toString()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch(`/notifications${qs ? `?${qs}` : ''}`, { headers })
  },

  async getUnreadNotifications(token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch('/notifications/unread', { headers })
  },

  async markAsRead(notificationId, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers,
    })
  },

  async markAllAsRead(token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch('/notifications/read-all', {
      method: 'PATCH',
      headers,
    })
  },

  async getPreferences(token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch('/notifications/preferences', { headers })
  },

  async updatePreferences(payload, token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch('/notifications/preferences', {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    })
  },
}