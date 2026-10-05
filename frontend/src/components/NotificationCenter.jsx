import { useEffect, useMemo, useState } from 'react'
import { notificationService } from '../services/notificationService'
import './NotificationCenter.css'

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'FUNDING', label: 'Funding' },
  { key: 'PATENT', label: 'Patents' },
  { key: 'TECHNOLOGY', label: 'Technology' },
  { key: 'RESEARCH_TREND', label: 'Research' },
  { key: 'COMMERCIALIZATION', label: 'Commercialization' },
]

function getNotificationType(notification) {
  return (
    notification.notification_type ||
    notification.type ||
    'PLATFORM'
  ).toUpperCase()
}

function getNotificationId(notification) {
  return notification.id || notification.notification_id
}

function getTimeAgo(dateValue) {
  if (!dateValue) return ''

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  const days = Math.floor(hours / 24)

  return `${days} day${days === 1 ? '' : 's'} ago`
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadNotifications = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await notificationService.getNotifications()

      const items = Array.isArray(response)
        ? response
        : response?.notifications || response?.data || []

      setNotifications(items)
    } catch (err) {
      console.error('Failed to load notifications:', err)
      setError('Unable to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.is_read &&
          notification.read !== true &&
          notification.read_status !== 'READ'
      ).length,
    [notifications]
  )

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'ALL') {
      return notifications
    }

    return notifications.filter(
      (notification) =>
        getNotificationType(notification) === activeFilter
    )
  }, [notifications, activeFilter])

  const handleMarkAsRead = async (notification) => {
    const id = getNotificationId(notification)

    if (!id) return

    try {
      await notificationService.markAsRead(id)

      setNotifications((current) =>
        current.map((item) =>
          getNotificationId(item) === id
            ? {
                ...item,
                is_read: true,
                read: true,
              }
            : item
        )
      )
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
          read: true,
        }))
      )
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }

  const handleNotificationClick = async (notification) => {
    await handleMarkAsRead(notification)

    const moduleName =
      notification.related_module ||
      notification.module ||
      ''

    const recordId =
      notification.related_record_id ||
      notification.record_id

    if (!recordId) return

    const routes = {
      FUNDING: `/funding/${recordId}`,
      PATENT: `/patents/${recordId}`,
      TECHNOLOGY: `/technology/${recordId}`,
      RESEARCH_TREND: `/research/${recordId}`,
      COMMERCIALIZATION: `/commercialization/${recordId}`,
    }

    const type = getNotificationType(notification)

    if (routes[type]) {
      window.location.href = routes[type]
      return
    }

    if (moduleName) {
      console.log(
        `Notification belongs to module: ${moduleName}`
      )
    }
  }

  return (
    <div className="notification-center">
      <button
        type="button"
        className="notification-bell"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
      >
        <span className="bell-icon">🔔</span>

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-header">
            <div>
              <h3>Notifications</h3>
              <span>
                {unreadCount} unread
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-all-button"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-filters">
            {FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={
                  activeFilter === filter.key
                    ? 'filter-button active'
                    : 'filter-button'
                }
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="notification-list">
            {loading && (
              <div className="notification-state">
                Loading notifications...
              </div>
            )}

            {!loading && error && (
              <div className="notification-state error">
                {error}
              </div>
            )}

            {!loading &&
              !error &&
              filteredNotifications.length === 0 && (
                <div className="notification-state">
                  <div className="empty-icon">🔔</div>
                  <strong>No notifications</strong>
                  <span>
                    You don't have any notifications in this category.
                  </span>
                </div>
              )}

            {!loading &&
              !error &&
              filteredNotifications.map((notification) => {
                const id = getNotificationId(notification)

                const isRead =
                  notification.is_read ||
                  notification.read === true ||
                  notification.read_status === 'READ'

                return (
                  <button
                    key={id}
                    type="button"
                    className={
                      isRead
                        ? 'notification-item read'
                        : 'notification-item unread'
                    }
                    onClick={() =>
                      handleNotificationClick(notification)
                    }
                  >
                    <div className="notification-item-top">
                      <span
                        className={`notification-type ${getNotificationType(
                          notification
                        ).toLowerCase()}`}
                      >
                        {getNotificationType(notification)}
                      </span>

                      {!isRead && (
                        <span className="unread-dot" />
                      )}
                    </div>

                    <strong>
                      {notification.title ||
                        'New platform notification'}
                    </strong>

                    <p>
                      {notification.message ||
                        notification.description ||
                        'You have a new update.'}
                    </p>

                    <span className="notification-time">
                      {getTimeAgo(
                        notification.created_at ||
                          notification.createdAt
                      )}
                    </span>
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}