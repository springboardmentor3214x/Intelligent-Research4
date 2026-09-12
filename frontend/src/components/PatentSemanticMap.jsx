import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import patentService from '../services/patentService'
import './PatentSemanticMap.css'

export default function PatentSemanticMap({
  clustersData,
  patents = [],
  clusterColors = [
    '#0d9488', // Teal
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#db2777', // Pink/Rose
    '#d97706', // Amber
    '#059669', // Emerald
    '#ea580c', // Orange
    '#4f46e5', // Indigo
  ],
  onSelectPatent,
  selectedPatent,
  similarData,
  similarityLoading,
  onFindSimilar,
  onResetView,
}) {
  // State for interactive features
  const [selectedClusterId, setSelectedClusterId] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [similarityMode, setSimilarityMode] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false)
  const [animProgress, setAnimProgress] = useState(0) // 0 to 1 for intro animation

  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const svgRef = useRef(null)
  const containerRef = useRef(null)

  // Points list from clustersData
  const points = useMemo(() => {
    return clustersData?.visualization_points || []
  }, [clustersData])

  // Cluster list from clustersData
  const clusters = useMemo(() => {
    return clustersData?.clusters || []
  }, [clustersData])

  // Map cluster_id to cluster info
  const clusterMap = useMemo(() => {
    const map = new Map()
    clusters.forEach((c) => map.set(c.cluster_id, c))
    return map
  }, [clusters])

  // Intro entrance animation trigger
  useEffect(() => {
    setAnimProgress(0)
    const startTime = performance.now()
    const duration = 900 // 900ms smooth animation

    let frameId
    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimProgress(eased)
      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      }
    }
    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [clustersData])

  // Debounced autocomplete fetcher from backend
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setSuggestions([])
      setSuggestionsOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      try {
        setSuggestionsLoading(true)
        const res = await patentService.getPatentSuggestions(searchTerm.trim(), 8)
        setSuggestions(res?.suggestions || [])
        setSuggestionsOpen((res?.suggestions || []).length > 0)
      } catch (err) {
        console.warn('Suggestions error:', err)
      } finally {
        setSuggestionsLoading(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Close suggestions on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        !searchInputRef.current?.contains(e.target)
      ) {
        setSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function handleExecuteSearch(overrideQuery) {
    const queryToUse = overrideQuery !== undefined ? overrideQuery : searchTerm
    setAppliedSearch(queryToUse.trim())
    setSuggestionsOpen(false)
    if (searchInputRef.current) searchInputRef.current.blur()
  }

  function handleSelectSuggestion(suggestionText) {
    setSearchTerm(suggestionText)
    handleExecuteSearch(suggestionText)
  }

  // Filtered/searched matches on map based on search term or applied query
  const effectiveSearchQuery = (appliedSearch || searchTerm).toLowerCase().trim()

  const searchMatches = useMemo(() => {
    if (!effectiveSearchQuery) return null
    const matchingIds = new Set()
    patents.forEach((p) => {
      if (
        p.title?.toLowerCase().includes(effectiveSearchQuery) ||
        p.publication_number?.toLowerCase().includes(effectiveSearchQuery) ||
        p.assignee?.toLowerCase().includes(effectiveSearchQuery) ||
        p.technology_domain?.toLowerCase().includes(effectiveSearchQuery) ||
        p.classification?.toLowerCase().includes(effectiveSearchQuery) ||
        p.abstract?.toLowerCase().includes(effectiveSearchQuery)
      ) {
        matchingIds.add(p.id)
      }
    })
    return matchingIds
  }, [effectiveSearchQuery, patents])

  // Has zero search matches when search is entered
  const isZeroSearchMatches = useMemo(() => {
    return Boolean(effectiveSearchQuery && searchMatches && searchMatches.size === 0)
  }, [effectiveSearchQuery, searchMatches])

  // Map patent_id to similarity score when selectedPatent + similarData are active
  const similarityScoreMap = useMemo(() => {
    const map = new Map()
    if (selectedPatent && similarData?.similar_patents) {
      similarData.similar_patents.forEach((sim) => {
        map.set(sim.patent_id, sim)
      })
    }
    return map
  }, [selectedPatent, similarData])

  // Find patent object by id
  const getPatentById = useCallback(
    (id) => patents.find((p) => p.id === id),
    [patents]
  )

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.6))
  const handleResetZoomAndPan = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
    setSelectedClusterId(null)
    setSearchTerm('')
    setAppliedSearch('')
    setSuggestionsOpen(false)
    if (onResetView) onResetView()
  }

  // Pan interaction
  const handleMouseDown = (e) => {
    // Only drag on background or svg, not on interactive point clicks
    if (e.target.tagName !== 'circle' && e.target.tagName !== 'button') {
      setIsDragging(true)
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
    }
  }

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e) => {
    // Allow zooming with wheel when cursor is over the map container
    e.preventDefault()
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15
    setZoomLevel((prev) => Math.min(Math.max(prev + zoomDelta, 0.6), 3))
  }

  // Selected cluster object
  const activeClusterObj = selectedClusterId !== null ? clusterMap.get(selectedClusterId) : null

  // Calculate convex/radial hull regions for each cluster (from real coordinates)
  const clusterRegions = useMemo(() => {
    const regions = []
    clusters.forEach((cluster, idx) => {
      const clusterPts = points.filter((p) => p.cluster_id === cluster.cluster_id)
      if (clusterPts.length >= 2) {
        // Calculate center and radius
        const avgX = clusterPts.reduce((acc, p) => acc + p.x, 0) / clusterPts.length
        const avgY = clusterPts.reduce((acc, p) => acc + p.y, 0) / clusterPts.length
        // Calculate maximum distance from center
        let maxDist = 0
        clusterPts.forEach((p) => {
          const dist = Math.hypot(p.x - avgX, p.y - avgY)
          if (dist > maxDist) maxDist = dist
        })
        const radius = Math.max(maxDist + 4, 8)
        regions.push({
          cluster_id: cluster.cluster_id,
          color: clusterColors[idx % clusterColors.length],
          cx: avgX,
          cy: avgY,
          r: radius,
          label: cluster.label,
        })
      }
    })
    return regions
  }, [clusters, points, clusterColors])

  // Coordinate lookup for selected patent and its similar connections
  const selectedPointCoord = useMemo(() => {
    if (!selectedPatent) return null
    return points.find((p) => p.patent_id === selectedPatent.id) || null
  }, [selectedPatent, points])

  // Render connection curves between selected patent and similar patents
  const similarityConnections = useMemo(() => {
    if (!selectedPointCoord || !similarityMode || !similarData?.similar_patents) return []
    const list = []
    similarData.similar_patents.forEach((sim) => {
      const targetPoint = points.find((p) => p.patent_id === sim.patent_id)
      if (targetPoint) {
        // Generate a gentle quadratic bezier curve
        const midX = (selectedPointCoord.x + targetPoint.x) / 2
        const midY = (selectedPointCoord.y + targetPoint.y) / 2
        // Slight perpendicular curve offset
        const dx = targetPoint.x - selectedPointCoord.x
        const dy = targetPoint.y - selectedPointCoord.y
        const offset = 3
        const pathD = `M ${selectedPointCoord.x * animProgress + 50 * (1 - animProgress)} ${
          selectedPointCoord.y * animProgress + 50 * (1 - animProgress)
        } Q ${midX - dy * 0.08 * offset} ${midY + dx * 0.08 * offset} ${
          targetPoint.x * animProgress + 50 * (1 - animProgress)
        } ${targetPoint.y * animProgress + 50 * (1 - animProgress)}`

        list.push({
          patent_id: sim.patent_id,
          targetPoint,
          similarity_percentage: sim.similarity_percentage,
          pathD,
          midX,
          midY,
        })
      }
    })
    return list
  }, [selectedPointCoord, similarityMode, similarData, points, animProgress])

  return (
    <div className="patent-semantic-map-card">
      {/* 1. Header with badge, title, subtitle & top actions */}
      <div className="map-card-header">
        <div className="map-header-left">
          <div className="map-header-badge-row">
            <span className="live-status-pill">
              <span className="pulse-dot" />
              LIVE SEMANTIC MAP
            </span>
            <span className="tech-badge">PCA PROJECTION</span>
          </div>
          <h2 className="map-title">2D Semantic Embedding Space</h2>
          <p className="map-subtitle">
            Explore how patents are positioned by semantic similarity in the learned embedding space. Spatial proximity provides a visual indication of semantic similarity.
          </p>
        </div>

        <div className="map-header-right">
          <div className="map-toggle-group">
            <button
              type="button"
              className={`btn-mode-toggle ${similarityMode ? 'active' : ''}`}
              onClick={() => setSimilarityMode(!similarityMode)}
              title="Toggle Semantic Similarity connection lines when a patent is selected"
            >
              <span className="toggle-icon">⚡</span>
              <span>Similarity Mode: {similarityMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>
          <button
            type="button"
            className="btn-reset-view"
            onClick={handleResetZoomAndPan}
            title="Reset Zoom, Pan & Filters"
          >
            <span>⟳ Reset View</span>
          </button>
        </div>
      </div>

      {/* 2. Intelligence Flow Pipeline Indicator */}
      <div className="intelligence-pipeline-banner">
        <div className="pipeline-step">
          <span className="pipeline-icon">📄</span>
          <span className="pipeline-text">EPO Patent Data</span>
        </div>
        <div className="pipeline-arrow">&rarr;</div>
        <div className="pipeline-step">
          <span className="pipeline-icon">🧠</span>
          <span className="pipeline-text">{clustersData?.embedding_model || 'all-MiniLM-L6-v2'} Embeddings</span>
        </div>
        <div className="pipeline-arrow">&rarr;</div>
        <div className="pipeline-step">
          <span className="pipeline-icon">📐</span>
          <span className="pipeline-text">2D PCA Projection</span>
        </div>
        <div className="pipeline-arrow">&rarr;</div>
        <div className="pipeline-step active-step">
          <span className="pipeline-icon">🧩</span>
          <span className="pipeline-text">{clustersData?.number_of_clusters || 0} Semantic Clusters</span>
        </div>
      </div>

      {/* 3. Interactive Toolbar & Search */}
      <div className="map-toolbar">
        {/* Search Input Box with Autocomplete & Search Button */}
        <div className="map-search-wrapper">
          <form
            className="map-search-box"
            onSubmit={(e) => {
              e.preventDefault()
              handleExecuteSearch()
            }}
          >
            <span className="search-icon">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search patents by technology, keyword, research area, company, or patent title..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (!e.target.value.trim()) {
                  setAppliedSearch('')
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0) setSuggestionsOpen(true)
              }}
              className="map-search-input"
            />
            {suggestionsLoading && (
              <span className="suggestions-inline-spinner" title="Loading suggestions...">●</span>
            )}
            {searchTerm && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => {
                  setSearchTerm('')
                  setAppliedSearch('')
                  setSuggestions([])
                  setSuggestionsOpen(false)
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="btn-map-search"
              title="Execute Search"
            >
              <span className="btn-search-icon">🔍</span>
              <span>Search</span>
            </button>
          </form>

          {/* Autocomplete Suggestions Dropdown Popup */}
          {suggestionsOpen && suggestions.length > 0 && (
            <div className="map-suggestions-dropdown" ref={suggestionsRef}>
              <div className="suggestions-header">
                <span>Matching Patent Concepts</span>
                <small>{suggestions.length} suggestions</small>
              </div>
              <div className="suggestions-list">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="suggestion-item"
                    onClick={() => handleSelectSuggestion(s.text)}
                  >
                    <span className="suggestion-icon">
                      {s.category === 'domain' ? '🔬' : s.category === 'assignee' ? '🏢' : '📄'}
                    </span>
                    <span className="suggestion-text">{s.text}</span>
                    <span className="suggestion-badge">{s.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Legend Filter Chips */}
        <div className="map-legend-chips">
          <button
            type="button"
            className={`legend-chip ${selectedClusterId === null ? 'active-all' : ''}`}
            onClick={() => setSelectedClusterId(null)}
          >
            <span>All Clusters</span>
            <span className="chip-count">({points.length})</span>
          </button>
          {clusters.map((c, idx) => {
            const color = clusterColors[idx % clusterColors.length]
            const isSelected = selectedClusterId === c.cluster_id
            return (
              <button
                key={c.cluster_id}
                type="button"
                className={`legend-chip ${isSelected ? 'active-chip' : ''}`}
                style={{
                  '--chip-color': color,
                }}
                onClick={() =>
                  setSelectedClusterId(isSelected ? null : c.cluster_id)
                }
              >
                <span className="chip-dot" style={{ backgroundColor: color }} />
                <span className="chip-label">{c.label}</span>
                <span className="chip-count">({c.patent_count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 4. Main Plot Area Container */}
      <div
        className="map-canvas-container"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Floating Zoom Controls */}
        <div className="map-zoom-controls">
          <button
            type="button"
            className="zoom-btn"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className="zoom-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            −
          </button>
          <button
            type="button"
            className="zoom-btn"
            onClick={handleResetZoomAndPan}
            title="Reset Zoom & Pan"
            aria-label="Reset Zoom & Pan"
          >
            ⟳
          </button>
        </div>

        {/* Ambient Grid Background */}
        <div className="map-ambient-bg" />

        {/* SVG Scatter Plot */}
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className="map-svg"
          preserveAspectRatio="none"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          <defs>
            {/* Gradients for cluster boundary regions */}
            {clusterRegions.map((region) => (
              <radialGradient
                key={`grad-${region.cluster_id}`}
                id={`region-grad-${region.cluster_id}`}
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor={region.color} stopOpacity="0.16" />
                <stop offset="60%" stopColor={region.color} stopOpacity="0.08" />
                <stop offset="100%" stopColor={region.color} stopOpacity="0" />
              </radialGradient>
            ))}

            {/* Glowing filter for selected nodes */}
            <filter id="glow-selected" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Principal Component Reference Axes */}
          <line
            x1="50"
            y1="4"
            x2="50"
            y2="96"
            className="axis-line"
            strokeDasharray="1.2,1.2"
          />
          <line
            x1="4"
            y1="50"
            x2="96"
            y2="50"
            className="axis-line"
            strokeDasharray="1.2,1.2"
          />

          {/* Axis Labels */}
          <text x="96" y="48.5" className="axis-text axis-text-end">
            PC1 →
          </text>
          <text x="51.5" y="6" className="axis-text">
            PC2 ↑
          </text>

          {/* Cluster Region Zones (Subtle translucent circles calculated from actual points) */}
          {clusterRegions.map((region) => {
            const isDimmed =
              selectedClusterId !== null && selectedClusterId !== region.cluster_id
            return (
              <circle
                key={`region-${region.cluster_id}`}
                cx={region.cx}
                cy={region.cy}
                r={region.r}
                fill={`url(#region-grad-${region.cluster_id})`}
                stroke={region.color}
                strokeWidth="0.2"
                strokeDasharray="1,1"
                opacity={isDimmed ? 0.05 : 0.65}
                className="cluster-region-circle"
              />
            )
          })}

          {/* Similarity Connection Lines with Animated Pulses */}
          {similarityConnections.map((conn) => (
            <g key={`conn-${conn.patent_id}`} className="similarity-connection-group">
              <path
                d={conn.pathD}
                className="similarity-path-glow"
                stroke="#0d9488"
                strokeWidth="0.8"
                fill="none"
              />
              <path
                d={conn.pathD}
                className="similarity-path-dashed"
                stroke="#0f766e"
                strokeWidth="0.4"
                strokeDasharray="1.5,1.2"
                fill="none"
              />
            </g>
          ))}

          {/* Patent Points with Smooth Center-Outward Animated Entrance */}
          {points.map((pt) => {
            const patent = getPatentById(pt.patent_id)
            const color = clusterColors[pt.cluster_id % clusterColors.length]
            const isSelected = selectedPatent?.id === pt.patent_id
            const isSimilar = similarityScoreMap.has(pt.patent_id)
            const simScoreObj = similarityScoreMap.get(pt.patent_id)

            // Calculate entrance animated coordinate from center (50, 50) to (pt.x, pt.y)
            const currentX = 50 + (pt.x - 50) * animProgress
            const currentY = 50 + (pt.y - 50) * animProgress

            // Determine if point is highlighted or dimmed
            let isDimmed = false
            if (selectedClusterId !== null && selectedClusterId !== pt.cluster_id) {
              isDimmed = true
            }
            if (searchMatches && !searchMatches.has(pt.patent_id)) {
              isDimmed = true
            }
            if (selectedPatent && similarityMode && !isSelected && !isSimilar) {
              isDimmed = true
            }

            return (
              <g
                key={pt.patent_id}
                className={`patent-point-group ${isSelected ? 'selected' : ''} ${
                  isSimilar ? 'similar-match' : ''
                } ${isDimmed ? 'dimmed' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (patent && onSelectPatent) {
                    onSelectPatent(patent)
                  }
                }}
                onMouseEnter={() => setHoveredPoint({ ...pt, patent })}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Outer Glow Ring for Selected / Similar Points */}
                {(isSelected || isSimilar) && (
                  <circle
                    cx={currentX}
                    cy={currentY}
                    r={isSelected ? '3.8' : '2.8'}
                    fill="none"
                    stroke={isSelected ? '#0d9488' : '#0284c7'}
                    strokeWidth="0.5"
                    className="pulse-ring"
                    opacity={isSelected ? '0.9' : '0.6'}
                  />
                )}

                {/* Core Point Circle */}
                <circle
                  cx={currentX}
                  cy={currentY}
                  r={isSelected ? '2.4' : isSimilar ? '2.0' : hoveredPoint?.patent_id === pt.patent_id ? '2.2' : '1.4'}
                  fill={isSelected ? '#0f766e' : color}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? '0.6' : '0.35'}
                  filter={isSelected ? 'url(#glow-selected)' : undefined}
                  className="patent-node-dot"
                />

                {/* Similarity Percentage Badge Over Target Points */}
                {isSimilar && simScoreObj && (
                  <g className="sim-badge-group">
                    <rect
                      x={currentX - 3.8}
                      y={currentY - 3.8}
                      width="7.6"
                      height="2.4"
                      rx="0.8"
                      fill="#042f2e"
                      stroke="#14b8a6"
                      strokeWidth="0.25"
                      opacity="0.9"
                    />
                    <text
                      x={currentX}
                      y={currentY - 2.2}
                      className="sim-badge-text"
                      textAnchor="middle"
                    >
                      {simScoreObj.similarity_percentage}%
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* 5. Rich Hover Tooltip (Smooth floating card) */}
        {hoveredPoint && (
          <div
            className="map-rich-tooltip"
            style={{
              left: `${Math.min(Math.max(tooltipPos.x + 12, 10), (containerRef.current?.offsetWidth || 500) - 260)}px`,
              top: `${Math.min(Math.max(tooltipPos.y - 40, 10), (containerRef.current?.offsetHeight || 400) - 180)}px`,
            }}
          >
            <div className="tooltip-header">
              <span className="tooltip-pub-num">
                {hoveredPoint.patent?.publication_number || `ID: #${hoveredPoint.patent_id}`}
              </span>
              <span
                className="tooltip-cluster-tag"
                style={{
                  backgroundColor: `${clusterColors[hoveredPoint.cluster_id % clusterColors.length]}18`,
                  color: clusterColors[hoveredPoint.cluster_id % clusterColors.length],
                }}
              >
                {clusterMap.get(hoveredPoint.cluster_id)?.label || `Cluster #${hoveredPoint.cluster_id + 1}`}
              </span>
            </div>

            <h4 className="tooltip-title">{hoveredPoint.title}</h4>

            <div className="tooltip-meta-grid">
              {hoveredPoint.assignee && (
                <div className="tooltip-meta-item">
                  <span className="label">Assignee:</span>
                  <span className="value">{hoveredPoint.assignee}</span>
                </div>
              )}
              {hoveredPoint.technology_domain && (
                <div className="tooltip-meta-item">
                  <span className="label">Domain:</span>
                  <span className="value">{hoveredPoint.technology_domain}</span>
                </div>
              )}
              {hoveredPoint.patent?.classification && (
                <div className="tooltip-meta-item">
                  <span className="label">Class:</span>
                  <span className="value">{hoveredPoint.patent.classification}</span>
                </div>
              )}
              {similarityScoreMap.has(hoveredPoint.patent_id) && (
                <div className="tooltip-meta-item highlight-item">
                  <span className="label">Similarity:</span>
                  <strong className="value score-val">
                    {similarityScoreMap.get(hoveredPoint.patent_id)?.similarity_percentage}%
                  </strong>
                </div>
              )}
            </div>

            <div className="tooltip-hint">
              <span>💡 Click point to open full intelligence panel &amp; find similar</span>
            </div>
          </div>
        )}

        {/* Selected Cluster Summary Overlay (Floating glass card when a cluster chip is selected) */}
        {activeClusterObj && (
          <div className="active-cluster-floating-summary">
            <div className="summary-header">
              <div>
                <span className="summary-badge">Cluster #{activeClusterObj.cluster_id + 1}</span>
                <h4>{activeClusterObj.label}</h4>
              </div>
              <button
                type="button"
                className="btn-close-summary"
                onClick={() => setSelectedClusterId(null)}
              >
                ✕
              </button>
            </div>
            <p className="summary-count">
              <strong>{activeClusterObj.patent_count} Patents</strong> ({activeClusterObj.percentage}% of portfolio)
            </p>
            {activeClusterObj.top_terms?.length > 0 && (
              <div className="summary-terms">
                <span className="terms-label">Top Semantic Concepts:</span>
                <div className="terms-list">
                  {activeClusterObj.top_terms.map((term, tIdx) => (
                    <span key={tIdx} className="summary-term-pill">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. No Search Matches Floating Overlay */}
        {isZeroSearchMatches && (
          <div className="map-no-matches-overlay">
            <div className="no-matches-card">
              <div className="no-matches-icon">🔍</div>
              <h4>No patents found</h4>
              <p>
                No matching patents found for &ldquo;<strong>{effectiveSearchQuery}</strong>&rdquo;.
              </p>
              <span className="no-matches-tip">
                Try different keywords (e.g., &ldquo;medical imaging&rdquo;, &ldquo;quantum&rdquo;) or check spelling.
              </span>
              <button
                type="button"
                className="btn-clear-search-pill"
                onClick={() => {
                  setSearchTerm('')
                  setAppliedSearch('')
                  setSuggestions([])
                  setSuggestionsOpen(false)
                }}
              >
                Reset Map Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Axis Guide Explanatory Note */}
      <div className="map-axis-footer-note">
        <span className="note-icon">ℹ️</span>
        <span>
          <strong>Distance represents semantic positioning:</strong> High-dimensional MiniLM embeddings projected to 2D via PCA. Points closer together share more cohesive semantic and conceptual terms.
        </span>
      </div>

      {/* 6. Expandable "How Does This Map Work?" Educational Mini-Section */}
      <div className="how-it-works-accordion">
        <button
          type="button"
          className="accordion-toggle"
          onClick={() => setIsHowItWorksOpen(!isHowItWorksOpen)}
          aria-expanded={isHowItWorksOpen}
        >
          <div className="accordion-title">
            <span className="accordion-icon">💡</span>
            <strong>How to read this Patent Semantic Intelligence Map</strong>
          </div>
          <span className={`chevron ${isHowItWorksOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isHowItWorksOpen && (
          <div className="accordion-content">
            <div className="explanation-grid">
              <div className="explanation-card">
                <div className="exp-step-num">1</div>
                <h5>Dense Text Embeddings</h5>
                <p>
                  Each patent title and abstract is encoded using the <code>sentence-transformers/all-MiniLM-L6-v2</code> neural model into a 384-dimensional normalized vector.
                </p>
              </div>
              <div className="explanation-card">
                <div className="exp-step-num">2</div>
                <h5>PCA 2D Projection</h5>
                <p>
                  Principal Component Analysis (PCA) reduces the 384 dimensions to 2 principal axes (PC1 &amp; PC2), preserving maximum variance so semantic relations can be explored visually.
                </p>
              </div>
              <div className="explanation-card">
                <div className="exp-step-num">3</div>
                <h5>KMeans &amp; TF-IDF Labeling</h5>
                <p>
                  Patents are clustered automatically with unsupervised KMeans, and characteristic terms are extracted using TF-IDF n-gram scoring to generate human-interpretable cluster names.
                </p>
              </div>
              <div className="explanation-card">
                <div className="exp-step-num">4</div>
                <h5>Exact Cosine Similarity</h5>
                <p>
                  Clicking any patent computes exact cosine similarities against all portfolio vectors, illuminating the most semantically relevant patents with animated connection paths.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
