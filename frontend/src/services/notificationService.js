import { apiFetch } from './api'

export const notificationService = {
  async getNotifications() {
    return apiFetch('/notifications')
  },

  async getUnreadNotifications() {
    return apiFetch('/notifications/unread')
  },

  async getNotification(id) {
    return apiFetch(`/notifications/${id}`)
  },

  async markAsRead(id) {
    return apiFetch(`/notifications/${id}/read`, {
      method: 'PATCH',
    })
  },

  async markAllAsRead() {
    return apiFetch('/notifications/read-all', {
      method: 'PATCH',
    })
  },
}