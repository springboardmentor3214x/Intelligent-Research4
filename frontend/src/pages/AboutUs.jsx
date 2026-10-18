import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import './AboutUs.css'

export default function AboutUs() {
  const [activeStep, setActiveStep] = useState(0)

  // Document metadata for SEO
  useEffect(() => {
    document.title = 'About Us | ResearchIntel'
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Meet the team behind ResearchIntel and learn how our AI-powered research and innovation intelligence platform connects research, funding, patents, technology and commercialization.'
      )
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleLaunchAssistant = (prompt) => {
    window.dispatchEvent(
      new CustomEvent('launch-ri-assistant', {
        detail: { prompt: prompt || 'What can I do on the ResearchIntel platform?' },
      })
    )
  }

  const missionFlow = [
    {
      id: 'research',
      title: 'Research',
      icon: '📄',
      summary: 'Academic literature, citations & empirical findings',
      tag: 'Discovery Stage',
      route: '/research-papers',
      stepNum: 1,
    },
    {
      id: 'funding',
      title: 'Funding',
      icon: '🎯',
      summary: 'Grant opportunities & funding relevance matching',
      tag: 'Capital Matching',
      route: '/funding',
      stepNum: 2,
    },
    {
      id: 'patents',
      title: 'Patents',
      icon: '📜',
      summary: 'Prior-art clustering & global assignee white spaces',
      tag: 'IP Intelligence',
      route: '/patents',
      stepNum: 3,
    },
    {
      id: 'technology',
      title: 'Technology',
      icon: '⚡',
      summary: 'Emerging technology tracking & S-Curve maturity',
      tag: 'Horizon Scanning',
      route: '/technologies',
      stepNum: 4,
    },
    {
      id: 'innovation',
      title: 'Innovation',
      icon: '🚀',
      summary: '5-factor weighted evidence-based innovation assessment',
      tag: 'Scoring Engine',
      route: '/innovation',
      stepNum: 5,
    },
    {
      id: 'commercialization',
      title: 'Commercialization',
      icon: '💡',
      summary: 'Productization, venture spinouts & corporate licensing',
      tag: 'Real-World Impact',
      route: '/commercialization',
      stepNum: 6,
    },
  ]

  const featureCards = [
    {
      icon: '🔬',
      title: 'Research Intelligence',
      items: [
        'Discover research papers',
        'Research trends',
        'Research domains',
        'Publication insights',
      ],
      link: '/research-papers',
      actionText: 'Explore Research Literature →',
    },
    {
      icon: '💰',
      title: 'Funding Intelligence',
      items: [
        'Funding opportunities',
        'Grant discovery',
        'Funding relevance',
        'Upcoming opportunities',
      ],
      link: '/funding',
      actionText: 'Explore Grants →',
    },
    {
      icon: '📜',
      title: 'Patent Intelligence',
      items: [
        'Patent landscape',
        'Patent activity',
        'Organizations',
        'Technology areas',
      ],
      link: '/patents',
      actionText: 'Explore Prior Art →',
    },
    {
      icon: '⚙️',
      title: 'Technology Intelligence',
      items: [
        'Emerging technologies',
        'Technology maturity',
        'Adoption signals',
        'Technology opportunities',
      ],
      link: '/technologies',
      actionText: 'Explore Tech Maturity →',
    },
    {
      icon: '🚀',
      title: 'Innovation Assessment',
      items: [
        'Innovation scoring',
        'Evidence-based assessment',
        'Technology comparison',
        'Opportunity analysis',
      ],
      link: '/innovation',
      actionText: 'Calculate Innovation Score →',
    },
    {
      icon: '💡',
      title: 'Commercialization',
      items: [
        'Product opportunities',
        'Licensing opportunities',
        'Startup opportunities',
        'Industry partnerships',
      ],
      link: '/commercialization',
      actionText: 'Explore Commercialization →',
    },
    {
      icon: '✨',
      title: 'AI Assistant',
      items: [
        'Ask questions',
        'Discover platform features',
        'Find relevant intelligence',
        'Navigate the platform',
        'Generate intelligence summaries',
      ],
      actionText: 'Launch Copilot ✨',
      onClick: () => handleLaunchAssistant('What can this platform do?'),
    },
    {
      icon: '📑',
      title: 'Reports',
      items: [
        'Research reports',
        'Funding reports',
        'Patent reports',
        'Technology reports',
        'Full intelligence reports',
      ],
      link: '/reports',
      actionText: 'Open Reports Center →',
    },
  ]

  const teamMembers = [
    {
      name: 'Tarun Chaudhari',
      role: 'Full-Stack & AI Integration Lead',
      image: '/Tarun.jpg',
      email: 'traunchaudhari1313@gmail.com',
      phone: '9518391245',
      github: 'https://github.com/tarun-1313',
      linkedin: 'https://www.linkedin.com/in/tarun-chaudhari191313/',
      description:
        'Leads frontend and backend development, AI integration, platform architecture and cross-platform feature integration.',
    },
    {
      name: 'Yug Thakkar',
      role: 'Data & Database Engineering Lead',
      image: '/Yug.png',
      email: 'yug.rt@somaiya.edu',
      phone: '9653111370',
      github: 'https://github.com/yug2405',
      linkedin: null,
      description:
        'Responsible for database architecture, data models, data management and supporting the platform\'s intelligence workflows.',
    },
    {
      name: 'Priyanka Pradhan',
      role: 'Backend & Intelligence Engineer',
      image: null,
      email: null,
      phone: null,
      github: 'https://github.com/Priyanka-204',
      linkedin: null,
      description:
        'Works on backend services, APIs, business logic and intelligence-processing workflows.',
    },
    {
      name: 'Shruthi Thammi',
      role: 'Backend & Systems Integration Engineer',
      image: null,
      email: null,
      phone: null,
      github: 'https://github.com/Shruthi-1005',
      linkedin: null,
      description:
        'Works on backend services, API integration, system workflows and reliable platform functionality.',
    },
  ]

  const values = [
    {
      icon: '🚀',
      title: 'Innovation',
      description: 'We use technology to solve meaningful research and innovation problems.',
    },
    {
      icon: '🎯',
      title: 'Evidence',
      description: 'Intelligence should be grounded in reliable and understandable evidence.',
    },
    {
      icon: '🤝',
      title: 'Collaboration',
      description: 'Great platforms are built by connecting different skills and perspectives.',
    },
    {
      icon: '⚡',
      title: 'Impact',
      description: 'Research and innovation should create opportunities beyond information discovery.',
    },
  ]

  return (
    <div className="about-us-page">
      {/* =========================================================
          1. HERO SECTION
          ========================================================= */}
      <section className="about-hero-section">
        <div className="about-hero-inner">
          <div className="about-hero-content">
            <div className="eyebrow-pill">
              <span className="eyebrow-pulse" />
              INTELLIGENT RESEARCH &amp; INNOVATION
            </div>
            <h1 className="about-hero-title">
              Transforming Research Into Intelligence
            </h1>
            <p className="about-hero-subtitle">
              An AI-powered research, funding and innovation intelligence platform designed to connect research, funding, patents, technologies and commercialization opportunities.
            </p>
            <div className="about-hero-actions">
              <Link to="/technologies" className="about-primary-btn">
                <span>Explore Platform</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
              <a href="#team-section" className="about-secondary-btn">
                <span>Meet Our Team</span>
              </a>
            </div>
          </div>

          {/* Hero Visual: Connected AI & Research Mesh Graphic */}
          <div className="about-hero-visual" aria-hidden="true">
            <div className="connected-mesh-graphic">
              <div className="mesh-center-orb">
                <div className="center-orb-core">
                  <span>AI</span>
                  <small>Engine</small>
                </div>
                <div className="center-orb-ring ring-1" />
                <div className="center-orb-ring ring-2" />
              </div>

              {/* Satellite nodes */}
              <div className="mesh-node node-research">
                <span className="node-icon">📄</span>
                <span className="node-label">Research</span>
              </div>
              <div className="mesh-node node-funding">
                <span className="node-icon">🎯</span>
                <span className="node-label">Funding</span>
              </div>
              <div className="mesh-node node-patents">
                <span className="node-icon">📜</span>
                <span className="node-label">Patents</span>
              </div>
              <div className="mesh-node node-tech">
                <span className="node-icon">⚡</span>
                <span className="node-label">Technology</span>
              </div>
              <div className="mesh-node node-innovation">
                <span className="node-icon">🚀</span>
                <span className="node-label">Innovation</span>
              </div>
              <div className="mesh-node node-commercial">
                <span className="node-icon">💡</span>
                <span className="node-label">Commercial</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          2. OUR MISSION (Placed before Vision)
          ========================================================= */}
      <section className="about-section mission-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">WHAT DRIVES US</span>
            <h2 className="section-main-heading">Our Mission</h2>
            <p className="section-main-lead">
              To simplify the way research and innovation intelligence is discovered, connected and used. ResearchIntel brings together research knowledge, funding opportunities, patent intelligence, technology insights, innovation assessment and commercialization intelligence into one connected platform.
            </p>
          </div>

          <div className="mission-cards-grid">
            <div className="mission-pillar-card">
              <div className="mission-pillar-icon" style={{ background: '#eff6ff', color: '#0284c7' }}>
                🔗
              </div>
              <h3 className="mission-pillar-title">CONNECT</h3>
              <p className="mission-pillar-desc">
                Bring fragmented research and innovation information together.
              </p>
            </div>

            <div className="mission-pillar-card">
              <div className="mission-pillar-icon" style={{ background: '#ecfdf5', color: '#0d9488' }}>
                🧠
              </div>
              <h3 className="mission-pillar-title">INTELLIGENT</h3>
              <p className="mission-pillar-desc">
                Use AI and evidence-driven analysis to help users understand complex information.
              </p>
            </div>

            <div className="mission-pillar-card">
              <div className="mission-pillar-icon" style={{ background: '#fdf4ff', color: '#9333ea' }}>
                🎯
              </div>
              <h3 className="mission-pillar-title">IMPACT</h3>
              <p className="mission-pillar-desc">
                Help transform research and ideas into meaningful opportunities and real-world outcomes.
              </p>
            </div>
          </div>

          {/* 3-in-a-row Clean Non-Scrolling Flow Grid */}
          <div className="mission-flow-wrapper">
            <div className="mission-grid-header">
              <span className="grid-header-badge">6-STAGE INTELLIGENCE LIFECYCLE</span>
              <h3 className="grid-header-title">Connected Flow From Research to Commercialization</h3>
            </div>
            <div className="mission-3col-grid">
              {missionFlow.map((step, idx) => (
                <div
                  key={step.id}
                  className={`flow-node-card ${activeStep === idx ? 'active-flow-node' : ''}`}
                  onClick={() => setActiveStep(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveStep(idx)}
                >
                  <div className="flow-card-top">
                    <div className="flow-node-icon-box">
                      <span>{step.icon}</span>
                    </div>
                    <span className="flow-step-number">0{step.stepNum}</span>
                  </div>
                  <span className="flow-node-title">{step.title}</span>
                  <span className="flow-node-tag">{step.tag}</span>
                  <p className="flow-node-desc">{step.summary}</p>
                  <Link to={step.route} className="flow-node-link">
                    Explore {step.title} &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          3. OUR VISION
          ========================================================= */}
      <section className="about-section vision-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">WHERE WE ARE HEADED</span>
            <h2 className="section-main-heading">Our Vision</h2>
            <p className="section-main-lead vision-main-text">
              To build an intelligent research and innovation ecosystem where knowledge, funding, patents, emerging technologies, and commercialization opportunities are seamlessly connected, enabling researchers, startups, innovators, and organizations to discover opportunities, make evidence-based decisions, and turn ideas into real-world impact.
            </p>
            <p className="vision-supporting-line">
              Connecting knowledge, opportunity and innovation through intelligent technology.
            </p>
          </div>

          <div className="vision-cards-grid">
            <div className="vision-card">
              <div className="vision-icon-wrap" style={{ background: '#ecfdf5', color: '#0d9488' }}>
                🔍
              </div>
              <h3 className="vision-card-title">DISCOVER</h3>
              <p className="vision-card-desc">
                Discover relevant research, funding opportunities, patents, emerging technologies and new areas of innovation.
              </p>
            </div>

            <div className="vision-card">
              <div className="vision-icon-wrap" style={{ background: '#eff6ff', color: '#0284c7' }}>
                🧠
              </div>
              <h3 className="vision-card-title">UNDERSTAND</h3>
              <p className="vision-card-desc">
                Connect evidence across research, funding, patents and technology to understand opportunities, trends and relationships.
              </p>
            </div>

            <div className="vision-card">
              <div className="vision-icon-wrap" style={{ background: '#fdf4ff', color: '#9333ea' }}>
                ⚡
              </div>
              <h3 className="vision-card-title">ACT</h3>
              <p className="vision-card-desc">
                Turn intelligence into informed decisions, innovation opportunities and practical commercialization pathways.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          4. PLATFORM PURPOSE (WHY RESEARCHINTEL?)
          ========================================================= */}
      <section className="about-section why-built-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">WHY RESEARCHINTEL?</span>
            <h2 className="section-main-heading">From Information to Intelligence</h2>
            <p className="section-main-lead">
              Research, funding, patents, technologies and commercialization opportunities often exist across separate sources. ResearchIntel connects these intelligence areas to help users move from searching for information to understanding relationships, identifying opportunities and making informed decisions.
            </p>
          </div>

          {/* Connected Intelligence Visual Formula */}
          <div className="intelligence-formula-card">
            <div className="formula-inputs-grid">
              <div className="formula-input-item">
                <span className="formula-icon">📄</span>
                <span>Research</span>
              </div>
              <span className="formula-operator">+</span>
              <div className="formula-input-item">
                <span className="formula-icon">🎯</span>
                <span>Funding</span>
              </div>
              <span className="formula-operator">+</span>
              <div className="formula-input-item">
                <span className="formula-icon">📜</span>
                <span>Patents</span>
              </div>
              <span className="formula-operator">+</span>
              <div className="formula-input-item">
                <span className="formula-icon">⚡</span>
                <span>Technology</span>
              </div>
              <span className="formula-operator">+</span>
              <div className="formula-input-item">
                <span className="formula-icon">🚀</span>
                <span>Innovation</span>
              </div>
              <span className="formula-operator">+</span>
              <div className="formula-input-item">
                <span className="formula-icon">💡</span>
                <span>Commercialization</span>
              </div>
            </div>

            <div className="formula-down-arrow">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </div>

            <div className="formula-pipeline-steps">
              <div className="pipeline-step-box step-connected">
                <span className="step-badge">STAGE 1</span>
                <strong>CONNECTED INTELLIGENCE</strong>
                <small>Unified cross-domain knowledge graph</small>
              </div>
              <div className="pipeline-step-arrow">&rarr;</div>
              <div className="pipeline-step-box step-decisions">
                <span className="step-badge">STAGE 2</span>
                <strong>BETTER DECISIONS</strong>
                <small>Empirical, evidence-backed evaluation</small>
              </div>
              <div className="pipeline-step-arrow">&rarr;</div>
              <div className="pipeline-step-box step-impact">
                <span className="step-badge">STAGE 3</span>
                <strong>REAL-WORLD IMPACT</strong>
                <small>Commercialization, grants &amp; new ventures</small>
              </div>
            </div>
          </div>

          <div className="before-after-layout" style={{ marginTop: '3.5rem' }}>
            {/* Before Box */}
            <div className="comparison-box before-box">
              <div className="comparison-badge before-badge">
                <span>BEFORE</span>
              </div>
              <h3 className="comparison-title">Fragmented Information Silos</h3>
              <p className="comparison-desc">Traditional manual synthesis across disparate portals</p>
              <ul className="comparison-list">
                <li><span className="cross-bullet">✕</span> Research papers in disconnected repositories</li>
                <li><span className="cross-bullet">✕</span> Separate funding portals with obscure eligibility</li>
                <li><span className="cross-bullet">✕</span> Separate patent databases requiring complex querying</li>
                <li><span className="cross-bullet">✕</span> Scattered technology and adoption information</li>
                <li><span className="cross-bullet">✕</span> Time-consuming manual cross-correlation &amp; analysis</li>
              </ul>
            </div>

            {/* Transition Divider */}
            <div className="comparison-divider" aria-hidden="true">
              <div className="divider-circle">
                <span>VS</span>
              </div>
            </div>

            {/* After Box */}
            <div className="comparison-box after-box">
              <div className="comparison-badge after-badge">
                <span>AFTER</span>
              </div>
              <h3 className="comparison-title">Connected Research Intelligence</h3>
              <p className="comparison-desc">Unified, AI-orchestrated evidence ecosystem</p>
              <ul className="comparison-list">
                <li><span className="check-bullet-green">✓</span> Connected research intelligence &amp; literature</li>
                <li><span className="check-bullet-green">✓</span> Intelligent funding discovery &amp; grant matching</li>
                <li><span className="check-bullet-green">✓</span> Global patent intelligence &amp; prior-art clustering</li>
                <li><span className="check-bullet-green">✓</span> Technology maturity &amp; S-Curve analysis</li>
                <li><span className="check-bullet-green">✓</span> Multi-factor empirical innovation assessment</li>
                <li><span className="check-bullet-green">✓</span> Actionable commercialization insights &amp; spinouts</li>
                <li><span className="check-bullet-green">✓</span> AI-assisted discovery &amp; natural language copilot</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          5. TECHNOLOGY CAPABILITIES (BUILT FOR INTELLIGENCE)
          ========================================================= */}
      <section className="about-section platform-capabilities-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">BUILT FOR INTELLIGENCE</span>
            <h2 className="section-main-heading">One Platform. Connected Intelligence.</h2>
            <p className="section-main-lead">
              A unified analytical architecture transforming disparate academic and market datasets into actionable innovation intelligence.
            </p>
          </div>

          <div className="capabilities-grid">
            {featureCards.map((feat, i) => (
              <div key={i} className="capability-card">
                <div className="capability-card-header">
                  <span className="capability-icon">{feat.icon}</span>
                  <h3 className="capability-title">{feat.title}</h3>
                </div>
                <ul className="capability-list">
                  {feat.items.map((item, idx) => (
                    <li key={idx}>
                      <span className="check-bullet">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="capability-footer">
                  {feat.link ? (
                    <Link to={feat.link} className="capability-action-link">
                      {feat.actionText}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={feat.onClick}
                      className="capability-action-btn"
                    >
                      {feat.actionText}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          6. PLATFORM ECOSYSTEM GRAPH (Symmetric 4+4 Layout)
          ========================================================= */}
      <section className="about-section ecosystem-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">INTELLIGENCE NETWORK</span>
            <h2 className="section-main-heading">The Platform Ecosystem</h2>
            <p className="section-main-lead">
              A continuous intelligence loop connecting scientific researchers to industrial commercialization, with ResearchIntel AI Assistant at the center connecting all areas.
            </p>
          </div>

          <div className="ecosystem-architecture-visual">
            <div className="ecosystem-top-actor">
              <div className="actor-badge">
                <span>🎓 Researchers &amp; Academic Innovators</span>
              </div>
            </div>

            <div className="ecosystem-flow-line" />

            {/* Symmetrical 3-Column Balanced Ecosystem Hub */}
            <div className="ecosystem-symmetric-hub">
              {/* Left Column (4 Modules) */}
              <div className="ecosystem-col eco-left-col">
                <div className="eco-orbital-node">
                  <span className="eco-icon">📄</span>
                  <div className="eco-node-text">
                    <strong>Research Intelligence</strong>
                    <small>Papers &amp; citations</small>
                  </div>
                </div>
                <div className="eco-orbital-node">
                  <span className="eco-icon">🎯</span>
                  <div className="eco-node-text">
                    <strong>Funding Intelligence</strong>
                    <small>Grants &amp; schemes</small>
                  </div>
                </div>
                <div className="eco-orbital-node">
                  <span className="eco-icon">📜</span>
                  <div className="eco-node-text">
                    <strong>Patent Intelligence</strong>
                    <small>Prior art &amp; assignees</small>
                  </div>
                </div>
                <div className="eco-orbital-node">
                  <span className="eco-icon">⚡</span>
                  <div className="eco-node-text">
                    <strong>Technology Intelligence</strong>
                    <small>Maturity &amp; signals</small>
                  </div>
                </div>
              </div>

              {/* Center AI Engine Hub */}
              <div
                className="ecosystem-center-hub"
                onClick={() => handleLaunchAssistant('What can this platform do?')}
                role="button"
                tabIndex={0}
                title="Click to launch ResearchIntel AI Assistant"
              >
                <div className="hub-spark-badge">✨ Central Intelligence Core</div>
                <div className="hub-core-icon">✨</div>
                <strong>ResearchIntel AI Assistant</strong>
                <p className="hub-subtext">
                  Semantic Reasoning, Real-Time Synthesis &amp; Cross-Domain Copilot
                </p>
                <div className="hub-pulse-button">
                  <span>Launch Copilot</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>

              {/* Right Column (4 Modules) */}
              <div className="ecosystem-col eco-right-col">
                <div className="eco-orbital-node">
                  <span className="eco-icon">🚀</span>
                  <div className="eco-node-text">
                    <strong>Innovation Assessment</strong>
                    <small>Multi-factor scoring</small>
                  </div>
                </div>
                <div className="eco-orbital-node">
                  <span className="eco-icon">💡</span>
                  <div className="eco-node-text">
                    <strong>Commercialization</strong>
                    <small>Spinoffs &amp; licensing</small>
                  </div>
                </div>
                <div className="eco-orbital-node">
                  <span className="eco-icon">📑</span>
                  <div className="eco-node-text">
                    <strong>Reports Center</strong>
                    <small>Intelligence dossiers</small>
                  </div>
                </div>
                <div className="eco-orbital-node">
                  <span className="eco-icon">📊</span>
                  <div className="eco-node-text">
                    <strong>Advanced Analytics</strong>
                    <small>Comparative insights</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="ecosystem-flow-line" />

            <div className="ecosystem-bottom-actor">
              <div className="actor-badge">
                <span>🏢 Startups / Organizations / Industry</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          7. HOW WE BUILD (Team Responsibility Visual)
          ========================================================= */}
      <section className="about-section responsibility-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">COLLABORATIVE ARCHITECTURE</span>
            <h2 className="section-main-heading">How We Build</h2>
            <p className="section-main-lead">
              A synchronized division of engineering and data disciplines powering every intelligence layer.
            </p>
          </div>

          <div className="responsibility-grid">
            <div className="responsibility-card">
              <div className="responsibility-icon">💻</div>
              <span className="responsibility-role-label">Full-Stack &amp; AI Integration</span>
              <strong className="responsibility-name">Tarun Chaudhari</strong>
            </div>
            <div className="responsibility-card">
              <div className="responsibility-icon">🗄️</div>
              <span className="responsibility-role-label">Data &amp; Database Engineering</span>
              <strong className="responsibility-name">Yug Thakkar</strong>
            </div>
            <div className="responsibility-card">
              <div className="responsibility-icon">⚙️</div>
              <span className="responsibility-role-label">Backend &amp; Intelligence</span>
              <strong className="responsibility-name">Priyanka Pradhan</strong>
            </div>
            <div className="responsibility-card">
              <div className="responsibility-icon">🔧</div>
              <span className="responsibility-role-label">Backend &amp; Systems Integration</span>
              <strong className="responsibility-name">Shruthi Thammi</strong>
            </div>
          </div>

          {/* Data to Impact Flow Track */}
          <div className="data-impact-flow-bar">
            <div className="impact-step">
              <span className="impact-dot" />
              <span>Research</span>
            </div>
            <div className="impact-arrow">&rarr;</div>
            <div className="impact-step">
              <span className="impact-dot" />
              <span>Data</span>
            </div>
            <div className="impact-arrow">&rarr;</div>
            <div className="impact-step">
              <span className="impact-dot" />
              <span>Intelligence</span>
            </div>
            <div className="impact-arrow">&rarr;</div>
            <div className="impact-step">
              <span className="impact-dot" />
              <span>AI</span>
            </div>
            <div className="impact-arrow">&rarr;</div>
            <div className="impact-step">
              <span className="impact-dot" />
              <span>Innovation</span>
            </div>
            <div className="impact-arrow">&rarr;</div>
            <div className="impact-step highlight-step">
              <span className="impact-dot" />
              <span>Impact</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          8. MEET THE TEAM
          ========================================================= */}
      <section id="team-section" className="about-section team-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">MEET THE TEAM</span>
            <h2 className="section-main-heading">The People Behind ResearchIntel</h2>
            <p className="section-main-lead">
              ResearchIntel is built by a multidisciplinary student team combining frontend development, backend engineering, database management and intelligent platform development.
            </p>
          </div>

          <div className="team-grid">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="team-card">
                <div className="team-avatar-box">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="team-avatar-photo"
                      onError={(e) => {
                        // Fallback if image fails
                        e.currentTarget.style.display = 'none'
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = 'grid'
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="team-avatar-letter"
                    style={{ display: member.image ? 'none' : 'grid' }}
                  >
                    {member.name.charAt(0)}
                  </div>
                </div>
                <div className="team-card-content">
                  <h3 className="team-member-name">{member.name}</h3>
                  <span className="team-member-role">{member.role}</span>
                  <p className="team-member-bio">{member.description}</p>

                  {/* Direct Contact Points (Tarun & Yug) */}
                  {(member.email || member.phone) && (
                    <div className="team-contact-info">
                      {member.email && (
                        <a href={`mailto:${member.email}`} className="team-contact-link" title="Send Email">
                          <span className="contact-icon">✉️</span>
                          <span className="contact-text">{member.email}</span>
                        </a>
                      )}
                      {member.phone && (
                        <a href={`tel:+91${member.phone}`} className="team-contact-link" title="Call">
                          <span className="contact-icon">📞</span>
                          <span className="contact-text">{member.phone}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Real Clickable Action Links */}
                  <div className="team-action-buttons">
                    {member.github && (
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="team-link-btn github-btn"
                        title={`View ${member.name}'s GitHub Profile`}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span>GitHub</span>
                      </a>
                    )}

                    {member.linkedin && (
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="team-link-btn linkedin-btn"
                        title={`View ${member.name}'s LinkedIn Profile`}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                        </svg>
                        <span>LinkedIn</span>
                      </a>
                    )}

                    {member.email && (
                      <a
                        href={`mailto:${member.email}`}
                        className="team-link-btn email-btn"
                        title={`Email ${member.name}`}
                      >
                        <span className="btn-icon">✉️</span>
                        <span>Email</span>
                      </a>
                    )}

                    {member.phone && (
                      <a
                        href={`tel:+91${member.phone}`}
                        className="team-link-btn phone-btn"
                        title={`Call ${member.name}`}
                      >
                        <span className="btn-icon">📞</span>
                        <span>Call</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          9. TEAM VALUES ("What We Believe")
          ========================================================= */}
      <section className="about-section values-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">WHAT WE BELIEVE</span>
            <h2 className="section-main-heading">Core Values</h2>
            <p className="section-main-lead">
              Our core values guide the architecture, intelligence models, and collaborative philosophy of the platform.
            </p>
          </div>

          <div className="values-grid">
            {values.map((val, idx) => (
              <div key={idx} className="value-card">
                <div className="value-icon">{val.icon}</div>
                <h3 className="value-title">{val.title}</h3>
                <p className="value-desc">{val.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          10. TECHNOLOGY STACK
          ========================================================= */}
      <section className="about-section tech-stack-section">
        <div className="section-container">
          <div className="section-header-centered">
            <span className="section-eyebrow">MODERN ARCHITECTURE</span>
            <h2 className="section-main-heading">Built With Modern Technology</h2>
            <p className="section-main-lead">
              Engineered with modern, reliable technologies and verified scientific data pipelines.
            </p>
          </div>

          <div className="tech-stack-grid">
            <div className="tech-stack-card">
              <div className="tech-category-icon">🧠</div>
              <h3 className="tech-category-title">AI &amp; Intelligence</h3>
              <ul className="tech-feature-list">
                <li><span>•</span> Artificial Intelligence</li>
                <li><span>•</span> Generative AI</li>
                <li><span>•</span> Natural Language Processing</li>
                <li><span>•</span> Semantic Search</li>
              </ul>
            </div>

            <div className="tech-stack-card">
              <div className="tech-category-icon">📊</div>
              <h3 className="tech-category-title">Data &amp; Intelligence</h3>
              <ul className="tech-feature-list">
                <li><span>•</span> Research Data</li>
                <li><span>•</span> Patent Data</li>
                <li><span>•</span> Funding Data</li>
                <li><span>•</span> Technology Signals</li>
              </ul>
            </div>

            <div className="tech-stack-card">
              <div className="tech-category-icon">🛡️</div>
              <h3 className="tech-category-title">Platform</h3>
              <ul className="tech-feature-list">
                <li><span>•</span> Modern Web Application</li>
                <li><span>•</span> Secure Authentication</li>
                <li><span>•</span> Role-Based Access</li>
                <li><span>•</span> Analytics &amp; Reporting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          11. QUALITATIVE PILLARS
          ========================================================= */}
      <section className="about-section qualitative-pillars-section">
        <div className="section-container">
          <div className="qualitative-pillars-grid">
            <div className="qualitative-card">
              <span className="qualitative-icon">🌐</span>
              <strong className="qualitative-title">Connected Intelligence</strong>
              <p className="qualitative-desc">Unified cross-correlation across publications, patents, and grant solicitations.</p>
            </div>
            <div className="qualitative-card">
              <span className="qualitative-icon">📊</span>
              <strong className="qualitative-title">Evidence-Based Insights</strong>
              <p className="qualitative-desc">Objective quantitative scoring and empirical S-Curve maturity validation.</p>
            </div>
            <div className="qualitative-card">
              <span className="qualitative-icon">🤖</span>
              <strong className="qualitative-title">AI-Assisted Discovery</strong>
              <p className="qualitative-desc">Natural language copilot and semantic relevance matching algorithms.</p>
            </div>
            <div className="qualitative-card">
              <span className="qualitative-icon">🛡️</span>
              <strong className="qualitative-title">Role-Based Experience</strong>
              <p className="qualitative-desc">Tailored analytical views for researchers, founders, managers, and administrators.</p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          12. CONTACT PREVIEW & AI ASSISTANT TRIGGER
          ========================================================= */}
      <section className="about-cta-section">
        <div className="section-container">
          <div className="about-cta-card">
            <span className="cta-badge">WANT TO KNOW MORE?</span>
            <h2 className="cta-title">Have a Question, Collaboration Idea or Feedback?</h2>
            <p className="cta-desc">
              Connect with the ResearchIntel team or explore intelligent answers directly using the AI Assistant.
            </p>
            <div className="cta-buttons-row">
              <Link to="/contact" className="cta-btn-primary">
                Contact Us &rarr;
              </Link>
              <button
                type="button"
                onClick={() => handleLaunchAssistant('I want to learn more about the ResearchIntel team and platform')}
                className="cta-btn-secondary"
              >
                <span>Ask AI Assistant ✨</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Footer */}
      <Footer />
    </div>
  )
}
