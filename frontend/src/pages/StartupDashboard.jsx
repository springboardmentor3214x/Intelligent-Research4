import { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import { getStartupFounderDashboard } from '../services/dashboardService'
import './StartupDashboard.css'

export default function StartupDashboard() {
  const { token, user } = useContext(AuthContext)
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [domainFilter, setDomainFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)

  const loadData = async (silent = false) => {
    if (!token) return
    if (!silent) setLoading(true)
    else setIsRefreshing(true)
    setError('')

    try {
      const effectiveDomain = domainFilter === 'all' ? null : domainFilter
      const res = await getStartupFounderDashboard(token, effectiveDomain)
      setData(res)
      setLastRefreshedAt(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Failed to load startup founder intelligence:', err)
      setError(err.message || 'Unable to retrieve startup intelligence telemetry.')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token, domainFilter])

  const summary = data?.summary || {}
  const technologies = data?.recommended_technologies || []
  const fundingOpps = data?.funding_opportunities || []
  const potentialProducts = data?.potential_products || []
  const startupOpps = data?.startup_opportunities || []
  const commercialApps = data?.commercial_applications || []
  const patents = data?.relevant_patents || []
  const innovation = data?.innovation_assessment || {}

  return (
    <div className="startup-dashboard-container">
      {/* Top Header */}
      <div className="startup-header">
        <div className="header-left">
          <span className="eyebrow">VENTURE &amp; COMMERCIALIZATION HUB</span>
          <h1>Startup Founder Command Center</h1>
          <p className="subtitle">
            Empirical intelligence driving productization, grant funding, intellectual property landscape, and startup pathways.
          </p>
        </div>
        <div className="header-actions">
          <div className="domain-selector">
            <label>Domain Focus:</label>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="select-input"
            >
              <option value="all">All Domains (Active Profile)</option>
              <option value="Artificial Intelligence">Artificial Intelligence</option>
              <option value="Biotechnology">Biotechnology</option>
              <option value="Clean Energy">Clean Energy</option>
              <option value="Robotics">Robotics &amp; Automation</option>
              <option value="Healthcare">Healthcare &amp; MedTech</option>
            </select>
          </div>
          <button
            className="btn-refresh"
            onClick={() => loadData(true)}
            disabled={isRefreshing || loading}
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh Live Data'}
          </button>
        </div>
      </div>

      {lastRefreshedAt && (
        <div className="refreshed-badge">
          <span>● Live telemetry connected</span> · Last synchronized: {lastRefreshedAt}
        </div>
      )}

      {error && (
        <div className="alert-error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => loadData()}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading-state">
          <div className="spinner-large"></div>
          <p>Synthesizing Startup &amp; Commercialization Intelligence...</p>
        </div>
      ) : (
        <>
          {/* Executive Stat Cards */}
          <div className="startup-stat-grid">
            <div className="stat-card">
              <span className="stat-label">Active Grant Calls</span>
              <strong className="stat-value">{summary.active_grants_count || fundingOpps.length}</strong>
              <span className="stat-caption">Available non-dilutive funding</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Tracked Technologies</span>
              <strong className="stat-value">{summary.tracked_technologies_count || technologies.length}</strong>
              <span className="stat-caption">Emerging market vectors</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Product Concepts</span>
              <strong className="stat-value">{summary.commercial_products_count || potentialProducts.length}</strong>
              <span className="stat-caption">Identified commercial blueprints</span>
            </div>
            <div className="stat-card highlight-card">
              <span className="stat-label">Innovation Score</span>
              <strong className="stat-value">{summary.innovation_score || innovation.overall_score || 76.5}<small>/100</small></strong>
              <span className="stat-caption">{summary.innovation_level || innovation.innovation_level || 'High Commercial Potential'}</span>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="quick-action-bar">
            <span>Quick Intelligence Navigation:</span>
            <Link to="/reports" state={{ researchIdea: domainFilter !== 'all' ? domainFilter : 'Artificial Intelligence' }} className="action-link">
              📄 Generate Full Intelligence Report
            </Link>
            <Link to="/funding" className="action-link">
              🎯 Explore All Grant Calls
            </Link>
            <Link to="/commercialization" className="action-link">
              💡 Deep Commercialization Pathways
            </Link>
            <Link to="/patents" className="action-link">
              📜 Prior-Art Patent Search
            </Link>
          </div>

          {/* Grid: Recommended Technologies & Funding */}
          <div className="two-column-grid">
            {/* Recommended Technologies */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2>🚀 High-Velocity Emerging Technologies</h2>
                  <p className="panel-sub">Verified technologies exhibiting strong patent and research growth</p>
                </div>
              </div>
              <div className="tech-list">
                {technologies.length === 0 ? (
                  <p className="empty-text">No emerging technologies found for selected domain.</p>
                ) : (
                  technologies.map((t, idx) => (
                    <div key={idx} className="tech-item-card">
                      <div className="tech-item-top">
                        <div>
                          <strong className="tech-name">{t.name}</strong>
                          <span className="tech-domain">{t.domain}</span>
                        </div>
                        <span className={`status-tag status-${(t.status || 'growing').toLowerCase()}`}>
                          {t.status || 'Growing'}
                        </span>
                      </div>
                      <p className="tech-opp">{t.opportunity || `High commercialization demand across ${t.domain}.`}</p>
                      <div className="tech-metrics-row">
                        <span>Emerging Score: <strong>{t.emerging_score}</strong></span>
                        <span>Research Growth: <strong>+{t.growth_rate}%</strong></span>
                        <span>Patents: <strong>{t.patent_count}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Matching Grant & Venture Opportunities */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2>🎯 Matching Non-Dilutive Funding</h2>
                  <p className="panel-sub">Government grants, institutional challenges, and translational funds</p>
                </div>
              </div>
              <div className="funding-list">
                {fundingOpps.length === 0 ? (
                  <p className="empty-text">No active funding calls matching the current criteria.</p>
                ) : (
                  fundingOpps.map((f, idx) => (
                    <div key={idx} className="funding-item-card">
                      <div className="funding-item-top">
                        <strong className="funding-title">{f.title}</strong>
                        <span className="badge-grant">{f.funding_type || 'Grant'}</span>
                      </div>
                      <p className="funding-agency">🏛 Agency: {f.agency}</p>
                      <div className="funding-item-bottom">
                        <span className="funding-amount">
                          {f.award_ceiling ? `$${Number(f.award_ceiling).toLocaleString()}` : 'Funding specified in call'}
                        </span>
                        <span className="funding-match">Match: {f.relevance_percentage || 80}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Grid: Commercial Products & Startup Pathways */}
          <div className="two-column-grid">
            {/* Commercial Products */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2>💡 Potential Product Concepts</h2>
                  <p className="panel-sub">Translational product blueprints derived from scientific literature</p>
                </div>
              </div>
              <div className="product-list">
                {potentialProducts.length === 0 ? (
                  <p className="empty-text">No productization blueprints identified.</p>
                ) : (
                  potentialProducts.map((p, idx) => (
                    <div key={idx} className="product-item-card">
                      <strong className="product-title">{p.title || p.product}</strong>
                      <p className="product-market">🎯 Target Market: {p.target_market || p.industry || 'B2B Enterprise'}</p>
                      <div className="product-meta-row">
                        <span>Feasibility: <strong>{p.feasibility || 'High'}</strong></span>
                        {p.trl && <span>Readiness Level: <strong>TRL {p.trl}</strong></span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Startup Opportunities */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <div>
                  <h2>🏢 Startup Spin-off Pathways</h2>
                  <p className="panel-sub">Venture models, IP licensing options, and market viability</p>
                </div>
              </div>
              <div className="startup-list">
                {startupOpps.length === 0 ? (
                  <p className="empty-text">No venture spin-off models available.</p>
                ) : (
                  startupOpps.map((s, idx) => (
                    <div key={idx} className="startup-item-card">
                      <strong className="startup-title">{s.title || 'Venture Spinout Opportunity'}</strong>
                      <p className="startup-desc">Sector: {s.sector || 'DeepTech / SaaS'}</p>
                      <div className="startup-meta-row">
                        <span>Business Model: <strong>{s.business_model || 'Subscription / Licensing'}</strong></span>
                        <span>Potential: <strong style={{ color: '#079b91' }}>{s.market_potential || 'High'}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Prior Art Patents Table */}
          <div className="dashboard-panel full-width">
            <div className="panel-header">
              <div>
                <h2>📜 Relevant Patent Prior-Art Landscape</h2>
                <p className="panel-sub">Recent patent filings to evaluate competitor IP and novelty</p>
              </div>
            </div>
            <div className="table-responsive">
              <table className="custom-data-table">
                <thead>
                  <tr>
                    <th>Patent Title</th>
                    <th>Assignee / Applicant</th>
                    <th>Technology Domain</th>
                    <th>Filing Year</th>
                    <th>Citations</th>
                  </tr>
                </thead>
                <tbody>
                  {patents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-table-cell">No prior-art records found.</td>
                    </tr>
                  ) : (
                    patents.map((p, idx) => (
                      <tr key={idx}>
                        <td><strong>{p.title}</strong></td>
                        <td>{p.assignee}</td>
                        <td><span className="badge-domain">{p.domain}</span></td>
                        <td>{p.filing_year || 'N/A'}</td>
                        <td>{p.citations ?? 0}</td>
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
