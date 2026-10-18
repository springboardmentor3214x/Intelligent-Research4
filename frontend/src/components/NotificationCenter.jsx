import { useState, useEffect, useMemo, useContext, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import { notificationService } from '../services/notificationService'
import './NotificationCenter.css'

const CATEGORIES = [
  { key: 'ALL', label: 'All' },
  { key: 'FUNDING', label: 'Funding' },
  { key: 'PATENT', label: 'Patents' },
  { key: 'TECHNOLOGY', label: 'Technology' },
  { key: 'RESEARCH_TREND', label: 'Research' },
  { key: 'COMMERCIALIZATION', label: 'Commercial' },
  { key: 'PLATFORM', label: 'Platform' },
]

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}

export default function NotificationCenter() {
  const { token, user } = useContext(AuthContext)
  const navigate = useNavigate()
  const dropdownRef = useRef(null)

  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'preferences'
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Preferences state
  const [preferences, setPreferences] = useState({
    funding_enabled: true,
    patent_enabled: true,
    technology_enabled: true,
    research_enabled: true,
    commercialization_enabled: true,
    platform_enabled: true,
  })
  const [prefLoading, setPrefLoading] = useState(false)
  const [prefFeedback, setPrefFeedback] = useState(null)

  const loadNotifications = async () => {
    if (!token) return
    try {
      setLoading(true)
      setError('')
      const res = await notificationService.getNotifications(
        { category: activeCategory },
        token
      )
      setNotifications(res?.items || [])
      setUnreadCount(res?.unread_count || 0)
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setError('Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  const loadPreferences = async () => {
    if (!token) return
    try {
      setPrefLoading(true)
      const data = await notificationService.getPreferences(token)
      if (data) {
        setPreferences({
          funding_enabled: data.funding_enabled ?? true,
          patent_enabled: data.patent_enabled ?? true,
          technology_enabled: data.technology_enabled ?? true,
          research_enabled: data.research_enabled ?? true,
          commercialization_enabled: data.commercialization_enabled ?? true,
          platform_enabled: data.platform_enabled ?? true,
        })
      }
    } catch (err) {
      console.error('Failed to load preferences:', err)
    } finally {
      setPrefLoading(false)
    }
  }

  useEffect(() => {
    if (user && token) {
      loadNotifications()
    }
  }, [user, token, activeCategory])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setViewMode('list')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleOpen = () => {
    if (!isOpen) {
      loadNotifications()
      loadPreferences()
    }
    setIsOpen(!isOpen)
  }

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation()
    try {
      await notificationService.markAsRead(id, token)
      setNotifications(prev =>
        prev.map(item => (item.id === id ? { ...item, is_read: true } : item))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark read:', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead(token)
      setNotifications(prev => prev.map(item => ({ ...item, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id)
    }
    setIsOpen(false)

    // Check target_url or resolve route dynamically
    if (notif.target_url && notif.target_url.startsWith('/')) {
      navigate(notif.target_url)
      return
    }

    const type = (notif.notification_type || '').toUpperCase()
    if (type === 'FUNDING') {
      navigate('/funding')
    } else if (type === 'PATENT') {
      navigate('/patents')
    } else if (type === 'TECHNOLOGY') {
      navigate('/technologies')
    } else if (type === 'RESEARCH_TREND' || type === 'RESEARCH') {
      navigate('/research-papers')
    } else if (type === 'COMMERCIALIZATION') {
      navigate('/commercialization')
    } else {
      navigate('/dashboard')
    }
  }

  const handlePreferenceToggle = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] }
    setPreferences(updated)
    setPrefFeedback(null)
    try {
      await notificationService.updatePreferences(updated, token)
      setPrefFeedback({ type: 'success', msg: 'Preferences updated successfully.' })
      setTimeout(() => setPrefFeedback(null), 2500)
    } catch (err) {
      console.error('Failed to save preference:', err)
      setPrefFeedback({ type: 'error', msg: 'Failed to update preferences.' })
      // rollback
      setPreferences(preferences)
    }
  }

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        type="button"
        className="notification-bell"
        onClick={handleToggleOpen}
        aria-label="Notification Center"
        aria-expanded={isOpen}
      >
        <svg
          className="bell-icon-svg"
          viewBox="0 0 24 24"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <div className="notification-header-title">
              <h3>Notifications</h3>
              {unreadCount > 0 && (
                <span className="notification-count-tag">{unreadCount} unread</span>
              )}
            </div>

            <div className="notification-header-actions">
              {viewMode === 'list' ? (
                <>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="mark-all-btn"
                      onClick={handleMarkAllRead}
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn"
                    title="Notification Preferences"
                    onClick={() => setViewMode('preferences')}
                  >
                    ⚙️
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="mark-all-btn"
                  onClick={() => setViewMode('list')}
                >
                  ← Back to Alerts
                </button>
              )}
            </div>
          </div>

          {viewMode === 'list' && (
            <>
              <div className="notification-tabs">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    className={`notif-tab ${activeCategory === cat.key ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat.key)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="notification-list">
                {loading && (
                  <div className="notif-state-view">
                    <div className="notif-state-icon">⚡</div>
                    <strong>Loading notifications...</strong>
                    <p>Connecting to platform intelligence.</p>
                  </div>
                )}

                {!loading && error && (
                  <div className="notif-state-view">
                    <div className="notif-state-icon">⚠️</div>
                    <strong>Failed to load</strong>
                    <p>{error}</p>
                  </div>
                )}

                {!loading && !error && notifications.length === 0 && (
                  <div className="notif-state-view">
                    <div className="notif-state-icon">🔔</div>
                    <strong>You're all caught up</strong>
                    <p>
                      {activeCategory === 'ALL'
                        ? 'No new notifications right now.'
                        : `No ${activeCategory.toLowerCase()} notifications found.`}
                    </p>
                  </div>
                )}

                {!loading &&
                  !error &&
                  notifications.map(item => (
                    <div
                      key={item.id}
                      className={`notification-item ${!item.is_read ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(item)}
                    >
                      <div className="notif-item-top">
                        <span
                          className={`notif-category-badge ${(item.notification_type || 'platform').toLowerCase()}`}
                        >
                          {item.notification_type || 'ALERT'}
                        </span>
                        <span className="notif-time">{formatTimeAgo(item.created_at)}</span>
                      </div>

                      <div className="notif-title">{item.title}</div>
                      <p className="notif-message">{item.message}</p>
                    </div>
                  ))}
              </div>
            </>
          )}

          {viewMode === 'preferences' && (
            <div className="notification-preferences-panel">
              <div className="pref-row">
                <div className="pref-info">
                  <strong>Funding Alerts</strong>
                  <small>Matching grant calls and deadlines</small>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.funding_enabled}
                    onChange={() => handlePreferenceToggle('funding_enabled')}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div className="pref-row">
                <div className="pref-info">
                  <strong>Patent Alerts</strong>
                  <small>New filings and competitor assignments</small>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.patent_enabled}
                    onChange={() => handlePreferenceToggle('patent_enabled')}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div className="pref-row">
                <div className="pref-info">
                  <strong>Technology Alerts</strong>
                  <small>Emerging status and growth momentum</small>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.technology_enabled}
                    onChange={() => handlePreferenceToggle('technology_enabled')}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div className="pref-row">
                <div className="pref-info">
                  <strong>Research Trend Alerts</strong>
                  <small>Domain trend velocity and publication activity</small>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.research_enabled}
                    onChange={() => handlePreferenceToggle('research_enabled')}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div className="pref-row">
                <div className="pref-info">
                  <strong>Commercialization Alerts</strong>
                  <small>Licensing and startup opportunity signals</small>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.commercialization_enabled}
                    onChange={() => handlePreferenceToggle('commercialization_enabled')}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div className="pref-row">
                <div className="pref-info">
                  <strong>Platform Alerts</strong>
                  <small>System updates and administrative notices</small>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={preferences.platform_enabled}
                    onChange={() => handlePreferenceToggle('platform_enabled')}
                  />
                  <span className="slider" />
                </label>
              </div>

              {prefFeedback && (
                <div className={`pref-feedback ${prefFeedback.type}`}>
                  {prefFeedback.msg}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
