import React, { useState, useEffect, useMemo, useRef } from 'react'
import { technologyService } from '../services/technologyService'
import TechnologyMaturity from './TechnologyMaturity'
import TechnologyAdoption from './TechnologyAdoption'
import TechnologyTrends from './TechnologyTrends'
import TechnologyLandscape3D from '../components/TechnologyLandscape3D'
import './TechnologyIntelligence.css'

export default function TechnologyIntelligence() {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'maturity' | 'adoption' | 'trends'
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  // Search and Analysis State
  const [queryInput, setQueryInput] = useState('Medical Imaging AI')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')
  const [analysisData, setAnalysisData] = useState(null)
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const stored = sessionStorage.getItem('ri_recent_tech_analyses')
      return stored ? JSON.parse(stored) : ['Medical Imaging AI', 'Edge AI', 'Artificial Intelligence', 'Machine Learning', 'Quantum Computing']
    } catch {
      return ['Medical Imaging AI', 'Edge AI', 'Artificial Intelligence', 'Machine Learning', 'Quantum Computing']
    }
  })

  // Evidence Inspection Modal State
  const [inspectModal, setInspectModal] = useState({
    isOpen: false,
    type: 'research', // 'research' | 'patents' | 'funding' | 'organizations'
    title: 'Evidence Records',
    items: [],
    yearFilter: 'ALL',
    searchTerm: '',
  })

  // Table Filtering, Sorting, and Pagination State
  const [tableSearch, setTableSearch] = useState('')
  const [tableSortField, setTableSortField] = useState('year')
  const [tableSortDir, setTableSortDir] = useState('desc')
  const [tablePage, setTablePage] = useState(1)
  const pageSize = 8

  // Interactive Chart & 3D State
  const [hoveredYearMetric, setHoveredYearMetric] = useState(null)
  const [selectedTrajectoryYear, setSelectedTrajectoryYear] = useState(null)
  const [landscapeMode, setLandscapeMode] = useState('3D') // '3D' | '2D'
  const [selectedSphere, setSelectedSphere] = useState(null)
  const [hoveredSphereName, setHoveredSphereName] = useState(null)
  const [autoRotate3D, setAutoRotate3D] = useState(true)

  // 3D Canvas Ref & Scene Group Ref
  const mountRef = useRef(null)
  const sceneGroupRef = useRef(null)

  const suggestionPills = [
    'Synthetic Biology',
    'Space Tech',
    'Brain-Computer Interfaces',
    'Smart Materials',
    'Medical Imaging AI',
    'Quantum Computing',
    'Clean Energy',
    'Cybersecurity',
    'Edge AI',
    'Generative AI',
    'Robotics',
    'Green Hydrogen',
    'Autonomous Vehicles',
    '3D Printing',
  ]

  // Auto-analyze initial query on mount
  useEffect(() => {
    handleAnalyzeQuery('Medical Imaging AI')
  }, [])

  async function handleSync() {
    try {
      setSyncing(true)
      setSyncMsg('')
      const res = await technologyService.syncTechnologies()
      setSyncMsg(`Sync complete! ${res.technologies_found || 0} technologies updated.`)
      if (queryInput) {
        handleAnalyzeQuery(queryInput)
      }
    } catch (err) {
      setSyncMsg(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleAnalyzeQuery(termToAnalyze) {
    const q = (termToAnalyze !== undefined ? termToAnalyze : queryInput).trim()
    if (!q) {
      setAnalyzeError('Please enter a technology name or concept.')
      return
    }

    try {
      setAnalyzing(true)
      setAnalyzeError('')
      setQueryInput(q)
      setSelectedSphere(null)
      setSelectedTrajectoryYear(null)
      const result = await technologyService.analyzeCustomTechnology(q)
      setAnalysisData(result)

      const updatedRecents = [q, ...recentSearches.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 6)
      setRecentSearches(updatedRecents)
      try {
        sessionStorage.setItem('ri_recent_tech_analyses', JSON.stringify(updatedRecents))
      } catch {}
    } catch (err) {
      setAnalyzeError(err.message || 'Failed to analyze technology concept.')
    } finally {
      setAnalyzing(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleAnalyzeQuery()
    }
  }

  function handleOpenInspectModal(type, specificYear = null) {
    if (!analysisData) return
    let title = 'Evidence Records'
    let rawItems = []

    const recs = analysisData.evidence_records || {}
    if (type === 'research') {
      title = `Research Publications (${recs.papers?.length || 0} Records)`
      rawItems = recs.papers || []
    } else if (type === 'patents') {
      title = `Patent & IP Records (${recs.patents?.length || 0} Records)`
      rawItems = recs.patents || []
    } else if (type === 'funding') {
      title = `Funding Programs (${recs.funding?.length || 0} Records)`
      rawItems = recs.funding || []
    } else if (type === 'organizations') {
      title = `Identified Organizations (${recs.organizations?.length || 0} Entities)`
      rawItems = recs.organizations || []
    }

    setInspectModal({
      isOpen: true,
      type,
      title,
      items: rawItems,
      yearFilter: specificYear ? String(specificYear) : 'ALL',
      searchTerm: '',
    })
  }

  function handleCloseInspectModal() {
    setInspectModal((prev) => ({ ...prev, isOpen: false }))
  }

  // Filtered Inspect Modal Items
  const filteredInspectItems = useMemo(() => {
    if (!inspectModal.items) return []
    let list = [...inspectModal.items]

    if (inspectModal.yearFilter !== 'ALL') {
      const y = parseInt(inspectModal.yearFilter, 10)
      if (inspectModal.type === 'research') {
        list = list.filter((item) => item.publication_year === y)
      } else if (inspectModal.type === 'patents') {
        list = list.filter((item) => item.filing_year === y)
      } else if (inspectModal.type === 'funding') {
        list = list.filter((item) => item.open_year === y)
      }
    }

    if (inspectModal.searchTerm.trim()) {
      const q = inspectModal.searchTerm.toLowerCase().trim()
      list = list.filter((item) => {
        const text = JSON.stringify(item).toLowerCase()
        return text.includes(q)
      })
    }

    return list
  }, [inspectModal])

  // Max value in yearly metrics for trajectory chart height normalization
  const maxYearlyActivity = useMemo(() => {
    if (!analysisData?.yearly_evidence?.length) return 1
    return Math.max(...analysisData.yearly_evidence.map((m) => m.total_activity), 1)
  }, [analysisData])

  // Filtered and Sorted Table Records
  const tableRecords = useMemo(() => {
    if (!analysisData?.yearly_evidence?.length) return []
    let rows = [...analysisData.yearly_evidence]

    if (tableSearch.trim()) {
      const s = tableSearch.toLowerCase().trim()
      rows = rows.filter((r) => String(r.year).includes(s) || (r.yoy_growth_notes && r.yoy_growth_notes.toLowerCase().includes(s)))
    }

    rows.sort((a, b) => {
      let valA = a[tableSortField]
      let valB = b[tableSortField]
      if (valA === null || valA === undefined) valA = -999999
      if (valB === null || valB === undefined) valB = -999999
      if (tableSortDir === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0
      }
    })

    return rows
  }, [analysisData, tableSearch, tableSortField, tableSortDir])

  const totalTablePages = Math.max(1, Math.ceil(tableRecords.length / pageSize))
  const paginatedTableRows = useMemo(() => {
    const start = (tablePage - 1) * pageSize
    return tableRecords.slice(start, start + pageSize)
  }, [tableRecords, tablePage])

  // Dynamic Max Value for Heatmap Intensity
  const maxHeatmapVal = useMemo(() => {
    if (!analysisData?.yearly_evidence?.length) return 1
    let maxVal = 1
    analysisData.yearly_evidence.forEach((y) => {
      maxVal = Math.max(maxVal, y.research_count || 0, y.patent_count || 0, y.organization_count || 0, y.application_count || 0)
    })
    return Math.max(maxVal, 1)
  }, [analysisData])

  // Dynamic Heatmap cell styling: as number increases, color becomes darker blue with white text
  const getHeatmapStyle = (count) => {
    if (!count || count === 0) {
      return {
        background: '#ffffff',
        color: '#cbd5e1',
        fontWeight: '500',
      }
    }
    const ratio = Math.min(1, count / maxHeatmapVal)
    const intensity = Math.pow(ratio, 0.65)
    
    // Lightness scales from 90% (light blue) down to 26% (deep dark navy blue)
    const lightness = Math.round(90 - intensity * 64)
    const saturation = Math.round(75 + intensity * 20)
    
    const isDarkBg = lightness < 58
    return {
      backgroundColor: `hsl(215, ${saturation}%, ${lightness}%)`,
      color: isDarkBg ? '#ffffff' : '#0369a1',
      fontWeight: count > 3 ? '800' : '700',
      transition: 'background-color 0.2s ease',
    }
  }

  return (
    <div className="tech-hub-container">
      {/* Workspace Header */}
      <div className="tech-hub-header">
        <div>
          <div className="platform-tag">DATA-DRIVEN &amp; EXPLAINABLE INTELLIGENCE</div>
          <h1 className="page-title">Technology Intelligence &amp; Evolution Workspace</h1>
          <p className="page-subtitle">
            Synthesizing multi-year evidence from Research Publications (Research Intelligence), Patent &amp; IP Filings (Patent Intelligence),
            and Public Grants (Funding Intelligence) with 6 core weighted maturity indicators and independent market adoption.
          </p>
        </div>
        <div className="sync-actions-box">
          <button className="sync-button" onClick={handleSync} disabled={syncing}>
            <span>{syncing ? '🔄' : '⚡'}</span>
            <span>{syncing ? 'Synchronizing Intelligence...' : 'Sync Source Intelligence'}</span>
          </button>
          {syncMsg && (
            <span className={`sync-msg-badge ${syncMsg.includes('failed') ? 'error' : 'success'}`}>
              {syncMsg}
            </span>
          )}
        </div>
      </div>

      {/* GLOBAL TECHNOLOGY DISCOVERY SEARCH PANEL */}
      <div className="explore-tech-panel">
        <div className="explore-header">
          <div>
            <div className="explore-heading-title">MULTI-YEAR TECHNOLOGY DISCOVERY</div>
            <h2 className="explore-heading-sub">Investigate Any Technology Concept or Subfield</h2>
          </div>
          {analysisData && (
            <span className="provenance-badge">
              ✓ Multi-Source Evidence Linkage Active
            </span>
          )}
        </div>

        <div className="explore-input-group">
          <input
            type="text"
            className="explore-search-input"
            placeholder="🔎 Enter technology query (e.g., Medical Imaging AI, Edge AI, Quantum Computing, Machine Learning)..."
            value={queryInput}
            onChange={(e) => {
              setQueryInput(e.target.value)
              if (analyzeError) setAnalyzeError('')
            }}
            onKeyDown={handleKeyDown}
          />
          <button
            className="explore-analyze-btn"
            onClick={() => handleAnalyzeQuery()}
            disabled={analyzing || !queryInput.trim()}
          >
            <span>{analyzing ? '⏳' : '⚡'}</span>
            <span>{analyzing ? 'Investigating Evidence...' : 'Analyze Technology'}</span>
          </button>
        </div>

        {/* Suggestion Pills */}
        <div className="explore-suggestions">
          <span className="suggestions-label">Test Queries:</span>
          {suggestionPills.map((pill) => (
            <button
              key={pill}
              type="button"
              className={`suggestion-pill ${queryInput.toLowerCase() === pill.toLowerCase() ? 'active-pill' : ''}`}
              onClick={() => handleAnalyzeQuery(pill)}
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="recent-searches-row">
            <span style={{ fontWeight: 700, color: '#94a3b8' }}>Recent Investigations:</span>
            {recentSearches.map((rec) => (
              <button
                key={rec}
                type="button"
                className="recent-search-pill"
                onClick={() => handleAnalyzeQuery(rec)}
              >
                {rec}
              </button>
            ))}
          </div>
        )}

        {/* Error Feedback */}
        {analyzeError && (
          <div className="analyze-error-callout">
            ⚠️ {analyzeError}
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="tech-tabs">
        <button
          className={`tech-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span>📊</span>
          <span>Unified Technology Intelligence</span>
        </button>
        <button
          className={`tech-tab-btn ${activeTab === 'maturity' ? 'active' : ''}`}
          onClick={() => setActiveTab('maturity')}
        >
          <span>🌱</span>
          <span>Maturity &amp; 6 Indicators</span>
        </button>
        <button
          className={`tech-tab-btn ${activeTab === 'adoption' ? 'active' : ''}`}
          onClick={() => setActiveTab('adoption')}
        >
          <span>📈</span>
          <span>Independent Market Adoption</span>
        </button>
        <button
          className={`tech-tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <span>🎯</span>
          <span>Multi-Year Trajectory &amp; Matrix</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'overview' && (
        <div className="overview-tab-content">
          {analyzing ? (
            <div className="loading-card">
              <div className="loading-spinner"></div>
              <h3>Analyzing Cross-Source Multi-Year Evidence...</h3>
              <p>Scanning Research Publications, Patent Filings, Funding Programs, and Organizational Networks.</p>
            </div>
          ) : analysisData ? (
            <>
              {/* 1. Technology Overview Header Card */}
              <div className="tech-overview-header-card">
                <div className="tech-overview-left">
                  <div className="tech-badge-row">
                    <span className="tech-pill-main">Analyzed Concept</span>
                    <span className="match-pill direct">✓ Multi-Source Linkage</span>
                    {analysisData.coverage?.historical_span && (
                      <span className="span-badge">
                        📅 {analysisData.coverage.historical_span} ({analysisData.coverage.total_active_years} active years)
                      </span>
                    )}
                  </div>
                  <h2 className="tech-main-name">{analysisData.technology}</h2>
                  <p className="tech-domain-text">
                    <strong>Ontology Expansion Terms:</strong> {analysisData.normalized_query}
                  </p>
                </div>

                <div className="tech-overview-right">
                  <div className="stage-classification-box">
                    <div className="stage-label-text">Data-Based Stage Classification</div>
                    <div className={`stage-badge-large stage-${(analysisData.stage?.classification || 'insufficient').toLowerCase().replace(/\s+/g, '-')}`}>
                      {analysisData.stage?.classification || 'Insufficient Evidence'}
                    </div>
                    <div className="stage-meta-row">
                      <span className="confidence-pill">
                        Confidence: <strong>{analysisData.stage?.confidence || 'Limited'}</strong>
                      </span>
                      <span className="score-pill">
                        Weighted Score: <strong>{analysisData.weighted_score?.total || 0} / 100</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1B. EVIDENCE SOURCES & COVERAGE PROVENANCE CARD */}
              <div className="sources-provenance-panel">
                <div className="sources-header-row">
                  <div>
                    <span className="sources-panel-tag">MULTI-SOURCE COVERAGE &amp; PROVENANCE</span>
                    <h3 className="sources-panel-title">Connected Evidence Sources</h3>
                  </div>
                  <div className="sources-stats-summary">
                    <span className="stat-pill-sm">
                      Unique Papers: <strong>{analysisData.coverage?.unique_research_count || analysisData.coverage?.total_papers || 0}</strong>
                    </span>
                    <span className="stat-pill-sm highlight-india">
                      🇮🇳 Indian Patents: <strong>{analysisData.coverage?.indian_patent_count || 0}</strong>
                    </span>
                    <span className="stat-pill-sm">
                      🌐 Global Patents: <strong>{analysisData.coverage?.global_patent_count || (analysisData.coverage?.unique_patent_count || analysisData.coverage?.total_patents || 0)}</strong>
                    </span>
                    <span className="stat-pill-sm">
                      Patent Families: <strong>{analysisData.coverage?.unique_patent_families || 0}</strong>
                    </span>
                    <span className="stat-pill-sm">
                      Grants &amp; Projects: <strong>{analysisData.coverage?.unique_funding_count || analysisData.coverage?.total_funding || 0}</strong>
                    </span>
                    <span className="stat-pill-sm">
                      Organizations: <strong>{analysisData.coverage?.total_organizations || 0}</strong>
                    </span>
                    {analysisData.coverage?.duplicates_removed > 0 && (
                      <span className="stat-pill-sm highlight-dedup">
                        Overlap Filtered: <strong>{analysisData.coverage.duplicates_removed} duplicates</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="sources-category-grid">
                  {/* Research Sources */}
                  <div className="source-category-box">
                    <div className="cat-title"><span className="cat-icon">📚</span> Research Sources</div>
                    <div className="cat-sources-list">
                      <div className="source-chip">
                        <span className="chip-status available">✓</span>
                        <span className="chip-name">OpenAlex</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.OpenAlex || 0}</span>
                      </div>
                      <div className="source-chip">
                        <span className="chip-status available">✓</span>
                        <span className="chip-name">Crossref</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.Crossref || 0}</span>
                      </div>
                      <div className="source-chip">
                        <span className="chip-status available">✓</span>
                        <span className="chip-name">OpenAIRE</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.OpenAIRE || 0}</span>
                      </div>
                      <div className="source-chip">
                        <span className={`chip-status ${analysisData.coverage?.source_coverage?.PubMed ? 'available' : 'neutral'}`}>
                          {analysisData.coverage?.source_coverage?.PubMed ? '✓' : '○'}
                        </span>
                        <span className="chip-name">PubMed</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.PubMed || 0}</span>
                      </div>
                      <div className="source-chip">
                        <span className="chip-status available">✓</span>
                        <span className="chip-name">Research Database</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.['Module 3 Research DB'] || analysisData.coverage?.source_coverage?.['Research DB'] || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Patent Sources */}
                  <div className="source-category-box">
                    <div className="cat-title"><span className="cat-icon">📑</span> Patent Sources</div>
                    <div className="cat-sources-list">
                      <div className="source-chip highlight-chip-india">
                        <span className="chip-status available">🇮🇳</span>
                        <span className="chip-name">IP India / InPASS</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.['Indian Patent Office (IP India)'] || analysisData.coverage?.indian_patent_count || 0}</span>
                      </div>
                      <div className="source-chip">
                        <span className="chip-status available">✓</span>
                        <span className="chip-name">PatentsView</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.PatentsView || 0}</span>
                      </div>
                      <div className="source-chip">
                        <span className={`chip-status ${analysisData.coverage?.source_statuses?.find(s => s.source_name === 'EPO OPS')?.credentials_configured ? 'available' : 'auth-req'}`}>
                          {analysisData.coverage?.source_statuses?.find(s => s.source_name === 'EPO OPS')?.credentials_configured ? '✓' : '🔒'}
                        </span>
                        <span className="chip-name">EPO OPS</span>
                        <span className="chip-count">
                          {analysisData.coverage?.source_statuses?.find(s => s.source_name === 'EPO OPS')?.credentials_configured ? (analysisData.coverage?.source_coverage?.['EPO OPS'] || 0) : 'Env Auth'}
                        </span>
                      </div>
                      <div className="source-chip">
                        <span className="chip-status available">✓</span>
                        <span className="chip-name">Patent Database</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.['Module 5 Patent DB'] || analysisData.coverage?.source_coverage?.['Patent DB'] || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Funding Sources */}
                  <div className="source-category-box">
                    <div className="cat-title"><span className="cat-icon">💰</span> Funding Sources</div>
                    <div className="cat-sources-list">
                      <div className="source-chip">
                        <span className="chip-status available">✓</span>
                        <span className="chip-name">NIH RePORTER</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.['NIH RePORTER'] || 0}</span>
                      </div>
                      <div className="source-chip">
                        <span className="chip-status available">✓</span>
                        <span className="chip-name">CORDIS</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.CORDIS || 0}</span>
                      </div>
                      <div className="source-chip">
                        <span className="chip-status available">✓</span>
                        <span className="chip-name">Funding Database (Indian)</span>
                        <span className="chip-count">{analysisData.coverage?.source_coverage?.['Module 4 Funding DB'] || analysisData.coverage?.source_coverage?.['Funding DB'] || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. WHY THIS CLASSIFICATION? (Explainability Callout) */}
              <div className="explainability-banner-card">
                <div className="explainability-header">
                  <div className="explainability-title">
                    <span className="bulb-icon">💡</span>
                    <span>WHY THIS CLASSIFICATION?</span>
                  </div>
                  <span className="explainability-sub">Analytical Reasoning &amp; Signal Breakdown</span>
                </div>
                <p className="explainability-body-text">
                  {analysisData.stage?.reason}
                </p>

                <div className="signals-grid">
                  {analysisData.stage?.supporting_signals?.length > 0 && (
                    <div className="signal-column supporting">
                      <div className="signal-column-title">✓ Supporting Signals</div>
                      <ul>
                        {analysisData.stage.supporting_signals.map((sig, idx) => (
                          <li key={idx}>{sig}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisData.stage?.limiting_signals?.length > 0 && (
                    <div className="signal-column limiting">
                      <div className="signal-column-title">⚠️ Limiting Factors</div>
                      <ul>
                        {analysisData.stage.limiting_signals.map((sig, idx) => (
                          <li key={idx}>{sig}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisData.stage?.conflicting_signals?.length > 0 && (
                    <div className="signal-column conflicting">
                      <div className="signal-column-title">⚖️ Conflicting Signals &amp; Trade-offs</div>
                      <ul>
                        {analysisData.stage.conflicting_signals.map((sig, idx) => (
                          <li key={idx}>{sig}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. SIX CORE MATURITY INDICATORS (100% WEIGHTED) */}
              <div className="section-header-row">
                <div>
                  <h3 className="section-title">Six Core Maturity Indicators (100% Total)</h3>
                  <p className="section-desc">
                    Normalized data-driven indicators derived from multi-year research and patent evidence.
                  </p>
                </div>
              </div>

              <div className="indicators-six-grid">
                {/* 1. Research Growth */}
                <div className="indicator-card">
                  <div className="indicator-card-top">
                    <span className="indicator-weight-tag">Weight: 25%</span>
                    <span className={`indicator-trend-pill trend-${(analysisData.indicators?.research_growth?.trend_direction || 'stable').toLowerCase().replace(/\s+/g, '-')}`}>
                      {analysisData.indicators?.research_growth?.trend_direction === 'Increasing' ? '↑↑ Increasing' : analysisData.indicators?.research_growth?.trend_direction === 'Declining' ? '↓↓ Declining' : analysisData.indicators?.research_growth?.normalized_score === null ? 'N/A' : '→ Stable'}
                    </span>
                  </div>
                  <h4 className="indicator-name">Research Growth</h4>
                  <div className="indicator-score-row">
                    {analysisData.indicators?.research_growth?.normalized_score === null ? (
                      <>
                        <span className="indicator-score-num" style={{ color: '#94a3b8' }}>N/A</span>
                        <span className="indicator-pts-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Insufficient Baseline</span>
                      </>
                    ) : (
                      <>
                        <span className="indicator-score-num">{analysisData.indicators?.research_growth?.normalized_score}</span>
                        <span className="indicator-score-denom">/ 100</span>
                        <span className="indicator-pts-badge">+{analysisData.indicators?.research_growth?.weighted_score || 0} pts</span>
                      </>
                    )}
                  </div>
                  <div className="indicator-bar-track">
                    <div
                      className="indicator-bar-fill fill-cyan"
                      style={{ width: `${analysisData.indicators?.research_growth?.normalized_score || 0}%` }}
                    ></div>
                  </div>
                  <p className="indicator-interpretation">
                    {analysisData.indicators?.research_growth?.interpretation}
                  </p>
                </div>

                {/* 2. Patent Growth */}
                <div className="indicator-card">
                  <div className="indicator-card-top">
                    <span className="indicator-weight-tag">Weight: 25%</span>
                    <span className={`indicator-trend-pill trend-${(analysisData.indicators?.patent_growth?.trend_direction || 'stable').toLowerCase().replace(/\s+/g, '-')}`}>
                      {analysisData.indicators?.patent_growth?.trend_direction === 'Increasing' ? '↑↑ Increasing' : analysisData.indicators?.patent_growth?.trend_direction === 'Declining' ? '↓↓ Declining' : analysisData.indicators?.patent_growth?.normalized_score === null ? 'N/A' : '→ Stable'}
                    </span>
                  </div>
                  <h4 className="indicator-name">Patent Growth</h4>
                  <div className="indicator-score-row">
                    {analysisData.indicators?.patent_growth?.normalized_score === null ? (
                      <>
                        <span className="indicator-score-num" style={{ color: '#94a3b8' }}>N/A</span>
                        <span className="indicator-pts-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Insufficient Baseline</span>
                      </>
                    ) : (
                      <>
                        <span className="indicator-score-num">{analysisData.indicators?.patent_growth?.normalized_score}</span>
                        <span className="indicator-score-denom">/ 100</span>
                        <span className="indicator-pts-badge">+{analysisData.indicators?.patent_growth?.weighted_score || 0} pts</span>
                      </>
                    )}
                  </div>
                  <div className="indicator-bar-track">
                    <div
                      className="indicator-bar-fill fill-purple"
                      style={{ width: `${analysisData.indicators?.patent_growth?.normalized_score || 0}%` }}
                    ></div>
                  </div>
                  <p className="indicator-interpretation">
                    {analysisData.indicators?.patent_growth?.interpretation}
                  </p>
                </div>

                {/* 3. Research Activity */}
                <div className="indicator-card">
                  <div className="indicator-card-top">
                    <span className="indicator-weight-tag">Weight: 15%</span>
                    <span className="indicator-level-pill">
                      {analysisData.indicators?.research_activity?.level || 'Low'}
                    </span>
                  </div>
                  <h4 className="indicator-name">Research Activity</h4>
                  <div className="indicator-score-row">
                    <span className="indicator-score-num">{analysisData.indicators?.research_activity?.normalized_score ?? 0}</span>
                    <span className="indicator-score-denom">/ 100</span>
                    <span className="indicator-pts-badge">+{analysisData.indicators?.research_activity?.weighted_score ?? 0} pts</span>
                  </div>
                  <div className="indicator-bar-track">
                    <div
                      className="indicator-bar-fill fill-blue"
                      style={{ width: `${analysisData.indicators?.research_activity?.normalized_score || 0}%` }}
                    ></div>
                  </div>
                  <p className="indicator-interpretation">
                    {analysisData.indicators?.research_activity?.interpretation}
                  </p>
                </div>

                {/* 4. Patent Activity */}
                <div className="indicator-card">
                  <div className="indicator-card-top">
                    <span className="indicator-weight-tag">Weight: 15%</span>
                    <span className="indicator-level-pill">
                      {analysisData.indicators?.patent_activity?.level || 'Low'}
                    </span>
                  </div>
                  <h4 className="indicator-name">Patent Activity</h4>
                  <div className="indicator-score-row">
                    <span className="indicator-score-num">{analysisData.indicators?.patent_activity?.normalized_score ?? 0}</span>
                    <span className="indicator-score-denom">/ 100</span>
                    <span className="indicator-pts-badge">+{analysisData.indicators?.patent_activity?.weighted_score ?? 0} pts</span>
                  </div>
                  <div className="indicator-bar-track">
                    <div
                      className="indicator-bar-fill fill-indigo"
                      style={{ width: `${analysisData.indicators?.patent_activity?.normalized_score || 0}%` }}
                    ></div>
                  </div>
                  <p className="indicator-interpretation">
                    {analysisData.indicators?.patent_activity?.interpretation}
                  </p>
                </div>

                {/* 5. Organization Participation */}
                <div className="indicator-card">
                  <div className="indicator-card-top">
                    <span className="indicator-weight-tag">Weight: 10%</span>
                    <span className="indicator-level-pill">
                      {analysisData.indicators?.organization_participation?.level || 'Low'}
                    </span>
                  </div>
                  <h4 className="indicator-name">Organization Participation</h4>
                  <div className="indicator-score-row">
                    <span className="indicator-score-num">{analysisData.indicators?.organization_participation?.normalized_score ?? 0}</span>
                    <span className="indicator-score-denom">/ 100</span>
                    <span className="indicator-pts-badge">+{analysisData.indicators?.organization_participation?.weighted_score ?? 0} pts</span>
                  </div>
                  <div className="indicator-bar-track">
                    <div
                      className="indicator-bar-fill fill-amber"
                      style={{ width: `${analysisData.indicators?.organization_participation?.normalized_score || 0}%` }}
                    ></div>
                  </div>
                  <p className="indicator-interpretation">
                    {analysisData.indicators?.organization_participation?.interpretation}
                  </p>
                </div>

                {/* 6. Application Diversity */}
                <div className="indicator-card">
                  <div className="indicator-card-top">
                    <span className="indicator-weight-tag">Weight: 10%</span>
                    <span className="indicator-level-pill">
                      {analysisData.indicators?.application_diversity?.level || 'Limited'}
                    </span>
                  </div>
                  <h4 className="indicator-name">Technology / App Diversity</h4>
                  <div className="indicator-score-row">
                    <span className="indicator-score-num">{analysisData.indicators?.application_diversity?.normalized_score ?? 0}</span>
                    <span className="indicator-score-denom">/ 100</span>
                    <span className="indicator-pts-badge">+{analysisData.indicators?.application_diversity?.weighted_score ?? 0} pts</span>
                  </div>
                  <div className="indicator-bar-track">
                    <div
                      className="indicator-bar-fill fill-emerald"
                      style={{ width: `${analysisData.indicators?.application_diversity?.normalized_score || 0}%` }}
                    ></div>
                  </div>
                  <p className="indicator-interpretation">
                    {analysisData.indicators?.application_diversity?.interpretation}
                  </p>
                </div>
              </div>

              {/* 4. INDEPENDENT MARKET ADOPTION PANEL (SEPARATED) */}
              <div className="adoption-separate-banner">
                <div className="adoption-banner-left">
                  <div className="adoption-tag">INDEPENDENT ADOPTION ANALYSIS (DECOUPLED FROM MATURITY)</div>
                  <h3 className="adoption-banner-title">
                    Market Adoption Level: <span className={`adoption-level-highlight level-${(analysisData.adoption?.level || 'insufficient').toLowerCase().replace(/\s+/g, '-')}`}>{analysisData.adoption?.level || 'Insufficient Evidence'}</span>
                  </h3>
                  <p className="adoption-banner-desc">
                    {analysisData.adoption?.status_summary}
                  </p>
                  <div className="adoption-notes-box">
                    <strong>Adoption Evidence Note:</strong> {analysisData.adoption?.evidence_notes}
                  </div>
                </div>

                <div className="adoption-banner-right">
                  <div className="adoption-entities-box">
                    <div className="entities-title">Active Commercial Assignees ({analysisData.adoption?.active_commercial_organizations?.length || 0}):</div>
                    <div className="entity-tags-list">
                      {analysisData.adoption?.active_commercial_organizations?.length > 0 ? (
                        analysisData.adoption.active_commercial_organizations.map((org, i) => (
                          <span key={i} className="entity-tag">{org}</span>
                        ))
                      ) : (
                        <span className="no-entities-text">No commercial assignees identified yet</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. 3D TECHNOLOGY LANDSCAPE (ENTERPRISE 3D VISUALIZATION) */}
              <TechnologyLandscape3D
                activeTechQuery={analysisData.technology}
                onSelectTechnology={(tech) => handleAnalyzeQuery(tech)}
                onOpenEvidenceModal={handleOpenInspectModal}
              />

              {/* 6. MULTI-YEAR TRAJECTORY GRAPH */}
              <div className="section-header-row">
                <div>
                  <h3 className="section-title">Multi-Year Activity Trajectory &amp; Historical Matrix</h3>
                  <p className="section-desc">
                    Verified yearly counts of research publications, patent filings, and participating organizations.
                  </p>
                </div>
              </div>

              {/* Trajectory Bar/Ribbon Chart */}
              <div className="trajectory-chart-card full-width">
                <div className="card-top-title-row">
                  <div>
                    <span className="chart-card-heading">Multi-Year Activity Trajectory</span>
                    <span className="chart-sub-hint">Click any year column below to drill down into historical records</span>
                  </div>
                  <div className="chart-legend-row">
                    <span className="legend-item"><span className="legend-dot cyan"></span> Research</span>
                    <span className="legend-item"><span className="legend-dot purple"></span> Patents</span>
                    <span className="legend-item"><span className="legend-dot amber"></span> Organizations</span>
                  </div>
                </div>

                <div className="trajectory-bars-wrapper">
                  {analysisData.yearly_evidence?.length > 0 ? (
                    analysisData.yearly_evidence.map((m) => {
                      const resPct = (m.research_count / maxYearlyActivity) * 100
                      const patPct = (m.patent_count / maxYearlyActivity) * 100
                      const orgPct = (m.organization_count / maxYearlyActivity) * 100
                      const isSelected = selectedTrajectoryYear === m.year

                      return (
                        <div
                          key={m.year}
                          className={`trajectory-year-column ${isSelected ? 'selected-year' : ''}`}
                          onMouseEnter={() => setHoveredYearMetric(m)}
                          onMouseLeave={() => setHoveredYearMetric(null)}
                          onClick={() => setSelectedTrajectoryYear(selectedTrajectoryYear === m.year ? null : m.year)}
                          title={`Click to inspect Year ${m.year}`}
                        >
                          <div className="bar-group-container">
                            <div className="bar-sub-bar res-bar" style={{ height: `${Math.max(4, resPct)}%` }}></div>
                            <div className="bar-sub-bar pat-bar" style={{ height: `${Math.max(4, patPct)}%` }}></div>
                            <div className="bar-sub-bar org-bar" style={{ height: `${Math.max(4, orgPct)}%` }}></div>
                          </div>
                          <span className="column-year-label">{m.year}</span>
                          <span className="column-total-badge">{m.total_activity}</span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="no-trajectory-callout">
                      No historical observation timeline recorded for this concept.
                    </div>
                  )}
                </div>

                {/* Selected Year Drill-Down Card */}
                {selectedTrajectoryYear && (() => {
                  const selMetric = analysisData.yearly_evidence?.find((y) => y.year === selectedTrajectoryYear)
                  if (!selMetric) return null
                  return (
                    <div className="trajectory-selected-card">
                      <div className="selected-card-header">
                        <div>
                          <strong>Year {selMetric.year} Empirical Evidence:</strong>
                          <span className="selected-total-tag">{selMetric.total_activity} Total Activities</span>
                        </div>
                        <button
                          className="selected-inspect-btn"
                          onClick={() => handleOpenInspectModal('research', selMetric.year)}
                        >
                          🔍 Inspect {selMetric.year} Evidence Records
                        </button>
                      </div>
                      <div className="selected-metrics-grid">
                        <div className="selected-metric-box">
                          <span className="sm-label">Research Papers</span>
                          <span className="sm-val text-blue">{selMetric.research_count}</span>
                          <span className="sm-sub">{selMetric.yoy_research_growth !== null ? `${selMetric.yoy_research_growth > 0 ? '+' : ''}${selMetric.yoy_research_growth}% YoY` : 'N/A'}</span>
                        </div>
                        <div className="selected-metric-box">
                          <span className="sm-label">Patent Filings</span>
                          <span className="sm-val text-purple">{selMetric.patent_count}</span>
                          <span className="sm-sub">{selMetric.yoy_patent_growth !== null ? `${selMetric.yoy_patent_growth > 0 ? '+' : ''}${selMetric.yoy_patent_growth}% YoY` : 'N/A'}</span>
                        </div>
                        <div className="selected-metric-box">
                          <span className="sm-label">Organizations</span>
                          <span className="sm-val text-amber">{selMetric.organization_count}</span>
                          <span className="sm-sub">{selMetric.application_count} Domains</span>
                        </div>
                      </div>
                      {selMetric.yoy_growth_notes && (
                        <div className="selected-notes">💡 {selMetric.yoy_growth_notes}</div>
                      )}
                    </div>
                  )
                })()}

                {/* Interactive Hover Tooltip */}
                {!selectedTrajectoryYear && hoveredYearMetric && (
                  <div className="trajectory-hover-info">
                    <strong>Year {hoveredYearMetric.year}:</strong> {hoveredYearMetric.research_count} Research Papers ({hoveredYearMetric.yoy_research_growth !== null ? `${hoveredYearMetric.yoy_research_growth > 0 ? '+' : ''}${hoveredYearMetric.yoy_research_growth}% YoY` : 'N/A'}), {hoveredYearMetric.patent_count} Patents ({hoveredYearMetric.yoy_patent_growth !== null ? `${hoveredYearMetric.yoy_patent_growth > 0 ? '+' : ''}${hoveredYearMetric.yoy_patent_growth}% YoY` : 'N/A'}), {hoveredYearMetric.organization_count} Orgs, {hoveredYearMetric.application_count} Domains. {hoveredYearMetric.yoy_growth_notes ? `[${hoveredYearMetric.yoy_growth_notes}]` : ''}
                  </div>
                )}
              </div>

              {/* 6. Multi-Year Activity Heatmap */}
              <div className="heatmap-card">
                <div className="card-top-title-row">
                  <div>
                    <span className="chart-card-heading">Multi-Year Activity Intensity Matrix</span>
                    <div className="heatmap-sub-hint">Darker cell colors represent higher empirical activity count</div>
                  </div>
                  <div className="heatmap-intensity-scale">
                    <span className="scale-label">Intensity:</span>
                    <span className="scale-swatch s-0">0</span>
                    <span className="scale-swatch s-low">Low</span>
                    <span className="scale-swatch s-med">Med</span>
                    <span className="scale-swatch s-high">High</span>
                    <span className="scale-swatch s-dark">Peak</span>
                  </div>
                </div>
                <div className="heatmap-table-container">
                  <table className="heatmap-table">
                    <thead>
                      <tr>
                        <th className="heatmap-th-sticky">Dimension</th>
                        {analysisData.yearly_evidence?.map((y) => (
                          <th key={y.year} className="heatmap-th-year">{y.year}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="heatmap-td-dim">Research Publications</td>
                        {analysisData.yearly_evidence?.map((y) => (
                          <td
                            key={y.year}
                            className="heatmap-cell"
                            style={getHeatmapStyle(y.research_count)}
                            title={`Year ${y.year}: ${y.research_count} Research Publications`}
                          >
                            {y.research_count}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="heatmap-td-dim">Patent Filings</td>
                        {analysisData.yearly_evidence?.map((y) => (
                          <td
                            key={y.year}
                            className="heatmap-cell"
                            style={getHeatmapStyle(y.patent_count)}
                            title={`Year ${y.year}: ${y.patent_count} Patent Filings`}
                          >
                            {y.patent_count}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="heatmap-td-dim">Participating Organizations</td>
                        {analysisData.yearly_evidence?.map((y) => (
                          <td
                            key={y.year}
                            className="heatmap-cell"
                            style={getHeatmapStyle(y.organization_count)}
                            title={`Year ${y.year}: ${y.organization_count} Participating Organizations`}
                          >
                            {y.organization_count}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="heatmap-td-dim">Application Domains</td>
                        {analysisData.yearly_evidence?.map((y) => (
                          <td
                            key={y.year}
                            className="heatmap-cell"
                            style={getHeatmapStyle(y.application_count)}
                            title={`Year ${y.year}: ${y.application_count} Application Domains`}
                          >
                            {y.application_count}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 7. EVIDENCE PROVENANCE & RECORD INSPECTION DRAWER */}
              <div className="provenance-section-card">
                <div className="provenance-top-row">
                  <div>
                    <h3 className="section-title">Verified Data Provenance</h3>
                    <p className="section-desc">
                      Inspect individual database records contributing to this technology analysis.
                    </p>
                  </div>
                  <div className="provenance-inspect-btns">
                    <button className="inspect-btn cyan" onClick={() => handleOpenInspectModal('research')}>
                      📚 Papers ({analysisData.evidence_records?.papers?.length || 0})
                    </button>
                    <button className="inspect-btn purple" onClick={() => handleOpenInspectModal('patents')}>
                      📑 Patents ({analysisData.evidence_records?.patents?.length || 0})
                    </button>
                    <button className="inspect-btn emerald" onClick={() => handleOpenInspectModal('funding')}>
                      💰 Grants ({analysisData.evidence_records?.funding?.length || 0})
                    </button>
                    <button className="inspect-btn amber" onClick={() => handleOpenInspectModal('organizations')}>
                      🏢 Orgs ({analysisData.evidence_records?.organizations?.length || 0})
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state-card">
              <h3>No Analysis Selected</h3>
              <p>Search for a technology concept above to inspect multi-year empirical evidence.</p>
            </div>
          )}
        </div>
      )}

      {/* SUB-TABS */}
      {activeTab === 'maturity' && (
        <TechnologyMaturity customAnalysis={analysisData} onClearCustom={() => {}} />
      )}

      {activeTab === 'adoption' && (
        <TechnologyAdoption customAnalysis={analysisData} onClearCustom={() => {}} />
      )}

      {activeTab === 'trends' && (
        <TechnologyTrends customAnalysis={analysisData} onClearCustom={() => {}} />
      )}

      {/* INSPECT MODAL */}
      {inspectModal.isOpen && (
        <div className="modal-backdrop" onClick={handleCloseInspectModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{inspectModal.title}</h3>
              <button className="modal-close-btn" onClick={handleCloseInspectModal}>×</button>
            </div>
            <div className="modal-search-row">
              <input
                type="text"
                className="modal-search-input"
                placeholder="Filter records by keyword, author, assignee..."
                value={inspectModal.searchTerm}
                onChange={(e) => setInspectModal((prev) => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>
            <div className="modal-items-list">
              {filteredInspectItems.length > 0 ? (
                filteredInspectItems.map((item, idx) => (
                  <div key={idx} className="modal-record-item">
                    <div className="record-top-title">
                      <div>
                        {item.source && <span className="modal-source-tag">{item.source}</span>}
                        <strong>{item.title || item.name}</strong>
                      </div>
                      <div className="record-tags-right">
                        {item.publication_year && <span className="record-year-tag">{item.publication_year}</span>}
                        {item.filing_year && <span className="record-year-tag">{item.filing_year}</span>}
                        {item.open_year && <span className="record-year-tag">{item.open_year}</span>}
                      </div>
                    </div>
                    {item.authors && <div className="record-sub">Authors: {item.authors}</div>}
                    {(item.assignee || item.organization || item.agency) && (
                      <div className="record-sub">Organization: {item.assignee || item.organization || item.agency}</div>
                    )}
                    {(item.research_domain || item.funding_category) && (
                      <div className="record-sub">Domain: {item.research_domain || item.funding_category}</div>
                    )}
                    {item.classification && <div className="record-sub">Classification: {item.classification}</div>}
                    {item.doi && (
                      <div className="record-sub">
                        DOI: <a href={item.url || `https://doi.org/${item.doi}`} target="_blank" rel="noopener noreferrer" className="record-link">{item.doi}</a>
                      </div>
                    )}
                    {item.url && !item.doi && (
                      <div className="record-sub">
                        Link: <a href={item.url} target="_blank" rel="noopener noreferrer" className="record-link">View Source Record ↗</a>
                      </div>
                    )}
                    {item.patent_count !== undefined && (
                      <div className="record-sub">Patent Filings: {item.patent_count} | Research Papers: {item.research_count} | Active: {item.first_seen_year || 'N/A'}-{item.last_seen_year || 'N/A'}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="modal-empty-text">No records match the current filter.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
