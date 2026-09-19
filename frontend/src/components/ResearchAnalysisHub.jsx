import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './ResearchAnalysisHub.css';

/**
 * Circular AI Research Analysis Hub
 * 
 * Features:
 * - Mathematical orbit distribution: x = r * cos(θ), y = r * sin(θ)
 * - Draggable center handle with pointer events and boundary clamping
 * - 5px movement threshold (distinguishes tap/click vs drag)
 * - LocalStorage persistence for position
 * - Smooth scroll to section + temporary highlight animation
 * - Active section detection with IntersectionObserver
 * - Tooltip on hover, Esc to close, outside click to close
 * - Academic navy/teal design system
 */

const STORAGE_KEY = 'research-analysis-hub-position';

export default function ResearchAnalysisHub({
  sections = [],
  containerRef = null,
  onNavigate = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [hoveredNode, setHoveredNode] = useState(null);
  
  // Position state (null indicates default calculation)
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return null;
  });

  const hubRef = useRef(null);
  const centerBtnRef = useRef(null);

  // Drag tracking refs
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
    hasMovedPastThreshold: false,
    pointerId: null
  });

  // Dynamic radius based on viewport (increased to give generous breathing room)
  const [radius, setRadius] = useState(165);

  useEffect(() => {
    const updateRadius = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setRadius(115);
      } else if (width < 1024) {
        setRadius(140);
      } else {
        setRadius(170);
      }
    };
    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  // Filter only existing sections
  const validSections = useMemo(() => {
    return sections.filter((s) => s && s.id && s.label);
  }, [sections]);

  // Establish default position if none in localStorage
  useEffect(() => {
    if (!position) {
      // Default: bottom right floating corner
      const defaultX = Math.max(20, window.innerWidth - 110);
      const defaultY = Math.max(20, window.innerHeight - 120);
      setPosition({ x: defaultX, y: defaultY });
    }
  }, [position]);

  // Clamping helper
  const clampPosition = useCallback((x, y) => {
    const margin = 24;
    const centerSize = 60;
    const maxX = window.innerWidth - centerSize - margin;
    const minX = margin;
    const maxY = window.innerHeight - centerSize - margin;
    const minY = margin;

    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  }, []);

  // Save to localStorage when position changes
  const updatePosition = useCallback((newPos) => {
    const clamped = clampPosition(newPos.x, newPos.y);
    setPosition(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
    } catch {
      // Ignore quota errors
    }
  }, [clampPosition]);

  // Pointer Drag Handlers
  const handlePointerDown = (e) => {
    // Only left click or primary touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const currentX = position ? position.x : window.innerWidth - 100;
    const currentY = position ? position.y : window.innerHeight - 100;

    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: currentX,
      startPosY: currentY,
      hasMovedPastThreshold: false,
      pointerId: e.pointerId
    };

    if (centerBtnRef.current) {
      centerBtnRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.isDragging) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const dist = Math.hypot(dx, dy);

    if (dist >= 5) {
      dragRef.current.hasMovedPastThreshold = true;
    }

    if (dragRef.current.hasMovedPastThreshold) {
      const newX = dragRef.current.startPosX + dx;
      const newY = dragRef.current.startPosY + dy;
      const clamped = clampPosition(newX, newY);
      setPosition(clamped);
    }
  };

  const handlePointerUp = (e) => {
    if (!dragRef.current.isDragging) return;

    if (centerBtnRef.current && dragRef.current.pointerId !== null) {
      try {
        centerBtnRef.current.releasePointerCapture(dragRef.current.pointerId);
      } catch {
        // ignore
      }
    }

    const wasDrag = dragRef.current.hasMovedPastThreshold;
    dragRef.current.isDragging = false;
    dragRef.current.pointerId = null;

    if (!wasDrag) {
      // It was a clean click/tap: toggle open state
      setIsOpen((prev) => !prev);
    } else {
      // Save final drag position
      if (position) {
        updatePosition(position);
      }
    }
  };

  const handlePointerCancel = () => {
    dragRef.current.isDragging = false;
    dragRef.current.pointerId = null;
  };

  // Keyboard navigation & Outside Click
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleOutsideClick = (e) => {
      if (isOpen && hubRef.current && !hubRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [isOpen]);

  // Active section tracking
  useEffect(() => {
    if (!validSections.length) return;

    const observers = [];
    const callback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSectionId(entry.target.id);
        }
      });
    };

    const options = {
      root: containerRef ? containerRef.current : null,
      rootMargin: '-10% 0px -60% 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver(callback, options);

    validSections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) {
        observer.observe(el);
        observers.push(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [validSections, containerRef]);

  // Section click navigation
  const handleNodeClick = (sectionId, e) => {
    e.stopPropagation();
    setIsOpen(false);

    if (onNavigate) {
      onNavigate(sectionId);
    }

    const targetEl = document.getElementById(sectionId);
    if (targetEl) {
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // Temporary focus highlight
      targetEl.classList.remove('section-target-highlight');
      // Trigger reflow to restart animation if clicked repeatedly
      void targetEl.offsetWidth;
      targetEl.classList.add('section-target-highlight');

      setTimeout(() => {
        targetEl.classList.remove('section-target-highlight');
      }, 1900);
    }
  };

  // Calculate coordinates for nodes along the circumference
  const nodeLayout = useMemo(() => {
    const total = validSections.length;
    if (total === 0) return [];

    // Start angle: -90 deg (12 o'clock position)
    const startAngle = -Math.PI / 2;
    const angleStep = (2 * Math.PI) / total;

    return validSections.map((section, idx) => {
      const angle = startAngle + idx * angleStep;
      const x = Math.round(radius * Math.cos(angle));
      const y = Math.round(radius * Math.sin(angle));
      return {
        ...section,
        x,
        y,
        angle,
        delay: idx * 110 // Stagger delay for slow, distinct one-by-one emergence
      };
    });
  }, [validSections, radius]);

  const currentPos = position || { x: 200, y: 200 };

  return (
    <div
      ref={hubRef}
      className={`research-analysis-hub ${isOpen ? 'hub-open' : 'hub-closed'}`}
      style={{
        transform: `translate3d(${currentPos.x}px, ${currentPos.y}px, 0)`
      }}
      aria-label="AI Research Analysis Navigation Hub"
    >
      {/* Background Circular Orbit Ring */}
      <div
        className="hub-orbit-ring"
        style={{
          width: `${radius * 2}px`,
          height: `${radius * 2}px`,
          transform: `translate(-50%, -50%) scale(${isOpen ? 1 : 0.2}) rotate(${isOpen ? '0deg' : '-35deg'})`,
          opacity: isOpen ? 1 : 0,
          pointerEvents: 'none'
        }}
        aria-hidden="true"
      >
        <div className="orbit-subtle-glow" />
        <div className="orbit-inner-dashed" />
      </div>

      {/* Feature Nodes on Circumference */}
      {nodeLayout.map((node) => {
        const isActive = activeSectionId === node.id;
        const isHovered = hoveredNode === node.id;

        return (
          <div
            key={node.id}
            className={`hub-feature-node-wrapper ${isOpen ? 'node-visible' : 'node-hidden'} ${isActive ? 'active-node' : ''}`}
            style={{
              transform: isOpen
                ? `translate3d(${node.x}px, ${node.y}px, 0) scale(1)`
                : 'translate3d(0, 0, 0) scale(0.3)',
              opacity: isOpen ? 1 : 0,
              transitionDelay: `${isOpen ? node.delay : 0}ms`
            }}
          >
            {/* Feature Button Node */}
            <button
              type="button"
              className={`hub-feature-node-btn ${isActive ? 'is-active' : ''}`}
              onClick={(e) => handleNodeClick(node.id, e)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              aria-label={`Navigate to ${node.label}`}
              title={node.label}
              tabIndex={isOpen ? 0 : -1}
            >
              <span className="node-icon">{node.icon || '📌'}</span>
            </button>

            {/* Tooltip */}
            {isOpen && (
              <div
                className={`hub-node-tooltip ${isHovered ? 'tooltip-visible' : ''}`}
                style={{
                  transform: `translate(${node.x > 0 ? '12px' : '-12px'}, ${node.y > 0 ? '12px' : '-12px'})`
                }}
              >
                <div className="tooltip-title">{node.label}</div>
                {node.category && <div className="tooltip-cat">{node.category}</div>}
              </div>
            )}
          </div>
        );
      })}

      {/* Central Floating Button (Anchor & Drag Handle) */}
      <button
        ref={centerBtnRef}
        type="button"
        className={`hub-center-btn ${isOpen ? 'is-expanded' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        aria-label={isOpen ? "Close research analysis navigation" : "Open research analysis navigation"}
        title={isOpen ? "Click to close navigation" : "Drag to move or click to open AI Navigation Hub"}
      >
        <div className="hub-center-inner">
          <span className="hub-center-icon">{isOpen ? '✕' : '🔬'}</span>
          {!isOpen && <span className="hub-pulse-ring" />}
        </div>
      </button>
    </div>
  );
}
