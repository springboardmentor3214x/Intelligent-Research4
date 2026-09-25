import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './TechIntelligenceFloatingNav.css'

// 5 Core Technology Intelligence Navigation Destinations distributed uniformly in a true mathematical circle
// 360° / 5 = 72° per step.
// Starting from exact Top (12 o'clock / -90° or 270°):
// 1. Top (270°): Maturity & S-Curve
// 2. Top-Right (342°): Market Adoption
// 3. Bottom-Right (54°): Innovation Scoring
// 4. Bottom-Left (126°): Growth Trends
// 5. Top-Left (198°): Overview & Landscape
export const techIntelligenceNavigation = [
  {
    id: 'maturity',
    title: 'Maturity (S-Curve)',
    shortLabel: 'S-Curve',
    description: 'Empirical Maturity Stage & TRL Level',
    // S-Curve Sigmoid Wave Icon
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 19c4 0 5-14 9-14s5 14 9 14" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    ),
    route: '/technologies/maturity',
    angle: 270, // 12 o'clock (Top)
  },
  {
    id: 'adoption',
    title: 'Market Adoption',
    shortLabel: 'Adoption',
    description: 'Commercial Velocity & Market Diffusion',
    // Market Growth / Cart / Velocity Icon
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 7h6v6" />
        <path d="M22 7l-8.5 8.5-4-4L2 19" />
        <path d="M20 17v4H4v-4" />
      </svg>
    ),
    route: '/technologies/adoption',
    angle: 342, // ~2:24 o'clock (Top-Right: 270 + 72)
  },
  {
    id: 'innovation',
    title: 'Innovation Score',
    shortLabel: 'Innovation',
    description: 'Patent Quality & Breakthrough Index',
    // Lightbulb / Breakthrough Sparkle Icon
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z" />
        <line x1="12" y1="6" x2="12" y2="10" />
      </svg>
    ),
    route: '/innovation',
    angle: 54, // ~4:48 o'clock (Bottom-Right: 342 + 72 - 360)
  },
  {
    id: 'growth',
    title: 'Growth Trends',
    shortLabel: 'Trends',
    description: 'Historical Trajectory & 5-Year Forecast',
    // Analytics Bar Chart & Trend Arrow Icon
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <path d="M3 20h18" />
      </svg>
    ),
    route: '/technologies/trends',
    angle: 126, // ~7:12 o'clock (Bottom-Left: 54 + 72)
  },
  {
    id: 'overview',
    title: 'Tech Landscape',
    shortLabel: 'Landscape',
    description: 'Cross-Domain 3D Ecosystem Map',
    // 3D Radar / Multi-Layer Cube / Landscape Map Icon
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
    route: '/technologies',
    angle: 198, // ~9:36 o'clock (Top-Left: 126 + 72)
  },
]

const STORAGE_KEY = 'ri_tech_floating_nav_pos'
const DRAG_THRESHOLD = 6 // pixels to distinguish click from drag
const BUTTON_RADIUS = 30 // half of center button size (60px)
const RADIAL_RADIUS = 100 // Clean proportional radius ensuring perfect non-overlapping circle
const EDGE_MARGIN = 16

export default function TechIntelligenceFloatingNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)

  // Floating button position (x, y coordinates in viewport pixels)
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
    // Default: bottom-right
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

  // Ensure button remains safely within viewport bounds on resize or load
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

  // Window resize handler to reclamp position
  useEffect(() => {
    function handleResize() {
      setPosition((prev) => {
        const clamped = clampPosition(prev.x, prev.y)
        return clamped
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [clampPosition])

  // Close radial menu when clicking outside
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

  // Dragging pointer event handlers
  const handlePointerDown = (e) => {
    // Only primary button
    if (e.button !== 0) return

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: position.x,
      startY: position.y,
      hasMoved: false,
      activePointerId: e.pointerId,
    }

    // Capture pointer to track dragging seamlessly outside the button
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
      const clamped = clampPosition(rawX, rawY)
      setPosition(clamped)
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
      // Save last position to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(position))
      } catch {
        // ignore
      }
    } else {
      // It's a genuine click! Toggle open/close
      setIsOpen((prev) => !prev)
    }
  }

  const handlePointerCancel = (e) => {
    if (dragStartRef.current.activePointerId === e.pointerId) {
      dragStartRef.current.activePointerId = null
      setIsDragging(false)
    }
  }

  // Handle radial item navigation
  const handleItemClick = (route, e) => {
    e.stopPropagation()
    setIsOpen(false)
    if (location.pathname !== route) {
      navigate(route)
    }
  }

  // Exact Trigonometric radial coordinates
  const getItemOffset = (angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180
    const offsetX = Math.round(Math.cos(rad) * RADIAL_RADIUS * 100) / 100
    const offsetY = Math.round(Math.sin(rad) * RADIAL_RADIUS * 100) / 100
    return { offsetX, offsetY }
  }

  return (
    <div
      ref={containerRef}
      className={`tech-floating-nav-container ${isOpen ? 'is-open' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      aria-label="Technology Intelligence Floating Navigation Hub"
    >
      {/* Visual Circle Guide Outline when open */}
      <div className={`radial-ring-guide ${isOpen ? 'visible' : ''}`} style={{ width: `${RADIAL_RADIUS * 2}px`, height: `${RADIAL_RADIUS * 2}px` }} />

      {/* Radial Items Layer */}
      <div className={`radial-menu-layer ${isOpen ? 'visible' : ''}`} aria-hidden={!isOpen}>
        {techIntelligenceNavigation.map((item, index) => {
          const { offsetX, offsetY } = getItemOffset(item.angle)
          const isCurrent = location.pathname === item.route

          return (
            <button
              key={item.id}
              type="button"
              className={`radial-item-btn ${isCurrent ? 'current-route' : ''}`}
              style={{
                '--offset-x': `${offsetX}px`,
                '--offset-y': `${offsetY}px`,
                '--item-delay': `${index * 30}ms`,
              }}
              onClick={(e) => handleItemClick(item.route, e)}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
              aria-label={`${item.title}: ${item.description}`}
              tabIndex={isOpen ? 0 : -1}
            >
              <div className="radial-item-inner">
                <span className="radial-item-icon">{item.icon}</span>
                <span className="radial-item-tag">{item.shortLabel}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Dynamic Hover Tooltip Card */}
      {isOpen && hoveredItem && (
        <div className="radial-hover-tooltip animated-fade" role="tooltip">
          <strong>{hoveredItem.title}</strong>
          <small>{hoveredItem.description}</small>
        </div>
      )}

      {/* Floating Center Trigger Button (Movable & Draggable) */}
      <button
        type="button"
        className={`center-trigger-btn ${isOpen ? 'active-open' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label={isOpen ? 'Close Technology Intelligence menu' : 'Open Technology Intelligence navigation menu'}
        aria-expanded={isOpen}
      >
        <div className="center-btn-inner">
          {/* Animated Icon: Tech lightning pulse when closed, clean 'X' when open */}
          <div className="center-icon-flipper">
            <svg
              className="tech-main-icon"
              viewBox="0 0 24 24"
              width="26"
              height="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <svg
              className="tech-close-icon"
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
          <span className="center-badge-pulse" />
        </div>
      </button>
    </div>
  )
}
