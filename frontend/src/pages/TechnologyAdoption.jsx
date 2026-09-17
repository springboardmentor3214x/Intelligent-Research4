import React, { useState, useEffect, useMemo } from 'react'
import { technologyService } from '../services/technologyService'
import './TechnologyAdoption.css'

export default function TechnologyAdoption({ customAnalysis, onClearCustom }) {
  const [technologies, setTechnologies] = useState([])
  const [selectedTechId, setSelectedTechId] = useState('')
  const [adoptionData, setAdoptionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adoptionLoading, setAdoptionLoading] = useState(false)
  const [error, setError] = useState('')

  // Chart Controls
  const [activeSignal, setActiveSignal] = useState('combined') // 'combined' | 'research' | 'patents' | 'organizations'
  const [timeRange, setTimeRange] = useState('ALL') // '5Y' | '10Y' | 'ALL'
  const [selectedYear, setSelectedYear] = useState(null)
  const [hoveredMetric, setHoveredMetric] = useState(null)

  // Evidence Table Controls
  const [sortField, setSortField] = useState('year')
  const [sortAsc, setSortAsc] = useState(false)
  const [expandedYear, setExpandedYear] = useState(null)
  const [tableSearch, setTableSearch] = useState('')
  const [tableTrendFilter, setTableTrendFilter] = useState('ALL')

  useEffect(() => {
    loadTechnologies()
  }, [])

  useEffect(() => {
    if (customAnalysis && customAnalysis.adoption) {
      setAdoptionData(customAnalysis.adoption)
      if (customAnalysis.technology_id) {
        setSelectedTechId(customAnalysis.technology_id)
      }
      if (customAnalysis.adoption.yearly_metrics?.length > 0) {
        setSelectedYear(customAnalysis.adoption.yearly_metrics[customAnalysis.adoption.yearly_metrics.length - 1])
      }
    }
  }, [customAnalysis])

  async function loadTechnologies() {
    try {
      setLoading(true)
      setError('')
      const list = await technologyService.getTechnologies()
      setTechnologies(list || [])
      if (list && list.length > 0 && !customAnalysis) {
        setSelectedTechId(list[0].id)
        loadAdoption(list[0].id)
      }
    } catch (err) {
      setError(err.message || 'Failed to load technologies')
    } finally {
      setLoading(false)
    }
  }

  async function loadAdoption(id) {
    if (!id) return
    try {
      setAdoptionLoading(true)
      const data = await technologyService.getTechnologyAdoption(id)
      setAdoptionData(data)
      if (data && data.yearly_metrics && data.yearly_metrics.length > 0) {
        setSelectedYear(data.yearly_metrics[data.yearly_metrics.length - 1])
      } else {
        setSelectedYear(null)
      }
    } catch (err) {
      console.error('Failed to load adoption data:', err)
    } finally {
      setAdoptionLoading(false)
    }
  }

  function handleSelectChange(e) {
    if (onClearCustom) onClearCustom()
    const id = e.target.value
    setSelectedTechId(id)
    loadAdoption(id)
  }

  // Filtered metrics based on Time Range
  const filteredMetrics = useMemo(() => {
    if (!adoptionData || !adoptionData.yearly_metrics) return []
    const all = [...adoptionData.yearly_metrics]
    if (timeRange === '5Y') return all.slice(-5)
    if (timeRange === '10Y') return all.slice(-10)
    return all
  }, [adoptionData, timeRange])

  // Sorted and searched metrics for Evidence Table
  const sortedTableMetrics = useMemo(() => {
    if (!filteredMetrics) return []
    let result = [...filteredMetrics]

    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim()
      result = result.filter(
        (m) =>
          String(m.year).includes(q) ||
          String(m.publications).includes(q) ||
          String(m.patents).includes(q) ||
          String(m.organizations).includes(q) ||
          String(m.total_activity).includes(q)
      )
    }

    if (tableTrendFilter !== 'ALL') {
      result = result.filter((m) => {
        if (tableTrendFilter === 'GROWING') return (m.yoy_growth_percent || 0) > 0
        if (tableTrendFilter === 'DECLINING') return (m.yoy_growth_percent || 0) < 0
        if (tableTrendFilter === 'BASELINE') return m.yoy_growth_percent === null || m.yoy_growth_percent === 0
        return true
      })
    }

    return result.sort((a, b) => {
      let valA = a[sortField] ?? 0
      let valB = b[sortField] ?? 0
      if (sortField === 'growth') {
        valA = a.yoy_growth_percent ?? -9999
        valB = b.yoy_growth_percent ?? -9999
      }
      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })
  }, [filteredMetrics, sortField, sortAsc, tableSearch, tableTrendFilter])

  function handleSort(field) {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  // Maximum total for visual scaling
  const maxMetricTotal = useMemo(() => {
    if (!adoptionData?.yearly_metrics?.length) return 1
    return Math.max(...adoptionData.yearly_metrics.map((m) => m.total_activity || 1))
  }, [adoptionData])

  // =========================================================================
  // Technology Trajectory Multi-Signal Temporal Visualization (SVG)
  // =========================================================================
  const renderTrajectoryChart = () => {
    if (!filteredMetrics || filteredMetrics.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748b', fontWeight: 600 }}>
          Insufficient time-series data to render technology trajectory.
        </div>
      )
    }

    const width = 860
    const height = 280
    const padLeft = 55
    const padRight = 35
    const padTop = 30
    const padBottom = 40
    const chartW = width - padLeft - padRight
    const chartH = height - padTop - padBottom

    // Determine max value based on active signal filter
    let maxVal = 1
    filteredMetrics.forEach((m) => {
      if (activeSignal === 'combined' || activeSignal === 'all') {
        maxVal = Math.max(maxVal, m.total_activity, m.publications, m.patents, m.organizations)
      } else if (activeSignal === 'research') {
        maxVal = Math.max(maxVal, m.publications)
      } else if (activeSignal === 'patents') {
        maxVal = Math.max(maxVal, m.patents)
      } else if (activeSignal === 'organizations') {
        maxVal = Math.max(maxVal, m.organizations)
      }
    })
    maxVal = Math.max(maxVal, 3)

    const pointsCount = filteredMetrics.length
    const getX = (idx) => {
      if (pointsCount === 1) return padLeft + chartW / 2
      return padLeft + (idx / (pointsCount - 1)) * chartW
    }
    const getY = (val) => padTop + chartH - (val / maxVal) * chartH

    // Generate Path helpers
    const buildPath = (valKey) => {
      return filteredMetrics.map((m, idx) => {
        const x = getX(idx)
        const y = getY(m[valKey])
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
      }).join(' ')
    }

    const buildAreaPath = (valKey) => {
      const line = buildPath(valKey)
      const firstX = getX(0)
      const lastX = getX(pointsCount - 1)
      const bottomY = padTop + chartH
      return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
    }

    const isSparse = pointsCount > 1 && filteredMetrics.some((m, idx) => {
      if (idx === 0) return false
      return m.year - filteredMetrics[idx - 1].year > 1
    })

    return (
      <div className="trajectory-chart-wrapper">
        <svg
          className="svg-chart"
          viewBox={`0 0 ${width} ${height}`}
          onMouseLeave={() => setHoveredMetric(null)}
        >
          <defs>
            <linearGradient id="researchGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="patentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="orgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f2942" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0f2942" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = padTop + chartH * (1 - ratio)
            const tickVal = Math.round(maxVal * ratio)
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="end"
                >
                  {tickVal}
                </text>
              </g>
            )
          })}

          {/* Area Fills */}
          {(activeSignal === 'combined' || activeSignal === 'research') && (
            <path d={buildAreaPath('publications')} fill="url(#researchGrad)" />
          )}
          {(activeSignal === 'combined' || activeSignal === 'patents') && (
            <path d={buildAreaPath('patents')} fill="url(#patentGrad)" />
          )}
          {(activeSignal === 'combined' || activeSignal === 'organizations') && (
            <path d={buildAreaPath('organizations')} fill="url(#orgGrad)" />
          )}

          {/* Signal Lines */}
          {(activeSignal === 'combined' || activeSignal === 'research') && (
            <path
              d={buildPath('publications')}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeDasharray={isSparse ? '3 3' : 'none'}
            />
          )}
          {(activeSignal === 'combined' || activeSignal === 'patents') && (
            <path
              d={buildPath('patents')}
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2.5"
              strokeDasharray={isSparse ? '3 3' : 'none'}
            />
          )}
          {(activeSignal === 'combined' || activeSignal === 'organizations') && (
            <path
              d={buildPath('organizations')}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeDasharray={isSparse ? '3 3' : 'none'}
            />
          )}
          {activeSignal === 'combined' && (
            <path
              d={buildPath('total_activity')}
              fill="none"
              stroke="#0f2942"
              strokeWidth="3"
            />
          )}

          {/* Interactive Crosshair & Year Points */}
          {filteredMetrics.map((m, idx) => {
            const x = getX(idx)
            const isHovered = hoveredMetric?.year === m.year
            const isSelected = selectedYear?.year === m.year

            return (
              <g
                key={m.year}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredMetric(m)}
                onClick={() => setSelectedYear(m)}
              >
                {/* Vertical Timeline Guide */}
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + chartH}
                  stroke={isSelected ? '#0d9488' : isHovered ? '#94a3b8' : 'transparent'}
                  strokeWidth={isSelected ? '2' : '1'}
                  strokeDasharray={isSelected ? 'none' : '2 2'}
                />

                {/* Combined Total Point */}
                {activeSignal === 'combined' && (
                  <circle
                    cx={x}
                    cy={getY(m.total_activity)}
                    r={isSelected ? 6 : isHovered ? 5 : 4}
                    fill="#0f2942"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                )}

                {/* Research Point */}
                {(activeSignal === 'combined' || activeSignal === 'research') && (
                  <circle
                    cx={x}
                    cy={getY(m.publications)}
                    r={isSelected ? 5.5 : 4}
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}

                {/* Patent Point */}
                {(activeSignal === 'combined' || activeSignal === 'patents') && (
                  <circle
                    cx={x}
                    cy={getY(m.patents)}
                    r={isSelected ? 5.5 : 4}
                    fill="#7c3aed"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}

                {/* Organization Point */}
                {(activeSignal === 'combined' || activeSignal === 'organizations') && (
                  <circle
                    cx={x}
                    cy={getY(m.organizations)}
                    r={isSelected ? 5.5 : 4}
                    fill="#059669"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}

                {/* Year Label */}
                <text
                  x={x}
                  y={height - 12}
                  fill={isSelected ? '#0d9488' : isHovered ? '#0f2942' : '#64748b'}
                  fontSize="11"
                  fontWeight={isSelected ? '800' : '600'}
                  textAnchor="middle"
                >
                  {m.year}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Hover Synchronized Tooltip */}
        {hoveredMetric && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '18px',
              background: '#0f2942',
              color: '#ffffff',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              fontSize: '0.82rem',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#14b8a6', marginBottom: '0.2rem' }}>
              Year {hoveredMetric.year}
            </div>
            <div>Research Papers: <strong>{hoveredMetric.publications}</strong></div>
            <div>Patent Filings: <strong>{hoveredMetric.patents}</strong></div>
            <div>Active Orgs: <strong>{hoveredMetric.organizations}</strong></div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '0.3rem', paddingTop: '0.3rem' }}>
              Total Activity: <strong>{hoveredMetric.total_activity}</strong> ({hoveredMetric.yoy_growth_percent !== null ? `${hoveredMetric.yoy_growth_percent > 0 ? '+' : ''}${hoveredMetric.yoy_growth_percent}% YoY` : 'Baseline'})
            </div>
          </div>
        )}
      </div>
    )
  }

  // =========================================================================
  // Activity Ribbon Visualization
  // =========================================================================
  const renderActivityRibbon = () => {
    if (!filteredMetrics || filteredMetrics.length === 0) return null

    return (
      <div className="activity-ribbon-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div className="ribbon-title">Activity Ribbon (Empirical Temporal Intensity)</div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            Intensity scaled to verified annual activity points
          </span>
        </div>

        <div className="ribbon-track">
          {filteredMetrics.map((m) => {
            const heightPct = Math.max(15, (m.total_activity / maxMetricTotal) * 100)
            const isSelected = selectedYear?.year === m.year

            return (
              <div
                key={m.year}
                className="ribbon-bar-col"
                onClick={() => setSelectedYear(m)}
                title={`Year ${m.year} — Total Activity: ${m.total_activity} points (Papers: ${m.publications}, Patents: ${m.patents}, Orgs: ${m.organizations})`}
              >
                <div
                  className={`ribbon-bar ${isSelected ? 'selected' : ''}`}
                  style={{ height: `${heightPct}%` }}
                ></div>
                <span className="ribbon-year-label">{m.year}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="tech-adoption-container">
      {/* Page Header */}
      <div className="page-header-block">
        <div className="page-header-flex">
          <div>
            <h1 className="page-title">Technology Trajectory &amp; Activity Tracking</h1>
            <p className="page-subtitle">
              Multi-signal temporal visualization tracking academic research publications, patent filings, and organizational participation over time.
            </p>
          </div>
          <div className="tech-selector-wrap">
            <label htmlFor="tech-select" className="tech-selector-label">
              Tracked Technology:
            </label>
            <select
              id="tech-select"
              value={selectedTechId}
              onChange={handleSelectChange}
              className="tech-select-dropdown"
            >
              {technologies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.technology_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading historical trajectory telemetry...</p>
        </div>
      ) : (
        <>
          {/* Main Trajectory Visualization Card */}
          <div className="surface-card chart-main-card">
            <div className="section-head-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="section-title">
                  {adoptionData ? adoptionData.technology_name : 'Technology'} Trajectory
                </h2>
                <p className="section-subtitle">
                  Historical progression of observable research, patent and organizational activity signals.
                </p>
              </div>

              {/* Legend */}
              <div className="trajectory-legend-row">
                <span className="legend-pill" style={{ color: '#0f2942' }}>
                  <span className="legend-indicator" style={{ width: 14, height: 4, background: '#0f2942' }}></span>
                  Combined Activity
                </span>
                <span className="legend-pill" style={{ color: '#2563eb' }}>
                  <span className="legend-indicator" style={{ width: 10, height: 10, background: '#2563eb' }}></span>
                  Research
                </span>
                <span className="legend-pill" style={{ color: '#7c3aed' }}>
                  <span className="legend-indicator" style={{ width: 10, height: 10, background: '#7c3aed' }}></span>
                  Patents
                </span>
                <span className="legend-pill" style={{ color: '#059669' }}>
                  <span className="legend-indicator" style={{ width: 10, height: 10, background: '#059669' }}></span>
                  Organizations
                </span>
              </div>
            </div>

            {/* Controls Row */}
            <div className="chart-controls-row">
              <div className="signal-toggles-group">
                <button
                  className={`signal-pill-btn ${activeSignal === 'combined' ? 'active combined' : ''}`}
                  onClick={() => setActiveSignal('combined')}
                >
                  All Signals Combined
                </button>
                <button
                  className={`signal-pill-btn ${activeSignal === 'research' ? 'active research' : ''}`}
                  onClick={() => setActiveSignal('research')}
                >
                  Research Papers
                </button>
                <button
                  className={`signal-pill-btn ${activeSignal === 'patents' ? 'active patents' : ''}`}
                  onClick={() => setActiveSignal('patents')}
                >
                  Patent Filings
                </button>
                <button
                  className={`signal-pill-btn ${activeSignal === 'organizations' ? 'active organizations' : ''}`}
                  onClick={() => setActiveSignal('organizations')}
                >
                  Organizations
                </button>
              </div>

              <div className="time-range-group">
                <button
                  className={`time-btn ${timeRange === '5Y' ? 'active' : ''}`}
                  onClick={() => setTimeRange('5Y')}
                >
                  5Y
                </button>
                <button
                  className={`time-btn ${timeRange === '10Y' ? 'active' : ''}`}
                  onClick={() => setTimeRange('10Y')}
                >
                  10Y
                </button>
                <button
                  className={`time-btn ${timeRange === 'ALL' ? 'active' : ''}`}
                  onClick={() => setTimeRange('ALL')}
                >
                  ALL
                </button>
              </div>
            </div>

            {/* Trajectory Graph */}
            {adoptionLoading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem' }}>
                <div className="spinner"></div>
              </div>
            ) : (
              renderTrajectoryChart()
            )}

            {/* Selected Year Inspector Panel */}
            {selectedYear && (
              <div className="selected-year-panel">
                <div>
                  <span className="eyebrow-teal">Activity Evidence Inspector</span>
                  <h4 className="inspector-year-heading">
                    Year {selectedYear.year} Empirical Observations
                  </h4>
                </div>
                <div className="inspector-stats-row">
                  <div className="inspector-stat">
                    <span className="insp-label">RESEARCH PAPERS</span>
                    <div className="insp-val" style={{ color: '#2563eb' }}>{selectedYear.publications}</div>
                  </div>
                  <div className="inspector-stat">
                    <span className="insp-label">PATENT FILINGS</span>
                    <div className="insp-val" style={{ color: '#7c3aed' }}>{selectedYear.patents}</div>
                  </div>
                  <div className="inspector-stat">
                    <span className="insp-label">ACTIVE ORGS</span>
                    <div className="insp-val" style={{ color: '#059669' }}>{selectedYear.organizations}</div>
                  </div>
                  <div className="inspector-stat">
                    <span className="insp-label">TOTAL ACTIVITY</span>
                    <div className="insp-val" style={{ color: '#0f2942' }}>{selectedYear.total_activity} pts</div>
                  </div>
                </div>
              </div>
            )}

            {/* Trajectory Summary */}
            {adoptionData && (
              <div className="trajectory-summary-box">
                <strong style={{ color: '#0f2942' }}>Analytical Synthesis: </strong> {adoptionData.summary}
                {adoptionData.cagr_3yr !== null && (
                  <span style={{ marginLeft: '1rem', color: '#059669', fontWeight: 800 }}>
                    3-Yr CAGR: {adoptionData.cagr_3yr}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Feature 6: Activity Ribbon / Heatmap Section */}
          <div className="surface-card">
            <div className="section-head-wrap">
              <h3 className="section-title">Activity Heatmap &amp; Ribbon</h3>
              <p className="section-subtitle">
                Temporal activity density normalized to verified multi-source observations per calendar year.
              </p>
            </div>
            {renderActivityRibbon()}
          </div>

          {/* Feature 8: Technology Activity Evidence Table */}
          {adoptionData && (
            <div className="surface-card">
              <div className="section-head-wrap">
                <h3 className="section-title">Annual Technology Activity &amp; Evidence</h3>
                <p className="section-subtitle">
                  Historical empirical records with inline visual intensity indicators, sortable columns, and expandable record provenance.
                </p>
              </div>

              {/* Table Search & Filter Toolbar */}
              <div className="table-toolbar-row">
                <div className="table-search-box">
                  <input
                    type="text"
                    placeholder="Search year, publications, patents..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="table-search-input"
                  />
                  {tableSearch && (
                    <button className="table-search-clear" onClick={() => setTableSearch('')}>✕</button>
                  )}
                </div>

                <div className="table-filter-group">
                  <span className="filter-group-label">Trend Filter:</span>
                  {['ALL', 'GROWING', 'BASELINE', 'DECLINING'].map((t) => (
                    <button
                      key={t}
                      className={`filter-pill-btn ${tableTrendFilter === t ? 'active' : ''}`}
                      onClick={() => setTableTrendFilter(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="table-responsive-wrapper">
                <table className="metrics-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('year')}>
                        Year {sortField === 'year' ? (sortAsc ? '▲' : '▼') : ''}
                      </th>
                      <th onClick={() => handleSort('publications')}>
                        Research {sortField === 'publications' ? (sortAsc ? '▲' : '▼') : ''}
                      </th>
                      <th onClick={() => handleSort('patents')}>
                        Patents {sortField === 'patents' ? (sortAsc ? '▲' : '▼') : ''}
                      </th>
                      <th onClick={() => handleSort('organizations')}>
                        Organizations {sortField === 'organizations' ? (sortAsc ? '▲' : '▼') : ''}
                      </th>
                      <th onClick={() => handleSort('total_activity')}>
                        Activity Points {sortField === 'total_activity' ? (sortAsc ? '▲' : '▼') : ''}
                      </th>
                      <th>Trend Signal</th>
                      <th onClick={() => handleSort('growth')}>
                        YoY Change {sortField === 'growth' ? (sortAsc ? '▲' : '▼') : ''}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTableMetrics.map((row) => {
                      const isExpanded = expandedYear === row.year
                      const isPositive = row.yoy_growth_percent > 0
                      const isNegative = row.yoy_growth_percent < 0
                      const trendIcon = isPositive ? '↑' : isNegative ? '↓' : '→'

                      return (
                        <React.Fragment key={row.year}>
                          <tr
                            className={isExpanded ? 'expanded-row-parent' : ''}
                            onClick={() => setExpandedYear(isExpanded ? null : row.year)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td style={{ fontWeight: 800, color: '#0f2942' }}>
                              <span style={{ marginRight: '0.4rem', color: '#0d9488' }}>{isExpanded ? '▼' : '▶'}</span>
                              {row.year}
                            </td>
                            <td>{row.publications}</td>
                            <td>{row.patents}</td>
                            <td>{row.organizations}</td>
                            <td>
                              <div className="activity-visualizer-bar">
                                <strong style={{ minWidth: 26, color: '#0f2942' }}>{row.total_activity}</strong>
                                <div className="act-mini-track">
                                  <div
                                    className="act-mini-fill"
                                    style={{ width: `${Math.max(10, (row.total_activity / maxMetricTotal) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 800, color: isPositive ? '#059669' : isNegative ? '#dc2626' : '#64748b' }}>
                                {trendIcon} {isPositive ? 'Expanding' : isNegative ? 'Contracting' : 'Baseline'}
                              </span>
                            </td>
                            <td>
                              {row.yoy_growth_percent !== null ? (
                                <span
                                  className={`growth-badge ${
                                    isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'
                                  }`}
                                >
                                  {isPositive ? `+${row.yoy_growth_percent}%` : `${row.yoy_growth_percent}%`}
                                </span>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>Baseline Observation</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Row Inspector */}
                          {isExpanded && (
                            <tr className="expanded-detail-row">
                              <td colSpan={7} style={{ padding: '1.5rem 2rem', background: '#f8fafc' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', fontSize: '0.9rem' }}>
                                  <div>
                                    <strong style={{ color: '#2563eb' }}>Research Activity: </strong>
                                    {row.publications > 0 ? `${row.publications} publications indexed in Research Intelligence.` : 'No papers recorded this period.'}
                                  </div>
                                  <div>
                                    <strong style={{ color: '#7c3aed' }}>Patent Protection: </strong>
                                    {row.patents > 0 ? `${row.patents} patent filings published in Patent Intelligence.` : 'No patent filings recorded.'}
                                  </div>
                                  <div>
                                    <strong style={{ color: '#059669' }}>Organization Footprint: </strong>
                                    {row.organizations > 0 ? `${row.organizations} distinct academic/corporate entities active.` : 'No distinct org metadata.'}
                                  </div>
                                  <div>
                                    <strong style={{ color: '#0f2942' }}>Annual Momentum: </strong>
                                    {row.yoy_growth_percent !== null ? `${row.yoy_growth_percent}% relative to prior comparable observation.` : 'Initial observed baseline.'}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Adoption Terminology Clarification */}
              <div className="disclaimer-note" style={{ marginTop: '1.5rem' }}>
                ℹ️ <strong>Adoption &amp; Activity Indicators:</strong> This view uses observable research, patent and organizational activity as analytical indicators. It reflects empirical innovation momentum and does not directly measure commercial sales or real-world end-user deployment unless direct adoption records exist in the database.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

