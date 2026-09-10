import { useEffect, useState, useContext, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import './Landing.css'

export default function Landing() {
  const { user } = useContext(AuthContext)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [activeAnalysisPill, setActiveAnalysisPill] = useState('problem')
  const [isEngineExpanded, setIsEngineExpanded] = useState(false)
  const [activeHoverNode, setActiveHoverNode] = useState(null)
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 })
  const heroRef = useRef(null)

  useEffect(() => {
    // Scroll reveal observer with smooth thresholding
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
    )

    const revealElements = document.querySelectorAll('.reveal-on-scroll')
    revealElements.forEach((el) => observer.observe(el))

    const handleScroll = () => {
      if (window.scrollY > 350) {
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

  // Mouse parallax handler for hero section
  const handleMouseMove = (e) => {
    if (!heroRef.current || window.innerWidth < 1024) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMouseParallax({ x: x * 10, y: y * 10 })
  }

  const handleMouseLeave = () => {
    setMouseParallax({ x: 0, y: 0 })
  }

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 4 Core Verified Real Graph Nodes around the RI Engine (Perfect 4-Corner Non-Overlapping Radial Layout)
  const graphNodes = [
    {
      id: 'profile',
      label: 'Research Profile',
      tag: 'Module 2: Identity',
      posClass: 'node-top-left',
      expandedPos: 'expanded-top-left',
      link: user ? '/profile' : '/login',
      info: 'Structure academic domain, sub-specializations, keywords, publications, and patents.'
    },
    {
      id: 'discovery',
      label: 'Literature Discovery',
      tag: 'Module 3: Discovery',
      posClass: 'node-top-right',
      expandedPos: 'expanded-top-right',
      link: user ? '/research-papers' : '/login',
      info: 'Search across ArXiv, PubMed, and CrossRef with instant query ingestion.'
    },
    {
      id: 'analysis',
      label: 'AI Paper Analysis',
      tag: 'Module 3: Intelligence',
      posClass: 'node-bot-left',
      expandedPos: 'expanded-bot-left',
      link: user ? '/research-papers' : '/login',
      info: 'Extract methodology, findings, limitations, and future directions with Circular Orbit Hub.'
    },
    {
      id: 'funding',
      label: 'AI Funding Matching',
      tag: 'Module 4: Grants',
      posClass: 'node-bot-right',
      expandedPos: 'expanded-bot-right',
      link: user ? '/funding' : '/login',
      info: 'Match ANRF, BIRAC, MeitY, DST, DRDO, and global calls via explainable TF-IDF scoring.'
    }
  ]

  // Real Supported Audiences
  const audiences = [
    {
      role: 'Researchers & Faculty',
      desc: 'Build a structured research profile, discover scientific literature, extract AI insights, and match with domain-relevant funding calls.',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10M6 10h10" />
        </svg>
      )
    },
    {
      role: 'Academic Institutions & Labs',
      desc: 'Centralize department research profiles, track publications across repositories, and identify institutional grant opportunities.',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      )
    },
    {
      role: 'Startup Founders & Innovators',
      desc: 'Discover biotech, deep-tech, and defense grants (BIRAC, MeitY, DRDO) to translate academic research into viable prototypes.',
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
      role: 'R&D Innovation Centers & Enterprises',
      desc: 'Explore multi-source literature, understand methodology landscapes, and identify collaborative translational funding.',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    }
  ]

  // Actual Implemented Core Capabilities with Live Links
  const coreFeatures = [
    {
      id: 'profile',
      title: 'Structured Research Identity',
      badge: 'Module 2: Profile',
      description: 'Define your research domain, areas of specialization, active keywords, technology focus, publications, and patents to establish your research fingerprint.',
      icon: '👤',
      link: user ? '/profile' : '/login'
    },
    {
      id: 'discovery',
      title: 'Multi-Source Paper Search',
      badge: 'Module 3: Discovery',
      description: 'Search and filter across ArXiv, PubMed, CrossRef, and Semantic Scholar with domain, publication year, and source-level filtering.',
      icon: '🔍',
      link: user ? '/research-papers' : '/login'
    },
    {
      id: 'analysis',
      title: 'Structured AI Paper Analysis',
      badge: 'Module 3: Intelligence',
      description: 'Extract structured breakdowns from paper abstracts and metadata: research problem, objectives, methodology, architecture, findings, limitations, and future directions.',
      icon: '🧠',
      link: user ? '/research-papers' : '/login'
    },
    {
      id: 'hub',
      title: 'Circular Orbit Analysis Hub',
      badge: 'Module 3: UX Hub',
      description: 'Interact with an intuitive floating mathematical orbit interface to inspect 10 structured dimensions of scientific literature with 1-click markdown export.',
      icon: '🌐',
      link: user ? '/research-papers' : '/login'
    },
    {
      id: 'funding-sources',
      title: 'Indian & Global Funding Sources',
      badge: 'Module 4: Sources',
      description: 'Integrated adapters for ANRF, BIRAC, DST, ICMR, MeitY, DRDO, ICAR, ISTI, and Grants.gov with live synchronization and deduplication.',
      icon: '🏛️',
      link: user ? '/funding' : '/login'
    },
    {
      id: 'matching',
      title: 'Semantic TF-IDF Grant Matching',
      badge: 'Module 4: AI Matching',
      description: 'Intelligently match your researcher profile against grant opportunities using cosine similarity, keyword intersections, and domain alignment.',
      icon: '🎯',
      link: user ? '/funding' : '/login'
    },
    {
      id: 'explainability',
      title: 'Explainable Match Scoring',
      badge: 'Module 4: Transparency',
      description: 'Every recommendation is accompanied by grounded match reasons detailing intersecting technical keywords and verified domain alignment without hallucinated scores.',
      icon: '📊',
      link: user ? '/funding' : '/login'
    },
    {
      id: 'bookmarks',
      title: 'User-Isolated Saved Grants',
      badge: 'Module 4: Bookmarks',
      description: 'Bookmark high-priority funding calls to your personal dashboard with instant status updates and persistent user-level isolation.',
      icon: '⭐',
      link: user ? '/funding' : '/login'
    }
  ]

  // How It Works Steps
  const howItWorks = [
    {
      num: '01',
      title: 'Create Your Research Profile',
      desc: 'Specify your research domain, specializations, technical keywords, affiliation, publications, and patents to calibrate the intelligence engine.'
    },
    {
      num: '02',
      title: 'Discover Scientific Literature',
      desc: 'Query papers across ArXiv, PubMed, and CrossRef or import target query papers directly into your collection.'
    },
    {
      num: '03',
      title: 'Extract Structured Insights',
      desc: 'Use AI analysis to decompose complex research abstracts into clear methodology, experimental metrics, novelty, and future directions.'
    },
    {
      num: '04',
      title: 'Match Real Funding Calls',
      desc: 'Review personalized recommendations calculated against Indian government agencies and international calls with clear relevance percentages.'
    },
    {
      num: '05',
      title: 'Focus & Track Opportunities',
      desc: 'Click interactive research focus chips to boost real-time priorities and save top opportunities to your personal dashboard.'
    }
  ]

  // Analysis Breakdown Categories for Showcase
  const analysisDimensions = [
    { id: 'problem', label: 'Research Problem', icon: '❓', desc: 'Identifies the core scientific bottleneck or engineering hurdle addressed by the study.' },
    { id: 'methodology', label: 'Methodology & Architecture', icon: '⚙️', desc: 'Decomposes the proposed algorithmic design, experimental framework, and validation methods.' },
    { id: 'results', label: 'Findings & Contributions', icon: '📈', desc: 'Highlights key empirical outcomes, benchmark improvements, and theoretical contributions.' },
    { id: 'limitations', label: 'Limitations & Gaps', icon: '⚠️', desc: 'Details assumptions, dataset constraints, and edge-case limitations acknowledged by the authors.' },
    { id: 'future', label: 'Future Directions', icon: '🚀', desc: 'Surfaces unexplored opportunities, next-phase experiments, and translational research vectors.' }
  ]

  return (
    <div className="landing-container">
      {/* Background Ambient Intelligence Field */}
      <div className="ambient-intelligence-field" aria-hidden="true">
        <div className="ambient-blob blob-1" />
        <div className="ambient-blob blob-2" />
        <div className="ambient-blob blob-3" />
        <div className="ambient-grid-overlay" />
      </div>

      {/* =========================================================
          1. HERO SECTION – WOW MOMENT & INTERACTIVE INTELLIGENCE GRAPH
          ========================================================= */}
      <section 
        className="landing-hero reveal-on-scroll is-visible" 
        id="home"
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className="hero-content hero-staggered-load"
          style={{
            transform: `translate3d(${mouseParallax.x * 0.2}px, ${mouseParallax.y * 0.2}px, 0)`
          }}
        >
          <div className="hero-badge hero-item-1">
            <span className="hero-badge-dot" />
            <span>AI-POWERED RESEARCH &amp; INNOVATION INTELLIGENCE</span>
          </div>

          <h1 className="hero-main-heading hero-item-2">
            Turn Research Into <span className="text-gradient">Innovation</span>
          </h1>

          <p className="hero-sub-heading hero-item-3">
            Research Funding &amp; Innovation Intelligence Platform
          </p>

          <p className="hero-description hero-item-4">
            An intelligent platform connecting researcher profiles, scientific literature discovery, structured AI paper analysis, and semantic grant matching across Indian and global funding agencies.
          </p>

          <div className="hero-actions hero-item-5">
            {user ? (
              <Link to="/dashboard" className="primary-btn hero-primary-btn">
                <span>Go to Dashboard</span>
                <svg className="btn-arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            ) : (
              <>
                <button type="button" onClick={() => scrollToSection('platform')} className="primary-btn hero-primary-btn">
                  <span>Explore Platform</span>
                  <svg className="btn-arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                <Link to="/register" className="secondary-btn hero-secondary-btn">
                  <span>Get Started</span>
                </Link>
              </>
            )}
          </div>

          <div className="hero-tags hero-item-6">
            <span className="hero-tag interactive-pill">🔬 Profile-Driven AI</span>
            <span className="hero-tag interactive-pill">📄 Literature Analysis</span>
            <span className="hero-tag interactive-pill">🏛️ Indian &amp; Global Grants</span>
            <span className="hero-tag interactive-pill">🎯 Semantic Matching</span>
          </div>
        </div>

        {/* =========================================================
            CONNECTED RESEARCH INTELLIGENCE GRAPH (CLEAN 4-NODE ARCHITECTURE)
            ========================================================= */}
        <div 
          className="hero-visual"
          style={{
            transform: `translate3d(${-mouseParallax.x * 0.4}px, ${-mouseParallax.y * 0.4}px, 0)`
          }}
        >
          <div className={`network-card ${isEngineExpanded ? 'is-expanded' : ''}`}>
            <div className="network-header">
              <div className="network-status-indicator">
                <span className="network-status-dot pulse" />
                <span className="network-status-text">Connected Intelligence Engine Active</span>
              </div>
              <button 
                type="button" 
                className="engine-toggle-btn"
                onClick={() => setIsEngineExpanded(!isEngineExpanded)}
                title="Expand or condense graph nodes"
                aria-label="Toggle Intelligence Graph expansion"
              >
                {isEngineExpanded ? 'Condense ⤢' : 'Explore Graph ⤡'}
              </button>
            </div>

            <div className="network-nodes-container">
              {/* Dynamic SVG Pulsing Connection Lines mapped precisely to 4 corner centers */}
              <svg className="network-lines-svg" viewBox="0 0 460 300">
                <line x1="230" y1="150" x2="90" y2="45" className={`graph-line ${activeHoverNode === 'profile' ? 'highlight' : ''}`} />
                <line x1="230" y1="150" x2="370" y2="45" className={`graph-line ${activeHoverNode === 'discovery' ? 'highlight' : ''}`} />
                <line x1="230" y1="150" x2="90" y2="255" className={`graph-line ${activeHoverNode === 'analysis' ? 'highlight' : ''}`} />
                <line x1="230" y1="150" x2="370" y2="255" className={`graph-line ${activeHoverNode === 'funding' ? 'highlight' : ''}`} />
              </svg>

              {/* Central Engine Node */}
              <Link 
                to={user ? "/dashboard" : "/login"}
                className="node-item node-central breathing-glow node-link"
                aria-label="RI Engine - AI Research Intelligence Hub"
              >
                <div className="central-inner-ring" />
                <strong>RI ENGINE</strong>
                <small>Synthesis &amp; Matching</small>
                <span className="live-status-pill">● Online</span>
              </Link>

              {/* Surrounding Connected Nodes (4 Corners) as Clickable Links */}
              {graphNodes.map((node) => (
                <Link
                  key={node.id}
                  to={node.link}
                  className={`node-item ${node.posClass} ${isEngineExpanded ? node.expandedPos : ''} ${activeHoverNode === node.id ? 'active-hover' : ''} node-link`}
                  onMouseEnter={() => setActiveHoverNode(node.id)}
                  onMouseLeave={() => setActiveHoverNode(null)}
                  aria-label={`${node.label}: ${node.info}`}
                >
                  <strong>{node.label}</strong>
                  <small>{node.tag}</small>
                </Link>
              ))}
            </div>

            {/* Live Contextual Tooltip / Description Bar */}
            <div className="network-footer">
              {activeHoverNode ? (
                <span className="node-tooltip-text animated-fade">
                  {graphNodes.find((n) => n.id === activeHoverNode)?.info}
                </span>
              ) : (
                <span className="default-footer-text">
                  Hover or click nodes to open modules &amp; inspect intelligence dataflow
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          2. PLATFORM OVERVIEW SECTION (STORYTELLING PIPELINE)
          ========================================================= */}
      <section className="landing-section reveal-on-scroll" id="platform">
        <div className="section-header">
          <p className="eyebrow">UNIFIED RESEARCH INTELLIGENCE</p>
          <h2 className="section-title">One Platform. Complete Research Intelligence.</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Bridge the gap between scientific inquiries, paper analysis, and grant acquisition. Instead of switching across disparate portals, our unified pipeline delivers end-to-end intelligence.
          </p>
        </div>

        <div className="platform-pipeline-grid">
          <Link to={user ? "/profile" : "/login"} className="pipeline-card interactive-hover-card clickable-card">
            <div className="pipeline-step-badge">Module 2</div>
            <div className="pipeline-icon">👤</div>
            <h3>Research Profile</h3>
            <p>Structure your academic domain, specialized sub-fields, publications, and patents to establish a verified baseline for AI matching.</p>
            <div className="card-hover-arrow">Learn more &rarr;</div>
          </Link>
          <div className="pipeline-arrow">&rarr;</div>

          <Link to={user ? "/research-papers" : "/login"} className="pipeline-card interactive-hover-card clickable-card">
            <div className="pipeline-step-badge">Module 3</div>
            <div className="pipeline-icon">📄</div>
            <h3>Literature Discovery</h3>
            <p>Access structured search across ArXiv, PubMed, and CrossRef with instant query imports into your local workspace.</p>
            <div className="card-hover-arrow">Learn more &rarr;</div>
          </Link>
          <div className="pipeline-arrow">&rarr;</div>

          <Link to={user ? "/research-papers" : "/login"} className="pipeline-card interactive-hover-card clickable-card">
            <div className="pipeline-step-badge">Module 3</div>
            <div className="pipeline-icon">🧠</div>
            <h3>AI Paper Analysis</h3>
            <p>Decompose abstracts into structured dimensions: methodology, experimental setup, novelty, limitations, and future research vectors.</p>
            <div className="card-hover-arrow">Learn more &rarr;</div>
          </Link>
          <div className="pipeline-arrow">&rarr;</div>

          <Link to={user ? "/funding" : "/login"} className="pipeline-card interactive-hover-card clickable-card">
            <div className="pipeline-step-badge">Module 4</div>
            <div className="pipeline-icon">🎯</div>
            <h3>AI Funding Matching</h3>
            <p>Discover government grants (ANRF, BIRAC, MeitY, DST, ICMR) with explainable relevance scores and focus chip boosts.</p>
            <div className="card-hover-arrow">Learn more &rarr;</div>
          </Link>
        </div>
      </section>

      {/* =========================================================
          3. CORE FEATURES SECTION (CLICKABLE CAPABILITY CARDS)
          ========================================================= */}
      <section className="landing-section reveal-on-scroll" id="features">
        <div className="section-header">
          <p className="eyebrow">CORE CAPABILITIES</p>
          <h2 className="section-title">Everything You Need to Move Research Forward</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Authentic, production-ready capabilities engineered across Modules 1 through 4 to support modern research and innovation workflows.
          </p>
        </div>

        <div className="features-grid">
          {coreFeatures.map((feat) => (
            <Link key={feat.id} to={feat.link} className="feature-card interactive-hover-card clickable-card">
              <div className="feature-top">
                <span className="feature-icon-badge">{feat.icon}</span>
                <span className="feature-badge">{feat.badge}</span>
              </div>
              <h3 className="feature-card-title">{feat.title}</h3>
              <p className="feature-card-desc">{feat.description}</p>
              <div className="card-hover-arrow">Explore capability &rarr;</div>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================
          4. HOW IT WORKS SECTION
          ========================================================= */}
      <section className="landing-section reveal-on-scroll" id="how-it-works">
        <div className="section-header">
          <p className="eyebrow">SYSTEMATIC METHODOLOGY</p>
          <h2 className="section-title">How Research Intelligence Works</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            A 5-step structured pipeline translating raw academic expertise into targeted grants and actionable scientific insights.
          </p>
        </div>

        <div className="how-it-works-grid">
          {howItWorks.map((step) => (
            <div key={step.num} className="how-card interactive-hover-card">
              <div className="how-number">{step.num}</div>
              <h3 className="how-title">{step.title}</h3>
              <p className="how-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          5. RESEARCH INTELLIGENCE SHOWCASE (MODULE 3)
          ========================================================= */}
      <section className="landing-section intelligence-showcase reveal-on-scroll">
        <div className="section-header">
          <p className="eyebrow">MODULE 3: LITERATURE INTELLIGENCE</p>
          <h2 className="section-title">From Scientific Papers to Structured Understanding</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Our AI analysis engine decomposes complex abstracts and publication metadata into digestible, structured dimensions with the Circular Orbit Hub.
          </p>
        </div>

        <div className="showcase-container">
          <div className="showcase-nav-pills">
            {analysisDimensions.map((dim) => (
              <button
                key={dim.id}
                type="button"
                className={`showcase-pill ${activeAnalysisPill === dim.id ? 'active' : ''}`}
                onClick={() => setActiveAnalysisPill(dim.id)}
              >
                <span>{dim.icon}</span> {dim.label}
              </button>
            ))}
          </div>

          <div className="showcase-card">
            {analysisDimensions.map((dim) => {
              if (dim.id !== activeAnalysisPill) return null
              return (
                <div key={dim.id} className="showcase-detail">
                  <div className="showcase-header">
                    <span className="dimension-icon">{dim.icon}</span>
                    <div>
                      <h3>{dim.label}</h3>
                      <p>{dim.desc}</p>
                    </div>
                  </div>
                  <div className="sample-mock-box">
                    <div className="sample-tag">Structured Output Dimension</div>
                    <p className="sample-text">
                      {dim.id === 'problem' && 'Identifies non-trivial domain bottlenecks such as label scarcity in medical image classification or compute constraints on edge neuromorphic processors.'}
                      {dim.id === 'methodology' && 'Extracts novel architecture formulations (e.g. self-attention mechanisms, hybrid graph neural networks) alongside parameter validation pipelines.'}
                      {dim.id === 'results' && 'Synthesizes quantitative metrics: precision/recall gains, top-1 accuracy on standard benchmarks, and latency reductions compared to prior art.'}
                      {dim.id === 'limitations' && 'Highlights acknowledged boundaries: sensitivity to out-of-distribution artifacts, high computational cost during pretraining, and sample biases.'}
                      {dim.id === 'future' && 'Surfaces suggested research pathways: extending to multi-modal datasets, few-shot adaptation, and real-time clinical trial validation.'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          6. AI FUNDING MATCHING SHOWCASE (MODULE 4)
          ========================================================= */}
      <section className="landing-section funding-showcase reveal-on-scroll">
        <div className="section-header">
          <p className="eyebrow">MODULE 4: FUNDING INTELLIGENCE</p>
          <h2 className="section-title">Funding That Matches Your Research Fingerprint</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Say goodbye to endless generic grant directories. Our semantic TF-IDF engine maps your profile signals directly to verified Indian government calls and international opportunities.
          </p>
        </div>

        <div className="funding-example-layout">
          {/* Profile Signals Card */}
          <div className="example-profile-card interactive-hover-card">
            <div className="example-badge">Researcher Profile Signals</div>
            <h4 className="example-title">Dr. Rajesh Varma</h4>
            <p className="example-sub">Department of Computer Science &bull; IIT Delhi</p>

            <div className="signal-group">
              <label>Research Domain</label>
              <div className="signal-tag domain">Artificial Intelligence &amp; Healthcare</div>
            </div>

            <div className="signal-group">
              <label>Research Areas</label>
              <div className="signal-tag">Medical Image Processing</div>
              <div className="signal-tag">Deep Learning</div>
            </div>

            <div className="signal-group">
              <label>Specialized Keywords</label>
              <div className="signal-chips">
                <span className="chip">Biomedical AI</span>
                <span className="chip">Diagnostic MRI</span>
                <span className="chip">Radiomics</span>
              </div>
            </div>
          </div>

          <div className="match-engine-connector">
            <div className="connector-icon pulse-glow">⚡</div>
            <span>Semantic TF-IDF Match Engine</span>
          </div>

          {/* Resulting Match Card */}
          <div className="example-opportunity-card interactive-hover-card">
            <div className="example-badge success">Example Matched Call</div>
            <div className="opp-header">
              <span className="opp-agency">ICMR &bull; Indian Council of Medical Research</span>
              <span className="match-percentage">89% Match</span>
            </div>
            <h4 className="opp-title">Artificial Intelligence in Biomedical Imaging &amp; Early Diagnostics</h4>
            <p className="opp-desc">Call for translational research proposals deploying deep learning algorithms for radiological diagnostics and imaging biomarkers in Indian clinical settings.</p>
            
            <div className="opp-reasons">
              <strong>Verified Match Factors:</strong>
              <ul>
                <li>✓ Direct domain alignment with <em>Artificial Intelligence &amp; Healthcare</em></li>
                <li>✓ Intersecting technical keywords: <code>Biomedical AI</code>, <code>Diagnostic MRI</code></li>
                <li>✓ Research area correlation with <em>Medical Image Processing</em></li>
              </ul>
            </div>

            <div className="opp-footer">
              <span className="opp-amount">Funding: ₹50 Lakhs - ₹1.5 Crore</span>
              <span className="opp-deadline">Agency: ICMR / India</span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          7. AUDIENCE SECTION
          ========================================================= */}
      <section className="landing-section audience-section reveal-on-scroll" id="about">
        <div className="section-header">
          <p className="eyebrow">BUILT FOR THE COMMUNITY</p>
          <h2 className="section-title">Built for the Research &amp; Innovation Ecosystem</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Designed to empower the diverse stakeholders driving scientific breakthroughs and technology commercialization.
          </p>
        </div>

        <div className="audience-grid">
          {audiences.map((item, index) => (
            <div key={index} className="audience-card interactive-hover-card">
              <div className="audience-icon">{item.icon}</div>
              <h3 className="audience-role">{item.role}</h3>
              <p className="audience-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          8. FINAL CALL TO ACTION
          ========================================================= */}
      <section className="landing-cta-section reveal-on-scroll">
        <div className="cta-card">
          <p className="eyebrow cta-eyebrow">JOIN THE PLATFORM</p>
          <h2 className="cta-heading">Ready to Turn Research Into Innovation?</h2>
          <p className="cta-description">
            Build your research profile, explore multi-source scientific literature, analyze research methodologies, and discover funding opportunities aligned with your expertise.
          </p>
          <div className="cta-actions">
            {user ? (
              <Link to="/dashboard" className="primary-btn cta-btn">
                <span>Go to Dashboard</span>
                <svg className="btn-arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            ) : (
              <>
                <Link to="/register" className="primary-btn cta-btn">
                  <span>Get Started &rarr;</span>
                </Link>
                <Link to="/login" className="secondary-btn cta-secondary-btn">
                  <span>Login</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          9. FOOTER
          ========================================================= */}
      <footer className="landing-footer reveal-on-scroll">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="brand">
              <span className="brand-mark">RI</span>
              <span className="brand-title">Research Intelligence</span>
            </Link>
            <p className="footer-tagline">
              AI-Powered Research, Literature Analysis &amp; Funding Intelligence Platform.
            </p>
          </div>

          <div className="footer-columns">
            <div className="footer-col">
              <h4>Platform</h4>
              <button type="button" onClick={() => scrollToSection('platform')} className="footer-link">Overview</button>
              <button type="button" onClick={() => scrollToSection('features')} className="footer-link">Core Features</button>
              <button type="button" onClick={() => scrollToSection('how-it-works')} className="footer-link">How It Works</button>
              <button type="button" onClick={() => scrollToSection('about')} className="footer-link">About</button>
            </div>

            <div className="footer-col">
              <h4>Research</h4>
              <Link to="/research-papers" className="footer-link">Literature Discovery</Link>
              <Link to="/profile" className="footer-link">Research Profile</Link>
              <Link to="/dashboard" className="footer-link">Intelligence Hub</Link>
            </div>

            <div className="footer-col">
              <h4>Funding</h4>
              <Link to="/funding" className="footer-link">AI Grant Matching</Link>
              <Link to="/funding" className="footer-link">Indian Funding Agencies</Link>
              <Link to="/funding" className="footer-link">Saved Opportunities</Link>
            </div>

            <div className="footer-col">
              <h4>Account</h4>
              {user ? (
                <>
                  <Link to="/dashboard" className="footer-link">Dashboard</Link>
                  <Link to="/profile" className="footer-link">My Profile</Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="footer-link">Login</Link>
                  <Link to="/register" className="footer-link">Register</Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-motto">Profile &bull; Literature &bull; Analysis &bull; Funding</p>
          <p className="footer-copyright">&copy; {new Date().getFullYear()} Intelligent-Research4 Platform. All rights reserved.</p>
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
