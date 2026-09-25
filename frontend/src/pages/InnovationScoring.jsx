import React, { useState, useEffect } from 'react'
import { technologyService } from '../services/technologyService'
import './InnovationScoring.css'

const TARGET_TECHNOLOGIES = [
  'Quantum Computing',
  'Synthetic Biology',
  'Space Tech',
  'Brain-Computer Interfaces',
  'Smart Materials',
  'Medical Imaging AI',
  'Clean Energy',
  'Cybersecurity',
  'Generative AI',
  'Edge AI',
  'Robotics',
  'Green Hydrogen'
]

const FACTOR_ICONS = {
  research_novelty: '🔬',
  patent_strength: '🛡️',
  tech_maturity: '📊',
  market_potential: '🏢',
  funding_relevance: '🎯'
}

export default function InnovationScoring() {
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'explorer', 'flow', 'idea', 'compare', 'brief', 'chat'
  const [selectedTech, setSelectedTech] = useState('Quantum Computing')
  const [searchQuery, setSearchQuery] = useState('Quantum Computing')
  const [geoFilter, setGeoFilter] = useState('all') // 'all', 'india', 'global'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [selectedFactorModal, setSelectedFactorModal] = useState(null)
  const [showMethodologyModal, setShowMethodologyModal] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())

  // Idea Analysis State
  const [ideaText, setIdeaText] = useState('')
  const [ideaLoading, setIdeaLoading] = useState(false)
  const [ideaResult, setIdeaResult] = useState(null)

  // Technology Comparison State
  const [compareList, setCompareList] = useState(['Quantum Computing', 'Generative AI'])
  const [newCompareTech, setNewCompareTech] = useState('')
  const [compareResult, setCompareResult] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)

  // Grok Brief State
  const [grokBrief, setGrokBrief] = useState(null)
  const [briefLoading, setBriefLoading] = useState(false)

  // Grok Chat State
  const [chatQuestion, setChatQuestion] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Innovation Analyst. Ask me anything about the empirical innovation signals, research gaps, patents, or funding opportunities for this technology.' }
  ])
  const [chatLoading, setChatLoading] = useState(false)

  const fetchScore = async (tech) => {
    setLoading(true)
    setError(null)
    try {
      const res = await technologyService.getInnovationScore(tech)
      setData(res)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Error loading innovation score:', err)
      setError(err.message || 'Failed to load innovation score')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchScore(selectedTech)
  }, [selectedTech])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSelectedTech(searchQuery.trim())
    fetchScore(searchQuery.trim())
  }

  const handleAnalyzeIdea = async (e) => {
    e.preventDefault()
    if (!ideaText.trim()) return
    setIdeaLoading(true)
    try {
      const res = await technologyService.analyzeIdea({ idea_text: ideaText.trim() })
      setIdeaResult(res)
    } catch (err) {
      alert('Idea analysis failed: ' + err.message)
    } finally {
      setIdeaLoading(false)
    }
  }

  const handleCompare = async () => {
    if (compareList.length < 2) return
    setCompareLoading(true)
    try {
      const res = await technologyService.compareTechnologies(compareList)
      setCompareResult(res)
    } catch (err) {
      alert('Comparison failed: ' + err.message)
    } finally {
      setCompareLoading(false)
    }
  }

  const handleAddCompareTech = (techToAdd) => {
    if (!techToAdd.trim() || compareList.includes(techToAdd.trim())) return
    setCompareList([...compareList, techToAdd.trim()])
    setNewCompareTech('')
  }

  const handleRemoveCompareTech = (techToRemove) => {
    if (compareList.length <= 2) return
    setCompareList(compareList.filter(t => t !== techToRemove))
  }

  const handleFetchBrief = async () => {
    setBriefLoading(true)
    try {
      const res = await technologyService.generateGrokBrief(selectedTech)
      setGrokBrief(res)
    } catch (err) {
      alert('Failed to generate brief: ' + err.message)
    } finally {
      setBriefLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!chatQuestion.trim()) return
    const userMsg = chatQuestion.trim()
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setChatQuestion('')
    setChatLoading(true)

    try {
      const history = chatMessages.map((m) => ({ role: m.role, content: m.content }))
      const res = await technologyService.askAnalyst(selectedTech, userMsg, history)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.answer }])
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Apologies, I encountered an issue analyzing the live evidence.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const getTierClass = (level) => {
    if (!level) return 'early'
    const lower = level.toLowerCase()
    if (lower.includes('pioneering')) return 'pioneering'
    if (lower.includes('high')) return 'high'
    if (lower.includes('moderate')) return 'moderate'
    return 'early'
  }

  // Filter evidence based on geo selection
  const getFilteredPatents = () => {
    if (!data?.evidence_patents) return []
    if (geoFilter === 'india') {
      return data.evidence_patents.filter(p => p.country === 'IN' || (p.assignee && p.assignee.toLowerCase().includes('iit')))
    }
    if (geoFilter === 'global') {
      return data.evidence_patents.filter(p => p.country !== 'IN' && !(p.assignee && p.assignee.toLowerCase().includes('iit')))
    }
    return data.evidence_patents
  }

  return (
    <div className="innovation-scoring-page">
      {/* Header Banner */}
      <div className="innovation-header-card">
        <div className="header-top-row">
          <div className="innovation-badge">
            <span>⚡ Innovation Intelligence</span>
            <span>•</span>
            <span>Deterministic Evidence Engine</span>
          </div>

          <div className="header-action-links">
            <button 
              type="button" 
              className="methodology-link-btn"
              onClick={() => setShowMethodologyModal(true)}
            >
              ℹ️ How is this score calculated?
            </button>
            <button 
              type="button" 
              className="refresh-intel-btn"
              onClick={() => fetchScore(selectedTech)}
              disabled={loading}
              title="Refresh live platform evidence"
            >
              🔄 Refresh Intelligence
            </button>
          </div>
        </div>

        <h1 className="innovation-title">Innovation Scoring &amp; Evidence Engine</h1>
        <p className="innovation-subtitle">
          Empirical, explainable intelligence fusing <strong>Research Novelty (30%)</strong>, <strong>Patent Strength (20%)</strong>, <strong>Technology Maturity (15%)</strong>, <strong>Market Potential (20%)</strong>, and <strong>Funding Relevance (15%)</strong>.
        </p>

        {/* Search & Query Bar */}
        <form className="innovation-search-form" onSubmit={handleSearchSubmit}>
          <div className="innovation-input-wrapper">
            <input
              type="text"
              className="innovation-search-input"
              placeholder="Enter any technology or domain (e.g. Brain-Computer Interfaces, Photonic Computing)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="innovation-search-btn" disabled={loading}>
            {loading ? 'Evaluating...' : 'Evaluate Score'}
          </button>
        </form>

        {/* Quick Select Technology Pills */}
        <div className="quick-tech-pills">
          <span className="quick-pills-label">Pre-seeded Domains:</span>
          {TARGET_TECHNOLOGIES.map((tech) => (
            <button
              key={tech}
              type="button"
              className={`quick-pill ${selectedTech === tech ? 'active' : ''}`}
              onClick={() => {
                setSelectedTech(tech)
                setSearchQuery(tech)
              }}
            >
              {tech}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="innovation-tabs-nav">
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Score Overview
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
        >
          🔍 Evidence Explorer
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'flow' ? 'active' : ''}`}
          onClick={() => setActiveTab('flow')}
        >
          ⛓️ Evidence Flow
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'idea' ? 'active' : ''}`}
          onClick={() => setActiveTab('idea')}
        >
          💡 Analyze My Idea
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('compare')
            handleCompare()
          }}
        >
          ⚖️ Compare Technologies
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'brief' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('brief')
            if (!grokBrief) handleFetchBrief()
          }}
        >
          📑 AI Innovation Brief
        </button>
        <button
          type="button"
          className={`tab-nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Ask Analyst
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="innovation-loading-state">
          <div className="spinner"></div>
          <h3>Synthesizing Multi-Source Empirical Evidence...</h3>
          <p>Analyzing scientific literature, patent defensibility, technological progression, and funding calls...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="innovation-error-state">
          <h3>Failed to Evaluate Technology</h3>
          <p>{error}</p>
          <button className="innovation-search-btn" onClick={() => fetchScore(selectedTech)}>
            Retry Analysis
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {!loading && !error && data && activeTab === 'overview' && (
        <>
          <div className="innovation-dashboard-grid">
            {/* Overall Score Card */}
            <div className="overall-score-card">
              <div className="score-header-badge-row">
                <span className="score-type-indicator">
                  {data.weighted_evidence_coverage < 100 ? 'PROVISIONAL ASSESSMENT' : 'COMPLETE ASSESSMENT'}
                </span>
                <span className="data-freshness-tag">Live Data • {lastUpdated}</span>
              </div>

              <div
                className="score-gauge-ring"
                style={{ '--score-pct': data.overall_score }}
              >
                <div className="score-gauge-inner">
                  <span className="score-big-number">{data.overall_score.toFixed(1)}</span>
                  <span className="score-max-label">INNOVATION EVIDENCE SCORE</span>
                </div>
              </div>

              <span className={`innovation-tier-badge ${getTierClass(data.innovation_level)}`}>
                {data.innovation_level}
              </span>

              <div className="evidence-coverage-tag">
                <span>📊 Factor Coverage: <strong>{data.evidence_coverage}</strong></span>
                <span style={{ color: '#0284c7' }}>⚡ Weighted Coverage: <strong>{data.weighted_evidence_coverage}%</strong></span>
              </div>

              {data.weighted_evidence_coverage < 100 && (
                <div className="provisional-warning-banner">
                  <span>ℹ️ Provisional score normalized dynamically based on {data.weighted_evidence_coverage}% of total factor weight.</span>
                </div>
              )}

              <p className="score-summary-text">{data.summary_explanation}</p>
            </div>

            {/* Five Factors Breakdown */}
            <div className="factors-breakdown-card">
              <div className="card-heading">
                <span>Weighted Factor Breakdown</span>
                <span className="card-heading-badge">Click card to inspect evidence</span>
              </div>

              <div className="factor-rows-list">
                {Object.entries(data.factors).map(([key, factor]) => {
                  const pctWidth = factor.normalized_score !== null ? factor.normalized_score : 0
                  return (
                    <div
                      key={key}
                      className="factor-row-item clickable-factor-item"
                      onClick={() => setSelectedFactorModal(factor)}
                      title="Click to view detailed calculation and evidence drawer"
                    >
                      <div className="factor-item-header">
                        <div className="factor-name-wrapper">
                          <div className="factor-icon-bubble">
                            {FACTOR_ICONS[key] || '📈'}
                          </div>
                          <div>
                            <span className="factor-title-text">{factor.name}</span>{' '}
                            <span className="factor-weight-tag">{Math.round(factor.weight * 100)}% Weight</span>
                          </div>
                        </div>

                        <div className="factor-score-display">
                          {factor.normalized_score !== null ? (
                            <>
                              <span className="factor-score-number">{factor.normalized_score.toFixed(1)}</span>
                              <span className="factor-contrib-number">(+{factor.weighted_contribution?.toFixed(2)} pts)</span>
                            </>
                          ) : (
                            <span className="factor-score-number unavailable-factor-text">
                              N/A ({factor.status === 'source_unavailable' ? 'Source Unavailable' : factor.status})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="factor-progress-track">
                        <div
                          className="factor-progress-fill"
                          style={{ width: `${pctWidth}%` }}
                        ></div>
                      </div>

                      <p className="factor-evidence-desc">{factor.evidence_summary}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Visual Innovation Radar & Multi-Year History Grid */}
          <div className="radar-and-history-grid">
            {/* Visual Radar Card */}
            <div className="info-panel-card radar-panel-card">
              <div className="card-heading">
                <span>Innovation Factor Profile</span>
                <span className="card-heading-badge">Normalized [0–100]</span>
              </div>

              <div className="radar-bars-visual">
                {Object.entries(data.factors).map(([key, f]) => (
                  <div key={key} className="radar-metric-col">
                    <div className="radar-metric-val">
                      {f.normalized_score !== null ? `${f.normalized_score.toFixed(0)}` : 'N/A'}
                    </div>
                    <div className="radar-bar-track">
                      <div 
                        className="radar-bar-fill" 
                        style={{ height: `${f.normalized_score !== null ? f.normalized_score : 0}%` }}
                      ></div>
                    </div>
                    <span className="radar-label">{f.name.replace(' ', '\n')}</span>
                  </div>
                ))}
              </div>
              <p className="radar-caption-text">
                Multi-axial factor profile. Unavailable factors are preserved as N/A rather than assigned arbitrary zeros.
              </p>
            </div>

            {/* Score History Card */}
            <div className="info-panel-card history-panel-card">
              <div className="card-heading">
                <span>Innovation Signal History</span>
                <span className="card-heading-badge">Empirical Trajectory</span>
              </div>

              {data.score_history && data.score_history.length > 0 ? (
                <div className="history-timeline-list">
                  {data.score_history.map((h, idx) => (
                    <div key={idx} className="history-timeline-item">
                      <span className="history-year-tag">{h.year}</span>
                      <div className="history-details-col">
                        <div className="history-metrics-row">
                          <span>🔬 Research: <strong>{h.research_volume}</strong></span>
                          <span>🛡️ Patents: <strong>{h.patent_volume}</strong></span>
                        </div>
                        <div className="history-score-bar-track">
                          <div className="history-score-bar-fill" style={{ width: `${h.estimated_score}%` }}></div>
                        </div>
                      </div>
                      <span className="history-score-tag">{h.estimated_score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-history-box">
                  <p>Historical innovation scoring requires multi-year longitudinal evidence.</p>
                </div>
              )}
            </div>
          </div>

          {/* Opportunity Signals */}
          {data.opportunity_signals && data.opportunity_signals.length > 0 && (
            <div className="evidence-section-block">
              <div className="card-heading">
                <span>Innovation Opportunity Signals</span>
                <span className="card-heading-badge">Potential Signal Whitespaces</span>
              </div>
              <div className="opportunity-signals-grid">
                {data.opportunity_signals.map((sig, idx) => (
                  <div key={idx} className="opportunity-card">
                    <span className="opportunity-type-tag">{sig.type}</span>
                    <h4 className="opportunity-card-title">{sig.title}</h4>
                    <p className="opportunity-card-desc">{sig.description}</p>
                    <span className="opportunity-source-tag">Source: {sig.source_module?.replace(/Module \d+ /i, '') || 'Platform Intelligence'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why This Score & Evidence Signals Grid */}
          <div className="signals-and-sources-grid">
            <div className="info-panel-card">
              <div className="card-heading">
                <span>Positive Signals (Strengths)</span>
                <span className="card-heading-badge" style={{ background: '#ecfdf5', color: '#059669' }}>Validated</span>
              </div>
              <ul className="signals-list">
                {data.positive_signals.map((item, idx) => (
                  <li key={idx} className="signal-bullet-item">
                    <span className="signal-bullet-icon">✅</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="info-panel-card">
              <div className="card-heading">
                <span>Limiting Signals &amp; Gaps</span>
                <span className="card-heading-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>Constraints</span>
              </div>
              <ul className="signals-list">
                {data.limiting_signals.concat(data.evidence_gaps).map((item, idx) => (
                  <li key={idx} className="signal-bullet-item">
                    <span className="signal-bullet-icon">⚠️</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Evidence Sources Overview */}
          <div className="evidence-sources-overview-card">
            <div className="card-heading">
              <span>Evidence Sources</span>
              <span className="card-heading-badge">Multi-Source Connectivity</span>
            </div>
            <div className="sources-chips-grid">
              <div className="source-chip-box">
                <span className="source-chip-icon">🔬</span>
                <div>
                  <strong>Research Intelligence</strong>
                  <p>OpenAlex, Crossref, PubMed, Peer-Reviewed Papers</p>
                </div>
              </div>
              <div className="source-chip-box">
                <span className="source-chip-icon">🛡️</span>
                <div>
                  <strong>Patent Intelligence</strong>
                  <p>PatentsView, EPO OPS, IP India / InPASS</p>
                </div>
              </div>
              <div className="source-chip-box">
                <span className="source-chip-icon">📊</span>
                <div>
                  <strong>Technology Intelligence</strong>
                  <p>Longitudinal S-Curve, Maturity Engine &amp; Adoption Vectors</p>
                </div>
              </div>
              <div className="source-chip-box">
                <span className="source-chip-icon">🎯</span>
                <div>
                  <strong>Funding Intelligence</strong>
                  <p>NIH RePORTER, CORDIS, Public Grant Opportunities</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: EVIDENCE EXPLORER */}
      {!loading && !error && data && activeTab === 'explorer' && (
        <div>
          {/* Geographic Evidence Filter */}
          <div className="geo-filter-bar">
            <span className="geo-filter-label">Geographic Scope:</span>
            <button 
              className={`geo-btn ${geoFilter === 'all' ? 'active' : ''}`}
              onClick={() => setGeoFilter('all')}
            >
              🌐 Global + India ({data.evidence_patents?.length || 0})
            </button>
            <button 
              className={`geo-btn ${geoFilter === 'india' ? 'active' : ''}`}
              onClick={() => setGeoFilter('india')}
            >
              🇮🇳 India Specific ({data.indian_evidence?.patent_count || 0})
            </button>
            <button 
              className={`geo-btn ${geoFilter === 'global' ? 'active' : ''}`}
              onClick={() => setGeoFilter('global')}
            >
              🌍 Global Only
            </button>
          </div>

          {/* Research Evidence */}
          <div className="evidence-section-block">
            <div className="card-heading">
              <span>Peer-Reviewed Scientific Literature</span>
              <span className="card-heading-badge">{data.evidence_papers.length} Retrieved</span>
            </div>
            {data.evidence_papers.length > 0 ? (
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Authors</th>
                    <th>Year</th>
                    <th>Domain</th>
                    <th>Citations</th>
                  </tr>
                </thead>
                <tbody>
                  {data.evidence_papers.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.title}</strong></td>
                      <td>{p.authors || 'N/A'}</td>
                      <td>{p.year || 'N/A'}</td>
                      <td>{p.domain || 'N/A'}</td>
                      <td>{p.citation_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#64748b', padding: '1rem 0' }}>No localized papers directly matched in sample repository.</p>
            )}
          </div>

          {/* Patent Evidence */}
          <div className="evidence-section-block">
            <div className="card-heading">
              <span>Patent Filings &amp; Defensibility</span>
              <span className="card-heading-badge">{getFilteredPatents().length} Displayed</span>
            </div>
            {getFilteredPatents().length > 0 ? (
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>Patent Title</th>
                    <th>Patent / Pub #</th>
                    <th>Assignee</th>
                    <th>Year</th>
                    <th>Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredPatents().map((pt) => (
                    <tr key={pt.id}>
                      <td><strong>{pt.title}</strong></td>
                      <td>{pt.patent_number || 'Pending'}</td>
                      <td>{pt.assignee || 'Undisclosed'}</td>
                      <td>{pt.year || 'N/A'}</td>
                      <td>
                        <span className={`country-tag ${pt.country === 'IN' ? 'india-tag' : 'global-tag'}`}>
                          {pt.country === 'IN' ? '🇮🇳 India' : '🌐 Global'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#64748b', padding: '1rem 0' }}>No localized patent filings matched under selected geographic filter.</p>
            )}
          </div>

          {/* Funding Evidence */}
          <div className="evidence-section-block">
            <div className="card-heading">
              <span>Active Funding Opportunities</span>
              <span className="card-heading-badge">{data.evidence_funding.length} Aligned</span>
            </div>
            {data.evidence_funding.length > 0 ? (
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>Program Title</th>
                    <th>Agency</th>
                    <th>Type</th>
                    <th>Deadline</th>
                    <th>Relevance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.evidence_funding.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{f.title}</strong></td>
                      <td>{f.agency || 'Public Agency'}</td>
                      <td>{f.funding_type || 'Grant'}</td>
                      <td>{f.deadline || 'Rolling'}</td>
                      <td>{(f.relevance_score * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#64748b', padding: '1rem 0' }}>No localized funding calls directly matched in sample repository.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EVIDENCE FLOW */}
      {!loading && !error && data && activeTab === 'flow' && (
        <div className="evidence-flow-container">
          <div className="card-heading">
            <span>Unified Research-to-Market Intelligence Flow</span>
            <span className="card-heading-badge">Interactive Synthesis Chain</span>
          </div>

          <div className="flow-steps-chain">
            <div className="flow-node-card" onClick={() => setSelectedFactorModal(data.factors.research_novelty)}>
              <span className="flow-node-badge">1. Discovery</span>
              <div className="flow-node-icon">🔬</div>
              <h4>Research Novelty</h4>
              <p className="flow-node-score">{data.factors.research_novelty.normalized_score?.toFixed(1) || 'N/A'}/100</p>
              <span className="flow-node-desc">Scientific distinctiveness &amp; literature velocity</span>
            </div>

            <div className="flow-arrow-indicator">➔</div>

            <div className="flow-node-card" onClick={() => setSelectedFactorModal(data.factors.patent_strength)}>
              <span className="flow-node-badge">2. Protection</span>
              <div className="flow-node-icon">🛡️</div>
              <h4>Patent Strength</h4>
              <p className="flow-node-score">{data.factors.patent_strength.normalized_score?.toFixed(1) || 'N/A'}/100</p>
              <span className="flow-node-desc">IP defensibility, assignees &amp; IPC classifications</span>
            </div>

            <div className="flow-arrow-indicator">➔</div>

            <div className="flow-node-card" onClick={() => setSelectedFactorModal(data.factors.tech_maturity)}>
              <span className="flow-node-badge">3. Progression</span>
              <div className="flow-node-icon">📊</div>
              <h4>Technology Maturity</h4>
              <p className="flow-node-score">{data.factors.tech_maturity.normalized_score?.toFixed(1) || 'N/A'}/100</p>
              <span className="flow-node-desc">S-curve progression from early to full maturity</span>
            </div>

            <div className="flow-arrow-indicator">➔</div>

            <div className="flow-node-card" onClick={() => setSelectedFactorModal(data.factors.funding_relevance)}>
              <span className="flow-node-badge">4. Capital</span>
              <div className="flow-node-icon">🎯</div>
              <h4>Funding Relevance</h4>
              <p className="flow-node-score">{data.factors.funding_relevance.normalized_score?.toFixed(1) || 'N/A'}/100</p>
              <span className="flow-node-desc">Active grant calls &amp; agency program alignment</span>
            </div>

            <div className="flow-arrow-indicator">➔</div>

            <div className="flow-node-card" onClick={() => setSelectedFactorModal(data.factors.market_potential)}>
              <span className="flow-node-badge">5. Translation</span>
              <div className="flow-node-icon">🏢</div>
              <h4>Market Potential</h4>
              <p className="flow-node-score">{data.factors.market_potential.normalized_score?.toFixed(1) || 'N/A'}/100</p>
              <span className="flow-node-desc">Commercial entities &amp; applied verticals</span>
            </div>
          </div>

          <div className="flow-summary-box">
            <h4>Deterministic Synthesis Outcome</h4>
            <p>
              The composite score of <strong>{data.overall_score.toFixed(1)}/100</strong> represents the mathematically weighted aggregation of all 5 stages. Click any stage above to inspect underlying evidence.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: ANALYZE MY IDEA */}
      {activeTab === 'idea' && (
        <div className="idea-analysis-box">
          <div className="card-heading">
            <span>Analyze My Research or Startup Idea</span>
            <span className="card-heading-badge">Concept Normalization &amp; Gap Detection</span>
          </div>

          <p style={{ color: '#475569', marginBottom: '1.25rem' }}>
            Enter your unstructured research proposal, technology thesis, or startup concept to evaluate semantic similarity against indexed literature, patent whitespace, funding alignment, and differentiation opportunities.
          </p>

          <form onSubmit={handleAnalyzeIdea} style={{ marginBottom: '2rem' }}>
            <textarea
              className="idea-textarea"
              rows={4}
              placeholder="e.g. AI-powered synthetic biology platform for early cancer biomarker detection and automated metabolic pathway optimization..."
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
            />
            <button
              type="submit"
              className="innovation-search-btn"
              style={{ marginTop: '0.75rem' }}
              disabled={ideaLoading || !ideaText.trim()}
            >
              {ideaLoading ? 'Analyzing Concept...' : 'Analyze Innovation Potential'}
            </button>
          </form>

          {ideaLoading && (
            <div className="innovation-loading-state">
              <div className="spinner"></div>
              <h3>Analyzing Idea Vectors...</h3>
              <p>Normalizing concept terms, querying patent classifications, and calculating whitespace...</p>
            </div>
          )}

          {ideaResult && !ideaLoading && (
            <div>
              <div className="signals-and-sources-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="info-panel-card">
                  <div className="card-heading">
                    <span>Normalized Concept Analysis</span>
                  </div>
                  <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0369a1', marginBottom: '0.5rem' }}>
                    {ideaResult.extracted_technologies?.join(', ') || 'Emerging Technology Concept'}
                  </p>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    Primary Domain: <strong>{ideaResult.extracted_domain || 'Multi-disciplinary Science'}</strong>
                  </p>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Research Similarity</span>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{(ideaResult.research_similarity_score * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Patent Similarity</span>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{(ideaResult.patent_similarity_score * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Funding Alignment</span>
                      <p style={{ fontSize: '1.2rem', fontWeight: 700 }}>{(ideaResult.funding_alignment_score * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="info-panel-card">
                  <div className="card-heading">
                    <span>Evaluated Innovation Score</span>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0284c7' }}>
                    {(ideaResult.innovation_score?.overall_score || 0).toFixed(1)} <span style={{ fontSize: '1rem', color: '#64748b' }}>/ 100</span>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.92rem', marginTop: '0.5rem' }}>
                    {ideaResult.idea_summary || ideaResult.innovation_score?.summary_explanation}
                  </p>
                </div>
              </div>

              {/* Research Gaps & Differentiation */}
              <div className="signals-and-sources-grid">
                <div className="info-panel-card">
                  <div className="card-heading">
                    <span>Identified Research Gaps</span>
                  </div>
                  <ul className="signals-list">
                    {(ideaResult.research_gaps || []).map((gap, idx) => (
                      <li key={idx} className="signal-bullet-item">
                        <span className="signal-bullet-icon">🔍</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="info-panel-card">
                  <div className="card-heading">
                    <span>Potential Differentiation Vectors</span>
                  </div>
                  <ul className="signals-list">
                    {(ideaResult.potential_differentiation_areas || []).map((diff, idx) => (
                      <li key={idx} className="signal-bullet-item">
                        <span className="signal-bullet-icon">⚡</span>
                        <span>{diff}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: COMPARE TECHNOLOGIES */}
      {activeTab === 'compare' && (
        <div className="compare-panel-box">
          <div className="card-heading">
            <span>Multi-Technology Comparative Analysis</span>
            <span className="card-heading-badge">Objective Evidence Matrix</span>
          </div>

          <div className="compare-chips-input-row">
            <div className="compare-active-chips">
              {compareList.map((t) => (
                <span key={t} className="compare-active-chip">
                  {t}
                  {compareList.length > 2 && (
                    <button type="button" onClick={() => handleRemoveCompareTech(t)}>✕</button>
                  )}
                </span>
              ))}
            </div>

            <div className="add-compare-form">
              <input
                type="text"
                placeholder="Add technology (e.g. Synthetic Biology)..."
                value={newCompareTech}
                onChange={(e) => setNewCompareTech(e.target.value)}
                className="innovation-search-input"
                style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem' }}
              />
              <button 
                type="button" 
                className="innovation-search-btn"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                onClick={() => handleAddCompareTech(newCompareTech)}
              >
                + Add
              </button>
              <button 
                type="button" 
                className="innovation-search-btn"
                style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem', background: '#0f172a' }}
                onClick={handleCompare}
                disabled={compareLoading}
              >
                {compareLoading ? 'Comparing...' : 'Run Comparison'}
              </button>
            </div>
          </div>

          {compareLoading && (
            <div className="innovation-loading-state">
              <div className="spinner"></div>
              <h3>Comparing Technology Portfolios...</h3>
            </div>
          )}

          {compareResult && !compareLoading && (
            <div style={{ overflowX: 'auto' }}>
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>Metric / Factor</th>
                    {compareResult.comparison_items?.map((item) => (
                      <th key={item.technology} style={{ textAlign: 'center' }}>{item.technology}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Innovation Score</strong></td>
                    {compareResult.comparison_items?.map((item) => (
                      <td key={item.technology} style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#0284c7' }}>
                        {item.overall_score?.toFixed(1) || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>🔬 Research Novelty (30%)</td>
                    {compareResult.comparison_items?.map((item) => (
                      <td key={item.technology} style={{ textAlign: 'center' }}>
                        {item.factors?.research_novelty?.normalized_score?.toFixed(1) || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>🛡️ Patent Strength (20%)</td>
                    {compareResult.comparison_items?.map((item) => (
                      <td key={item.technology} style={{ textAlign: 'center' }}>
                        {item.factors?.patent_strength?.normalized_score?.toFixed(1) || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>📊 Technology Maturity (15%)</td>
                    {compareResult.comparison_items?.map((item) => (
                      <td key={item.technology} style={{ textAlign: 'center' }}>
                        {item.factors?.tech_maturity?.normalized_score?.toFixed(1) || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>🏢 Market Potential (20%)</td>
                    {compareResult.comparison_items?.map((item) => (
                      <td key={item.technology} style={{ textAlign: 'center' }}>
                        {item.factors?.market_potential?.normalized_score?.toFixed(1) || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>🎯 Funding Relevance (15%)</td>
                    {compareResult.comparison_items?.map((item) => (
                      <td key={item.technology} style={{ textAlign: 'center' }}>
                        {item.factors?.funding_relevance?.normalized_score?.toFixed(1) || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>⚡ Weighted Evidence Coverage</td>
                    {compareResult.comparison_items?.map((item) => (
                      <td key={item.technology} style={{ textAlign: 'center' }}>
                        {item.weighted_evidence_coverage}%
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              {compareResult.comparison_notes && (
                <p style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.88rem', fontStyle: 'italic' }}>
                  ℹ️ {compareResult.comparison_notes}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: AI INNOVATION BRIEF */}
      {activeTab === 'brief' && (
        <div className="brief-container">
          <div className="card-heading" style={{ marginBottom: '1rem' }}>
            <span>AI Innovation Brief ({selectedTech})</span>
            <button
              type="button"
              className="innovation-search-btn"
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
              onClick={handleFetchBrief}
              disabled={briefLoading}
            >
              {briefLoading ? 'Generating Brief...' : 'Regenerate Brief'}
            </button>
          </div>

          {briefLoading ? (
            <div className="spinner"></div>
          ) : grokBrief ? (
            <div>
              <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: '#1e293b', marginBottom: '1.5rem' }}>
                {grokBrief.executive_summary}
              </p>

              <div className="signals-and-sources-grid">
                <div className="info-panel-card">
                  <h4>Scientific &amp; Patent Insights</h4>
                  <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.75rem' }}>
                    <strong>Research:</strong> {grokBrief.research_insights}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                    <strong>Patents:</strong> {grokBrief.patent_insights}
                  </p>
                </div>

                <div className="info-panel-card">
                  <h4>Market &amp; Funding Dynamics</h4>
                  <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.75rem' }}>
                    <strong>Market:</strong> {grokBrief.market_insights}
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                    <strong>Funding:</strong> {grokBrief.funding_insights}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 7: ASK ANALYST CHAT */}
      {activeTab === 'chat' && (
        <div className="grok-chat-container">
          <div className="card-heading">
            <span>Ask Innovation Analyst ({selectedTech})</span>
            <span className="card-heading-badge">Evidence-Grounded AI</span>
          </div>

          <div className="chat-history-list">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {chatLoading && <div className="chat-bubble assistant">Analyzing live platform evidence...</div>}
          </div>

          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="innovation-search-input"
              placeholder={`Ask about ${selectedTech} research gaps, patent strength, funding calls...`}
              value={chatQuestion}
              onChange={(e) => setChatQuestion(e.target.value)}
            />
            <button type="submit" className="innovation-search-btn" disabled={chatLoading}>
              Send
            </button>
          </form>
        </div>
      )}

      {/* Factor Details Modal */}
      {selectedFactorModal && (
        <div className="factor-modal-backdrop" onClick={() => setSelectedFactorModal(null)}>
          <div className="factor-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="factor-modal-close-btn" onClick={() => setSelectedFactorModal(null)}>✕</button>
            <div className="factor-name-wrapper" style={{ marginBottom: '1rem' }}>
              <div className="factor-icon-bubble">{FACTOR_ICONS[selectedFactorModal.key] || '📈'}</div>
              <div>
                <h2>{selectedFactorModal.name}</h2>
                <span className="factor-weight-tag">{Math.round(selectedFactorModal.weight * 100)}% Weight Contribution</span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Normalized Score:</span>
                <strong>{selectedFactorModal.normalized_score !== null ? `${selectedFactorModal.normalized_score.toFixed(1)} / 100` : 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Weighted Points Added:</span>
                <strong style={{ color: '#0284c7' }}>+{selectedFactorModal.weighted_contribution?.toFixed(2) || '0.00'} pts</strong>
              </div>
            </div>

            <h4>Underlying Empirical Evidence</h4>
            <p style={{ color: '#475569', lineHeight: 1.5 }}>{selectedFactorModal.evidence_summary}</p>

            <h4>Data Source Provenance</h4>
            <p style={{ color: '#64748b' }}>{selectedFactorModal.data_source?.replace(/Module \d+:? /i, '') || 'Platform Intelligence'}</p>

            <button className="innovation-search-btn" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setSelectedFactorModal(null)}>
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Methodology Modal */}
      {showMethodologyModal && (
        <div className="factor-modal-backdrop" onClick={() => setShowMethodologyModal(false)}>
          <div className="factor-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <button className="factor-modal-close-btn" onClick={() => setShowMethodologyModal(false)}>✕</button>
            <h2 style={{ marginBottom: '0.5rem' }}>How is the Innovation Score Calculated?</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Deterministic, explainable scoring based on 5 authoritative factors summing to 100%.
            </p>

            <div className="methodology-weights-table">
              <div className="methodology-row">
                <span>🔬 Research Novelty</span>
                <strong>30%</strong>
              </div>
              <div className="methodology-row">
                <span>🛡️ Patent Strength</span>
                <strong>20%</strong>
              </div>
              <div className="methodology-row">
                <span>📊 Technology Maturity</span>
                <strong>15%</strong>
              </div>
              <div className="methodology-row">
                <span>🏢 Market Potential</span>
                <strong>20%</strong>
              </div>
              <div className="methodology-row">
                <span>🎯 Funding Relevance</span>
                <strong>15%</strong>
              </div>
            </div>

            <h4 style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>Dynamic Re-Normalization &amp; Missing Data</h4>
            <p style={{ color: '#475569', fontSize: '0.88rem', lineHeight: 1.5 }}>
              If a data source is temporarily unavailable, it is never penalized as a zero score. The overall score is calculated as a <strong>Provisional Innovation Score</strong> re-normalized dynamically over the sum of available factor weights:
            </p>
            <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'monospace', margin: '0.5rem 0 1rem' }}>
              Score = (Σ Available_Weighted_Points) / (Σ Available_Weights)
            </div>

            <button className="innovation-search-btn" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setShowMethodologyModal(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
