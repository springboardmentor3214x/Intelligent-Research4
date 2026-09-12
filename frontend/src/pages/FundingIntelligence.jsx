import React, { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import {
  getPersonalizedFundingRecommendations,
  searchFundingOpportunities,
  analyzeStartupIdea,
  syncFundingSources,
  saveFundingOpportunity,
  getSavedFunding,
  removeSavedFunding,
} from '../services/fundingService'
import './FundingIntelligence.css'

function decodeHtmlEntities(str) {
  if (!str) return ''
  try {
    const txt = document.createElement('textarea')
    txt.innerHTML = str
    let val = txt.value
    if (val && val.includes('&')) {
      txt.innerHTML = val
      val = txt.value
    }
    return val
  } catch (e) {
    return String(str)
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&bull;/g, '•')
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&#160;/g, ' ')
  }
}

function stripHtml(html) {
  if (!html) return ''
  const decoded = decodeHtmlEntities(html)
  return decoded.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function renderCleanHtmlContent(rawHtml) {
  if (!rawHtml || !String(rawHtml).trim()) {
    return <p style={{ color: '#64748b', fontStyle: 'italic', margin: 0 }}>Not available in source data</p>
  }

  let cleaned = decodeHtmlEntities(rawHtml)
    .replace(/<p>\s*(<br\s*\/?>|&nbsp;|\s)*<\/p>/gi, '')
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br />')
    .trim()

  const hasHtml = /<[a-z][\s\S]*>/i.test(cleaned)
  if (hasHtml) {
    return <div className="rich-description" dangerouslySetInnerHTML={{ __html: cleaned }} />
  }

  const paragraphs = cleaned.split(/\n\s*\n/)
  return (
    <div className="rich-description">
      {paragraphs.map((p, idx) => (
        <p key={idx}>{p}</p>
      ))}
    </div>
  )
}

export default function FundingIntelligence() {
  const { token, user } = useContext(AuthContext)

  const [activeTab, setActiveTab] = useState('recommendations') // 'recommendations' | 'analyzer' | 'saved'

  // Recommendations State
  const [recommendations, setRecommendations] = useState([])
  const [profileUsed, setProfileUsed] = useState(null)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Saved Grants State
  const [savedIds, setSavedIds] = useState(new Set())
  const [savedOpportunities, setSavedOpportunities] = useState([])
  const [savingId, setSavingId] = useState(null)

  // Filters & Controls
  const [topicSearch, setTopicSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [fundingTypeFilter, setFundingTypeFilter] = useState('')
  const [selectedChips, setSelectedChips] = useState([])
  const [selectedOpp, setSelectedOpp] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [syncMsg, setSyncMsg] = useState('')

  // Startup Idea Analyzer State
  const [ideaText, setIdeaText] = useState('')
  const [ideaLoading, setIdeaLoading] = useState(false)
  const [ideaError, setIdeaError] = useState('')
  const [ideaResult, setIdeaResult] = useState(null)

  // Comparison State
  const [compareList, setCompareList] = useState([])
  const [showCompareModal, setShowCompareModal] = useState(false)

  // Debounced search / filter trigger
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
      const recs = data.recommendations || []
      setRecommendations(recs)
      setProfileUsed(data.profile_used || null)
      setTotalCount(data.total || recs.length)
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

  function handleSearchSubmit(e) {
    if (e) e.preventDefault()
    setTopicSearch(searchInput)
  }

  function handleResetFilters() {
    setSearchInput('')
    setTopicSearch('')
    setMinScore(0)
    setFundingTypeFilter('')
    setSelectedChips([])
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
      setSyncMsg(res.message || 'Successfully synchronized Indian and global funding sources.')
      fetchRecommendations()
    } catch (err) {
      setSyncMsg(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleAnalyzeIdea(presetText = null) {
    const textToAnalyze = (presetText || ideaText).trim()
    if (!textToAnalyze || textToAnalyze.length < 10) {
      setIdeaError('Please describe your startup or research idea in at least 10 characters.')
      return
    }
    if (presetText) setIdeaText(presetText)
    setIdeaLoading(true)
    setIdeaError('')
    setIdeaResult(null)

    try {
      const data = await analyzeStartupIdea({
        token,
        idea: textToAnalyze,
      })
      setIdeaResult(data)
    } catch (err) {
      setIdeaError(err.message || 'Failed to analyze startup idea. Please try again.')
    } finally {
      setIdeaLoading(false)
    }
  }

  function toggleCompare(opp) {
    setCompareList((prev) => {
      const exists = prev.find((item) => item.id === opp.id)
      if (exists) {
        return prev.filter((item) => item.id !== opp.id)
      } else {
        if (prev.length >= 3) {
          alert('You can compare up to 3 funding opportunities simultaneously.')
          return prev
        }
        return [...prev, opp]
      }
    })
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
    if (!dStr) return 'Rolling / Deadline Not Specified'
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

  function getMatchBadgeClass(score) {
    if (score >= 70) return 'match-excellent'
    if (score >= 50) return 'match-strong'
    if (score >= 35) return 'match-good'
    if (score >= 20) return 'match-moderate'
    return 'match-broad'
  }

  return (
    <div className="funding-container">
      {/* Header */}
      <div className="funding-header">
        <div className="funding-header-title">
          <h1>Funding Intelligence &amp; AI Semantic Matching</h1>
          <p>
            Discover, evaluate, and rank real funding opportunities across BIRAC, DST, ICMR, MeitY, and global agencies using calibrated semantic similarity, researcher profiles, and startup idea intelligence.
          </p>
        </div>
        <div className="funding-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSyncSources}
            disabled={syncing}
          >
            {syncing ? '⏳ Syncing Portals...' : '🇮🇳 Sync Indian Funding Sources'}
          </button>
          <button className="btn-secondary" onClick={fetchRecommendations} disabled={loading}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncMsg && (
        <div
          className={`sync-banner ${syncMsg.toLowerCase().includes('failed') ? 'error' : 'success'}`}
        >
          <div style={{ fontWeight: 700 }}>{syncMsg}</div>
        </div>
      )}

      {/* Main Tabs */}
      <div className="funding-tabs">
        <button
          type="button"
          className={`funding-tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          🎯 AI Recommendations ({recommendations.length})
        </button>
        <button
          type="button"
          className={`funding-tab-btn ${activeTab === 'analyzer' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyzer')}
        >
          💡 Startup &amp; Idea Analyzer
        </button>
        <button
          type="button"
          className={`funding-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          ⭐ Saved Grants ({savedOpportunities.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: AI RECOMMENDATIONS */}
      {/* ======================================================== */}
      {activeTab === 'recommendations' && (
        <>
          {/* Profile Context Banner */}
          {profileUsed && (
            <div className="profile-context-banner">
              <div className="profile-context-info">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="profile-context-title">
                    Active Researcher Profile: {profileUsed.user_name || user?.name}
                  </span>
                  {selectedChips.length > 0 && (
                    <button type="button" onClick={clearChips} className="clear-focus-btn">
                      ✕ Clear Selected Focus ({selectedChips.length})
                    </button>
                  )}
                </div>

                <p style={{ margin: '0.2rem 0 0.4rem', fontSize: '0.82rem', color: '#557288' }}>
                  💡 Click any research area or keyword chip below to prioritize and focus the semantic matching engine:
                </p>

                <div className="profile-context-tags">
                  {profileUsed.research_domain && (
                    <button
                      type="button"
                      className={`profile-chip domain ${selectedChips.includes(profileUsed.research_domain) ? 'active' : ''}`}
                      onClick={() => toggleChip(profileUsed.research_domain)}
                    >
                      {selectedChips.includes(profileUsed.research_domain) ? '✓ ' : ''}🎯 {profileUsed.research_domain}
                    </button>
                  )}
                  {profileUsed.research_areas?.map((a, idx) => (
                    <button
                      type="button"
                      key={`area-${idx}`}
                      className={`profile-chip area-chip ${selectedChips.includes(a) ? 'active' : ''}`}
                      onClick={() => toggleChip(a)}
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
                    >
                      {selectedChips.includes(t) ? '✓ ' : ''}⚙️ {t}
                    </button>
                  ))}
                </div>
              </div>
              <Link to="/profile" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', alignSelf: 'flex-start' }}>
                Edit Profile
              </Link>
            </div>
          )}

          {/* Search & Filter Bar */}
          <form className="funding-filters-bar" onSubmit={handleSearchSubmit}>
            <div className="filter-input-group" style={{ flex: 1.5 }}>
              <label>Search Topic / Research Area (Semantic Matching)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="e.g. Sustainable Healthcare, AI Diagnostics, Medical Imaging..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoComplete="off"
                />
                <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1rem' }}>
                  Search
                </button>
              </div>
            </div>
            <div className="filter-input-group">
              <label>Funding Type</label>
              <select
                value={fundingTypeFilter}
                onChange={(e) => setFundingTypeFilter(e.target.value)}
              >
                <option value="">All Funding Types</option>
                <option value="Grant">Grant</option>
                <option value="Research & Innovation Grant">Research &amp; Innovation Grant</option>
                <option value="Fellowship">Fellowship</option>
                <option value="Cooperative Agreement">Cooperative Agreement</option>
                <option value="National Mission Grant">National Mission Grant</option>
              </select>
            </div>
            <div className="filter-input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Min Match Threshold</label>
                <span style={{ fontWeight: 700, color: '#0b726e' }}>{minScore}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="85"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
              />
            </div>
            {(topicSearch || fundingTypeFilter || minScore > 0 || selectedChips.length > 0) && (
              <div style={{ alignSelf: 'flex-end', paddingBottom: '0.2rem' }}>
                <button type="button" className="btn-secondary" onClick={handleResetFilters} style={{ fontSize: '0.82rem' }}>
                  ✕ Clear Filters
                </button>
              </div>
            )}
          </form>

          {/* Results State */}
          {loading ? (
            <div className="state-container">
              <div className="state-spinner"></div>
              <h3 className="state-title">Analyzing Research Profile &amp; Semantic Matching...</h3>
              <p className="state-desc">
                Generating mathematical cosine similarity vectors across live funding calls, extracting matching concepts, and calculating automated eligibility criteria.
              </p>
            </div>
          ) : error ? (
            <div className="state-container error-state">
              <h3 className="state-title" style={{ color: '#b91c1c' }}>Funding data could not be loaded</h3>
              <p className="state-desc">{error}</p>
              <button className="btn-primary" onClick={fetchRecommendations}>
                Try Again
              </button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="state-container">
              <h3 className="state-title">No opportunities match these filters</h3>
              <p className="state-desc">
                {minScore > 0
                  ? `No funding opportunities met the ${minScore}% minimum relevance threshold.`
                  : 'No funding records matched your specific search criteria.'}
              </p>
              <div className="empty-suggestions">
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#102d48' }}>Try the following:</div>
                <ul>
                  {minScore > 0 && (
                    <li>
                      <button type="button" className="link-btn" onClick={() => setMinScore(0)}>
                        Reduce relevance threshold to 0%
                      </button>
                    </li>
                  )}
                  {topicSearch && (
                    <li>
                      <button type="button" className="link-btn" onClick={() => { setSearchInput(''); setTopicSearch(''); }}>
                        Remove the topic filter "{topicSearch}"
                      </button>
                    </li>
                  )}
                  {fundingTypeFilter && (
                    <li>
                      <button type="button" className="link-btn" onClick={() => setFundingTypeFilter('')}>
                        Show all funding types
                      </button>
                    </li>
                  )}
                  <li>Search for broader domains like <em>Healthcare</em>, <em>Artificial Intelligence</em>, <em>Biotechnology</em>, or <em>CleanTech</em>.</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div className="results-summary-bar">
                <span>
                  Showing <strong>{recommendations.length}</strong> {topicSearch ? 'topic-matched' : 'personalized'} funding opportunities (Ranked by Semantic Relevance)
                </span>
                {compareList.length > 0 && (
                  <button type="button" className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowCompareModal(true)}>
                    Compare Selected ({compareList.length}) ↗
                  </button>
                )}
              </div>

              <div className="recommendations-grid">
                {recommendations.map((opp) => {
                  const score = opp.relevance_percentage || 0
                  const isSaved = savedIds.has(opp.id)
                  const isCompared = compareList.some((c) => c.id === opp.id)

                  return (
                    <div key={opp.id} className="funding-card">
                      <div>
                        <div className="funding-card-top">
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <span className="funding-source-tag">{opp.source}</span>
                            <span className={`deadline-badge ${opp.deadline_status?.toLowerCase().includes('closing') ? 'closing-soon' : opp.deadline_status?.toLowerCase().includes('expired') ? 'expired' : 'active'}`}>
                              ⏱ {opp.deadline_status}
                            </span>
                          </div>
                          <div className={`match-badge ${getMatchBadgeClass(score)}`}>
                            {score}% Match
                          </div>
                        </div>

                        <h2 className="funding-title">{decodeHtmlEntities(opp.title)}</h2>
                        <div className="funding-agency">🏛️ {decodeHtmlEntities(opp.agency) || opp.source} • 📍 {opp.country || 'India'}</div>

                        {opp.matched_concepts && opp.matched_concepts.length > 0 && (
                          <div className="why-matches-box">
                            <span className="why-matches-label">Why it matches:</span>
                            {opp.matched_concepts.map((concept, cIdx) => (
                              <span key={cIdx} className="matched-concept-pill">
                                ✓ {concept}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="funding-desc">
                          {stripHtml(opp.description).slice(0, 180)}...
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

                        {opp.eligibility_assessment && (
                          <div className={`eligibility-box ${opp.eligibility_assessment.badge}`}>
                            <span style={{ fontWeight: 700 }}>{opp.eligibility_assessment.status}:</span>{' '}
                            {opp.eligibility_assessment.rationale}
                          </div>
                        )}
                      </div>

                      <div className="funding-card-actions">
                        <button
                          type="button"
                          className={`btn-save ${isSaved ? 'saved' : ''}`}
                          onClick={() => handleToggleSave(opp.id)}
                          disabled={savingId === opp.id}
                        >
                          {savingId === opp.id ? '...' : isSaved ? '★ Saved' : '☆ Save'}
                        </button>
                        <button
                          type="button"
                          className={`btn-secondary ${isCompared ? 'active-compare' : ''}`}
                          style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}
                          onClick={() => toggleCompare(opp)}
                        >
                          {isCompared ? '✓ Compared' : '+ Compare'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}
                          onClick={() => setSelectedOpp(opp)}
                        >
                          Details
                        </button>
                        {opp.official_link && (
                          <a
                            href={opp.official_link}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-primary"
                            style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}
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

      {/* ======================================================== */}
      {/* TAB 2: STARTUP & RESEARCH IDEA FUNDING ANALYZER */}
      {/* ======================================================== */}
      {activeTab === 'analyzer' && (
        <div className="analyzer-container">
          <div className="analyzer-hero">
            <h2>💡 AI Startup &amp; Research Idea Funding Analyzer</h2>
            <p>
              Describe your innovative startup concept, technology method, or research proposal. The platform analyzes technical domains, computes research paper and patent landscape overlap, searches real funding calls, and estimates funding readiness.
            </p>

            <div className="preset-chips">
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>Try Example Ideas:</span>
              <button
                type="button"
                className="preset-btn"
                onClick={() => handleAnalyzeIdea('My startup uses AI and MRI images to automatically detect brain tumors and provides 3D visualization for doctors.')}
              >
                🧠 AI &amp; MRI Brain Tumor Diagnostic
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => handleAnalyzeIdea('Novel perovskite solar cell architectures with solid-state energy storage for decentralized microgrids.')}
              >
                ☀️ Perovskite Solar &amp; CleanTech Storage
              </button>
              <button
                type="button"
                className="preset-btn"
                onClick={() => handleAnalyzeIdea('CRISPR-Cas9 gene editing platform for drought-tolerant bio-fortified crop genetics.')}
              >
                🌱 CRISPR Agricultural Biotechnology
              </button>
            </div>

            <div className="analyzer-input-box">
              <textarea
                rows={4}
                placeholder="Describe your startup or research idea in detail (e.g., 'Our startup develops an autonomous edge-AI ultrasound scanner for rural maternal healthcare...')"
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  {ideaText.length} characters • Powered by {ideaResult?.ai_provider || 'Scientific Intelligence Engine'}
                </span>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleAnalyzeIdea()}
                  disabled={ideaLoading || ideaText.trim().length < 10}
                >
                  {ideaLoading ? '⏳ Analyzing Idea & Landscape...' : '🚀 Analyze Idea & Match Funding'}
                </button>
              </div>
            </div>

            {ideaError && (
              <div className="sync-banner error" style={{ marginTop: '1rem' }}>
                {ideaError}
              </div>
            )}
          </div>

          {ideaLoading && (
            <div className="state-container" style={{ marginTop: '2rem' }}>
              <div className="state-spinner"></div>
              <h3 className="state-title">Running Multi-Dimensional Intelligence Pipeline...</h3>
              <p className="state-desc">
                1. Extracting technologies, keywords, and applications.<br />
                2. Performing semantic search across real research papers in database.<br />
                3. Performing semantic search across real patent records in database.<br />
                4. Matching and ranking live funding calls with eligibility evaluations.<br />
                5. Calculating transparent funding suitability score.
              </p>
            </div>
          )}

          {ideaResult && !ideaLoading && (
            <div className="analyzer-results" style={{ marginTop: '2rem' }}>
              {/* Top Overview Bar */}
              <div className="idea-overview-card">
                <div className="overview-header">
                  <div>
                    <span className="domain-pill">🎯 {ideaResult.domain}</span>
                    <h3 style={{ margin: '0.6rem 0 0.3rem', fontSize: '1.3rem', color: '#0f172a' }}>
                      {decodeHtmlEntities(ideaResult.idea_summary)}
                    </h3>
                  </div>
                </div>

                <div className="overview-tags-grid">
                  <div>
                    <span className="tag-section-title">🔬 Research Subfields:</span>
                    <div className="tag-cluster">
                      {ideaResult.research_areas?.map((ra, idx) => (
                        <span key={idx} className="concept-pill area">
                          {decodeHtmlEntities(ra)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="tag-section-title">⚙️ Underlying Technologies:</span>
                    <div className="tag-cluster">
                      {ideaResult.technologies?.map((tech, idx) => (
                        <span key={idx} className="concept-pill tech">
                          {decodeHtmlEntities(tech)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="tag-section-title">🏥 Clinical &amp; Commercial Applications:</span>
                    <div className="tag-cluster">
                      {ideaResult.application_areas?.map((app, idx) => (
                        <span key={idx} className="concept-pill app">
                          {decodeHtmlEntities(app)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Funding Readiness / Suitability Gauge */}
              <div className="suitability-card">
                <div className="suitability-gauge-section">
                  <div className="gauge-circle">
                    <div className="gauge-number">{ideaResult.funding_suitability.suitability_score}%</div>
                    <div className="gauge-sublabel">Suitability Score</div>
                  </div>
                  <div>
                    <div className="readiness-badge">{ideaResult.funding_suitability.readiness_level}</div>
                    <p className="suitability-disclaimer">
                      {ideaResult.funding_suitability.disclaimer}
                    </p>
                  </div>
                </div>

                <div className="factors-breakdown">
                  <h4 style={{ margin: '0 0 0.8rem', color: '#1e293b' }}>Transparent Scoring Formula Breakdown:</h4>
                  <div className="factors-grid">
                    {ideaResult.funding_suitability.factors?.map((f, fIdx) => (
                      <div key={fIdx} className="factor-item">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.name} ({(f.weight * 100).toFixed(0)}%)</span>
                          <span style={{ fontWeight: 700, color: '#0b726e', fontSize: '0.85rem' }}>{f.score}%</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${Math.min(100, f.score)}%` }}></div>
                        </div>
                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>{f.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Research and Patent Overlap Landscape */}
              <div className="landscape-grid">
                {/* Research Papers Overlap */}
                <div className="landscape-card">
                  <div className="landscape-header">
                    <h4>📚 Research Paper Landscape</h4>
                    <span className={`overlap-pill ${ideaResult.research_landscape.overlap_level?.toLowerCase().includes('high') ? 'high' : ideaResult.research_landscape.overlap_level?.toLowerCase().includes('medium') ? 'medium' : 'low'}`}>
                      {ideaResult.research_landscape.overlap_level} ({ideaResult.research_landscape.top_similarity}%)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.8rem' }}>
                    {ideaResult.research_landscape.note}
                  </p>
                  <div className="landscape-items-list">
                    {ideaResult.research_landscape.top_matches?.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                        No closely matching academic papers found in available database.
                      </div>
                    ) : (
                      ideaResult.research_landscape.top_matches?.map((p) => (
                        <div key={p.id} className="prior-art-item">
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>{decodeHtmlEntities(p.title)}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0' }}>
                            ✍️ {decodeHtmlEntities(p.authors) || 'Authors Unspecified'} • 🏛️ {p.journal_or_conference || 'Academic Publication'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#0b726e', fontWeight: 600 }}>
                              Similarity: {p.similarity_percentage}%
                            </span>
                            {p.doi && (
                              <a href={p.doi.startsWith('http') ? p.doi : `https://doi.org/${p.doi}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                                View Paper ↗
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Patent Overlap */}
                <div className="landscape-card">
                  <div className="landscape-header">
                    <h4>⚖️ Patent Prior Art Landscape</h4>
                    <span className={`overlap-pill ${ideaResult.patent_landscape.overlap_level?.toLowerCase().includes('high') ? 'high' : ideaResult.patent_landscape.overlap_level?.toLowerCase().includes('medium') ? 'medium' : 'low'}`}>
                      {ideaResult.patent_landscape.overlap_level} ({ideaResult.patent_landscape.top_similarity}%)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.8rem' }}>
                    {ideaResult.patent_landscape.note}
                  </p>
                  <div className="landscape-items-list">
                    {ideaResult.patent_landscape.top_matches?.length === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                        No closely matching patent prior art records found in available database.
                      </div>
                    ) : (
                      ideaResult.patent_landscape.top_matches?.map((pt) => (
                        <div key={pt.id} className="prior-art-item">
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>{decodeHtmlEntities(pt.title)}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0' }}>
                            📜 Patent #{pt.patent_number} • 🏢 Assignee: {decodeHtmlEntities(pt.assignee) || 'Unspecified'}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.3rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#0b726e', fontWeight: 600 }}>
                              Similarity: {pt.similarity_percentage}%
                            </span>
                            {pt.classification && (
                              <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                Class: {pt.classification}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Recommended Real Funding Calls */}
              <div className="matched-grants-section" style={{ marginTop: '2rem' }}>
                <h3 style={{ margin: '0 0 1rem', color: '#0f172a' }}>
                  🎯 Recommended Live Funding Opportunities ({ideaResult.matching_funding?.length})
                </h3>
                <div className="recommendations-grid">
                  {ideaResult.matching_funding?.map((opp) => {
                    const isSaved = savedIds.has(opp.id)
                    return (
                      <div key={opp.id} className="funding-card">
                        <div>
                          <div className="funding-card-top">
                            <span className="funding-source-tag">{opp.source}</span>
                            <div className={`match-badge ${getMatchBadgeClass(opp.relevance_percentage)}`}>
                              {opp.relevance_percentage}% Match
                            </div>
                          </div>
                          <h2 className="funding-title">{decodeHtmlEntities(opp.title)}</h2>
                          <div className="funding-agency">🏛️ {decodeHtmlEntities(opp.agency)} • 📍 {opp.country}</div>
                          <p className="funding-desc">{stripHtml(opp.description).slice(0, 160)}...</p>
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
                          {opp.eligibility_assessment && (
                            <div className={`eligibility-box ${opp.eligibility_assessment.badge}`}>
                              <span style={{ fontWeight: 700 }}>{opp.eligibility_assessment.status}:</span> {opp.eligibility_assessment.rationale}
                            </div>
                          )}
                        </div>
                        <div className="funding-card-actions">
                          <button
                            type="button"
                            className={`btn-save ${isSaved ? 'saved' : ''}`}
                            onClick={() => handleToggleSave(opp.id)}
                          >
                            {isSaved ? '★ Saved' : '☆ Save'}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}
                            onClick={() => setSelectedOpp(opp)}
                          >
                            Details
                          </button>
                          {opp.official_link && (
                            <a href={opp.official_link} target="_blank" rel="noreferrer" className="btn-primary" style={{ fontSize: '0.8rem' }}>
                              Official Portal ↗
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Potential Issues & Recommended Next Steps */}
              <div className="guidance-grid" style={{ marginTop: '2rem' }}>
                <div className="guidance-card risks">
                  <h4>⚠️ Potential Issues Identified</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.6rem' }}>
                    AI-identified factors that may currently reduce funding suitability:
                  </p>
                  <ul>
                    {ideaResult.potential_risks?.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>

                <div className="guidance-card steps">
                  <h4>✅ Recommended Next Steps</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.6rem' }}>
                    Actionable milestones to maximize grant success:
                  </p>
                  <ul>
                    {ideaResult.recommended_next_steps?.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SAVED GRANTS */}
      {/* ======================================================== */}
      {activeTab === 'saved' && (
        <div>
          {savedOpportunities.length === 0 ? (
            <div className="state-container">
              <h3 className="state-title">No Saved Grants Yet</h3>
              <p className="state-desc">
                Click the "☆ Save" button on any funding opportunity card to bookmark it to your personalized grant shortlist.
              </p>
            </div>
          ) : (
            <div className="recommendations-grid">
              {savedOpportunities.map((item) => {
                const opp = item.funding_opportunity
                if (!opp) return null
                return (
                  <div key={opp.id} className="funding-card">
                    <div>
                      <div className="funding-card-top">
                        <span className="funding-source-tag">{opp.source}</span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                          Saved on {new Date(item.saved_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h2 className="funding-title">{decodeHtmlEntities(opp.title)}</h2>
                      <div className="funding-agency">🏛️ {decodeHtmlEntities(opp.agency) || opp.source} • 📍 {opp.country}</div>
                      <p className="funding-desc">
                        {stripHtml(opp.description).slice(0, 180)}...
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
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}
                        onClick={() => setSelectedOpp(opp)}
                      >
                        Details
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
      )}

      {/* Details Modal with Structured Intelligence Breakdown */}
      {selectedOpp && (() => {
        const intel = selectedOpp.structured_intelligence || {}
        const plainSummary = intel.plain_summary || stripHtml(selectedOpp.description)
        const deliverables = intel.deliverables || [
          { title: 'Proof-of-Concept / Prototype', detail: 'Develop and validate functional technology demonstration meeting initial milestone specifications.' },
          { title: 'Milestone Progress Reports', detail: 'Periodic submission of technical progress milestones and financial utilization statements.' },
          { title: 'Publications & Intellectual Property', detail: 'Dissemination through indexed peer-reviewed journals and patent/IP protection where applicable.' },
          { title: 'Translation & Adoption Roadmap', detail: 'Viable deployment plan for clinical, societal, or industrial adoption.' }
        ]
        const evalCriteria = intel.evaluation_criteria || [
          { criterion: 'Scientific Novelty & Innovation', weight: '30%', description: 'How distinct and groundbreaking your approach is compared to prior art.' },
          { criterion: 'Technical Feasibility & Methodology', weight: '25%', description: 'Rigor of work plan, milestone roadmap, and achievable timeline.' },
          { criterion: 'Team Expertise & Infrastructure', weight: '20%', description: 'Principal Investigator credentials and laboratory/computational resource access.' },
          { criterion: 'Societal & Economic Impact', weight: '15%', description: 'Tangible scale of healthcare, environmental, or economic benefit.' },
          { criterion: 'Budget Realism & Cost-Effectiveness', weight: '10%', description: 'Clear cost justification across equipment, manpower, and operations.' }
        ]
        const playbookTips = intel.playbook_tips || [
          'Define 3-5 quantifiable Key Performance Indicators (KPIs) with exact baseline vs. target milestones.',
          'Include a risk mitigation matrix addressing potential technical and operational bottlenecks.',
          'Align directly with the agency stated national priorities and translational roadmap.'
        ]
        const trlStage = intel.trl_stage || 'TRL 3 - 6 (Proof of Concept to Validation)'
        const eligibilityAssessment = selectedOpp.eligibility_assessment || {}

        return (
          <div className="funding-modal-overlay" onClick={() => setSelectedOpp(null)}>
            <div className="funding-modal-card wide-intel" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <span className="funding-source-tag">{selectedOpp.source}</span>
                    {selectedOpp.deadline_status && (
                      <span className={`funding-status-badge ${selectedOpp.deadline_status.includes('Active') ? 'active' : selectedOpp.deadline_status.includes('Closing') ? 'warning' : 'neutral'}`}>
                        ⏱️ {selectedOpp.deadline_status}
                      </span>
                    )}
                    {selectedOpp.relevance_percentage !== undefined && (
                      <span className="funding-match-badge">
                        ⚡ {selectedOpp.relevance_percentage}% Fit Match
                      </span>
                    )}
                  </div>
                  <h2 style={{ margin: '0.4rem 0 0.3rem', color: '#0f172a', fontSize: '1.45rem', lineHeight: 1.35 }}>
                    {decodeHtmlEntities(selectedOpp.title)}
                  </h2>
                  <div style={{ color: '#64748b', fontSize: '0.92rem', fontWeight: 600 }}>
                    🏛️ {decodeHtmlEntities(selectedOpp.agency)} • 📍 {selectedOpp.country}
                  </div>
                </div>
                <button type="button" className="modal-close-btn" onClick={() => setSelectedOpp(null)}>
                  ✕
                </button>
              </div>

              {/* Meta Grid */}
              <div className="funding-meta-grid" style={{ margin: '1.2rem 0' }}>
                <div className="meta-item">
                  <span className="meta-label">Funding Amount</span>
                  <span className="meta-value amount">{formatAmount(selectedOpp.funding_amount, selectedOpp.country)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Submission Deadline</span>
                  <span className="meta-value deadline">{formatDate(selectedOpp.close_date)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Grant / Program Type</span>
                  <span className="meta-value">{selectedOpp.funding_type || 'Extramural Research Grant'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Target Readiness Stage</span>
                  <span className="meta-value" style={{ color: '#0b726e', fontWeight: 700 }}>{trlStage}</span>
                </div>
              </div>

              {/* Section 1: Plain English Summary */}
              <div className="intel-card highlight-blue">
                <div className="intel-card-header">
                  <span className="intel-icon">💡</span>
                  <div>
                    <h4>What This Funding Is Actually About (In Simple Terms)</h4>
                    <p className="intel-subtitle">Core mission, problem statement, and why this grant exists</p>
                  </div>
                </div>
                <div className="intel-card-body">
                  <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.65, color: '#1e293b' }}>
                    {plainSummary}
                  </p>
                </div>
              </div>

              {/* Section 2: What They Expect From You (Deliverables) */}
              <div className="intel-card">
                <div className="intel-card-header">
                  <span className="intel-icon">🎯</span>
                  <div>
                    <h4>What The Agency Expects From You (Key Deliverables)</h4>
                    <p className="intel-subtitle">Concrete milestones and results required during the grant project</p>
                  </div>
                </div>
                <div className="intel-card-body">
                  <div className="deliverables-grid">
                    {deliverables.map((item, idx) => (
                      <div key={idx} className="deliverable-item">
                        <div className="deliverable-title">
                          <span className="check-badge">✓</span>
                          <span>{item.title}</span>
                        </div>
                        <div className="deliverable-detail">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 3: Grant Award & Evaluation Criteria */}
              <div className="intel-card">
                <div className="intel-card-header">
                  <span className="intel-icon">🏆</span>
                  <div>
                    <h4>How Proposals Are Evaluated (Award Criteria)</h4>
                    <p className="intel-subtitle">What reviewers look for when deciding who gets funded</p>
                  </div>
                </div>
                <div className="intel-card-body">
                  <div className="criteria-list">
                    {evalCriteria.map((crit, idx) => (
                      <div key={idx} className="criterion-row">
                        <div className="criterion-header">
                          <span className="criterion-name">{crit.criterion}</span>
                          <span className="criterion-weight">{crit.weight}</span>
                        </div>
                        <p className="criterion-desc">{crit.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 4: Eligibility & Applicant Profile */}
              <div className="intel-card">
                <div className="intel-card-header">
                  <span className="intel-icon">👥</span>
                  <div>
                    <h4>Applicant Eligibility & Profile Requirements</h4>
                    <p className="intel-subtitle">Who should apply and preliminary qualification check</p>
                  </div>
                </div>
                <div className="intel-card-body">
                  {eligibilityAssessment.status && (
                    <div style={{ marginBottom: '1rem', padding: '0.8rem 1rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #0b726e' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Automated Assessment:</span>
                        <span style={{ color: eligibilityAssessment.badge === 'success' ? '#16a34a' : '#ea580c' }}>
                          {eligibilityAssessment.status}
                        </span>
                      </div>
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#475569' }}>
                        {eligibilityAssessment.rationale}
                      </p>
                    </div>
                  )}
                  <div>
                    <h5 style={{ margin: '0 0 0.4rem', fontSize: '0.88rem', color: '#334155' }}>Official Eligibility Criteria:</h5>
                    <div className="modal-description-content" style={{ background: '#f8fafc', padding: '0.9rem' }}>
                      {renderCleanHtmlContent(selectedOpp.eligibility)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Strategic Proposal Playbook */}
              {playbookTips.length > 0 && (
                <div className="intel-card highlight-green">
                  <div className="intel-card-header">
                    <span className="intel-icon">🚀</span>
                    <div>
                      <h4>Strategic Proposal Playbook (Tips to Win This Grant)</h4>
                      <p className="intel-subtitle">Recommended methodology and structural best practices</p>
                    </div>
                  </div>
                  <div className="intel-card-body">
                    <ul className="playbook-list">
                      {playbookTips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Section 6: Full Verbatim Description from Portal */}
              <div className="modal-section-box">
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem', padding: '0.5rem 0' }}>
                    📑 View Complete Source Portal Notice (Verbatim Announcement)
                  </summary>
                  <div className="modal-description-content" style={{ marginTop: '0.8rem' }}>
                    {renderCleanHtmlContent(selectedOpp.description)}
                  </div>
                </details>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.2rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setSelectedOpp(null)}>
                  Close
                </button>
                {selectedOpp.official_link && (
                  <a href={selectedOpp.official_link} target="_blank" rel="noreferrer" className="btn-primary">
                    Open Official Portal ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Compare Modal */}
      {showCompareModal && (
        <div className="funding-modal-overlay" onClick={() => setShowCompareModal(false)}>
          <div className="funding-modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Opportunity Comparison Matrix</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowCompareModal(false)}>
                ✕
              </button>
            </div>

            <div className="compare-grid">
              {compareList.map((cOpp) => (
                <div key={cOpp.id} className="compare-col">
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '0.5rem' }}>
                    {decodeHtmlEntities(cOpp.title)}
                  </div>
                  <div className="compare-cell">
                    <span className="compare-cell-label">Agency &amp; Source:</span>
                    <span>{decodeHtmlEntities(cOpp.agency)} ({cOpp.source})</span>
                  </div>
                  <div className="compare-cell">
                    <span className="compare-cell-label">Match Score:</span>
                    <span style={{ fontWeight: 700, color: '#0b726e' }}>{cOpp.relevance_percentage}%</span>
                  </div>
                  <div className="compare-cell">
                    <span className="compare-cell-label">Funding Amount:</span>
                    <span style={{ fontWeight: 700 }}>{formatAmount(cOpp.funding_amount, cOpp.country)}</span>
                  </div>
                  <div className="compare-cell">
                    <span className="compare-cell-label">Deadline:</span>
                    <span>{formatDate(cOpp.close_date)}</span>
                  </div>
                  <div className="compare-cell">
                    <span className="compare-cell-label">Eligibility Assessment:</span>
                    <span>{cOpp.eligibility_assessment?.status || 'Assessed'}</span>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    {cOpp.official_link && (
                      <a href={cOpp.official_link} target="_blank" rel="noreferrer" className="btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}>
                        Visit Portal ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
