import { apiFetch } from './api'

export const contactService = {
  /**
   * Submit a public contact message.
   * @param {Object} data - { full_name, email, organization, subject, category, message }
   */
  async submitContactForm(data) {
    return apiFetch('/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}
