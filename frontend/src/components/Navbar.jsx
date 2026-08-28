import { useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'

export default function Navbar() {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand" aria-label="Research Funding and Innovation Intelligence home">
        <span className="brand-mark" aria-hidden="true">RFI</span>
        <span>Research Funding and Innovation Intelligence</span>
      </Link>
      {user ? (
        <div className="account-actions">
          <span className="user-chip"><strong>{user.name}</strong><small>{user.role.replaceAll('_', ' ')}</small></span>
          <Link className="nav-logout" to="/profile">Profile</Link><button className="nav-logout" onClick={handleLogout}>Log out</button>
        </div>
      ) : <span className="nav-caption">Funding. Research. Innovation.</span>}
    </header>
  )
}
