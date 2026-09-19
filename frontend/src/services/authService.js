import { API_BASE_URL, apiFetch } from './api'
export function register(payload) { return apiFetch('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) }
export async function login(email, password) { const data = await apiFetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username: email, password }) }); return data.access_token }
export function getCurrentUser(token) { return apiFetch('/auth/me', { headers: { Authorization: `Bearer ${token}` } }) }
export function updateCurrentUser(token, payload) { return apiFetch('/auth/me', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) }
export function googleOAuthUrl() { return `${API_BASE_URL}/auth/oauth/google` }
