import React, { useState, useEffect, useMemo } from 'react'
import { technologyService } from '../services/technologyService'
import './TechnologyMaturity.css'

export default function TechnologyMaturity({ customAnalysis, onClearCustom }) {
  const [technologies, setTechnologies] = useState([])
  const [maturities, setMaturities] = useState([])
  const [selectedTechId, setSelectedTechId] = useState('')
  const [selectedAnalysis, setSelectedAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterStage, setFilterStage] = useState('ALL')
  const [activeTooltip, setActiveTooltip] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  // If custom analysis is passed from global search, display it
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
      const [techList, matList] = await Promise.all([
        technologyService.getTechnologies(),
        technologyService.getAllMaturities(),
      ])
      setTechnologies(techList || [])
      setMaturities(matList || [])
      if (techList && techList.length > 0 && !customAnalysis) {
        setSelectedTechId(techList[0].id)
        loadTechnologyAnalysis(techList[0].id)
      }
    } catch (err) {
      setError(err.message || 'Failed to load technology maturity data')
    } finally {
      setLoading(false)
    }
  }

  async function loadTechnologyAnalysis(id) {
    if (!id) return
    try {
      setAnalysisLoading(true)
      const data = await technologyService.getTechnologyFullAnalysis(id)
      setSelectedAnalysis(data)
    } catch (err) {
      console.error('Failed to load full analysis:', err)
    } finally {
      setAnalysisLoading(false)
    }
  }

  function handleSelectTech(id) {
    if (onClearCustom) onClearCustom()
    setSelectedTechId(id)
    loadTechnologyAnalysis(id)
  }

  // Signal categorization helper
  function getSignalStrength(count, type) {
    if (count === 0) return { label: 'Insufficient Data', class: 'insufficient' }
    if (type === 'papers') {
      if (count >= 10) return { label: 'Strong', class: 'strong' }
      if (count >= 3) return { label: 'Observed', class: 'moderate' }
      return { label: 'Limited', class: 'limited' }
    }
    if (type === 'patents') {
      if (count >= 5) return { label: 'Strong', class: 'strong' }
      if (count >= 2) return { label: 'Observed', class: 'moderate' }
      return { label: 'Limited', class: 'limited' }
    }
    if (type === 'orgs') {
      if (count >= 4) return { label: 'High Coverage', class: 'strong' }
      if (count >= 2) return { label: 'Observed', class: 'moderate' }
      return { label: 'Limited', class: 'limited' }
    }
    if (type === 'span') {
      if (count >= 5) return { label: 'Strong Persistence', class: 'strong' }
      if (count >= 2) return { label: 'Observed', class: 'moderate' }
      return { label: 'Early Window', class: 'limited' }
    }
    return { label: 'Observed', class: 'moderate' }
  }

  // Dynamic Key Insights Generator based on real data
  const generatedInsights = useMemo(() => {
    if (!selectedAnalysis) return []
    const insights = []
    const ev = selectedAnalysis.maturity?.evidence || {}
    const tr = selectedAnalysis.trend || {}
    const rd = selectedAnalysis.readiness || {}
    const adp = selectedAnalysis.adoption?.yearly_metrics || []

    // 1. Trend Insight
    if (tr.trend === 'Growing') {
      insights.push({
        icon: '↑',
        type: 'positive',
        text: `Activity expanded by ${tr.growth_rate !== null ? `+${tr.growth_rate}%` : 'significant momentum'} during the latest comparable observed period.`,
        detail: 'Calculated from year-over-year total activity points across academic and patent filings.',
      })
    } else if (tr.trend === 'Declining') {
      insights.push({
        icon: '↓',
        type: 'warning',
        text: `Recent observation indicates a contraction (${tr.growth_rate !== null ? `${tr.growth_rate}%` : 'reduced velocity'}) relative to peak periods.`,
        detail: 'Based on contraction in active publications and patent applications.',
      })
    } else if (tr.trend === 'Stable') {
      insights.push({
        icon: '→',
        type: 'neutral',
        text: 'Observable research and patent activity has maintained a steady velocity across recent reporting cycles.',
        detail: 'Growth rate variation within steady ±10% threshold.',
      })
    }

    // 2. Peak activity year insight
    if (adp.length > 0) {
      const peak = [...adp].sort((a, b) => (b.total_activity || 0) - (a.total_activity || 0))[0]
      if (peak && peak.total_activity > 0) {
        insights.push({
          icon: '◆',
          type: 'neutral',
          text: `Highest observed activity occurred in ${peak.year} with ${peak.total_activity} empirical points (${peak.publications} papers, ${peak.patents} patents).`,
          detail: 'Empirical peak based on multi-source verified records.',
        })
      }
    }

    // 3. Dominant signal
    const papers = ev.research_papers || 0
    const patents = ev.patents || 0
    if (patents > papers && patents >= 2) {
      insights.push({
        icon: '●',
        type: 'patent',
        text: `Patent filings (${patents}) represent the primary activity driver, indicating strong industrial IP protection focus.`,
        detail: 'Patent volume exceeds academic research publications in verified registry.',
      })
    } else if (papers > patents && papers >= 2) {
      insights.push({
        icon: '●',
        type: 'research',
        text: `Academic research publications (${papers}) lead the observable footprint, indicating active fundamental R&D.`,
        detail: 'Publication volume exceeds proprietary patent claims.',
      })
    }

    // 4. Organizational Diversity
    if (ev.distinct_assignees_or_orgs >= 3) {
      insights.push({
        icon: '●',
        type: 'positive',
        text: `Broad multi-organizational participation across ${ev.distinct_assignees_or_orgs} distinct academic institutions and enterprise assignees.`,
        detail: 'Reflects diversified stakeholder interest without single-entity dependency.',
      })
    }

    if (insights.length === 0) {
      insights.push({
        icon: 'ℹ️',
        type: 'neutral',
        text: 'Initial baseline evidence collected. Ingest additional records to expand longitudinal analytical depth.',
        detail: 'Fewer than 2 observed periods available.',
      })
    }

    return insights
  }, [selectedAnalysis])

  // Donut chart calculations
  const donutData = useMemo(() => {
    if (!selectedAnalysis?.maturity?.evidence) return null
    const ev = selectedAnalysis.maturity.evidence
    const p = ev.research_papers || 0
    const pt = ev.patents || 0
    const org = ev.distinct_assignees_or_orgs || 0
    const total = p + pt + org
    if (total === 0) return null

    const pPct = Math.round((p / total) * 100)
    const ptPct = Math.round((pt / total) * 100)
    const orgPct = 100 - pPct - ptPct

    return {
      papers: p,
      patents: pt,
      orgs: org,
      total,
      pPct,
      ptPct,
      orgPct,
    }
  }, [selectedAnalysis])

  const filteredMaturities = maturities.filter((m) => {
    if (filterStage === 'ALL') return true
    return m.maturity_stage.toUpperCase() === filterStage.toUpperCase()
  })

  // Parse domain tags cleanly
  const domainTags = useMemo(() => {
    if (!selectedAnalysis?.technology_domain) return ['Technology']
    return selectedAnalysis.technology_domain
      .split(/[,/|;]/)
      .map((t) => t.trim())
      .filter(Boolean)
  }, [selectedAnalysis])

  return (
    <div className="tech-maturity-container">
      {/* Page Header */}
      <div className="page-header-block">
        <h1 className="page-title">Technology Maturity &amp; Readiness</h1>
        <p className="page-subtitle">
          Explainable maturity assessment and empirical readiness indicators derived from multi-source research publications, patents, and organizations.
        </p>
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
          <p>Analyzing multi-source intelligence &amp; maturity indicators...</p>
        </div>
      ) : (
        <>
          {/* Detailed Selected Technology Analysis Inspector */}
          {selectedAnalysis && (
            <div className="technology-workspace-section">
              {/* Feature 1: Technology Overview Card */}
              <div className="tech-overview-card">
                <div className="tech-overview-main">
                  <div className="tech-title-row">
                    <span className="tech-icon-pill">🔬</span>
                    <div>
                      <div className="eyebrow-label">Technology Overview</div>
                      <h2 className="tech-display-name">{selectedAnalysis.technology_name}</h2>
                    </div>
                  </div>

                  <div className="tech-domain-tags">
                    {domainTags.map((tag) => (
                      <span key={tag} className="domain-tag-pill">{tag}</span>
                    ))}
                  </div>

                  <p className="tech-description-text">
                    {selectedAnalysis.description ||
                      selectedAnalysis.maturity?.explanation ||
                      'Comprehensive multi-source technology analysis tracking academic research, IP patent claims, and organizational activity signals.'}
                  </p>
                </div>

                <div className="tech-overview-status">
                  <div className="status-badge-container">
                    <span className={`maturity-stage-badge ${selectedAnalysis.maturity.maturity_stage.toLowerCase()}`}>
                      {selectedAnalysis.maturity.maturity_stage.replace('_', ' ')}
                    </span>
                    {selectedAnalysis.match_type && (
                      <span className={`coverage-badge ${selectedAnalysis.data_coverage ? selectedAnalysis.data_coverage.toLowerCase() : 'moderate'}`}>
                        {selectedAnalysis.match_type === 'direct' ? 'Direct Match' : selectedAnalysis.match_type === 'related' ? 'Related Evidence' : 'Custom Search'}
                      </span>
                    )}
                  </div>

                  <div className="quick-signals-summary">
                    <div className="signal-summary-item">
                      <span className="signal-num">{selectedAnalysis.maturity.evidence.research_papers}</span>
                      <span className="signal-lbl">Publications</span>
                    </div>
                    <div className="signal-summary-divider"></div>
                    <div className="signal-summary-item">
                      <span className="signal-num">{selectedAnalysis.maturity.evidence.patents}</span>
                      <span className="signal-lbl">Patents</span>
                    </div>
                    <div className="signal-summary-divider"></div>
                    <div className="signal-summary-item">
                      <span className="signal-num">{selectedAnalysis.maturity.evidence.distinct_assignees_or_orgs}</span>
                      <span className="signal-lbl">Organizations</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2: 4 KPI Cards */}
              <div className="kpi-grid">
                {/* KPI 1 */}
                <div className="kpi-card">
                  <div className="kpi-label">Maturity Stage</div>
                  <div className="kpi-value-row">
                    <span className="kpi-value" style={{ color: '#0f2942' }}>
                      {selectedAnalysis.maturity.maturity_stage.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="kpi-desc">Based on observed technology activity</div>
                </div>

                {/* KPI 2 */}
                <div className="kpi-card">
                  <div className="kpi-label">Analytical Readiness</div>
                  <div className="kpi-value-row">
                    <span className="kpi-value" style={{ color: '#0d9488' }}>
                      {selectedAnalysis.readiness.readiness_score !== null ? selectedAnalysis.readiness.readiness_score : '—'}
                    </span>
                    {selectedAnalysis.readiness.readiness_score !== null && (
                      <span className="kpi-unit">/ 100</span>
                    )}
                  </div>
                  <div className="kpi-desc">System-generated analytical estimate</div>
                </div>

                {/* KPI 3 */}
                <div className="kpi-card">
                  <div className="kpi-label">Activity Trend</div>
                  <div className="kpi-value-row">
                    <span
                      className="kpi-value"
                      style={{
                        color:
                          selectedAnalysis.trend?.trend === 'Growing'
                            ? '#059669'
                            : selectedAnalysis.trend?.trend === 'Declining'
                            ? '#dc2626'
                            : '#2563eb',
                      }}
                    >
                      {selectedAnalysis.trend?.trend === 'Growing' ? '↑ Growing' : selectedAnalysis.trend?.trend === 'Declining' ? '↓ Declining' : '→ Stable'}
                    </span>
                  </div>
                  <div className="kpi-desc">Based on comparable historical activity</div>
                </div>

                {/* KPI 4 */}
                <div className="kpi-card">
                  <div className="kpi-label">Data Coverage</div>
                  <div className="kpi-value-row">
                    <span className="kpi-value" style={{ color: '#0f766e' }}>
                      {selectedAnalysis.data_coverage || selectedAnalysis.maturity.coverage_level || 'Moderate'}
                    </span>
                  </div>
                  <div className="kpi-desc">Based on available multi-source evidence</div>
                </div>
              </div>

              {/* Two-Column Middle Section: Key Insights & Activity Distribution */}
              <div className="insights-distribution-row">
                {/* Feature 4: Key Insights Panel */}
                <div className="surface-card insights-panel">
                  <div className="section-head-wrap">
                    <h3 className="section-title">Key Insights</h3>
                    <p className="section-subtitle">
                      Automatically generated analytical observations from verified database records.
                    </p>
                  </div>

                  <div className="insights-list">
                    {generatedInsights.map((ins, idx) => (
                      <div key={idx} className={`insight-item ${ins.type}`}>
                        <span className="insight-bullet">{ins.icon}</span>
                        <div className="insight-body">
                          <div className="insight-text">{ins.text}</div>
                          <div className="insight-detail">{ins.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature 3: Activity Distribution Donut */}
                <div className="surface-card distribution-panel">
                  <div className="section-head-wrap">
                    <h3 className="section-title">Activity Distribution</h3>
                    <p className="section-subtitle">
                      Distribution of observed research, patent and organizational activity signals.
                    </p>
                  </div>

                  {donutData ? (
                    <div className="donut-content-layout">
                      <div className="donut-svg-wrapper">
                        <svg className="donut-svg" viewBox="0 0 160 160">
                          {(() => {
                            const r = 58
                            const c = 2 * Math.PI * r
                            const pOffset = 0
                            const pLen = (donutData.pPct / 100) * c
                            const ptLen = (donutData.ptPct / 100) * c
                            const orgLen = (donutData.orgPct / 100) * c

                            return (
                              <g transform="rotate(-90 80 80)">
                                {/* Background circle */}
                                <circle cx="80" cy="80" r={r} fill="none" stroke="#f1f5f9" strokeWidth="20" />
                                {/* Research segment */}
                                <circle
                                  cx="80"
                                  cy="80"
                                  r={r}
                                  fill="none"
                                  stroke="#2563eb"
                                  strokeWidth="20"
                                  strokeDasharray={`${pLen} ${c - pLen}`}
                                  strokeDashoffset={-pOffset}
                                />
                                {/* Patent segment */}
                                <circle
                                  cx="80"
                                  cy="80"
                                  r={r}
                                  fill="none"
                                  stroke="#7c3aed"
                                  strokeWidth="20"
                                  strokeDasharray={`${ptLen} ${c - ptLen}`}
                                  strokeDashoffset={-pLen}
                                />
                                {/* Org segment */}
                                <circle
                                  cx="80"
                                  cy="80"
                                  r={r}
                                  fill="none"
                                  stroke="#059669"
                                  strokeWidth="20"
                                  strokeDasharray={`${orgLen} ${c - orgLen}`}
                                  strokeDashoffset={-(pLen + ptLen)}
                                />
                              </g>
                            )
                          })()}
                          <text x="80" y="76" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f2942">
                            {donutData.total}
                          </text>
                          <text x="80" y="93" textAnchor="middle" fontSize="10" fontWeight="700" fill="#64748b" textTransform="uppercase">
                            Total Signals
                          </text>
                        </svg>
                      </div>

                      <div className="donut-legend">
                        <div className="legend-item">
                          <span className="legend-dot" style={{ background: '#2563eb' }}></span>
                          <span className="legend-name">Research Publications</span>
                          <span className="legend-val">{donutData.papers} ({donutData.pPct}%)</span>
                        </div>
                        <div className="legend-item">
                          <span className="legend-dot" style={{ background: '#7c3aed' }}></span>
                          <span className="legend-name">Patent Filings</span>
                          <span className="legend-val">{donutData.patents} ({donutData.ptPct}%)</span>
                        </div>
                        <div className="legend-item">
                          <span className="legend-dot" style={{ background: '#059669' }}></span>
                          <span className="legend-name">Organizations</span>
                          <span className="legend-val">{donutData.orgs} ({donutData.orgPct}%)</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-donut-note">
                      Insufficient observable signals for activity distribution.
                    </div>
                  )}

                  <div className="disclaimer-note" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                    ℹ️ Represents relative proportions of observable activity signals in the database.
                  </div>
                </div>
              </div>

              {/* Maturity Assessment Details */}
              <div className="surface-card">
                <div className="section-head-wrap">
                  <h3 className="section-title">Maturity Assessment</h3>
                  <p className="section-subtitle">
                    Rule-based analytical categorization evaluating historical foundation, industrial IP claims, and institutional span.
                  </p>
                </div>

                <div className="maturity-explanation-box">
                  <strong>Observed Evidence Rationale: </strong>
                  {selectedAnalysis.maturity.explanation}
                </div>
              </div>

              {/* Evidence Matrix */}
              <div className="surface-card">
                <div className="section-head-wrap">
                  <h3 className="section-title">Evidence Matrix</h3>
                  <p className="section-subtitle">
                    Verifiable multi-source activity evidence supporting the current maturity assessment stage.
                  </p>
                </div>

                <div className="table-responsive-wrapper">
                  <table className="evidence-matrix-table">
                    <thead>
                      <tr>
                        <th>Indicator Signal</th>
                        <th>Observed Value</th>
                        <th>Classification Signal</th>
                        <th>Evidence Provenance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Research Publications</strong></td>
                        <td><strong className="obs-val-text">{selectedAnalysis.maturity.evidence.research_papers}</strong></td>
                        <td>
                          {(() => {
                            const s = getSignalStrength(selectedAnalysis.maturity.evidence.research_papers, 'papers')
                            return <span className={`evidence-signal-pill ${s.class}`}>{s.label}</span>
                          })()}
                        </td>
                        <td className="provenance-cell">Research Intelligence Database</td>
                      </tr>
                      <tr>
                        <td><strong>Patent Filings</strong></td>
                        <td><strong className="obs-val-text">{selectedAnalysis.maturity.evidence.patents}</strong></td>
                        <td>
                          {(() => {
                            const s = getSignalStrength(selectedAnalysis.maturity.evidence.patents, 'patents')
                            return <span className={`evidence-signal-pill ${s.class}`}>{s.label}</span>
                          })()}
                        </td>
                        <td className="provenance-cell">Patent Intelligence Database</td>
                      </tr>
                      <tr>
                        <td><strong>Organizations &amp; Assignees</strong></td>
                        <td><strong className="obs-val-text">{selectedAnalysis.maturity.evidence.distinct_assignees_or_orgs}</strong></td>
                        <td>
                          {(() => {
                            const s = getSignalStrength(selectedAnalysis.maturity.evidence.distinct_assignees_or_orgs, 'orgs')
                            return <span className={`evidence-signal-pill ${s.class}`}>{s.label}</span>
                          })()}
                        </td>
                        <td className="provenance-cell">Academic &amp; Corporate Assignee Records</td>
                      </tr>
                      <tr>
                        <td><strong>Historical Observation Span</strong></td>
                        <td>
                          <strong className="obs-val-text">
                            {selectedAnalysis.maturity.evidence.historical_span_years > 0
                              ? `${selectedAnalysis.maturity.evidence.historical_span_years} Years (${selectedAnalysis.maturity.evidence.earliest_year || '—'} – ${selectedAnalysis.maturity.evidence.latest_year || '—'})`
                              : 'Single Observation Period'}
                          </strong>
                        </td>
                        <td>
                          {(() => {
                            const s = getSignalStrength(selectedAnalysis.maturity.evidence.historical_span_years, 'span')
                            return <span className={`evidence-signal-pill ${s.class}`}>{s.label}</span>
                          })()}
                        </td>
                        <td className="provenance-cell">Empirical Multi-Year Timeline</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Technology Readiness Section */}
              <div className="surface-card readiness-section">
                <div className="readiness-header-row">
                  <div>
                    <h3 className="section-title">Analytical Readiness Estimate</h3>
                    <p className="section-subtitle">
                      Logarithmic multi-factor readiness score synthesized from verified publications, patents, and organizations.
                    </p>
                  </div>

                  {selectedAnalysis.readiness.readiness_score !== null && (
                    <div className="readiness-score-display">
                      <span className="readiness-big-num">
                        {selectedAnalysis.readiness.readiness_score}
                      </span>
                      <span className="readiness-out-of">/ 100</span>
                      <span className="coverage-badge comprehensive" style={{ marginLeft: '0.75rem' }}>
                        {selectedAnalysis.readiness.confidence} Confidence
                      </span>
                    </div>
                  )}
                </div>

                {selectedAnalysis.readiness.readiness_score !== null ? (
                  <>
                    <div className="readiness-status-banner">
                      <strong>Status: </strong>
                      <span className="readiness-status-highlight">{selectedAnalysis.readiness.score_label}</span>
                      {' — '}
                      <span>{selectedAnalysis.readiness.explanation}</span>
                    </div>

                    {selectedAnalysis.readiness.factors && (
                      <div className="readiness-factors-grid">
                        {/* Factor 1 */}
                        <div className="readiness-factor-card">
                          <div className="readiness-factor-header">
                            <span className="factor-name-label">
                              Research Activity (25%)
                              <span
                                className="factor-info-bubble"
                                title="Logarithmically scaled publication volume in relevant research domains"
                              >
                                ?
                              </span>
                            </span>
                            <span className="factor-score-num">
                              {selectedAnalysis.readiness.factors.research_activity_score} / 100
                            </span>
                          </div>
                          <div className="factor-track">
                            <div
                              className="factor-fill"
                              style={{ width: `${selectedAnalysis.readiness.factors.research_activity_score}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Factor 2 */}
                        <div className="readiness-factor-card">
                          <div className="readiness-factor-header">
                            <span className="factor-name-label">
                              Patent &amp; IP Protection (35%)
                              <span
                                className="factor-info-bubble"
                                title="Observed granted/published patent claims and legal protections"
                              >
                                ?
                              </span>
                            </span>
                            <span className="factor-score-num">
                              {selectedAnalysis.readiness.factors.patent_ip_score} / 100
                            </span>
                          </div>
                          <div className="factor-track">
                            <div
                              className="factor-fill"
                              style={{ width: `${selectedAnalysis.readiness.factors.patent_ip_score}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Factor 3 */}
                        <div className="readiness-factor-card">
                          <div className="readiness-factor-header">
                            <span className="factor-name-label">
                              Organization Diversity (25%)
                              <span
                                className="factor-info-bubble"
                                title="Breadth of distinct corporate assignees, universities and government agencies"
                              >
                                ?
                              </span>
                            </span>
                            <span className="factor-score-num">
                              {selectedAnalysis.readiness.factors.organization_diversity_score} / 100
                            </span>
                          </div>
                          <div className="factor-track">
                            <div
                              className="factor-fill"
                              style={{ width: `${selectedAnalysis.readiness.factors.organization_diversity_score}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Factor 4 */}
                        <div className="readiness-factor-card">
                          <div className="readiness-factor-header">
                            <span className="factor-name-label">
                              Adoption Momentum (15%)
                              <span
                                className="factor-info-bubble"
                                title="Multi-year empirical velocity and recent growth momentum"
                              >
                                ?
                              </span>
                            </span>
                            <span className="factor-score-num">
                              {selectedAnalysis.readiness.factors.adoption_momentum_score} / 100
                            </span>
                          </div>
                          <div className="factor-track">
                            <div
                              className="factor-fill"
                              style={{ width: `${selectedAnalysis.readiness.factors.adoption_momentum_score}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="maturity-explanation-box">
                    {selectedAnalysis.readiness.explanation}
                  </div>
                )}

                <div className="disclaimer-text">
                  ⚠️ <strong>Disclaimer:</strong> {selectedAnalysis.readiness.disclaimer}
                </div>
              </div>
            </div>
          )}

          {/* Grid of all Technologies Maturity */}
          <div className="all-tracked-section">
            <div className="section-head-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h2 className="section-title" style={{ fontSize: '1.35rem' }}>All Tracked Technologies</h2>
                <p className="section-subtitle">
                  Browse and filter canonical technologies by verified maturity classification.
                </p>
              </div>

              <div className="filter-pills-group">
                {['ALL', 'MATURE', 'ESTABLISHED', 'DEVELOPING', 'EARLY', 'INSUFFICIENT_DATA'].map((stage) => (
                  <button
                    key={stage}
                    className={`filter-pill-btn ${filterStage === stage ? 'active' : ''}`}
                    onClick={() => setFilterStage(stage)}
                  >
                    {stage.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="maturity-grid">
              {filteredMaturities.map((item) => (
                <div
                  key={item.technology_id}
                  className={`surface-card maturity-card ${selectedTechId === item.technology_id ? 'active-card' : ''}`}
                  onClick={() => handleSelectTech(item.technology_id)}
                >
                  <div className="maturity-card-head">
                    <h3 className="card-tech-title">
                      {item.technology_name}
                    </h3>
                    <span className={`maturity-stage-badge ${item.maturity_stage.toLowerCase()}`}>
                      {item.maturity_stage.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="card-tech-explanation">
                    {item.explanation}
                  </p>
                  <div className="card-tech-metrics-footer">
                    <span>Papers: <strong style={{ color: '#2563eb' }}>{item.evidence.research_papers}</strong></span>
                    <span>Patents: <strong style={{ color: '#7c3aed' }}>{item.evidence.patents}</strong></span>
                    <span>Orgs: <strong style={{ color: '#059669' }}>{item.evidence.distinct_assignees_or_orgs}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


