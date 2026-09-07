import React, { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import {
  getPersonalizedFundingRecommendations,
  syncFundingSources,
  saveFundingOpportunity,
  getSavedFunding,
  removeSavedFunding,
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

  // Saved Grants State
  const [savedIds, setSavedIds] = useState(new Set())
  const [activeTab, setActiveTab] = useState('recommendations') // 'recommendations' | 'saved'
  const [savedOpportunities, setSavedOpportunities] = useState([])
  const [savingId, setSavingId] = useState(null)

  // Filters & Controls
  const [topicSearch, setTopicSearch] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [fundingTypeFilter, setFundingTypeFilter] = useState('')
  const [selectedChips, setSelectedChips] = useState([])
  const [selectedOpp, setSelectedOpp] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecommendations()
    }, 250)
    return () => clearTimeout(timer)
  }, [topicSearch, minScore, fundingTypeFilter, selectedChips, token])

  useEffect(() => {
    if (token) {
      fetchSavedList()
    }
  }, [token])

  async function fetchRecommendations() {
    setLoading(true)
    setError('')
    try {
      const data = await getPersonalizedFundingRecommendations({
        token,
        limit: 30,
        minScore: Number(minScore),
        topic: topicSearch.trim(),
        fundingType: fundingTypeFilter,
        focusTerms: selectedChips,
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

  async function fetchSavedList() {
    try {
      const res = await getSavedFunding(token)
      const items = res.saved_opportunities || []
      setSavedOpportunities(items)
      setSavedIds(new Set(items.map((i) => i.funding_opportunity_id)))
    } catch (err) {
      console.error('Failed to load saved grants:', err)
    }
  }

  async function handleToggleSave(oppId) {
    if (!token) return
    setSavingId(oppId)
    try {
      if (savedIds.has(oppId)) {
        await removeSavedFunding(token, oppId)
        setSavedIds((prev) => {
          const next = new Set(prev)
          next.delete(oppId)
          return next
        })
        setSavedOpportunities((prev) => prev.filter((i) => i.funding_opportunity_id !== oppId))
      } else {
        await saveFundingOpportunity(token, oppId)
        setSavedIds((prev) => new Set(prev).add(oppId))
        fetchSavedList()
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err)
    } finally {
      setSavingId(null)
    }
  }

  function toggleChip(term) {
    if (!term) return
    setSelectedChips((prev) => {
      if (prev.includes(term)) {
        return prev.filter((t) => t !== term)
      } else {
        return [...prev, term]
      }
    })
  }

  function clearChips() {
    setSelectedChips([])
  }

  async function handleSyncSources() {
    setSyncing(true)
    setSyncMsg('')
    setSyncResult(null)
    try {
      const res = await syncFundingSources({ token })
      setSyncResult(res)
      setSyncMsg(res.message || 'Successfully synchronized Indian funding sources.')
      fetchRecommendations()
    } catch (err) {
      setSyncMsg(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
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

  function formatAmount(amt, country = 'India') {
    if (!amt) return 'Funding Amount Unspecified'
    if (country === 'India' || amt >= 100000) {
      if (amt >= 10000000) {
        return `₹ ${(amt / 10000000).toFixed(2)} Crores`
      } else if (amt >= 100000) {
        return `₹ ${(amt / 100000).toFixed(2)} Lakhs`
      }
      return `₹ ${amt.toLocaleString('en-IN')}`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amt)
  }

  function formatDate(dStr) {
    if (!dStr) return 'Deadline Not Specified'
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
          <h1>Funding Intelligence &amp; AI Semantic Matching</h1>
          <p>
            Discover and rank real funding opportunities across Indian &amp; global agencies using semantic similarity, keyword concepts, and your Module 2 research profile.
          </p>
        </div>
        <div className="funding-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSyncSources}
            disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {syncing ? '⏳ Syncing Indian Portals...' : '🇮🇳 Sync Indian Funding Sources'}
          </button>
          <button className="btn-secondary" onClick={fetchRecommendations} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMsg && (
        <div
          style={{
            background: syncMsg.toLowerCase().includes('failed') ? '#fef2f2' : '#e6f4ea',
            color: syncMsg.toLowerCase().includes('failed') ? '#b91c1c' : '#137333',
            padding: '0.8rem 1.2rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            border: `1px solid ${syncMsg.toLowerCase().includes('failed') ? '#fecaca' : '#ceead6'}`,
            fontSize: '0.88rem',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{syncMsg}</div>
          {syncResult?.source_results && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
              {Object.entries(syncResult.source_results).map(([sKey, sData]) => (
                <span
                  key={sKey}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: sData.status === 'success' ? '#d1fae5' : '#fee2e2',
                    color: sData.status === 'success' ? '#065f46' : '#991b1b',
                    fontWeight: 600,
                  }}
                >
                  {sKey}: {sData.status === 'success' ? `✓ (${sData.fetched} calls)` : '✕ Error'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs for Recommendations vs Saved Opportunities */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid #e2eaf0', marginBottom: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('recommendations')}
          style={{
            padding: '0.6rem 1.2rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'recommendations' ? '3px solid #0b726e' : '3px solid transparent',
            color: activeTab === 'recommendations' ? '#0b726e' : '#64748b',
            cursor: 'pointer',
          }}
        >
          🎯 AI Recommendations ({recommendations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          style={{
            padding: '0.6rem 1.2rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'saved' ? '3px solid #0b726e' : '3px solid transparent',
            color: activeTab === 'saved' ? '#0b726e' : '#64748b',
            cursor: 'pointer',
          }}
        >
          ⭐ Saved Grants ({savedOpportunities.length})
        </button>
      </div>

      {activeTab === 'saved' ? (
        <div>
          {savedOpportunities.length === 0 ? (
            <div className="state-container">
              <h3 className="state-title">No Saved Grants Yet</h3>
              <p className="state-desc">
                Click the "☆ Save" button on any funding opportunity card to save it to your personalized shortlist.
              </p>
            </div>
          ) : (
            <div className="recommendations-grid">
              {savedOpportunities.map((item) => {
                const opp = item.funding_opportunity
                return (
                  <div key={opp.id} className="funding-card">
                    <div>
                      <div className="funding-card-top">
                        <span className="funding-source-tag">{opp.source}</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                          Saved on {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h2 className="funding-title">{opp.title}</h2>
                      <div className="funding-agency">🏛️ {opp.agency || opp.source}</div>
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0.8rem 0' }}>
                        {opp.description?.slice(0, 180)}...
                      </p>
                      <div className="funding-meta-grid">
                        <div className="meta-item">
                          <span className="meta-label">Funding Amount</span>
                          <span className="meta-value amount">{formatAmount(opp.funding_amount, opp.country)}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Deadline</span>
                          <span className="meta-value deadline">{formatDate(opp.close_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="funding-card-actions">
                      <button
                        className="btn-secondary"
                        style={{ color: '#b91c1c' }}
                        onClick={() => handleToggleSave(opp.id)}
                      >
                        ✕ Remove
                      </button>
                      {opp.official_link && (
                        <a href={opp.official_link} target="_blank" rel="noreferrer" className="btn-primary">
                          Official Portal ↗
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Interactive Profile Context Banner */}
          {profileUsed && (
            <div className="profile-context-banner">
              <div className="profile-context-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="profile-context-title">
                    Matching Active For: {profileUsed.user_name || user?.name}
                  </span>
                  {selectedChips.length > 0 && (
                    <button
                      type="button"
                      onClick={clearChips}
                      className="clear-focus-btn"
                    >
                      ✕ Clear Selected Focus ({selectedChips.length})
                    </button>
                  )}
                </div>

                <p style={{ margin: '0.2rem 0 0.4rem', fontSize: '0.82rem', color: '#557288' }}>
                  💡 Click any research area or keyword chip below to prioritize and focus the semantic matching engine:
                </p>

                <div className="profile-context-tags" role="toolbar" aria-label="Research Focus Selection">
                  {profileUsed.research_domain && (
                    <button
                      type="button"
                      className={`profile-chip domain ${selectedChips.includes(profileUsed.research_domain) ? 'active' : ''}`}
                      onClick={() => toggleChip(profileUsed.research_domain)}
                      aria-pressed={selectedChips.includes(profileUsed.research_domain)}
                    >
                      {selectedChips.includes(profileUsed.research_domain) ? '✓ ' : ''}🎯 Domain: {profileUsed.research_domain}
                    </button>
                  )}
                  {profileUsed.research_areas?.map((a, idx) => (
                    <button
                      type="button"
                      key={`area-${idx}`}
                      className={`profile-chip area-chip ${selectedChips.includes(a) ? 'active' : ''}`}
                      onClick={() => toggleChip(a)}
                      aria-pressed={selectedChips.includes(a)}
                    >
                      {selectedChips.includes(a) ? '✓ ' : ''}🔬 {a}
                    </button>
                  ))}
                  {profileUsed.keywords?.map((k, idx) => (
                    <button
                      type="button"
                      key={`kw-${idx}`}
                      className={`profile-chip kw-chip ${selectedChips.includes(k) ? 'active' : ''}`}
                      onClick={() => toggleChip(k)}
                      aria-pressed={selectedChips.includes(k)}
                    >
                      {selectedChips.includes(k) ? '✓ ' : ''}🏷️ {k}
                    </button>
                  ))}
                  {profileUsed.technology_areas?.map((t, idx) => (
                    <button
                      type="button"
                      key={`tech-${idx}`}
                      className={`profile-chip tech-chip ${selectedChips.includes(t) ? 'active' : ''}`}
                      onClick={() => toggleChip(t)}
                      aria-pressed={selectedChips.includes(t)}
                    >
                      {selectedChips.includes(t) ? '✓ ' : ''}⚙️ {t}
                    </button>
                  ))}
                </div>

                {selectedChips.length > 0 && (
                  <div className="active-focus-bar">
                    <strong>Active Research Focus:</strong>{' '}
                    {selectedChips.map((c, cIdx) => (
                      <span key={cIdx} className="focus-pill">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Link to="/profile" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', alignSelf: 'flex-start' }}>
                Edit Profile
              </Link>
            </div>
          )}

          {/* Search & Filters Bar */}
          <div className="funding-filters-bar">
            <div className="filter-input-group" style={{ flex: 1.4 }}>
              <label>Search Topic / Research Area (Semantic &amp; Concept Matching)</label>
              <input
                type="text"
                placeholder="e.g. Sustainable HealthTech Platforms, Quantum Computing..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                autoComplete="off"
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
                <option value="Fellowship">Fellowship</option>
                <option value="Innovation Grant">Innovation Grant</option>
                <option value="Seed Grant">Seed Grant</option>
                <option value="Mission Grant">Mission Grant</option>
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
              <h3 className="state-title">Analyzing Research Profile &amp; Semantic Matching...</h3>
              <p className="state-desc">
                Computing TF-IDF cosine similarity vectors across live funding calls, extracting related concepts, and evaluating eligibility signals.
              </p>
            </div>
          ) : error ? (
            <div className="state-container" style={{ borderColor: '#fca5a5' }}>
              <h3 className="state-title" style={{ color: '#b91c1c' }}>Funding data could not be loaded</h3>
              <p className="state-desc">{error}</p>
              <button className="btn-primary" onClick={fetchRecommendations}>
                Try Again
              </button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="state-container">
              <h3 className="state-title">No closely related funding opportunities found</h3>
              <p className="state-desc">
                {minScore > 0
                  ? `No funding opportunities met the ${minScore}% minimum match threshold. Try sliding it lower to see broader semantic matches.`
                  : 'Try searching for a broader research area such as Healthcare, Artificial Intelligence, Renewable Energy, Biotechnology, or Quantum Computing.'}
              </p>
              <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setTopicSearch('')
                    setMinScore(0)
                    setFundingTypeFilter('')
                  }}
                >
                  Clear All Filters
                </button>
                {profileUsed && !profileUsed.has_profile && (
                  <Link to="/profile" className="btn-primary">
                    Complete Your Profile
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1rem', color: '#557086', fontSize: '0.9rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  Showing {recommendations.length} {topicSearch ? 'topic-matched' : 'personalized'} funding opportunities (Ranked by Semantic Relevance)
                </span>
                {topicSearch && (
                  <span style={{ fontSize: '0.8rem', color: '#0b726e' }}>
                    🔍 Matching query: "<em>{topicSearch}</em>"
                  </span>
                )}
              </div>

              {/* Cards Grid */}
              <div className="recommendations-grid">
                {recommendations.map((item) => {
                  const opp = item.funding_opportunity
                  const match = item.match
                  const badgeClass = getMatchBadgeClass(match.match_level)
                  const isSaved = savedIds.has(opp.id)

                  return (
                    <div key={opp.id} className="funding-card">
                      <div>
                        <div className="funding-card-top">
                          <span className="funding-source-tag">{opp.source}</span>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleToggleSave(opp.id)}
                              disabled={savingId === opp.id}
                              style={{
                                background: isSaved ? '#fef3c7' : '#f1f5f9',
                                border: `1px solid ${isSaved ? '#f59e0b' : '#cbd5e1'}`,
                                color: isSaved ? '#b45309' : '#64748b',
                                borderRadius: '6px',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                              title={isSaved ? 'Remove Bookmark' : 'Save Grant'}
                            >
                              {isSaved ? '★ Saved' : '☆ Save'}
                            </button>
                            <div className={`match-score-badge ${badgeClass}`}>
                              <span>⚡ {match.relevance_score}%</span>
                              <small>({match.match_level})</small>
                            </div>
                          </div>
                        </div>

                        <h2 className="funding-title">{opp.title}</h2>
                        <div className="funding-agency">
                          🏛️ {opp.agency || opp.source}
                        </div>

                        {/* Match Type Badge */}
                        <div style={{ margin: '0.5rem 0 0.3rem' }}>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              background: match.match_type.includes('Exact') ? '#dcfce7' : match.match_type.includes('Keyword') ? '#e0f2fe' : '#f1f5f9',
                              color: match.match_type.includes('Exact') ? '#15803d' : match.match_type.includes('Keyword') ? '#0369a1' : '#475569',
                            }}
                          >
                            🏷️ {match.match_type}
                          </span>
                        </div>

                        {/* Why Recommended Section */}
                        <div className="why-recommended-box">
                          <div className="why-recommended-header">
                            💡 Why this matches your inquiry
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

                        {/* Matched Concepts Chips */}
                        {match.matched_concepts?.length > 0 && (
                          <div className="matched-chips-section">
                            {match.matched_concepts.map((concept, cIdx) => (
                              <span key={cIdx} className="matched-chip keyword">
                                ✓ {concept}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="funding-meta-grid">
                          <div className="meta-item">
                            <span className="meta-label">Funding Amount</span>
                            <span className="meta-value amount">{formatAmount(opp.funding_amount, opp.country)}</span>
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
                          View Details
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
              <button className="modal-close-btn" onClick={() => setSelectedOpp(null)} aria-label="Close details modal">
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Match Breakdown Section */}
              <div className="modal-section" style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2eaf0' }}>
                <h3>AI Match Diagnostic Breakdown</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.8rem', margin: '0.8rem 0' }}>
                  <div style={{ background: '#ffffff', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>RELEVANCE SCORE</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0b726e' }}>{selectedOpp.match.relevance_score}%</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>MATCH TYPE</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginTop: '0.2rem' }}>{selectedOpp.match.match_type}</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>SEMANTIC SIMILARITY</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb' }}>{Math.round(selectedOpp.match.semantic_similarity * 100)}%</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>ELIGIBILITY SIGNAL</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a', marginTop: '0.2rem' }}>{selectedOpp.match.eligibility_status}</div>
                  </div>
                </div>

                <div style={{ marginTop: '0.8rem' }}>
                  <strong>Match Rationale:</strong>
                  <p style={{ margin: '0.3rem 0 0.6rem', fontSize: '0.88rem', color: '#334155' }}>
                    {selectedOpp.match.explanation}
                  </p>
                  {selectedOpp.match.explanation_points?.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#475569' }}>
                      {selectedOpp.match.explanation_points.map((pt, idx) => (
                        <li key={idx} style={{ marginBottom: '0.2rem' }}>{pt}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Opportunity Details */}
              <div className="modal-section">
                <h3>Sponsor &amp; Funding Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', margin: '0.8rem 0' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Agency / Sponsor</span>
                    <strong>{selectedOpp.funding_opportunity.agency || selectedOpp.funding_opportunity.source}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Funding Type</span>
                    <strong>{selectedOpp.funding_opportunity.funding_type || 'Unspecified'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Funding Amount</span>
                    <strong style={{ color: '#0b726e' }}>{formatAmount(selectedOpp.funding_opportunity.funding_amount, selectedOpp.funding_opportunity.country)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>Submission Deadline</span>
                    <strong>{formatDate(selectedOpp.funding_opportunity.close_date)}</strong>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="modal-section">
                <h3>Solicitation Description</h3>
                <p style={{ lineHeight: 1.6, color: '#334155', fontSize: '0.92rem' }}>
                  {selectedOpp.funding_opportunity.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Eligibility */}
              {selectedOpp.funding_opportunity.eligibility && (
                <div className="modal-section">
                  <h3>Eligibility Guidelines</h3>
                  <p style={{ lineHeight: 1.6, color: '#334155', fontSize: '0.92rem' }}>
                    {selectedOpp.funding_opportunity.eligibility}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedOpp(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleToggleSave(selectedOpp.funding_opportunity.id)}
              >
                {savedIds.has(selectedOpp.funding_opportunity.id) ? '★ Bookmarked' : '☆ Bookmark Grant'}
              </button>
              {selectedOpp.funding_opportunity.official_link && (
                <a
                  href={selectedOpp.funding_opportunity.official_link}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                >
                  Visit Official Application Portal ↗
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
