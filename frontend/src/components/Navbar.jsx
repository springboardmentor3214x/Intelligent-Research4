import { useContext, useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()

  // State for mobile menu, dropdowns, and scrolled glass effect
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [researchDropdownOpen, setResearchDropdownOpen] = useState(false)
  const [fundingDropdownOpen, setFundingDropdownOpen] = useState(false)
  const [techDropdownOpen, setTechDropdownOpen] = useState(false)

  const researchRef = useRef(null)
  const fundingRef = useRef(null)
  const techRef = useRef(null)

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
      if (techRef.current && !techRef.current.contains(event.target)) {
        setTechDropdownOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setResearchDropdownOpen(false)
        setFundingDropdownOpen(false)
        setTechDropdownOpen(false)
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

  // Close mobile menu and dropdowns on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setResearchDropdownOpen(false)
    setFundingDropdownOpen(false)
    setTechDropdownOpen(false)
  }, [location.pathname])

  const isCurrent = (path) => location.pathname === path

  const handleNavClick = (sectionId) => {
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`)
    } else {
      const el = document.getElementById(sectionId)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileMenuOpen(false)
  }

  return (
    <header className={`navbar ${scrolled ? 'scrolled-glass' : ''}`}>
      <div className="navbar-inner">
        {/* Brand / Logo */}
        <Link to="/" className="brand" onClick={() => setMobileMenuOpen(false)}>
          <div className="brand-mark">
            <span>RI</span>
          </div>
          <span className="brand-title">ResearchIntel</span>
        </Link>

        {/* Navigation Links */}
        {!user ? (
          <nav className="nav-links" aria-label="Public Navigation">
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
              to="/technologies"
              className={`nav-link-btn ${isCurrent('/technologies') || isCurrent('/technologies/maturity') || isCurrent('/technologies/adoption') || isCurrent('/technologies/trends') ? 'active' : ''}`}
            >
              Technology Intelligence
            </Link>
            <Link
              to="/innovation"
              className={`nav-link-btn ${isCurrent('/innovation') || isCurrent('/innovation-scoring') ? 'active' : ''}`}
            >
              Innovation Intelligence
            </Link>
            <Link
              to="/commercialization"
              className={`nav-link-btn ${isCurrent('/commercialization') ? 'active' : ''}`}
            >
              Commercialization
            </Link>
          </nav>
        ) : (
          /* Authenticated Navigation with Dropdowns */
          <nav className="nav-links" aria-label="Platform Navigation">
            <Link
              to="/dashboard"
              className={`nav-link-btn ${isCurrent('/dashboard') ? 'active' : ''}`}
            >
              Dashboard
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
                  setTechDropdownOpen(false)
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
                      <strong>Papers &amp; Literature</strong>
                      <small>Semantic Search &amp; Citations</small>
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
                      <small>Domain Interests &amp; Publications</small>
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
                  setTechDropdownOpen(false)
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

            {/* Technology Intelligence Dropdown */}
            <div className="nav-dropdown" ref={techRef}>
              <button
                type="button"
                className={`nav-link-btn dropdown-toggle ${isCurrent('/technologies') || isCurrent('/technologies/maturity') || isCurrent('/technologies/adoption') || isCurrent('/technologies/trends') ? 'active' : ''}`}
                onClick={() => {
                  setTechDropdownOpen(!techDropdownOpen)
                  setResearchDropdownOpen(false)
                  setFundingDropdownOpen(false)
                }}
                aria-expanded={techDropdownOpen}
                aria-haspopup="true"
              >
                Tech Intelligence
                <svg
                  className={`dropdown-chevron ${techDropdownOpen ? 'rotated' : ''}`}
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

              {techDropdownOpen && (
                <div className="dropdown-menu" role="menu">
                  <Link
                    to="/technologies"
                    className={`dropdown-item ${isCurrent('/technologies') ? 'active-item' : ''}`}
                    role="menuitem"
                    onClick={() => setTechDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">⚡</div>
                    <div>
                      <strong>Overview &amp; Landscape</strong>
                      <small>Cross-Domain Technology Intelligence</small>
                    </div>
                  </Link>
                  <Link
                    to="/technologies/maturity"
                    className={`dropdown-item ${isCurrent('/technologies/maturity') ? 'active-item' : ''}`}
                    role="menuitem"
                    onClick={() => setTechDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">📊</div>
                    <div>
                      <strong>Maturity &amp; S-Curve</strong>
                      <small>6-Indicator Empirical Progression</small>
                    </div>
                  </Link>
                  <Link
                    to="/technologies/adoption"
                    className={`dropdown-item ${isCurrent('/technologies/adoption') ? 'active-item' : ''}`}
                    role="menuitem"
                    onClick={() => setTechDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">🏢</div>
                    <div>
                      <strong>Market Adoption</strong>
                      <small>Industrial &amp; Commercialization Velocity</small>
                    </div>
                  </Link>
                  <Link
                    to="/technologies/trends"
                    className={`dropdown-item ${isCurrent('/technologies/trends') ? 'active-item' : ''}`}
                    role="menuitem"
                    onClick={() => setTechDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">📈</div>
                    <div>
                      <strong>Growth Trends</strong>
                      <small>Longitudinal Trajectory &amp; Forecasts</small>
                    </div>
                  </Link>
                  <Link
                    to="/innovation"
                    className={`dropdown-item ${isCurrent('/innovation') ? 'active-item' : ''}`}
                    role="menuitem"
                    onClick={() => setTechDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">🚀</div>
                    <div>
                      <strong>Innovation Scoring</strong>
                      <small>Multi-Factor Engine</small>
                    </div>
                  </Link>
                  <Link
                    to="/commercialization"
                    className={`dropdown-item ${isCurrent('/commercialization') ? 'active-item' : ''}`}
                    role="menuitem"
                    onClick={() => setTechDropdownOpen(false)}
                  >
                    <div className="dropdown-item-icon">💡</div>
                    <div>
                      <strong>Commercialization</strong>
                      <small>Applications, Products &amp; Startups</small>
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
                  <polyline points="12 5 19 12 19" />
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
                <Link to="/technologies" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  ⚡ Technology Intelligence
                </Link>
                <Link to="/innovation" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  🚀 Innovation Intelligence
                </Link>
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
                <Link to="/technologies" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  ⚡ Technology Intelligence
                </Link>
                <Link to="/technologies/maturity" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  📊 Technology Maturity
                </Link>
                <Link to="/technologies/adoption" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  🏢 Market Adoption
                </Link>
                <Link to="/technologies/trends" className="mobile-link" onClick={() => setMobileMenuOpen(false)}>
                  📈 Growth Trends
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
