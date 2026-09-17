import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import patentService from '../services/patentService'
import './PatentSemanticMap3D.css'

export default function PatentSemanticMap3D({
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
  userIdeaData = null,
  showUserIdea = true,
  onToggleShowUserIdea,
  viewMode = '3d',
  onToggleViewMode,
  onResetView,
}) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const pointsGroupRef = useRef(null)
  const ideaMeshRef = useRef(null)
  const reqIdRef = useRef(null)

  // Interaction states
  const [selectedClusterId, setSelectedClusterId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [hoveredPatent, setHoveredPatent] = useState(null)
  const [tooltipScreenPos, setTooltipScreenPos] = useState({ x: 0, y: 0 })
  const [autoRotate, setAutoRotate] = useState(false)
  const [zoomValue, setZoomValue] = useState(1)

  // Mouse orbit state
  const isDraggingRef = useRef(false)
  const prevMousePosRef = useRef({ x: 0, y: 0 })
  const sphericalRef = useRef({ radius: 130, theta: Math.PI / 4, phi: Math.PI / 3 })

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const points = useMemo(() => {
    return clustersData?.visualization_points || []
  }, [clustersData])

  const clusters = useMemo(() => {
    return clustersData?.clusters || []
  }, [clustersData])

  const clusterMap = useMemo(() => {
    const map = new Map()
    clusters.forEach((c) => map.set(c.cluster_id, c))
    return map
  }, [clusters])

  // Map patent id to full patent object
  const patentMap = useMemo(() => {
    const map = new Map()
    patents.forEach((p) => map.set(p.id, p))
    return map
  }, [patents])

  // Search match IDs
  const effectiveSearch = (appliedSearch || searchTerm).toLowerCase().trim()
  const searchMatchIds = useMemo(() => {
    if (!effectiveSearch) return null
    const matched = new Set()
    points.forEach((p) => {
      const full = patentMap.get(p.patent_id) || p
      const haystack = `${full.title || ''} ${full.publication_number || ''} ${full.assignee || ''} ${full.technology_domain || ''}`.toLowerCase()
      if (haystack.includes(effectiveSearch)) {
        matched.add(p.patent_id)
      }
    })
    return matched
  }, [points, patentMap, effectiveSearch])

  // Nearest neighbors computation for selected patent
  const nearestNeighbors = useMemo(() => {
    if (!selectedPatent || !points.length) return []
    const selectedPt = points.find((p) => p.patent_id === selectedPatent.id)
    if (!selectedPt) return []

    const selX = selectedPt.x_3d ?? (selectedPt.x - 50)
    const selY = selectedPt.y_3d ?? (selectedPt.y - 50)
    const selZ = selectedPt.z_3d ?? 0

    const scored = points
      .filter((p) => p.patent_id !== selectedPatent.id)
      .map((p) => {
        const px = p.x_3d ?? (p.x - 50)
        const py = p.y_3d ?? (p.y - 50)
        const pz = p.z_3d ?? 0
        const dist = Math.sqrt((px - selX) ** 2 + (py - selY) ** 2 + (pz - selZ) ** 2)
        // Convert distance in 3D PCA space to a calibrated similarity percentage
        const simPct = Math.max(25, Math.min(98, Math.round(100 - dist * 0.75)))
        return {
          patent_id: p.patent_id,
          title: p.title,
          publication_number: p.publication_number,
          assignee: p.assignee,
          similarity_percentage: simPct,
          cluster_id: p.cluster_id,
          country: p.country,
        }
      })
      .sort((a, b) => b.similarity_percentage - a.similarity_percentage)
      .slice(0, 5)

    return scored
  }, [selectedPatent, points])

  // Stable refs for callbacks and lookup maps to prevent Three.js scene teardown
  const onSelectPatentRef = useRef(onSelectPatent)
  onSelectPatentRef.current = onSelectPatent

  const patentMapRef = useRef(patentMap)
  patentMapRef.current = patentMap

  // Autocomplete fetcher
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setSuggestions([])
      setSuggestionsOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await patentService.getPatentSuggestions(searchTerm.trim(), 6)
        setSuggestions(res?.suggestions || [])
        setSuggestionsOpen((res?.suggestions || []).length > 0)
      } catch (e) {
        console.warn('Suggestions failed:', e)
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Helper to update spherical camera position
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return
    const { radius, theta, phi } = sphericalRef.current
    const x = radius * Math.sin(phi) * Math.sin(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.cos(theta)
    cameraRef.current.position.set(x, y, z)
    cameraRef.current.lookAt(0, 0, 0)
  }, [])

  // Initialize Three.js Scene ONCE
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || 800
    const height = container.clientHeight || 550

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0a1120')
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000)
    cameraRef.current = camera
    updateCameraPosition()

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.innerHTML = ''
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9)
    dirLight.position.set(80, 120, 100)
    scene.add(dirLight)

    const pointLight = new THREE.PointLight(0x06b6d4, 1.2, 300)
    pointLight.position.set(-60, -40, 50)
    scene.add(pointLight)

    // 5. 3D Bounding Grid Box & Axes
    const boxSize = 100
    const boxGeo = new THREE.BoxGeometry(boxSize, boxSize, boxSize)
    const boxEdges = new THREE.EdgesGeometry(boxGeo)
    const boxMat = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.5 })
    const boxMesh = new THREE.LineSegments(boxEdges, boxMat)
    scene.add(boxMesh)

    // Subtle internal grid planes
    const gridHelperY = new THREE.GridHelper(boxSize, 10, 0x334155, 0x1e293b)
    gridHelperY.position.y = -boxSize / 2
    scene.add(gridHelperY)

    // 6. Points Group
    const pointsGroup = new THREE.Group()
    scene.add(pointsGroup)
    pointsGroupRef.current = pointsGroup

    // 7. Raycaster for Mouse Interactivity
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    function onMouseMove(event) {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      if (isDraggingRef.current) {
        const deltaX = event.clientX - prevMousePosRef.current.x
        const deltaY = event.clientY - prevMousePosRef.current.y
        prevMousePosRef.current = { x: event.clientX, y: event.clientY }

        sphericalRef.current.theta -= deltaX * 0.008
        sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalRef.current.phi - deltaY * 0.008))
        updateCameraPosition()
        return
      }

      // Raycast hover
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(pointsGroup.children)

      if (intersects.length > 0) {
        const hit = intersects[0].object
        const ptData = hit.userData
        if (ptData && ptData.patent_id) {
          setHoveredPatent(ptData)
          setTooltipScreenPos({ x: event.clientX - rect.left + 15, y: event.clientY - rect.top + 15 })
          document.body.style.cursor = 'pointer'
          return
        }
      }
      setHoveredPatent(null)
      document.body.style.cursor = 'default'
    }

    function onMouseDown(event) {
      if (event.button === 0) {
        isDraggingRef.current = true
        prevMousePosRef.current = { x: event.clientX, y: event.clientY }
      }
    }

    function onMouseUp(event) {
      if (isDraggingRef.current) {
        const distMoved = Math.hypot(
          event.clientX - prevMousePosRef.current.x,
          event.clientY - prevMousePosRef.current.y
        )
        isDraggingRef.current = false

        // Click detection if not dragged much
        if (distMoved < 5) {
          const rect = renderer.domElement.getBoundingClientRect()
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(mouse, camera)
          const intersects = raycaster.intersectObjects(pointsGroup.children)

          if (intersects.length > 0) {
            const hit = intersects[0].object
            const ptData = hit.userData
            if (ptData && ptData.patent_id && onSelectPatentRef.current) {
              const fullObj = patentMapRef.current.get(ptData.patent_id) || ptData
              onSelectPatentRef.current(fullObj)
            }
          }
        }
      }
    }

    function onWheel(event) {
      event.preventDefault()
      sphericalRef.current.radius = Math.max(50, Math.min(260, sphericalRef.current.radius + event.deltaY * 0.1))
      updateCameraPosition()
    }

    const domEl = renderer.domElement
    domEl.addEventListener('mousemove', onMouseMove)
    domEl.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    domEl.addEventListener('wheel', onWheel, { passive: false })

    // Resize handler
    function handleResize() {
      if (!container || !renderer || !camera) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // Animation loop
    function animate() {
      reqIdRef.current = requestAnimationFrame(animate)

      if (autoRotate && !isDraggingRef.current) {
        sphericalRef.current.theta += 0.003
        updateCameraPosition()
      }

      // Rotate/pulse user idea mesh if present
      if (ideaMeshRef.current) {
        ideaMeshRef.current.rotation.y += 0.02
        ideaMeshRef.current.rotation.x += 0.01
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(reqIdRef.current)
      domEl.removeEventListener('mousemove', onMouseMove)
      domEl.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      domEl.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', handleResize)
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      boxGeo.dispose()
      boxEdges.dispose()
      boxMat.dispose()
      gridHelperY.dispose()
      renderer.dispose()
    }
  }, [updateCameraPosition])

  // Populate Patent Spheres and User Idea Point
  useEffect(() => {
    const pointsGroup = pointsGroupRef.current
    if (!pointsGroup) return

    // Clear previous mesh objects & materials without corrupting shared geometries
    while (pointsGroup.children.length > 0) {
      const obj = pointsGroup.children[0]
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
        else obj.material.dispose()
      }
      pointsGroup.remove(obj)
    }

    // Geometries instantiated fresh for this render pass
    const baseSphereGeo = new THREE.SphereGeometry(2.4, 24, 24)
    const selectedSphereGeo = new THREE.SphereGeometry(3.6, 28, 28)

    points.forEach((pt) => {
      const x = pt.x_3d ?? (pt.x - 50)
      const y = pt.y_3d ?? (pt.y - 50)
      const z = pt.z_3d ?? 0

      const cId = pt.cluster_id || 0
      const hexColor = clusterColors[cId % clusterColors.length] || '#0d9488'

      const isSelected = selectedPatent && selectedPatent.id === pt.patent_id
      const isClusterFiltered = selectedClusterId !== null && selectedClusterId !== cId
      const isSearchFiltered = searchMatchIds !== null && !searchMatchIds.has(pt.patent_id)

      let opacity = 0.92
      let scale = 1.0

      if (isClusterFiltered || isSearchFiltered) {
        opacity = 0.15
        scale = 0.7
      } else if (isSelected) {
        opacity = 1.0
        scale = 1.4
      }

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hexColor),
        emissive: isSelected ? new THREE.Color('#ffffff') : new THREE.Color(hexColor),
        emissiveIntensity: isSelected ? 0.6 : 0.15,
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
        opacity: opacity,
      })

      const mesh = new THREE.Mesh(isSelected ? selectedSphereGeo : baseSphereGeo, mat)
      mesh.position.set(x, y, z)
      mesh.scale.set(scale, scale, scale)
      mesh.userData = { ...pt }

      pointsGroup.add(mesh)
    })

    // Add User Idea Glowing Diamond / Star Mesh if present
    let starGeo = null
    if (userIdeaData && userIdeaData.idea_3d_coordinates && showUserIdea) {
      const { x, y, z } = userIdeaData.idea_3d_coordinates
      starGeo = new THREE.OctahedronGeometry(4.8, 0)
      const starMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#f59e0b'), // Amber glowing gold
        emissive: new THREE.Color('#fbbf24'),
        emissiveIntensity: 0.85,
        roughness: 0.1,
        metalness: 0.8,
      })
      const starMesh = new THREE.Mesh(starGeo, starMat)
      starMesh.position.set(x, y, z)
      starMesh.userData = {
        is_user_idea: true,
        title: '★ Your Research / Startup Idea',
        domain: userIdeaData.idea_analysis?.domain || 'Custom Innovation',
        nearest_patent: userIdeaData.idea_3d_coordinates?.nearest_patent_title,
      }
      pointsGroup.add(starMesh)
      ideaMeshRef.current = starMesh
    } else {
      ideaMeshRef.current = null
    }

    return () => {
      baseSphereGeo.dispose()
      selectedSphereGeo.dispose()
      if (starGeo) starGeo.dispose()
    }
  }, [points, selectedPatent, selectedClusterId, searchMatchIds, userIdeaData, showUserIdea, clusterColors])


  function handleResetCamera() {
    sphericalRef.current = { radius: 130, theta: Math.PI / 4, phi: Math.PI / 3 }
    updateCameraPosition()
    if (onResetView) onResetView()
  }

  function handleZoomIn() {
    sphericalRef.current.radius = Math.max(50, sphericalRef.current.radius - 20)
    updateCameraPosition()
  }

  function handleZoomOut() {
    sphericalRef.current.radius = Math.min(260, sphericalRef.current.radius + 20)
    updateCameraPosition()
  }

  function handleExecuteSearch(overrideQuery) {
    const q = overrideQuery !== undefined ? overrideQuery : searchTerm
    setAppliedSearch(q.trim())
    setSuggestionsOpen(false)
    if (searchInputRef.current) searchInputRef.current.blur()
  }

  return (
    <div className="patent-map-3d-wrapper">
      {/* 1. Header Toolbar */}
      <div className="map-3d-toolbar">
        <div className="toolbar-left">
          <div className="title-block">
            <h3>3D Patent Semantic Landscape</h3>
            <span className="badge-3d-live">Interactive 3D WebGL</span>
          </div>
          <p className="toolbar-subtext">
            High-dimensional patent sentence embeddings projected onto principal semantic axes (PC1, PC2, PC3).
          </p>
        </div>

        <div className="toolbar-right">
          {/* 2D / 3D View Switcher */}
          <div className="view-toggle-pill">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === '2d' ? 'active' : ''}`}
              onClick={() => onToggleViewMode && onToggleViewMode('2d')}
            >
              2D View
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === '3d' ? 'active' : ''}`}
              onClick={() => onToggleViewMode && onToggleViewMode('3d')}
            >
              3D View
            </button>
          </div>

          {/* User Idea Toggle */}
          {userIdeaData && (
            <button
              type="button"
              className={`btn-idea-toggle ${showUserIdea ? 'active' : ''}`}
              onClick={onToggleShowUserIdea}
            >
              ★ {showUserIdea ? 'Hide My Idea' : 'Show My Idea'}
            </button>
          )}

          <button
            type="button"
            className={`btn-control-icon ${autoRotate ? 'active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle Auto Rotation"
          >
            🔄 {autoRotate ? 'Stop' : 'Rotate'}
          </button>
          <button type="button" className="btn-control-icon" onClick={handleResetCamera} title="Reset Camera">
            ⟲ Reset
          </button>
        </div>
      </div>

      {/* 2. Search & Cluster Filter Pills */}
      <div className="map-3d-controls-bar">
        {/* Search Input with Autocomplete */}
        <div className="map-3d-search-box">
          <div className="search-input-inner">
            <span className="search-lens">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              className="map-search-input"
              placeholder="Search patent title, technology, or assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExecuteSearch()
              }}
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => {
                  setSearchTerm('')
                  setAppliedSearch('')
                }}
              >
                ✕
              </button>
            )}
          </div>
          <button type="button" className="btn-search-trigger" onClick={() => handleExecuteSearch()}>
            Search
          </button>

          {/* Autocomplete Dropdown */}
          {suggestionsOpen && suggestions.length > 0 && (
            <div ref={suggestionsRef} className="map-suggestions-dropdown">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  className="suggestion-row"
                  onClick={() => {
                    setSearchTerm(s.text)
                    handleExecuteSearch(s.text)
                  }}
                >
                  <span className="sugg-category">{s.category}</span>
                  <span className="sugg-text">{s.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Cluster Pills */}
        <div className="cluster-pills-scroll">
          <button
            type="button"
            className={`cluster-pill-item ${selectedClusterId === null ? 'active' : ''}`}
            onClick={() => setSelectedClusterId(null)}
          >
            All Clusters ({points.length})
          </button>
          {clusters.map((c) => {
            const hex = clusterColors[c.cluster_id % clusterColors.length]
            const isSelected = selectedClusterId === c.cluster_id
            return (
              <button
                key={c.cluster_id}
                type="button"
                className={`cluster-pill-item ${isSelected ? 'active' : ''}`}
                style={{
                  borderColor: isSelected ? hex : undefined,
                  backgroundColor: isSelected ? `${hex}22` : undefined,
                  color: isSelected ? hex : undefined,
                }}
                onClick={() => setSelectedClusterId(isSelected ? null : c.cluster_id)}
              >
                <span className="pill-dot" style={{ backgroundColor: hex }} />
                <span>{c.label}</span>
                <span className="pill-count">{c.patent_count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Main 3D Canvas Area + Floating Panels */}
      <div className="canvas-and-panels-container">
        {/* 3D WebGL Canvas */}
        <div className="three-canvas-holder" ref={mountRef}>
          {/* Spatial Axis Labels Overlay */}
          <div className="axis-legend-overlay">
            <span className="axis-tag x">X: PC1</span>
            <span className="axis-tag y">Y: PC2</span>
            <span className="axis-tag z">Z: PC3</span>
          </div>

          {/* Zoom controls */}
          <div className="canvas-floating-controls">
            <button type="button" onClick={handleZoomIn} title="Zoom In">+</button>
            <button type="button" onClick={handleZoomOut} title="Zoom Out">−</button>
          </div>

          {/* Hover Tooltip */}
          {hoveredPatent && (
            <div
              className="map-3d-tooltip"
              style={{ left: `${tooltipScreenPos.x}px`, top: `${tooltipScreenPos.y}px` }}
            >
              {hoveredPatent.is_user_idea ? (
                <div>
                  <div className="tooltip-title gold">★ Your Idea Point</div>
                  <div className="tooltip-meta">{hoveredPatent.domain}</div>
                </div>
              ) : (
                <div>
                  <div className="tooltip-title">{hoveredPatent.title}</div>
                  <div className="tooltip-meta">
                    <span>{hoveredPatent.publication_number}</span>
                    <span>• {hoveredPatent.country || 'Global'}</span>
                  </div>
                  {hoveredPatent.assignee && (
                    <div className="tooltip-assignee">🏢 {hoveredPatent.assignee}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Information Sidebar */}
        <div className="map-3d-sidebar">
          {/* Selected Point Details */}
          {selectedPatent ? (
            <div className="sidebar-card selected-patent-card">
              <div className="sidebar-card-header">
                <span className="card-tag">Selected Patent</span>
                <button type="button" className="close-mini-btn" onClick={() => onSelectPatent(null)}>
                  ✕
                </button>
              </div>

              <h4 className="patent-selected-title">{selectedPatent.title}</h4>
              <div className="patent-selected-meta">
                <div><strong>Pub:</strong> {selectedPatent.publication_number}</div>
                <div><strong>Country:</strong> {selectedPatent.country || 'Global / EPO'}</div>
                <div><strong>Applicant:</strong> {selectedPatent.assignee || 'Not available'}</div>
                <div><strong>Domain:</strong> {selectedPatent.technology_domain || 'General Technology'}</div>
              </div>

              {selectedPatent.abstract && (
                <p className="patent-selected-abstract">
                  {selectedPatent.abstract.length > 220
                    ? `${selectedPatent.abstract.slice(0, 215)}...`
                    : selectedPatent.abstract}
                </p>
              )}

              {selectedPatent.official_link && (
                <a
                  href={selectedPatent.official_link}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-view-official"
                >
                  View Official Patent ↗
                </a>
              )}
            </div>
          ) : (
            <div className="sidebar-card empty-selection-card">
              <div className="empty-icon">📍</div>
              <h4>No Patent Selected</h4>
              <p>Click any point in the 3D semantic space to inspect its metadata and nearest technology neighbors.</p>
            </div>
          )}

          {/* Nearest Neighbors Panel */}
          {nearestNeighbors.length > 0 && (
            <div className="sidebar-card neighbors-card">
              <h4 className="neighbors-title">Nearest Semantic Neighbors</h4>
              <div className="neighbors-list">
                {nearestNeighbors.map((nb, idx) => (
                  <div
                    key={nb.patent_id || idx}
                    className="neighbor-item"
                    onClick={() => {
                      const full = patentMap.get(nb.patent_id) || nb
                      if (onSelectPatent) onSelectPatent(full)
                    }}
                  >
                    <div className="neighbor-top">
                      <span className="neighbor-rank">#{idx + 1}</span>
                      <span className="neighbor-sim">{nb.similarity_percentage}% match</span>
                    </div>
                    <div className="neighbor-name">{nb.title}</div>
                    <div className="neighbor-pub">{nb.publication_number} • {nb.country || 'Global'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Idea Spatial Match Info */}
          {userIdeaData && userIdeaData.idea_3d_coordinates && (
            <div className="sidebar-card idea-spatial-card">
              <div className="idea-spatial-header">
                <span className="star-icon">★</span>
                <h4>Your Innovation in 3D Space</h4>
              </div>
              <p className="idea-spatial-desc">
                Projected using the exact same fitted PCA coordinate matrix as the patent collection.
              </p>
              <div className="idea-spatial-meta">
                <div><strong>Closest Cluster:</strong> {userIdeaData.idea_3d_coordinates.nearest_cluster_label || userIdeaData.idea_analysis?.domain}</div>
                {userIdeaData.idea_3d_coordinates.nearest_patent_title && (
                  <div>
                    <strong>Nearest Patent:</strong> {userIdeaData.idea_3d_coordinates.nearest_patent_title}
                    {userIdeaData.idea_3d_coordinates.nearest_patent_similarity && (
                      <span className="gold-score"> ({userIdeaData.idea_3d_coordinates.nearest_patent_similarity}%)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Statistics & Distance Meaning Bar */}
      <div className="map-3d-stats-bar">
        <div className="stat-card">
          <span className="stat-label">Total Patents</span>
          <span className="stat-value">{points.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Technology Clusters</span>
          <span className="stat-value">{clusters.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Spatial Projection</span>
          <span className="stat-value">3D PCA (PC1, PC2, PC3)</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Embedding Model</span>
          <span className="stat-value">MiniLM-L6-v2 (384-dim)</span>
        </div>
        <div className="stat-card wide">
          <span className="stat-label">Semantic Distance Meaning</span>
          <span className="stat-desc">
            Points positioned closer together in 3D space share higher semantic similarity and overlapping technological concepts.
          </span>
        </div>
      </div>
    </div>
  )
}
