import React, { useState, useEffect, useMemo } from 'react'
import { technologyService } from '../services/technologyService'
import './TechnologyMaturity.css'

export default function TechnologyMaturity({ customAnalysis, onClearCustom }) {
  const [technologies, setTechnologies] = useState([])
  const [selectedTechId, setSelectedTechId] = useState('')
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (customAnalysis) {
      setSelectedAnalysis(customAnalysis)
      if (customAnalysis.technology_id) {
        setSelectedTechId(customAnalysis.technology_id)
      }
    }
  }, [customAnalysis])

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const techList = await technologyService.getTechnologies()
      setTechnologies(techList || [])
      if (techList && techList.length > 0 && !customAnalysis) {
        setSelectedTechId(techList[0].id)
        loadTechnologyAnalysis(techList[0].technology_name)
      }
    } catch (err) {
      setError(err.message || 'Failed to load technology maturity data')
    } finally {
      setLoading(false)
    }
  }

  async function loadTechnologyAnalysis(techNameOrId) {
    if (!techNameOrId) return
    try {
      setAnalysisLoading(true)
      const data = await technologyService.analyzeCustomTechnology(techNameOrId)
      setSelectedAnalysis(data)
    } catch (err) {
      console.error('Failed to load analysis:', err)
    } finally {
      setAnalysisLoading(false)
    }
  }

  function handleSelectTech(e) {
    const techName = e.target.value
    setSelectedTechId(techName)
    if (onClearCustom) onClearCustom()
    loadTechnologyAnalysis(techName)
  }

  const indicatorsList = useMemo(() => {
    if (!selectedAnalysis?.indicators) return []
    return Object.entries(selectedAnalysis.indicators).map(([key, ind]) => ({
      key,
      ...ind,
    }))
  }, [selectedAnalysis])

  return (
    <div className="tech-maturity-container">
      {/* Header */}
      <div className="page-header-block">
        <div className="header-text-group">
          <div className="platform-tag">DATA-DRIVEN MATURITY ENGINE</div>
          <h1 className="page-title">Technology Maturity &amp; 6 Indicators</h1>
          <p className="page-subtitle">
            Explainable maturity assessment evaluating multi-year research velocity, patent protection momentum,
            cumulative activity, institutional participation, and application breadth.
          </p>
        </div>

        {/* Technology Selector */}
        <div className="tech-selector-box">
          <label className="selector-label">Select Tracked Technology:</label>
          <select
            className="tech-dropdown-select"
            value={selectedTechId}
            onChange={handleSelectTech}
          >
            {technologies.map((t) => (
              <option key={t.id} value={t.technology_name}>
                {t.technology_name} ({t.emerging_status || 'Early'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      {loading || analysisLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Analyzing multi-source intelligence &amp; maturity indicators...</p>
        </div>
      ) : selectedAnalysis ? (
        <div className="maturity-content-grid">
          {/* 1. Overview Card */}
          <div className="maturity-overview-card">
            <div className="maturity-card-left">
              <span className="concept-tag">Evaluated Technology</span>
              <h2 className="tech-title">{selectedAnalysis.technology}</h2>
              <p className="tech-meta">
                <strong>Historical Span:</strong> {selectedAnalysis.coverage?.historical_span} ({selectedAnalysis.coverage?.total_active_years} active years) |
                <strong> Evidence:</strong> {selectedAnalysis.coverage?.total_papers} Papers, {selectedAnalysis.coverage?.total_patents} Patents, {selectedAnalysis.coverage?.total_organizations} Orgs
              </p>
            </div>
            <div className="maturity-card-right">
              <div className="score-stat-box">
                <span className="stat-label">Composite Maturity Score</span>
                <span className="stat-value">{selectedAnalysis.weighted_score?.total || 0} <small>/ 100</small></span>
              </div>
              <div className={`stage-badge-large stage-${(selectedAnalysis.stage?.classification || 'insufficient').toLowerCase().replace(/\s+/g, '-')}`}>
                {selectedAnalysis.stage?.classification}
              </div>
            </div>
          </div>

          {/* 2. Explainability Box */}
          <div className="explainability-box">
            <h3 className="box-title">💡 Why this classification?</h3>
            <p className="box-reason">{selectedAnalysis.stage?.reason}</p>
            <div className="signals-row">
              {selectedAnalysis.stage?.supporting_signals?.length > 0 && (
                <div className="signal-badge-group">
                  <strong>Supporting Signals:</strong>
                  {selectedAnalysis.stage.supporting_signals.map((sig, i) => (
                    <span key={i} className="sig-pill pos">✓ {sig}</span>
                  ))}
                </div>
              )}
              {selectedAnalysis.stage?.limiting_signals?.length > 0 && (
                <div className="signal-badge-group">
                  <strong>Limiting Signals:</strong>
                  {selectedAnalysis.stage.limiting_signals.map((sig, i) => (
                    <span key={i} className="sig-pill warn">⚠️ {sig}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Six Indicators Grid */}
          <h3 className="section-title">Core Indicator Breakdown (100% Weight Matrix)</h3>
          <div className="indicator-cards-grid">
            {indicatorsList.map((ind) => {
              const isNA = ind.normalized_score === null || ind.normalized_score === undefined
              const isZero = ind.normalized_score === 0.0
              return (
                <div key={ind.key} className="ind-metric-card">
                  <div className="ind-card-head">
                    <span className="ind-weight-badge">Weight: {ind.weight_percentage}</span>
                    <span className={`ind-trend-pill trend-${(ind.trend_direction || 'stable').toLowerCase().replace(/\s+/g, '-')}`}>
                      {ind.trend_direction || 'Stable'}
                    </span>
                  </div>
                  <h4 className="ind-title">{ind.name}</h4>
                  <div className="ind-score-line">
                    {isNA ? (
                      <>
                        <span className="ind-norm-num" style={{ color: '#94a3b8' }}>N/A</span>
                        <span className="ind-pts-tag" style={{ background: '#f1f5f9', color: '#64748b' }}>Insufficient History</span>
                      </>
                    ) : (
                      <>
                        <span className="ind-norm-num">{ind.normalized_score}</span>
                        <span className="ind-norm-max">/ 100</span>
                        <span className="ind-pts-tag">+{ind.weighted_score} pts</span>
                      </>
                    )}
                  </div>
                  <div className="ind-progress-track">
                    <div
                      className="ind-progress-fill"
                      style={{
                        width: isNA ? '0%' : `${ind.normalized_score}%`,
                        background: isZero ? '#94a3b8' : undefined
                      }}
                    ></div>
                  </div>
                  <p className="ind-desc">{ind.interpretation}</p>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>Select a technology above to inspect its maturity indicators.</p>
        </div>
      )}
    </div>
  )
}
