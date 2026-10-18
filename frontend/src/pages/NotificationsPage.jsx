import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import { notificationService } from '../services/notificationService'
import './NotificationsPage.css'

const CATEGORIES = [
  { key: 'ALL', label: 'All Alerts' },
  { key: 'FUNDING', label: 'Funding' },
  { key: 'PATENT', label: 'Patents' },
  { key: 'TECHNOLOGY', label: 'Technology' },
  { key: 'RESEARCH_TREND', label: 'Research' },
  { key: 'COMMERCIALIZATION', label: 'Commercial' },
  { key: 'PLATFORM', label: 'Platform' },
]

export default function NotificationsPage() {
  const { token, user } = useContext(AuthContext)
  const navigate = useNavigate()

  const [activeCategory, setActiveCategory] = useState('ALL')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Preferences panel state
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState({
    funding_enabled: true,
    patent_enabled: true,
    technology_enabled: true,
    research_enabled: true,
    commercialization_enabled: true,
    platform_enabled: true,
  })
  const [prefFeedback, setPrefFeedback] = useState('')

  const loadData = async () => {
    if (!token) return
    try {
      setLoading(true)
      setError('')
      const params = {
        category: activeCategory,
        unread_only: unreadOnly || undefined,
        limit: 100,
      }
      const res = await notificationService.getNotifications(params, token)
      setNotifications(res?.items || [])
      setUnreadCount(res?.unread_count || 0)

      const prefRes = await notificationService.getPreferences(token)
      if (prefRes) {
        setPreferences({
          funding_enabled: prefRes.funding_enabled ?? true,
          patent_enabled: prefRes.patent_enabled ?? true,
          technology_enabled: prefRes.technology_enabled ?? true,
          research_enabled: prefRes.research_enabled ?? true,
          commercialization_enabled: prefRes.commercialization_enabled ?? true,
          platform_enabled: prefRes.platform_enabled ?? true,
        })
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setError(err.message || 'Unable to retrieve notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token, activeCategory, unreadOnly])

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation()
    try {
      await notificationService.markAsRead(id, token)
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark read:', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(token)
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  const handlePrefToggle = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] }
    setPreferences(updated)
    setPrefFeedback('')
    try {
      await notificationService.updatePreferences(updated, token)
      setPrefFeedback('Notification preferences updated successfully.')
      setTimeout(() => setPrefFeedback(''), 3000)
    } catch (err) {
      console.error('Failed to save preferences:', err)
      setPrefFeedback('Failed to update preferences.')
      setPreferences(preferences)
    }
  }

  const handleNavigate = async (notif) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id)
    }
    if (notif.target_url && notif.target_url.startsWith('/')) {
      navigate(notif.target_url)
      return
    }
    const type = (notif.notification_type || '').toUpperCase()
    if (type === 'FUNDING') navigate('/funding')
    else if (type === 'PATENT') navigate('/patents')
    else if (type === 'TECHNOLOGY') navigate('/technologies')
    else if (type === 'RESEARCH_TREND' || type === 'RESEARCH') navigate('/research-papers')
    else if (type === 'COMMERCIALIZATION') navigate('/commercialization')
    else navigate('/dashboard')
  }

  // Filter by search
  const filteredNotifications = notifications.filter((n) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.message && n.message.toLowerCase().includes(q)) ||
      (n.related_module && n.related_module.toLowerCase().includes(q))
    )
  })

  return (
    <div className="notif-page-container">
      <div className="notif-page-header">
        <div>
          <span className="eyebrow">ALERT &amp; INTELLIGENCE DISPATCH</span>
          <h1>Notifications Center</h1>
          <p className="subtitle">
            Stay updated with empirical grant opportunities, patent filings, research breakthroughs, and commercialization signals.
          </p>
        </div>
        <div className="notif-header-actions">
          {unreadCount > 0 && (
            <button className="btn-mark-all" onClick={handleMarkAllRead}>
              ✓ Mark All as Read ({unreadCount})
            </button>
          )}
          <button
            className="btn-toggle-pref"
            onClick={() => setShowPreferences(!showPreferences)}
          >
            ⚙️ {showPreferences ? 'Hide Preferences' : 'Preferences'}
          </button>
        </div>
      </div>

      {/* Preferences Section */}
      {showPreferences && (
        <div className="notif-pref-box">
          <h3>Notification Preferences</h3>
          <p className="muted">Configure which intelligence alert categories you wish to receive in real-time.</p>
          <div className="pref-grid">
            <label className="pref-item">
              <input
                type="checkbox"
                checked={preferences.funding_enabled}
                onChange={() => handlePrefToggle('funding_enabled')}
              />
              <span>🎯 Funding &amp; Grant Alerts</span>
            </label>
            <label className="pref-item">
              <input
                type="checkbox"
                checked={preferences.patent_enabled}
                onChange={() => handlePrefToggle('patent_enabled')}
              />
              <span>📜 Patent Filings &amp; Prior-Art</span>
            </label>
            <label className="pref-item">
              <input
                type="checkbox"
                checked={preferences.technology_enabled}
                onChange={() => handlePrefToggle('technology_enabled')}
              />
              <span>⚙ Technology Intelligence</span>
            </label>
            <label className="pref-item">
              <input
                type="checkbox"
                checked={preferences.research_enabled}
                onChange={() => handlePrefToggle('research_enabled')}
              />
              <span>🔬 Research Trends &amp; Papers</span>
            </label>
            <label className="pref-item">
              <input
                type="checkbox"
                checked={preferences.commercialization_enabled}
                onChange={() => handlePrefToggle('commercialization_enabled')}
              />
              <span>💡 Commercialization Pathways</span>
            </label>
            <label className="pref-item">
              <input
                type="checkbox"
                checked={preferences.platform_enabled}
                onChange={() => handlePrefToggle('platform_enabled')}
              />
              <span>🔔 System &amp; Platform Broadcasts</span>
            </label>
          </div>
          {prefFeedback && <div className="pref-alert">{prefFeedback}</div>}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="notif-filter-bar">
        <div className="notif-category-tabs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={`cat-btn ${activeCategory === cat.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="notif-search-controls">
          <label className="unread-checkbox">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            <span>Unread Only</span>
          </label>
          <input
            type="text"
            className="notif-search-input"
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="notif-main-card">
        {loading ? (
          <div className="notif-loading">
            <div className="spinner"></div>
            <p>Loading intelligence notifications...</p>
          </div>
        ) : error ? (
          <div className="notif-error">
            <p>⚠️ {error}</p>
            <button onClick={loadData}>Retry</button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notif-empty-state">
            <span className="empty-icon">🔔</span>
            <h3>No notifications to display</h3>
            <p className="muted">
              {unreadOnly
                ? 'You have no unread notifications.'
                : 'No alerts found for the selected category filter.'}
            </p>
          </div>
        ) : (
          <div className="notif-items-container">
            {filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`notif-card ${!item.is_read ? 'unread-card' : ''}`}
                onClick={() => handleNavigate(item)}
              >
                <div className="notif-card-header">
                  <span className={`notif-pill pill-${(item.notification_type || 'platform').toLowerCase()}`}>
                    {item.notification_type || 'SYSTEM'}
                  </span>
                  <span className="notif-date">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
                <h3 className="notif-item-title">{item.title}</h3>
                <p className="notif-item-msg">{item.message}</p>
                <div className="notif-card-footer">
                  <span className="notif-module">Module: {item.related_module || 'Platform'}</span>
                  {!item.is_read && (
                    <button
                      className="btn-mark-single"
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
