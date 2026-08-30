import { useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'

export default function Navbar() {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleNavClick(sectionId) {
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        const el = document.getElementById(sectionId)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      const el = document.getElementById(sectionId)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand" aria-label="Research Intelligence home">
        <span className="brand-mark" aria-hidden="true">RI</span>
        <span className="brand-title">Research Intelligence</span>
      </Link>

      <nav className="nav-links" aria-label="Main Navigation">
        <button type="button" className="nav-link-btn" onClick={() => handleNavClick('home')}>
          Home
        </button>
        <button type="button" className="nav-link-btn" onClick={() => handleNavClick('platform')}>
          Platform
        </button>
        <button type="button" className="nav-link-btn" onClick={() => handleNavClick('features')}>
          Features
        </button>
        <button type="button" className="nav-link-btn" onClick={() => handleNavClick('about')}>
          About
        </button>
      </nav>

      {user ? (
        <div className="account-actions">
          <span className="user-chip">
            <strong>{user.name}</strong>
            <small>{user.role.replaceAll('_', ' ')}</small>
          </span>
          <Link className="nav-logout" to="/dashboard">Dashboard</Link>
          <Link className="nav-logout" to="/profile">Profile</Link>
          <button className="nav-logout" onClick={handleLogout}>Log out</button>
        </div>
      ) : (
        <div className="account-actions">
          <Link className="nav-login-btn" to="/login">
            Login
          </Link>
          <Link className="nav-get-started-btn" to="/register">
            Get Started
          </Link>
        </div>
      )}
    </header>
  )
}
