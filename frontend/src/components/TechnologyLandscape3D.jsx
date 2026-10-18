import React, { useState, useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { technologyService } from '../services/technologyService'
import './TechnologyLandscape3D.css'

// Stage color token map for badges
const STAGE_HEX = {
  Mature: '#10b981',
  Developing: '#0ea5e9',
  Emerging: '#f59e0b',
  Declining: '#f43f5e',
  'Insufficient Evidence': '#64748b',
}

// Helper to create high-resolution 3D text sprite with distinct technology color
function createTextSprite(text, colorHex = '#ffffff', isSelected = false) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 384
  canvas.height = 96

  // Background rounded pill
  ctx.fillStyle = isSelected ? 'rgba(14, 165, 233, 0.95)' : 'rgba(11, 19, 38, 0.88)'
  ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.22)'
  ctx.lineWidth = isSelected ? 4 : 2

  const radius = 20
  const x = 12, y = 12, w = canvas.width - 24, h = canvas.height - 24
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Status Dot in distinct technology color
  ctx.fillStyle = colorHex
  ctx.beginPath()
  ctx.arc(36, 48, 8, 0, Math.PI * 2)
  ctx.fill()

  // Text
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  
  let displayText = text
  if (displayText.length > 20) {
    displayText = displayText.slice(0, 18) + '…'
  }
  ctx.fillText(displayText, 54, 48)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(3.0, 0.75, 1)
  return sprite
}

// Helper to create 3D axis label sprite
function createAxisLabelSprite(text, colorHex) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 512
  canvas.height = 80

  ctx.fillStyle = 'rgba(7, 14, 27, 0.9)'
  ctx.strokeStyle = colorHex
  ctx.lineWidth = 2
  ctx.fillRect(4, 4, canvas.width - 8, canvas.height - 8)
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8)

  ctx.fillStyle = colorHex
  ctx.font = 'bold 25px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(4.8, 0.75, 1)
  return sprite
}

export default function TechnologyLandscape3D({
  activeTechQuery,
  onSelectTechnology,
  onOpenEvidenceModal,
}) {
  const [landscapeData, setLandscapeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Interactive UI Controls
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('ALL')
  const [domainFilter, setDomainFilter] = useState('ALL')
  const [autoRotate, setAutoRotate] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showClusterLinks, setShowClusterLinks] = useState(true)
  const [showDropLines, setShowDropLines] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // Refs
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const nodesMapRef = useRef(new Map())
  const linksGroupRef = useRef(null)
  const dropLinesGroupRef = useRef(null)
  const spritesGroupRef = useRef(null)
  const orbitStateRef = useRef({
    theta: 0.78, // ~45 deg azimuth
    phi: 1.05,   // ~60 deg elevation
    radius: 26,
    target: new THREE.Vector3(0, 3.2, 0),
  })

  // Fetch real multi-technology landscape dataset
  useEffect(() => {
    fetchLandscape()
  }, [])

  async function fetchLandscape() {
    try {
      setLoading(true)
      setError('')
      const data = await technologyService.getTechnologyLandscape()
      setLandscapeData(data)
    } catch (err) {
      setError(err.message || 'Failed to load 3D technology landscape data.')
    } finally {
      setLoading(false)
    }
  }

  // Filtered nodes based on Stage, Domain, and Search
  const visibleNodes = useMemo(() => {
    if (!landscapeData?.nodes) return []
    return landscapeData.nodes.filter((node) => {
      if (stageFilter !== 'ALL' && node.maturity_stage !== stageFilter) {
        return false
      }
      if (domainFilter !== 'ALL' && !node.domain?.toLowerCase().includes(domainFilter.toLowerCase())) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = node.technology.toLowerCase().includes(q)
        const matchDomain = node.domain?.toLowerCase().includes(q)
        if (!matchName && !matchDomain) return false
      }
      return true
    })
  }, [landscapeData, stageFilter, domainFilter, searchQuery])

  // Sync selected node with outer query if changed
  useEffect(() => {
    if (landscapeData?.nodes && activeTechQuery) {
      const match = landscapeData.nodes.find(
        (n) => n.technology.toLowerCase() === activeTechQuery.toLowerCase()
      )
      if (match) {
        setSelectedNode(match)
      }
    }
  }, [activeTechQuery, landscapeData])

  // -------------------------------------------------------------------------
  // Main Three.js Scene Setup & Spherical Camera Orbit Loop
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!mountRef.current || loading || !landscapeData) return

    const container = mountRef.current
    let width = container.clientWidth || 800
    let height = container.clientHeight || 560

    // 1. Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x050a14)
    scene.fog = new THREE.FogExp2(0x050a14, 0.012)
    sceneRef.current = scene

    // 2. Camera with Spherical Orbit State
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    cameraRef.current = camera

    const updateCameraOrbit = () => {
      const { theta, phi, radius, target } = orbitStateRef.current
      camera.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta)
      camera.position.y = target.y + radius * Math.cos(phi)
      camera.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta)
      camera.lookAt(target.x, target.y, target.z)
    }
    updateCameraOrbit()

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    rendererRef.current = renderer
    container.replaceChildren(renderer.domElement)

    // 4. Illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0x38bdf8, 2.0)
    mainLight.position.set(25, 40, 25)
    scene.add(mainLight)

    const backLight = new THREE.DirectionalLight(0xa855f7, 1.4)
    backLight.position.set(-25, 25, -25)
    scene.add(backLight)

    const floorLight = new THREE.PointLight(0x0ea5e9, 1.6, 40)
    floorLight.position.set(0, 1.0, 0)
    scene.add(floorLight)

    // 5. Perfectly Level Floor Grid (22x22, Y = 0)
    const gridHelper = new THREE.GridHelper(22, 22, 0x0ea5e9, 0x1e293b)
    gridHelper.position.y = 0
    scene.add(gridHelper)

    const floorGeom = new THREE.PlaneGeometry(22, 22)
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x071120,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    })
    const floorPlane = new THREE.Mesh(floorGeom, floorMat)
    floorPlane.rotation.x = Math.PI / 2
    floorPlane.position.y = -0.01
    scene.add(floorPlane)

    // 6. 3D Coordinate Axis Rails & Text Labels
    const createRail = (start, end, colorHex) => {
      const geom = new THREE.BufferGeometry().setFromPoints([start, end])
      const mat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2, transparent: true, opacity: 0.85 })
      return new THREE.Line(geom, mat)
    }

    // X Rail (Research Activity - Cyan)
    scene.add(createRail(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(10, 0, -10), 0x38bdf8))
    const xLabel = createAxisLabelSprite('X: Research Activity (Papers) →', '#38bdf8')
    xLabel.position.set(0, 0.7, -10.8)
    scene.add(xLabel)

    // Y Rail (Patent Activity - Purple)
    scene.add(createRail(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(-10, 8.8, -10), 0xc084fc))
    const yLabel = createAxisLabelSprite('Y: Patent Activity (Patents) ↑', '#c084fc')
    yLabel.position.set(-10.8, 4.4, -10)
    scene.add(yLabel)

    // Z Rail (Organization Participation - Amber)
    scene.add(createRail(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(-10, 0, 10), 0xf59e0b))
    const zLabel = createAxisLabelSprite('Z: Organization Participation →', '#f59e0b')
    zLabel.position.set(-10.8, 0.7, 0)
    scene.add(zLabel)

    // 7. Groups (All added to scene directly so they remain orthogonal and level)
    const dropLinesGroup = new THREE.Group()
    dropLinesGroupRef.current = dropLinesGroup
    scene.add(dropLinesGroup)

    const linksGroup = new THREE.Group()
    linksGroupRef.current = linksGroup
    scene.add(linksGroup)

    const spritesGroup = new THREE.Group()
    spritesGroupRef.current = spritesGroup
    scene.add(spritesGroup)

    const nodesMap = new Map()
    nodesMapRef.current = nodesMap

    // Build Node Meshes from Real Landscape Data with Unique Distinct Colors
    const nodeCoordsMap = new Map()

    landscapeData.nodes.forEach((node, idx) => {
      const { x, y, z } = node.normalized_coordinates || { x: 0, y: 3, z: 0 }
      const pos = new THREE.Vector3(x, y, z)
      nodeCoordsMap.set(node.id, pos)

      // Dynamic radius
      const totalEv = (node.research_activity || 0) + (node.patent_activity || 0) + (node.organization_participation || 0)
      const radius = Math.min(0.85, Math.max(0.44, 0.44 + Math.log10(Math.max(1, totalEv)) * 0.16))

      // Distinct Color per Technology
      const nodeHex = node.cluster_color || STAGE_HEX[node.maturity_stage] || '#0ea5e9'
      const nodeThreeColor = parseInt(nodeHex.replace('#', '0x'), 16)

      // Node Sphere
      const sphereGeom = new THREE.SphereGeometry(radius, 32, 32)
      const sphereMat = new THREE.MeshStandardMaterial({
        color: nodeThreeColor,
        emissive: nodeThreeColor,
        emissiveIntensity: 0.5,
        roughness: 0.15,
        metalness: 0.85,
        transparent: true,
        opacity: 0.95,
      })
      const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat)
      sphereMesh.position.copy(pos)
      sphereMesh.userData = { node, baseRadius: radius, nodeHex, nodeThreeColor }

      // Outer Halo Ring
      const haloGeom = new THREE.RingGeometry(radius * 1.2, radius * 1.45, 32)
      const haloMat = new THREE.MeshBasicMaterial({
        color: nodeThreeColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      })
      const halo = new THREE.Mesh(haloGeom, haloMat)
      halo.rotation.x = Math.PI / 2
      sphereMesh.add(halo)

      // Drop Line to Floor (Vertical stem from (x, y, z) down to (x, 0, z))
      const dropGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x, 0, z),
      ])
      const dropMat = new THREE.LineDashedMaterial({
        color: nodeThreeColor,
        dashSize: 0.4,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.5,
      })
      const dropLine = new THREE.Line(dropGeom, dropMat)
      dropLine.computeLineDistances()
      dropLinesGroup.add(dropLine)

      // Ground Target Footprint Circle at (x, 0, z)
      const targetGeom = new THREE.RingGeometry(0.25, 0.55, 24)
      const targetMat = new THREE.MeshBasicMaterial({
        color: nodeThreeColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.55,
      })
      const targetMesh = new THREE.Mesh(targetGeom, targetMat)
      targetMesh.rotation.x = Math.PI / 2
      targetMesh.position.set(x, 0.02, z)
      dropLinesGroup.add(targetMesh)

      // 3D Floating Name Sprite above sphere (with vertical stagger to avoid overlapping)
      const stagger = (idx % 3) * 0.55
      const nameSprite = createTextSprite(node.technology, nodeHex, false)
      nameSprite.position.set(x, y + radius + 0.6 + stagger, z)
      nameSprite.userData = { nodeId: node.id }
      spritesGroup.add(nameSprite)

      scene.add(sphereMesh)
      nodesMap.set(node.id, {
        mesh: sphereMesh,
        halo,
        dropLine,
        targetMesh,
        sprite: nameSprite,
        node,
      })
    })

    // Build Inter-technology Cluster Links
    const addedPairs = new Set()
    landscapeData.nodes.forEach((node) => {
      const srcPos = nodeCoordsMap.get(node.id)
      if (!srcPos) return

      (node.related_technologies || []).forEach((relName) => {
        const targetNode = landscapeData.nodes.find(
          (n) => n.technology.toLowerCase() === relName.toLowerCase()
        )
        if (!targetNode) return

        const pairKey = [node.id, targetNode.id].sort().join('--')
        if (addedPairs.has(pairKey)) return
        addedPairs.add(pairKey)

        const tgtPos = nodeCoordsMap.get(targetNode.id)
        if (!tgtPos) return

        const lineGeom = new THREE.BufferGeometry().setFromPoints([srcPos, tgtPos])
        const linkColor = node.cluster_color ? parseInt(node.cluster_color.replace('#', '0x'), 16) : 0x0284c7
        const lineMat = new THREE.LineBasicMaterial({
          color: linkColor,
          transparent: true,
          opacity: 0.35,
        })
        const linkLine = new THREE.Line(lineGeom, lineMat)
        linksGroup.add(linkLine)
      })
    })

    // -------------------------------------------------------------------------
    // Raycasting & Pointer Interactions
    // -------------------------------------------------------------------------
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const getPointerCoords = (e) => {
      const rect = renderer.domElement.getBoundingClientRect()
      return {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
        clientX: e.clientX,
        clientY: e.clientY,
      }
    }

    const onPointerMove = (e) => {
      const p = getPointerCoords(e)
      mouse.x = p.x
      mouse.y = p.y

      raycaster.setFromCamera(mouse, camera)
      const interactiveMeshes = Array.from(nodesMap.values()).map((item) => item.mesh)
      const intersects = raycaster.intersectObjects(interactiveMeshes, false)

      if (intersects.length > 0) {
        renderer.domElement.style.cursor = 'pointer'
        const hit = intersects[0].object
        setHoveredNode(hit.userData.node)
        setTooltipPos({ x: p.clientX, y: p.clientY })
      } else {
        renderer.domElement.style.cursor = isDragging ? 'grabbing' : 'grab'
        setHoveredNode(null)
      }
    }

    const onPointerClick = (e) => {
      const p = getPointerCoords(e)
      mouse.x = p.x
      mouse.y = p.y

      raycaster.setFromCamera(mouse, camera)
      const interactiveMeshes = Array.from(nodesMap.values()).map((item) => item.mesh)
      const intersects = raycaster.intersectObjects(interactiveMeshes, false)

      if (intersects.length > 0) {
        const hit = intersects[0].object
        const node = hit.userData.node
        setSelectedNode(node)

        // Pulse scale animation
        hit.scale.set(1.4, 1.4, 1.4)
        setTimeout(() => hit.scale.set(1, 1, 1), 220)

        if (onSelectTechnology) {
          onSelectTechnology(node.technology)
        }
      }
    }

    // -------------------------------------------------------------------------
    // Drag-to-Rotate (Camera Yaw & Pitch), Zoom, and Pan Controls
    // -------------------------------------------------------------------------
    let isDragging = false
    let dragMode = 'rotate'
    let prevMousePos = { x: 0, y: 0 }

    const onMouseDown = (e) => {
      isDragging = true
      dragMode = e.button === 2 ? 'pan' : 'rotate'
      prevMousePos = { x: e.clientX, y: e.clientY }
    }

    const onMouseMove = (e) => {
      if (!isDragging) return
      const deltaX = e.clientX - prevMousePos.x
      const deltaY = e.clientY - prevMousePos.y
      const orbit = orbitStateRef.current

      if (dragMode === 'rotate') {
        orbit.theta -= deltaX * 0.006
        // Clamp elevation angle phi between 15 deg and 82 deg so it never flips or slants
        orbit.phi = Math.max(0.25, Math.min(1.42, orbit.phi - deltaY * 0.006))
        updateCameraOrbit()
      } else if (dragMode === 'pan') {
        const panSpeed = 0.02
        // Pan along horizontal camera plane
        orbit.target.x -= (Math.cos(orbit.theta) * deltaX + Math.sin(orbit.theta) * deltaY) * panSpeed
        orbit.target.z -= (-Math.sin(orbit.theta) * deltaX + Math.cos(orbit.theta) * deltaY) * panSpeed
        updateCameraOrbit()
      }
      prevMousePos = { x: e.clientX, y: e.clientY }
    }

    const onMouseUp = () => {
      isDragging = false
    }

    const onWheel = (e) => {
      e.preventDefault()
      const zoomFactor = e.deltaY * 0.02
      const orbit = orbitStateRef.current
      orbit.radius = Math.max(14, Math.min(48, orbit.radius + zoomFactor))
      updateCameraOrbit()
    }

    const onContextMenu = (e) => e.preventDefault()

    const domEl = renderer.domElement
    domEl.addEventListener('pointermove', onPointerMove)
    domEl.addEventListener('click', onPointerClick)
    domEl.addEventListener('mousedown', onMouseDown)
    domEl.addEventListener('wheel', onWheel, { passive: false })
    domEl.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    // -------------------------------------------------------------------------
    // Animation Loop (Level Orbital Rotation)
    // -------------------------------------------------------------------------
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)

      if (autoRotate && !isDragging) {
        orbitStateRef.current.theta += 0.0022
        updateCameraOrbit()
      }

      renderer.render(scene, camera)
    }
    animate()

    // -------------------------------------------------------------------------
    // Resize Observer
    // -------------------------------------------------------------------------
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width
        const newH = entry.contentRect.height
        if (newW > 0 && newH > 0 && (Math.abs(newW - width) > 4 || Math.abs(newH - height) > 4)) {
          width = newW
          height = newH
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer.setSize(width, height)
        }
      }
    })
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(animId)
      resizeObserver.disconnect()
      domEl.removeEventListener('pointermove', onPointerMove)
      domEl.removeEventListener('click', onPointerClick)
      domEl.removeEventListener('mousedown', onMouseDown)
      domEl.removeEventListener('wheel', onWheel)
      domEl.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      renderer.dispose()
      if (container) container.replaceChildren()
    }
  }, [landscapeData, loading, autoRotate])

  // -------------------------------------------------------------------------
  // Update Visual State on Selection or Filtering
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!nodesMapRef.current || !landscapeData?.nodes) return

    const visibleIds = new Set(visibleNodes.map((n) => n.id))
    const selectedId = selectedNode?.id
    const relatedNames = new Set((selectedNode?.related_technologies || []).map((t) => t.toLowerCase()))

    nodesMapRef.current.forEach((item, id) => {
      const isVisible = visibleIds.has(id)
      const isSelected = selectedId === id
      const isRelated = relatedNames.has(item.node.technology.toLowerCase())

      if (!isVisible) {
        item.mesh.visible = false
        item.dropLine.visible = false
        item.targetMesh.visible = false
        item.sprite.visible = false
        return
      }

      item.mesh.visible = true
      item.dropLine.visible = showDropLines
      item.targetMesh.visible = showDropLines
      item.sprite.visible = showLabels

      if (selectedId) {
        if (isSelected) {
          item.mesh.material.opacity = 1.0
          item.mesh.material.emissiveIntensity = 0.95
          item.mesh.scale.set(1.35, 1.35, 1.35)
          item.halo.scale.set(1.4, 1.4, 1.4)
        } else if (isRelated) {
          item.mesh.material.opacity = 0.85
          item.mesh.material.emissiveIntensity = 0.55
          item.mesh.scale.set(1.15, 1.15, 1.15)
        } else {
          item.mesh.material.opacity = 0.22
          item.mesh.material.emissiveIntensity = 0.05
          item.mesh.scale.set(0.85, 0.85, 0.85)
        }
      } else {
        item.mesh.material.opacity = 0.95
        item.mesh.material.emissiveIntensity = 0.45
        item.mesh.scale.set(1.0, 1.0, 1.0)
      }
    })

    if (linksGroupRef.current) {
      linksGroupRef.current.visible = showClusterLinks
    }
  }, [visibleNodes, selectedNode, showClusterLinks, showDropLines, showLabels, landscapeData])

  // Camera Presets
  const setCameraPreset = (mode) => {
    const orbit = orbitStateRef.current
    if (mode === '3d') {
      orbit.theta = 0.78
      orbit.phi = 1.05
      orbit.radius = 26
      orbit.target.set(0, 3.2, 0)
    } else if (mode === 'top') {
      orbit.theta = 0
      orbit.phi = 0.05 // Top-down level view
      orbit.radius = 32
      orbit.target.set(0, 0, 0)
    } else if (mode === 'front') {
      orbit.theta = 0
      orbit.phi = 1.4
      orbit.radius = 28
      orbit.target.set(0, 3.5, 0)
    }
    if (cameraRef.current) {
      const { theta, phi, radius, target } = orbit
      cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta)
      cameraRef.current.position.y = target.y + radius * Math.cos(phi)
      cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta)
      cameraRef.current.lookAt(target.x, target.y, target.z)
    }
  }

  // Reset View
  const handleResetView = () => {
    setSelectedNode(null)
    setHoveredNode(null)
    setSearchQuery('')
    setStageFilter('ALL')
    setDomainFilter('ALL')
    setAutoRotate(true)
    setCameraPreset('3d')
  }

  // Select a node from quick chip or search
  const handleFocusNode = (node) => {
    setSelectedNode(node)
    if (onSelectTechnology) {
      onSelectTechnology(node.technology)
    }
    if (node.normalized_coordinates) {
      const { x, z } = node.normalized_coordinates
      const orbit = orbitStateRef.current
      orbit.theta = -Math.atan2(x, z) + 0.3
      if (cameraRef.current) {
        const { theta, phi, radius, target } = orbit
        cameraRef.current.position.x = target.x + radius * Math.sin(phi) * Math.sin(theta)
        cameraRef.current.position.y = target.y + radius * Math.cos(phi)
        cameraRef.current.position.z = target.z + radius * Math.sin(phi) * Math.cos(theta)
        cameraRef.current.lookAt(target.x, target.y, target.z)
      }
    }
  }

  return (
    <div className="landscape-3d-wrapper">
      {/* 1. Header & Context */}
      <div className="landscape-header-row">
        <div>
          <div className="landscape-title-row">
            <span className="landscape-icon">🌐</span>
            <h3 className="landscape-main-heading">3D Technology Landscape</h3>
            <span className="landscape-live-badge">● Live Empirical Coordinates</span>
          </div>
          <p className="landscape-sub-heading">
            Explore empirical technology positioning across Research (X), Patents (Y), and Organizational Participation (Z).
          </p>
        </div>

        {/* Axis Mapping Badges */}
        <div className="axis-legend-badges">
          <span className="axis-badge x-badge">
            <strong className="axis-letter">X:</strong> Research Activity (Papers)
          </span>
          <span className="axis-badge y-badge">
            <strong className="axis-letter">Y:</strong> Patent Activity (Patents)
          </span>
          <span className="axis-badge z-badge">
            <strong className="axis-letter">Z:</strong> Organization Participation
          </span>
        </div>
      </div>

      {/* 2. Professional Controls & Search Bar */}
      <div className="landscape-toolbar">
        {/* Search */}
        <div className="landscape-search-input-box">
          <span className="search-icon">🔎</span>
          <input
            type="text"
            className="landscape-search-input"
            placeholder="Search technology (e.g. Robotics, Biotech, Quantum)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>×</button>
          )}
        </div>

        {/* Stage Filter */}
        <div className="landscape-filter-group">
          <label className="filter-lbl">Stage:</label>
          <select
            className="landscape-select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="ALL">All Stages ({landscapeData?.nodes?.length || 0})</option>
            <option value="Mature">Mature</option>
            <option value="Developing">Developing</option>
            <option value="Emerging">Emerging</option>
            <option value="Declining">Declining</option>
            <option value="Insufficient Evidence">Insufficient Evidence</option>
          </select>
        </div>

        {/* Camera Views & Action Toggles */}
        <div className="landscape-actions-btns">
          <button
            className={`landscape-btn ${autoRotate ? 'btn-active' : ''}`}
            onClick={() => setAutoRotate(!autoRotate)}
            title="Toggle automatic rotation"
          >
            {autoRotate ? '⏸ Pause' : '▶ Rotate'}
          </button>

          <button
            className={`landscape-btn ${showDropLines ? 'btn-active' : ''}`}
            onClick={() => setShowDropLines(!showDropLines)}
            title="Toggle 3D vertical drop lines to floor grid"
          >
            📍 Height Stems
          </button>

          <button
            className={`landscape-btn ${showClusterLinks ? 'btn-active' : ''}`}
            onClick={() => setShowClusterLinks(!showClusterLinks)}
            title="Toggle semantic cluster link lines"
          >
            🕸 Clusters
          </button>

          <button
            className={`landscape-btn ${showLabels ? 'btn-active' : ''}`}
            onClick={() => setShowLabels(!showLabels)}
            title="Toggle 3D floating labels"
          >
            🏷 Labels
          </button>

          <button
            className="landscape-btn view-preset-btn"
            onClick={() => setCameraPreset('top')}
            title="Top-down X/Z View (Research vs Organizations)"
          >
            📐 Top View
          </button>

          <button
            className="landscape-btn reset-btn"
            onClick={handleResetView}
            title="Reset camera and selection"
          >
            🎯 Reset View
          </button>
        </div>
      </div>

      {/* 3. Quick Technology Filter Bar (Horizontal Clean Chips in Distinct Colors) */}
      <div className="landscape-quick-chips-row">
        <span className="quick-chips-lbl">Quick Select:</span>
        <div className="quick-chips-scroll">
          {landscapeData?.nodes?.map((node) => (
            <button
              key={node.id}
              className={`quick-tech-chip ${selectedNode?.id === node.id ? 'active-chip' : ''}`}
              onClick={() => handleFocusNode(node)}
            >
              <span
                className="chip-dot"
                style={{ backgroundColor: node.cluster_color || STAGE_HEX[node.maturity_stage] || '#0ea5e9' }}
              ></span>
              {node.technology}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 3D WebGL Canvas Area */}
      <div className="landscape-canvas-outer">
        {loading ? (
          <div className="landscape-loading-state">
            <div className="landscape-spinner"></div>
            <h4>Constructing 3D Technology Landscape...</h4>
            <p>Mapping empirical research papers, patents, and organizations into normalized coordinates.</p>
          </div>
        ) : error ? (
          <div className="landscape-error-state">
            <h4>⚠️ Unable to Render Landscape</h4>
            <p>{error}</p>
            <button className="landscape-retry-btn" onClick={fetchLandscape}>Retry</button>
          </div>
        ) : (
          <>
            <div className="landscape-canvas-mount" ref={mountRef}></div>

            {/* Floating Cursor Tooltip */}
            {hoveredNode && (
              <div
                className="landscape-floating-tooltip"
                style={{
                  left: `${tooltipPos.x + 16}px`,
                  top: `${tooltipPos.y + 16}px`,
                }}
              >
                <div className="tooltip-top-row">
                  <div className="tooltip-title-wrap">
                    <span
                      className="chip-dot"
                      style={{ backgroundColor: hoveredNode.cluster_color || '#0ea5e9', display: 'inline-block' }}
                    ></span>
                    <strong className="tooltip-title">{hoveredNode.technology}</strong>
                  </div>
                  <span className={`tooltip-stage-pill stage-${hoveredNode.maturity_stage.toLowerCase().replace(/\s+/g, '-')}`}>
                    {hoveredNode.maturity_stage}
                  </span>
                </div>
                <div className="tooltip-domain">{hoveredNode.domain}</div>
                <div className="tooltip-metrics-grid">
                  <div className="t-metric">
                    <span className="t-lbl">📚 Research Activity</span>
                    <strong className="t-val text-cyan">{hoveredNode.research_activity} papers</strong>
                  </div>
                  <div className="t-metric">
                    <span className="t-lbl">📑 Patent Activity</span>
                    <strong className="t-val text-purple">{hoveredNode.patent_activity} filings</strong>
                  </div>
                  <div className="t-metric">
                    <span className="t-lbl">🏢 Organizations</span>
                    <strong className="t-val text-amber">{hoveredNode.organization_participation} entities</strong>
                  </div>
                  <div className="t-metric">
                    <span className="t-lbl">⭐ Weighted Score</span>
                    <strong className="t-val">{hoveredNode.emerging_score} / 100</strong>
                  </div>
                </div>
                <div className="tooltip-hint">Click point to lock details &amp; highlight cluster</div>
              </div>
            )}

            {/* Interaction Helper Notice */}
            <div className="canvas-controls-hint">
              <span>🖱 Left drag: <strong>Rotate</strong></span>
              <span>•</span>
              <span>Scroll: <strong>Zoom</strong></span>
              <span>•</span>
              <span>Right drag: <strong>Pan</strong></span>
              <span>•</span>
              <span>Click node to inspect</span>
            </div>
          </>
        )}
      </div>

      {/* 5. Distinct Color & Stage Legend Bar */}
      <div className="landscape-legend-bar">
        <div className="legend-section">
          <span className="legend-heading">Technologies:</span>
          {landscapeData?.nodes?.slice(0, 8).map((node) => (
            <span key={node.id} className="legend-pill">
              <span className="legend-dot" style={{ backgroundColor: node.cluster_color || '#0ea5e9' }}></span>
              {node.technology}
            </span>
          ))}
          {landscapeData?.nodes && landscapeData.nodes.length > 8 && (
            <span className="legend-pill text-muted">+{landscapeData.nodes.length - 8} more</span>
          )}
        </div>

        <div className="legend-section">
          <span className="legend-heading">Maturity Badges:</span>
          <span className="legend-pill"><span className="legend-dot dot-mature"></span> Mature</span>
          <span className="legend-pill"><span className="legend-dot dot-developing"></span> Developing</span>
          <span className="legend-pill"><span className="legend-dot dot-emerging"></span> Emerging</span>
          <span className="legend-pill"><span className="legend-dot dot-declining"></span> Declining</span>
        </div>

        <div className="legend-section info-note">
          <span>ℹ️ Position reflects empirical research, patent, and organization volume.</span>
        </div>
      </div>

      {/* 6. Selected Technology Intelligence Details Panel */}
      {selectedNode && (
        <div className="selected-tech-detail-panel">
          <div className="detail-panel-header">
            <div className="detail-title-group">
              <span
                className="detail-color-marker"
                style={{ backgroundColor: selectedNode.cluster_color || STAGE_HEX[selectedNode.maturity_stage] || '#0ea5e9' }}
              ></span>
              <div>
                <h4 className="detail-tech-name">{selectedNode.technology}</h4>
                <div className="detail-cluster-tag">
                  <strong>Domain:</strong> {selectedNode.domain}
                </div>
              </div>
            </div>

            <div className="detail-header-actions">
              <span className={`stage-badge-large stage-${selectedNode.maturity_stage.toLowerCase().replace(/\s+/g, '-')}`}>
                {selectedNode.maturity_stage}
              </span>
              <button className="panel-close-btn" onClick={() => setSelectedNode(null)} title="Close detail panel">×</button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="detail-metrics-cards-row">
            <div className="detail-metric-card">
              <span className="dm-lbl">📚 Research Activity (X)</span>
              <div className="dm-val-row">
                <span className="dm-val text-cyan">{selectedNode.research_activity}</span>
                <span className="dm-unit">papers</span>
              </div>
              <span className="dm-sub">Trend: {selectedNode.trend}</span>
            </div>

            <div className="detail-metric-card">
              <span className="dm-lbl">📑 Patent Activity (Y)</span>
              <div className="dm-val-row">
                <span className="dm-val text-purple">{selectedNode.patent_activity}</span>
                <span className="dm-unit">patents</span>
              </div>
              <span className="dm-sub">Citations: {selectedNode.citation_count}</span>
            </div>

            <div className="detail-metric-card">
              <span className="dm-lbl">🏢 Organizations (Z)</span>
              <div className="dm-val-row">
                <span className="dm-val text-amber">{selectedNode.organization_participation}</span>
                <span className="dm-unit">entities</span>
              </div>
              <span className="dm-sub">Commercial: {selectedNode.active_commercial_organizations?.length || 0}</span>
            </div>

            <div className="detail-metric-card">
              <span className="dm-lbl">⭐ Weighted Score</span>
              <div className="dm-val-row">
                <span className="dm-val text-emerald">{selectedNode.emerging_score}</span>
                <span className="dm-unit">/ 100</span>
              </div>
              <span className="dm-sub">Evidence: {selectedNode.evidence_count} records</span>
            </div>
          </div>

          {/* Bottom Details (Organizations & Related Tech) */}
          <div className="detail-footer-grid">
            <div className="detail-footer-col">
              <span className="df-lbl">Active Commercial / Research Assignees:</span>
              <div className="df-chips-list">
                {selectedNode.active_commercial_organizations?.length > 0 ? (
                  selectedNode.active_commercial_organizations.map((org, i) => (
                    <span key={i} className="df-org-chip">{org}</span>
                  ))
                ) : (
                  <span className="text-muted">Academic &amp; Open Source Consortiums</span>
                )}
              </div>
            </div>

            <div className="detail-footer-col">
              <span className="df-lbl">Semantically Related Technologies:</span>
              <div className="df-chips-list">
                {selectedNode.related_technologies?.length > 0 ? (
                  selectedNode.related_technologies.map((rel, i) => (
                    <span
                      key={i}
                      className="df-rel-chip"
                      onClick={() => {
                        const targetNode = landscapeData?.nodes?.find(
                          (n) => n.technology.toLowerCase() === rel.toLowerCase()
                        )
                        if (targetNode) handleFocusNode(targetNode)
                      }}
                    >
                      🔗 {rel}
                    </span>
                  ))
                ) : (
                  <span className="text-muted">No cluster peers recorded</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="detail-action-row">
            <button
              className="detail-action-btn primary-action"
              onClick={() => onOpenEvidenceModal && onOpenEvidenceModal(selectedNode.technology)}
            >
              📄 Inspect Evidence Records ({selectedNode.evidence_count})
            </button>
            <button
              className="detail-action-btn secondary-action"
              onClick={() => onSelectTechnology && onSelectTechnology(selectedNode.technology)}
            >
              ⚡ Analyze Full Intelligence
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
