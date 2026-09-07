import React, { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import {
  getPersonalizedFundingRecommendations,
  importFundingOpportunities,
} from '../services/fundingService'
import './FundingIntelligence.css'

export default function FundingIntelligence() {
  const { token, user } = useContext(AuthContext)

  const [recommendations, setRecommendations] = useState([])
  const [profileUsed, setProfileUsed] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters & Controls
  const [minScore, setMinScore] = useState(0)
  const [researchAreaFilter, setResearchAreaFilter] = useState('')
  const [fundingTypeFilter, setFundingTypeFilter] = useState('')
  const [selectedOpp, setSelectedOpp] = useState(null)
  const [importQuery, setImportQuery] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  useEffect(() => {
    fetchRecommendations()
  }, [minScore, researchAreaFilter, fundingTypeFilter])

  async function fetchRecommendations() {
    setLoading(true)
    setError('')
    try {
      const data = await getPersonalizedFundingRecommendations({
        token,
        limit: 24,
        minScore: Number(minScore),
        researchArea: researchAreaFilter,
        fundingType: fundingTypeFilter,
      })
      setRecommendations(data.recommendations || [])
      setProfileUsed(data.profile_used || null)
      setTotalCount(data.total || 0)
      setMessage(data.message || '')
    } catch (err) {
      setError(err.message || 'Failed to load personalized recommendations.')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport(e) {
    e.preventDefault()
    if (!importQuery.trim()) return
    setImporting(true)
    setImportMsg('')
    try {
      const res = await importFundingOpportunities(token, importQuery.trim(), 10)
      setImportMsg(`Successfully imported ${res.inserted} new grants (${res.skipped} already indexed).`)
      setImportQuery('')
      fetchRecommendations()
    } catch (err) {
      setImportMsg(`Import failed: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  function getMatchBadgeClass(matchLevel) {
    switch (matchLevel) {
      case 'Excellent Match':
        return 'excellent'
      case 'Strong Match':
        return 'strong'
      case 'Good Match':
        return 'good'
      case 'Moderate Match':
        return 'moderate'
      default:
        return 'low'
    }
  }

  function formatAmount(amt) {
    if (!amt) return 'Funding Amount Unspecified'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amt)
  }

  function formatDate(dStr) {
    if (!dStr) return 'Rolling / Unspecified'
    try {
      const d = new Date(dStr)
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dStr
    }
  }

  return (
    <div className="funding-container">
      {/* Header */}
      <div className="funding-header">
        <div className="funding-header-title">
          <h1>Funding Intelligence & Personalized Recommendations</h1>
          <p>
            AI-driven semantic opportunity matching aligned with your academic profile, publications, and research focus.
          </p>
        </div>
        <div className="funding-header-actions">
          <form onSubmit={handleImport} style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="text"
              placeholder="Import Grants.gov topic..."
              value={importQuery}
              onChange={(e) => setImportQuery(e.target.value)}
              style={{
                padding: '0.6rem 0.8rem',
                border: '1px solid #c9dbe6',
                borderRadius: '8px',
                fontSize: '0.85rem',
              }}
            />
            <button type="submit" className="btn-secondary" disabled={importing}>
              {importing ? 'Importing...' : 'Sync Grants'}
            </button>
          </form>
          <button className="btn-primary" onClick={fetchRecommendations} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {importMsg && (
        <div
          style={{
            background: '#e6f4ea',
            color: '#137333',
            padding: '0.8rem 1.2rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            border: '1px solid #ceead6',
            fontSize: '0.88rem',
          }}
        >
          {importMsg}
        </div>
      )}

      {/* Profile Context Banner */}
      {profileUsed && (
        <div className="profile-context-banner">
          <div className="profile-context-info">
            <span className="profile-context-title">
              Matching Active For: {profileUsed.user_name || user?.name}
            </span>
            <div className="profile-context-tags">
              {profileUsed.research_domain && (
                <span className="profile-chip domain">
                  🎯 Domain: {profileUsed.research_domain}
                </span>
              )}
              {profileUsed.research_areas?.map((a, idx) => (
                <span key={idx} className="profile-chip">
                  🔬 {a}
                </span>
              ))}
              {profileUsed.keywords?.slice(0, 5).map((k, idx) => (
                <span key={idx} className="profile-chip">
                  🏷️ {k}
                </span>
              ))}
            </div>
          </div>
          <Link to="/profile" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
            Edit Profile
          </Link>
        </div>
      )}

      {/* Filters Bar */}
      <div className="funding-filters-bar">
        <div className="filter-input-group">
          <label>Filter by Research Area</label>
          <input
            type="text"
            placeholder="e.g. Artificial Intelligence, Healthcare"
            value={researchAreaFilter}
            onChange={(e) => setResearchAreaFilter(e.target.value)}
          />
        </div>
        <div className="filter-input-group">
          <label>Funding Type</label>
          <select
            value={fundingTypeFilter}
            onChange={(e) => setFundingTypeFilter(e.target.value)}
          >
            <option value="">All Funding Types</option>
            <option value="Grant">Grant</option>
            <option value="Cooperative Agreement">Cooperative Agreement</option>
            <option value="Procurement Contract">Contract</option>
          </select>
        </div>
        <div className="filter-input-group">
          <label>Minimum Relevance Match ({minScore}%)</label>
          <input
            type="range"
            min="0"
            max="85"
            step="5"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
          />
        </div>
      </div>

      {/* Content States */}
      {loading ? (
        <div className="state-container">
          <div className="state-spinner"></div>
          <h3 className="state-title">Analyzing Research Profile & Matching Grants...</h3>
          <p className="state-desc">
            Computing semantic vectors across live funding opportunities, comparing research focus areas, and assessing eligibility criteria.
          </p>
        </div>
      ) : error ? (
        <div className="state-container" style={{ borderColor: '#fca5a5' }}>
          <h3 className="state-title" style={{ color: '#b91c1c' }}>Error Loading Recommendations</h3>
          <p className="state-desc">{error}</p>
          <button className="btn-primary" onClick={fetchRecommendations}>
            Try Again
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="state-container">
          <h3 className="state-title">No Recommendations Found</h3>
          <p className="state-desc">
            {message || 'No funding opportunities matched your profile or requested filter threshold.'}
          </p>
          {profileUsed && !profileUsed.has_profile && (
            <Link to="/profile" className="btn-primary">
              Complete Your Profile
            </Link>
          )}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1rem', color: '#557086', fontSize: '0.9rem', fontWeight: 600 }}>
            Showing {recommendations.length} personalized funding recommendation{recommendations.length > 1 ? 's' : ''} (Ranked by AI Relevance)
          </div>

          {/* Cards Grid */}
          <div className="recommendations-grid">
            {recommendations.map((item) => {
              const opp = item.funding_opportunity
              const match = item.match
              const badgeClass = getMatchBadgeClass(match.match_level)

              return (
                <div key={opp.id} className="funding-card">
                  <div>
                    <div className="funding-card-top">
                      <span className="funding-source-tag">{opp.source}</span>
                      <div className={`match-score-badge ${badgeClass}`}>
                        <span>⚡ {match.relevance_score}%</span>
                        <small>({match.match_level})</small>
                      </div>
                    </div>

                    <h2 className="funding-title">{opp.title}</h2>
                    <div className="funding-agency">
                      🏛️ {opp.agency || 'Federal / Research Agency'}
                    </div>

                    {/* Why Recommended Section */}
                    <div className="why-recommended-box">
                      <div className="why-recommended-header">
                        💡 Why this matches your profile
                      </div>
                      <p className="why-recommended-text">{match.explanation}</p>
                      {match.explanation_points?.length > 0 && (
                        <ul className="explanation-bullets">
                          {match.explanation_points.slice(0, 2).map((pt, pIdx) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Matched Chips */}
                    {(match.matched_research_areas?.length > 0 || match.matched_keywords?.length > 0) && (
                      <div className="matched-chips-section">
                        {match.matched_research_areas?.map((area, aIdx) => (
                          <span key={aIdx} className="matched-chip area">
                            ✓ {area}
                          </span>
                        ))}
                        {match.matched_keywords?.map((kw, kIdx) => (
                          <span key={kIdx} className="matched-chip keyword">
                            ✓ {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="funding-meta-grid">
                      <div className="meta-item">
                        <span className="meta-label">Award Ceiling</span>
                        <span className="meta-value amount">{formatAmount(opp.funding_amount)}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Close Date</span>
                        <span className="meta-value deadline">{formatDate(opp.close_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="funding-card-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => setSelectedOpp(item)}
                    >
                      View Match Details
                    </button>
                    {opp.official_link && (
                      <a
                        href={opp.official_link}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary"
                      >
                        Official Portal ↗
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedOpp && (
        <div className="modal-overlay" onClick={() => setSelectedOpp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="funding-source-tag">
                  {selectedOpp.funding_opportunity.opportunity_number || selectedOpp.funding_opportunity.source}
                </span>
                <h2>{selectedOpp.funding_opportunity.title}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedOpp(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Match Breakdown Section */}
              <div className="modal-section" style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2eaf0' }}>
                <h3>AI Match Diagnostic Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', margin: '0.8rem 0' }}>
                  <div style={{ background: '#ffffff', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #dce6ed' }}>
                    <span className="meta-label">Relevance Score</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b726e' }}>
                      {selectedOpp.match.relevance_score}%
                    </div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #dce6ed' }}>
                    <span className="meta-label">Semantic Sim</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#155094' }}>
                      {(selectedOpp.match.semantic_similarity * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #dce6ed' }}>
                    <span className="meta-label">Domain Overlap</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b726e' }}>
                      {selectedOpp.match.domain_score}%
                    </div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #dce6ed' }}>
                    <span className="meta-label">Keyword Overlap</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0b726e' }}>
                      {selectedOpp.match.keyword_score}%
                    </div>
                  </div>
                </div>

                <ul className="explanation-bullets" style={{ marginTop: '0.5rem' }}>
                  {selectedOpp.match.explanation_points?.map((pt, pIdx) => (
                    <li key={pIdx}>{pt}</li>
                  ))}
                </ul>
              </div>

              {/* Opportunity Description */}
              <div className="modal-section">
                <h3>Opportunity Description</h3>
                <p>{selectedOpp.funding_opportunity.description || 'No detailed synopsis provided by sponsor.'}</p>
              </div>

              {/* Eligibility */}
              <div className="modal-section">
                <h3>Eligibility & Applicant Requirements</h3>
                <p>{selectedOpp.funding_opportunity.eligibility || 'Eligibility details not specified. Review official solicitation.'}</p>
                <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#0b726e', fontWeight: 600 }}>
                  Assessment: {selectedOpp.match.eligibility_status}
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="funding-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Agency</span>
                  <span className="meta-value">{selectedOpp.funding_opportunity.agency || 'N/A'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Funding Category</span>
                  <span className="meta-value">{selectedOpp.funding_opportunity.funding_category || 'N/A'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Estimated Award</span>
                  <span className="meta-value amount">{formatAmount(selectedOpp.funding_opportunity.funding_amount)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Submission Deadline</span>
                  <span className="meta-value deadline">{formatDate(selectedOpp.funding_opportunity.close_date)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedOpp(null)}>
                Close
              </button>
              {selectedOpp.funding_opportunity.official_link && (
                <a
                  href={selectedOpp.funding_opportunity.official_link}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                >
                  Visit Official Grant Page ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
