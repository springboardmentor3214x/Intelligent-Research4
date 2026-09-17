import { useContext, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import Loading from '../components/Loading'
export default function OAuthCallback() { const { completeOAuth } = useContext(AuthContext); const [params] = useSearchParams(); const navigate = useNavigate(); const [error, setError] = useState(''); const token = params.get('token'); useEffect(() => { if (token) Promise.resolve().then(() => completeOAuth(token)).then(() => navigate('/dashboard', { replace: true })).catch(err => setError(err.message)).finally(() => window.history.replaceState({}, document.title, '/oauth/callback')) }, [token, completeOAuth, navigate]); if (!token) return <section className="auth-card"><p className="error">Google sign-in did not return a valid session.</p></section>; if (error) return <section className="auth-card"><p className="error">{error}</p></section>; return <Loading /> }
