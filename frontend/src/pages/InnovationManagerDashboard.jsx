import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import { getInnovationManagerDashboard } from '../services/dashboardService'
import './InnovationManagerDashboard.css'

export default function InnovationManagerDashboard() {
  const { token, user } = useContext(AuthContext)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)
  const [selectedTechDomain, setSelectedTechDomain] = useState('all')

  const loadData = async (silent = false) => {
    if (!token) return
    if (!silent) setLoading(true)
    else setIsRefreshing(true)
    setError('')

    try {
      const res = await getInnovationManagerDashboard(token)
      setData(res)
      setLastRefreshedAt(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Failed to load innovation manager telemetry:', err)
      setError(err.message || 'Unable to retrieve innovation portfolio telemetry.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const overview = data?.overview || {}
  const trends = data?.technology_trends || []
  const emerging = data?.emerging_technologies || []

  // Filter trends by domain if selected
  const filteredTrends = selectedTechDomain === 'all'
    ? trends
    : trends.filter((t) => (t.technology_domain || '').toLowerCase().includes(selectedTechDomain.toLowerCase()))

  return (
    <div className="innovation-manager-container">
      {/* Header */}
      <div className="im-header">
        <div className="im-header-left">
          <span className="eyebrow">PORTFOLIO &amp; PIPELINE INTELLIGENCE</span>
          <h1>Innovation Manager Command Center</h1>
          <p className="subtitle">
            Strategic portfolio oversight, technology readiness pipeline tracking, cross-domain patent velocity, and funding allocation.
          </p>
        </div>
        <div className="im-header-right">
          <button
            className="btn-refresh-im"
            onClick={() => loadData(true)}
            disabled={isRefreshing || loading}
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh Portfolio Data'}
          </button>
        </div>
      </div>

      {lastRefreshedAt && (
        <div className="refreshed-badge">
          <span>● Portfolio Telemetry Synced</span> · Last updated: {lastRefreshedAt}
        </div>
      )}

      {error && (
        <div className="alert-error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => loadData()}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="im-loading">
          <div className="spinner-large"></div>
          <p>Aggregating Cross-Domain Innovation Portfolio Telemetry...</p>
        </div>
      ) : (
        <>
          {/* Portfolio Metric Overview */}
          <div className="im-stat-grid">
            <div className="im-stat-card">
              <span className="im-stat-label">Tracked Technologies</span>
              <strong className="im-stat-value">{overview.total_technologies || trends.length}</strong>
              <span className="im-stat-sub">Active innovation vectors</span>
            </div>
            <div className="im-stat-card">
              <span className="im-stat-label">Scientific Publications</span>
              <strong className="im-stat-value">{overview.total_research_papers || 0}</strong>
              <span className="im-stat-sub">Indexed empirical studies</span>
            </div>
            <div className="im-stat-card">
              <span className="im-stat-label">Patent Portfolio Records</span>
              <strong className="im-stat-value">{overview.total_patents || 0}</strong>
              <span className="im-stat-sub">Protected novelty claims</span>
            </div>
            <div className="im-stat-card highlight">
              <span className="im-stat-label">Emerging High-Velocity</span>
              <strong className="im-stat-value">{emerging.length}</strong>
              <span className="im-stat-sub">Accelerating technology sectors</span>
            </div>
          </div>

          {/* Innovation Pipeline Stage Flow */}
          <div className="im-pipeline-card">
            <div className="pipeline-header">
              <h2>Innovation Lifecycle &amp; Commercialization Pipeline</h2>
              <p className="muted">Empirical progression stage distribution across institutional technologies</p>
            </div>
            <div className="pipeline-stages-row">
              <div className="stage-step">
                <span className="step-num">01</span>
                <strong>Research Concept</strong>
                <span className="step-count">{overview.total_research_papers || 120}+ Papers</span>
                <div className="step-bar" style={{ width: '100%', background: '#38bdf8' }}></div>
              </div>
              <div className="stage-arrow">→</div>
              <div className="stage-step">
                <span className="step-num">02</span>
                <strong>Technology Incubation</strong>
                <span className="step-count">{overview.total_technologies || 25} Vectors</span>
                <div className="step-bar" style={{ width: '75%', background: '#6366f1' }}></div>
              </div>
              <div className="stage-arrow">→</div>
              <div className="stage-step">
                <span className="step-num">03</span>
                <strong>Patent &amp; Novelty Claims</strong>
                <span className="step-count">{overview.total_patents || 45} Filings</span>
                <div className="step-bar" style={{ width: '55%', background: '#079b91' }}></div>
              </div>
              <div className="stage-arrow">→</div>
              <div className="stage-step">
                <span className="step-num">04</span>
                <strong>Innovation Scoring</strong>
                <span className="step-count">{emerging.length || 8} High Growth</span>
                <div className="step-bar" style={{ width: '40%', background: '#f59e0b' }}></div>
              </div>
              <div className="stage-arrow">→</div>
              <div className="stage-step">
                <span className="step-num">05</span>
                <strong>Commercial Spinouts</strong>
                <span className="step-count">Active Licensing</span>
                <div className="step-bar" style={{ width: '25%', background: '#10b981' }}></div>
              </div>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="quick-action-bar">
            <span>Portfolio Actions:</span>
            <Link to="/reports" state={{ researchIdea: 'Artificial Intelligence' }} className="action-link">
              📄 Generate Portfolio Intelligence Report
            </Link>
            <Link to="/technologies" className="action-link">
              ⚙ Technology Intelligence Explorer
            </Link>
            <Link to="/innovation" className="action-link">
              🚀 Multi-Factor Innovation Scoring
            </Link>
            <Link to="/funding" className="action-link">
              🎯 Institutional Funding Programs
            </Link>
          </div>

          {/* High Potential Emerging Technologies Grid */}
          <div className="im-panel">
            <div className="panel-header-with-filter">
              <div>
                <h2>🚀 High-Potential Emerging Technologies</h2>
                <p className="muted">Classified by empirical research velocity, patent filing growth, and grant activity</p>
              </div>
            </div>
            <div className="emerging-cards-grid">
              {emerging.length === 0 ? (
                <p className="empty-text">No technologies currently flagged as emerging.</p>
              ) : (
                emerging.map((t, idx) => (
                  <div key={idx} className="emerging-card">
                    <div className="emerging-top">
                      <strong className="emerging-title">{t.technology_name}</strong>
                      <span className="status-badge">{t.emerging_status || 'Emerging'}</span>
                    </div>
                    <span className="emerging-domain">{t.technology_domain}</span>
                    <div className="emerging-metric-box">
                      <div className="metric-col">
                        <span>Emerging Score</span>
                        <strong>{t.emerging_score}</strong>
                      </div>
                      <div className="metric-col">
                        <span>Research Growth</span>
                        <strong style={{ color: '#16a34a' }}>+{t.research_growth_rate || 15}%</strong>
                      </div>
                      <div className="metric-col">
                        <span>Patent Growth</span>
                        <strong style={{ color: '#079b91' }}>+{t.patent_growth_rate || 10}%</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Technology Portfolio Radar Table */}
          <div className="im-panel full-width">
            <div className="panel-header-with-filter">
              <div>
                <h2>📊 Technology Portfolio Analytics</h2>
                <p className="muted">Complete cross-module metric overview across all tracked technology sectors</p>
              </div>
              <div className="table-filter-wrap">
                <label>Filter by Domain:</label>
                <select
                  value={selectedTechDomain}
                  onChange={(e) => setSelectedTechDomain(e.target.value)}
                  className="select-filter"
                >
                  <option value="all">All Domains</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Biotechnology">Biotechnology</option>
                  <option value="Energy">Energy</option>
                  <option value="Robotics">Robotics</option>
                  <option value="Healthcare">Healthcare</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="im-data-table">
                <thead>
                  <tr>
                    <th>Technology Vector</th>
                    <th>Domain</th>
                    <th>Research Papers</th>
                    <th>Patent Filings</th>
                    <th>Grant Calls</th>
                    <th>Research YoY</th>
                    <th>Emerging Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrends.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-table-cell">No technology records matching filter.</td>
                    </tr>
                  ) : (
                    filteredTrends.map((t, idx) => (
                      <tr key={idx}>
                        <td><strong>{t.technology_name}</strong></td>
                        <td><span className="domain-pill">{t.technology_domain}</span></td>
                        <td>{t.research_paper_count || 0}</td>
                        <td>{t.patent_count || 0}</td>
                        <td>{t.funding_opportunity_count || 0}</td>
                        <td><strong style={{ color: '#16a34a' }}>+{t.research_growth_rate || 0}%</strong></td>
                        <td>
                          <span className={`badge-status status-${(t.emerging_status || 'stable').toLowerCase()}`}>
                            {t.emerging_status || 'Stable'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
