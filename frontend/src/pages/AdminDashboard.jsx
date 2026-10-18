import { useState, useEffect, useContext, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import {
  getAdminMetrics,
  getAdminUsers,
  getAdminRecommendations,
  sendAdminBroadcast,
} from '../services/dashboardService'
import {
  batchCorpusIngest,
  getCorpusStats,
} from '../services/researchPaperService'
import './AdminDashboard.css'

const ROLES = [
  { key: 'all', label: 'All Roles' },
  { key: 'researcher', label: 'Researchers' },
  { key: 'startup_founder', label: 'Startup Founders' },
  { key: 'innovation_manager', label: 'Innovation Managers' },
  { key: 'administrator', label: 'Administrators' },
]

export default function AdminDashboard() {
  const { token, user } = useContext(AuthContext)
  const navigate = useNavigate()

  // Core Data States
  const [metrics, setMetrics] = useState(null)
  const [recommendationsData, setRecommendationsData] = useState(null)
  const [usersData, setUsersData] = useState({ items: [], total: 0 })

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [page, setPage] = useState(0)
  const pageSize = 12
  const [analyticsTab, setAnalyticsTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('30d')
  const [autoRefreshInterval, setAutoRefreshInterval] = useState('off')
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date().toLocaleTimeString())

  // Global Command Search State
  const [commandSearch, setCommandSearch] = useState('')
  const [commandResults, setCommandResults] = useState([])
  const [isCommandOpen, setIsCommandOpen] = useState(false)

  // Interactive Drawers / Modals
  const [selectedUserDetail, setSelectedUserDetail] = useState(null)
  const [selectedMetricDetail, setSelectedMetricDetail] = useState(null)
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false)
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    audience: 'all',
    priority: 'HIGH',
  })
  const [announcementSuccess, setAnnouncementSuccess] = useState('')

  // UI States
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')

  // Research Corpus Management State
  const [corpusStats, setCorpusStats] = useState(null)
  const [ingestingCorpus, setIngestingCorpus] = useState(false)
  const [ingestStatusMsg, setIngestStatusMsg] = useState('')
  const [batchTarget, setBatchTarget] = useState(100)

  // Role Protection
  useEffect(() => {
    if (!user) return
    const r = (user.role || '').toLowerCase().trim()
    if (r !== 'administrator' && r !== 'admin') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  // Fetch Core Admin Telemetry
  const loadPlatformData = async (showRefreshIndicator = false) => {
    if (!token) return
    if (showRefreshIndicator) setIsRefreshing(true)
    else setLoadingMetrics(true)
    setError('')

    try {
      const [metricsRes, recRes, corpusRes] = await Promise.all([
        getAdminMetrics(token),
        getAdminRecommendations(token),
        getCorpusStats(token).catch(() => null),
      ])
      setMetrics(metricsRes)
      setRecommendationsData(recRes)
      if (corpusRes) setCorpusStats(corpusRes)
      setLastRefreshedAt(new Date().toLocaleTimeString())
    } catch (err) {
      console.error('Failed to load admin telemetry:', err)
      setError(err.message || 'Unable to load live platform telemetry')
    } finally {
      setLoadingMetrics(false)
      setIsRefreshing(false)
    }
  }

  const handleBatchIngest = async () => {
    if (!token || ingestingCorpus) return
    setIngestingCorpus(true)
    setIngestStatusMsg('Initiating multi-source batch ingestion across 18 core academic topics (OpenAlex, Crossref, Semantic Scholar, CORE, arXiv, Europe PMC, PubMed, DOAJ, OpenAIRE, Zenodo, bioRxiv, medRxiv, BASE)...')
    try {
      const res = await batchCorpusIngest(token, {
        target_per_topic: batchTarget,
        sources: [
          'OpenAlex',
          'Crossref',
          'Semantic Scholar',
          'CORE',
          'arXiv',
          'Europe PMC',
          'PubMed',
          'DOAJ',
          'OpenAIRE',
          'Zenodo',
          'bioRxiv',
          'medRxiv',
          'BASE',
        ],
      })
      setIngestStatusMsg(`Batch Ingestion Complete: Successfully ingested ${res.total_inserted_in_batch} new verified papers across ${res.topics_processed} topics! Current Corpus Total: ${res.total_in_collection}.`)
      loadPlatformData(true)
    } catch (err) {
      setIngestStatusMsg(`Ingestion encountered an issue: ${err.message || 'Check server connection'}`)
    } finally {
      setIngestingCorpus(false)
    }
  }

  useEffect(() => {
    loadPlatformData()
  }, [token])

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefreshInterval === 'off' || !token) return
    const seconds = parseInt(autoRefreshInterval, 10) * 1000
    const interval = setInterval(() => {
      loadPlatformData(true)
    }, seconds)
    return () => clearInterval(interval)
  }, [autoRefreshInterval, token])

  // Fetch Users with search, role filter, pagination
  useEffect(() => {
    if (!token) return
    let isCancelled = false

    async function fetchUsers() {
      try {
        setLoadingUsers(true)
        const res = await getAdminUsers(token, {
          search: searchQuery,
          role: selectedRole,
          limit: pageSize,
          offset: page * pageSize,
        })
        if (!isCancelled) {
          setUsersData(res || { items: [], total: 0 })
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load users:', err)
        }
      } finally {
        if (!isCancelled) setLoadingUsers(false)
      }
    }

    const timer = setTimeout(() => {
      fetchUsers()
    }, 250)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [token, searchQuery, selectedRole, page])

  // Unpack live telemetry
  const overview = metrics?.overview || {}
  const roleDist = metrics?.role_distribution || {}
  const countryDist = metrics?.country_distribution || []
  const orgDist = metrics?.org_distribution || []
  const topTech = metrics?.top_technology_domains || []
  const topPatents = metrics?.top_patent_domains || []
  const topFundingAgencies = metrics?.top_funding_agencies || []
  const pubTimeline = metrics?.publication_timeline || []
  const patentTimeline = metrics?.patent_timeline || []
  const userRegTrend = metrics?.user_registration_trend || []
  const fundingTypeDist = metrics?.funding_type_distribution || []
  const techMaturityDist = metrics?.technology_maturity_distribution || []
  const capUtilization = metrics?.capability_utilization || []
  const systemHealth = metrics?.system_health || { services: [] }
  const securityAlerts = metrics?.security_alerts || []
  const activityStream = metrics?.activity_stream || []

  // Global Command Search Resolver across loaded datasets
  useEffect(() => {
    if (!commandSearch.trim()) {
      setCommandResults([])
      return
    }
    const q = commandSearch.toLowerCase().trim()
    const results = []

    // 1. Users
    usersData.items.forEach((u) => {
      if (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.organization?.toLowerCase().includes(q) ||
        u.research_domain?.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'User',
          icon: '👤',
          title: u.name,
          subtitle: `${u.role.replace(/_/g, ' ')} • ${u.organization || 'Global'}`,
          actionLabel: 'Inspect',
          action: () => {
            setSelectedUserDetail(u)
            setIsCommandOpen(false)
          },
        })
      }
    })

    // 2. Technology Domains
    topTech.forEach((t) => {
      if (t.domain?.toLowerCase().includes(q)) {
        results.push({
          type: 'Technology Domain',
          icon: '⚡',
          title: t.domain,
          subtitle: `${t.count} tracked technologies`,
          actionLabel: 'View Landscape',
          action: () => {
            navigate('/technologies')
            setIsCommandOpen(false)
          },
        })
      }
    })

    // 3. Patent Domains
    topPatents.forEach((p) => {
      if (p.domain?.toLowerCase().includes(q)) {
        results.push({
          type: 'Patent Domain',
          icon: '💡',
          title: p.domain,
          subtitle: `${p.count} prior-art records`,
          actionLabel: 'Open Patents',
          action: () => {
            navigate('/patents')
            setIsCommandOpen(false)
          },
        })
      }
    })

    // 4. Funding Agencies
    topFundingAgencies.forEach((f) => {
      if (f.agency?.toLowerCase().includes(q)) {
        results.push({
          type: 'Funding Agency',
          icon: '🎯',
          title: f.agency,
          subtitle: `${f.count} active grant programs`,
          actionLabel: 'View Grants',
          action: () => {
            navigate('/funding')
            setIsCommandOpen(false)
          },
        })
      }
    })

    // 5. System Health Services
    ;(systemHealth?.services || []).forEach((s) => {
      if (s.name?.toLowerCase().includes(q)) {
        results.push({
          type: 'Service Health',
          icon: '🛡️',
          title: s.name,
          subtitle: `Status: ${(s.status || 'OPERATIONAL').toUpperCase()} (${s.latency_ms || 5}ms, ${s.records || 0} records)`,
          actionLabel: 'View Node',
          action: () => {
            setSelectedMetricDetail({ title: s.name, value: `${s.latency_ms || 5}ms`, meta: `${s.records || 0} connected records` })
            setIsCommandOpen(false)
          },
        })
      }
    })

    setCommandResults(results.slice(0, 8))
  }, [commandSearch, usersData, topTech, topPatents, topFundingAgencies, systemHealth, navigate])

  // Max value calculators for relative bar widths
  const maxRoleCount = useMemo(() => {
    const vals = Object.values(roleDist)
    return vals.length ? Math.max(...vals) : 1
  }, [roleDist])

  const handlePublishAnnouncement = async (e) => {
    e.preventDefault()
    try {
      const res = await sendAdminBroadcast(token, announcementForm)
      setAnnouncementSuccess(res?.message || `Broadcast announced to audience: ${announcementForm.audience.toUpperCase()}`)
      loadPlatformData(true)
      setTimeout(() => {
        setAnnouncementModalOpen(false)
        setAnnouncementSuccess('')
        setAnnouncementForm({ title: '', message: '', audience: 'all', priority: 'HIGH' })
      }, 1500)
    } catch (err) {
      console.error('Failed to dispatch broadcast:', err)
      alert(err.message || 'Failed to dispatch broadcast notification.')
    }
  }

  // Calculate SVG timeline points for Publications & Patents
  const svgLinePoints = useMemo(() => {
    if (!pubTimeline.length) return ''
    const maxVal = Math.max(...pubTimeline.map((p) => p.count), 1)
    const width = 500
    const height = 140
    const step = width / Math.max(pubTimeline.length - 1, 1)

    return pubTimeline
      .map((pt, i) => {
        const x = i * step
        const y = height - (pt.count / maxVal) * (height - 30) - 15
        return `${x},${y}`
      })
      .join(' ')
  }, [pubTimeline])

  return (
    <div className="admin-control-room">
      {/* 1. Header Control Room Banner */}
      <div className="control-room-header">
        <div>
          <div className="cr-header-badge">
            <span className="pulse-circle" />
            ENTERPRISE AI PLATFORM CONTROL ROOM &bull; GOVERNANCE CONSOLE
          </div>
          <h1>Platform Intelligence &amp; Governance Center</h1>
          <p className="cr-subtitle">
            Centralized platform monitoring, user governance, intelligence analytics, system health and operational control for <strong>{user?.name || 'Lead Administrator'}</strong>.
          </p>
        </div>

        <div className="cr-header-controls">
          <button
            className="cr-btn cr-btn-secondary"
            onClick={() => loadPlatformData(true)}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : '🔄 Refresh Live Data'}
          </button>
          <button
            className="cr-btn cr-btn-primary"
            onClick={() => setAnnouncementModalOpen(true)}
          >
            📢 Create Broadcast
          </button>
        </div>
      </div>

      {/* 2. Global Command Search Bar */}
      <div className="cr-command-search-wrapper">
        <div className="cr-command-bar">
          <span className="cr-command-icon">🔍</span>
          <input
            type="text"
            className="cr-command-input"
            placeholder="Search users, reports, alerts, technologies, patents, funding, system events..."
            value={commandSearch}
            onChange={(e) => {
              setCommandSearch(e.target.value)
              setIsCommandOpen(true)
            }}
            onFocus={() => setIsCommandOpen(true)}
          />
          {commandSearch && (
            <button
              className="cr-command-clear"
              onClick={() => {
                setCommandSearch('')
                setCommandResults([])
              }}
            >
              ✕
            </button>
          )}
        </div>

        {isCommandOpen && commandResults.length > 0 && (
          <div className="cr-command-dropdown">
            <div className="cr-dropdown-header">
              <span>Matching Admin Entities ({commandResults.length})</span>
              <button onClick={() => setIsCommandOpen(false)}>Close</button>
            </div>
            {commandResults.map((res, i) => (
              <div key={i} className="cr-dropdown-item" onClick={res.action}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{res.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, color: '#073b5c', fontSize: '13px' }}>
                      {res.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#587083' }}>
                      <span className="cr-type-tag">{res.type}</span> {res.subtitle}
                    </div>
                  </div>
                </div>
                <button className="cr-item-action-btn">{res.actionLabel}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Command Strip & Operational Status Bar */}
      <div className="cr-quick-bar">
        <div className="cr-status-indicator">
          <span className="status-beacon" />
          <span>SYSTEM OPERATIONAL</span>
          <span style={{ color: '#587083', fontWeight: 500, fontSize: '12px' }}>
            &bull; Last check: {lastRefreshedAt}
          </span>
        </div>

        <div className="cr-actions-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#587083' }}>
            <span>Auto Refresh:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(e.target.value)}
              style={{
                background: '#f8fafc',
                border: '1px solid #dce7ee',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#073b5c',
              }}
            >
              <option value="off">Manual</option>
              <option value="30">30 sec</option>
              <option value="60">1 min</option>
              <option value="300">5 min</option>
            </select>
          </div>
          <Link to="/reports" className="cr-action-chip">
            📑 System Reports
          </Link>
          <Link to="/technologies" className="cr-action-chip">
            ⚡ Tech Landscape
          </Link>
          <Link to="/funding" className="cr-action-chip">
            🎯 Grant Intelligence
          </Link>
          <Link to="/patents" className="cr-action-chip">
            💡 Prior-Art DB
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 18px', borderRadius: '12px', marginBottom: '24px', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {/* 4. Executive KPI Wall */}
      <div className="cr-kpi-grid">
        <div className="cr-kpi-card" onClick={() => setSelectedMetricDetail({ title: 'User Base Analytics', value: overview.total_users, meta: `${overview.active_users_30d || 0} active past month` })}>
          <div className="cr-kpi-top">
            <span className="cr-kpi-label">Total Users</span>
            <span className="cr-kpi-icon">👥</span>
          </div>
          <div className="cr-kpi-value">{overview.total_users ?? '—'}</div>
          <div className="cr-kpi-meta">
            <span>+{overview.new_users_7d ?? 0} this week</span>
            <span className="cr-kpi-submeta">Active: {overview.active_users_30d ?? 0} (30d)</span>
          </div>
        </div>

        <div className="cr-kpi-card" onClick={() => setSelectedMetricDetail({ title: 'Indexed Scientific Publications', value: overview.total_papers, meta: 'Empirical Literature Registry' })}>
          <div className="cr-kpi-top">
            <span className="cr-kpi-label">Publications</span>
            <span className="cr-kpi-icon">📄</span>
          </div>
          <div className="cr-kpi-value">{overview.total_papers ?? '—'}</div>
          <div className="cr-kpi-meta">OpenAlex &amp; PubMed Indexed</div>
        </div>

        <div className="cr-kpi-card" onClick={() => setSelectedMetricDetail({ title: 'Active Funding Opportunities', value: overview.total_funding_opportunities, meta: 'Verified Global Grant Programs' })}>
          <div className="cr-kpi-top">
            <span className="cr-kpi-label">Funding Grants</span>
            <span className="cr-kpi-icon">🎯</span>
          </div>
          <div className="cr-kpi-value">{overview.total_funding_opportunities ?? '—'}</div>
          <div className="cr-kpi-meta">Grants.gov &amp; Institutional</div>
        </div>

        <div className="cr-kpi-card" onClick={() => setSelectedMetricDetail({ title: 'Patent Prior-Art Records', value: overview.total_patents, meta: 'EPO, USPTO & In-House Index' })}>
          <div className="cr-kpi-top">
            <span className="cr-kpi-label">Patent Records</span>
            <span className="cr-kpi-icon">💡</span>
          </div>
          <div className="cr-kpi-value">{overview.total_patents ?? '—'}</div>
          <div className="cr-kpi-meta">Global Prior-Art Database</div>
        </div>

        <div className="cr-kpi-card" onClick={() => setSelectedMetricDetail({ title: 'Tracked Emerging Technologies', value: overview.total_technologies, meta: 'Growth & IP Lifecycle Matrix' })}>
          <div className="cr-kpi-top">
            <span className="cr-kpi-label">Tracked Technologies</span>
            <span className="cr-kpi-icon">⚙️</span>
          </div>
          <div className="cr-kpi-value">{overview.total_technologies ?? '—'}</div>
          <div className="cr-kpi-meta">13 Tech Domains Monitored</div>
        </div>

        <div className="cr-kpi-card" onClick={() => setSelectedMetricDetail({ title: 'System Notifications & Dispatches', value: overview.total_notifications_sent, meta: `${overview.read_notifications || 0} read, ${overview.unread_notifications || 0} queued` })}>
          <div className="cr-kpi-top">
            <span className="cr-kpi-label">Notifications Sent</span>
            <span className="cr-kpi-icon">🔔</span>
          </div>
          <div className="cr-kpi-value">{overview.total_notifications_sent ?? '—'}</div>
          <div className="cr-kpi-meta">{overview.read_notifications ?? 0} read &bull; {overview.unread_notifications ?? 0} unread</div>
        </div>
      </div>

      {/* 5. Advanced Platform Analytics (Multi-Chart Section) */}
      <div className="cr-section-card">
        <div className="cr-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <h3 className="cr-section-title">
              <span>📊 Advanced Platform Intelligence &amp; Analytics</span>
            </h3>
            <div className="cr-tab-group">
              <button
                className={`cr-tab-btn ${analyticsTab === 'overview' ? 'active' : ''}`}
                onClick={() => setAnalyticsTab('overview')}
              >
                Activity &amp; Growth
              </button>
              <button
                className={`cr-tab-btn ${analyticsTab === 'intelligence' ? 'active' : ''}`}
                onClick={() => setAnalyticsTab('intelligence')}
              >
                Intelligence Domains
              </button>
              <button
                className={`cr-tab-btn ${analyticsTab === 'funnel' ? 'active' : ''}`}
                onClick={() => setAnalyticsTab('funnel')}
              >
                Commercialization Pipeline
              </button>
            </div>
          </div>
          <span className="cr-badge">Live Empirical Data</span>
        </div>

        {analyticsTab === 'overview' && (
          <div className="cr-analytics-grid-multi">
            {/* 1. User Registration Trend Line Chart */}
            <div className="cr-chart-container">
              <div className="cr-chart-title">
                <span>📊 User Registration Trend</span>
                <span className="cr-chart-sub">Monthly Growth</span>
              </div>
              <div style={{ position: 'relative', width: '100%', marginTop: '10px' }}>
                <div style={{ height: '130px', width: '100%', position: 'relative' }}>
                  <svg viewBox="0 0 500 130" className="cr-svg-chart" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="areaGradUserReg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <polygon
                      fill="url(#areaGradUserReg)"
                      points={
                        userRegTrend.length > 1
                          ? `0,130 ${userRegTrend
                              .map((pt, i) => {
                                const maxVal = Math.max(...userRegTrend.map((p) => p.count), 1)
                                const step = 500 / (userRegTrend.length - 1)
                                const x = i * step
                                const y = 130 - (pt.count / maxVal) * 95 - 15
                                return `${x},${y}`
                              })
                              .join(' ')} 500,130`
                          : '0,130 500,130'
                      }
                    />
                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={
                        userRegTrend.length > 1
                          ? userRegTrend
                              .map((pt, i) => {
                                const maxVal = Math.max(...userRegTrend.map((p) => p.count), 1)
                                const step = 500 / (userRegTrend.length - 1)
                                const x = i * step
                                const y = 130 - (pt.count / maxVal) * 95 - 15
                                return `${x},${y}`
                              })
                              .join(' ')
                          : '0,65 500,65'
                      }
                    />
                  </svg>
                </div>
                <div className="cr-timeline-badges-grid">
                  {userRegTrend.map((pt, idx) => (
                    <div key={idx} className="cr-year-badge">
                      <span className="cr-year-label">{pt.month}</span>
                      <strong className="cr-year-count">{pt.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. User Role Distribution Donut & Progress */}
            <div className="cr-chart-container">
              <div className="cr-chart-title">
                <span>👥 User Role Distribution</span>
                <span className="cr-chart-sub">Total: {overview.total_users ?? 0} Accounts</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {Object.entries(roleDist).map(([roleKey, count]) => {
                  const label = roleKey.replace(/_/g, ' ').toUpperCase()
                  const pct = overview.total_users > 0 ? ((count / overview.total_users) * 100).toFixed(0) : 0
                  return (
                    <div
                      key={roleKey}
                      onClick={() => {
                        setSelectedRole(roleKey)
                        setPage(0)
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Click to filter user table below"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#073b5c', marginBottom: '4px' }}>
                        <span>{label}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(10, (count / maxRoleCount) * 100)}%`,
                            background: roleKey === 'administrator' ? '#ef4444' : roleKey === 'researcher' ? '#079b91' : roleKey === 'startup_founder' ? '#3b82f6' : '#8b5cf6',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 3. Scientific Publication Output Progression */}
            <div className="cr-chart-container">
              <div className="cr-chart-title">
                <span>📄 Scientific Publication Progression</span>
                <span className="cr-chart-sub">Annual Output (2015–2026)</span>
              </div>
              {pubTimeline.length > 0 ? (
                <div style={{ position: 'relative', width: '100%', marginTop: '10px' }}>
                  <div style={{ height: '130px', width: '100%', position: 'relative' }}>
                    <svg viewBox="0 0 500 130" className="cr-svg-chart" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="areaGradPub" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#079b91" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#079b91" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <polygon
                        fill="url(#areaGradPub)"
                        points={`0,130 ${svgLinePoints} 500,130`}
                      />
                      <polyline
                        fill="none"
                        stroke="#079b91"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={svgLinePoints}
                      />
                    </svg>
                  </div>
                  <div className="cr-timeline-badges-grid">
                    {pubTimeline.map((pt) => (
                      <div key={pt.year} className="cr-year-badge">
                        <span className="cr-year-label">{pt.year}</span>
                        <strong className="cr-year-count">{pt.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="cr-empty-state">Historical activity data is not available.</div>
              )}
            </div>

            {/* 4. Global Patent Prior-Art Filing Trajectory */}
            <div className="cr-chart-container">
              <div className="cr-chart-title">
                <span>💡 Patent Prior-Art Filing Trajectory</span>
                <span className="cr-chart-sub">Annual Filings (2015–2026)</span>
              </div>
              {patentTimeline.length > 0 ? (
                <div style={{ position: 'relative', width: '100%', marginTop: '10px' }}>
                  <div style={{ height: '130px', width: '100%', position: 'relative' }}>
                    <svg viewBox="0 0 500 130" className="cr-svg-chart" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="areaGradPat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <polyline
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={
                          patentTimeline.length > 1
                            ? patentTimeline
                                .map((pt, i) => {
                                  const maxVal = Math.max(...patentTimeline.map((p) => p.count), 1)
                                  const step = 500 / (patentTimeline.length - 1)
                                  const x = i * step
                                  const y = 130 - (pt.count / maxVal) * 95 - 15
                                  return `${x},${y}`
                                })
                                .join(' ')
                            : ''
                        }
                      />
                    </svg>
                  </div>
                  <div className="cr-timeline-badges-grid">
                    {patentTimeline.map((pt) => (
                      <div key={pt.year} className="cr-year-badge patent">
                        <span className="cr-year-label">{pt.year}</span>
                        <strong className="cr-year-count" style={{ color: '#7c3aed', background: '#f5f3ff' }}>{pt.count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="cr-empty-state">Patent timeline data is not available.</div>
              )}
            </div>

            {/* 5. Funding Opportunities Breakdown by Type */}
            <div className="cr-chart-container">
              <div className="cr-chart-title">
                <span>🎯 Funding Opportunities by Category</span>
                <span className="cr-chart-sub">Top Grant Mechanisms</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                {fundingTypeDist.map((f, idx) => {
                  const totalFunding = overview.total_funding_opportunities || 1
                  const pct = ((f.count / totalFunding) * 100).toFixed(1)
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, color: '#073b5c' }}>
                        <span>{f.type}</span>
                        <span style={{ color: '#059669', fontWeight: 800 }}>{f.count} grants <span style={{ color: '#64748b', fontWeight: 500, fontSize: '11.5px' }}>({pct}%)</span></span>
                      </div>
                      <div style={{ width: '100%', height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(6, (f.count / (fundingTypeDist[0]?.count || 1)) * 100)}%`,
                            background: idx === 0 ? '#10b981' : idx === 1 ? '#059669' : idx === 2 ? '#0d9488' : '#3b82f6',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 6. Technology Maturity & Status Distribution */}
            <div className="cr-chart-container">
              <div className="cr-chart-title">
                <span>🛡️ Technology Maturity Progression</span>
                <span className="cr-chart-sub">Lifecycle Stages &amp; Readiness</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
                {techMaturityDist.map((m, idx) => {
                  const totalTech = overview.total_technologies || 1
                  const pct = ((m.count / totalTech) * 100).toFixed(1)
                  const isMature = m.status.toLowerCase().includes('mature')
                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: isMature ? '#10b981' : '#3b82f6',
                            }}
                          />
                          <span style={{ fontWeight: 800, color: '#073b5c', fontSize: '13px' }}>{m.status} Stage</span>
                        </div>
                        <span
                          className="cr-data-badge"
                          style={{
                            background: isMature ? '#ecfdf5' : '#eff6ff',
                            color: isMature ? '#065f46' : '#1e40af',
                            borderColor: isMature ? '#a7f3d0' : '#bfdbfe',
                            fontWeight: 800,
                          }}
                        >
                          {m.count} Domains ({pct}%)
                        </span>
                      </div>

                      <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${(m.count / totalTech) * 100}%`,
                            background: isMature ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                            borderRadius: '4px',
                          }}
                        />
                      </div>

                      {m.technologies && m.technologies.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {m.technologies.map((tName, tIdx) => (
                            <span
                              key={tIdx}
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#475569',
                                padding: '2px 8px',
                                borderRadius: '6px',
                              }}
                            >
                              {tName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {analyticsTab === 'intelligence' && (
          <div className="cr-analytics-grid-multi">
            {/* 5. Top Technology Domains Bar Chart */}
            <div className="cr-chart-container">
              <div className="cr-chart-title">
                <span>⚡ Key Technology Intelligence Tracks</span>
                <span className="cr-chart-sub">Top Rated by Readiness</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                {topTech.map((t, idx) => (
                  <div key={idx} className="cr-data-bar-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#073b5c', fontSize: '13px' }}>{t.domain}</span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: t.status === 'Mature' ? '#ecfdf5' : '#eff6ff',
                            color: t.status === 'Mature' ? '#065f46' : '#1e40af',
                          }}
                        >
                          {t.status}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Readiness Score: <strong style={{ color: '#073b5c' }}>{t.score ?? 'N/A'}</strong> / 100
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="cr-data-badge" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }} title="Indexed Research Papers">
                        {t.count} papers
                      </span>
                      {t.patents > 0 && (
                        <span className="cr-data-badge" style={{ background: '#fdf4ff', color: '#86198f', borderColor: '#f5d0fe' }} title="Registered Patents">
                          {t.patents} patents
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Patent Technology Domains */}
            <div className="cr-chart-container">
              <div className="cr-chart-title">
                <span>💡 Patent Prior-Art Classification Breakdown</span>
                <span className="cr-chart-sub">Filing Concentrations</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                {topPatents.map((p, idx) => {
                  const totalPat = overview.total_patents || 1
                  const pct = ((p.count / totalPat) * 100).toFixed(1)
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, color: '#073b5c' }}>
                        <span>{p.domain}</span>
                        <span style={{ color: '#8b5cf6', fontWeight: 800 }}>
                          {p.count} filings <span style={{ color: '#64748b', fontWeight: 500, fontSize: '11.5px' }}>({pct}%)</span>
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.max(6, (p.count / (topPatents[0]?.count || 1)) * 100)}%`,
                            background: idx === 0 ? '#8b5cf6' : idx === 1 ? '#7c3aed' : idx === 2 ? '#6d28d9' : '#a855f7',
                            borderRadius: '4px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {analyticsTab === 'funnel' && (
          <div>
            <div className="cr-chart-title" style={{ marginBottom: '16px' }}>
              <span>🚀 Commercialization &amp; Innovation Funnel</span>
              <span className="cr-chart-sub">Empirical pipeline stage conversion</span>
            </div>
            <div className="cr-funnel-grid">
              <div className="cr-funnel-stage stage-1">
                <div className="stage-step">Stage 1</div>
                <div className="stage-name">Scientific Publications</div>
                <div className="stage-count">{overview.total_papers ?? 0} Records</div>
                <div className="stage-desc">OpenAlex &amp; PubMed literature baseline</div>
              </div>
              <div className="cr-funnel-arrow">➔</div>
              <div className="cr-funnel-stage stage-2">
                <div className="stage-step">Stage 2</div>
                <div className="stage-name">Tracked Technologies</div>
                <div className="stage-count">{overview.total_technologies ?? 0} Domains</div>
                <div className="stage-desc">Maturity &amp; IP readiness evaluated</div>
              </div>
              <div className="cr-funnel-arrow">➔</div>
              <div className="cr-funnel-stage stage-3">
                <div className="stage-step">Stage 3</div>
                <div className="stage-name">Patent Prior-Art</div>
                <div className="stage-count">{overview.total_patents ?? 0} Filings</div>
                <div className="stage-desc">Freedom to operate &amp; novelty checked</div>
              </div>
              <div className="cr-funnel-arrow">➔</div>
              <div className="cr-funnel-stage stage-4">
                <div className="stage-step">Stage 4</div>
                <div className="stage-name">Grant Funding Match</div>
                <div className="stage-count">{overview.total_funding_opportunities ?? 0} Programs</div>
                <div className="stage-desc">Active government &amp; foundation grants</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Capability Utilization & Enterprise Service Health */}
      <div className="cr-analytics-dual">
        {/* Capability Radar / Progress Breakdown */}
        <div className="cr-section-card">
          <div className="cr-section-header">
            <h3 className="cr-section-title">
              <span>⚡ Platform Capability Utilization</span>
            </h3>
            <span className="cr-badge">Live Index Depth</span>
          </div>

          <p style={{ fontSize: '13px', color: '#587083', margin: '0 0 16px' }}>
            Empirical index volume and readiness across core intelligence modules.
          </p>

          <div>
            {capUtilization.map((cap) => (
              <div className="cap-util-item" key={cap.capability}>
                <div className="cap-util-header">
                  <span>{cap.capability}</span>
                  <span>{cap.records} records ({cap.score}%)</span>
                </div>
                <div className="cap-util-track">
                  <div className="cap-util-fill" style={{ width: `${Math.max(8, cap.score)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database-Verified Service Health Nodes */}
        <div className="cr-section-card">
          <div className="cr-section-header">
            <h3 className="cr-section-title">
              <span>🛡️ Enterprise Service Health</span>
            </h3>
            <span className="cr-badge" style={{ background: '#e6f9f0', color: '#0e8a51', borderColor: '#a7f3d0' }}>
              Score: {systemHealth.health_score}/100
            </span>
          </div>

          <div className="health-services-grid">
            {(systemHealth?.services || []).map((svc) => (
              <div className="service-health-node" key={svc.name}>
                <div>
                  <div className="node-name">{svc.name}</div>
                  <div className="node-meta">{svc.records} connected records &bull; {svc.latency_ms}ms</div>
                </div>
                <span className={`node-status-badge ${svc.status}`}>
                  ● {(svc.status || 'OPERATIONAL').toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6.5 Research Data Management & Multi-Source Corpus Scaling */}
      <div className="cr-section-card" style={{ border: '1px solid #c2e0f2', background: 'linear-gradient(180deg, #f8fbfe 0%, #ffffff 100%)' }}>
        <div className="cr-section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>📚</span>
            <div>
              <h3 className="cr-section-title" style={{ margin: 0 }}>
                Academic Research Corpus &amp; Ingestion Control
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#587083' }}>
                Multi-source scholarly paper ingestion across OpenAlex, Crossref &amp; Semantic Scholar
              </p>
            </div>
          </div>
          <span className="cr-badge" style={{ background: '#eff6ff', color: '#1e40af', borderColor: '#bfdbfe' }}>
            Target: 5,000–10,000+ Papers
          </span>
        </div>

        {/* Progress Bar towards Target */}
        <div style={{ marginTop: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '13px', fontWeight: 700 }}>
            <span style={{ color: '#073b5c' }}>
              Corpus Capacity: <strong>{corpusStats?.total_papers || overview.total_papers || 0}</strong> / {corpusStats?.target_corpus_size || 10000} Papers
            </span>
            <span style={{ color: '#0b726e' }}>
              {corpusStats?.target_progress_percentage || Math.min(100, Math.round(((overview.total_papers || 0) / 10000) * 100))}% Completed
            </span>
          </div>
          <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${corpusStats?.target_progress_percentage || Math.min(100, Math.round(((overview.total_papers || 0) / 10000) * 100))}%`,
                background: 'linear-gradient(90deg, #0b726e, #2563eb)',
                borderRadius: '6px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Sources Breakdown Grid across 13 connected providers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {[
            { key: 'OpenAlex', label: 'OpenAlex', icon: '🌐' },
            { key: 'Crossref', label: 'Crossref', icon: '🏛️' },
            { key: 'Semantic Scholar', label: 'Semantic Scholar', icon: '🔬' },
            { key: 'CORE', label: 'CORE', icon: '📚' },
            { key: 'arXiv', label: 'arXiv', icon: '📄' },
            { key: 'Europe PMC', label: 'Europe PMC', icon: '🇪🇺' },
            { key: 'PubMed', label: 'PubMed', icon: '🧬' },
            { key: 'DOAJ', label: 'DOAJ', icon: '🔓' },
            { key: 'OpenAIRE', label: 'OpenAIRE', icon: '🌍' },
            { key: 'Zenodo', label: 'Zenodo', icon: '📦' },
            { key: 'bioRxiv', label: 'bioRxiv', icon: '🧪' },
            { key: 'medRxiv', label: 'medRxiv', icon: '🏥' },
            { key: 'BASE', label: 'BASE', icon: '🔍' },
          ].map((src) => {
            const status = (corpusStats?.sources_status?.[src.key] || 'available').toLowerCase()
            const isOk = status === 'available' || status === 'connected'
            const isRate = status === 'rate_limited'
            const isNotConfig = status === 'not_configured'
            const count = corpusStats?.by_source?.[src.key] || corpusStats?.sources?.[src.key] || 0

            return (
              <div key={src.key} style={{ background: '#ffffff', border: '1px solid #dce7ee', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#587083', fontWeight: 600 }}>{src.icon} {src.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#073b5c', marginTop: '2px' }}>
                  {count}
                </div>
                <div style={{ fontSize: '10.5px', color: isOk ? '#10b981' : (isRate ? '#d97706' : '#64748b'), marginTop: '2px', fontWeight: 600 }}>
                  {isOk ? '● Connected' : (isRate ? '⚠ Rate limited' : (isNotConfig ? '○ Not configured' : '● Offline'))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Batch Ingest Trigger Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#f1f6fa', padding: '14px 18px', borderRadius: '10px', border: '1px solid #d5e5f0' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#073b5c' }}>
              Multi-Domain 13-Source Ingestion Trigger
            </div>
            <div style={{ fontSize: '12px', color: '#587083' }}>
              Fetch and store verified peer-reviewed publications and preprints across 18 core academic topics in parallel across all 13 sources.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={batchTarget}
              onChange={(e) => setBatchTarget(Number(e.target.value))}
              disabled={ingestingCorpus}
              style={{
                background: '#ffffff',
                border: '1px solid #c2d8e9',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#073b5c',
              }}
            >
              <option value="50">50 per topic (~900 papers)</option>
              <option value="100">100 per topic (~1,800 papers)</option>
              <option value="200">200 per topic (~3,600 papers)</option>
            </select>
            <button
              type="button"
              className="cr-item-action-btn"
              onClick={handleBatchIngest}
              disabled={ingestingCorpus}
              style={{
                background: 'linear-gradient(135deg, #0b726e, #155094)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: ingestingCorpus ? 'wait' : 'pointer',
                opacity: ingestingCorpus ? 0.7 : 1,
              }}
            >
              {ingestingCorpus ? '⏳ Ingesting Real Papers...' : '🚀 Ingest Multi-Topic Corpus'}
            </button>
          </div>
        </div>

        {ingestStatusMsg && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '12px', fontWeight: 600 }}>
            ℹ️ {ingestStatusMsg}
          </div>
        )}
      </div>

      {/* 7. User Management & Access Control Table */}
      <div className="cr-section-card">
        <div className="cr-section-header">
          <h3 className="cr-section-title">
            <span>👤 User Directory &amp; Governance</span>
          </h3>
          <span className="cr-badge">{usersData.total} Registered Accounts</span>
        </div>

        {/* Search & Role Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <input
            type="text"
            placeholder="Search by name, email, org, domain..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(0)
            }}
            style={{
              background: '#f8fafc',
              border: '1px solid #dce7ee',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '13px',
              width: '320px',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setSelectedRole(r.key)
                  setPage(0)
                }}
                style={{
                  background: selectedRole === r.key ? '#073b5c' : '#f0f4f8',
                  color: selectedRole === r.key ? '#ffffff' : '#587083',
                  border: '1px solid #dce7ee',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #eef3f7', color: '#073b5c' }}>
                <th style={{ padding: '12px 14px' }}>Name &amp; Email</th>
                <th style={{ padding: '12px 14px' }}>Role</th>
                <th style={{ padding: '12px 14px' }}>Organization</th>
                <th style={{ padding: '12px 14px' }}>Research Domain</th>
                <th style={{ padding: '12px 14px' }}>Country</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#587083' }}>
                    Loading user directory...
                  </td>
                </tr>
              ) : usersData.items.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#587083' }}>
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                usersData.items.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#073b5c' }}>{u.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#587083' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: u.role === 'administrator' ? '#fee2e2' : u.role === 'researcher' ? '#e0f2fe' : '#fef3c7',
                          color: u.role === 'administrator' ? '#991b1b' : u.role === 'researcher' ? '#0369a1' : '#92400e',
                        }}
                      >
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#334d5e' }}>{u.organization || 'N/A'}</td>
                    <td style={{ padding: '12px 14px', color: '#334d5e' }}>{u.research_domain || 'General'}</td>
                    <td style={{ padding: '12px 14px', color: '#334d5e' }}>{u.country || 'Global'}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedUserDetail(u)}
                        style={{
                          background: '#f0f7fb',
                          border: '1px solid #cde4f7',
                          color: '#073b5c',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '12px', color: '#587083' }}>
          <span>Showing {usersData.items.length} of {usersData.total} users</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              style={{
                background: page === 0 ? '#f1f5f9' : '#073b5c',
                color: page === 0 ? '#94a3b8' : '#ffffff',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 700,
              }}
            >
              Previous
            </button>
            <button
              disabled={(page + 1) * pageSize >= usersData.total}
              onClick={() => setPage((p) => p + 1)}
              style={{
                background: (page + 1) * pageSize >= usersData.total ? '#f1f5f9' : '#073b5c',
                color: (page + 1) * pageSize >= usersData.total ? '#94a3b8' : '#ffffff',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                cursor: (page + 1) * pageSize >= usersData.total ? 'not-allowed' : 'pointer',
                fontWeight: 700,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 8. Live Activity Stream & Security Governance Events */}
      <div className="cr-analytics-dual">
        {/* Security Alerts */}
        <div className="cr-section-card">
          <div className="cr-section-header">
            <h3 className="cr-section-title">
              <span>🔒 Security &amp; Access Signals</span>
            </h3>
            <span className="cr-badge">{securityAlerts.length} Active Signals</span>
          </div>

          <div>
            {securityAlerts.map((sec) => (
              <div key={sec.id} className={`sec-alert-card ${sec.type}`}>
                <span style={{ fontSize: '18px' }}>{sec.type === 'WARNING' ? '⚠️' : '🛡️'}</span>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block', marginBottom: '2px' }}>{sec.title}</strong>
                  <div style={{ fontSize: '12px', lineHeight: 1.4 }}>{sec.description}</div>
                  <div style={{ fontSize: '10.5px', marginTop: '4px', opacity: 0.8 }}>{sec.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="cr-section-card">
          <div className="cr-section-header">
            <h3 className="cr-section-title">
              <span>📡 Live Platform Stream</span>
            </h3>
            <span className="cr-badge">Real-Time Events</span>
          </div>

          <div className="activity-stream-list">
            {activityStream.map((act) => (
              <div key={act.id} className="activity-item">
                <div>
                  <div className="activity-title">{act.title}</div>
                  <div className="activity-desc">{act.description}</div>
                </div>
                <div className="activity-time">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slide-over User Detail Drawer */}
      {selectedUserDetail && (
        <div className="drawer-backdrop" onClick={() => setSelectedUserDetail(null)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelectedUserDetail(null)}>✕</button>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#073b5c', margin: '0 0 6px' }}>User Governance Profile</h2>
            <p style={{ fontSize: '13px', color: '#587083', margin: '0 0 20px' }}>Comprehensive profile and platform activity audit.</p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#073b5c', marginBottom: '4px' }}>{selectedUserDetail.name}</div>
              <div style={{ fontSize: '13px', color: '#079b91', fontWeight: 600, marginBottom: '8px' }}>{selectedUserDetail.email}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#334d5e' }}>
                <div><strong>Role:</strong> {selectedUserDetail.role}</div>
                <div><strong>Organization:</strong> {selectedUserDetail.organization || 'N/A'}</div>
                <div><strong>Designation:</strong> {selectedUserDetail.designation || 'N/A'}</div>
                <div><strong>Country:</strong> {selectedUserDetail.country || 'Global'}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#073b5c', margin: '0 0 10px' }}>Administrative Actions</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="cr-btn cr-btn-primary"
                onClick={() => {
                  alert(`User ${selectedUserDetail.name} role verified under RBAC.`)
                  setSelectedUserDetail(null)
                }}
              >
                Verify Permissions
              </button>
              <button
                className="cr-btn cr-btn-secondary"
                style={{ background: '#f1f5f9', color: '#073b5c', border: '1px solid #cbd5e1' }}
                onClick={() => setSelectedUserDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {announcementModalOpen && (
        <div className="modal-backdrop" onClick={() => setAnnouncementModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#073b5c', margin: '0 0 6px' }}>📢 Broadcast System Announcement</h2>
            <p style={{ fontSize: '13px', color: '#587083', margin: '0 0 18px' }}>
              Send an administrative notification to all active user bell centers.
            </p>

            {announcementSuccess && (
              <div style={{ background: '#e6f9f0', color: '#0e8a51', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: 700 }}>
                ✓ {announcementSuccess}
              </div>
            )}

            <form onSubmit={handlePublishAnnouncement}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#073b5c', marginBottom: '4px' }}>Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Platform Maintenance / New Intelligence Release"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#073b5c', marginBottom: '4px' }}>Target Audience</label>
                <select
                  value={announcementForm.audience}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, audience: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="all">All Platform Users</option>
                  <option value="researcher">Researchers Only</option>
                  <option value="startup_founder">Startup Founders Only</option>
                  <option value="innovation_manager">Innovation Managers Only</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#073b5c', marginBottom: '4px' }}>Message Body</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Enter detailed announcement message..."
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cr-btn cr-btn-secondary"
                  style={{ background: '#f1f5f9', color: '#073b5c', border: '1px solid #cbd5e1' }}
                  onClick={() => setAnnouncementModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="cr-btn cr-btn-primary">
                  Publish Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
