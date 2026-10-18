import { apiFetch } from './api'

export const assistantService = {
  /**
   * Send user chat message to the ResearchIntel Platform AI Assistant.
   * @param {string} message - User query or prompt
   * @param {string} [pageContext] - Current route or section id
   * @param {object} [entityContext] - Active item or selected data
   * @param {Array} [conversationHistory] - Previous chat turns
   * @param {string} [token] - JWT access token if authenticated
   */
  async sendChatMessage(message, pageContext = 'global', entityContext = {}, conversationHistory = [], token = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return apiFetch('/assistant/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        page_context: pageContext,
        entity_context: entityContext,
        conversation_history: conversationHistory,
      }),
    })
  },
}