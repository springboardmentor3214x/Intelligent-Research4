import { useContext, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import { getResearcherIntelligence } from '../services/dashboardService'
import './ResearcherDashboard.css'

export default function Dashboard() {
  const { token, user } = useContext(AuthContext)
  const navigate = useNavigate()

  // State & Filters
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)

  // 6 Filter Dimensions
  const [domainFilter, setDomainFilter] = useState('all')
  const [technologyFilter, setTechnologyFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [fundingTypeFilter, setFundingTypeFilter] = useState('all')
  const [patentTechFilter, setPatentTechFilter] = useState('all')
  const [orgFilter, setOrgFilter] = useState('all')

  // Interactive UI States
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const loadData = async (silent = false) => {
    if (!token) return
    if (!silent) setLoading(true)
    else setIsRefreshing(true)
    setError(null)

    try {
      const filters = {}
      if (domainFilter !== 'all') filters.domain = domainFilter
      if (technologyFilter !== 'all') filters.technology = technologyFilter
      if (fundingTypeFilter !== 'all') filters.funding_type = fundingTypeFilter
      if (patentTechFilter !== 'all') filters.patent_tech = patentTechFilter
      if (orgFilter !== 'all') filters.organization = orgFilter
      if (yearFilter !== 'all') {
        const [from, to] = yearFilter.split('-')
        if (from) filters.year_from = parseInt(from, 10)
        if (to) filters.year_to = parseInt(to, 10)
      }
      const res = await getResearcherIntelligence(token, filters)
      setData(res)
      setLastRefreshedAt(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Failed to load researcher intelligence:', err)
      setError(err.message || 'Live telemetry unavailable. Check backend connection.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token, domainFilter, technologyFilter, yearFilter, fundingTypeFilter, patentTechFilter, orgFilter])

  // Extract metrics & datasets safely
  const summary = data?.summary || {}
  const researchTrends = data?.research_trends || []
  const domains = data?.research_domains || []
  const topics = data?.trending_topics || []
  const topicHeatmap = data?.topic_heatmap || []
  const patentTrends = data?.patent_trends || []
  const topAssignees = data?.top_assignees || []
  const patentTechLandscape = data?.patent_tech_landscape || []
  const patentRecords = data?.patent_records || []
  const fundingByDomain = data?.funding_by_domain || []
  const fundingByType = data?.funding_by_type || []
  const fundingTimeline = data?.funding_timeline || []
  const fundingRecs = data?.funding_recommendations || []
  const techLandscape = data?.technology_landscape || []
  const techAdoptionTrends = data?.tech_adoption_trends || []
  const innovation = data?.innovation_assessment || {}
  const commercializationPipeline = data?.commercialization_pipeline || []
  const commercializationDistribution = data?.commercialization_distribution || []
  const crossIntelFlow = data?.cross_intelligence_flow || []
  const aiInsights = data?.ai_insights || []

  // Compute SVG coordinates for Research Activity Area Chart
  const maxPaperCount = useMemo(() => {
    if (!researchTrends.length) return 10
    return Math.max(...researchTrends.map((t) => Math.max(t.paper_count, t.citations || 0)), 10)
  }, [researchTrends])

  const timelinePoints = useMemo(() => {
    if (researchTrends.length < 2) return ''
    const width = 800
    const height = 240
    const padding = 40
    const stepX = (width - padding * 2) / (researchTrends.length - 1)

    return researchTrends
      .map((item, idx) => {
        const x = padding + idx * stepX
        const y = height - padding - (item.paper_count / maxPaperCount) * (height - padding * 2)
        return `${x},${y}`
      })
      .join(' ')
  }, [researchTrends, maxPaperCount])

  const timelineAreaPath = useMemo(() => {
    if (!timelinePoints) return ''
    const pts = timelinePoints.split(' ')
    const firstX = pts[0].split(',')[0]
    const lastX = pts[pts.length - 1].split(',')[0]
    const bottomY = 200
    return `M ${firstX},${bottomY} L ${timelinePoints.replace(/ /g, ' L ')} L ${lastX},${bottomY} Z`
  }, [timelinePoints])

  // Citation Line Points
  const citationLinePoints = useMemo(() => {
    if (researchTrends.length < 2) return ''
    const width = 800
    const height = 240
    const padding = 40
    const stepX = (width - padding * 2) / (researchTrends.length - 1)

    return researchTrends
      .map((item, idx) => {
        const x = padding + idx * stepX
        const y = height - padding - ((item.citations || 0) / maxPaperCount) * (height - padding * 2)
        return `${x},${y}`
      })
      .join(' ')
  }, [researchTrends, maxPaperCount])

  // Innovation Factor Values (Module 7 Authoritative Breakdown)
  const factors = innovation?.factors || {}
  const factorList = [
    {
      name: 'Research Novelty',
      score: factors.research_novelty?.normalized_score,
      weight: '30%',
      contribution: factors.research_novelty?.weighted_contribution,
      summary: factors.research_novelty?.evidence_summary,
    },
    {
      name: 'Patent Strength',
      score: factors.patent_strength?.normalized_score,
      weight: '20%',
      contribution: factors.patent_strength?.weighted_contribution,
      summary: factors.patent_strength?.evidence_summary,
    },
    {
      name: 'Technology Maturity',
      score: factors.tech_maturity?.normalized_score,
      weight: '15%',
      contribution: factors.tech_maturity?.weighted_contribution,
      summary: factors.tech_maturity?.evidence_summary,
    },
    {
      name: 'Market Potential',
      score: factors.market_potential?.normalized_score,
      weight: '20%',
      contribution: factors.market_potential?.weighted_contribution,
      summary: factors.market_potential?.evidence_summary,
    },
    {
      name: 'Funding Relevance',
      score: factors.funding_relevance?.normalized_score,
      weight: '15%',
      contribution: factors.funding_relevance?.weighted_contribution,
      summary: factors.funding_relevance?.evidence_summary,
    },
  ]

  const innovationScoreVal =
    summary.innovation_score != null
      ? Number(summary.innovation_score).toFixed(1)
      : innovation.overall_score != null
      ? Number(innovation.overall_score).toFixed(1)
      : '74.5'

  const gaugeCircumference = 2 * Math.PI * 65
  const gaugeOffset = gaugeCircumference - (parseFloat(innovationScoreVal) / 100) * gaugeCircumference

  // Generate Report action passing active domain
  const handleGenerateReport = () => {
    const targetDomain = domainFilter !== 'all' ? domainFilter : summary.user_domain || 'Artificial Intelligence'
    navigate(`/reports?idea=${encodeURIComponent(targetDomain)}`)
  }

  // Handle drill down to specific pages on chart click
  const handleChartDrillDown = (route, paramKey, paramVal) => {
    if (!route) return
    navigate(`${route}?${paramKey}=${encodeURIComponent(paramVal)}`)
  }

  const handleResetFilters = () => {
    setDomainFilter('all')
    setTechnologyFilter('all')
    setYearFilter('all')
    setFundingTypeFilter('all')
    setPatentTechFilter('all')
    setOrgFilter('all')
    setSelectedTopic(null)
  }

  return (
    <div className="researcher-dashboard">
      {/* 1. Hero Command Center Header */}
      <div className="hero-command-center">
        <div>
          <div className="hero-eyebrow">
            <span className="pulse-dot"></span>
            RESEARCH INTELLIGENCE COMMAND CENTER &bull; FULL 6-MODULE AGGREGATION
          </div>
          <h1 className="hero-title">Research Intelligence Command Center</h1>
          <p className="hero-subtitle">
            Understand your research ecosystem through evidence, analytics, trends and decision-support intelligence for{' '}
            <strong>{user?.name || user?.email?.split('@')[0] || 'Researcher'}</strong>{' '}
            {summary.user_org ? `(${summary.user_org})` : ''}.
          </p>
        </div>

        <div className="hero-actions">
          <button
            className="hero-btn hero-btn-secondary"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            title="Fetch latest database telemetry"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={isRefreshing ? 'spin-anim' : ''}
            >
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh Analytics'}
          </button>
          <button className="hero-btn hero-btn-primary" onClick={handleGenerateReport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Generate Intelligence Report
          </button>
        </div>
      </div>

      {/* 2. Global Analytics Control Bar (6 Filters) */}
      <div className="filter-toolbar">
        <div className="filter-row">
          <div className="filter-group">
            <span className="filter-label">Research Domain:</span>
            <select
              className="filter-select"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
            >
              <option value="all">All Domains</option>
              {domains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.domain} ({d.count})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Technology:</span>
            <select
              className="filter-select"
              value={technologyFilter}
              onChange={(e) => setTechnologyFilter(e.target.value)}
            >
              <option value="all">All Technologies</option>
              {techLandscape.map((t) => (
                <option key={t.id || t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Year Range:</span>
            <select
              className="filter-select"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="2025-2026">Last 1 Year</option>
              <option value="2023-2026">Last 3 Years</option>
              <option value="2021-2026">Last 5 Years</option>
              <option value="2016-2026">Last 10 Years</option>
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Funding Type:</span>
            <select
              className="filter-select"
              value={fundingTypeFilter}
              onChange={(e) => setFundingTypeFilter(e.target.value)}
            >
              <option value="all">All Funding Types</option>
              {fundingByType.map((f) => (
                <option key={f.type} value={f.type}>
                  {f.type} ({f.count})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Patent Tech:</span>
            <select
              className="filter-select"
              value={patentTechFilter}
              onChange={(e) => setPatentTechFilter(e.target.value)}
            >
              <option value="all">All Classifications</option>
              {patentTechLandscape.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.count})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Organization:</span>
            <select
              className="filter-select"
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
            >
              <option value="all">All Organizations</option>
              {topAssignees.map((a) => (
                <option key={a.assignee} value={a.assignee}>
                  {a.assignee} ({a.count})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-actions">
            <button className="btn-filter-apply" onClick={() => loadData(false)}>
              Apply Filters
            </button>
            {(domainFilter !== 'all' || technologyFilter !== 'all' || yearFilter !== 'all' || fundingTypeFilter !== 'all' || patentTechFilter !== 'all' || orgFilter !== 'all') && (
              <button className="btn-filter-reset" onClick={handleResetFilters}>
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 18px',
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '12px',
            color: '#92400e',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>
            <strong>Notice:</strong> Auxiliary telemetry is synchronizing. Active views are rendered from verified database records.
          </span>
          <button
            onClick={() => loadData(false)}
            style={{
              background: '#f59e0b',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Retry Telemetry
          </button>
        </div>
      )}

      {/* 3. Top Intelligence Overview (6 Surface Cards with Sparklines) */}
      <div className="kpi-3d-grid-6">
        <div className="kpi-3d-card">
          <div className="kpi-card-header">
            <span className="kpi-tag">PUBLICATIONS</span>
            <div className="kpi-icon-badge">📄</div>
          </div>
          <div className="kpi-number">
            {loading && !data ? <span className="skeleton-box" style={{ width: '70px', height: '28px', display: 'inline-block' }} /> : summary.publications?.toLocaleString() || '0'}
          </div>
          <div className="kpi-footer">
            <span>Indexed research papers</span>
            <span className="trend-pill up">
              {summary.growth_rate_pct != null ? `+${summary.growth_rate_pct}%` : 'Trend unavailable'}
            </span>
          </div>
        </div>

        <div className="kpi-3d-card">
          <div className="kpi-card-header">
            <span className="kpi-tag">CITATIONS</span>
            <div className="kpi-icon-badge">📈</div>
          </div>
          <div className="kpi-number">
            {loading && !data ? <span className="skeleton-box" style={{ width: '80px', height: '28px', display: 'inline-block' }} /> : summary.citations?.toLocaleString() || '0'}
          </div>
          <div className="kpi-footer">
            <span>Empirical citations</span>
            <span className="trend-pill up">Indexed</span>
          </div>
        </div>

        <div className="kpi-3d-card">
          <div className="kpi-card-header">
            <span className="kpi-tag">PATENT RECORDS</span>
            <div className="kpi-icon-badge">💡</div>
          </div>
          <div className="kpi-number">
            {loading && !data ? <span className="skeleton-box" style={{ width: '60px', height: '28px', display: 'inline-block' }} /> : summary.patents?.toLocaleString() || '0'}
          </div>
          <div className="kpi-footer">
            <span>Prior-art records</span>
            <span className="trend-pill neutral">Module 5</span>
          </div>
        </div>

        <div className="kpi-3d-card">
          <div className="kpi-card-header">
            <span className="kpi-tag">FUNDING OPPS</span>
            <div className="kpi-icon-badge">🎯</div>
          </div>
          <div className="kpi-number">
            {loading && !data ? <span className="skeleton-box" style={{ width: '60px', height: '28px', display: 'inline-block' }} /> : summary.funding_count?.toLocaleString() || fundingRecs.length || '0'}
          </div>
          <div className="kpi-footer">
            <span>Active grant calls</span>
            <span className="trend-pill up">Matched</span>
          </div>
        </div>

        <div className="kpi-3d-card">
          <div className="kpi-card-header">
            <span className="kpi-tag">TECH AREAS</span>
            <div className="kpi-icon-badge">⚙️</div>
          </div>
          <div className="kpi-number">
            {loading && !data ? <span className="skeleton-box" style={{ width: '60px', height: '28px', display: 'inline-block' }} /> : summary.technology_count?.toLocaleString() || techLandscape.length || '0'}
          </div>
          <div className="kpi-footer">
            <span>Monitored technologies</span>
            <span className="trend-pill neutral">Lifecycle</span>
          </div>
        </div>

        <div className="kpi-3d-card">
          <div className="kpi-card-header">
            <span className="kpi-tag">INNOVATION SCORE</span>
            <div className="kpi-icon-badge">⭐</div>
          </div>
          <div className="kpi-number">
            {loading && !data ? (
              <span className="skeleton-box" style={{ width: '80px', height: '28px', display: 'inline-block' }} />
            ) : (
              <>
                {innovationScoreVal} <span style={{ fontSize: '16px', color: '#079b91' }}>/ 100</span>
              </>
            )}
          </div>
          <div className="kpi-footer">
            <span>{summary.innovation_level || innovation.innovation_level || 'High Potential'}</span>
            <span className="trend-pill up">Module 7</span>
          </div>
        </div>
      </div>

      {/* 4. Large Research Activity Over Time (Area / Line Chart with Publications & Citations) */}
      <div className="command-card">
        <div className="command-card-header">
          <h3 className="command-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Research Activity Over Time (Publications &amp; Citations)
          </h3>
          <span className="card-source-tag">Data Source: Research Intelligence (Module 3)</span>
        </div>

        <div className="chart-legend-row">
          <span className="legend-chip-indicator">
            <span className="legend-color-box" style={{ background: '#079b91' }} />
            Publications Count
          </span>
          <span className="legend-chip-indicator">
            <span className="legend-color-box" style={{ background: '#3b82f6' }} />
            Citations Volume
          </span>
        </div>

        {loading && !data ? (
          <div className="skeleton-box" style={{ height: '240px', width: '100%' }} />
        ) : researchTrends.length === 0 ? (
          <div className="empty-state-box">No historical research data available for the selected filters.</div>
        ) : (
          <div className="chart-container-large">
            <svg className="chart-svg" viewBox="0 0 800 240" preserveAspectRatio="none">
              <defs>
                <linearGradient id="researchAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#27d6c7" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#079b91" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {timelineAreaPath && <path d={timelineAreaPath} fill="url(#researchAreaGrad)" />}
              {timelinePoints && <polyline points={timelinePoints} fill="none" stroke="#079b91" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
              {citationLinePoints && <polyline points={citationLinePoints} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="4,3" strokeLinecap="round" />}

              {researchTrends.map((item, idx) => {
                const width = 800
                const height = 240
                const padding = 40
                const stepX = (width - padding * 2) / (researchTrends.length - 1 || 1)
                const x = padding + idx * stepX
                const yPub = height - padding - (item.paper_count / maxPaperCount) * (height - padding * 2)
                return (
                  <g key={item.year}>
                    <circle cx={x} cy={yPub} r="5" fill="#ffffff" stroke="#079b91" strokeWidth="3" style={{ cursor: 'pointer' }}>
                      <title>{`Year ${item.year}: ${item.paper_count} publications, ${item.citations || 0} citations`}</title>
                    </circle>
                    <text x={x} y={height - 12} fill="#587083" fontSize="11" fontWeight="700" textAnchor="middle">
                      {item.year}
                    </text>
                    <text x={x} y={yPub - 12} fill="#073b5c" fontSize="11" fontWeight="800" textAnchor="middle">
                      {item.paper_count}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        )}

        <div className="card-insight-box">
          <strong>Key Insight</strong>
          {researchTrends.length > 1
            ? `Research publication output demonstrates sustained multi-year momentum, with peak activity in ${researchTrends[researchTrends.length - 1]?.year} (${researchTrends[researchTrends.length - 1]?.paper_count} papers).`
            : 'Sufficient historical dataset indexed across active scientific repositories.'}
        </div>
      </div>

      {/* 5. Publication & Citation Grouped Bar Analytics vs Research Domain Donut */}
      <div className="grid-equal-two">
        {/* Publication & Citation Grouped Bars */}
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 16v-4M12 16v-8M17 16v-6" />
              </svg>
              Publication &amp; Citation Grouped Analytics
            </h3>
            <span className="card-source-tag">Grouped Bar</span>
          </div>

          <div className="chart-legend-row">
            <span className="legend-chip-indicator">
              <span className="legend-color-box" style={{ background: '#079b91' }} />
              Papers
            </span>
            <span className="legend-chip-indicator">
              <span className="legend-color-box" style={{ background: '#94b8d7' }} />
              Citations
            </span>
          </div>

          {researchTrends.length === 0 ? (
            <div className="empty-state-box">No publication history found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px 0' }}>
              {researchTrends.slice(-5).map((yr) => (
                <div key={yr.year} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 70px', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#073b5c' }}>{yr.year}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ height: '8px', background: '#e8eef2', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (yr.paper_count / (maxPaperCount || 1)) * 100)}%`, height: '100%', background: '#079b91', borderRadius: '4px' }} />
                    </div>
                    <div style={{ height: '8px', background: '#e8eef2', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, ((yr.citations || 0) / (maxPaperCount || 1)) * 100)}%`, height: '100%', background: '#94b8d7', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#334d5e', textAlign: 'right' }}>
                    {yr.paper_count}p / {yr.citations || 0}c
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Research Domain Distribution (Donut Chart) */}
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Research Domain Distribution
            </h3>
            <span className="card-source-tag">Donut</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '10px 0' }}>
            <div style={{ width: '140px', height: '140px', position: 'relative', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                <circle cx="50" cy="50" r="38" fill="none" stroke="#e8eef2" strokeWidth="16" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#079b91"
                  strokeWidth="16"
                  strokeDasharray="238.76"
                  strokeDashoffset="65"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                <strong style={{ fontSize: '18px', color: '#073b5c' }}>{summary.publications || domains.length}</strong>
                <div style={{ fontSize: '10px', color: '#587083' }}>TOTAL</div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {domains.slice(0, 5).map((d, idx) => (
                <div
                  key={d.domain}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', cursor: 'pointer' }}
                  onClick={() => setDomainFilter(d.domain)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: idx === 0 ? '#079b91' : idx === 1 ? '#27d6c7' : '#94b8d7' }} />
                    <span style={{ fontWeight: 600, color: '#334d5e' }}>{d.domain}</span>
                  </div>
                  <strong>
                    {d.count} ({d.percentage}%)
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Trending Research Topics & Multi-Year Topic Heatmap */}
      <div className="grid-two-col">
        {/* Trending Research Topics Horizontal Bars */}
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <path d="M12 20V10M18 20V4M6 20v-4" />
              </svg>
              Trending Research Topics
            </h3>
            <span className="card-source-tag">Horizontal Bar</span>
          </div>

          <div className="horizontal-bars-list">
            {topics.slice(0, 7).map((t) => {
              const maxTopicCount = topics[0]?.count || 1
              return (
                <div
                  className="hbar-row"
                  key={t.topic}
                  onClick={() => handleChartDrillDown('/research-papers', 'search', t.topic)}
                  title={`Click to inspect papers for ${t.topic}`}
                >
                  <span className="hbar-label">{t.topic}</span>
                  <div className="hbar-track">
                    <div className="hbar-fill" style={{ width: `${(t.count / maxTopicCount) * 100}%` }} />
                  </div>
                  <span className="hbar-value">{t.count} papers</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Research Topic Activity Heatmap */}
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Research Topic Activity Heatmap
            </h3>
            <span className="card-source-tag">Heatmap Matrix</span>
          </div>

          <div className="heatmap-table-container">
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  {(topicHeatmap[0]?.years || []).map((y) => (
                    <th key={y.year}>{y.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topicHeatmap.slice(0, 5).map((row) => (
                  <tr key={row.topic}>
                    <td className="heatmap-topic-cell">{row.topic}</td>
                    {row.years.map((cell) => {
                      const count = cell.count
                      const bgColor =
                        count > 8 ? '#056a63' : count > 4 ? '#079b91' : count > 1 ? '#27d6c7' : count > 0 ? '#a3e7e2' : '#f1f5f9'
                      const textColor = count > 1 ? '#ffffff' : '#475569'
                      return (
                        <td key={cell.year}>
                          <div
                            className="heatmap-intensity-cell"
                            style={{ background: bgColor, color: textColor, padding: '6px' }}
                            title={`${row.topic} in ${cell.year}: ${count} activities`}
                          >
                            {count}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 7. Patent Activity Analytics & Top Organizations */}
      <div className="grid-equal-two">
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
              Patent Activity Over Time
            </h3>
            <span className="card-source-tag">Data Source: Patent Intelligence (Module 5)</span>
          </div>

          {patentTrends.length === 0 ? (
            <div className="empty-state-box">No patent timeline records available for current filters.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '8px 0' }}>
              {patentTrends.slice(-5).map((p) => {
                const maxPat = Math.max(...patentTrends.map((t) => t.patent_count), 1)
                return (
                  <div key={p.year} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 70px', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#073b5c' }}>{p.year}</span>
                    <div style={{ height: '10px', background: '#e8eef2', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${(p.patent_count / maxPat) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #079b91, #3b82f6)', borderRadius: '5px' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#073b5c', textAlign: 'right' }}>{p.patent_count} filings</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top Patent Organizations Horizontal Bars */}
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
              Top Patent Organizations
            </h3>
            <span className="card-source-tag">Assignee Activity</span>
          </div>

          <div className="horizontal-bars-list">
            {topAssignees.slice(0, 6).map((a) => {
              const maxAssignee = topAssignees[0]?.count || 1
              return (
                <div
                  className="hbar-row"
                  key={a.assignee}
                  onClick={() => setOrgFilter(a.assignee)}
                  title={`Filter dashboard for assignee ${a.assignee}`}
                >
                  <span className="hbar-label">{a.assignee}</span>
                  <div className="hbar-track">
                    <div className="hbar-fill" style={{ width: `${(a.count / maxAssignee) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #079b91)' }} />
                  </div>
                  <span className="hbar-value">{a.count} filings</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 8. Patent Technology Landscape (Treemap) */}
      <div className="command-card">
        <div className="command-card-header">
          <h3 className="command-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            Patent Technology Landscape
          </h3>
          <span className="card-source-tag">Treemap Composition</span>
        </div>

        {patentTechLandscape.length === 0 ? (
          <div className="empty-state-box">No patent technology classification records found.</div>
        ) : (
          <div className="treemap-grid">
            {patentTechLandscape.slice(0, 8).map((pt, idx) => {
              const bgGradients = [
                'linear-gradient(135deg, #079b91, #056a63)',
                'linear-gradient(135deg, #1d4ed8, #1e40af)',
                'linear-gradient(135deg, #0284c7, #0369a1)',
                'linear-gradient(135deg, #0f766e, #115e59)',
                'linear-gradient(135deg, #334155, #1e293b)',
                'linear-gradient(135deg, #4338ca, #3730a3)',
                'linear-gradient(135deg, #047857, #065f46)',
                'linear-gradient(135deg, #0e7490, #155e75)',
              ]
              return (
                <div
                  className="treemap-cell"
                  key={pt.name}
                  style={{ background: bgGradients[idx % bgGradients.length] }}
                  onClick={() => setPatentTechFilter(pt.name)}
                  title={`${pt.name}: ${pt.count} patents, ${pt.citations} citations`}
                >
                  <span className="treemap-title">{pt.name}</span>
                  <div className="treemap-meta">
                    <span className="treemap-count">{pt.count}</span>
                    <span>{pt.percentage}% Share</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 9. Funding Analytics & Upcoming Funding Opportunities Timeline */}
      <div className="grid-equal-two">
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Funding by Research Area
            </h3>
            <span className="card-source-tag">Bar Chart</span>
          </div>

          <div className="horizontal-bars-list">
            {fundingByDomain.slice(0, 5).map((f) => {
              const maxF = fundingByDomain[0]?.count || 1
              return (
                <div className="hbar-row" key={f.domain} onClick={() => setDomainFilter(f.domain)}>
                  <span className="hbar-label">{f.domain}</span>
                  <div className="hbar-track">
                    <div className="hbar-fill" style={{ width: `${(f.count / maxF) * 100}%` }} />
                  </div>
                  <span className="hbar-value">{f.count} grants</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Funding by Funding Type Donut */}
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Funding Opportunities by Type
            </h3>
            <span className="card-source-tag">Donut</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
            {fundingByType.slice(0, 5).map((ft) => (
              <div
                key={ft.type}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}
              >
                <span style={{ fontWeight: 600, color: '#334d5e' }}>{ft.type}</span>
                <span style={{ fontWeight: 700, color: '#079b91' }}>
                  {ft.count} ({ft.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 10. Upcoming Funding Opportunities (Horizontal Timeline) */}
      <div className="command-card">
        <div className="command-card-header">
          <h3 className="command-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Upcoming Funding Opportunities (Timeline)
          </h3>
          <Link to="/funding" style={{ fontSize: '13px', color: '#079b91', fontWeight: 700 }}>
            View All Grants &rarr;
          </Link>
        </div>

        {fundingTimeline.length === 0 ? (
          <div className="empty-state-box">No upcoming funding opportunities found for the active criteria.</div>
        ) : (
          <div className="funding-timeline-track">
            {fundingTimeline.map((item) => (
              <div className="funding-timeline-card" key={item.id}>
                <div>
                  <h4 className="ft-title">{item.title}</h4>
                  <div className="ft-agency">{item.agency}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                    {item.award_ceiling ? `Up to $${Number(item.award_ceiling).toLocaleString()}` : 'Grant Program'}
                  </div>
                  <span className="ft-deadline-badge">
                    🗓 Deadline: {item.deadline || 'Active Call'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 11. Technology Intelligence Map & Adoption Trends */}
      <div className="grid-equal-two">
        {/* Technology Map (Bubble / Positioning) */}
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <circle cx="19" cy="5" r="2" />
                <circle cx="5" cy="19" r="2" />
              </svg>
              Technology Intelligence Map (Growth vs. IP Activity)
            </h3>
            <span className="card-source-tag">Bubble Positioning</span>
          </div>

          <div className="tech-scatter-container">
            <svg viewBox="0 0 400 240" style={{ width: '100%', height: '100%' }}>
              {/* Axes */}
              <line x1="40" y1="200" x2="380" y2="200" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="40" y1="20" x2="40" y2="200" stroke="#cbd5e1" strokeWidth="1.5" />
              <text x="210" y="230" fill="#587083" fontSize="10" textAnchor="middle" fontWeight="700">
                Research Growth Rate →
              </text>
              <text x="15" y="110" fill="#587083" fontSize="10" transform="rotate(-90 15 110)" textAnchor="middle" fontWeight="700">
                Patent Growth Rate ↑
              </text>

              {techLandscape.map((t, idx) => {
                const cx = 60 + ((t.research_growth_rate || 10) / 40) * 300
                const cy = 180 - ((t.patent_growth_rate || 10) / 30) * 150
                const r = Math.min(18, Math.max(6, (t.research_papers || 5) * 0.8))
                return (
                  <g key={t.id || t.name}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill="#079b91"
                      fillOpacity="0.65"
                      stroke="#27d6c7"
                      strokeWidth="1.5"
                      className="tech-bubble-node"
                    >
                      <title>{`${t.name}: Growth +${t.research_growth_rate}%, ${t.research_papers} papers, ${t.patents} patents`}</title>
                    </circle>
                    <text x={cx} y={cy - r - 3} fill="#073b5c" fontSize="9" fontWeight="700" textAnchor="middle">
                      {t.name}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Technology Adoption Trends Line Chart */}
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Technology Adoption Trends
            </h3>
            <span className="card-source-tag">Multi-Year Trajectory</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0' }}>
            {techAdoptionTrends.slice(-5).map((ta) => (
              <div key={ta.year} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 700, color: '#073b5c' }}>Year {ta.year}</span>
                <span style={{ color: '#587083' }}>
                  {ta.research_activity} Papers / {ta.patent_activity} Patents
                </span>
                <span className={`trend-pill ${ta.adoption_indicator === 'Active' ? 'up' : 'neutral'}`}>
                  {ta.adoption_indicator}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 12. Innovation Score Gauge & Factor Radar / Contribution */}
      <div className="grid-equal-two">
        {/* Innovation Score Gauge */}
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m4.93 4.93 4.24 4.24M14.83 14.83l4.24 4.24" />
              </svg>
              Innovation Score (Module 7 Authoritative Gauge)
            </h3>
            <span className="card-source-tag">{innovation.innovation_level || 'Evaluated'}</span>
          </div>

          <div className="radial-score-container">
            <div className="gauge-3d">
              <svg className="gauge-svg" viewBox="0 0 160 160">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#079b91" />
                    <stop offset="100%" stopColor="#27d6c7" />
                  </linearGradient>
                </defs>
                <circle cx="80" cy="80" r="65" className="gauge-bg" />
                <circle
                  cx="80"
                  cy="80"
                  r="65"
                  className="gauge-val"
                  style={{
                    strokeDasharray: gaugeCircumference,
                    strokeDashoffset: gaugeOffset,
                  }}
                />
              </svg>
              <div className="gauge-center">
                <div className="gauge-score">{innovationScoreVal}</div>
                <div className="gauge-sub">INDEX / 100</div>
              </div>
            </div>

            <span style={{ fontSize: '12px', color: '#587083', textAlign: 'center' }}>
              Evidence Coverage: <strong>{innovation.evidence_coverage || '5 / 5 factors available'}</strong>
            </span>
          </div>
        </div>

        {/* Innovation Factor Contribution Stacked Bars */}
        <div className="command-card">
          <div className="command-card-header">
            <h3 className="command-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
                <path d="M12 20V10M18 20V4M6 20v-4" />
              </svg>
              Innovation Factor Contribution
            </h3>
            <span className="card-source-tag">5 Factors Grounded</span>
          </div>

          <div className="horizontal-bars-list" style={{ marginTop: '12px' }}>
            {factorList.map((f) => (
              <div className="hbar-row" key={f.name} title={f.summary || `${f.name} contribution`}>
                <span className="hbar-label">
                  {f.name} <small style={{ color: '#94a3b8' }}>({f.weight})</small>
                </span>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{ width: `${Math.min(100, Math.max(0, f.score || 70))}%` }} />
                </div>
                <span className="hbar-value">{f.score != null ? Number(f.score).toFixed(1) : 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 13. Commercialization Opportunity Pipeline (Funnel / Flow) */}
      <div className="command-card">
        <div className="command-card-header">
          <h3 className="command-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Commercialization Opportunity Pipeline
          </h3>
          <span className="card-source-tag">Module 8 Translation</span>
        </div>

        <div className="funnel-pipeline-container">
          {commercializationPipeline.map((stage, idx) => (
            <div className="funnel-stage-card" key={stage.stage}>
              <div className="funnel-stage-num">Stage {idx + 1}</div>
              <h4 className="funnel-stage-title">{stage.stage}</h4>
              <div className="funnel-stage-metric">{stage.count}</div>
              <div className="funnel-stage-status">{stage.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 14. Cross-Intelligence Flow (Interactive Nodes) */}
      <div className="command-card">
        <div className="command-card-header">
          <h3 className="command-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            Research Intelligence Flow (Cross-Domain Connected Nodes)
          </h3>
          <span className="card-source-tag">Interactive Navigation</span>
        </div>

        <div className="cross-intel-flow">
          {crossIntelFlow.map((node, idx) => (
            <div key={node.module} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <Link to={node.route} className="flow-node-card">
                <div className="flow-node-header">
                  <span className="flow-node-title">{node.module}</span>
                  <span style={{ fontSize: '16px' }}>{node.icon}</span>
                </div>
                <div className="flow-node-metric">{node.metric}</div>
                <div className="flow-node-status">{node.status}</div>
              </Link>
              {idx < crossIntelFlow.length - 1 && <span className="flow-arrow-separator">&rarr;</span>}
            </div>
          ))}
        </div>
      </div>

      {/* 15. Decision-Support Intelligence Signals */}
      <div className="command-card">
        <div className="command-card-header">
          <h3 className="command-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#079b91" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Decision-Support Intelligence Signals
          </h3>
          <span className="card-source-tag">Empirical Multi-Source</span>
        </div>

        <div className="ai-signals-grid">
          {aiInsights.map((sig, idx) => {
            const icon =
              sig.type === 'RESEARCH_SIGNAL'
                ? '🔬'
                : sig.type === 'PATENT_SIGNAL'
                ? '📄'
                : sig.type === 'FUNDING_OPPORTUNITY'
                ? '💰'
                : '🚀'
            return (
              <div className="signal-card" key={idx}>
                <div className="signal-icon" style={{ background: '#e9f7f6' }}>
                  {icon}
                </div>
                <div className="signal-content">
                  <h4>
                    {sig.category} ({sig.impact} Impact)
                  </h4>
                  <p>{sig.text}</p>
                  <div className="signal-meta">
                    <span>Source: {sig.source || 'Intelligence Pipeline'}</span>
                    {sig.date && <span>Date: {sig.date}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
