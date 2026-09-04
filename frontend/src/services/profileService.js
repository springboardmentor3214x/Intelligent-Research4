import { API_BASE_URL, apiFetch } from './api'

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

// --- Research Profile & User ---
export function getProfile(token) {
  return apiFetch('/profile', { headers: { Authorization: `Bearer ${token}` } })
}

export function createProfile(token, payload) {
  return apiFetch('/profile', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export function updateProfile(token, payload) {
  return apiFetch('/profile', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

// --- Research Areas ---
export function getResearchAreas(token) {
  return apiFetch('/profile/areas', { headers: { Authorization: `Bearer ${token}` } })
}

export function addResearchArea(token, payload) {
  return apiFetch('/profile/areas', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export function removeResearchArea(token, areaId) {
  return apiFetch(`/profile/areas/${areaId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// --- Keywords ---
export function getKeywords(token) {
  return apiFetch('/profile/keywords', { headers: { Authorization: `Bearer ${token}` } })
}

export function addKeyword(token, payload) {
  return apiFetch('/profile/keywords', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export function removeKeyword(token, keywordId) {
  return apiFetch(`/profile/keywords/${keywordId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// --- Technology Areas ---
export function getTechnologyAreas(token) {
  return apiFetch('/profile/technology-areas', { headers: { Authorization: `Bearer ${token}` } })
}

export function addTechnologyArea(token, payload) {
  return apiFetch('/profile/technology-areas', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export function removeTechnologyArea(token, techId) {
  return apiFetch(`/profile/technology-areas/${techId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// --- Publications ---
export function getPublications(token) {
  return apiFetch('/profile/publications', { headers: { Authorization: `Bearer ${token}` } })
}

export function addPublication(token, payload) {
  return apiFetch('/profile/publications', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export function updatePublication(token, pubId, payload) {
  return apiFetch(`/profile/publications/${pubId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export function removePublication(token, pubId) {
  return apiFetch(`/profile/publications/${pubId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// --- Patents ---
export function getPatents(token) {
  return apiFetch('/profile/patents', { headers: { Authorization: `Bearer ${token}` } })
}

export function addPatent(token, payload) {
  return apiFetch('/profile/patents', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export function updatePatent(token, patentId, payload) {
  return apiFetch(`/profile/patents/${patentId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
}

export function removePatent(token, patentId) {
  return apiFetch(`/profile/patents/${patentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
