import React, { useState, useEffect, useMemo } from 'react'
import { technologyService } from '../services/technologyService'
import TechnologyMaturity from './TechnologyMaturity'
import TechnologyAdoption from './TechnologyAdoption'
import TechnologyTrends from './TechnologyTrends'
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
  const [tableIntensityFilter, setTableIntensityFilter] = useState('ALL')
  const [tableSortField, setTableSortField] = useState('year')
  const [tableSortDir, setTableSortDir] = useState('desc')
  const [tablePage, setTablePage] = useState(1)
  const pageSize = 8

  // Interactive Chart Tooltip State
  const [hoveredYearMetric, setHoveredYearMetric] = useState(null)
  const [hoveredDonutSlice, setHoveredDonutSlice] = useState(null)

  const suggestionPills = [
    'Medical Imaging AI',
    'Edge AI',
    'Artificial Intelligence',
    'Machine Learning',
    'AI for brain tumor MRI segmentation',
    'Quantum Computing',
    'Generative AI',
    'Computer Vision',
    'Robotics',
    'Biotechnology',
    'Clean Energy',
    'Cybersecurity',
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
      // Refresh current analysis
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
      const result = await technologyService.analyzeCustomTechnology(q)
      setAnalysisData(result)

      // Update recent searches
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

    if (type === 'research') {
      title = `Research Publications (${analysisData.sources?.research?.length || 0} Records)`
      rawItems = analysisData.sources?.research || []
    } else if (type === 'patents') {
      title = `Patent & IP Records (${analysisData.sources?.patents?.length || 0} Records)`
      rawItems = analysisData.sources?.patents || []
    } else if (type === 'funding') {
      title = `Funding Programs (${analysisData.sources?.funding?.length || 0} Records)`
      rawItems = analysisData.sources?.funding || []
    } else if (type === 'organizations') {
      title = `Identified Organizations (${analysisData.organizations?.length || 0} Entities)`
      rawItems = analysisData.organizations || []
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

  // Filter and sort annual activity table
  const processedYearlyMetrics = useMemo(() => {
    if (!analysisData?.adoption?.yearly_metrics) return []
    let list = [...analysisData.adoption.yearly_metrics]

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim()
      list = list.filter((m) => String(m.year).includes(q) || (m.activity_intensity || '').toLowerCase().includes(q))
    }

    if (tableIntensityFilter !== 'ALL') {
      list = list.filter((m) => (m.activity_intensity || '').toUpperCase() === tableIntensityFilter)
    }

    list.sort((a, b) => {
      let vA = a[tableSortField]
      let vB = b[tableSortField]
      if (vA === null || vA === undefined) vA = -999999
      if (vB === null || vB === undefined) vB = -999999
      if (vA < vB) return tableSortDir === 'asc' ? -1 : 1
      if (vA > vB) return tableSortDir === 'asc' ? 1 : -1
      return 0
    })

    return list
  }, [analysisData, tableSearch, tableIntensityFilter, tableSortField, tableSortDir])

  const totalPages = Math.max(1, Math.ceil(processedYearlyMetrics.length / pageSize))
  const paginatedMetrics = useMemo(() => {
    const start = (tablePage - 1) * pageSize
    return processedYearlyMetrics.slice(start, start + pageSize)
  }, [processedYearlyMetrics, tablePage, pageSize])

  // Filter modal items
  const filteredModalItems = useMemo(() => {
    if (!inspectModal.items) return []
    let list = [...inspectModal.items]

    if (inspectModal.yearFilter !== 'ALL') {
      const y = parseInt(inspectModal.yearFilter, 10)
      if (inspectModal.type === 'research') {
        list = list.filter((item) => item.publication_year === y)
      } else if (inspectModal.type === 'patents') {
        list = list.filter((item) => {
          const yr = item.filing_date ? new Date(item.filing_date).getFullYear() : null
          return yr === y
        })
      } else if (inspectModal.type === 'funding') {
        list = list.filter((item) => {
          const yr = item.open_date ? new Date(item.open_date).getFullYear() : null
          return yr === y
        })
      } else if (inspectModal.type === 'organizations') {
        list = list.filter((item) => item.years_active?.includes(y))
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

  // Donut chart calculations
  const donutData = useMemo(() => {
    if (!analysisData?.evidence) return []
    const ev = analysisData.evidence
    const resCount = ev.research_count || 0
    const patCount = ev.patent_count || 0
    const fundCount = ev.funding_count || 0
    const orgCount = ev.organization_count || 0
    const total = resCount + patCount + fundCount + orgCount
    if (total === 0) return []

    return [
      { label: 'Research Papers', count: resCount, color: '#38bdf8', pct: ((resCount / total) * 100).toFixed(1) },
      { label: 'Patents & IP', count: patCount, color: '#a855f7', pct: ((patCount / total) * 100).toFixed(1) },
      { label: 'Funding Programs', count: fundCount, color: '#10b981', pct: ((fundCount / total) * 100).toFixed(1) },
      { label: 'Organizations', count: orgCount, color: '#f59e0b', pct: ((orgCount / total) * 100).toFixed(1) },
    ]
  }, [analysisData])

  // Max value in yearly metrics for trajectory chart height normalization
  const maxYearlyActivity = useMemo(() => {
    if (!analysisData?.adoption?.yearly_metrics?.length) return 1
    return Math.max(...analysisData.adoption.yearly_metrics.map((m) => m.total_activity), 1)
  }, [analysisData])

  return (
    <div className="tech-hub-container">
      {/* Workspace Header */}
      <div className="tech-hub-header">
        <div>
          <div className="platform-tag">EVIDENCE-DRIVEN PLATFORM</div>
          <h1 className="page-title">Technology Intelligence &amp; Evolution Workspace</h1>
          <p className="page-subtitle">
            Dynamic cross-source intelligence synthesizing verified Research Publications, Patent &amp; IP Filings,
            Public Funding Allocations, and Organizational Activity.
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
            <div className="explore-heading-title">GLOBAL TECHNOLOGY DISCOVERY</div>
            <h2 className="explore-heading-sub">Investigate Any Technology Concept or Field</h2>
          </div>
          {analysisData && (
            <span className="provenance-badge">
              ✓ Connected Multi-Source Engine Active
            </span>
          )}
        </div>

        <div className="explore-input-group">
          <input
            type="text"
            className="explore-search-input"
            placeholder="🔎 Enter technology (e.g., Medical Imaging AI, Edge AI, Generative AI, Quantum Computing, Brain Tumor MRI Segmentation)..."
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
          <span className="suggestions-label">Try Concepts:</span>
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
          <span>Maturity &amp; Readiness Deep Dive</span>
        </button>
        <button
          className={`tech-tab-btn ${activeTab === 'adoption' ? 'active' : ''}`}
          onClick={() => setActiveTab('adoption')}
        >
          <span>📈</span>
          <span>Adoption &amp; Activity Tracking</span>
        </button>
        <button
          className={`tech-tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <span>🎯</span>
          <span>Trend &amp; Momentum Analysis</span>
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'overview' && (
        <div className="overview-tab-content">
          {analyzing ? (
            <div className="loading-card">
              <div className="loading-spinner"></div>
              <h3>Analyzing Cross-Source Evidence...</h3>
              <p>Scanning Research Publications, Patent Filings, Funding Programs, and Organizational Networks.</p>
            </div>
          ) : analysisData ? (
            <>
              {/* 1. Technology Overview Header */}
              <div className="tech-overview-header-card">
                <div className="tech-overview-left">
                  <div className="tech-badge-row">
                    <span className="tech-pill-main">Technology Concept</span>
                    {analysisData.match_type === 'direct' && (
                      <span className="match-pill direct">✓ Canonical Match</span>
                    )}
                    {analysisData.match_type === 'related' && (
                      <span className="match-pill related">ℹ️ Concept Expanded</span>
                    )}
                    {analysisData.match_type === 'insufficient' && (
                      <span className="match-pill insufficient">⚠️ Insufficient Baseline</span>
                    )}
                    <span className={`coverage-pill ${analysisData.coverage?.status?.toLowerCase() || 'insufficient'}`}>
                      Coverage: {analysisData.coverage?.status || 'INSUFFICIENT'}
                    </span>
                  </div>
                  <h2 className="tech-main-name">
                    {analysisData.matched_technology || analysisData.query}
                  </h2>
                  <div className="tech-domain-tags">
                    {analysisData.technology_domain ? (
                      analysisData.technology_domain.split(',').map((dom, i) => (
                        <span key={i} className="domain-chip">
                          🏷️ {dom.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="domain-chip">🏷️ Emerging Domain</span>
                    )}
                  </div>
                </div>

                <div className="tech-overview-right">
                  <div className="quick-stat-group">
                    <div className="quick-stat-item">
                      <span className="stat-label">Research Papers</span>
                      <span className="stat-value blue">{analysisData.evidence?.research_count || 0}</span>
                    </div>
                    <div className="quick-stat-item">
                      <span className="stat-label">Patent Filings</span>
                      <span className="stat-value purple">{analysisData.evidence?.patent_count || 0}</span>
                    </div>
                    <div className="quick-stat-item">
                      <span className="stat-label">Funding Programs</span>
                      <span className="stat-value green">{analysisData.evidence?.funding_count || 0}</span>
                    </div>
                    <div className="quick-stat-item">
                      <span className="stat-label">Organizations</span>
                      <span className="stat-value gold">{analysisData.evidence?.organization_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Executive KPI Cards Grid */}
              <div className="kpi-cards-grid">
                {/* KPI 1: Maturity Stage */}
                <div className="kpi-card maturity-kpi">
                  <div className="kpi-top">
                    <span className="kpi-title">Maturity Stage</span>
                    <span className={`kpi-badge ${(analysisData.maturity?.maturity_stage || '').toLowerCase()}`}>
                      {analysisData.maturity?.maturity_stage || 'INSUFFICIENT'}
                    </span>
                  </div>
                  <div className="kpi-main-metric">
                    {analysisData.maturity?.maturity_stage || 'INSUFFICIENT_DATA'}
                  </div>
                  <p className="kpi-desc">
                    {analysisData.maturity?.explanation || 'No verifiable maturity stage can be established from available records.'}
                  </p>
                  <div className="kpi-footer">
                    <span>Evidence Span: {analysisData.maturity?.evidence?.historical_span_years || 0} yrs</span>
                    <span>Citations: {analysisData.maturity?.evidence?.citations || 0}</span>
                  </div>
                </div>

                {/* KPI 2: Analytical Readiness */}
                <div className="kpi-card readiness-kpi">
                  <div className="kpi-top">
                    <span className="kpi-title">Analytical Readiness</span>
                    <span className="kpi-badge readiness">
                      {analysisData.readiness?.confidence || 'Low'} Confidence
                    </span>
                  </div>
                  <div className="kpi-main-metric">
                    {analysisData.readiness?.readiness_score !== null && analysisData.readiness?.readiness_score !== undefined
                      ? `${analysisData.readiness.readiness_score} / 100`
                      : 'N/A'}
                  </div>
                  <div className="readiness-label-text">
                    {analysisData.readiness?.score_label || 'Insufficient Evidence'}
                  </div>
                  <p className="kpi-desc">
                    {analysisData.readiness?.explanation || 'Analytical readiness estimate requires at least 1 verified empirical record.'}
                  </p>
                  <div className="readiness-disclaimer">
                    ℹ️ System-generated analytical estimate, not official TRL certification.
                  </div>
                </div>

                {/* KPI 3: Activity Trend */}
                <div className="kpi-card trend-kpi">
                  <div className="kpi-top">
                    <span className="kpi-title">Activity Trend</span>
                    <span className={`kpi-badge ${(analysisData.trend?.trend || '').toLowerCase()}`}>
                      {analysisData.trend?.trend || 'Insufficient'}
                    </span>
                  </div>
                  <div className="kpi-main-metric">
                    {analysisData.trend?.growth_rate !== null && analysisData.trend?.growth_rate !== undefined
                      ? `${analysisData.trend.growth_rate >= 0 ? '+' : ''}${analysisData.trend.growth_rate}% YoY`
                      : 'N/A'}
                  </div>
                  <p className="kpi-desc">
                    {analysisData.trend?.explanation || 'Historical trend calculation requires at least 2 active observation years.'}
                  </p>
                  <div className="kpi-footer">
                    <span>Analyzed Years: {analysisData.trend?.evidence?.active_years_analyzed || 0}</span>
                    <span>Latest Activity: {analysisData.trend?.evidence?.latest_year_activity || 0}</span>
                  </div>
                </div>

                {/* KPI 4: Evidence Coverage */}
                <div className="kpi-card coverage-kpi">
                  <div className="kpi-top">
                    <span className="kpi-title">Data Coverage</span>
                    <span className={`kpi-badge ${(analysisData.coverage?.status || 'insufficient').toLowerCase()}`}>
                      {analysisData.coverage?.status || 'INSUFFICIENT'}
                    </span>
                  </div>
                  <div className="kpi-main-metric">
                    {analysisData.coverage?.score !== undefined ? `${analysisData.coverage.score}% Integrity` : '0%'}
                  </div>
                  <p className="kpi-desc">
                    {analysisData.coverage?.explanation || 'Connected datasets scanned.'}
                  </p>
                  <div className="coverage-source-indicators">
                    <span className={`src-dot ${analysisData.evidence?.research_count ? 'active' : ''}`}>Research</span>
                    <span className={`src-dot ${analysisData.evidence?.patent_count ? 'active' : ''}`}>Patents</span>
                    <span className={`src-dot ${analysisData.evidence?.funding_count ? 'active' : ''}`}>Funding</span>
                    <span className={`src-dot ${analysisData.evidence?.organization_count ? 'active' : ''}`}>Orgs</span>
                  </div>
                </div>
              </div>

              {/* 3. Evidence Source Breakdown & Provenance Section */}
              <div className="evidence-breakdown-section">
                <div className="section-header-row">
                  <div>
                    <h3 className="section-title">Verified Evidence Provenance &amp; Breakdown</h3>
                    <p className="section-subtitle">
                      Inspect individual records and data sources powering this technology intelligence evaluation.
                    </p>
                  </div>
                  <span className="live-dataset-tag">Connected Data Sources</span>
                </div>

                <div className="evidence-cards-grid">
                  {/* Research Card */}
                  <div className="evidence-card research" onClick={() => handleOpenInspectModal('research')}>
                    <div className="evidence-card-header">
                      <div className="evidence-type-icon blue">📚</div>
                      <span className="provenance-source-tag">Source: Research Intelligence</span>
                    </div>
                    <div className="evidence-card-body">
                      <div className="evidence-number blue">{analysisData.evidence?.research_count || 0}</div>
                      <div className="evidence-name">Relevant Publications</div>
                      <p className="evidence-snippet">
                        Peer-reviewed literature, journal publications, and conference proceedings.
                      </p>
                    </div>
                    <button className="view-evidence-action-btn blue">
                      🔍 View Research Evidence &rarr;
                    </button>
                  </div>

                  {/* Patent Card */}
                  <div className="evidence-card patent" onClick={() => handleOpenInspectModal('patents')}>
                    <div className="evidence-card-header">
                      <div className="evidence-type-icon purple">⚖️</div>
                      <span className="provenance-source-tag">Source: Patent Intelligence</span>
                    </div>
                    <div className="evidence-card-body">
                      <div className="evidence-number purple">{analysisData.evidence?.patent_count || 0}</div>
                      <div className="evidence-name">Relevant Patents &amp; IP</div>
                      <p className="evidence-snippet">
                        Assigned commercial patents, technical classifications, and patent filings.
                      </p>
                    </div>
                    <button className="view-evidence-action-btn purple">
                      🔍 View Patent Evidence &rarr;
                    </button>
                  </div>

                  {/* Funding Card */}
                  <div className="evidence-card funding" onClick={() => handleOpenInspectModal('funding')}>
                    <div className="evidence-card-header">
                      <div className="evidence-type-icon green">💰</div>
                      <span className="provenance-source-tag">Source: Funding Intelligence</span>
                    </div>
                    <div className="evidence-card-body">
                      <div className="evidence-number green">{analysisData.evidence?.funding_count || 0}</div>
                      <div className="evidence-name">Related Funding Programs</div>
                      <p className="evidence-snippet">
                        Institutional research grants, public agency programs, and R&amp;D funding calls.
                      </p>
                    </div>
                    <button className="view-evidence-action-btn green">
                      🔍 View Funding Evidence &rarr;
                    </button>
                  </div>

                  {/* Organizations Card */}
                  <div className="evidence-card organization" onClick={() => handleOpenInspectModal('organizations')}>
                    <div className="evidence-card-header">
                      <div className="evidence-type-icon gold">🏢</div>
                      <span className="provenance-source-tag">Source: Multi-Source Records</span>
                    </div>
                    <div className="evidence-card-body">
                      <div className="evidence-number gold">{analysisData.evidence?.organization_count || 0}</div>
                      <div className="evidence-name">Identified Organizations</div>
                      <p className="evidence-snippet">
                        Commercial assignees, academic universities, and research institutions.
                      </p>
                    </div>
                    <button className="view-evidence-action-btn gold">
                      🔍 View Organizations &rarr;
                    </button>
                  </div>
                </div>

                {/* Evidence Explanation Callout */}
                <div className={`evidence-explanation-callout ${analysisData.coverage?.status?.toLowerCase() || 'insufficient'}`}>
                  <div className="explanation-icon">
                    {analysisData.coverage?.status === 'STRONG' ? '🛡️' : analysisData.coverage?.status === 'PARTIAL' ? 'ℹ️' : '⚠️'}
                  </div>
                  <div className="explanation-text-content">
                    <h4>Evidence Coverage Assessment: {analysisData.coverage?.status || 'INSUFFICIENT'}</h4>
                    <p>{analysisData.coverage?.explanation}</p>
                    <div className="checked-sources-row">
                      <strong>Sources Checked: </strong>
                      <span>
                        Research Intelligence ({analysisData.evidence?.research_count || 0}),
                        Patent Intelligence ({analysisData.evidence?.patent_count || 0}),
                        Funding Intelligence ({analysisData.evidence?.funding_count || 0}),
                        Organization Graph ({analysisData.evidence?.organization_count || 0})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Dual Analytical Row: Technology Trajectory Graph + Composition Donut */}
              <div className="analytics-dual-row">
                {/* Left Column: Trajectory Chart & Activity Intensity Ribbon */}
                <div className="analytics-left-col">
                  <div className="chart-panel trajectory-panel">
                    <div className="chart-panel-header">
                      <div>
                        <h3 className="chart-title">Signature Technology Trajectory</h3>
                        <p className="chart-subtitle">
                          Multi-signal longitudinal evolution combining Research Publications, Patent Filings, and Active Organizations.
                        </p>
                      </div>
                      <div className="trajectory-legend">
                        <span className="legend-item"><span className="legend-color-dot blue"></span> Publications</span>
                        <span className="legend-item"><span className="legend-color-dot purple"></span> Patents</span>
                        <span className="legend-item"><span className="legend-color-dot gold"></span> Organizations</span>
                      </div>
                    </div>

                    {analysisData.adoption?.yearly_metrics?.length ? (
                      <div className="trajectory-interactive-container">
                        {/* Trajectory Header Summary Stat Strip */}
                        <div className="trajectory-stat-strip">
                          <div className="traj-stat-badge">
                            <span className="traj-stat-lbl">Active Lifespan</span>
                            <span className="traj-stat-val">{analysisData.maturity?.evidence?.historical_span_years || analysisData.adoption?.years?.length || 0} Years</span>
                          </div>
                          <div className="traj-stat-badge">
                            <span className="traj-stat-lbl">Peak Activity</span>
                            <span className="traj-stat-val">{analysisData.adoption?.growth?.peak_activity_year || 'N/A'} ({maxYearlyActivity} pts)</span>
                          </div>
                          <div className="traj-stat-badge">
                            <span className="traj-stat-lbl">Latest Trajectory</span>
                            <span className="traj-stat-val highlight">{analysisData.adoption?.growth?.growth_classification || 'Growing'}</span>
                          </div>
                          <div className="traj-stat-badge">
                            <span className="traj-stat-lbl">Multi-Signal Balance</span>
                            <span className="traj-stat-val">{analysisData.evidence?.research_count || 0} Pubs / {analysisData.evidence?.patent_count || 0} Patents</span>
                          </div>
                        </div>

                        {/* Trajectory Background Grid & Timeline */}
                        <div className="trajectory-chart-viewport">
                          <div className="trajectory-grid-lines">
                            <div className="grid-line" style={{ bottom: '75%' }}><span className="grid-label">75%</span></div>
                            <div className="grid-line" style={{ bottom: '50%' }}><span className="grid-label">50%</span></div>
                            <div className="grid-line" style={{ bottom: '25%' }}><span className="grid-label">25%</span></div>
                          </div>

                          <div className="trajectory-bars-timeline">
                            {(() => {
                              // Compute highest individual signal across all years for prominent bar heights
                              const maxSignal = Math.max(
                                ...analysisData.adoption.yearly_metrics.flatMap((m) => [
                                  m.publications || 0,
                                  m.patents || 0,
                                  m.organizations || 0,
                                ]),
                                1
                              )

                              return analysisData.adoption.yearly_metrics.map((m) => {
                                const pubHeight = Math.round(((m.publications || 0) / maxSignal) * 170)
                                const patHeight = Math.round(((m.patents || 0) / maxSignal) * 170)
                                const orgHeight = Math.round(((m.organizations || 0) / maxSignal) * 170)

                                return (
                                  <div
                                    key={m.year}
                                    className={`trajectory-year-column ${hoveredYearMetric?.year === m.year ? 'active-col' : ''}`}
                                    onMouseEnter={() => setHoveredYearMetric(m)}
                                    onMouseLeave={() => setHoveredYearMetric(null)}
                                    onClick={() => handleOpenInspectModal('research', m.year)}
                                  >
                                    <div className="bar-signals-stack">
                                      {m.publications > 0 && (
                                        <div
                                          className="signal-bar publications-bar"
                                          style={{ height: `${Math.max(pubHeight, 16)}px` }}
                                          title={`${m.year} Publications: ${m.publications}`}
                                        >
                                          <span className="bar-count-label">{m.publications}</span>
                                        </div>
                                      )}
                                      {m.patents > 0 && (
                                        <div
                                          className="signal-bar patents-bar"
                                          style={{ height: `${Math.max(patHeight, 16)}px` }}
                                          title={`${m.year} Patents: ${m.patents}`}
                                        >
                                          <span className="bar-count-label">{m.patents}</span>
                                        </div>
                                      )}
                                      {m.organizations > 0 && (
                                        <div
                                          className="signal-bar orgs-bar"
                                          style={{ height: `${Math.max(orgHeight, 16)}px` }}
                                          title={`${m.year} Organizations: ${m.organizations}`}
                                        >
                                          <span className="bar-count-label">{m.organizations}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="year-axis-label">{m.year}</div>
                                    <span className={`intensity-dot ${(m.activity_intensity || 'low').toLowerCase()}`}></span>
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        </div>

                        {/* Interactive Hover Tooltip */}
                        {hoveredYearMetric && (
                          <div className="trajectory-hover-tooltip">
                            <div className="tooltip-year-heading">📅 Year {hoveredYearMetric.year} Activity Snapshot</div>
                            <div className="tooltip-stat-line">
                              <span>📚 Research Papers:</span> <strong>{hoveredYearMetric.publications}</strong>
                            </div>
                            <div className="tooltip-stat-line">
                              <span>⚖️ Patent Filings:</span> <strong>{hoveredYearMetric.patents}</strong>
                            </div>
                            <div className="tooltip-stat-line">
                              <span>💰 Funding Programs:</span> <strong>{hoveredYearMetric.funding_opportunities}</strong>
                            </div>
                            <div className="tooltip-stat-line">
                              <span>🏢 Active Organizations:</span> <strong>{hoveredYearMetric.organizations}</strong>
                            </div>
                            <div className="tooltip-stat-line total">
                              <span>Total Annual Activity:</span> <strong>{hoveredYearMetric.total_activity} points</strong>
                            </div>
                            <div className="tooltip-stat-line">
                              <span>YoY Growth:</span> <strong>{hoveredYearMetric.yoy_growth_percent !== null ? `${hoveredYearMetric.yoy_growth_percent >= 0 ? '+' : ''}${hoveredYearMetric.yoy_growth_percent}%` : 'Baseline'}</strong>
                            </div>
                            <div className="tooltip-stat-line">
                              <span>Intensity Level:</span> <strong className={`intensity-badge ${(hoveredYearMetric.activity_intensity || 'low').toLowerCase()}`}>{hoveredYearMetric.activity_intensity} ({hoveredYearMetric.intensity_percentage}%)</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="empty-chart-placeholder">
                        No historical timeline entries available for this query.
                      </div>
                    )}

                    {/* Activity Heatmap / Intensity Ribbon */}
                    <div className="intensity-ribbon-container">
                      <div className="intensity-ribbon-header">
                        <span className="ribbon-title">Activity Intensity Ribbon</span>
                        <span className="ribbon-formula-note">
                          Normalized Intensity = (Year Activity / Peak Activity) &times; 100
                        </span>
                      </div>
                      <div className="intensity-ribbon-strip">
                        {analysisData.adoption?.yearly_metrics?.map((m) => (
                          <div
                            key={m.year}
                            className={`ribbon-cell ${(m.activity_intensity || 'low').toLowerCase()}`}
                            title={`${m.year}: ${m.activity_intensity} (${m.intensity_percentage}% of peak)`}
                          >
                            <span className="cell-year">{m.year}</span>
                            <span className="cell-intensity-label">{m.activity_intensity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="ribbon-legend">
                        <span className="ribbon-legend-item"><span className="legend-chip peak"></span> Peak (&ge;85%)</span>
                        <span className="ribbon-legend-item"><span className="legend-chip high"></span> High (55-84%)</span>
                        <span className="ribbon-legend-item"><span className="legend-chip moderate"></span> Moderate (25-54%)</span>
                        <span className="ribbon-legend-item"><span className="legend-chip low"></span> Low (&lt;25%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Ecosystem Composition Donut & Dynamic Key Insights */}
                <div className="analytics-right-col">
                  {/* Activity Distribution Donut */}
                  <div className="chart-panel distribution-panel">
                    <div className="chart-panel-header">
                      <div>
                        <h3 className="chart-title">Ecosystem Composition</h3>
                        <p className="chart-subtitle">Distribution of cross-source evidence.</p>
                      </div>
                    </div>

                    {donutData.length > 0 ? (
                      <div className="donut-chart-container">
                        <div className="donut-visual-wrapper">
                          <svg viewBox="0 0 200 200" className="donut-svg">
                            {(() => {
                              let cumulativeAngle = 0
                              return donutData.map((slice, idx) => {
                                const pct = parseFloat(slice.pct) || 0
                                const angle = (pct / 100) * 360
                                const strokeDasharray = `${(angle * 282.74) / 360} 282.74`
                                const strokeDashoffset = -((cumulativeAngle * 282.74) / 360)
                                cumulativeAngle += angle

                                return (
                                  <circle
                                    key={idx}
                                    cx="100"
                                    cy="100"
                                    r="45"
                                    fill="transparent"
                                    stroke={slice.color}
                                    strokeWidth="28"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    className={`donut-segment ${hoveredDonutSlice?.label === slice.label ? 'active-slice' : ''}`}
                                    onMouseEnter={() => setHoveredDonutSlice(slice)}
                                    onMouseLeave={() => setHoveredDonutSlice(null)}
                                  />
                                )
                              })
                            })()}
                          </svg>
                          <div className="donut-center-text">
                            <span className="donut-total-number">
                              {(analysisData.evidence?.research_count || 0) +
                                (analysisData.evidence?.patent_count || 0) +
                                (analysisData.evidence?.funding_count || 0) +
                                (analysisData.evidence?.organization_count || 0)}
                            </span>
                            <span className="donut-total-label">Evidence Points</span>
                          </div>
                        </div>

                        {/* Donut Legend */}
                        <div className="donut-legend-list">
                          {donutData.map((slice, idx) => (
                            <div
                              key={idx}
                              className={`donut-legend-row ${hoveredDonutSlice?.label === slice.label ? 'active-legend' : ''}`}
                              onMouseEnter={() => setHoveredDonutSlice(slice)}
                              onMouseLeave={() => setHoveredDonutSlice(null)}
                            >
                              <span className="donut-dot" style={{ backgroundColor: slice.color }}></span>
                              <span className="donut-legend-name">{slice.label}</span>
                              <span className="donut-legend-count">
                                <strong>{slice.count}</strong> ({slice.pct}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="empty-chart-placeholder">
                        No ecosystem signals to chart.
                      </div>
                    )}
                  </div>

                  {/* Dynamic Key Insights Card */}
                  <div className="chart-panel insights-panel">
                    <div className="insights-header">
                      <span className="insights-icon">💡</span>
                      <h4 className="insights-title">Dynamic Key Insights</h4>
                    </div>
                    <ul className="insights-list">
                      {analysisData.key_insights?.map((insight, idx) => (
                        <li key={idx}>
                          <span className="insight-bullet">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 5. Competitive Organization Intelligence View */}
              <div className="competitive-orgs-section">
                <div className="section-header-row">
                  <div>
                    <h3 className="section-title">Competitive Technology &amp; Institutional Landscape</h3>
                    <p className="section-subtitle">
                      Active commercial assignees, academic institutions, and public agencies identified in this technology domain.
                    </p>
                  </div>
                  <button className="view-all-orgs-btn" onClick={() => handleOpenInspectModal('organizations')}>
                    View All {analysisData.organizations?.length || 0} Organizations &rarr;
                  </button>
                </div>

                {analysisData.organizations?.length ? (
                  <div className="org-cards-carousel">
                    {analysisData.organizations.slice(0, 6).map((org, i) => (
                      <div key={i} className="org-card" onClick={() => handleOpenInspectModal('organizations')}>
                        <div className="org-card-top">
                          <div className="org-icon">🏢</div>
                          <span className="org-activity-badge">{org.total_activity} Evidence Points</span>
                        </div>
                        <h4 className="org-name" title={org.name}>{org.name}</h4>
                        <div className="org-stats-grid">
                          <div className="org-stat">
                            <span>Papers:</span> <strong>{org.paper_count}</strong>
                          </div>
                          <div className="org-stat">
                            <span>Patents:</span> <strong>{org.patent_count}</strong>
                          </div>
                          <div className="org-stat">
                            <span>Funding:</span> <strong>{org.funding_count}</strong>
                          </div>
                          <div className="org-stat">
                            <span>Active Yrs:</span> <strong>{org.years_active?.length || 0}</strong>
                          </div>
                        </div>
                        {org.domains?.length > 0 && (
                          <div className="org-domain-tags">
                            {org.domains.slice(0, 2).map((d, di) => (
                              <span key={di} className="org-sub-chip">{d}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-table-placeholder">
                    No organizational participants identified in matching records.
                  </div>
                )}
              </div>

              {/* 6. Professional Annual Activity Data Table */}
              <div className="annual-activity-table-section">
                <div className="section-header-row">
                  <div>
                    <h3 className="section-title">Longitudinal Activity Intelligence Table</h3>
                    <p className="section-subtitle">
                      Detailed annual breakdown of publications, patents, funding opportunities, and participation intensity.
                    </p>
                  </div>
                  {/* Table Controls */}
                  <div className="table-controls-bar">
                    <input
                      type="text"
                      className="table-search-input"
                      placeholder="Filter by year or intensity..."
                      value={tableSearch}
                      onChange={(e) => {
                        setTableSearch(e.target.value)
                        setTablePage(1)
                      }}
                    />
                    <select
                      className="table-select-filter"
                      value={tableIntensityFilter}
                      onChange={(e) => {
                        setTableIntensityFilter(e.target.value)
                        setTablePage(1)
                      }}
                    >
                      <option value="ALL">All Intensities</option>
                      <option value="PEAK">Peak</option>
                      <option value="HIGH">High</option>
                      <option value="MODERATE">Moderate</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="pro-data-table">
                    <thead>
                      <tr>
                        <th onClick={() => { setTableSortField('year'); setTableSortDir(tableSortDir === 'asc' ? 'desc' : 'asc') }}>
                          Year {tableSortField === 'year' ? (tableSortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th onClick={() => { setTableSortField('publications'); setTableSortDir(tableSortDir === 'asc' ? 'desc' : 'asc') }}>
                          Research Papers {tableSortField === 'publications' ? (tableSortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th onClick={() => { setTableSortField('patents'); setTableSortDir(tableSortDir === 'asc' ? 'desc' : 'asc') }}>
                          Patents {tableSortField === 'patents' ? (tableSortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th onClick={() => { setTableSortField('funding_opportunities'); setTableSortDir(tableSortDir === 'asc' ? 'desc' : 'asc') }}>
                          Funding Programs {tableSortField === 'funding_opportunities' ? (tableSortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th onClick={() => { setTableSortField('organizations'); setTableSortDir(tableSortDir === 'asc' ? 'desc' : 'asc') }}>
                          Organizations {tableSortField === 'organizations' ? (tableSortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th onClick={() => { setTableSortField('total_activity'); setTableSortDir(tableSortDir === 'asc' ? 'desc' : 'asc') }}>
                          Total Activity {tableSortField === 'total_activity' ? (tableSortDir === 'asc' ? '▲' : '▼') : ''}
                        </th>
                        <th>YoY Growth</th>
                        <th>Activity Intensity</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMetrics.length > 0 ? (
                        paginatedMetrics.map((row) => (
                          <tr key={row.year}>
                            <td className="year-cell"><strong>{row.year}</strong></td>
                            <td className="metric-cell blue">{row.publications}</td>
                            <td className="metric-cell purple">{row.patents}</td>
                            <td className="metric-cell green">{row.funding_opportunities}</td>
                            <td className="metric-cell gold">{row.organizations}</td>
                            <td className="total-metric-cell"><strong>{row.total_activity}</strong></td>
                            <td className="growth-cell">
                              {row.yoy_growth_percent !== null ? (
                                <span className={`growth-pill ${row.yoy_growth_percent >= 0 ? 'positive' : 'negative'}`}>
                                  {row.yoy_growth_percent >= 0 ? '+' : ''}{row.yoy_growth_percent}%
                                </span>
                              ) : (
                                <span className="growth-pill baseline">Baseline</span>
                              )}
                            </td>
                            <td>
                              <span className={`intensity-badge ${(row.activity_intensity || 'low').toLowerCase()}`}>
                                {row.activity_intensity} ({row.intensity_percentage}%)
                              </span>
                            </td>
                            <td>
                              <button
                                className="table-inspect-btn"
                                onClick={() => handleOpenInspectModal('research', row.year)}
                              >
                                View {row.year} Records
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="empty-table-cell">
                            No annual records match the selected filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination */}
                {totalPages > 1 && (
                  <div className="table-pagination-bar">
                    <span>
                      Showing Page <strong>{tablePage}</strong> of <strong>{totalPages}</strong> ({processedYearlyMetrics.length} total years)
                    </span>
                    <div className="pagination-buttons">
                      <button
                        className="page-btn"
                        disabled={tablePage === 1}
                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                      >
                        &larr; Previous
                      </button>
                      <button
                        className="page-btn"
                        disabled={tablePage === totalPages}
                        onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 7. Related Technologies Cloud */}
              {analysisData.related_technologies?.length > 0 && (
                <div className="related-tech-section">
                  <h4 className="related-tech-title">Related Technology Concepts &amp; Domains</h4>
                  <div className="related-tech-pills">
                    {analysisData.related_technologies.map((rel, idx) => (
                      <button
                        key={idx}
                        className="related-pill"
                        onClick={() => handleAnalyzeQuery(rel)}
                      >
                        🔗 {rel}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection-card">
              <h3>Start Your Technology Investigation</h3>
              <p>Enter a technology concept above or click one of the quick suggestions to explore real multi-source evidence.</p>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tabs: Maturity Deep Dive */}
      {activeTab === 'maturity' && (
        <TechnologyMaturity
          customAnalysis={analysisData}
          onClearCustom={() => {}}
        />
      )}

      {/* Sub-Tabs: Adoption Deep Dive */}
      {activeTab === 'adoption' && (
        <TechnologyAdoption
          customAnalysis={analysisData}
          onClearCustom={() => {}}
        />
      )}

      {/* Sub-Tabs: Trend Analysis Deep Dive */}
      {activeTab === 'trends' && (
        <TechnologyTrends
          customAnalysis={analysisData}
          onClearCustom={() => {}}
        />
      )}

      {/* EVIDENCE INSPECTION MODAL / DRAWER */}
      {inspectModal.isOpen && (
        <div className="modal-backdrop" onClick={handleCloseInspectModal}>
          <div className="evidence-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <span className="modal-tag">Verified Evidence Inspector</span>
                <h3 className="modal-title">{inspectModal.title}</h3>
              </div>
              <button className="modal-close-btn" onClick={handleCloseInspectModal}>
                ✕
              </button>
            </div>

            {/* Modal Filters */}
            <div className="modal-filter-bar">
              <input
                type="text"
                className="modal-search-input"
                placeholder="Search across titles, assignees, authors, domains..."
                value={inspectModal.searchTerm}
                onChange={(e) =>
                  setInspectModal((prev) => ({ ...prev, searchTerm: e.target.value }))
                }
              />
              <select
                className="modal-year-select"
                value={inspectModal.yearFilter}
                onChange={(e) =>
                  setInspectModal((prev) => ({ ...prev, yearFilter: e.target.value }))
                }
              >
                <option value="ALL">All Years</option>
                {analysisData?.adoption?.years?.map((y) => (
                  <option key={y} value={String(y)}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Records List */}
            <div className="modal-body-records">
              {filteredModalItems.length > 0 ? (
                <div className="modal-records-grid">
                  {filteredModalItems.map((item, idx) => (
                    <div key={item.id || idx} className="record-item-card">
                      <div className="record-card-top">
                        <span className="record-source-badge">
                          {item.source || 'Database Record'}
                        </span>
                        {item.publication_year && (
                          <span className="record-year-badge">Year {item.publication_year}</span>
                        )}
                        {item.filing_date && (
                          <span className="record-year-badge">
                            Filed {new Date(item.filing_date).getFullYear()}
                          </span>
                        )}
                        {item.open_date && (
                          <span className="record-year-badge">
                            Opened {new Date(item.open_date).getFullYear()}
                          </span>
                        )}
                        {item.total_activity !== undefined && (
                          <span className="record-year-badge">
                            {item.total_activity} Total Points
                          </span>
                        )}
                      </div>

                      <h4 className="record-title">{item.title || item.name}</h4>

                      {/* Research specific fields */}
                      {inspectModal.type === 'research' && (
                        <div className="record-metadata">
                          {item.authors && <div><strong>Authors:</strong> {item.authors}</div>}
                          {item.journal_or_conference && (
                            <div><strong>Journal / Venue:</strong> {item.journal_or_conference}</div>
                          )}
                          {item.research_domain && (
                            <div><strong>Domain:</strong> {item.research_domain}</div>
                          )}
                          {item.citation_count !== undefined && (
                            <div><strong>Citations:</strong> {item.citation_count}</div>
                          )}
                        </div>
                      )}

                      {/* Patent specific fields */}
                      {inspectModal.type === 'patents' && (
                        <div className="record-metadata">
                          {item.assignee && <div><strong>Assignee:</strong> {item.assignee}</div>}
                          {item.publication_number && (
                            <div><strong>Pub Number:</strong> {item.publication_number}</div>
                          )}
                          {item.classification && (
                            <div><strong>Classification:</strong> {item.classification}</div>
                          )}
                          {item.technology_domain && (
                            <div><strong>Domain:</strong> {item.technology_domain}</div>
                          )}
                          {item.citation_count !== undefined && (
                            <div><strong>Citations:</strong> {item.citation_count}</div>
                          )}
                        </div>
                      )}

                      {/* Funding specific fields */}
                      {inspectModal.type === 'funding' && (
                        <div className="record-metadata">
                          {item.agency && <div><strong>Agency:</strong> {item.agency}</div>}
                          {item.funding_category && (
                            <div><strong>Category:</strong> {item.funding_category}</div>
                          )}
                          {item.research_area && (
                            <div><strong>Research Area:</strong> {item.research_area}</div>
                          )}
                          {item.funding_amount && (
                            <div><strong>Amount:</strong> ${Number(item.funding_amount).toLocaleString()}</div>
                          )}
                        </div>
                      )}

                      {/* Organization specific fields */}
                      {inspectModal.type === 'organizations' && (
                        <div className="record-metadata">
                          <div><strong>Publications:</strong> {item.paper_count} | <strong>Patents:</strong> {item.patent_count} | <strong>Funding:</strong> {item.funding_count}</div>
                          {item.years_active?.length > 0 && (
                            <div><strong>Active Years:</strong> {item.years_active.join(', ')}</div>
                          )}
                          {item.domains?.length > 0 && (
                            <div><strong>Domains:</strong> {item.domains.join(', ')}</div>
                          )}
                        </div>
                      )}

                      <div className="record-card-footer">
                        <span className="record-id-text">
                          ID: {item.id ? String(item.id).substring(0, 18) + '...' : 'System Node'}
                        </span>
                        <span className="record-relevance-chip">✓ Verified Evidence</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="modal-empty-state">
                  No evidence records match the current filter criteria.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <span>Showing {filteredModalItems.length} of {inspectModal.items?.length || 0} Records</span>
              <button className="modal-done-btn" onClick={handleCloseInspectModal}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
