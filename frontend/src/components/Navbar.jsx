import { useContext, useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()

  // State for mobile menu, dropdowns, and scrolled glass effect
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [researchDropdownOpen, setResearchDropdownOpen] = useState(false)
  const [fundingDropdownOpen, setFundingDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const researchRef = useRef(null)
  const fundingRef = useRef(null)

  function handleLogout() {
    logout()
    setMobileMenuOpen(false)
    navigate('/login')
  }

  // Scroll listener for dynamic navbar backdrop
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Handle outside clicks and Esc key for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (researchRef.current && !researchRef.current.contains(event.target)) {
        setResearchDropdownOpen(false)
      }
      if (fundingRef.current && !fundingRef.current.contains(event.target)) {
        setFundingDropdownOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setResearchDropdownOpen(false)
        setFundingDropdownOpen(false)
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setResearchDropdownOpen(false)
    setFundingDropdownOpen(false)
  }, [location.pathname])

  function handleNavClick(sectionId) {
    setMobileMenuOpen(false)
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

  const isCurrent = (path) => location.pathname === path

  return (
    <header className={`navbar ${scrolled ? 'scrolled-glass' : ''}`} role="banner">
      <div className="navbar-inner">
        {/* Brand Logo & Name */}
        <Link to="/" className="brand" aria-label="Research Intelligence Home">
          <span className="brand-mark" aria-hidden="true">RI</span>
          <span className="brand-title">Research Intelligence</span>
        </Link>

        {/* Center Navigation Links */}
        {!user ? (
          /* Public Unauthenticated Navigation */
          <nav className="nav-links" aria-label="Public Navigation">
            <button
              type="button"
              className={`nav-link-btn ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              Home
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleNavClick('platform')}
            >
              Platform
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleNavClick('features')}
            >
              Features
            </button>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleNavClick('how-it-works')}
            >
              How It Works
            </button>
            <Link
              to="/patents"
              className={`nav-link-btn ${location.pathname === '/patents' ? 'active' : ''}`}
            >
              Patent Landscape
            </Link>
          </nav>
        ) : (
          /* Authenticated Navigation with Dropdowns */
          <nav className="nav-links" aria-label="Platform Navigation">
            <Link
              to="/"
              className={`nav-link-btn ${isCurrent('/') ? 'active' : ''}`}
            >
              Home
            </Link>

            <Link
              to="/patents"
              className={`nav-link-btn ${isCurrent('/patents') ? 'active' : ''}`}
            >
              Patent Landscape
            </Link>

            {/* Research Dropdown */}
            <div className="nav-dropdown" ref={researchRef}>
              <button
                type="button"
                className={`nav-link-btn dropdown-toggle ${isCurrent('/research-papers') || isCurrent('/profile') ? 'active' : ''}`}
                onClick={() => {
                  setResearchDropdownOpen(!researchDropdownOpen)
                  setFundingDropdownOpen(false)
                }}
                aria-expanded={researchDropdownOpen}
                aria-haspopup="true"
              >
                Research
                <svg
                  className={`dropdown-chevron ${researchDropdownOpen ? 'rotated' : ''}`}
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {researchDropdownOpen && (
                <div className="dropdown-menu" role="menu">
                  <Link
                    to="/research-papers"
                    className={`dropdown-item ${isCurrent('/research-papers') ? 'active-item' : ''}`}
                    role="menuitem"
                    onClick={() => setResearchDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">📄</div>
                    <div>
                      <strong>Research Papers</strong>
                      <small>Search &amp; AI Analysis</small>
                    </div>
                  </Link>
                    <Link
                    to="/patents"
                    className={`dropdown-item ${isCurrent('/patents') ? 'active-item' : ''}`}
                    role="menuitem"
                    onClick={() => setResearchDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">🧩</div>
                    <div>
                      <strong>Patent Landscape</strong>
                      <small>AI Clustering &amp; Similarity</small>
                    </div>
                  </Link>
                  <Link
                    to="/profile"
                    className={`dropdown-item ${isCurrent('/profile') ? 'active-item' : ''}`}
                    role="menuitem"
                    onClick={() => setResearchDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">👤</div>
                    <div>
                      <strong>Research Profile</strong>
                      <small>Expertise, Domains &amp; Publications</small>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Funding Dropdown */}
            <div className="nav-dropdown" ref={fundingRef}>
              <button
                type="button"
                className={`nav-link-btn dropdown-toggle ${isCurrent('/funding') ? 'active' : ''}`}
                onClick={() => {
                  setFundingDropdownOpen(!fundingDropdownOpen)
                  setResearchDropdownOpen(false)
                }}
                aria-expanded={fundingDropdownOpen}
                aria-haspopup="true"
              >
                Funding
                <svg
                  className={`dropdown-chevron ${fundingDropdownOpen ? 'rotated' : ''}`}
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {fundingDropdownOpen && (
                <div className="dropdown-menu" role="menu">
                  <Link
                    to="/funding"
                    className={`dropdown-item ${isCurrent('/funding') ? 'active-item' : ''}`}
                    role="menuitem"
                    onClick={() => setFundingDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">🎯</div>
                    <div>
                      <strong>AI Funding Matching</strong>
                      <small>Personalized Grant Recommendations</small>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}

        {/* Right Side Actions */}
        <div className="navbar-actions">
          {user ? (
            <div className="authenticated-actions">
              <Link
                to="/dashboard"
                className={`nav-pill-btn ${isCurrent('/dashboard') ? 'active-pill' : ''}`}
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className="user-chip-link"
                title="View Profile"
              >
                <div className="user-avatar">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-details">
                  <strong className="user-name">{user.name}</strong>
                  <small className="user-role">{user.role ? user.role.replaceAll('_', ' ') : 'Researcher'}</small>
                </div>
              </Link>
              <button
                type="button"
                className="nav-logout-btn"
                onClick={handleLogout}
                aria-label="Log out"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="unauthenticated-actions">
              <Link to="/login" className="nav-login-btn">
                Login
              </Link>
              <Link to="/register" className="nav-get-started-btn">
                Get Started
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-drawer" role="dialog" aria-label="Mobile Navigation Menu">
          <div className="mobile-drawer-links">
            {!user ? (
              <>
                <button type="button" className="mobile-link" onClick={() => handleNavClick('home')}>
                  Home
                </button>
                <button type="button" className="mobile-link" onClick={() => handleNavClick('platform')}>
                  Platform Overview
                </button>
                <button type="button" className="mobile-link" onClick={() => handleNavClick('features')}>
                  Core Features
                </button>
                <button type="button" className="mobile-link" onClick={() => handleNavClick('how-it-works')}>
                  How It Works
                </button>
                <button type="button" className="mobile-link" onClick={() => handleNavClick('about')}>
                  About
                </button>
                <hr className="mobile-divider" />
                <Link to="/login" className="mobile-btn secondary" onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
                <Link to="/register" className="mobile-btn primary" onClick={() => setMobileMenuOpen(false)}>
                  Get Started →
                </Link>
              </>
            ) : (
              <>
                <div className="mobile-user-profile">
                  <div className="user-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <strong>{user.name}</strong>
                    <p>{user.email}</p>
                  </div>
                </div>
                <hr className="mobile-divider" />
                <Link to="/dashboard" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  📊 Dashboard
                </Link>
                <Link to="/research-papers" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  📄 Research Papers &amp; Analysis
                </Link>
                <Link to="/funding" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  🎯 AI Funding Matching
                </Link>
                <Link to="/patents" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  🧩 Patent Landscape &amp; Clusters
                </Link>
                <Link to="/profile" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  👤 Research Profile
                </Link>
                <hr className="mobile-divider" />
                <button type="button" className="mobile-logout-btn" onClick={handleLogout}>
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
