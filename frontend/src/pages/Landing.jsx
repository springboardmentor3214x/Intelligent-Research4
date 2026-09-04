import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    // Reveal on scroll using IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )

    const revealElements = document.querySelectorAll('.reveal-on-scroll')
    revealElements.forEach((el) => observer.observe(el))

    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowBackToTop(true)
      } else {
        setShowBackToTop(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const audiences = [
    {
      role: 'Researchers',
      desc: 'Discover funding and research opportunities',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10M6 10h10" />
        </svg>
      )
    },
    {
      role: 'Universities',
      desc: 'Track research activity and innovation potential',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      )
    },
    {
      role: 'Startup Founders',
      desc: 'Discover funding technology and commercialization opportunities',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      )
    },
    {
      role: 'Innovation Managers',
      desc: 'Monitor innovation portfolios and emerging technologies',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    },
    {
      role: 'Enterprises',
      desc: 'Identify technologies research opportunities and partnerships',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
        </svg>
      )
    }
  ]

  const workflowSteps = [
    { label: 'Research', sub: 'Scientific Inquiries & Topics' },
    { label: 'Intelligence', sub: 'Multi-Source Synthesis' },
    { label: 'Analysis', sub: 'Patent & Trend Analytics' },
    { label: 'Opportunities', sub: 'Funding & Translation' },
    { label: 'Innovation', sub: 'Market Commercialization' }
  ]

  const capabilities = [
    {
      id: 'funding-opportunity',
      title: 'Funding Opportunity Discovery',
      description: 'Discover relevant government grants research funding innovation funds accelerators venture programs and international funding opportunities.',
      badge: 'Grants & Funding',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 6v2m0 8v2" />
        </svg>
      )
    },
    {
      id: 'research-trends',
      title: 'Research Trend Intelligence',
      description: 'Analyze publication trends emerging topics research hotspots domain trends and citation activity.',
      badge: 'Publications & Hotspots',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      )
    },
    {
      id: 'patent-landscape',
      title: 'Patent Landscape Analysis',
      description: 'Explore patent landscapes patent trends competitor activity and technology domains to understand the intellectual property environment.',
      badge: 'IP & Prior Art',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      )
    },
    {
      id: 'tech-intelligence',
      title: 'Technology Intelligence',
      description: 'Identify emerging technologies understand technology maturity track adoption and discover innovation opportunities.',
      badge: 'TRL & Horizons',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      )
    },
    {
      id: 'innovation-scoring',
      title: 'Innovation Scoring',
      description: 'Evaluate innovation potential research impact technology readiness commercial viability and funding attractiveness.',
      badge: 'Impact & Readiness',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    },
    {
      id: 'commercialization',
      title: 'Commercialization Recommendations',
      description: 'Explore productization licensing startup creation and industry partnership opportunities.',
      badge: 'Spin-outs & Partnerships',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    }
  ]

  const howItWorks = [
    {
      number: '01',
      title: 'Build Your Research Profile',
      desc: "Understand the user's research domain interests and areas of expertise."
    },
    {
      number: '02',
      title: 'Discover Relevant Intelligence',
      desc: 'Connect research interests with funding opportunities research trends patents and technologies.'
    },
    {
      number: '03',
      title: 'Analyze Opportunities',
      desc: 'Use research patent technology and innovation intelligence to understand opportunities.'
    },
    {
      number: '04',
      title: 'Make Better Innovation Decisions',
      desc: 'Use insights and recommendations to identify funding commercialization and partnership opportunities.'
    }
  ]

  const journeyStages = [
    { title: 'Research & Ideas', icon: '💡' },
    { title: 'Funding', icon: '💰' },
    { title: 'Research Trends', icon: '📈' },
    { title: 'Patents & IP', icon: '📜' },
    { title: 'Technology Opportunities', icon: '⚡' },
    { title: 'Innovation', icon: '🎯' },
    { title: 'Commercialization', icon: '🚀' }
  ]

  const whyPoints = [
    {
      title: 'Centralized Intelligence',
      description: 'Bring research funding patent and technology intelligence together in one platform.'
    },
    {
      title: 'Data-Driven Decisions',
      description: 'Use structured intelligence to understand research opportunities and innovation potential.'
    },
    {
      title: 'Opportunity Discovery',
      description: 'Identify funding technology commercialization and partnership opportunities.'
    },
    {
      title: 'Research-to-Market Thinking',
      description: 'Connect research and innovation with potential commercialization pathways.'
    }
  ]

  const outcomes = [
    {
      pillar: 'Funding Discovery',
      highlight: 'Relevant funding opportunities',
      tag: 'Grants & Venture'
    },
    {
      pillar: 'Research Intelligence',
      highlight: 'Emerging trends and research hotspots',
      tag: 'Scientific Impact'
    },
    {
      pillar: 'Patent Intelligence',
      highlight: 'Patent and technology landscape insights',
      tag: 'Intellectual Property'
    },
    {
      pillar: 'Innovation Strategy',
      highlight: 'Commercialization and partnership opportunities',
      tag: 'Translation & Market'
    }
  ]

  return (
    <div className="landing-container">
      {/* 2. Hero Section */}
      <section className="landing-hero reveal-on-scroll" id="home">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span>AI-POWERED RESEARCH &amp; INNOVATION INTELLIGENCE</span>
          </div>
          <h1 className="hero-main-heading">
            Turn Research Into Innovation
          </h1>
          <p className="hero-sub-heading">
            Research Funding &amp; Innovation Intelligence Platform
          </p>
          <p className="hero-description">
            An intelligent platform that helps researchers, startups, universities, innovation centers and enterprises discover funding opportunities, understand research trends, analyze patents, identify emerging technologies and explore commercialization opportunities.
          </p>
          <div className="hero-actions">
            <button type="button" onClick={() => scrollToSection('platform')} className="primary-btn">
              Explore Platform
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <Link to="/login" className="secondary-btn">
              Login
            </Link>
          </div>
          <p className="hero-supporting-line">
            Funding Discovery &bull; Research Intelligence &bull; Patent Analytics &bull; Technology Intelligence
          </p>
        </div>

        {/* Abstract Network Visual */}
        <div className="hero-visual" aria-hidden="true">
          <div className="network-card">
            <div className="network-header">
              <span className="network-status-dot" />
              <span className="network-status-text">Intelligence Engine Active</span>
            </div>
            <div className="network-nodes-container">
              <div className="node-item node-central">
                <strong>RFI Engine</strong>
                <small>Synthesis</small>
              </div>
              <div className="node-item node-top-left">
                <strong>Funding</strong>
                <small>Grants &amp; Angels</small>
              </div>
              <div className="node-item node-top-right">
                <strong>Research</strong>
                <small>Publications &amp; Trends</small>
              </div>
              <div className="node-item node-bot-left">
                <strong>Patents</strong>
                <small>Prior Art &amp; IP</small>
              </div>
              <div className="node-item node-bot-right">
                <strong>Market</strong>
                <small>Spin-outs</small>
              </div>
              <svg className="network-lines-svg" viewBox="0 0 320 220">
                <line x1="160" y1="110" x2="60" y2="40" stroke="#08756f44" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="160" y1="110" x2="260" y2="40" stroke="#08756f44" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="160" y1="110" x2="60" y2="180" stroke="#08756f44" strokeWidth="2" strokeDasharray="4 4" />
                <line x1="160" y1="110" x2="260" y2="180" stroke="#08756f44" strokeWidth="2" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Trust / Audience Section */}
      <section className="landing-section audience-section reveal-on-scroll">
        <div className="section-header">
          <p className="eyebrow">ECOSYSTEM COLLABORATION</p>
          <h2 className="section-title">Built for the Research &amp; Innovation Ecosystem</h2>
        </div>
        <div className="audience-grid">
          {audiences.map((item, index) => (
            <div key={index} className="audience-card">
              <div className="audience-icon">{item.icon}</div>
              <h3 className="audience-role">{item.role}</h3>
              <p className="audience-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Platform Overview */}
      <section className="landing-section reveal-on-scroll" id="platform">
        <div className="section-header">
          <p className="eyebrow">UNIFIED INTELLIGENCE</p>
          <h2 className="section-title">One Platform for Research and Innovation Intelligence</h2>
          <p className="section-subtitle">
            Instead of navigating fragmented databases, siloed grant portals, and disconnected IP registries, our unified platform consolidates the entire continuum into actionable decision intelligence.
          </p>
        </div>

        <div className="platform-overview-content">
          <div className="overview-list">
            <div className="overview-item">
              <span className="check-bullet">✓</span>
              <span>Funding opportunity discovery</span>
            </div>
            <div className="overview-item">
              <span className="check-bullet">✓</span>
              <span>Research trend intelligence</span>
            </div>
            <div className="overview-item">
              <span className="check-bullet">✓</span>
              <span>Patent landscape analysis</span>
            </div>
            <div className="overview-item">
              <span className="check-bullet">✓</span>
              <span>Technology intelligence</span>
            </div>
            <div className="overview-item">
              <span className="check-bullet">✓</span>
              <span>Innovation scoring</span>
            </div>
            <div className="overview-item">
              <span className="check-bullet">✓</span>
              <span>Commercialization recommendations</span>
            </div>
          </div>

          {/* Workflow Sequence */}
          <div className="workflow-flowchart">
            <p className="workflow-label">Connected Workflow Pipeline</p>
            <div className="workflow-chain">
              {workflowSteps.map((step, idx) => (
                <div key={idx} className="workflow-step-wrapper">
                  <div className="workflow-node">
                    <strong>{step.label}</strong>
                    <small>{step.sub}</small>
                  </div>
                  {idx < workflowSteps.length - 1 && (
                    <div className="workflow-connector">
                      <span className="arrow-down-icon">↓</span>
                      <span className="arrow-right-icon">→</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Core Capabilities */}
      <section className="landing-section reveal-on-scroll" id="features">
        <div className="section-header">
          <p className="eyebrow">CORE CAPABILITIES</p>
          <h2 className="section-title">Everything You Need to Understand Research &amp; Innovation</h2>
          <p className="section-subtitle">
            Comprehensive analytics designed to evaluate feasibility, track academic velocity, analyze competitive patents, and de-risk market translation.
          </p>
        </div>

        <div className="features-grid">
          {capabilities.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-top">
                <div className="feature-icon">{feature.icon}</div>
                <span className="feature-badge">{feature.badge}</span>
              </div>
              <h3 className="feature-card-title">{feature.title}</h3>
              <p className="feature-card-desc">{feature.description}</p>
              <button 
                type="button" 
                onClick={() => scrollToSection('how-it-works')} 
                className="learn-more-btn"
              >
                Learn More <span>→</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 6. How It Works */}
      <section className="landing-section reveal-on-scroll" id="how-it-works">
        <div className="section-header">
          <p className="eyebrow">THE METHODOLOGY</p>
          <h2 className="section-title">How Research Intelligence Works</h2>
          <p className="section-subtitle">
            A 4-step structured framework translating technical domain expertise into high-impact translation pathways.
          </p>
        </div>

        <div className="how-it-works-grid">
          {howItWorks.map((step, index) => (
            <div key={index} className="how-card">
              <div className="how-number">{step.number}</div>
              <h3 className="how-title">{step.title}</h3>
              <p className="how-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Intelligence Across the Innovation Journey */}
      <section className="landing-section reveal-on-scroll" id="journey">
        <div className="section-header">
          <p className="eyebrow">LIFECYCLE CONTINUUM</p>
          <h2 className="section-title">From Research Discovery to Commercialization</h2>
        </div>

        <div className="journey-timeline">
          {journeyStages.map((stage, idx) => (
            <div key={idx} className="timeline-step">
              <div className="timeline-icon-badge">{stage.icon}</div>
              <div className="timeline-title">{stage.title}</div>
              {idx < journeyStages.length - 1 && <div className="timeline-line" />}
            </div>
          ))}
        </div>
        <p className="journey-footnote">
          The platform is designed to support different stages of the research and innovation lifecycle, providing continuous analytical support as concepts evolve from laboratory hypotheses to licensed technologies.
        </p>
      </section>

      {/* 8. Why This Platform */}
      <section className="landing-section reveal-on-scroll" id="about">
        <div className="section-header">
          <p className="eyebrow">WHY CHOOSE US</p>
          <h2 className="section-title">Why Research &amp; Innovation Intelligence?</h2>
        </div>

        <div className="why-grid">
          {whyPoints.map((item, index) => (
            <div key={index} className="why-card">
              <div className="why-dot" />
              <h3 className="why-card-title">{item.title}</h3>
              <p className="why-card-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Platform Outcomes */}
      <section className="landing-section reveal-on-scroll">
        <div className="section-header">
          <p className="eyebrow">MEASURABLE VALUE</p>
          <h2 className="section-title">Designed to Create Real Research Impact</h2>
        </div>

        <div className="outcomes-grid">
          {outcomes.map((item, index) => (
            <div key={index} className="outcome-card">
              <span className="outcome-tag">{item.tag}</span>
              <h3 className="outcome-pillar">{item.pillar}</h3>
              <p className="outcome-highlight">{item.highlight}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 10. CTA Section */}
      <section className="landing-cta-section reveal-on-scroll">
        <div className="cta-card">
          <p className="eyebrow cta-eyebrow">READY TO EXPLORE?</p>
          <h2 className="cta-heading">Turn Research Into Innovation</h2>
          <p className="cta-description">
            Discover funding opportunities, emerging technologies, research trends and innovation possibilities through one intelligent platform.
          </p>
          <div className="cta-actions">
            <Link to="/register" className="primary-btn cta-btn">
              Get Started
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link to="/login" className="secondary-btn cta-secondary-btn">
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className="landing-footer reveal-on-scroll">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="brand" style={{ pointerEvents: 'none' }}>
              <span className="brand-mark">RI</span>
              <span className="brand-title">Research Intelligence</span>
            </div>
            <p className="footer-tagline">
              Research Funding &amp; Innovation Intelligence Platform
            </p>
          </div>

          <div className="footer-nav">
            <button type="button" onClick={() => scrollToSection('home')} className="footer-link-btn">Home</button>
            <button type="button" onClick={() => scrollToSection('platform')} className="footer-link-btn">Platform</button>
            <button type="button" onClick={() => scrollToSection('features')} className="footer-link-btn">Features</button>
            <button type="button" onClick={() => scrollToSection('about')} className="footer-link-btn">About</button>
            <Link to="/login" className="footer-link-btn">Login</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-motto">Research. Funding. Innovation.</p>
          <p className="footer-copyright">&copy; {new Date().getFullYear()} Research Intelligence Platform. All rights reserved.</p>
        </div>
      </footer>

      {/* Back to top floating button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="back-to-top-btn"
          aria-label="Scroll back to top"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  )
}
