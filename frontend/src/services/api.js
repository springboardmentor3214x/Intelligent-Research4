export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  }

  if (options.body || options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }
  }

  const timeoutMs = options.timeout || 35000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let detail = 'Something went wrong. Please try again.'
      try {
        const body = await response.json()
        detail = typeof body.detail === 'string' ? body.detail : Array.isArray(body.detail) ? body.detail[0]?.msg || detail : detail
      } catch {
        /* non-JSON error */
      }
      throw new Error(detail)
    }

    return response.status === 204 ? null : response.json()
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please check the backend service status.`)
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(`Backend connection failed: Could not connect to ${API_BASE_URL}. Ensure the backend API server is running.`)
    }
    throw err
  }
}

