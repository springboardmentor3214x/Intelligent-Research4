import { apiFetch } from './api'

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

export function getTechnologyAreas(token) {
  return apiFetch('/technology-areas', { headers: authHeaders(token) })
}

export function addTechnologyArea(token, name) {
  return apiFetch('/technology-areas', {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export function removeTechnologyArea(token, id) {
  return apiFetch(`/technology-areas/${id}`, { method: 'DELETE', headers: authHeaders(token) })
}
