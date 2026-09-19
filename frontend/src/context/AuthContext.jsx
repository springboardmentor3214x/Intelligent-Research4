import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentUser, login as loginRequest, updateCurrentUser as updateUserRequest } from '../services/authService'
import { AuthContext } from './auth-context'
const TOKEN_KEY = 'research_intelligence_access_token'
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY)); const [user, setUser] = useState(null); const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))
  const logout = useCallback(() => { localStorage.removeItem(TOKEN_KEY); setToken(null); setUser(null); setLoading(false) }, [])
  const loadUser = useCallback(async value => { const profile = await getCurrentUser(value); setUser(profile); return profile }, [])
  useEffect(() => { if (!token) return; Promise.resolve().then(() => loadUser(token)).catch(logout).finally(() => setLoading(false)) }, [token, loadUser, logout])
  const login = useCallback(async (email, password) => { const value = await loginRequest(email, password); localStorage.setItem(TOKEN_KEY, value); setToken(value); setLoading(true); try { await loadUser(value) } catch (error) { logout(); throw error } finally { setLoading(false) } }, [loadUser, logout])
  const completeOAuth = useCallback(async value => { localStorage.setItem(TOKEN_KEY, value); setToken(value); setLoading(true); try { await loadUser(value) } finally { setLoading(false) } }, [loadUser])
  const updateUser = useCallback(async profile => { const updated = await updateUserRequest(token, profile); setUser(updated); return updated }, [token])
  const value = useMemo(() => ({ token, user, loading, login, logout, completeOAuth, updateUser }), [token, user, loading, login, logout, completeOAuth, updateUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
