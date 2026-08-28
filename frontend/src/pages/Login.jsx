import { useContext, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import { googleOAuthUrl } from '../services/authService'
import '../auth-enhancements.css'

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.5a4.7 4.7 0 0 1-2 3.1v2.4h3.2c1.9-1.8 3.1-4.3 3.1-7.2Z" /><path fill="#34A853" d="M12 22c2.8 0 5.1-.9 6.8-2.5L15.6 17c-1 .7-2.2 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.7v2.5A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6 13.7a6 6 0 0 1 0-3.4V7.8H2.7a10 10 0 0 0 0 8.4L6 13.7Z" /><path fill="#EA4335" d="M12 5.9c1.5 0 2.9.5 3.9 1.5l2.9-2.9A10 10 0 0 0 2.7 7.8L6 10.3c.9-2.5 3.2-4.4 6-4.4Z" /></svg>
}

export default function Login() {
  const { login, token } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (token) return <Navigate to="/dashboard" replace />

  async function submit(event) {
    event.preventDefault(); setError('')
    if (!email || !password) { setError('Please enter both your email address and password.'); return }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return }
    setSubmitting(true)
    try { await login(email, password); navigate(location.state?.from || '/dashboard', { replace: true }) }
    catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  return <div className="login-layout">
    <section className="auth-card login-card">
      <div className="card-heading"><p className="eyebrow">WELCOME BACK</p><h2>Sign in to your workspace</h2><p>Use your email and password to continue.</p></div>
      <form onSubmit={submit} noValidate>
        <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="name@organization.com" /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Enter your password" /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary-button" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in securely'}</button>
      </form>
      <div className="divider"><span>OR CONTINUE WITH</span></div>
      <a className="google-button" href={googleOAuthUrl()}><GoogleIcon /> <span>Continue with Google</span></a>
      <p className="auth-footer">New to the platform? <Link to="/register">Create an account</Link></p>
    </section>
  </div>
}
