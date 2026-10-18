import React from 'react'
import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const handleLaunchAssistant = (prompt) => {
    window.dispatchEvent(
      new CustomEvent('launch-ri-assistant', {
        detail: { prompt: prompt || 'What can I do on the ResearchIntel platform?' },
      })
    )
  }

  return (
    <footer className="platform-enterprise-footer" role="contentinfo">
      <div className="footer-inner-container">
        {/* Top Branding and Navigation Grid */}
        <div className="footer-main-grid">
          {/* Brand Column */}
          <div className="footer-brand-pane">
            <Link to="/" className="footer-brand-logo" aria-label="ResearchIntel Home">
              <img src="/logo.png" alt="ResearchIntel Logo" className="footer-brand-img" />
              <span className="footer-brand-name">ResearchIntel</span>
            </Link>
            <p className="footer-brand-tagline">
              AI-powered research, funding, patent and innovation intelligence platform connecting scientific discovery to real-world impact.
            </p>
            <div className="footer-brand-mission-pill">
              <span className="mission-dot" />
              <span>Evidence-Based Decision Ecosystem</span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="footer-links-grid">
            {/* Column 1: Platform & Intelligence */}
            <div className="footer-column">
              <h4 className="footer-column-heading">Intelligence</h4>
              <ul className="footer-link-list">
                <li><Link to="/research-papers" className="footer-nav-link">Research Literature</Link></li>
                <li><Link to="/funding" className="footer-nav-link">Funding Matching</Link></li>
                <li><Link to="/patents" className="footer-nav-link">Patent Landscape</Link></li>
                <li><Link to="/technologies" className="footer-nav-link">Technology Intelligence</Link></li>
                <li><Link to="/technologies/maturity" className="footer-nav-link">Maturity &amp; S-Curve</Link></li>
                <li><Link to="/innovation" className="footer-nav-link">Innovation Assessment</Link></li>
                <li><Link to="/commercialization" className="footer-nav-link">Commercialization</Link></li>
                <li><Link to="/reports" className="footer-nav-link">Reports &amp; Dossiers</Link></li>
              </ul>
            </div>

            {/* Column 2: Platform & About */}
            <div className="footer-column">
              <h4 className="footer-column-heading">Company</h4>
              <ul className="footer-link-list">
                <li><Link to="/about" className="footer-nav-link">About Us</Link></li>
                <li><Link to="/contact" className="footer-nav-link">Contact Us</Link></li>
                <li><Link to="/compare" className="footer-nav-link">Compare Technologies</Link></li>
                <li><Link to="/technologies/adoption" className="footer-nav-link">Market Adoption</Link></li>
                <li><Link to="/technologies/trends" className="footer-nav-link">Growth Trends</Link></li>
              </ul>
            </div>

            {/* Column 3: Support & AI Assistant */}
            <div className="footer-column">
              <h4 className="footer-column-heading">Support &amp; Copilot</h4>
              <ul className="footer-link-list">
                <li><Link to="/contact" className="footer-nav-link">Help &amp; Contact</Link></li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleLaunchAssistant('What can this platform do?')}
                    className="footer-action-button"
                  >
                    ✨ AI Assistant Copilot
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleLaunchAssistant('How can I find funding opportunities?')}
                    className="footer-action-button"
                  >
                    🎯 Find Grants Assistant
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleLaunchAssistant('How does patent intelligence work?')}
                    className="footer-action-button"
                  >
                    📜 Patent Intelligence Guide
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Platform Team */}
            <div className="footer-column">
              <h4 className="footer-column-heading">Core Team</h4>
              <ul className="footer-link-list footer-team-list">
                <li>
                  <span className="team-person-name">Tarun Chaudhari</span>
                  <small className="team-person-role">AI &amp; Platform Development</small>
                </li>
                <li>
                  <span className="team-person-name">Yug Thakkar</span>
                  <small className="team-person-role">Research &amp; Platform Development</small>
                </li>
                <li>
                  <span className="team-person-name">Priyanka Pradhan</span>
                  <small className="team-person-role">Research &amp; Innovation</small>
                </li>
                <li>
                  <span className="team-person-name">Shruthi Thammi</span>
                  <small className="team-person-role">Research &amp; Innovation</small>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Motto & Legal */}
        <div className="footer-bottom-bar">
          <div className="footer-motto-tag">
            <span>Research</span>
            <span className="motto-separator">&bull;</span>
            <span>Funding</span>
            <span className="motto-separator">&bull;</span>
            <span>Patents</span>
            <span className="motto-separator">&bull;</span>
            <span>Technology</span>
            <span className="motto-separator">&bull;</span>
            <span>Innovation</span>
            <span className="motto-separator">&bull;</span>
            <span>Commercialization</span>
          </div>

          <div className="footer-bottom-right">
            <span className="footer-copyright-text">
              &copy; {currentYear} ResearchIntel Platform. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
