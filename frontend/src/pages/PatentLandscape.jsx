import { useEffect, useState, useMemo } from 'react'
import patentService from '../services/patentService'
import PatentSemanticMap from '../components/PatentSemanticMap'
import PatentSemanticMap3D from '../components/PatentSemanticMap3D'
import PatentDetailPanel from '../components/PatentDetailPanel'
import './PatentLandscape.css'

export default function PatentLandscape() {
  const [activeTab, setActiveTab] = useState('clusters') // 'clusters' | 'analyzer' | 'search'
  const [viewMode, setViewMode] = useState('3d') // '2d' | '3d'
  const [patents, setPatents] = useState([])
  const [clustersData, setClustersData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [clusteringLoading, setClusteringLoading] = useState(false)
  const [similarityLoading, setSimilarityLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [customClusterK, setCustomClusterK] = useState('')

  // Selected patent for Detail Panel & Map Similarity Connections
  const [selectedPatent, setSelectedPatent] = useState(null)
  const [similarData, setSimilarData] = useState(null)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false)

  // Full-screen modal for deep similarity explorer
  const [similarModalOpen, setSimilarModalOpen] = useState(false)
  const [expandedSimilarIds, setExpandedSimilarIds] = useState(new Set())

  function toggleExpandSimilar(id) {
    setExpandedSimilarIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // EPO Import state
  const [importKeyword, setImportKeyword] = useState('artificial intelligence')
  const [importLimit, setImportLimit] = useState(5)
  const [importLoading, setImportLoading] = useState(false)
  const [importMessage, setImportMessage] = useState(null)

  // Search filters
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('')

  // ============================================================
  // "Check Your Innovation" (AI Idea Analyzer) State
  // ============================================================
  const [ideaInput, setIdeaInput] = useState('')
  const [ideaLoading, setIdeaLoading] = useState(false)
  const [ideaError, setIdeaError] = useState(null)
  const [ideaResult, setIdeaResult] = useState(null)
  const [ideaCountryTab, setIdeaCountryTab] = useState('all') // 'all' | 'india' | 'global'
  const [showIdeaOnMap, setShowIdeaOnMap] = useState(true)

  const sampleIdeas = [
    'An AI system that detects brain tumors from MRI scans and automatically generates a 3D visualization of the tumor.',
    'Perovskite-silicon tandem solar cell with self-healing polymer protective layer and automated defect passivation.',
    'Quantum key distribution system using entangled photon orbital angular momentum for secure optical communications.',
  ]

  // Fetch initial patents and clusters
  useEffect(() => {
    loadPatents()
    loadClusters()
  }, [])

  async function loadPatents(keyword = '', domain = null) {
    try {
      setLoading(true)
      setError(null)
      const domainToUse = domain !== undefined ? domain : (selectedDomainFilter || null)
      const res = await patentService.searchPatents(keyword, domainToUse, null, 50)
      setPatents(res?.patents || [])
    } catch (err) {
      setError(err.message || 'Failed to load patents')
    } finally {
      setLoading(false)
    }
  }

  async function loadClusters(k = null) {
    try {
      setClusteringLoading(true)
      setError(null)
      const data = await patentService.getPatentClusters(k)
      setClustersData(data)
    } catch (err) {
      if (err.message?.includes('At least 2 patent records')) {
        setClustersData(null)
      } else {
        setError(err.message || 'Failed to load patent clusters')
      }
    } finally {
      setClusteringLoading(false)
    }
  }

  async function handleRunClustering() {
    try {
      setClusteringLoading(true)
      setError(null)
      const k = customClusterK ? Number.parseInt(customClusterK, 10) : null
      const data = await patentService.runPatentClustering(k)
      setClustersData(data)
    } catch (err) {
      setError(err.message || 'Failed to run clustering')
    } finally {
      setClusteringLoading(false)
    }
  }

  async function handleSelectPatentFromMap(patent) {
    setSelectedPatent(patent)
    if (patent) {
      setIsDetailDrawerOpen(true)
      try {
        setSimilarityLoading(true)
        const data = await patentService.getSimilarPatents(patent.id, 6)
        setSimilarData(data)
      } catch (err) {
        console.error('Similarity load error:', err)
      } finally {
        setSimilarityLoading(false)
      }
    } else {
      setIsDetailDrawerOpen(false)
      setSimilarData(null)
    }
  }

  async function handleFindSimilar(patent) {
    if (!patent) return
    const targetId = patent.id ?? patent.patent_id
    if (!targetId) {
      console.warn('handleFindSimilar called without a valid patent ID:', patent)
      return
    }
    const normalizedPatent = {
      ...patent,
      id: targetId,
      patent_id: targetId,
    }
    try {
      setSelectedPatent(normalizedPatent)
      setSimilarModalOpen(true)
      setSimilarityLoading(true)
      const data = await patentService.getSimilarPatents(targetId, 6)
      setSimilarData(data)
    } catch (err) {
      console.error('Find similar error:', err)
      setError(err.message || 'Failed to calculate patent similarity')
    } finally {
      setSimilarityLoading(false)
    }
  }

  async function handleImportEPO(e) {
    e.preventDefault()
    if (!importKeyword.trim()) return
    try {
      setImportLoading(true)
      setImportMessage(null)
      const res = await patentService.importPatents(importKeyword, importLimit)
      setImportMessage(`Imported ${res.inserted} new patents from EPO (${res.skipped} already in database).`)
      await loadPatents()
      await loadClusters()
    } catch (err) {
      setError(err.message || 'EPO import failed')
    } finally {
      setImportLoading(false)
    }
  }

  async function handleAnalyzeIdea(e) {
    if (e) e.preventDefault()
    if (!ideaInput.trim() || ideaInput.trim().length < 10) {
      setIdeaError('Please enter at least 10 characters describing your research or technology idea.')
      return
    }
    try {
      setIdeaLoading(true)
      setIdeaError(null)
      const res = await patentService.analyzePatentIdea(ideaInput.trim(), {
        focusCountry: 'all',
        minSimilarity: 0.0,
        limit: 30,
      })
      setIdeaResult(res)
    } catch (err) {
      setIdeaError(err.message || 'Failed to analyze your innovation idea. Please try again.')
    } finally {
      setIdeaLoading(false)
    }
  }

  // Consistent modern palette for clusters
  const clusterColors = useMemo(() => [
    '#0d9488', // Teal
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#db2777', // Pink/Rose
    '#d97706', // Amber
    '#059669', // Emerald
    '#ea580c', // Orange
    '#4f46e5', // Indigo
  ], [])

  // Filter similar patents by country tab
  const filteredIdeaPatents = useMemo(() => {
    if (!ideaResult?.similar_patents) return []
    if (ideaCountryTab === 'india') {
      return ideaResult.similar_patents.filter((p) => p.country === 'India')
    }
    if (ideaCountryTab === 'global') {
      return ideaResult.similar_patents.filter((p) => p.country !== 'India')
    }
    return ideaResult.similar_patents
  }, [ideaResult, ideaCountryTab])

  return (
    <div className="patent-landscape-page">
      {/* 1. Header Banner */}
      <section className="patent-header">
        <div className="patent-header-content">
          <div className="patent-title-group">
            <span className="badge-pill">IP &amp; Technology Intelligence</span>
            <h1>Patent Landscape &amp; Semantic Clustering</h1>
            <p className="subtitle">
              AI-driven semantic embedding representations, 3D/2D PCA spatial maps, cosine similarity matching, and interactive innovation idea analysis on real European Patent Office (EPO) records.
            </p>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-label">Total Real Patents</span>
              <strong className="stat-value">{patents.length}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">AI Technology Clusters</span>
              <strong className="stat-value">{clustersData?.number_of_clusters || 0}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Embedding Model</span>
              <strong className="stat-value small-text">{clustersData?.embedding_model || 'all-MiniLM-L6-v2'}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Spatial Projection</span>
              <strong className="stat-value score-text">3D / 2D PCA</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EPO Data Import Section */}
      <section className="epo-import-section">
        <form className="epo-import-form" onSubmit={handleImportEPO}>
          <div className="import-info">
            <span className="import-icon">🌐</span>
            <div>
              <strong>Import Real Patents from EPO (European Patent Office)</strong>
              <small>Seed database with live SPARQL linked-data records across technology domains</small>
            </div>
          </div>
          <div className="import-inputs">
            <input
              type="text"
              placeholder="e.g. quantum computing, medical imaging, solar battery"
              value={importKeyword}
              onChange={(e) => setImportKeyword(e.target.value)}
              className="import-search-input"
            />
            <select
              value={importLimit}
              onChange={(e) => setImportLimit(e.target.value)}
              className="import-limit-select"
            >
              <option value="3">3 Patents</option>
              <option value="5">5 Patents</option>
              <option value="10">10 Patents</option>
              <option value="20">20 Patents</option>
            </select>
            <button type="submit" className="btn-import" disabled={importLoading}>
              {importLoading ? 'Importing from EPO...' : 'Import Live Patents'}
            </button>
          </div>
        </form>
        {importMessage && <div className="success-banner">{importMessage}</div>}
      </section>

      {/* Error Alert */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'clusters' ? 'active' : ''}`}
          onClick={() => setActiveTab('clusters')}
        >
          🧩 3D &amp; 2D Semantic Landscape ({clustersData?.clusters?.length || 0} Clusters)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'analyzer' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyzer')}
        >
          💡 Check Your Innovation (AI Idea Analyzer)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          📄 Patent Database &amp; Similarity Explorer ({patents.length})
        </button>
      </div>

      {/* ============================================================ */}
      {/* Tab 1: 3D & 2D Semantic Landscape */}
      {/* ============================================================ */}
      {activeTab === 'clusters' && (
        <div className="clusters-container">
          {patents.length < 2 ? (
            <div className="empty-notice-card">
              <div className="empty-icon">📊</div>
              <h3>No Patent Embeddings Available</h3>
              <p>Patent embeddings and real records are required to generate the Semantic Landscape. Use the EPO importer above to seed records.</p>
            </div>
          ) : clusteringLoading ? (
            <div className="semantic-map-loading-skeleton">
              <div className="skeleton-pipeline">
                <span className="pulse-pill">✦ PREPARING PATENT INTELLIGENCE</span>
                <div className="skeleton-dots">
                  <span>●</span><span>●</span><span>●</span><span>●</span>
                </div>
                <p>Generating 384-d neural embeddings &amp; PCA projection coordinates...</p>
              </div>
            </div>
          ) : clustersData ? (
            <>
              {/* 3D vs 2D Semantic Map Selection */}
              {viewMode === '3d' ? (
                <PatentSemanticMap3D
                  clustersData={clustersData}
                  patents={patents}
                  clusterColors={clusterColors}
                  selectedPatent={selectedPatent}
                  similarData={similarData}
                  similarityLoading={similarityLoading}
                  userIdeaData={ideaResult}
                  showUserIdea={showIdeaOnMap}
                  onToggleShowUserIdea={() => setShowIdeaOnMap(!showIdeaOnMap)}
                  viewMode={viewMode}
                  onToggleViewMode={setViewMode}
                  onSelectPatent={handleSelectPatentFromMap}
                  onResetView={() => {
                    setSelectedPatent(null)
                    setSimilarData(null)
                  }}
                />
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.8rem' }}>
                    <div className="view-toggle-pill">
                      <button
                        type="button"
                        className={`view-toggle-btn ${viewMode === '2d' ? 'active' : ''}`}
                        onClick={() => setViewMode('2d')}
                      >
                        2D View
                      </button>
                      <button
                        type="button"
                        className={`view-toggle-btn ${viewMode === '3d' ? 'active' : ''}`}
                        onClick={() => setViewMode('3d')}
                      >
                        3D View
                      </button>
                    </div>
                  </div>
                  <PatentSemanticMap
                    clustersData={clustersData}
                    patents={patents}
                    clusterColors={clusterColors}
                    selectedPatent={selectedPatent}
                    similarData={similarData}
                    similarityLoading={similarityLoading}
                    onSelectPatent={handleSelectPatentFromMap}
                    onFindSimilar={handleFindSimilar}
                    onResetView={() => {
                      setSelectedPatent(null)
                      setSimilarData(null)
                    }}
                  />
                </div>
              )}

              {/* AI Patent Landscape Insights Card */}
              {clustersData.insights && (
                <div className="patent-insights-panel">
                  <div className="insights-header">
                    <div className="insights-title-group">
                      <span className="insights-badge">✦ AI STRATEGIC LANDSCAPE INSIGHTS</span>
                      <h3>Portfolio Intelligence &amp; Semantic Dynamics</h3>
                    </div>
                    <span className="insights-calc-tag">Derived from 384-d Neural Embedding Geometry</span>
                  </div>

                  <div className="insights-grid">
                    <div className="insight-card highlight-card">
                      <span className="insight-icon">🏆</span>
                      <div className="insight-content">
                        <span className="insight-label">Dominant Technology Cluster</span>
                        <strong className="insight-value">{clustersData.insights.largest_cluster_label}</strong>
                        <small>{clustersData.insights.largest_cluster_count} patents ({((clustersData.insights.largest_cluster_count / clustersData.total_patents) * 100).toFixed(1)}% portfolio share)</small>
                      </div>
                    </div>

                    <div className="insight-card">
                      <span className="insight-icon">🎯</span>
                      <div className="insight-content">
                        <span className="insight-label">Most Cohesive Cluster</span>
                        <strong className="insight-value">{clustersData.insights.most_cohesive_cluster_label}</strong>
                        <small>{(clustersData.insights.most_cohesive_cluster_similarity * 100).toFixed(1)}% average intra-cluster similarity</small>
                      </div>
                    </div>

                    <div className="insight-card">
                      <span className="insight-icon">🌐</span>
                      <div className="insight-content">
                        <span className="insight-label">Portfolio Global Cohesion</span>
                        <strong className="insight-value">{(clustersData.insights.average_portfolio_similarity * 100).toFixed(1)}%</strong>
                        <small>Cross-technology semantic correlation</small>
                      </div>
                    </div>

                    <div className="insight-card">
                      <span className="insight-icon">🏢</span>
                      <div className="insight-content">
                        <span className="insight-label">Active Assignees</span>
                        <strong className="insight-value">{clustersData.insights.total_unique_assignees} Organizations</strong>
                        <small>Across {clustersData.insights.emerging_technology_areas.length} core technology disciplines</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cluster Cards Grid */}
              <div className="cluster-grid">
                {clustersData.clusters.map((cluster, idx) => {
                  const color = clusterColors[idx % clusterColors.length]
                  return (
                    <div key={cluster.cluster_id} className="cluster-card" style={{ borderTop: `4px solid ${color}` }}>
                      <div className="cluster-card-header">
                        <div className="cluster-header-main">
                          <span className="cluster-id-badge" style={{ backgroundColor: `${color}18`, color }}>
                            Cluster #{cluster.cluster_id + 1}
                          </span>
                          <span className="cluster-pct-badge">{cluster.percentage}% of portfolio</span>
                        </div>
                        <h3 className="cluster-label">{cluster.label}</h3>
                        <div className="cluster-submetrics">
                          <span className="cluster-count">{cluster.patent_count} Patents</span>
                          {cluster.avg_intra_similarity > 0 && (
                            <span className="cluster-intra-sim" title="Mean pairwise cosine similarity within cluster">
                              • {(cluster.avg_intra_similarity * 100).toFixed(1)}% cohesion
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="cluster-terms-section">
                        <span className="section-label">Characteristic Semantic Terms:</span>
                        <div className="terms-tags">
                          {cluster.top_terms.map((term, tIdx) => (
                            <span key={tIdx} className="term-pill">
                              {term}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="cluster-rep-section">
                        <span className="section-label">Centroid Representative Patents:</span>
                        <div className="rep-patents-list">
                          {cluster.representative_patents.map((rep) => (
                            <div key={rep.patent_id} className="rep-patent-item">
                              <div className="rep-patent-info">
                                <strong className="rep-title" title={rep.title}>
                                  {rep.title}
                                </strong>
                                <span className="rep-assignee">{rep.assignee || 'Unknown Assignee'}</span>
                              </div>
                              <button
                                type="button"
                                className="btn-rep-similar"
                                onClick={() => {
                                  const targetId = rep.patent_id ?? rep.id
                                  const p = patents.find(
                                    (item) => String(item.id) === String(targetId) || String(item.patent_id) === String(targetId)
                                  ) || {
                                    id: targetId,
                                    patent_id: targetId,
                                    title: rep.title,
                                    publication_number: rep.publication_number,
                                    assignee: rep.assignee,
                                    technology_domain: rep.technology_domain,
                                  }
                                  handleFindSimilar(p)
                                }}
                                title="Find Similar Patents"
                              >
                                ⚡ Similar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading clustering analysis...</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Tab 2: "Check Your Innovation" (AI Idea Analyzer) */}
      {/* ============================================================ */}
      {activeTab === 'analyzer' && (
        <div className="idea-analyzer-container">
          {/* Input Section */}
          <section className="analyzer-input-card">
            <div className="analyzer-header">
              <span className="analyzer-badge">💡 AI Innovation &amp; Patent Intelligence</span>
              <h2>Check Your Innovation</h2>
              <p className="analyzer-subtitle">
                Describe your research or startup idea and discover related patent technologies, potential overlaps, and possible areas for differentiation.
              </p>
            </div>

            <form onSubmit={handleAnalyzeIdea} className="analyzer-form">
              <div className="textarea-wrapper">
                <textarea
                  className="idea-textarea"
                  rows="4"
                  placeholder="Describe your research, product, or technology idea... (e.g. An AI system that detects brain tumors from MRI scans and automatically generates a 3D visualization of the tumor.)"
                  value={ideaInput}
                  onChange={(e) => setIdeaInput(e.target.value)}
                />
                <div className="textarea-footer">
                  <span className="char-count">{ideaInput.length} characters</span>
                  {ideaInput && (
                    <button type="button" className="btn-clear" onClick={() => setIdeaInput('')}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Sample Prompts */}
              <div className="sample-prompts-row">
                <span className="sample-label">Try an example idea:</span>
                {sampleIdeas.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="sample-prompt-chip"
                    onClick={() => setIdeaInput(prompt)}
                  >
                    ✦ {prompt.slice(0, 48)}...
                  </button>
                ))}
              </div>

              <div className="analyzer-actions">
                <button
                  type="submit"
                  className="btn-analyze-primary"
                  disabled={ideaLoading || ideaInput.trim().length < 10}
                >
                  {ideaLoading ? (
                    <>
                      <span className="spinner-mini" />
                      Analyzing Patent Landscape &amp; Overlap...
                    </>
                  ) : (
                    '⚡ Analyze My Idea'
                  )}
                </button>
              </div>
            </form>

            {ideaError && (
              <div className="error-banner" style={{ marginTop: '1rem' }}>
                <span>⚠️ {ideaError}</span>
              </div>
            )}
          </section>

          {/* Results Dashboard */}
          {ideaResult && (
            <div className="idea-results-dashboard">
              {/* 1. AI Idea Understanding */}
              <div className="result-section-card">
                <div className="section-title-row">
                  <span className="section-icon">🧠</span>
                  <div>
                    <h3>AI Idea Understanding</h3>
                    <p className="section-subtitle">Structured extraction of technical components, domain, and algorithms</p>
                  </div>
                </div>

                <div className="concept-grid">
                  <div className="concept-box">
                    <span className="concept-label">Identified Domain</span>
                    <strong className="concept-value">{ideaResult.idea_analysis.domain}</strong>
                  </div>
                  <div className="concept-box">
                    <span className="concept-label">Core Problem</span>
                    <strong className="concept-value">{ideaResult.idea_analysis.problem}</strong>
                  </div>
                  <div className="concept-box">
                    <span className="concept-label">Technology Architecture</span>
                    <strong className="concept-value">{ideaResult.idea_analysis.technology}</strong>
                  </div>
                  <div className="concept-box">
                    <span className="concept-label">Input / Output Modalities</span>
                    <strong className="concept-value">
                      {ideaResult.idea_analysis.input_type || 'N/A'} &rarr; {ideaResult.idea_analysis.output_type || 'N/A'}
                    </strong>
                  </div>
                </div>

                {/* Research Areas & Keywords */}
                <div className="concept-tags-row">
                  <div className="concept-tag-group">
                    <span className="tag-group-label">Research Areas:</span>
                    {ideaResult.idea_analysis.research_areas.map((ra, idx) => (
                      <span key={idx} className="concept-pill research">{ra}</span>
                    ))}
                  </div>
                  <div className="concept-tag-group">
                    <span className="tag-group-label">Extracted Keywords:</span>
                    {ideaResult.idea_analysis.keywords.map((kw, idx) => (
                      <span key={idx} className="concept-pill keyword">{kw}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Patent Search Summary & Country Tabs */}
              <div className="result-section-card">
                <div className="section-title-row">
                  <span className="section-icon">📊</span>
                  <div>
                    <h3>Patent Search Summary &amp; Connected Records</h3>
                    <p className="section-subtitle">{ideaResult.search_summary.connected_sources_scope}</p>
                  </div>
                </div>

                <div className="summary-stats-grid">
                  <div className="summary-stat-box">
                    <span className="stat-num">{ideaResult.search_summary.total_matches}</span>
                    <span className="stat-desc">Total Related Matches</span>
                  </div>
                  <div className="summary-stat-box">
                    <span className="stat-num">{ideaResult.search_summary.high_similarity_matches}</span>
                    <span className="stat-desc">High Similarity (&ge;70%)</span>
                  </div>
                  <div className="summary-stat-box">
                    <span className="stat-num">{ideaResult.search_summary.india_matches}</span>
                    <span className="stat-desc">India Connected</span>
                  </div>
                  <div className="summary-stat-box">
                    <span className="stat-num">{ideaResult.search_summary.global_matches}</span>
                    <span className="stat-desc">Global / EPO Connected</span>
                  </div>
                </div>

                {/* Country Filter Tabs */}
                <div className="country-tabs-nav">
                  <button
                    type="button"
                    className={`country-tab-btn ${ideaCountryTab === 'all' ? 'active' : ''}`}
                    onClick={() => setIdeaCountryTab('all')}
                  >
                    All Patents ({ideaResult.similar_patents.length})
                  </button>
                  <button
                    type="button"
                    className={`country-tab-btn ${ideaCountryTab === 'india' ? 'active' : ''}`}
                    onClick={() => setIdeaCountryTab('india')}
                  >
                    🇮🇳 India ({ideaResult.search_summary.india_matches})
                  </button>
                  <button
                    type="button"
                    className={`country-tab-btn ${ideaCountryTab === 'global' ? 'active' : ''}`}
                    onClick={() => setIdeaCountryTab('global')}
                  >
                    🌐 Global &amp; EPO ({ideaResult.search_summary.global_matches})
                  </button>
                </div>

                {/* Similar Patents Grid */}
                <div className="idea-patents-grid">
                  {filteredIdeaPatents.length === 0 ? (
                    <div className="empty-country-notice">
                      <p>No patents found for the selected jurisdiction tab in the connected collections.</p>
                    </div>
                  ) : (
                    filteredIdeaPatents.slice(0, 10).map((patent) => (
                      <div key={patent.id} className="idea-patent-card">
                        <div className="card-top-row">
                          <span className={`sim-badge ${patent.similarity_percentage >= 70 ? 'high' : 'mod'}`}>
                            ⚡ {patent.similarity_percentage}% Match
                          </span>
                          <span className="country-pill">{patent.country}</span>
                          <span className="source-pill">{patent.source}</span>
                        </div>

                        <h4 className="card-patent-title">{patent.title}</h4>
                        <div className="card-patent-meta">
                          <div><strong>Pub:</strong> {patent.publication_number}</div>
                          <div><strong>Applicant:</strong> {patent.assignee || 'Not available'}</div>
                        </div>

                        {/* Why it matches */}
                        <div className="why-matches-box">
                          <span className="why-label">Why it matches:</span>
                          <div className="why-pills">
                            {patent.why_matched_reasons.map((r, idx) => (
                              <span key={idx} className="why-pill">{r}</span>
                            ))}
                          </div>
                        </div>

                        {/* Overlapping components */}
                        {patent.overlapping_components?.length > 0 && (
                          <div className="overlap-comp-box">
                            <span className="overlap-label">Overlapping Components:</span>
                            <span className="overlap-text">{patent.overlapping_components.join(' • ')}</span>
                          </div>
                        )}

                        <div className="card-footer-links">
                          {patent.official_link && (
                            <a href={patent.official_link} target="_blank" rel="noreferrer" className="btn-portal-link">
                              View Patent ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. Feature-Level Overlap Analysis */}
              <div className="result-section-card">
                <div className="section-title-row">
                  <span className="section-icon">🔍</span>
                  <div>
                    <h3>Feature-Level Overlap Analysis</h3>
                    <p className="section-subtitle">Component breakdown comparing your concept against retrieved prior art</p>
                  </div>
                </div>

                <div className="feature-overlap-table">
                  {ideaResult.feature_overlap_analysis.map((feat, idx) => (
                    <div key={idx} className="feature-row">
                      <div className="feature-col-main">
                        <strong className="feature-name">{feat.component}</strong>
                        <p className="feature-desc">{feat.explanation}</p>
                      </div>
                      <div className="feature-col-badge">
                        <span className={`coverage-tag ${feat.badge_type}`}>
                          {feat.coverage_level}
                        </span>
                        <small className="coverage-sub">{feat.closest_patents_count} related records in top pool</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Potential Innovation Gaps */}
              <div className="result-section-card highlight-gap-card">
                <div className="section-title-row">
                  <span className="section-icon">🔭</span>
                  <div>
                    <h3>Potential Innovation Gaps</h3>
                    <p className="section-subtitle">Analysis of well-covered vs. potentially less-covered technical combinations</p>
                  </div>
                </div>

                <div className="gaps-grid">
                  {ideaResult.innovation_gaps.map((gap, idx) => (
                    <div key={idx} className="gap-item-card">
                      <div className="gap-header">
                        <span className={`gap-type-pill ${gap.gap_type.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                          {gap.gap_type}
                        </span>
                        <h4>{gap.gap_title}</h4>
                      </div>
                      <p className="gap-description">{gap.description}</p>
                      <div className="gap-approach-box">
                        <strong>Analytical Direction:</strong> {gap.potential_approach}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. How Could You Differentiate This Idea? */}
              <div className="result-section-card highlight-diff-card">
                <div className="section-title-row">
                  <span className="section-icon">🚀</span>
                  <div>
                    <h3>How Could You Differentiate This Idea?</h3>
                    <p className="section-subtitle">Technically grounded strategic approaches to enhance uniqueness</p>
                  </div>
                </div>

                <div className="differentiation-list">
                  {ideaResult.differentiation_suggestions.map((diff, idx) => (
                    <div key={idx} className="diff-item-box">
                      <div className="diff-header">
                        <span className="diff-idx">#{idx + 1}</span>
                        <strong className="diff-title">{diff.strategy_title}</strong>
                        <span className="diff-category">{diff.category}</span>
                      </div>
                      <p className="diff-suggestion">{diff.suggestion}</p>
                      <div className="diff-impact">
                        <span className="impact-label">Technical Impact:</span> {diff.technical_impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Alternative Exploration Directions */}
              {ideaResult.alternative_directions?.length > 0 && (
                <div className="result-section-card">
                  <div className="section-title-row">
                    <span className="section-icon">🧭</span>
                    <div>
                      <h3>Explore Alternative Directions</h3>
                      <p className="section-subtitle">Complementary research or product formulation trajectories</p>
                    </div>
                  </div>

                  <div className="alternative-grid">
                    {ideaResult.alternative_directions.map((alt, idx) => (
                      <div key={idx} className="alt-card">
                        <h4>{alt.title}</h4>
                        <p className="alt-summary">{alt.summary}</p>
                        <div className="alt-aspects">
                          <strong>Key Aspects:</strong>
                          <ul>
                            {alt.distinctive_aspects.map((asp, aIdx) => (
                              <li key={aIdx}>{asp}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. Action: Show on 3D Map */}
              <div className="view-map-cta-card">
                <div className="cta-content">
                  <span className="cta-icon">🗺️</span>
                  <div>
                    <h4>View Your Idea Projected in the 3D Semantic Landscape</h4>
                    <p>See where your idea sits relative to existing patent clusters in 3D PCA coordinate space.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-cta-map"
                  onClick={() => {
                    setViewMode('3d')
                    setActiveTab('clusters')
                  }}
                >
                  Open 3D Semantic Landscape →
                </button>
              </div>

              {/* 8. Legal Disclaimer Box */}
              <div className="legal-disclaimer-box">
                <span className="disclaimer-icon">⚖️</span>
                <p>{ideaResult.disclaimer}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Tab 3: Patent Database & Search Explorer */}
      {/* ============================================================ */}
      {activeTab === 'search' && (
        <div className="search-container">
          <div className="search-bar-row">
            <input
              type="text"
              placeholder="Search patents by title, abstract, technology domain, or assignee..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadPatents(searchKeyword)
              }}
              className="patent-search-input"
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => loadPatents(searchKeyword)}
            >
              Search
            </button>
            {(searchKeyword || selectedDomainFilter) && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSearchKeyword('')
                  setSelectedDomainFilter('')
                  loadPatents('', '')
                }}
              >
                Reset
              </button>
            )}
          </div>

          <div className="search-filter-pills">
            <span className="filter-pills-label">Filter by Technology Domain:</span>
            {['All Domains', 'quantum computing', 'medical imaging', 'artificial intelligence', 'clean energy'].map((dom) => {
              const isAll = dom === 'All Domains'
              const isSelected = isAll ? !selectedDomainFilter : selectedDomainFilter.toLowerCase() === dom.toLowerCase()
              return (
                <button
                  key={dom}
                  type="button"
                  className={`domain-pill-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    const newDom = isAll ? '' : dom
                    setSelectedDomainFilter(newDom)
                    loadPatents(searchKeyword, newDom)
                  }}
                >
                  {dom.charAt(0).toUpperCase() + dom.slice(1)}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Searching patent database...</p>
            </div>
          ) : patents.length === 0 ? (
            <div className="empty-notice-card">
              <p>No patents found matching your query in connected collections.</p>
            </div>
          ) : (
            <div className="patents-grid">
              {patents.map((patent) => (
                <div key={patent.id} className="patent-card">
                  <div className="patent-card-top">
                    <span className="patent-pub-num">{patent.publication_number}</span>
                    <span className="patent-source-badge">{patent.source}</span>
                  </div>

                  <h3 className="patent-title">{patent.title}</h3>

                  <div className="patent-meta-row">
                    <span className="meta-item">
                      🏢 <strong>Assignee:</strong> {patent.assignee || 'Not Listed'}
                    </span>
                    <span className="meta-item">
                      🔬 <strong>Domain:</strong> {patent.technology_domain || 'General'}
                    </span>
                    {patent.classification && (
                      <span className="meta-item">
                        📑 <strong>IPC/CPC:</strong> {patent.classification}
                      </span>
                    )}
                  </div>

                  {patent.abstract && (
                    <p className="patent-abstract">
                      {patent.abstract.length > 220
                        ? `${patent.abstract.slice(0, 220)}...`
                        : patent.abstract}
                    </p>
                  )}

                  <div className="patent-actions-row">
                    <button
                      type="button"
                      className="btn-find-similar"
                      onClick={() => handleFindSimilar(patent)}
                    >
                      ⚡ Find Similar Patents
                    </button>
                    {patent.official_link && (
                      <a
                        href={patent.official_link}
                        target="_blank"
                        rel="noreferrer"
                        className="link-official"
                      >
                        Official EPO Record ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Patent Detail Drawer Panel (Triggered by Map Clicks) */}
      {isDetailDrawerOpen && (
        <PatentDetailPanel
          patent={selectedPatent}
          onClose={() => setIsDetailDrawerOpen(false)}
          onFindSimilar={handleFindSimilar}
          similarityLoading={similarityLoading}
          similarData={similarData}
        />
      )}

      {/* Similar Patents Full Modal (Deep Discovery) */}
      {similarModalOpen && (
        <div className="modal-backdrop" onClick={() => setSimilarModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge-pill">Semantic Similarity Engine</span>
                <h2>Similar Patents Discovery</h2>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setSimilarModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {(similarData || selectedPatent) && (
              <div className="source-patent-banner">
                <div className="banner-top-line">
                  <span className="banner-subtitle">Source Reference Patent</span>
                  {(similarData?.source_patent_country || selectedPatent?.country) && (
                    <span className="country-pill-sm">
                      {similarData?.source_patent_country || selectedPatent?.country}
                    </span>
                  )}
                </div>
                <h3>{similarData?.source_patent_title || selectedPatent?.title}</h3>
                <div className="source-meta">
                  <span>Number: <strong>{similarData?.source_patent_publication_number || selectedPatent?.publication_number || 'N/A'}</strong></span>
                  <span>Assignee: <strong>{similarData?.source_patent_assignee || selectedPatent?.assignee || 'N/A'}</strong></span>
                  <span>Domain: <strong>{similarData?.source_patent_domain || selectedPatent?.technology_domain || 'N/A'}</strong></span>
                  {(similarData?.source_patent_classification || selectedPatent?.classification) && (
                    <span>IPC: <strong>{similarData?.source_patent_classification || selectedPatent?.classification}</strong></span>
                  )}
                  {(similarData?.source_patent_filing_date || selectedPatent?.filing_date) && (
                    <span>Filing: <strong>{similarData?.source_patent_filing_date || selectedPatent?.filing_date}</strong></span>
                  )}
                </div>
                {(similarData?.source_patent_abstract || selectedPatent?.abstract) && (
                  <p className="source-abstract-preview">
                    {similarData?.source_patent_abstract || selectedPatent?.abstract}
                  </p>
                )}
              </div>
            )}

            <div className="modal-body">
              {similarityLoading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Calculating dense vector cosine similarities across patent portfolio...</p>
                </div>
              ) : similarData?.similar_patents?.length === 0 ? (
                <div className="empty-notice-card">
                  <p>No other patents in the database to compare against. Please import more patents.</p>
                </div>
              ) : (
                <div className="similar-patents-list">
                  {similarData?.similar_patents.map((item, idx) => (
                    <div key={item.patent_id} className="similar-item-card">
                      <div className="similarity-score-box">
                        <span className="rank-num">#{idx + 1}</span>
                        <div className="score-badge">
                          <strong>{item.similarity_percentage}%</strong>
                          <small>Similarity</small>
                        </div>
                      </div>

                      <div className="similar-item-details">
                        <div className="item-header-line">
                          <span className="item-pub-num">{item.publication_number}</span>
                          {item.country && <span className="item-country-badge">{item.country}</span>}
                          <span className="item-domain">{item.technology_domain}</span>
                        </div>
                        <h4 className="item-title">{item.title}</h4>
                        <p className="item-assignee">Assignee: {item.assignee || 'Unknown'}</p>

                        {/* Explainable Shared Terms */}
                        {item.shared_terms?.length > 0 && (
                          <div className="shared-terms-line">
                            <span className="shared-label">Shared Concepts:</span>
                            {item.shared_terms.map((term, sIdx) => (
                              <span key={sIdx} className="shared-pill">
                                {term}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Expandable Abstract & Details */}
                        {item.abstract && (
                          <div className="item-abstract-accordion">
                            <button
                              type="button"
                              className="btn-toggle-abstract"
                              onClick={() => toggleExpandSimilar(item.patent_id)}
                            >
                              {expandedSimilarIds.has(item.patent_id) ? '▴ Hide Abstract' : '▾ View Abstract & Technical Details'}
                            </button>
                            {expandedSimilarIds.has(item.patent_id) && (
                              <div className="item-abstract-body">
                                <p className="item-abstract-text">{item.abstract}</p>
                                <div className="item-meta-tags">
                                  {item.classification && <span><strong>Classification:</strong> {item.classification}</span>}
                                  {item.filing_date && <span><strong>Filing:</strong> {item.filing_date}</span>}
                                  {item.citation_count !== undefined && item.citation_count !== null && (
                                    <span><strong>Citations:</strong> {item.citation_count}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="item-footer-actions">
                          <button
                            type="button"
                            className="btn-re-similar"
                            title="Calculate similarity using this patent as the new reference"
                            onClick={() => {
                              const targetId = item.patent_id ?? item.id
                              const p = patents.find(
                                (pt) => String(pt.id) === String(targetId) || String(pt.patent_id) === String(targetId)
                              ) || {
                                id: targetId,
                                patent_id: targetId,
                                title: item.title,
                                publication_number: item.publication_number,
                                assignee: item.assignee,
                                technology_domain: item.technology_domain,
                                abstract: item.abstract,
                                country: item.country,
                                classification: item.classification,
                                filing_date: item.filing_date,
                                official_link: item.official_link,
                              }
                              handleFindSimilar(p)
                            }}
                          >
                            ⚡ Explore Similar from This Patent →
                          </button>

                          <button
                            type="button"
                            className="btn-drawer-inspect"
                            title="Open full patent details drawer"
                            onClick={() => {
                              const targetId = item.patent_id ?? item.id
                              const p = patents.find(
                                (pt) => String(pt.id) === String(targetId) || String(pt.patent_id) === String(targetId)
                              ) || {
                                id: targetId,
                                patent_id: targetId,
                                title: item.title,
                                publication_number: item.publication_number,
                                assignee: item.assignee,
                                technology_domain: item.technology_domain,
                                abstract: item.abstract,
                                country: item.country,
                                classification: item.classification,
                                filing_date: item.filing_date,
                                official_link: item.official_link,
                              }
                              setSelectedPatent(p)
                              setIsDetailDrawerOpen(true)
                            }}
                          >
                            📑 Full Details Drawer
                          </button>

                          {item.official_link && (
                            <a
                              href={item.official_link}
                              target="_blank"
                              rel="noreferrer"
                              className="link-official-sm"
                            >
                              EPO Link ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
