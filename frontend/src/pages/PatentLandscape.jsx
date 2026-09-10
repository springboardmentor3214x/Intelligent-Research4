import { useEffect, useState, useMemo } from 'react'
import patentService from '../services/patentService'
import PatentSemanticMap from '../components/PatentSemanticMap'
import PatentDetailPanel from '../components/PatentDetailPanel'
import './PatentLandscape.css'

export default function PatentLandscape() {
  const [activeTab, setActiveTab] = useState('clusters') // 'clusters' | 'search'
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

  // EPO Import state
  const [importKeyword, setImportKeyword] = useState('artificial intelligence')
  const [importLimit, setImportLimit] = useState(5)
  const [importLoading, setImportLoading] = useState(false)
  const [importMessage, setImportMessage] = useState(null)

  // Fetch initial patents and clusters
  useEffect(() => {
    loadPatents()
    loadClusters()
  }, [])

  async function loadPatents(keyword = '') {
    try {
      setLoading(true)
      setError(null)
      const data = await patentService.getPatents(keyword, 50)
      setPatents(data || [])
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
    setIsDetailDrawerOpen(true)
    // Automatically load similar patents so connection lines appear on the map
    try {
      setSimilarityLoading(true)
      const data = await patentService.getSimilarPatents(patent.id, 6)
      setSimilarData(data)
    } catch (err) {
      console.error('Similarity load error:', err)
    } finally {
      setSimilarityLoading(false)
    }
  }

  async function handleFindSimilar(patent) {
    try {
      setSelectedPatent(patent)
      setSimilarModalOpen(true)
      setSimilarityLoading(true)
      const data = await patentService.getSimilarPatents(patent.id, 6)
      setSimilarData(data)
    } catch (err) {
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

  return (
    <div className="patent-landscape-page">
      {/* 1. Header Banner */}
      <section className="patent-header">
        <div className="patent-header-content">
          <div className="patent-title-group">
            <span className="badge-pill">Module 5: Patent Intelligence</span>
            <h1>Patent Landscape &amp; Semantic Clustering</h1>
            <p className="subtitle">
              AI-driven semantic embedding representations, cosine similarity matching, and KMeans clustering on real European Patent Office (EPO) records.
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
              <span className="stat-label">Silhouette Quality</span>
              <strong className="stat-value score-text">
                {clustersData?.silhouette_score !== null && clustersData?.silhouette_score !== undefined
                  ? clustersData.silhouette_score.toFixed(2)
                  : 'N/A'}
              </strong>
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

      {/* Main Content Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'clusters' ? 'active' : ''}`}
          onClick={() => setActiveTab('clusters')}
        >
          🧩 Technology Clusters ({clustersData?.clusters?.length || 0})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          📄 Patent Database &amp; Similarity Explorer ({patents.length})
        </button>
      </div>

      {/* Tab 1: Technology Clusters */}
      {activeTab === 'clusters' && (
        <div className="clusters-container">
          {/* Controls Bar */}
          <div className="cluster-controls-bar">
            <div className="controls-left">
              <h2>AI Semantic Technology Clusters</h2>
              <p>Patents grouped automatically by deep sentence embeddings and TF-IDF topic synthesis.</p>
            </div>
            <div className="controls-right">
              <label htmlFor="cluster-k-input" className="cluster-k-label">
                Clusters (k):
                <input
                  id="cluster-k-input"
                  type="number"
                  min="2"
                  max="15"
                  placeholder="Auto"
                  value={customClusterK}
                  onChange={(e) => setCustomClusterK(e.target.value)}
                  className="k-input"
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                onClick={handleRunClustering}
                disabled={clusteringLoading || patents.length < 2}
              >
                {clusteringLoading ? 'Computing Clusters...' : '⚡ Recompute Clusters'}
              </button>
            </div>
          </div>

          {patents.length < 2 ? (
            <div className="empty-notice-card">
              <div className="empty-icon">📊</div>
              <h3>No Patent Embeddings Available</h3>
              <p>Patent embeddings and real records are required to generate the 2D Semantic Intelligence Map. Use the EPO importer above to seed records.</p>
            </div>
          ) : clusteringLoading ? (
            <div className="semantic-map-loading-skeleton">
              <div className="skeleton-pipeline">
                <span className="pulse-pill">✦ PREPARING PATENT INTELLIGENCE</span>
                <div className="skeleton-dots">
                  <span>●</span><span>●</span><span>●</span><span>●</span>
                </div>
                <p>Generating 384-d neural embeddings &amp; 2D PCA coordinates...</p>
              </div>
            </div>
          ) : clustersData ? (
            <>
              {/* 2D Semantic Embedding Space (Patent Semantic Intelligence Map) */}
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
                        <span className="cluster-count">{cluster.patent_count} Patents</span>
                      </div>

                      {/* Top Characteristic Terms */}
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

                      {/* Representative Patents */}
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
                                  const p = patents.find((item) => item.id === rep.patent_id)
                                  if (p) handleFindSimilar(p)
                                }}
                                title="Find Similar Patents"
                              >
                                🔍 Similar
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

      {/* Tab 2: Patent Database & Search Explorer */}
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
            {searchKeyword && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSearchKeyword('')
                  loadPatents('')
                }}
              >
                Reset
              </button>
            )}
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Searching patent database...</p>
            </div>
          ) : patents.length === 0 ? (
            <div className="empty-notice-card">
              <p>No patents found matching your query.</p>
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

            {selectedPatent && (
              <div className="source-patent-banner">
                <span className="banner-subtitle">Source Reference Patent:</span>
                <h3>{selectedPatent.title}</h3>
                <div className="source-meta">
                  <span>Number: <strong>{selectedPatent.publication_number}</strong></span>
                  <span>Assignee: <strong>{selectedPatent.assignee || 'N/A'}</strong></span>
                  <span>Domain: <strong>{selectedPatent.technology_domain || 'N/A'}</strong></span>
                </div>
              </div>
            )}

            <div className="modal-body">
              {similarityLoading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Calculating dense vector cosine similarities...</p>
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

                        <div className="item-footer-actions">
                          <button
                            type="button"
                            className="btn-re-similar"
                            onClick={() => {
                              const p = patents.find((pt) => pt.id === item.patent_id)
                              if (p) handleFindSimilar(p)
                            }}
                          >
                            Explore from this patent →
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
