import { useEffect, useState, useContext, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import patentService from '../services/patentService'
import PatentSemanticMap3D from '../components/PatentSemanticMap3D'
import PatentSemanticMap from '../components/PatentSemanticMap'
import './Landing.css'

export default function Landing() {
  const { user } = useContext(AuthContext)
  const navigate = useNavigate()
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [activeAnalysisPill, setActiveAnalysisPill] = useState('problem')
  const [isEngineExpanded, setIsEngineExpanded] = useState(false)
  const [activeHoverNode, setActiveHoverNode] = useState(null)
  const [mouseParallax, setMouseParallax] = useState({ x: 0, y: 0 })
  const [activeExploreTab, setActiveExploreTab] = useState('research')
  const [activePatentCluster, setActivePatentCluster] = useState(null)
  const [hoveredMapPoint, setHoveredMapPoint] = useState(null)
  const [selectedMapPoint, setSelectedMapPoint] = useState(null)
  const [patentSearchQuery, setPatentSearchQuery] = useState('')
  const [patentSuggestions, setPatentSuggestions] = useState([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [livePatentCount, setLivePatentCount] = useState(69)
  const [activeInnovationNode, setActiveInnovationNode] = useState('innovation')
  const [expandedStep, setExpandedStep] = useState(null)
  const [mapZoom, setMapZoom] = useState(1)
  const [constellationActive, setConstellationActive] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState('home')
  const heroRef = useRef(null)

  // Real Patent Data & 3D Visualization State on Landing
  const [clustersData, setClustersData] = useState(null)
  const [realPatents, setRealPatents] = useState([])
  const [patentViewMode, setPatentViewMode] = useState('3d') // '3d' | '2d'
  const [selectedPatentLanding, setSelectedPatentLanding] = useState(null)
  const [similarDataLanding, setSimilarDataLanding] = useState(null)
  const [similarityLoadingLanding, setSimilarityLoadingLanding] = useState(false)

  // Idea Analyzer State on Landing Page
  const [landingIdeaText, setLandingIdeaText] = useState('')
  const [landingIdeaLoading, setLandingIdeaLoading] = useState(false)
  const [landingIdeaResult, setLandingIdeaResult] = useState(null)
  const [showIdeaOnMapLanding, setShowIdeaOnMapLanding] = useState(true)
  const [ideaJurisdictionTab, setIdeaJurisdictionTab] = useState('all')

  // Sample prompt chips for Idea Analyzer
  const sampleIdeaPrompts = [
    'An AI system that detects brain tumors from MRI scans and generates 3D volumetric visualization.',
    'Perovskite-silicon tandem solar cell with self-healing polymer protective layer and automated defect passivation.',
    'Quantum key distribution protocol using entangled photon orbital angular momentum for optical networks.',
    'Autonomous drone system with multispectral vision and edge AI for precision agricultural weed detection.'
  ]

  // Fetch real patent cluster summary & real patents on mount
  useEffect(() => {
    let isMounted = true
    async function loadRealData() {
      try {
        const [clusterRes, patentsRes] = await Promise.allSettled([
          patentService.getPatentClusters(null, 50),
          patentService.searchPatents('', null, null, 50)
        ])
        if (isMounted) {
          if (clusterRes.status === 'fulfilled' && clusterRes.value) {
            setClustersData(clusterRes.value)
            if (clusterRes.value.total_patents) setLivePatentCount(clusterRes.value.total_patents)
          }
          if (patentsRes.status === 'fulfilled' && patentsRes.value?.patents) {
            setRealPatents(patentsRes.value.patents)
          }
        }
      } catch (err) {
        console.warn('Landing page patent data load fallback:', err)
      }
    }
    loadRealData()
    return () => { isMounted = false }
  }, [])

  // Scroll reveal observer & Scroll-spy tracker
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )

    const revealElements = document.querySelectorAll('.reveal-on-scroll')
    revealElements.forEach((el) => observer.observe(el))

    const sectionIds = [
      'home',
      'how-it-works',
      'research',
      'personalization',
      'funding',
      'idea-funding',
      'patents',
      'innovation-mapping',
      'platform',
      'features',
      'about'
    ]

    const handleScroll = () => {
      if (window.scrollY > 350) {
        setShowBackToTop(true)
      } else {
        setShowBackToTop(false)
      }

      // Scroll spy
      const scrollPos = window.scrollY + 220
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i])
        if (el && el.offsetTop <= scrollPos) {
          setActiveSectionId(sectionIds[i])
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Mouse parallax handler for hero section
  const handleMouseMove = (e) => {
    if (!heroRef.current || window.innerWidth < 1024) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMouseParallax({ x: x * 8, y: y * 8 })
  }

  const handleMouseLeave = () => {
    setMouseParallax({ x: 0, y: 0 })
  }

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle patent search suggestion debounce
  useEffect(() => {
    if (!patentSearchQuery || patentSearchQuery.trim().length < 2) {
      setPatentSuggestions([])
      setSuggestionsOpen(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await patentService.getPatentSuggestions(patentSearchQuery.trim(), 4)
        if (res && res.suggestions) {
          setPatentSuggestions(res.suggestions)
          setSuggestionsOpen(res.suggestions.length > 0)
        }
      } catch {
        setPatentSuggestions([])
      }
    }, 220)
    return () => clearTimeout(timer)
  }, [patentSearchQuery])

  function handlePatentSearchSubmit(e) {
    e?.preventDefault()
    setSuggestionsOpen(false)
  }

  // Handle Idea Analysis on Landing
  async function handleAnalyzeLandingIdea(e) {
    if (e) e.preventDefault()
    if (!landingIdeaText.trim() || landingIdeaText.trim().length < 10) return
    try {
      setLandingIdeaLoading(true)
      const res = await patentService.analyzePatentIdea(landingIdeaText.trim(), {
        focusCountry: 'all',
        minSimilarity: 0.0,
        limit: 15
      })
      setLandingIdeaResult(res)
    } catch (err) {
      console.error('Landing idea analysis error:', err)
    } finally {
      setLandingIdeaLoading(false)
    }
  }

  // Handle Map Patent Selection on Landing
  async function handleSelectPatentLanding(patent) {
    setSelectedPatentLanding(patent)
    if (patent) {
      const targetId = patent.id ?? patent.patent_id
      if (targetId) {
        try {
          setSimilarityLoadingLanding(true)
          const data = await patentService.getSimilarPatents(targetId, 5)
          setSimilarDataLanding(data)
        } catch (e) {
          console.error('Landing similarity load error:', e)
        } finally {
          setSimilarityLoadingLanding(false)
        }
      }
    } else {
      setSimilarDataLanding(null)
    }
  }

  // Navigation indicator items
  const navIndicatorSections = [
    { id: 'how-it-works', label: '01 Methodology', tag: 'Pipeline' },
    { id: 'research', label: '02 Literature', tag: 'Discovery' },
    { id: 'personalization', label: '03 Personalization', tag: 'Profiles' },
    { id: 'funding', label: '04 Funding', tag: 'Grants' },
    { id: 'idea-funding', label: '05 Idea Analyzer', tag: 'Innovation' },
    { id: 'patents', label: '06 Patent Landscape', tag: '3D WebGL' },
    { id: 'innovation-mapping', label: '07 Technology Triad', tag: 'Ecosystem' },
    { id: 'platform', label: '08 Platform Hub', tag: 'Explore' },
    { id: 'features', label: '09 Capabilities', tag: 'Verified' },
    { id: 'about', label: '10 Ecosystem', tag: 'Community' },
  ]

  // 5 Radial Nodes around Central "Research Intelligence" Engine in Hero Visual
  const heroEcosystemNodes = [
    {
      id: 'research',
      targetId: 'research',
      label: 'Research',
      tag: 'Literature Intelligence',
      icon: '📚',
      posClass: 'node-top',
      expandedPos: 'expanded-top',
      info: 'Search across ArXiv, PubMed, and CrossRef with instant query ingestion and full metadata extraction.'
    },
    {
      id: 'funding',
      targetId: 'funding',
      label: 'Funding',
      tag: 'Semantic Grant Matching',
      icon: '💰',
      posClass: 'node-top-right',
      expandedPos: 'expanded-top-right',
      info: 'Match active government and international calls (ANRF, BIRAC, MeitY, DST, ICMR) with explainable relevance scores.'
    },
    {
      id: 'patents',
      targetId: 'patents',
      label: 'Patents',
      tag: 'Landscape & Clusters',
      icon: '🔬',
      posClass: 'node-bot-right',
      expandedPos: 'expanded-bot-right',
      info: 'Explore European Patent Office records, 384D semantic embeddings, and 3D/2D PCA cluster maps.'
    },
    {
      id: 'technology',
      targetId: 'innovation-mapping',
      label: 'Technology',
      tag: 'Innovation Mapping',
      icon: '⚡',
      posClass: 'node-bot-left',
      expandedPos: 'expanded-bot-left',
      info: 'Synthesize research literature, available funding capital, and patent frontiers into commercialization vectors.'
    },
    {
      id: 'insights',
      targetId: 'research',
      label: 'AI Insights',
      tag: 'Methodology & Gaps',
      icon: '🧠',
      posClass: 'node-top-left',
      expandedPos: 'expanded-top-left',
      info: 'Decompose complex scientific papers into research problems, architectures, findings, limitations, and future directions.'
    }
  ]

  // How It Works 5-Step Process with Deep Details for Interactive Accordion
  const howItWorksSteps = [
    {
      num: '01',
      title: 'Create Your Research Profile',
      desc: 'Define your research domain, specializations, technical keywords, publications, and patents to establish your unique academic fingerprint.',
      icon: '👤',
      details: 'Your calibrated profile parameters serve as the vector anchor for TF-IDF grant relevance calculations and contextual literature discovery recommendations.'
    },
    {
      num: '02',
      title: 'Explore Research Literature',
      desc: 'Query peer-reviewed papers across ArXiv, PubMed, and CrossRef with multi-source filtering and instant abstract imports.',
      icon: '🔎',
      details: 'Ingests peer-reviewed preprints and journal articles directly into your isolated workspace with automated title, author, DOI, and abstract normalization.'
    },
    {
      num: '03',
      title: 'Discover Relevant Funding',
      desc: 'Match your profile against national and global grant calls with transparent relevance scores and grounded keyword overlap.',
      icon: '🎯',
      details: 'Computes cosine similarity against active ANRF, BIRAC, MeitY, DST, and ICMR calls with explainable factor breakdowns and deadline tracking.'
    },
    {
      num: '04',
      title: 'Understand the Patent Landscape',
      desc: 'Explore existing patent records, dense vector embeddings, and 3D/2D semantic maps to identify technology clusters and white-spaces.',
      icon: '🗺️',
      details: 'Embeds official European Patent Office texts into a 384D sentence-transformers space with K-Means clustering and interactive PCA projection.'
    },
    {
      num: '05',
      title: 'Generate Innovation Insights',
      desc: 'Connect research activity, grant capital, and intellectual property to uncover high-impact commercialization opportunities.',
      icon: '🚀',
      details: 'Integrates scientific literature, public grant capital, and protected prior art into strategic innovation vectors for academic and industry research.'
    }
  ]

  // AI Paper Analysis Dimensions
  const analysisDimensions = [
    { 
      id: 'problem', 
      label: 'Research Problem', 
      icon: '❓', 
      desc: 'Identifies the core scientific bottleneck, theoretical hurdle, or clinical challenge addressed by the authors.',
      sourceType: 'Extracted from publication abstract, introduction & problem formulations',
      aiOutput: 'Identifies non-trivial domain bottlenecks such as label scarcity in 3D medical MRI segmentation or high computational latency on edge neuromorphic processors.'
    },
    { 
      id: 'methodology', 
      label: 'Methodology & Architecture', 
      icon: '⚙️', 
      desc: 'Decomposes proposed algorithmic designs, experimental setups, neural architectures, and validation baselines.',
      sourceType: 'Extracted from technical design, architecture specifications & experimental framework',
      aiOutput: 'Synthesizes neural network structures (e.g. self-attention mechanisms, multi-scale residual graphs) alongside loss functions and training parameters.'
    },
    { 
      id: 'results', 
      label: 'Findings & Contributions', 
      icon: '📈', 
      desc: 'Synthesizes quantitative metrics, benchmark gains, and verified empirical outcomes.',
      sourceType: 'Extracted from empirical evaluations, benchmark tables & comparative results',
      aiOutput: 'Summarizes key accuracy improvements (e.g. +4.8% Dice similarity score), inference speedups, and verified domain contributions compared to state-of-the-art.'
    },
    { 
      id: 'limitations', 
      label: 'Limitations & Gaps', 
      icon: '⚠️', 
      desc: 'Surfaces acknowledged constraints, dataset boundaries, compute assumptions, and edge-case limitations.',
      sourceType: 'Extracted from author disclosures, error analyses & scope boundaries',
      aiOutput: 'Highlights operational boundaries: sensitivity to out-of-distribution motion artifacts, high pretraining energy cost, and demographic dataset skew.'
    },
    { 
      id: 'future', 
      label: 'Future Directions', 
      icon: '🚀', 
      desc: 'Maps open questions, next-phase experiments, and translational research vectors.',
      sourceType: 'Extracted from conclusion roadmap, unaddressed extensions & open questions',
      aiOutput: 'Surfaces recommended next-phase pathways: multi-modal clinical validation, zero-shot cross-sensor adaptation, and lightweight quantized deployment.'
    }
  ]

  // Real Patent Clusters representation for Landing Interactive Showcase
  const landingPatentClusters = useMemo(() => [
    {
      id: 0,
      label: 'Medical Imaging & AI',
      color: '#0d9488',
      count: 8,
      keywords: ['mri', 'segmentation', 'neural', 'tumor', 'lesion', 'medical'],
      representative: 'Deep Convolutional Network for Medical MRI Tumor Segmentation',
      intraSim: '0.412'
    },
    {
      id: 1,
      label: 'Autonomous LiDAR & Sensing',
      color: '#2563eb',
      count: 7,
      keywords: ['lidar', 'point cloud', 'sensor fusion', 'autonomous', 'vehicle', 'driving'],
      representative: 'Autonomous Vehicle Perception via Multi-Sensor Fusion',
      intraSim: '0.384'
    },
    {
      id: 2,
      label: 'Solid-State Battery Systems',
      color: '#059669',
      count: 6,
      keywords: ['solid-state', 'lithium', 'electrolyte', 'cathode', 'battery', 'cell'],
      representative: 'High-Energy Solid State Lithium Ion Battery Cell',
      intraSim: '0.428'
    },
    {
      id: 3,
      label: 'Quantum Cryptography Protocols',
      color: '#7c3aed',
      count: 5,
      keywords: ['qubit', 'superconducting', 'quantum key', 'cryptography', 'quantum'],
      representative: 'Quantum Key Distribution Network Protocol',
      intraSim: '0.395'
    },
    {
      id: 4,
      label: 'Solar Photovoltaic Cells',
      color: '#ea580c',
      count: 5,
      keywords: ['perovskite', 'photovoltaic', 'tandem', 'solar cell', 'solar'],
      representative: 'Solar Photovoltaic Cell with Perovskite Tandem Layer',
      intraSim: '0.389'
    },
    {
      id: 5,
      label: 'NLP & Attention Models',
      color: '#db2777',
      count: 4,
      keywords: ['transformer', 'attention', 'tokenization', 'embedding', 'sequence'],
      representative: 'Transformer Architecture for Contextual Tokenization',
      intraSim: '0.362'
    }
  ], [])

  // 2D Representative Points for Landing Page Semantic Map Preview
  const sampleMapPoints = useMemo(() => [
    { id: 'p1', title: 'Deep Convolutional Network for Medical MRI', clusterId: 0, x: 22, y: 35, num: 'EP 340192 A1', keywords: ['mri', 'segmentation', 'deep learning'] },
    { id: 'p2', title: 'Automated CT Scan Diagnostic System', clusterId: 0, x: 28, y: 28, num: 'EP 340193 A1', keywords: ['ct', 'scan', 'diagnostic', 'medical'] },
    { id: 'p3', title: '3D Brain Tumor Neural Boundary Segmenter', clusterId: 0, x: 18, y: 44, num: 'EP 340194 A1', keywords: ['brain', 'tumor', 'neural', 'segmenter'] },
    { id: 'p4', title: 'Autonomous Vehicle Multi-Sensor Fusion', clusterId: 1, x: 74, y: 26, num: 'EP 340201 A1', keywords: ['autonomous', 'vehicle', 'sensor', 'fusion'] },
    { id: 'p5', title: 'LiDAR Depth Estimation for Self-Driving', clusterId: 1, x: 82, y: 34, num: 'EP 340202 A1', keywords: ['lidar', 'depth', 'self-driving', 'sensing'] },
    { id: 'p6', title: 'Point Cloud Object Detector for Road Scene', clusterId: 1, x: 70, y: 40, num: 'EP 340203 A1', keywords: ['point cloud', 'detector', 'road', 'camera'] },
    { id: 'p7', title: 'High-Energy Solid State Lithium Ion Cell', clusterId: 2, x: 30, y: 78, num: 'EP 340301 A1', keywords: ['battery', 'solid state', 'lithium', 'energy'] },
    { id: 'p8', title: 'Fast-Charging Battery Composite Cathode', clusterId: 2, x: 38, y: 85, num: 'EP 340302 A1', keywords: ['battery', 'cathode', 'electrolyte', 'fast-charging'] },
    { id: 'p9', title: 'Quantum Key Distribution Network Protocol', clusterId: 3, x: 68, y: 76, num: 'EP 340401 A1', keywords: ['quantum', 'cryptography', 'key distribution', 'network'] },
    { id: 'p10', title: 'Superconducting Qubit Quantum Processor', clusterId: 3, x: 78, y: 82, num: 'EP 340402 A1', keywords: ['quantum', 'qubit', 'superconducting', 'processor'] },
    { id: 'p11', title: 'Solar Photovoltaic Cell with Perovskite', clusterId: 4, x: 48, y: 20, num: 'EP 340501 A1', keywords: ['solar', 'photovoltaic', 'perovskite', 'tandem'] },
    { id: 'p12', title: 'Transformer Model for Contextual Sequence', clusterId: 5, x: 52, y: 55, num: 'EP 340601 A1', keywords: ['transformer', 'attention', 'nlp', 'embedding'] },
  ], [])

  // Interactive Explore Hub Tabs Data
  const exploreHubData = {
    research: {
      title: 'Research Discovery & Intelligence',
      badge: 'Scientific Literature & Analysis',
      icon: '📚',
      desc: 'Search peer-reviewed literature across ArXiv, PubMed, and CrossRef. Ingest abstracts and decompose them into structured problem statements, methodologies, findings, limitations, and future directions with our 5-dimension AI breakdown.',
      features: ['Multi-Source Literature Ingestion', 'AI Paper Abstract Breakdown', 'Structured 5-Dimension Visualizer', 'Research Gap & Trend Detection'],
      link: user ? '/research-papers' : '/login',
      linkText: 'Explore Research Discovery →'
    },
    funding: {
      title: 'Funding Intelligence & Matching',
      badge: 'AI Grant Matching Engine',
      icon: '💰',
      desc: 'Align your researcher profile with active government calls (ANRF, BIRAC, MeitY, DST, ICMR, DRDO) and international grant opportunities. Review transparent TF-IDF relevance scores with explainable keyword intersections.',
      features: ['Real-Time Indian & Global Call Ingestion', 'Semantic Profile-to-Grant Matching', 'Grounded Explainable Match Factors', 'Persistent User Saved Grant Bookmarks'],
      link: user ? '/funding' : '/login',
      linkText: 'Explore Funding Intelligence →'
    },
    patents: {
      title: 'Patent Landscape Analysis',
      badge: 'EPO Embeddings & 3D/2D PCA Clusters',
      icon: '🔬',
      desc: 'Query real European Patent Office records. Generate 384-dimensional dense semantic vectors using sentence-transformers, optimize dynamic K-Means clustering, and explore the interactive 3D WebGL and 2D PCA Semantic Intelligence Landscape.',
      features: ['Real EPO LOD SPARQL Integration', 'sentence-transformers Dense Vector Space', '3D WebGL Spatial Projection & Controls', 'Dynamic K-Means Silhouette Optimization'],
      link: '/patents',
      linkText: 'Explore Patent Landscape →'
    },
    profile: {
      title: 'Researcher Profile Calibration',
      badge: 'Structured Research Identity',
      icon: '👤',
      desc: 'Calibrate the platform intelligence engine by specifying your research domains, specializations, technical keywords, publications, and patents to establish your unique institutional research fingerprint.',
      features: ['Domain & Specialization Fingerprinting', 'Publication & Patent Portfolio Sync', 'Dynamic Keyword & Focus Tuning', 'Isolated Multi-Tenant Security'],
      link: user ? '/profile' : '/login',
      linkText: 'Configure Research Profile →'
    },
    insights: {
      title: 'Strategic Innovation Insights',
      badge: 'Synthesis & Technology Forecasting',
      icon: '📊',
      desc: 'Synthesize research literature, available grant capital, and protected patent technologies into a cohesive innovation vector. Uncover strategic white-spaces where commercialization opportunities are highest.',
      features: ['Research vs. Patent Gap Analysis', 'Funding Deadline Tracking Dashboard', 'Technology Cluster Centrality Ranking', 'Actionable Differentiation Playbooks'],
      link: user ? '/dashboard' : '/login',
      linkText: 'Open Intelligence Dashboard →'
    }
  }

  // Professional Product Capabilities Grid
  const productCapabilities = [
    {
      title: 'Structured Research Profile',
      category: 'Research Identity',
      desc: 'Define your research domain, areas of specialization, active keywords, publications, and patents to calibrate personalized matching.',
      icon: '👤',
      link: user ? '/profile' : '/login'
    },
    {
      title: 'Multi-Source Paper Discovery',
      category: 'Literature Search',
      desc: 'Search and filter across ArXiv, PubMed, and CrossRef simultaneously with instant query imports into your workspace.',
      icon: '🔎',
      link: user ? '/research-papers' : '/login'
    },
    {
      title: 'AI Research Paper Analysis',
      category: 'Structured Intelligence',
      desc: 'Extract 5 structured dimensions from research papers: problem, methodology, empirical findings, limitations, and future vectors.',
      icon: '🧠',
      link: user ? '/research-papers' : '/login'
    },
    {
      title: 'Research Trends & Gap Detection',
      category: 'Literature Insights',
      desc: 'Uncover emerging scientific topics, recurring technical limitations, and unaddressed research opportunities across disciplines.',
      icon: '📈',
      link: user ? '/research-papers' : '/login'
    },
    {
      title: 'Semantic Funding Matching',
      category: 'Grant Intelligence',
      desc: 'Match researcher profiles against grant calls (ANRF, BIRAC, MeitY, DST, ICMR) using cosine similarity and keyword intersections.',
      icon: '🎯',
      link: user ? '/funding' : '/login'
    },
    {
      title: 'Grant Tracking & Deadlines',
      category: 'Funding Management',
      desc: 'Bookmark opportunities to your personal dashboard, track closing-soon application deadlines, and review eligibility criteria.',
      icon: '⏰',
      link: user ? '/funding' : '/login'
    },
    {
      title: 'Patent Landscape Intelligence',
      category: 'IP Intelligence',
      desc: 'Query authentic European Patent Office records with official publication links, applicant tracking, and classification mapping.',
      icon: '📜',
      link: '/patents'
    },
    {
      title: '3D Patent Semantic Landscape',
      category: 'WebGL Visual Vectors',
      desc: 'Visualize 384D sentence-transformer embeddings in interactive 3D PCA coordinate space with orbit controls and glowing idea projections.',
      icon: '🌐',
      link: '/patents'
    },
    {
      title: 'Check Your Innovation',
      category: 'Idea Intelligence',
      desc: 'Analyze custom research or startup ideas against real patent prior art, feature-level overlap matrices, and differentiation playbooks.',
      icon: '💡',
      link: '/patents'
    }
  ]

  // Innovation Triad Data
  const innovationTriadDetails = {
    research: {
      title: 'Scientific Research Literature',
      question: 'What is being studied?',
      desc: 'Maps exploratory hypotheses, academic preprints, peer-reviewed methodology, and empirical benchmark advancements.'
    },
    funding: {
      title: 'Funding Capital & Grants',
      question: 'Where can research receive support?',
      desc: 'Surfaces national R&D priorities, government grant schemes (ANRF, BIRAC, MeitY, DST, ICMR), and translational funding calls.'
    },
    technology: {
      title: 'Emerging Technologies',
      question: 'What technologies are emerging?',
      desc: 'Analyzes high-growth technological trajectories, cross-domain applications, and computational breakthroughs.'
    },
    patents: {
      title: 'Patent & IP Landscapes',
      question: 'What has already been developed or protected?',
      desc: 'Examines existing patent claims, competitive applicant portfolios, and protected prior art across technology domains.'
    },
    innovation: {
      title: 'Innovation Intelligence',
      question: 'Where can new opportunities emerge?',
      desc: 'Synthesizes scientific discovery, available capital, and patent frontiers into actionable commercialization vectors.'
    }
  }

  // Filtered Idea Patents for Landing Preview
  const filteredLandingIdeaPatents = useMemo(() => {
    if (!landingIdeaResult?.similar_patents) return []
    if (ideaJurisdictionTab === 'india') {
      return landingIdeaResult.similar_patents.filter(p => p.country === 'India')
    }
    if (ideaJurisdictionTab === 'global') {
      return landingIdeaResult.similar_patents.filter(p => p.country !== 'India')
    }
    return landingIdeaResult.similar_patents
  }, [landingIdeaResult, ideaJurisdictionTab])

  return (
    <div className="landing-container">
      {/* Background Ambient Intelligence Field */}
      <div className="ambient-intelligence-field" aria-hidden="true">
        <div className="ambient-blob blob-1" />
        <div className="ambient-blob blob-2" />
        <div className="ambient-blob blob-3" />
        <div className="ambient-grid-overlay" />
      </div>

      {/* Floating Desktop Section Progress Indicator (Scroll-Spy) */}
      <nav className="desktop-section-progress-nav" aria-label="Page Sections Navigation">
        <div className="progress-nav-track">
          {navIndicatorSections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              className={`progress-nav-bullet ${activeSectionId === sec.id ? 'active' : ''}`}
              onClick={() => scrollToSection(sec.id)}
              aria-label={`Scroll to ${sec.label}`}
              title={sec.label}
            >
              <span className="bullet-dot" />
              <span className="bullet-label">{sec.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* =========================================================
          1. HERO SECTION – RESEARCH INTELLIGENCE ECOSYSTEM
          ========================================================= */}
      <section 
        className="landing-hero reveal-on-scroll is-visible" 
        id="home"
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className="hero-content hero-staggered-load"
          style={{
            transform: `translate3d(${mouseParallax.x * 0.2}px, ${mouseParallax.y * 0.2}px, 0)`
          }}
        >
          <div className="hero-badge hero-item-1">
            <span className="hero-badge-dot" />
            <span>AI-POWERED RESEARCH &amp; INNOVATION INTELLIGENCE</span>
          </div>

          <h1 className="hero-main-heading hero-item-2">
            From Research Discovery to <span className="text-gradient">Innovation Intelligence</span>
          </h1>

          <p className="hero-description hero-item-4">
            An enterprise-grade AI intelligence platform connecting scientific literature, government &amp; global funding calls, and 3D patent landscapes into actionable innovation vectors.
          </p>

          <div className="hero-actions hero-item-5">
            {user ? (
              <Link to="/dashboard" className="primary-btn hero-primary-btn">
                <span>Go to Dashboard</span>
                <svg className="btn-arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            ) : (
              <>
                <button type="button" onClick={() => scrollToSection('platform')} className="primary-btn hero-primary-btn">
                  <span>Explore Platform Capabilities</span>
                  <svg className="btn-arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
                <button type="button" onClick={() => scrollToSection('how-it-works')} className="secondary-btn hero-secondary-btn">
                  <span>See How It Works</span>
                </button>
              </>
            )}
          </div>

          <div className="hero-tags hero-item-6">
            <span className="hero-tag interactive-pill">🔬 Literature Discovery</span>
            <span className="hero-tag interactive-pill">🧠 AI Paper Analysis</span>
            <span className="hero-tag interactive-pill">🎯 Semantic Grant Matching</span>
            <span className="hero-tag interactive-pill">🌐 3D Patent Landscape</span>
            <span className="hero-tag interactive-pill">💡 Idea to Innovation</span>
          </div>
        </div>

        {/* CONNECTED RESEARCH INTELLIGENCE ECOSYSTEM (HERO VISUAL) */}
        <div 
          className="hero-visual"
          style={{
            transform: `translate3d(${-mouseParallax.x * 0.4}px, ${-mouseParallax.y * 0.4}px, 0)`
          }}
        >
          <div className={`network-card ${isEngineExpanded ? 'is-expanded' : ''} ${constellationActive ? 'constellation-active' : ''}`}>
            <div className="network-header">
              <div className="network-status-indicator">
                <span className="network-status-dot pulse" />
                <span className="network-status-text">AI Intelligence Engine &bull; Active</span>
              </div>
              <div className="network-header-actions">
                <button 
                  type="button" 
                  className={`constellation-toggle-btn ${constellationActive ? 'active' : ''}`}
                  onClick={() => setConstellationActive(!constellationActive)}
                  title="Toggle Intelligence Constellation"
                  aria-label="Toggle Intelligence Constellation"
                >
                  {constellationActive ? 'Constellation ✦' : 'Constellation ✧'}
                </button>
                <button 
                  type="button" 
                  className="engine-toggle-btn"
                  onClick={() => setIsEngineExpanded(!isEngineExpanded)}
                  title="Explore or condense graph nodes"
                  aria-label="Explore or condense graph nodes"
                >
                  {isEngineExpanded ? 'Condense ⤢' : 'Explore Intelligence ⤡'}
                </button>
              </div>
            </div>

            <div className={`network-nodes-container ${activeHoverNode ? `dim-others-${activeHoverNode}` : ''}`}>
              {/* Dynamic SVG Pulsing Connection Lines with Flowing Light Particles */}
              <svg className="network-lines-svg" viewBox="0 0 460 480">
                <line x1="230" y1="255" x2="230" y2="60" className={`graph-line ${activeHoverNode === 'research' ? 'highlight' : ''}`} />
                <line x1="230" y1="255" x2="385" y2="135" className={`graph-line ${activeHoverNode === 'funding' ? 'highlight' : ''}`} />
                <line x1="230" y1="255" x2="380" y2="425" className={`graph-line ${activeHoverNode === 'patents' ? 'highlight' : ''}`} />
                <line x1="230" y1="255" x2="80" y2="425" className={`graph-line ${activeHoverNode === 'technology' ? 'highlight' : ''}`} />
                <line x1="230" y1="255" x2="75" y2="135" className={`graph-line ${activeHoverNode === 'insights' ? 'highlight' : ''}`} />

                {/* Animated light particles flowing along connection lines */}
                <circle cx="230" cy="155" r="2.5" className="light-particle flow-to-center" />
                <circle cx="310" cy="195" r="2.5" className="light-particle delay-1 flow-from-center" />
                <circle cx="305" cy="340" r="2.5" className="light-particle delay-2 flow-to-center" />
                <circle cx="155" cy="340" r="2.5" className="light-particle delay-3 flow-from-center" />
                <circle cx="150" cy="195" r="2.5" className="light-particle delay-4 flow-to-center" />
              </svg>

              {/* Central Engine Node with Rotating Outer Ring and Pulse */}
              <div 
                className="node-item node-central breathing-glow"
                onClick={() => scrollToSection('home')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToSection('home') }}
                aria-label="Research Intelligence Engine - Core Hub"
              >
                <div className="central-rotating-ring" />
                <div className="central-inner-ring" />
                <strong>Research Intelligence</strong>
                <small>AI Intelligence Engine</small>
                <span className="live-status-pill">● Online</span>
              </div>

              {/* Surrounding Connected Interactive Nodes (5 Radial Directions) */}
              {heroEcosystemNodes.map((node) => (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  className={`node-item ${node.posClass} ${isEngineExpanded ? node.expandedPos : ''} ${activeHoverNode === node.id ? 'active-hover' : ''} ${activeHoverNode && activeHoverNode !== node.id ? 'node-dimmed' : ''}`}
                  onMouseEnter={() => setActiveHoverNode(node.id)}
                  onMouseLeave={() => setActiveHoverNode(null)}
                  onClick={() => scrollToSection(node.targetId)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') scrollToSection(node.targetId) }}
                  aria-label={`${node.label}: ${node.info}. Click to jump to section.`}
                >
                  <span className="node-icon-inline">{node.icon}</span>
                  <strong>{node.label}</strong>
                  <small>{node.tag}</small>
                </div>
              ))}
            </div>

            {/* Live Contextual Tooltip / Description Bar */}
            <div className="network-footer">
              {activeHoverNode ? (
                <span className="node-tooltip-text animated-fade">
                  {heroEcosystemNodes.find((n) => n.id === activeHoverNode)?.info}
                </span>
              ) : (
                <span className="default-footer-text">
                  Hover to inspect intelligence vectors or click to smoothly navigate sections
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          2. FEATURE: HOW IT WORKS (5-STEP INTERACTIVE PIPELINE)
          ========================================================= */}
      <section className="landing-section reveal-on-scroll" id="how-it-works">
        <div className="section-header">
          <p className="eyebrow">SYSTEMATIC METHODOLOGY</p>
          <h2 className="section-title">HOW RESEARCH INTELLIGENCE WORKS</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            A structured intelligence pipeline connecting research expertise with literature, funding, patents, and actionable innovation insights.
          </p>
        </div>

        {/* 01 -> 02 -> 03 -> 04 -> 05 Sequential Progress Flow Indicator */}
        <div className="how-progress-tracker" aria-hidden="true">
          {howItWorksSteps.map((step, idx) => (
            <div key={step.num} className="tracker-step-item">
              <button 
                type="button"
                className={`tracker-pill ${expandedStep === step.num ? 'active' : ''}`}
                onClick={() => setExpandedStep(expandedStep === step.num ? null : step.num)}
                aria-label={`View step ${step.num}`}
              >
                <span>{step.num}</span>
              </button>
              {idx < howItWorksSteps.length - 1 && <span className="tracker-line-connector" />}
            </div>
          ))}
        </div>

        <div className="how-it-works-grid">
          {howItWorksSteps.map((step) => {
            const isExpanded = expandedStep === step.num
            return (
              <div 
                key={step.num} 
                className={`how-card interactive-hover-card ${isExpanded ? 'is-step-expanded' : ''}`}
                onClick={() => setExpandedStep(isExpanded ? null : step.num)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedStep(isExpanded ? null : step.num) }}
                aria-expanded={isExpanded}
              >
                <div className="how-card-header">
                  <span className="how-icon">{step.icon}</span>
                  <span className="how-number">{step.num}</span>
                </div>
                <h3 className="how-title">{step.title}</h3>
                <p className="how-desc">{step.desc}</p>
                {isExpanded && (
                  <div className="how-card-deep-details animated-fade">
                    <span className="deep-details-tag">Workflow Detail</span>
                    <p>{step.details}</p>
                  </div>
                )}
                <div className="how-card-expand-prompt">
                  {isExpanded ? 'Show less ↑' : 'Click to inspect workflow ↓'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* =========================================================
          3. FEATURE: LITERATURE INTELLIGENCE & AI ANALYSIS
          ========================================================= */}
      <section className="landing-section intelligence-showcase reveal-on-scroll" id="research">
        <div className="section-header">
          <p className="eyebrow">LITERATURE INTELLIGENCE</p>
          <h2 className="section-title">DISCOVER THE RESEARCH THAT MATTERS</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Search, explore, and understand relevant research using intelligent discovery, AI-powered paper analysis, research trends, research gaps, and recommendations.
          </p>
        </div>

        {/* Paper -> Extraction -> AI Analysis -> Structured Insights Workflow Bar */}
        <div className="discovery-flow-banner">
          <div className="disc-flow-item">
            <span className="disc-num">1</span>
            <strong>Paper Ingestion</strong>
            <small>ArXiv, PubMed, CrossRef</small>
          </div>
          <div className="disc-arrow">→</div>
          <div className="disc-flow-item">
            <span className="disc-num">2</span>
            <strong>Text Extraction</strong>
            <small>Abstract &amp; Metadata</small>
          </div>
          <div className="disc-arrow">→</div>
          <div className="disc-flow-item">
            <span className="disc-num">3</span>
            <strong>AI Analysis</strong>
            <small>5-Dimension Parsing</small>
          </div>
          <div className="disc-arrow">→</div>
          <div className="disc-flow-item active-flow">
            <span className="disc-num">4</span>
            <strong>Structured Insights</strong>
            <small>Problem, Method &amp; Gaps</small>
          </div>
        </div>

        {/* AI Research Analysis Decomposed Dimension Showcase */}
        <div className="showcase-container">
          <div className="showcase-top-title-row">
            <div>
              <span className="badge-patent-tech">AI Paper Analysis</span>
              <h3 className="showcase-inner-heading">Understand Research in Minutes</h3>
              <p className="showcase-inner-sub">
                AI transforms complex scientific publications into structured insights: research problems, architectures, findings, limitations, and future directions.
              </p>
            </div>
            <Link to={user ? "/research-papers" : "/login"} className="primary-btn sm-btn">
              <span>Open Paper Analysis</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          <div className="showcase-nav-pills">
            {analysisDimensions.map((dim) => (
              <button
                key={dim.id}
                type="button"
                className={`showcase-pill ${activeAnalysisPill === dim.id ? 'active' : ''}`}
                onClick={() => setActiveAnalysisPill(dim.id)}
              >
                <span>{dim.icon}</span> {dim.label}
              </button>
            ))}
          </div>

          <div className="showcase-card">
            {analysisDimensions.map((dim) => {
              if (dim.id !== activeAnalysisPill) return null
              return (
                <div key={dim.id} className="showcase-detail">
                  <div className="showcase-header">
                    <span className="dimension-icon">{dim.icon}</span>
                    <div>
                      <h3>{dim.label}</h3>
                      <p>{dim.desc}</p>
                    </div>
                  </div>

                  <div className="source-vs-ai-grid">
                    <div className="provenance-box source-box">
                      <span className="provenance-tag">Source Information</span>
                      <p>{dim.sourceType}</p>
                    </div>
                    <div className="provenance-box ai-box">
                      <span className="provenance-tag ai-tag">AI-Generated Analysis</span>
                      <p>{dim.aiOutput}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="research-capabilities-row">
            <div className="res-cap-chip">📚 Research Paper Discovery</div>
            <div className="res-cap-chip">🔎 Smart Multi-Source Search</div>
            <div className="res-cap-chip">🧠 Methodology Decomposition</div>
            <div className="res-cap-chip">📈 Citation Trends</div>
            <div className="res-cap-chip">🔍 Research Gap Detection</div>
            <div className="res-cap-chip">🎯 Paper Recommendations</div>
            <Link to={user ? "/research-papers" : "/login"} className="btn-inline-explore">
              Explore Research Discovery →
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          4. FEATURE: RESEARCH PERSONALIZATION & TRENDS
          ========================================================= */}
      <section className="landing-section reveal-on-scroll" id="personalization">
        <div className="section-header">
          <p className="eyebrow">RESEARCH PERSONALIZATION &amp; TRENDS</p>
          <h2 className="section-title">BUILT AROUND YOUR RESEARCH</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            The platform uses your researcher profile to personalize literature discovery, identify emerging topic shifts, and surface high-relevance opportunities.
          </p>
        </div>

        <div className="profile-personalization-grid">
          {/* Profile Flow Card */}
          <div className="profile-flow-card interactive-hover-card">
            <div className="flow-card-header">
              <span className="flow-icon">👤</span>
              <h4>Researcher Profile Calibration</h4>
            </div>
            <p className="flow-card-sub">
              Your calibrated profile acts as a vector anchor for literature discovery and automated grant matching.
            </p>

            <div className="profile-steps-list">
              <div className="prof-step-item">
                <span className="prof-step-badge">1</span>
                <div>
                  <strong>Research Domain</strong>
                  <small>E.g. Computer Science, Biotechnology, Materials Science</small>
                </div>
              </div>
              <div className="prof-step-item">
                <span className="prof-step-badge">2</span>
                <div>
                  <strong>Research Areas &amp; Specializations</strong>
                  <small>E.g. Medical Imaging, Deep Learning, Battery Electrolytes</small>
                </div>
              </div>
              <div className="prof-step-item">
                <span className="prof-step-badge">3</span>
                <div>
                  <strong>Keywords &amp; Interests</strong>
                  <small>E.g. Diagnostic MRI, Segmentation, Solid-State Cathodes</small>
                </div>
              </div>
              <div className="prof-step-item active-prof-step">
                <span className="prof-step-badge">4</span>
                <div>
                  <strong>Personalized Intelligence</strong>
                  <small>Automated grant matching, literature updates &amp; patent trends</small>
                </div>
              </div>
            </div>

            <Link to={user ? "/profile" : "/login"} className="btn-profile-cta">
              Configure Research Profile →
            </Link>
          </div>

          {/* Research Trends & Gaps Card */}
          <div className="trends-showcase-card interactive-hover-card">
            <div className="flow-card-header">
              <span className="flow-icon">📈</span>
              <h4>See Where Research Is Moving</h4>
            </div>
            <p className="flow-card-sub">
              Analyze research activity to identify emerging topics, recurring limitations, and potential research gaps.
            </p>

            <div className="trends-metrics-box">
              <div className="trend-item">
                <span className="trend-label">Active Research Vectors</span>
                <strong>Deep Learning in Diagnostic Radiology</strong>
                <div className="trend-bar-track">
                  <div className="trend-bar-fill" style={{ width: '82%' }} />
                </div>
              </div>
              <div className="trend-item">
                <span className="trend-label">Common Scientific Bottleneck</span>
                <strong>High Pretraining Compute &amp; Dataset Annotation Costs</strong>
                <div className="trend-bar-track">
                  <div className="trend-bar-fill warning" style={{ width: '68%' }} />
                </div>
              </div>
              <div className="trend-item">
                <span className="trend-label">Identified Research Gap</span>
                <strong>Cross-Modality Generalization to Rare Pathologies</strong>
                <div className="trend-bar-track">
                  <div className="trend-bar-fill teal" style={{ width: '91%' }} />
                </div>
              </div>
            </div>

            <div className="trends-footer-note">
              <small>💡 Derived from structured abstract decompositions across indexed scientific literature.</small>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          5. FEATURE: FUNDING DISCOVERY & SEMANTIC MATCHING
          ========================================================= */}
      <section className="landing-section funding-showcase reveal-on-scroll" id="funding">
        <div className="section-header">
          <p className="eyebrow">FUNDING INTELLIGENCE</p>
          <h2 className="section-title">FIND FUNDING THAT FITS YOUR RESEARCH</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Discover relevant funding opportunities from connected sources and match them to your research using semantic intelligence.
          </p>
        </div>

        {/* Semantic Matching Flow: Profile -> Areas -> Keywords -> Semantic Matching -> Relevant Funding */}
        <div className="funding-flow-stages-bar" aria-hidden="true">
          <span className="flow-stage-chip" title="Profile provides research domain and active interests">Research Profile</span>
          <span className="flow-arrow">→</span>
          <span className="flow-stage-chip" title="Specialized sub-disciplines extracted">Research Areas</span>
          <span className="flow-arrow">→</span>
          <span className="flow-stage-chip" title="Core technical terms and methodology tokens">Keywords</span>
          <span className="flow-arrow">→</span>
          <span className="flow-stage-chip active-match-chip" title="Cosine similarity across grant call descriptions">⚡ Semantic Matching</span>
          <span className="flow-arrow">→</span>
          <span className="flow-stage-chip" title="Ranked funding opportunities with explainable overlap">Relevant Funding</span>
        </div>

        {/* AI Semantic Funding Matching Showcase */}
        <div className="funding-example-layout">
          {/* Profile Signals Card */}
          <div className="example-profile-card interactive-hover-card">
            <div className="example-badge">Researcher Profile Signals</div>
            <h4 className="example-title">Dr. Rajesh Varma</h4>
            <p className="example-sub">Department of Computer Science &bull; IIT Delhi</p>

            <div className="signal-group">
              <label>Research Domain</label>
              <div className="signal-tag domain">Artificial Intelligence &amp; Healthcare</div>
            </div>

            <div className="signal-group">
              <label>Research Areas</label>
              <div className="signal-tag">Medical Image Processing</div>
              <div className="signal-tag">Deep Learning</div>
            </div>

            <div className="signal-group">
              <label>Specialized Keywords</label>
              <div className="signal-chips">
                <span className="chip">Biomedical AI</span>
                <span className="chip">Diagnostic MRI</span>
                <span className="chip">Radiomics</span>
              </div>
            </div>
          </div>

          <div className="match-engine-connector" title="Semantic similarity identifies conceptually related opportunities.">
            <div className="connector-icon pulse-glow">⚡</div>
            <span>AI Semantic Matching</span>
            <small>Cosine Vector Alignment</small>
            <span className="demo-disclaimer-pill">
              AI-assisted match score calculation
            </span>
          </div>

          {/* Resulting Match Card */}
          <div className="example-opportunity-card interactive-hover-card">
            <div className="example-badge success">Example Matched Grant Call</div>
            <div className="opp-header">
              <span className="opp-agency">ICMR &bull; Indian Council of Medical Research</span>
              <span className="match-percentage">89% Match</span>
            </div>
            <h4 className="opp-title">Artificial Intelligence in Biomedical Imaging &amp; Early Diagnostics</h4>
            <p className="opp-desc">Call for translational research proposals deploying deep learning algorithms for radiological diagnostics and imaging biomarkers in Indian clinical settings.</p>
            
            <div className="opp-reasons">
              <strong>Verified Match Factors:</strong>
              <ul>
                <li>✓ Direct domain alignment with <em>Artificial Intelligence &amp; Healthcare</em></li>
                <li>✓ Intersecting technical keywords: <code>Biomedical AI</code>, <code>Diagnostic MRI</code></li>
                <li>✓ Research area correlation with <em>Medical Image Processing</em></li>
              </ul>
            </div>

            <div className="opp-footer">
              <span className="opp-amount">Funding: ₹50 Lakhs - ₹1.5 Crore</span>
              <span className="opp-deadline">Agency: ICMR / India</span>
            </div>
          </div>
        </div>

        {/* Funding Management Capabilities Row */}
        <div className="funding-management-row">
          <div className="management-pill-card">
            <span className="mgmt-icon">🔖</span>
            <div>
              <strong>Save Opportunities</strong>
              <small>Bookmark calls to personal dashboard</small>
            </div>
          </div>
          <div className="management-pill-card">
            <span className="mgmt-icon">⏰</span>
            <div>
              <strong>Track Deadlines</strong>
              <small>Closing-soon alert reminders</small>
            </div>
          </div>
          <div className="management-pill-card">
            <span className="mgmt-icon">✅</span>
            <div>
              <strong>Eligibility Assessment</strong>
              <small>Review criteria &amp; guidelines</small>
            </div>
          </div>
          <div className="management-pill-card">
            <span className="mgmt-icon">🔗</span>
            <div>
              <strong>Official Links</strong>
              <small>Direct portal application links</small>
            </div>
          </div>
          <Link to={user ? "/funding" : "/login"} className="btn-funding-explore">
            Explore Funding Intelligence →
          </Link>
        </div>
      </section>

      {/* =========================================================
          6. NEW FEATURE: TURN AN IDEA INTO AN INTELLIGENCE REPORT
          ========================================================= */}
      <section className="landing-section idea-funding-section reveal-on-scroll" id="idea-funding">
        <div className="section-header">
          <p className="eyebrow">IDEA TO FUNDING &amp; INNOVATION</p>
          <h2 className="section-title">TURN AN IDEA INTO AN INTELLIGENCE REPORT</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Describe your research, product, or startup concept and discover related grant opportunities, funding suitability, and potential innovation gaps.
          </p>
        </div>

        <div className="idea-funding-card">
          {/* Conceptual Flow Diagram */}
          <div className="idea-flow-track">
            <div className="idea-flow-node active">
              <span className="idea-flow-num">1</span>
              <strong>YOUR IDEA</strong>
              <small>Concept Description</small>
            </div>
            <span className="idea-flow-arrow">→</span>
            <div className="idea-flow-node">
              <span className="idea-flow-num">2</span>
              <strong>AI IDEA ANALYSIS</strong>
              <small>Concept Extraction</small>
            </div>
            <span className="idea-flow-arrow">→</span>
            <div className="idea-flow-node">
              <span className="idea-flow-num">3</span>
              <strong>DOMAIN &amp; KEYWORDS</strong>
              <small>Vector Space Expansion</small>
            </div>
            <span className="idea-flow-arrow">→</span>
            <div className="idea-flow-node">
              <span className="idea-flow-num">4</span>
              <strong>SEMANTIC MATCH</strong>
              <small>Cosine Vector Ranking</small>
            </div>
            <span className="idea-flow-arrow">→</span>
            <div className="idea-flow-node active-target">
              <span className="idea-flow-num">5</span>
              <strong>RELEVANT FUNDING</strong>
              <small>Suitability &amp; Gaps</small>
            </div>
          </div>

          {/* Interactive Idea Input Tester */}
          <div className="idea-tester-grid">
            <div className="idea-input-box">
              <div className="idea-input-header">
                <span className="idea-sparkle">💡</span>
                <div>
                  <h4>Test Your Concept Idea</h4>
                  <small>Enter a research or startup idea to inspect conceptual alignment</small>
                </div>
              </div>

              <form onSubmit={handleAnalyzeLandingIdea} className="landing-idea-form">
                <textarea
                  className="landing-idea-textarea"
                  rows="3"
                  placeholder="Describe your research, product, or startup idea... (e.g. An AI system that detects brain tumors from MRI scans and automatically generates a 3D visualization.)"
                  value={landingIdeaText}
                  onChange={(e) => setLandingIdeaText(e.target.value)}
                />

                <div className="sample-chips-row">
                  <span className="sample-label">Try an example:</span>
                  {sampleIdeaPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="sample-idea-chip"
                      onClick={() => setLandingIdeaText(p)}
                    >
                      ✦ {p.slice(0, 42)}...
                    </button>
                  ))}
                </div>

                <div className="idea-action-row">
                  <button
                    type="submit"
                    className="primary-btn btn-analyze-idea"
                    disabled={landingIdeaLoading || landingIdeaText.trim().length < 10}
                  >
                    {landingIdeaLoading ? (
                      <>
                        <span className="spinner-mini" />
                        <span>Analyzing Idea Vectors...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Analyze My Idea</span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </>
                    )}
                  </button>

                  <Link to="/patents" className="btn-open-full-analyzer">
                    Open Full Patent Idea Analyzer →
                  </Link>
                </div>
              </form>
            </div>

            {/* Live Preview of Idea Analysis Output */}
            <div className="idea-output-preview-card">
              <div className="preview-top-badge">
                <span className="badge-patent-tech">AI Idea Breakdown</span>
                <span className="disclaimer-mini-tag">AI-assisted recommendation</span>
              </div>

              {landingIdeaResult ? (
                <div className="landing-idea-results animated-fade">
                  <div className="idea-concept-summary">
                    <div className="concept-tag-item">
                      <label>Identified Domain</label>
                      <strong>{landingIdeaResult.idea_analysis.domain}</strong>
                    </div>
                    <div className="concept-tag-item">
                      <label>Matched Records</label>
                      <strong>{landingIdeaResult.search_summary.total_matches} related documents</strong>
                    </div>
                  </div>

                  <div className="idea-components-list">
                    <label>Extracted Technical Components:</label>
                    <div className="components-tags">
                      {landingIdeaResult.idea_analysis.technical_components?.map((c, i) => (
                        <span key={i} className="comp-pill">{c}</span>
                      ))}
                    </div>
                  </div>

                  {landingIdeaResult.similar_patents?.length > 0 && (
                    <div className="idea-top-match-callout">
                      <span className="match-callout-badge">
                        Top Related Prior Art &bull; {landingIdeaResult.similar_patents[0].similarity_percentage}% Similarity
                      </span>
                      <h5>{landingIdeaResult.similar_patents[0].title}</h5>
                      <small>Pub: {landingIdeaResult.similar_patents[0].publication_number} &bull; {landingIdeaResult.similar_patents[0].country}</small>
                    </div>
                  )}

                  <div className="idea-results-footer">
                    <Link to="/patents" className="btn-view-landscape-action">
                      View Projected in 3D Semantic Landscape →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="idea-empty-state">
                  <div className="empty-sparkle-icon">🧠</div>
                  <h4>Instant Innovation Vector Synthesis</h4>
                  <p>
                    Enter your concept above to extract structured components, identify potential funding schemes, match prior art, and discover differentiation white-spaces.
                  </p>
                  <div className="empty-signals-row">
                    <span>✓ Domain Classification</span>
                    <span>✓ Potential Prior-Art Overlap</span>
                    <span>✓ Differentiation Gaps</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          7. FEATURE: PATENT LANDSCAPE & 3D SEMANTIC MAP
          ========================================================= */}
      <section className="landing-section patent-showcase reveal-on-scroll" id="patents">
        <div className="section-header">
          <p className="eyebrow">PATENT LANDSCAPE INTELLIGENCE</p>
          <h2 className="section-title">SEE THE TECHNOLOGY LANDSCAPE</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Explore patent relationships, discover semantic technology clusters, identify existing innovation, and understand potential technology gaps.
          </p>
        </div>

        {/* 7A. Machine Learning Vector Pipeline */}
        <div className="patent-pipeline-card">
          <div className="pipeline-card-header">
            <div className="pipeline-title-group">
              <span className="badge-patent-tech">Scientific ML Vector Pipeline</span>
              <h4>High-Dimensional PCA Semantic Projection</h4>
            </div>
            <p className="pipeline-subnote">
              Patents with similar technological meaning appear closer together in the 384-dimensional dense sentence embedding space.
            </p>
          </div>

          <div className="pipeline-steps-track">
            <div className="pipe-step">
              <div className="pipe-step-num">01</div>
              <div className="pipe-step-box">
                <span className="pipe-icon">📜</span>
                <strong>Real Patent Data</strong>
                <small>EPO SPARQL linked data</small>
              </div>
            </div>
            <div className="pipe-arrow">→</div>

            <div className="pipe-step">
              <div className="pipe-step-num">02</div>
              <div className="pipe-step-box">
                <span className="pipe-icon">🧬</span>
                <strong>MiniLM Embeddings</strong>
                <small>384D dense vector space</small>
              </div>
            </div>
            <div className="pipe-arrow">→</div>

            <div className="pipe-step">
              <div className="pipe-step-num">03</div>
              <div className="pipe-step-box">
                <span className="pipe-icon">⚡</span>
                <strong>Cosine Similarity</strong>
                <small>Pairwise metric tensors</small>
              </div>
            </div>
            <div className="pipe-arrow">→</div>

            <div className="pipe-step">
              <div className="pipe-step-num">04</div>
              <div className="pipe-step-box">
                <span className="pipe-icon">🧩</span>
                <strong>K-Means Clustering</strong>
                <small>Dynamic Silhouette Opt</small>
              </div>
            </div>
            <div className="pipe-arrow">→</div>

            <div className="pipe-step">
              <div className="pipe-step-num">05</div>
              <div className="pipe-step-box active-box">
                <span className="pipe-icon">🌐</span>
                <strong>3D / 2D PCA Landscape</strong>
                <small>Interactive WebGL Map</small>
              </div>
            </div>
          </div>
        </div>

        {/* 7B. Interactive 3D / 2D Semantic Intelligence Map Showcase */}
        <div className="landing-patent-map-preview">
          <div className="map-preview-header">
            <div>
              <div className="map-preview-badge-row">
                <span className="live-status-pill">● EPO LOD Verified</span>
                <span className="patent-count-tag">{livePatentCount} Real Database Patents</span>
                <span className="model-tag">384-d all-MiniLM-L6-v2</span>
              </div>
              <h3 className="map-preview-title">Explore Technologies by Semantic Meaning</h3>
              <p className="map-preview-sub">
                Interactive spatial visualization of real European Patent Office records projected along principal component axes (PC1, PC2, PC3).
              </p>
            </div>

            <div className="landing-view-mode-toggle">
              <button
                type="button"
                className={`view-btn ${patentViewMode === '3d' ? 'active' : ''}`}
                onClick={() => setPatentViewMode('3d')}
              >
                🌐 3D WebGL View
              </button>
              <button
                type="button"
                className={`view-btn ${patentViewMode === '2d' ? 'active' : ''}`}
                onClick={() => setPatentViewMode('2d')}
              >
                🗺️ 2D PCA View
              </button>
            </div>
          </div>

          {/* Render Real 3D WebGL / 2D Map */}
          <div className="landing-map-viewport-container">
            {patentViewMode === '3d' ? (
              <div className="landing-3d-map-wrapper">
                <PatentSemanticMap3D
                  clustersData={clustersData}
                  patents={realPatents}
                  selectedPatent={selectedPatentLanding}
                  similarData={similarDataLanding}
                  similarityLoading={similarityLoadingLanding}
                  userIdeaData={landingIdeaResult}
                  showUserIdea={showIdeaOnMapLanding}
                  onToggleShowUserIdea={() => setShowIdeaOnMapLanding(!showIdeaOnMapLanding)}
                  viewMode={patentViewMode}
                  onToggleViewMode={setPatentViewMode}
                  onSelectPatent={handleSelectPatentLanding}
                  onResetView={() => {
                    setSelectedPatentLanding(null)
                    setSimilarDataLanding(null)
                  }}
                />
              </div>
            ) : (
              <div className="landing-2d-map-wrapper">
                <PatentSemanticMap
                  clustersData={clustersData}
                  patents={realPatents}
                  selectedPatent={selectedPatentLanding}
                  similarData={similarDataLanding}
                  similarityLoading={similarityLoadingLanding}
                  onSelectPatent={handleSelectPatentLanding}
                  onFindSimilar={handleSelectPatentLanding}
                  onResetView={() => {
                    setSelectedPatentLanding(null)
                    setSimilarDataLanding(null)
                  }}
                />
              </div>
            )}
          </div>

          {/* Map Footer Intelligence Summary */}
          <div className="map-preview-footer-insights">
            <div className="mini-insight-card">
              <span className="mini-label">Dominant Technology Cluster</span>
              <strong>{clustersData?.insights?.largest_cluster_label || 'Medical Imaging & AI (22.9%)'}</strong>
            </div>
            <div className="mini-insight-card">
              <span className="mini-label">Highest Intra-Cluster Cohesion</span>
              <strong>{clustersData?.insights?.most_cohesive_cluster_label || 'Solid-State Battery (0.428)'}</strong>
            </div>
            <div className="mini-insight-card">
              <span className="mini-label">Global Portfolio Cohesion</span>
              <strong>{clustersData?.insights?.average_portfolio_similarity ? `${(clustersData.insights.average_portfolio_similarity * 100).toFixed(1)}% Cosine` : '31.5% Cosine Similarity'}</strong>
            </div>
            <Link to="/patents" className="btn-full-landscape-cta">
              Open Full Patent Landscape →
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          8. TECHNOLOGY & INNOVATION MAPPING ECOSYSTEM
          ========================================================= */}
      <section className="landing-section innovation-mapping-section reveal-on-scroll" id="innovation-mapping">
        <div className="section-header">
          <p className="eyebrow">TECHNOLOGY &amp; INNOVATION MAPPING</p>
          <h2 className="section-title">CONNECT RESEARCH WITH INNOVATION</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Research shows what is being studied. Funding shows where support is available. Patents show what technologies already exist. Together, these signals uncover commercialization breakthroughs.
          </p>
        </div>

        {/* Dynamic Connected Visual Flow: Research, Funding, Patents feeding into central Innovation node */}
        <div className="triad-innovation-wrapper">
          <svg className="triad-flow-svg" viewBox="0 0 800 240" aria-hidden="true">
            <line x1="180" y1="120" x2="330" y2="120" className={`triad-flow-line ${activeInnovationNode === 'research' ? 'active' : ''}`} />
            <line x1="470" y1="120" x2="620" y2="70" className={`triad-flow-line ${activeInnovationNode === 'funding' ? 'active' : ''}`} />
            <line x1="470" y1="120" x2="620" y2="170" className={`triad-flow-line ${activeInnovationNode === 'patents' ? 'active' : ''}`} />
            <circle cx="255" cy="120" r="3" className="triad-flow-particle flow-to-nexus" />
            <circle cx="545" cy="95" r="3" className="triad-flow-particle flow-from-funding" />
            <circle cx="545" cy="145" r="3" className="triad-flow-particle flow-from-patents" />
          </svg>

          <div className="triad-innovation-layout">
            <div 
              className={`triad-card ${activeInnovationNode === 'research' ? 'active-triad' : ''}`}
              onClick={() => setActiveInnovationNode('research')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveInnovationNode('research') }}
              aria-label="Research Literature. What is being studied?"
            >
              <span className="triad-badge">Scientific Inquiry</span>
              <div className="triad-icon">📚</div>
              <h4>Research Literature</h4>
              <p>Maps exploratory hypotheses, academic preprints, peer-reviewed methodology, and empirical benchmark advancements.</p>
              <span className="triad-question">"What is being studied?"</span>
            </div>

            <div className="triad-central-synthesis">
              <div 
                className={`triad-nexus-circle breathing-glow ${activeInnovationNode === 'innovation' ? 'active-nexus' : ''}`}
                onClick={() => setActiveInnovationNode('innovation')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveInnovationNode('innovation') }}
                aria-label="Innovation Nexus. Central Actionable Intelligence"
              >
                <span>⚡</span>
                <strong>INNOVATION</strong>
                <small>Actionable Intelligence</small>
              </div>
            </div>

            <div 
              className={`triad-card ${activeInnovationNode === 'funding' ? 'active-triad' : ''}`}
              onClick={() => setActiveInnovationNode('funding')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveInnovationNode('funding') }}
              aria-label="Funding Intelligence. Where is support available?"
            >
              <span className="triad-badge">Capital Allocation</span>
              <div className="triad-icon">💰</div>
              <h4>Funding Intelligence</h4>
              <p>Surfaces national R&amp;D priorities, government grant schemes (ANRF, BIRAC, MeitY), and translational capital.</p>
              <span className="triad-question">"Where is support available?"</span>
            </div>

            <div 
              className={`triad-card ${activeInnovationNode === 'patents' ? 'active-triad' : ''}`}
              onClick={() => setActiveInnovationNode('patents')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveInnovationNode('patents') }}
              aria-label="Patent Landscapes. What technologies already exist?"
            >
              <span className="triad-badge">Technology Art</span>
              <div className="triad-icon">🔬</div>
              <h4>Patent Landscapes</h4>
              <p>Analyzes protected technological architectures, competitive applicant portfolios, and existing prior art.</p>
              <span className="triad-question">"What technologies already exist?"</span>
            </div>
          </div>
        </div>

        {/* Dynamic Detail Callout for Selected Innovation Node */}
        <div className="innovation-detail-callout animated-fade">
          <div className="callout-header">
            <strong>{innovationTriadDetails[activeInnovationNode].title}</strong>
            <span className="callout-question">{innovationTriadDetails[activeInnovationNode].question}</span>
          </div>
          <p>{innovationTriadDetails[activeInnovationNode].desc}</p>
        </div>
      </section>

      {/* =========================================================
          9. INTERACTIVE "EXPLORE THE PLATFORM" HUB
          ========================================================= */}
      <section className="landing-section reveal-on-scroll" id="platform">
        <div className="section-header">
          <p className="eyebrow">INTERACTIVE PLATFORM HUB</p>
          <h2 className="section-title">EXPLORE ALL PLATFORM CAPABILITIES</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Select any capability to inspect its core features, computational workflows, and direct application routes.
          </p>
        </div>

        <div className="interactive-explore-hub">
          <div className="hub-nav-selector">
            <button
              type="button"
              className={`hub-nav-btn ${activeExploreTab === 'research' ? 'active' : ''}`}
              onClick={() => setActiveExploreTab('research')}
            >
              <span>📚</span> Research Discovery
            </button>
            <button
              type="button"
              className={`hub-nav-btn ${activeExploreTab === 'funding' ? 'active' : ''}`}
              onClick={() => setActiveExploreTab('funding')}
            >
              <span>💰</span> Funding Intelligence
            </button>
            <button
              type="button"
              className={`hub-nav-btn ${activeExploreTab === 'patents' ? 'active' : ''}`}
              onClick={() => setActiveExploreTab('patents')}
            >
              <span>🔬</span> Patent Intelligence
            </button>
            <button
              type="button"
              className={`hub-nav-btn ${activeExploreTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveExploreTab('profile')}
            >
              <span>👤</span> Researcher Profile
            </button>
            <button
              type="button"
              className={`hub-nav-btn ${activeExploreTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveExploreTab('insights')}
            >
              <span>📊</span> Strategic Insights
            </button>
          </div>

          <div className="hub-detail-panel">
            {exploreHubData[activeExploreTab] && (
              <div className="hub-panel-content animated-fade">
                <div className="hub-panel-top">
                  <span className="hub-icon-lg">{exploreHubData[activeExploreTab].icon}</span>
                  <div>
                    <span className="hub-badge">{exploreHubData[activeExploreTab].badge}</span>
                    <h3 className="hub-title">{exploreHubData[activeExploreTab].title}</h3>
                  </div>
                </div>
                <p className="hub-desc">{exploreHubData[activeExploreTab].desc}</p>

                <div className="hub-features-grid">
                  {exploreHubData[activeExploreTab].features.map((f, i) => (
                    <div key={i} className="hub-feature-item">
                      <span className="check-bullet">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <div className="hub-panel-action">
                  <Link to={exploreHubData[activeExploreTab].link} className="primary-btn hub-cta-btn">
                    <span>{exploreHubData[activeExploreTab].linkText}</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          10. ALL CAPABILITIES AT A GLANCE (VERIFIED CAPABILITIES)
          ========================================================= */}
      <section className="landing-section reveal-on-scroll" id="features">
        <div className="section-header">
          <p className="eyebrow">VERIFIED CAPABILITIES</p>
          <h2 className="section-title">INTELLIGENCE FOR THE FULL RESEARCH WORKFLOW</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Connected capabilities engineered across the platform to support modern research discovery, funding intelligence, patent analysis, and innovation workflows.
          </p>
        </div>

        <div className="features-grid">
          {productCapabilities.map((cap, i) => (
            <Link key={i} to={cap.link} className="feature-card interactive-hover-card clickable-card">
              <div className="feature-top">
                <span className="feature-icon-badge">{cap.icon}</span>
                <span className="feature-badge">{cap.category}</span>
              </div>
              <h3 className="feature-card-title">{cap.title}</h3>
              <p className="feature-card-desc">{cap.desc}</p>
              <div className="card-hover-arrow">Explore capability &rarr;</div>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================================
          11. TARGET AUDIENCE (BUILT FOR THE ECOSYSTEM)
          ========================================================= */}
      <section className="landing-section audience-section reveal-on-scroll" id="about">
        <div className="section-header">
          <p className="eyebrow">BUILT FOR THE ECOSYSTEM</p>
          <h2 className="section-title">EMPOWERING THE RESEARCH &amp; INNOVATION COMMUNITY</h2>
          <div className="section-title-line" />
          <p className="section-subtitle">
            Designed to empower the stakeholders driving scientific discovery, technology development, patent commercialization, and research funding.
          </p>
        </div>

        <div className="audience-grid">
          <div className="audience-card interactive-hover-card">
            <div className="audience-icon">🔬</div>
            <h3 className="audience-role">Researchers &amp; Faculty</h3>
            <p className="audience-desc">Build a structured research profile, discover scientific literature, extract AI insights, and match with domain-relevant funding calls.</p>
          </div>
          <div className="audience-card interactive-hover-card">
            <div className="audience-icon">🏛️</div>
            <h3 className="audience-role">Academic Institutions &amp; Labs</h3>
            <p className="audience-desc">Centralize department research profiles, track publications across repositories, and identify institutional grant opportunities.</p>
          </div>
          <div className="audience-card interactive-hover-card">
            <div className="audience-icon">🚀</div>
            <h3 className="audience-role">Startup Founders &amp; Innovators</h3>
            <p className="audience-desc">Discover biotech, deep-tech, and defense grants (BIRAC, MeitY, DRDO) to translate academic research into viable prototypes.</p>
          </div>
          <div className="audience-card interactive-hover-card">
            <div className="audience-icon">🏢</div>
            <h3 className="audience-role">R&amp;D Innovation Centers</h3>
            <p className="audience-desc">Explore multi-source literature, understand patent landscapes, and identify collaborative translational funding.</p>
          </div>
        </div>
      </section>

      {/* =========================================================
          12. FINAL CALL TO ACTION
          ========================================================= */}
      <section className="landing-cta-section reveal-on-scroll">
        <div className="cta-card">
          <p className="eyebrow cta-eyebrow">TRANSFORM RESEARCH INTO IMPACT</p>
          <h2 className="cta-heading">Your Research Is More Than a Paper.</h2>
          <p className="cta-description">
            Discover knowledge. Find opportunities. Understand technology. Turn research into innovation.
          </p>
          <div className="cta-actions">
            {user ? (
              <Link to="/dashboard" className="primary-btn cta-btn">
                <span>Go to Dashboard</span>
                <svg className="btn-arrow-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            ) : (
              <>
                <button type="button" onClick={() => scrollToSection('platform')} className="primary-btn cta-btn">
                  <span>Explore the Platform &rarr;</span>
                </button>
                <Link to="/register" className="secondary-btn cta-secondary-btn">
                  <span>Get Started Free</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          13. FOOTER
          ========================================================= */}
      <footer className="landing-footer reveal-on-scroll">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="brand">
              <span className="brand-mark">RI</span>
              <span className="brand-title">Research Intelligence</span>
            </Link>
            <p className="footer-tagline">
              AI-Powered Research, Funding &amp; Patent Landscape Intelligence Platform.
            </p>
          </div>

          <div className="footer-columns">
            <div className="footer-col">
              <h4>Platform</h4>
              <button type="button" onClick={() => scrollToSection('how-it-works')} className="footer-link">How It Works</button>
              <button type="button" onClick={() => scrollToSection('research')} className="footer-link">Research Discovery</button>
              <button type="button" onClick={() => scrollToSection('funding')} className="footer-link">Funding Intelligence</button>
              <button type="button" onClick={() => scrollToSection('idea-funding')} className="footer-link">Idea Analyzer</button>
              <button type="button" onClick={() => scrollToSection('patents')} className="footer-link">Patent Landscape</button>
            </div>

            <div className="footer-col">
              <h4>Capabilities</h4>
              <Link to="/profile" className="footer-link">Researcher Profile</Link>
              <Link to="/research-papers" className="footer-link">Literature Discovery</Link>
              <Link to="/funding" className="footer-link">Grant Matching</Link>
              <Link to="/patents" className="footer-link">Patent Landscape (3D/2D)</Link>
            </div>

            <div className="footer-col">
              <h4>Account</h4>
              {user ? (
                <>
                  <Link to="/dashboard" className="footer-link">Dashboard</Link>
                  <Link to="/profile" className="footer-link">My Profile</Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="footer-link">Sign In</Link>
                  <Link to="/register" className="footer-link">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-motto">Profile &bull; Literature &bull; Analysis &bull; Funding &bull; Patents &bull; Innovation</p>
          <p className="footer-copyright">&copy; {new Date().getFullYear()} Research Intelligence Platform. All rights reserved.</p>
        </div>
      </footer>

      {/* Back to top floating button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="back-to-top-btn"
          aria-label="Scroll back to top"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </div>
  )
}
