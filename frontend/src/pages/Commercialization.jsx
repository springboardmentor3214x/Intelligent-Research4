import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getFullCommercializationAnalysis } from '../services/commercializationService'
import './Commercialization.css'

const DEFAULT_TECHNOLOGIES = [
  'Medical Imaging AI',
  'Quantum Computing',
  'Edge AI',
  'Generative AI',
  'Robotics',
  'Cybersecurity'
]

export default function Commercialization() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTech = searchParams.get('technology') || 'Medical Imaging AI'
  
  const [searchTerm, setSearchTerm] = useState(initialTech)
  const [activeTech, setActiveTech] = useState(initialTech)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal / Evidence Drawer State
  const [selectedEvidence, setSelectedEvidence] = useState(null)
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false)

  const fetchAnalysis = async (tech) => {
    if (!tech.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await getFullCommercializationAnalysis(tech)
      setData(res)
    } catch (err) {
      console.error('Failed to load commercialization data:', err)
      setError(err.message || 'Failed to retrieve commercialization analysis')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis(activeTech)
  }, [activeTech])

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = searchTerm.trim()
    if (!trimmed) return
    if (trimmed !== activeTech) {
      setActiveTech(trimmed)
      setSearchParams({ technology: trimmed })
    } else {
      fetchAnalysis(trimmed)
    }
  }

  const handlePillClick = (tech) => {
    setSearchTerm(tech)
    if (tech !== activeTech) {
      setActiveTech(tech)
      setSearchParams({ technology: tech })
    } else {
      fetchAnalysis(tech)
    }
  }

  const openEvidenceModal = (evidenceObj, title) => {
    setSelectedEvidence({ data: evidenceObj, title: title || 'Supporting Evidence' })
    setIsEvidenceModalOpen(true)
  }

  const closeEvidenceModal = () => {
    setIsEvidenceModalOpen(false)
    setSelectedEvidence(null)
  }

  return (
    <div className="commercialization-page">
      {/* Top Header Card */}
      <section className="comm-header-card">
        <div className="comm-badge">
          <span>🚀</span> {activeTech} Commercialization Engine
        </div>
        <h1 className="comm-title">Commercialization Intelligence</h1>
        <p className="comm-subtitle">
          Translate empirical signals from Research Literature, Grant Funding, Patent Landscapes, 
          Technology Maturity, and Innovation Scoring into candidate real-world application areas, 
          product concepts, and startup opportunities for {activeTech}.
        </p>

        <form className="comm-search-form" onSubmit={handleSearch}>
          <div className="comm-input-wrapper">
            <input
              type="text"
              className="comm-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter any technology (e.g. Medical Imaging AI, Quantum Computing)..."
            />
          </div>
          <button type="submit" className="comm-search-btn" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>

        <div className="comm-quick-pills">
          <span className="comm-quick-label">Explore Technologies:</span>
          {DEFAULT_TECHNOLOGIES.map((tech) => (
            <button
              key={tech}
              type="button"
              className={`comm-pill-btn ${activeTech.toLowerCase() === tech.toLowerCase() ? 'active' : ''}`}
              onClick={() => handlePillClick(tech)}
            >
              {tech}
            </button>
          ))}
        </div>
      </section>

      {/* Loading View with Step-by-Step Signals */}
      {loading && (
        <div className="comm-loading-state">
          <div className="comm-spinner"></div>
          <h3 style={{ fontWeight: 800, color: '#0369a1', margin: '0 0 0.5rem' }}>
            Synthesizing Intelligence for {activeTech}
          </h3>
          <div style={{ maxWidth: 440, margin: '1rem auto 0', textAlign: 'left', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: '0.88rem', color: '#475569' }}>
            <div style={{ marginBottom: '0.4rem', color: '#047857' }}>✓ Target technology identified</div>
            <div style={{ marginBottom: '0.4rem', color: '#047857' }}>✓ Research &amp; scientific literature indexed</div>
            <div style={{ marginBottom: '0.4rem', color: '#047857' }}>✓ Patent landscape &amp; organizations verified</div>
            <div style={{ marginBottom: '0.4rem', color: '#047857' }}>✓ Technology maturity &amp; adoption mapped</div>
            <div style={{ color: '#0284c7', fontWeight: 600 }}>⟳ Generating evidence-grounded recommendations...</div>
          </div>
        </div>
      )}

      {/* Error / Insufficient Evidence View */}
      {!loading && (error || (data && data.status === 'insufficient_evidence')) && (
        <div className="comm-insufficient-box">
          <div className="comm-insufficient-icon">⚠️</div>
          <h2 className="comm-insufficient-title">
            {error ? 'Unable to Complete Analysis' : 'Insufficient Evidence'}
          </h2>
          <p className="comm-insufficient-desc">
            {data?.message || error || `Insufficient connected evidence found in the repository for ${activeTech}.`}
          </p>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="comm-search-btn"
              onClick={() => fetchAnalysis(activeTech)}
            >
              🔄 Retry Analysis
            </button>
            <button
              type="button"
              className="comm-pill-btn"
              style={{ background: '#0284c7', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: 10 }}
              onClick={() => handlePillClick('Medical Imaging AI')}
            >
              Explore Medical Imaging AI
            </button>
          </div>
        </div>
      )}

      {/* Content View */}
      {!loading && data && data.status === 'success' && (
        <>
          {/* Summary Metric Ribbon */}
          <div className="comm-summary-grid">
            <div className="comm-summary-card">
              <span className="comm-summary-label">Analyzed Technology</span>
              <span className="comm-summary-value" style={{ fontSize: '1.25rem' }}>{data.technology}</span>
              <span className="comm-summary-sub">Status: Connected</span>
            </div>

            <div className="comm-summary-card">
              <span className="comm-summary-label">Innovation Score</span>
              <span className="comm-summary-value">
                {data.innovation_score ? `${data.innovation_score} / 100` : 'Evaluating'}
              </span>
              <span className="comm-summary-sub">{data.innovation_level || 'Empirical Score'}</span>
            </div>

            <div className="comm-summary-card">
              <span className="comm-summary-label">Technology Stage</span>
              <span className="comm-summary-value">{data.technology_stage}</span>
              <span className="comm-summary-sub">Adoption: {data.adoption_level}</span>
            </div>

            <div className="comm-summary-card">
              <span className="comm-summary-label">Evidence Coverage</span>
              <span className="comm-summary-value">{data.evidence_coverage}</span>
              <span className="comm-summary-sub">{data.coverage_percentage}% Connected Signals</span>
            </div>
          </div>

          {/* Interactive Commercialization Pathway Map */}
          <div className="comm-pathway-container">
            <div className="comm-pathway-header">
              <span className="comm-pathway-icon">🧭</span>
              <div>
                <h3 className="comm-pathway-title">Commercialization Intelligence Pathway</h3>
                <p className="comm-pathway-subtitle">
                  Evidence-driven synthesis flowing from Research, Patents, Technology &amp; Innovation signals into targeted commercialization pathways. Click any channel to navigate directly.
                </p>
              </div>
            </div>

            <div className="comm-pathway-pipeline">
              <div className="comm-pipeline-step">
                <span className="comm-step-icon">📄</span>
                <span className="comm-step-title">Research</span>
                <span className="comm-step-count">{data.evidence.research_papers.length} Papers</span>
              </div>
              <div className="comm-pipeline-arrow">➔</div>

              <div className="comm-pipeline-step">
                <span className="comm-step-icon">⚡</span>
                <span className="comm-step-title">Technology</span>
                <span className="comm-step-count">{data.technology_stage}</span>
              </div>
              <div className="comm-pipeline-arrow">➔</div>

              <div className="comm-pipeline-step">
                <span className="comm-step-icon">🏛️</span>
                <span className="comm-step-title">Patent / IP</span>
                <span className="comm-step-count">{data.evidence.patents.length} Filings</span>
              </div>
              <div className="comm-pipeline-arrow">➔</div>

              <div className="comm-pipeline-step">
                <span className="comm-step-icon">📊</span>
                <span className="comm-step-title">Innovation</span>
                <span className="comm-step-count">{data.innovation_score ? `${data.innovation_score}/100` : 'Empirical'}</span>
              </div>
            </div>

            <div className="comm-pathway-branches">
              <a href="#section-products" className="comm-pathway-branch-btn branch-product">
                <span className="comm-branch-icon">📦</span>
                <div>
                  <div className="comm-branch-title">Product Opportunities ({data.products.length})</div>
                  <div className="comm-branch-sub">Architectures &amp; Delivery</div>
                </div>
              </a>

              <a href="#section-startups" className="comm-pathway-branch-btn branch-startup">
                <span className="comm-branch-icon">💼</span>
                <div>
                  <div className="comm-branch-title">Startup Ventures ({data.startups.length})</div>
                  <div className="comm-branch-sub">Business Models &amp; Grants</div>
                </div>
              </a>

              <a href="#section-licensing" className="comm-pathway-branch-btn branch-licensing">
                <span className="comm-branch-icon">📜</span>
                <div>
                  <div className="comm-branch-title">Licensing Pathways ({data.licensing_opportunities?.length || 0})</div>
                  <div className="comm-branch-sub">Patent Assignees &amp; IP Transfer</div>
                </div>
              </a>

              <a href="#section-partnerships" className="comm-pathway-branch-btn branch-partner">
                <span className="comm-branch-icon">🤝</span>
                <div>
                  <div className="comm-branch-title">Industry Partners ({data.industry_partnerships?.length || 0})</div>
                  <div className="comm-branch-sub">Pilots &amp; Co-Development</div>
                </div>
              </a>
            </div>
          </div>

          {/* =========================================================
              SECTION 2: COMMERCIALIZATION READINESS (7 Evidence Dimensions)
              ========================================================= */}
          {data.readiness_dimensions && data.readiness_dimensions.length > 0 && (
            <section className="comm-section" id="section-readiness">
              <div className="comm-section-header">
                <div className="comm-section-title-wrap">
                  <span className="comm-section-icon">📈</span>
                  <h2 className="comm-section-title">Commercialization Readiness</h2>
                </div>
                <span className="comm-section-badge">7 Evidence-Backed Dimensions</span>
              </div>

              <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                Multi-dimensional evaluation grounded in verified research activity, patent landscape maturity, organization participation, and funding support.
              </p>

              <div className="comm-readiness-grid">
                {data.readiness_dimensions.map((dim, idx) => (
                  <div key={idx} className="comm-readiness-card">
                    <div className="comm-readiness-card-top">
                      <h4 className="comm-readiness-dimension-title">{dim.dimension}</h4>
                      <span className={`comm-readiness-status-badge status-${dim.status.toLowerCase().replace(/[\s\/]+/g, '-')}`}>
                        {dim.status}
                      </span>
                    </div>

                    <p className="comm-readiness-evidence-text">
                      <strong>Evidence:</strong> {dim.evidence}
                    </p>

                    {dim.limitation && (
                      <p className="comm-readiness-limitation-text">
                        <span>ℹ️</span> <strong>Limitation:</strong> {dim.limitation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =========================================================
              SECTION 3: RESEARCH COMMERCIALIZATION ANALYSIS
              ========================================================= */}
          <section className="comm-section" id="section-applications">
            <div className="comm-section-header">
              <div className="comm-section-title-wrap">
                <span className="comm-section-icon">🌐</span>
                <h2 className="comm-section-title">Research Commercialization Analysis</h2>
              </div>
              <span className="comm-section-badge">{data.technology} Applications</span>
            </div>

            <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
              Identifies candidate application areas and industries where this research or technology can potentially be applied based on empirical evidence.
            </p>

            <div className="comm-cards-grid">
              {data.applications.map((app, idx) => (
                <div key={idx} className="comm-card">
                  <div>
                    <div className="comm-card-header">
                      <h3 className="comm-card-title">{app.application_name}</h3>
                      <span className={`comm-relevance-tag comm-relevance-${app.relevance.toLowerCase()}`}>
                        {app.relevance} Relevance
                      </span>
                    </div>

                    <div className="comm-meta-row">
                      <span className="comm-meta-chip">
                        <strong>Industry:</strong> {app.potential_industry}
                      </span>
                    </div>

                    <div className="comm-card-body">
                      <div className="comm-field-block">
                        <div className="comm-field-label">Why Relevant</div>
                        <p className="comm-field-text">{app.why_relevant}</p>
                      </div>

                      <div className="comm-field-block">
                        <div className="comm-field-label">Potential Users</div>
                        <p className="comm-field-text">{app.potential_users}</p>
                      </div>

                      <div className="comm-field-block">
                        <div className="comm-field-label">Potential Use Case</div>
                        <p className="comm-field-text">{app.potential_use_case}</p>
                      </div>

                      <div className="comm-field-block">
                        <div className="comm-field-label">Supporting Evidence Signals</div>
                        <ul className="comm-list-items">
                          {app.supporting_evidence.map((ev, eIdx) => (
                            <li key={eIdx}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="comm-card-footer">
                    <div className="comm-next-step-box">
                      <div className="comm-next-step-title">Suggested Next Step</div>
                      <p className="comm-next-step-desc">{app.suggested_next_step}</p>
                    </div>

                    <button
                      type="button"
                      className="comm-view-evidence-btn"
                      onClick={() => openEvidenceModal(data.evidence, app.application_name, `Evidence indicates strong suitability for ${app.application_name} across ${app.potential_industry}.`)}
                    >
                      <span>🔍</span> View Evidence
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* =========================================================
              SECTION 4: PRODUCTIZATION OPPORTUNITIES
              ========================================================= */}
          <section className="comm-section" id="section-products">
            <div className="comm-section-header">
              <div className="comm-section-title-wrap">
                <span className="comm-section-icon">📦</span>
                <h2 className="comm-section-title">Productization Opportunities</h2>
              </div>
              <span className="comm-section-badge">{data.technology} Products</span>
            </div>

            <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
              Actionable candidate product and service architectures synthesized from problem-solution matching, patent landscaping, and maturity signals.
            </p>

            <div className="comm-cards-grid">
              {data.products.map((prod, idx) => (
                <div key={idx} className="comm-card">
                  <div>
                    <div className="comm-card-header">
                      <h3 className="comm-card-title">{prod.product_name}</h3>
                      <span className="comm-relevance-tag comm-relevance-high">
                        {prod.possible_delivery_model.split('/')[0]}
                      </span>
                    </div>

                    <div className="comm-meta-row">
                      <span className="comm-meta-chip">
                        <strong>Target Industry:</strong> {prod.target_industry}
                      </span>
                      <span className="comm-meta-chip">
                        <strong>Delivery:</strong> {prod.possible_delivery_model}
                      </span>
                    </div>

                    <div className="comm-card-body">
                      <div className="comm-field-block">
                        <div className="comm-field-label">Problem Addressed</div>
                        <p className="comm-field-text">{prod.problem}</p>
                      </div>

                      <div className="comm-field-block">
                        <div className="comm-field-label">Proposed Solution</div>
                        <p className="comm-field-text">{prod.proposed_solution}</p>
                      </div>

                      <div className="comm-field-block">
                        <div className="comm-field-label">Target Users</div>
                        <p className="comm-field-text">{prod.target_users}</p>
                      </div>

                      <div className="comm-field-block">
                        <div className="comm-field-label">Core Technology Stack</div>
                        <p className="comm-field-text" style={{ fontWeight: 600, color: '#0369a1' }}>
                          {prod.core_technology}
                        </p>
                      </div>

                      <div className="comm-field-block">
                        <div className="comm-field-label">Technical Components &amp; Requirements</div>
                        <ul className="comm-list-items">
                          {prod.required_technical_components.map((comp, cIdx) => (
                            <li key={cIdx}>{comp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="comm-card-footer">
                    <div className="comm-next-step-box">
                      <div className="comm-next-step-title">Suggested Next Step</div>
                      <p className="comm-next-step-desc">
                        {prod.suggested_next_steps[0] || 'Conduct prototype pilot validation.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="comm-view-evidence-btn"
                      onClick={() => openEvidenceModal(data.evidence, prod.product_name, `Product concept '${prod.product_name}' addressing: ${prod.problem}`)}
                    >
                      <span>🔍</span> View Evidence
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* =========================================================
              SECTION 5: STARTUP OPPORTUNITIES
              ========================================================= */}
          <section className="comm-section" id="section-startups">
            <div className="comm-section-header">
              <div className="comm-section-title-wrap">
                <span className="comm-section-icon">💼</span>
                <h2 className="comm-section-title">Startup Opportunities</h2>
              </div>
              <span className="comm-section-badge">{data.technology} Ventures</span>
            </div>

            <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
              Candidate venture directions, business models, and relevant grant/funding support grounded in connected intelligence.
            </p>

            <div className="comm-cards-grid">
              {data.startups.map((st, idx) => (
                <div key={idx} className="comm-card">
                  <div>
                    <div className="comm-card-header">
                      <h3 className="comm-card-title">{st.startup_concept}</h3>
                      <span className="comm-relevance-tag comm-relevance-high">
                        {st.opportunity_signal}
                      </span>
                    </div>

                    <div className="comm-meta-row">
                      <span className="comm-meta-chip">
                        <strong>Target Customers:</strong> {st.target_customers}
                      </span>
                      <span className="comm-meta-chip">
                        <strong>Industry:</strong> {st.target_industry}
                      </span>
                    </div>

                    <div className="comm-card-body">
                      <div className="comm-field-block">
                        <div className="comm-field-label">Market Problem</div>
                        <p className="comm-field-text">{st.problem}</p>
                      </div>

                      <div className="comm-field-block">
                        <div className="comm-field-label">Proposed Venture Solution</div>
                        <p className="comm-field-text">{st.proposed_solution}</p>
                      </div>

                      <div className="comm-field-block">
                        <div className="comm-field-label">Possible Business Model</div>
                        <p className="comm-field-text" style={{ fontWeight: 600, color: '#047857' }}>
                          {st.possible_business_model}
                        </p>
                      </div>

                      <div className="comm-field-block">
                        <div className="comm-field-label">Competitive &amp; Patent Context</div>
                        <p className="comm-field-text">{st.competitive_context}</p>
                      </div>

                      {/* Matching Funding Opportunities */}
                      <div className="comm-field-block">
                        <div className="comm-field-label">Relevant Funding &amp; Grant Support</div>
                        {st.relevant_funding_opportunities && st.relevant_funding_opportunities.length > 0 ? (
                          <div className="comm-funding-list">
                            {st.relevant_funding_opportunities.map((fund, fIdx) => (
                              <div key={fIdx} className="comm-funding-item-card">
                                <div className="comm-funding-item-top">
                                  <strong>{fund.title}</strong>
                                  <span className="comm-funding-status-badge">{fund.status || 'Active'}</span>
                                </div>
                                <div className="comm-funding-item-meta">
                                  <span>🏛️ {fund.agency}</span>
                                  <span>💰 {fund.amount}</span>
                                  <span>📅 {fund.deadline}</span>
                                </div>
                                {fund.why_matched && (
                                  <div className="comm-funding-why-matched">
                                    <span>🎯 Match Rationale:</span> {fund.why_matched}
                                  </div>
                                )}
                                {fund.official_link && (
                                  <a
                                    href={fund.official_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="comm-funding-link"
                                  >
                                    Official Source / Apply ↗
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic', margin: '0.3rem 0' }}>
                            No strongly matched funding opportunities were identified in the connected funding data for this specific sub-concept.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="comm-card-footer">
                    <div className="comm-next-step-box">
                      <div className="comm-next-step-title">Suggested First Step</div>
                      <p className="comm-next-step-desc">{st.suggested_first_step}</p>
                    </div>

                    <button
                      type="button"
                      className="comm-view-evidence-btn"
                      onClick={() => openEvidenceModal(data.evidence, st.startup_concept, `Venture direction '${st.startup_concept}' addressing ${st.problem}`)}
                    >
                      <span>🔍</span> View Evidence
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* =========================================================
              SECTION 6: LICENSING OPPORTUNITIES
              ========================================================= */}
          {data.licensing_opportunities && data.licensing_opportunities.length > 0 && (
            <section className="comm-section" id="section-licensing">
              <div className="comm-section-header">
                <div className="comm-section-title-wrap">
                  <span className="comm-section-icon">📜</span>
                  <h2 className="comm-section-title">Licensing Opportunities</h2>
                </div>
                <span className="comm-section-badge">{data.technology} IP Candidates</span>
              </div>

              <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                Potential intellectual property transfer, non-exclusive commercialization, or joint technology licensing candidates identified from patent assignees and technology domains.
              </p>

              <div className="comm-cards-grid">
                {data.licensing_opportunities.map((lic, idx) => (
                  <div key={idx} className="comm-card">
                    <div>
                      <div className="comm-card-header">
                        <h3 className="comm-card-title">{lic.organization}</h3>
                        <span className="comm-relevance-tag comm-relevance-medium">
                          {lic.candidate_type}
                        </span>
                      </div>

                      <div className="comm-meta-row">
                        <span className="comm-meta-chip">
                          <strong>Domain:</strong> {lic.industry_domain}
                        </span>
                        <span className="comm-meta-chip">
                          <strong>Relevance:</strong> {lic.relevance}
                        </span>
                      </div>

                      <div className="comm-card-body">
                        <div className="comm-field-block">
                          <div className="comm-field-label">Why Relevant Candidate</div>
                          <p className="comm-field-text">{lic.why_relevant}</p>
                        </div>

                        <div className="comm-field-block">
                          <div className="comm-field-label">Potential Licensing Pathway</div>
                          <p className="comm-field-text" style={{ fontWeight: 600, color: '#0369a1' }}>
                            {lic.potential_pathway}
                          </p>
                        </div>

                        {lic.related_patents && lic.related_patents.length > 0 && (
                          <div className="comm-field-block">
                            <div className="comm-field-label">Related Patent Filings in Portfolio</div>
                            <ul className="comm-list-items">
                              {lic.related_patents.map((patName, pIdx) => (
                                <li key={pIdx}>{patName}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="comm-card-footer">
                      <div className="comm-next-step-box">
                        <div className="comm-next-step-title">Suggested Next Step</div>
                        <p className="comm-next-step-desc">{lic.suggested_action}</p>
                      </div>

                      <button
                        type="button"
                        className="comm-view-evidence-btn"
                        onClick={() => openEvidenceModal(data.evidence, lic.organization, `Licensing candidate evaluation for ${lic.organization} in ${lic.industry_domain}`)}
                      >
                        <span>🔍</span> View Evidence
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =========================================================
              SECTION 7: INDUSTRY PARTNERSHIP OPPORTUNITIES
              ========================================================= */}
          {data.industry_partnerships && data.industry_partnerships.length > 0 && (
            <section className="comm-section" id="section-partnerships">
              <div className="comm-section-header">
                <div className="comm-section-title-wrap">
                  <span className="comm-section-icon">🤝</span>
                  <h2 className="comm-section-title">Industry Partnership Opportunities</h2>
                </div>
                <span className="comm-section-badge">{data.technology} Ecosystem</span>
              </div>

              <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                Collaborative R&amp;D, clinical validation, and pilot deployment candidates synthesized from domain participation and funding consortiums.
              </p>

              <div className="comm-cards-grid">
                {data.industry_partnerships.map((part, idx) => (
                  <div key={idx} className="comm-card">
                    <div>
                      <div className="comm-card-header">
                        <h3 className="comm-card-title">{part.organization}</h3>
                        <span className="comm-relevance-tag comm-relevance-high">
                          {part.opportunity_label}
                        </span>
                      </div>

                      <div className="comm-meta-row">
                        <span className="comm-meta-chip">
                          <strong>Partnership Type:</strong> {part.partnership_type}
                        </span>
                        <span className="comm-meta-chip">
                          <strong>Target Sector:</strong> {part.target_sector}
                        </span>
                      </div>

                      <div className="comm-card-body">
                        <div className="comm-field-block">
                          <div className="comm-field-label">Synergy &amp; Strategic Rationale</div>
                          <p className="comm-field-text">{part.synergy_reason}</p>
                        </div>

                        {part.supporting_evidence && part.supporting_evidence.length > 0 && (
                          <div className="comm-field-block">
                            <div className="comm-field-label">Supporting Empirical Evidence</div>
                            <ul className="comm-list-items">
                              {part.supporting_evidence.map((ev, evIdx) => (
                                <li key={evIdx}>{ev}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="comm-card-footer">
                      <div className="comm-next-step-box">
                        <div className="comm-next-step-title">Suggested Engagement</div>
                        <p className="comm-next-step-desc">{part.suggested_engagement}</p>
                      </div>

                      <button
                        type="button"
                        className="comm-view-evidence-btn"
                        onClick={() => openEvidenceModal(data.evidence, part.organization, `Industry partnership rationale for ${part.organization}`)}
                      >
                        <span>🔍</span> View Evidence
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =========================================================
              SECTION 8: COMMERCIALIZATION GAP ANALYSIS
              ========================================================= */}
          {data.gap_analysis && (
            <section className="comm-section" id="section-gap-analysis">
              <div className="comm-section-header">
                <div className="comm-section-title-wrap">
                  <span className="comm-section-icon">⚖️</span>
                  <h2 className="comm-section-title">Commercialization Gap Analysis</h2>
                </div>
                <span className="comm-section-badge">Evidence vs. Missing Signals</span>
              </div>

              <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                Evaluates what is empirically present versus what operational or clinical hurdles must be bridged prior to large-scale commercialization.
              </p>

              <div className="comm-gap-container">
                <div className="comm-gap-grid">
                  {/* Available Evidence Box */}
                  <div className="comm-gap-box comm-gap-box-available">
                    <div className="comm-gap-box-header">
                      <span className="comm-gap-status-icon">✓</span>
                      <h4 className="comm-gap-box-title">Available Evidence Signals</h4>
                    </div>
                    <ul className="comm-gap-list">
                      {data.gap_analysis.available_evidence.map((av, idx) => (
                        <li key={idx} className="comm-gap-item-available">
                          <span className="comm-gap-bullet">✓</span> {av}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Missing / Limited Evidence Box */}
                  <div className="comm-gap-box comm-gap-box-missing">
                    <div className="comm-gap-box-header">
                      <span className="comm-gap-status-icon">⚠️</span>
                      <h4 className="comm-gap-box-title">Missing / Limited Evidence Gaps</h4>
                    </div>
                    <ul className="comm-gap-list">
                      {data.gap_analysis.missing_or_limited_evidence.map((mis, idx) => (
                        <li key={idx} className="comm-gap-item-missing">
                          <span className="comm-gap-bullet">⚠️</span> {mis}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommended Next Actions */}
                <div className="comm-gap-actions-card">
                  <h4 className="comm-gap-actions-title">
                    <span>📋</span> Recommended Commercialization Actions
                  </h4>
                  <div className="comm-gap-action-steps">
                    {data.gap_analysis.recommended_actions.map((act, idx) => (
                      <div key={idx} className="comm-gap-action-step">
                        <span className="comm-gap-action-num">{idx + 1}</span>
                        <span className="comm-gap-action-text">{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =========================================================
              SECTION 9: PATENT → PRODUCT MAPPING
              ========================================================= */}
          {data.patent_product_mappings && data.patent_product_mappings.length > 0 && (
            <section className="comm-section" id="section-patent-mapping">
              <div className="comm-section-header">
                <div className="comm-section-title-wrap">
                  <span className="comm-section-icon">🔗</span>
                  <h2 className="comm-section-title">Patent → Product Mapping</h2>
                </div>
                <span className="comm-section-badge">IP to Product Traceability</span>
              </div>

              <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                Traces how identified patent capabilities and intellectual property translate into potential functional applications and viable product architectures.
              </p>

              <div className="comm-mapping-list">
                {data.patent_product_mappings.map((mapping, idx) => (
                  <div key={idx} className="comm-mapping-card">
                    <div className="comm-mapping-header">
                      <div className="comm-mapping-patent-info">
                        <span className="comm-mapping-tag">{mapping.patent_number || `Patent #${idx + 1}`}</span>
                        <strong className="comm-mapping-patent-title">{mapping.patent_title}</strong>
                        {mapping.assignee && (
                          <span className="comm-mapping-assignee">Assignee: {mapping.assignee}</span>
                        )}
                      </div>
                      <span className="comm-mapping-industry-badge">{mapping.target_industry}</span>
                    </div>

                    <div className="comm-mapping-flow">
                      <div className="comm-mapping-node node-capability">
                        <div className="comm-node-label">1. Technology Capability</div>
                        <div className="comm-node-val">{mapping.technology_capability}</div>
                      </div>
                      <div className="comm-mapping-flow-arrow">➔</div>

                      <div className="comm-mapping-node node-application">
                        <div className="comm-node-label">2. Target Application</div>
                        <div className="comm-node-val">{mapping.potential_application}</div>
                      </div>
                      <div className="comm-mapping-flow-arrow">➔</div>

                      <div className="comm-mapping-node node-product">
                        <div className="comm-node-label">3. Potential Product Concept</div>
                        <div className="comm-node-val">{mapping.potential_product}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* =========================================================
              SECTION 10: ENRICHED VIEW EVIDENCE MODAL
              ========================================================= */}
          {isEvidenceModalOpen && selectedEvidence && (
            <div className="comm-modal-overlay" onClick={closeEvidenceModal}>
              <div className="comm-modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="comm-modal-header">
                  <div>
                    <span className="comm-modal-kicker">Empirical Verification</span>
                    <h3 className="comm-modal-title">
                      Evidence Trace: {selectedEvidence.title}
                    </h3>
                  </div>
                  <button type="button" className="comm-modal-close-btn" onClick={closeEvidenceModal}>
                    ✕
                  </button>
                </div>

                <div className="comm-modal-body">
                  {/* Synthesis Trace Banner */}
                  {selectedEvidence.rationale && (
                    <div className="comm-evidence-rationale-box">
                      <div className="comm-evidence-rationale-title">Evidence → Recommendation Trace</div>
                      <p className="comm-evidence-rationale-text">{selectedEvidence.rationale}</p>
                    </div>
                  )}

                  {/* Research Papers Evidence */}
                  <div className="comm-evidence-block">
                    <div className="comm-evidence-heading">
                      <span>📄</span> Scientific Research Evidence ({data.evidence.research_papers.length})
                    </div>
                    {data.evidence.research_papers.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No direct research papers indexed.</p>
                    ) : (
                      <table className="comm-evidence-table">
                        <thead>
                          <tr>
                            <th>Paper Title</th>
                            <th>Domain</th>
                            <th>Year</th>
                            <th>Citations</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.evidence.research_papers.map((p, pIdx) => (
                            <tr key={pIdx}>
                              <td style={{ fontWeight: 600 }}>{p.title}</td>
                              <td>{p.domain || 'Advanced Research'}</td>
                              <td>{p.year || 'Recent'}</td>
                              <td>{p.citation_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Patent Intelligence Evidence */}
                  <div className="comm-evidence-block">
                    <div className="comm-evidence-heading">
                      <span>🏛️</span> Patent Landscape Evidence ({data.evidence.patents.length})
                    </div>
                    {data.evidence.patents.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No direct patents indexed.</p>
                    ) : (
                      <table className="comm-evidence-table">
                        <thead>
                          <tr>
                            <th>Patent Title</th>
                            <th>Assignee / Applicant</th>
                            <th>Domain</th>
                            <th>Year</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.evidence.patents.map((pat, ptIdx) => (
                            <tr key={ptIdx}>
                              <td style={{ fontWeight: 600 }}>{pat.title}</td>
                              <td>{pat.assignee || 'Assigned Organization'}</td>
                              <td>{pat.technology_domain || 'Technology Classification'}</td>
                              <td>{pat.year || 'Recent'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Funding Opportunities Evidence */}
                  <div className="comm-evidence-block">
                    <div className="comm-evidence-heading">
                      <span>🎯</span> Grant &amp; Funding Opportunities Evidence ({data.evidence.funding_opportunities.length})
                    </div>
                    {data.evidence.funding_opportunities.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No strongly matched funding opportunities identified.</p>
                    ) : (
                      <table className="comm-evidence-table">
                        <thead>
                          <tr>
                            <th>Opportunity Title</th>
                            <th>Agency / Sponsor</th>
                            <th>Amount</th>
                            <th>Deadline</th>
                            <th>Match Rationale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.evidence.funding_opportunities.map((f, fIdx) => (
                            <tr key={fIdx}>
                              <td style={{ fontWeight: 600 }}>
                                {f.official_link ? (
                                  <a href={f.official_link} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'underline' }}>
                                    {f.title}
                                  </a>
                                ) : (
                                  f.title
                                )}
                              </td>
                              <td>{f.agency || 'Funding Agency'}</td>
                              <td>{f.amount}</td>
                              <td>{f.deadline}</td>
                              <td style={{ fontSize: '0.82rem', color: '#475569' }}>{f.why_matched || 'Domain relevance'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Technology Intelligence & Innovation Evidence */}
                  <div className="comm-evidence-block">
                    <div className="comm-evidence-heading">
                      <span>⚡</span> Technology Maturity &amp; Innovation Signals
                    </div>
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', fontSize: '0.88rem' }}>
                      <p style={{ margin: '0 0 0.5rem' }}>
                        <strong>Maturity Stage:</strong> {data.technology_stage} (Adoption Level: {data.adoption_level})
                      </p>
                      <p style={{ margin: '0 0 0.5rem' }}>
                        <strong>Innovation Score:</strong> {data.innovation_score || 'N/A'}/100 ({data.innovation_level || 'N/A'})
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Associated Organizations:</strong>{' '}
                        {data.evidence.organizations.length > 0
                          ? data.evidence.organizations.join(', ')
                          : 'R&D Organizations'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
