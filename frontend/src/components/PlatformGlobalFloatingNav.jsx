import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './PlatformGlobalFloatingNav.css'

// 8 Core Pillars of the Complete Research & Technology Intelligence Platform
// 360° / 8 = 45° increments in a true symmetrical circle
export const platformPillars = [
  {
    id: 'patents',
    title: 'Patent Landscape',
    shortLabel: 'Patents',
    description: '3D Semantic Landscape, Prior Art & White Space',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    route: '/patents',
    angle: 270, // 12 o'clock (Top)
  },
  {
    id: 'tech_intel',
    title: 'Tech Intelligence',
    shortLabel: 'Tech Intel',
    description: 'Cross-Domain 3D Ecosystem & Horizon Scanning',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    route: '/technologies',
    angle: 315, // ~1:30 o'clock (Top-Right)
  },
  {
    id: 'maturity',
    title: 'Maturity (S-Curve)',
    shortLabel: 'S-Curve',
    description: 'Empirical Stage Classification & TRL Milestones',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 19c4 0 5-14 9-14s5 14 9 14" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
    route: '/technologies/maturity',
    angle: 0, // 3 o'clock (Right)
  },
  {
    id: 'adoption',
    title: 'Market Adoption',
    shortLabel: 'Adoption',
    description: 'Industrial Commercialization Velocity & Growth',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 7h6v6" />
        <path d="M22 7l-8.5 8.5-4-4L2 19" />
        <path d="M20 17v4H4v-4" />
      </svg>
    ),
    route: '/technologies/adoption',
    angle: 45, // ~4:30 o'clock (Bottom-Right)
  },
  {
    id: 'innovation',
    title: 'Innovation Scoring',
    shortLabel: 'Innovation',
    description: 'Multi-Factor Breakthrough Index & Scoring',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z" />
        <line x1="12" y1="6" x2="12" y2="10" />
      </svg>
    ),
    route: '/innovation',
    angle: 90, // 6 o'clock (Bottom)
  },
  {
    id: 'trends',
    title: 'Growth Trends',
    shortLabel: 'Trends',
    description: 'Longitudinal Trajectory & 5-Year Forecast',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <path d="M3 20h18" />
      </svg>
    ),
    route: '/technologies/trends',
    angle: 135, // ~7:30 o'clock (Bottom-Left)
  },
  {
    id: 'funding',
    title: 'Funding Intelligence',
    shortLabel: 'Funding',
    description: 'Venture Capital, Grants & Investor Analytics',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <line x1="12" y1="6" x2="12" y2="8" />
        <line x1="12" y1="16" x2="12" y2="18" />
      </svg>
    ),
    route: '/funding',
    angle: 180, // 9 o'clock (Left)
  },
  {
    id: 'research',
    title: 'Research Papers',
    shortLabel: 'Papers',
    description: 'Academic Citations, OpenAlex & Literature',
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    route: '/research-papers',
    angle: 225, // ~10:30 o'clock (Top-Left)
  },
]

const STORAGE_KEY = 'ri_platform_floating_nav_pos'
const DRAG_THRESHOLD = 6
const BUTTON_RADIUS = 32
const RADIAL_RADIUS = 124
const EDGE_MARGIN = 16

export default function PlatformGlobalFloatingNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)

  // Floating button position in viewport pixels
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      const initX = Math.max(EDGE_MARGIN, window.innerWidth - 110)
      const initY = Math.max(EDGE_MARGIN, window.innerHeight - 110)
      return { x: initX, y: initY }
    }
    return { x: 300, y: 500 }
  })

  const containerRef = useRef(null)
  const dragStartRef = useRef({
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0,
    hasMoved: false,
    activePointerId: null,
  })

  const clampPosition = useCallback((x, y) => {
    const minMargin = RADIAL_RADIUS + BUTTON_RADIUS + EDGE_MARGIN
    const maxX = window.innerWidth - minMargin
    const maxY = window.innerHeight - minMargin
    const minX = minMargin
    const minY = minMargin

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    }
  }, [])

  useEffect(() => {
    function handleResize() {
      setPosition((prev) => clampPosition(prev.x, prev.y))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [clampPosition])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('pointerdown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handlePointerDown = (e) => {
    if (e.button !== 0) return
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: position.x,
      startY: position.y,
      hasMoved: false,
      activePointerId: e.pointerId,
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handlePointerMove = (e) => {
    if (dragStartRef.current.activePointerId !== e.pointerId) return
    const deltaX = e.clientX - dragStartRef.current.pointerX
    const deltaY = e.clientY - dragStartRef.current.pointerY
    const dist = Math.hypot(deltaX, deltaY)

    if (dist > DRAG_THRESHOLD) {
      if (!dragStartRef.current.hasMoved) {
        dragStartRef.current.hasMoved = true
        setIsDragging(true)
      }
      const rawX = dragStartRef.current.startX + deltaX
      const rawY = dragStartRef.current.startY + deltaY
      setPosition(clampPosition(rawX, rawY))
    }
  }

  const handlePointerUp = (e) => {
    if (dragStartRef.current.activePointerId !== e.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    const wasDragging = dragStartRef.current.hasMoved
    dragStartRef.current.activePointerId = null

    if (wasDragging) {
      setIsDragging(false)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
      } catch {
        // ignore
      }
    } else {
      setIsOpen((prev) => !prev)
    }
  }

  const handlePointerCancel = (e) => {
    if (dragStartRef.current.activePointerId === e.pointerId) {
      dragStartRef.current.activePointerId = null
      setIsDragging(false)
    }
  }

  const handleItemClick = (route, e) => {
    e.stopPropagation()
    setIsOpen(false)
    if (location.pathname !== route) {
      navigate(route)
    }
  }

  const getItemOffset = (angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180
    const offsetX = Math.round(Math.cos(rad) * RADIAL_RADIUS * 100) / 100
    const offsetY = Math.round(Math.sin(rad) * RADIAL_RADIUS * 100) / 100
    return { offsetX, offsetY }
  }

  return (
    <div
      ref={containerRef}
      className={`platform-floating-nav-container ${isOpen ? 'is-open' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      aria-label="Platform Global Navigation Hub"
    >
      {/* Orbital Guide Ring */}
      <div
        className={`platform-radial-ring-guide ${isOpen ? 'visible' : ''}`}
        style={{ width: `${RADIAL_RADIUS * 2}px`, height: `${RADIAL_RADIUS * 2}px` }}
      />

      {/* Radial Items Layer with continuous orbital motion */}
      <div className={`platform-radial-layer ${isOpen ? 'visible' : ''}`} aria-hidden={!isOpen}>
        {platformPillars.map((item, index) => {
          const { offsetX, offsetY } = getItemOffset(item.angle)
          const isCurrent = location.pathname === item.route

          return (
            <button
              key={item.id}
              type="button"
              className={`platform-radial-btn ${isCurrent ? 'current-route' : ''}`}
              style={{
                '--offset-x': `${offsetX}px`,
                '--offset-y': `${offsetY}px`,
                '--item-delay': `${index * 25}ms`,
              }}
              onClick={(e) => handleItemClick(item.route, e)}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
              aria-label={`${item.title}: ${item.description}`}
              tabIndex={isOpen ? 0 : -1}
            >
              <div className="platform-radial-btn-inner">
                <span className="platform-radial-icon">{item.icon}</span>
                <span className="platform-radial-tag">{item.shortLabel}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Dynamic Hover Tooltip Card */}
      {isOpen && hoveredItem && (
        <div className="platform-hover-tooltip" role="tooltip">
          <strong>{hoveredItem.title}</strong>
          <small>{hoveredItem.description}</small>
        </div>
      )}

      {/* Floating Center Trigger Button */}
      <button
        type="button"
        className={`platform-center-trigger ${isOpen ? 'active-open' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label={isOpen ? 'Close Platform Navigation Menu' : 'Open All Features Navigation Menu'}
        aria-expanded={isOpen}
      >
        <div className="platform-center-inner">
          <div className="platform-center-flipper">
            {/* Main AI Orb / Explore Compass Icon */}
            <svg
              className="platform-center-icon-main"
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
            {/* Close X Icon */}
            <svg
              className="platform-center-icon-close"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <span className="platform-center-pulse" />
        </div>
      </button>
    </div>
  )
}
