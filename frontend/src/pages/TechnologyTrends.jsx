import React, { useState, useEffect } from 'react'
import { technologyService } from '../services/technologyService'
import './TechnologyTrends.css'

export default function TechnologyTrends({ customAnalysis, onClearCustom }) {
  const [trends, setTrends] = useState([])
  const [adoptions, setAdoptions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTrend, setFilterTrend] = useState('ALL')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const [trendList, adoptionList] = await Promise.all([
        technologyService.getAllTrends(),
        technologyService.getAllAdoptions(),
      ])
      setTrends(trendList || [])

      // Map adoptions by technology_id for sparkline generation
      const adpMap = {}
      if (adoptionList) {
        adoptionList.forEach((adp) => {
          adpMap[adp.technology_id] = adp
        })
      }
      setAdoptions(adpMap)
    } catch (err) {
      setError(err.message || 'Failed to load technology trends')
    } finally {
      setLoading(false)
    }
  }

  // Real SVG sparkline renderer
  const renderSparkline = (metrics) => {
    if (!metrics || metrics.length < 2) {
      return (
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
          Insufficient data
        </span>
      )
    }

    const width = 120
    const height = 32
    const maxVal = Math.max(...metrics.map((m) => m.total_activity || 1), 2)
    const pointsCount = metrics.length

    const points = metrics.map((m, i) => {
      const x = 5 + (i / (pointsCount - 1)) * (width - 10)
      const y = height - 5 - ((m.total_activity || 0) / maxVal) * (height - 10)
      return `${x},${y}`
    }).join(' ')

    return (
      <svg className="sparkline-svg" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke="#0d9488"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {metrics.map((m, i) => {
          const x = 5 + (i / (pointsCount - 1)) * (width - 10)
          const y = height - 5 - ((m.total_activity || 0) / maxVal) * (height - 10)
          return (
            <circle
              key={m.year}
              cx={x}
              cy={y}
              r={i === pointsCount - 1 ? 3.5 : 2}
              fill={i === pointsCount - 1 ? '#0f766e' : '#14b8a6'}
            />
          )
        })}
      </svg>
    )
  }

  const filteredTrends = trends.filter((item) => {
    const matchesSearch = item.technology_name.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    if (filterTrend === 'ALL') return true
    return item.trend.toUpperCase() === filterTrend.toUpperCase()
  })

  return (
    <div className="tech-trends-container">
      {/* Page Header */}
      <div className="page-header-block">
        <div className="page-header-flex">
          <div>
            <h1 className="page-title">Technology Trend Analysis</h1>
            <p className="page-subtitle">
              Empirical trajectory classification, velocity indicators, and multi-year momentum tracking across active innovation domains.
            </p>
          </div>
          <div className="trend-search-group">
            <div className="trend-input-wrapper">
              <span className="trend-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search technology domain or concept..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // search filter already reactive
                  }
                }}
                className="trend-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="trend-clear-btn"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              className="trend-action-search-btn"
              onClick={() => {
                // Focus / trigger search
              }}
            >
              <span>Search Trends</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="trend-filter-bar">
        {['ALL', 'GROWING', 'STABLE', 'DECLINING', 'INSUFFICIENT DATA'].map((cat) => (
          <button
            key={cat}
            className={`filter-pill-btn ${filterTrend === cat ? 'active' : ''}`}
            onClick={() => setFilterTrend(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Custom Technology Analysis Inspection Card (if active) */}
      {customAnalysis && customAnalysis.trend && (
        <div className="surface-card trend-card highlight-card">
          <div className="trend-card-header">
            <div>
              <div className="eyebrow-teal">Currently Explored Technology</div>
              <h2 className="trend-title" style={{ fontSize: '1.45rem' }}>{customAnalysis.technology_name}</h2>
              <span className="trend-domain-sub">
                {customAnalysis.technology_domain || 'Technology Domain Unspecified'}
              </span>
            </div>
            <span className={`trend-badge ${customAnalysis.trend.trend.toLowerCase().replace(' ', '-')}`}>
              {customAnalysis.trend.trend === 'Growing' ? '↑ Growing' : customAnalysis.trend.trend === 'Declining' ? '↓ Declining' : '→ Stable'}
            </span>
          </div>

          <div className="trend-stats-and-sparkline">
            <div className="growth-stat-box">
              <span
                className={`growth-number ${
                  customAnalysis.trend.growth_rate > 0 ? 'positive' : customAnalysis.trend.growth_rate < 0 ? 'negative' : 'neutral'
                }`}
              >
                {customAnalysis.trend.growth_rate !== null
                  ? customAnalysis.trend.growth_rate > 0
                    ? `+${customAnalysis.trend.growth_rate}%`
                    : `${customAnalysis.trend.growth_rate}%`
                  : 'N/A'}
              </span>
              <span className="growth-label">
                {customAnalysis.trend.growth_rate !== null ? 'Annual Activity Growth' : 'Growth Rate Unavailable'}
              </span>
            </div>

            <div className="trend-sparkline-box">
              <span className="sparkline-title">HISTORICAL TRAJECTORY</span>
              {renderSparkline(customAnalysis.adoption?.yearly_metrics)}
            </div>
          </div>

          <p className="trend-explanation-text">
            {customAnalysis.trend.explanation}
          </p>

          <div className="growth-breakdown">
            <div className="growth-breakdown-item">
              <span className="growth-breakdown-lbl">Research Signal</span>
              <span className="growth-breakdown-val" style={{ color: '#2563eb' }}>
                {customAnalysis.trend.evidence.research_growth !== null ? `${customAnalysis.trend.evidence.research_growth > 0 ? '+' : ''}${customAnalysis.trend.evidence.research_growth}%` : '—'}
              </span>
            </div>
            <div className="growth-breakdown-item">
              <span className="growth-breakdown-lbl">Patent Signal</span>
              <span className="growth-breakdown-val" style={{ color: '#7c3aed' }}>
                {customAnalysis.trend.evidence.patent_growth !== null ? `${customAnalysis.trend.evidence.patent_growth > 0 ? '+' : ''}${customAnalysis.trend.evidence.patent_growth}%` : '—'}
              </span>
            </div>
            <div className="growth-breakdown-item">
              <span className="growth-breakdown-lbl">Organization Signal</span>
              <span className="growth-breakdown-val" style={{ color: '#059669' }}>
                {customAnalysis.trend.evidence.organization_growth !== null ? `${customAnalysis.trend.evidence.organization_growth > 0 ? '+' : ''}${customAnalysis.trend.evidence.organization_growth}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Analyzing multi-year trends &amp; momentum metrics...</p>
        </div>
      ) : filteredTrends.length === 0 ? (
        <div className="surface-card empty-state-card">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f2942', margin: '0 0 0.5rem 0' }}>No Matching Technology Trends</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Try clearing your search query or ingesting additional historical records.</p>
        </div>
      ) : (
        <>
          <div className="trend-grid">
            {filteredTrends.map((t) => {
              const trendClass = t.trend.toLowerCase().replace(' ', '-')
              const techAdoption = adoptions[t.technology_id]
              const isPositive = t.growth_rate > 0
              const isNegative = t.growth_rate < 0

              return (
                <div key={t.technology_id} className="surface-card trend-card">
                  <div className="trend-card-header">
                    <h2 className="trend-title">{t.technology_name}</h2>
                    <span className={`trend-badge ${trendClass}`}>
                      {t.trend === 'Growing' ? '↑ Growing' : t.trend === 'Declining' ? '↓ Declining' : t.trend === 'Stable' ? '→ Stable' : 'Insufficient Data'}
                    </span>
                  </div>

                  <div className="trend-stats-and-sparkline">
                    <div className="growth-stat-box">
                      <span
                        className={`growth-number ${
                          isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'
                        }`}
                      >
                        {t.growth_rate !== null
                          ? isPositive
                            ? `+${t.growth_rate}%`
                            : `${t.growth_rate}%`
                          : 'N/A'}
                      </span>
                      <span className="growth-label">
                        {t.growth_rate !== null ? 'Activity Growth' : 'N/A'}
                      </span>
                    </div>

                    <div className="trend-sparkline-box">
                      {renderSparkline(techAdoption?.yearly_metrics)}
                    </div>
                  </div>

                  <p className="trend-explanation-text">
                    {t.explanation}
                  </p>

                  {/* Growth factor breakdown */}
                  <div className="growth-breakdown">
                    <div className="growth-breakdown-item">
                      <span className="growth-breakdown-lbl">Research</span>
                      <span className="growth-breakdown-val" style={{ color: '#2563eb' }}>
                        {t.evidence.research_growth !== null ? `${t.evidence.research_growth > 0 ? '+' : ''}${t.evidence.research_growth}%` : '—'}
                      </span>
                    </div>
                    <div className="growth-breakdown-item">
                      <span className="growth-breakdown-lbl">Patents</span>
                      <span className="growth-breakdown-val" style={{ color: '#7c3aed' }}>
                        {t.evidence.patent_growth !== null ? `${t.evidence.patent_growth > 0 ? '+' : ''}${t.evidence.patent_growth}%` : '—'}
                      </span>
                    </div>
                    <div className="growth-breakdown-item">
                      <span className="growth-breakdown-lbl">Orgs</span>
                      <span className="growth-breakdown-val" style={{ color: '#059669' }}>
                        {t.evidence.organization_growth !== null ? `${t.evidence.organization_growth > 0 ? '+' : ''}${t.evidence.organization_growth}%` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="trend-footer-span">
                    Observed across {t.evidence.active_years_analyzed} active years ({t.evidence.previous_year_activity} → {t.evidence.latest_year_activity} points)
                  </div>
                </div>
              )
            })}
          </div>

          {/* Compact Multi-Technology Comparison Matrix */}
          <div className="surface-card comparison-table-card">
            <div className="section-head-wrap">
              <h3 className="section-title">Cross-Technology Trajectory Comparison View</h3>
              <p className="section-subtitle">
                Comparative intelligence analysis of verifiable multi-year growth velocity and recent activity levels.
              </p>
            </div>

            <div className="table-responsive-wrapper">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Technology</th>
                    <th>Trend Classification</th>
                    <th>Activity Growth</th>
                    <th>Recent Activity Velocity</th>
                    <th>Observed Span</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrends.map((t) => {
                    const techAdp = adoptions[t.technology_id]
                    return (
                      <tr key={t.technology_id}>
                        <td style={{ fontWeight: 800, color: '#0f2942' }}>{t.technology_name}</td>
                        <td>
                          <span className={`trend-badge ${t.trend.toLowerCase().replace(' ', '-')}`} style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}>
                            {t.trend}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {t.growth_rate !== null ? (
                            <span style={{ color: t.growth_rate > 0 ? '#059669' : t.growth_rate < 0 ? '#dc2626' : '#475569' }}>
                              {t.growth_rate > 0 ? `+${t.growth_rate}%` : `${t.growth_rate}%`}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>N/A</span>
                          )}
                        </td>
                        <td>
                          <strong style={{ color: '#0f2942' }}>{t.evidence.latest_year_activity} pts</strong> (prior: {t.evidence.previous_year_activity} pts)
                        </td>
                        <td style={{ color: '#475569' }}>
                          {t.evidence.active_years_analyzed} active years {techAdp?.years ? `(${techAdp.years[0]} – ${techAdp.years[techAdp.years.length - 1]})` : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

