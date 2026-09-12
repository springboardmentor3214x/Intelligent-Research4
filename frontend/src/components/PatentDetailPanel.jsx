import './PatentDetailPanel.css'

export default function PatentDetailPanel({
  patent,
  onClose,
  onFindSimilar,
  similarityLoading,
  similarData,
}) {
  if (!patent) return null

  return (
    <div className="patent-detail-drawer-overlay" onClick={onClose}>
      <div
        className="patent-detail-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Patent Intelligence Detail Panel"
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-badge-group">
            <span className="drawer-badge-pill">✦ PATENT INTELLIGENCE</span>
            <span className="drawer-source-badge">{patent.source || 'EPO'}</span>
          </div>
          <button
            type="button"
            className="btn-drawer-close"
            onClick={onClose}
            aria-label="Close detail panel"
          >
            ✕
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="drawer-body">
          {/* Main Title */}
          <h3 className="drawer-patent-title">{patent.title}</h3>

          <div className="drawer-pub-row">
            <span className="drawer-pub-number">
              {patent.publication_number || `ID: #${patent.id}`}
            </span>
            {patent.official_link && (
              <a
                href={patent.official_link}
                target="_blank"
                rel="noreferrer"
                className="drawer-official-link"
              >
                Official EPO Record ↗
              </a>
            )}
          </div>

          {/* Primary Action Button: Find Similar Patents */}
          <div className="drawer-action-banner">
            <div className="action-text">
              <strong>Dense Vector Similarity</strong>
              <p>Search entire portfolio using 384-d embeddings &amp; cosine distance</p>
            </div>
            <button
              type="button"
              className="btn-drawer-find-similar"
              onClick={() => onFindSimilar(patent)}
              disabled={similarityLoading}
            >
              {similarityLoading ? 'Computing Vectors...' : 'Find Similar Patents →'}
            </button>
          </div>

          {/* Metadata Grid */}
          <div className="drawer-section">
            <h4 className="section-title">Patent Metadata</h4>
            <div className="drawer-meta-list">
              <div className="meta-row">
                <span className="meta-label">🏢 Assignee / Applicant:</span>
                <span className="meta-value">{patent.assignee || 'Not Listed'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">🔬 Technology Domain:</span>
                <span className="meta-value">{patent.technology_domain || 'General'}</span>
              </div>
              {patent.filing_date && (
                <div className="meta-row">
                  <span className="meta-label">📅 Filing Date:</span>
                  <span className="meta-value">{patent.filing_date}</span>
                </div>
              )}
              {patent.classification && (
                <div className="meta-row">
                  <span className="meta-label">📑 Classification (IPC/CPC):</span>
                  <span className="meta-value code-font">{patent.classification}</span>
                </div>
              )}
              {patent.citation_count !== undefined && patent.citation_count !== null && (
                <div className="meta-row">
                  <span className="meta-label">📊 Citation Count:</span>
                  <span className="meta-value">{patent.citation_count}</span>
                </div>
              )}
            </div>
          </div>

          {/* Abstract Section */}
          {patent.abstract && (
            <div className="drawer-section">
              <h4 className="section-title">Patent Abstract</h4>
              <div className="drawer-abstract-box">
                <p>{patent.abstract}</p>
              </div>
            </div>
          )}

          {/* Inline Similar Patents (if calculated for this patent) */}
          {similarData && (
            <div className="drawer-section">
              <h4 className="section-title">
                Semantic Matches ({similarData.similar_patents?.length || 0})
              </h4>
              {similarData.similar_patents?.length === 0 ? (
                <p className="no-similar-text">No other patents in portfolio to compare.</p>
              ) : (
                <div className="drawer-similar-list">
                  {similarData.similar_patents.slice(0, 4).map((sim, idx) => (
                    <div key={sim.patent_id} className="drawer-sim-card">
                      <div className="sim-card-header">
                        <span className="sim-rank">#{idx + 1}</span>
                        <strong className="sim-pct">{sim.similarity_percentage}% Match</strong>
                      </div>
                      <h5 className="sim-title" title={sim.title}>
                        {sim.title}
                      </h5>
                      <span className="sim-assignee">{sim.assignee || 'Unknown'}</span>
                      {sim.shared_terms?.length > 0 && (
                        <div className="sim-shared-pills">
                          {sim.shared_terms.slice(0, 3).map((term, tIdx) => (
                            <span key={tIdx} className="sim-pill">
                              {term}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
