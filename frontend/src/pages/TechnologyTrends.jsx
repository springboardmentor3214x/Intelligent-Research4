import React, { useState, useEffect } from 'react'
import { technologyService } from '../services/technologyService'
import './TechnologyTrends.css'

export default function TechnologyTrends({ customAnalysis, onClearCustom }) {
  const [technologies, setTechnologies] = useState([])
  const [activitySummary, setActivitySummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const [techList, summaryRes] = await Promise.all([
        technologyService.getTechnologies(),
        technologyService.getActivitySummary(),
      ])
      setTechnologies(techList || [])
      setActivitySummary(summaryRes?.technologies || [])
    } catch (err) {
      setError(err.message || 'Failed to load multi-year trend data')
    } finally {
      setLoading(false)
    }
  }

  // Sparkline generator helper
  const renderSparkline = (activityList) => {
    if (!activityList || activityList.length < 2) {
      return <span className="sparkline-na">Insufficient timeline</span>
    }

    const width = 120
    const height = 30
    const maxVal = Math.max(...activityList.map((a) => (a.research_paper_count || 0) + (a.patent_count || 0)), 1)
    const pointsCount = activityList.length

    const points = activityList.map((a, i) => {
      const tot = (a.research_paper_count || 0) + (a.patent_count || 0)
      const x = 5 + (i / (pointsCount - 1)) * (width - 10)
      const y = height - 4 - (tot / maxVal) * (height - 8)
      return `${x},${y}`
    }).join(' ')

    return (
      <svg width={width} height={height} className="sparkline-svg">
        <polyline
          fill="none"
          stroke="#0284c7"
          strokeWidth="2"
          points={points}
        />
      </svg>
    )
  }

  const filteredList = technologies.filter((t) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase().trim()
    return (
      t.technology_name.toLowerCase().includes(q) ||
      (t.technology_domain && t.technology_domain.toLowerCase().includes(q)) ||
      (t.emerging_status && t.emerging_status.toLowerCase().includes(q))
    )
  })

  // Map activity by technology id
  const activityMap = {}
  activitySummary.forEach((item) => {
    activityMap[item.technology_id] = item.activity || []
  })

  return (
    <div className="tech-trends-container">
      {/* Header */}
      <div className="trends-header-card">
        <div>
          <div className="platform-tag">MULTI-YEAR TRAJECTORY MATRIX</div>
          <h1 className="page-title">Multi-Year Trajectory &amp; Historical Matrix</h1>
          <p className="page-subtitle">
            Longitudinal multi-year trajectory across research publications, patent filings, and organizational networks.
          </p>
        </div>

        {/* Search */}
        <div className="trends-search-box">
          <input
            type="text"
            className="trends-search-input"
            placeholder="Filter technologies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Compiling multi-year historical trajectories...</p>
        </div>
      ) : (
        <div className="trends-table-card">
          <table className="trends-table">
            <thead>
              <tr>
                <th>Technology</th>
                <th>Stage Classification</th>
                <th>Weighted Score</th>
                <th>Research Papers</th>
                <th>Patent Filings</th>
                <th>Historical Trajectory Sparkline</th>
                <th>Observed Years</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((t) => {
                const acts = activityMap[t.id] || []
                const years = acts.map((a) => a.year).sort((a, b) => a - b)
                const spanText = years.length > 0 ? `${years[0]}–${years[years.length - 1]} (${years.length} yrs)` : 'No span'

                return (
                  <tr key={t.id}>
                    <td className="font-bold tech-cell-name">{t.technology_name}</td>
                    <td>
                      <span className={`stage-badge-small stage-${(t.emerging_status || 'insufficient').toLowerCase().replace(/\s+/g, '-')}`}>
                        {t.emerging_status || 'Early Stage'}
                      </span>
                    </td>
                    <td className="font-bold text-blue">{t.emerging_score ? `${t.emerging_score.toFixed(1)} / 100` : '—'}</td>
                    <td>{t.research_paper_count || 0}</td>
                    <td>{t.patent_count || 0}</td>
                    <td>{renderSparkline(acts)}</td>
                    <td className="text-muted">{spanText}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
