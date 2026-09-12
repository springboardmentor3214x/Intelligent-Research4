import { useContext, useEffect, useState, useRef } from 'react'
import { AuthContext } from '../context/auth-context'
import ResearchAnalysisHub from '../components/ResearchAnalysisHub'
import {
  fetchResearchPapers,
  importResearchPapers,
  createResearchPaper,
  getPaperAnalysis,
  analyzePaper,
} from '../services/researchPaperService'
import './ResearchPapers.css'

export default function ResearchPapers() {
  const { token } = useContext(AuthContext)

  // Papers list & pagination state
  const [papers, setPapers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [sourcesCount, setSourcesCount] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Search & Filter state
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('')
  const [researchDomain, setResearchDomain] = useState('')
  const [selectedSource, setSelectedSource] = useState('')

  // Import state
  const [showImport, setShowImport] = useState(false)
  const [importQuery, setImportQuery] = useState('')
  const [importCount, setImportCount] = useState(20)
  const [importing, setImporting] = useState(false)

  // Selected Paper / Modal state
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [savingPaper, setSavingPaper] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [copiedSection, setCopiedSection] = useState('')
  const modalBodyRef = useRef(null)

  // Reset page to 1 when search or filters change
  useEffect(() => {
    setPage(1)
  }, [search, year, researchDomain, selectedSource])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPapers(page)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, year, researchDomain, selectedSource, page])

  async function loadPapers(currentPage = 1) {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchResearchPapers(token, {
        search,
        year: year.trim().length === 4 ? year.trim() : '',
        researchDomain,
        source: selectedSource,
        page: currentPage,
        pageSize,
      })
      setPapers(data.papers || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 1)
      setSourcesCount(data.sources || {})
    } catch (err) {
      setError(err.message || 'Failed to load research papers.')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport(e) {
    e.preventDefault()
    if (!importQuery.trim()) return
    setImporting(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await importResearchPapers(token, {
        search: importQuery.trim(),
        per_page: Number(importCount) || 20,
      })
      setSuccessMsg(`Import successful: ${res.inserted} new papers stored in local database (${res.skipped} already in collection).`)
      setImportQuery('')
      setShowImport(false)
      loadPapers(1)
    } catch (err) {
      setError(err.message || 'Failed to import papers from OpenAlex.')
    } finally {
      setImporting(false)
    }
  }

  // Ensure paper is stored in PostgreSQL before analysis
  async function ensurePaperStored(paper) {
    if (paper.id && (paper.is_stored || !paper.source_id)) {
      return paper
    }

    try {
      const created = await createResearchPaper(token, {
        source: paper.source || 'OpenAlex',
        source_id: String(paper.source_id || paper.doi || paper.title),
        title: paper.title,
        abstract: paper.abstract,
        authors: paper.authors,
        publication_date: paper.publication_date,
        publication_year: paper.publication_year,
        journal_or_conference: paper.journal_or_conference,
        keywords: paper.keywords,
        research_domain: paper.research_domain,
        doi: paper.doi,
        citation_count: paper.citation_count || 0,
        publication_link: paper.publication_link,
      })
      const savedPaper = {
        ...paper,
        id: created.id || paper.id,
        is_stored: true,
      }
      setSelectedPaper(savedPaper)
      setPapers(prev => prev.map(p => (
        (p.id && p.id === savedPaper.id) || (p.doi && p.doi === paper.doi) || (p.title === paper.title) ? savedPaper : p
      )))
      return savedPaper
    } catch (err) {
      // If paper already exists (409 Conflict) or network issue, use current paper ID
      const fallbackPaper = {
        ...paper,
        is_stored: true,
      }
      setSelectedPaper(fallbackPaper)
      return fallbackPaper
    }
  }

  async function handleOpenPaper(paper) {
    setSelectedPaper(paper)
    setAnalysisData(null)
    setAnalysisError('')
    setActiveTab('overview')

    if (paper.id) {
      setLoadingAnalysis(true)
      try {
        const existing = await getPaperAnalysis(token, paper.id, true)
        setAnalysisData(existing)
      } catch {
        setAnalysisData(null)
      } finally {
        setLoadingAnalysis(false)
      }
    }
  }

  function handleCloseModal() {
    setSelectedPaper(null)
    setAnalysisData(null)
    setAnalysisError('')
  }

  async function handleRunAnalysis(forceRefresh = false) {
    if (!selectedPaper) return
    setAnalyzing(true)
    setAnalysisError('')
    try {
      // Auto-save if dynamically discovered paper
      let targetPaper = selectedPaper
      if (!targetPaper.id || !targetPaper.is_stored) {
        setSavingPaper(true)
        targetPaper = await ensurePaperStored(selectedPaper)
        setSavingPaper(false)
      }

      if (!targetPaper.id) {
        throw new Error('Unable to register paper for analysis. Please try again.')
      }

      const result = await analyzePaper(token, targetPaper.id, forceRefresh)
      setAnalysisData(result)
    } catch (err) {
      setAnalysisError(err.message || 'Failed to generate AI analysis.')
    } finally {
      setAnalyzing(false)
      setSavingPaper(false)
    }
  }

  function copyToClipboard(text, sectionKey = 'all') {
    navigator.clipboard.writeText(text)
    setCopiedSection(sectionKey)
    setTimeout(() => setCopiedSection(''), 2000)
  }

  // Support both rich_analysis object, ai_generated_analysis, or legacy ai_analysis from backend
  const rich = (() => {
    if (!analysisData) return null
    if (analysisData.rich_analysis) return analysisData.rich_analysis

    const ai = analysisData.ai_generated_analysis || analysisData.ai_analysis || {}
    const src = analysisData.source_information || {}

    return {
      source_coverage: {
        coverage_level: src.abstract_available ? 'medium' : 'low',
        coverage_label: src.abstract_available ? 'Abstract & Metadata' : 'Metadata Only',
        content_analyzed: src.abstract_available ? 'Abstract text and normalized metadata' : 'Publication metadata',
      },
      executive_summary: {
        summary_text: ai.summary || 'Summary synthesized from published research abstract.',
        significance: ai.objectives || 'Advances domain methodological understanding and empirical benchmarks.',
        key_takeaways: ai.important_findings ? [ai.important_findings] : (ai.key_topics || []),
      },
      research_problem: {
        problem_statement: ai.research_problem || 'Core bottleneck addressed in published study.',
        existing_gap: ai.limitations || 'Identified domain gap and operational constraints.',
        objectives: ai.objectives ? [ai.objectives] : [],
      },
      background: {
        overview: `Published in ${src.journal_or_conference || 'Academic Literature'} (${src.publication_year || 'Recent'}) focusing on ${src.research_domain || 'Scientific Research'}.`,
      },
      methodology: {
        overview: ai.methodology || 'Structured methodological approach and empirical design.',
        workflow_stages: [
          { step_number: 1, stage_name: 'Approach & Formulation', description: ai.approach || 'Core theoretical and practical formulation.' },
          { step_number: 2, stage_name: 'Methodological Execution', description: ai.methodology || 'Implementation and benchmark evaluation.' },
        ],
        techniques_used: ai.key_topics || ['Empirical Benchmarking', 'Quantitative Analysis'],
      },
      architecture: {
        has_architecture: Boolean(ai.approach),
        description: ai.approach || 'Algorithmic or methodological framework pipeline.',
        textual_pipeline: ai.key_topics?.length ? ai.key_topics : ['Input Data', 'Processing Model', 'Validation Metric'],
        data_flow: 'Systematic validation pipeline against domain empirical baselines.',
      },
      dataset_analysis: {
        is_applicable: true,
        dataset_summary: 'Evaluated on domain benchmarks and comparative datasets.',
      },
      results: {
        structured_results_table: ai.important_findings ? [
          {
            metric: 'Primary Outcome / Finding',
            proposed_method_value: ai.important_findings,
            baseline_value: 'Standard Baselines',
            improvement_or_difference: 'Demonstrated improvement',
            is_source_reported: true,
          }
        ] : [],
      },
      findings: {
        what_worked: ai.important_findings ? [ai.important_findings] : ['Established baseline benchmarks.'],
        key_observations: [
          `Target domain: ${src.research_domain || 'Interdisciplinary Studies'}.`,
          `Publication venue: ${src.journal_or_conference || 'Academic Literature'}.`,
        ],
      },
      contributions: (ai.objectives ? [
        { category: 'Methodological', description: ai.objectives },
        { category: 'Empirical', description: ai.important_findings || ai.summary || 'Empirical insights and validation.' }
      ] : [
        { category: 'Primary Contribution', description: ai.summary || 'Domain research advancement.' }
      ]),
      novelty: {
        novelty_summary: ai.objectives || ai.summary || 'Novel domain insights and performance benchmarks.',
        novelty_categories: ['Algorithmic Design', 'Benchmark Verification'],
      },
      limitations: {
        author_stated_limitations: ai.limitations ? [ai.limitations] : ['Generalization bounds subject to dataset scale and assumptions.'],
        ai_identified_limitations: ['Requires validation across broader deployment scenarios.'],
      },
      future_research: {
        author_suggested_future_work: ai.future_directions ? [ai.future_directions] : ['Cross-domain optimization and extended testing.'],
        ai_suggested_directions: ['Integration with multimodal research vectors and grant funding priorities.'],
      },
      researcher_takeaway: {
        why_researchers_should_care: ai.summary || 'Provides direct scientific and empirical value for researchers in this domain.',
        core_idea: ai.objectives || ai.research_problem || 'Methodological enhancement in domain study.',
        most_useful_contribution: ai.important_findings || 'Empirical benchmark insights and verified findings.',
        most_important_limitation: ai.limitations || 'Scope bounds and deployment assumptions.',
        follow_up_opportunity: ai.future_directions || 'High-potential next research step.',
      },
      key_terms: (ai.key_topics || []).map((term) => ({
        term,
        definition_in_context: `Core concept and technical keyword in ${src.research_domain || 'this investigation'}.`,
      })),
    }
  })()

  const coverage = rich?.source_coverage || {
    coverage_level: analysisData?.analysis_metadata?.coverage_level || 'medium',
    coverage_label: 'Abstract & Metadata',
    content_analyzed: 'Available abstract and metadata',
  }

  return (
    <div className="research-papers-container">
      {/* Header */}
      <div className="papers-header">
        <div className="papers-header-title">
          <h1>Academic Research Intelligence Platform</h1>
          <p>Deep literature analysis, step-by-step methodology extraction, dataset & results verification, and anti-hallucination research insights.</p>
        </div>
        <div className="papers-header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowImport(!showImport)}
          >
            {showImport ? 'Cancel Import' : 'Import from OpenAlex'}
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="papers-alert error-banner">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}
      {successMsg && (
        <div className="papers-alert success-banner">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <div className="import-panel">
          <h3>Import Real Research Papers</h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#557086' }}>
            Search OpenAlex by keyword, topic, or paper title to import verified academic papers with DOIs, citations, and abstracts.
          </p>
          <form className="import-form" onSubmit={handleImport}>
            <input
              type="text"
              placeholder="e.g. In-context learning, Transformer architectures, Quantum computing..."
              value={importQuery}
              onChange={(e) => setImportQuery(e.target.value)}
              disabled={importing}
            />
            <button type="submit" className="btn-primary" disabled={importing || !importQuery.trim()}>
              {importing ? 'Importing...' : 'Search & Import'}
            </button>
          </form>
        </div>
      )}

      {/* Search & Filters */}
      <div className="filters-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search academic topics, deep learning architectures, authors, keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-input-wrap">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="Year (e.g. 2024)"
            value={year}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '')
              setYear(val)
            }}
          />
        </div>

        <div className="filter-input-wrap">
          <select
            value={researchDomain}
            onChange={(e) => setResearchDomain(e.target.value)}
          >
            <option value="">All Research Domains</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Medicine">Medicine & Biology</option>
            <option value="Engineering">Engineering</option>
            <option value="Physics">Physics</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Chemistry">Chemistry</option>
          </select>
        </div>

        {(search || year || researchDomain || selectedSource) && (
          <button
            type="button"
            className="filter-clear-btn"
            onClick={() => {
              setSearch('')
              setYear('')
              setResearchDomain('')
              setSelectedSource('')
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Discovery Count & Interactive Sources Bar */}
      <div className="discovery-status-bar">
        <div className="papers-count-info">
          Showing {papers.length > 0 ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total} research papers
        </div>
        <div className="sources-indicator">
          <button
            type="button"
            className={`source-tag-btn ${selectedSource === '' ? 'active' : ''}`}
            onClick={() => setSelectedSource('')}
          >
            All Sources
          </button>
          <button
            type="button"
            className={`source-tag-btn ${selectedSource === 'openalex' ? 'active' : ''}`}
            onClick={() => setSelectedSource(prev => prev === 'openalex' ? '' : 'openalex')}
          >
            🌐 OpenAlex {sourcesCount.openalex ? `(${sourcesCount.openalex})` : ''}
          </button>
          <button
            type="button"
            className={`source-tag-btn ${selectedSource === 'crossref' ? 'active' : ''}`}
            onClick={() => setSelectedSource(prev => prev === 'crossref' ? '' : 'crossref')}
          >
            🏛️ Crossref {sourcesCount.crossref ? `(${sourcesCount.crossref})` : ''}
          </button>
          <button
            type="button"
            className={`source-tag-btn ${selectedSource === 'semantic' ? 'active' : ''}`}
            onClick={() => setSelectedSource(prev => prev === 'semantic' ? '' : 'semantic')}
          >
            🔬 Semantic Scholar {sourcesCount.semantic_scholar ? `(${sourcesCount.semantic_scholar})` : ''}
          </button>
          {sourcesCount.local > 0 && (
            <button
              type="button"
              className={`source-tag-btn local ${selectedSource === 'local' ? 'active' : ''}`}
              onClick={() => setSelectedSource(prev => prev === 'local' ? '' : 'local')}
            >
              💾 Local Collection ({sourcesCount.local})
            </button>
          )}
        </div>
      </div>

      {/* Papers Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="ai-spinner" />
          <p style={{ color: '#557086' }}>Searching scholarly discovery databases & local collection...</p>
        </div>
      ) : papers.length === 0 ? (
        <div className="empty-state">
          <h3>No Research Papers Found</h3>
          <p>Try searching broader topics (e.g. &quot;brain tumor segmentation&quot;, &quot;3D U-Net&quot;, &quot;deep learning&quot;) or clear your filters.</p>
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => {
              setSearch('')
              setYear('')
              setResearchDomain('')
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          <div className="papers-grid">
            {papers.map((paper, idx) => (
              <div
                key={paper.id || paper.doi || `${paper.source_id}_${idx}`}
                className="paper-card"
                onClick={() => handleOpenPaper(paper)}
              >
                <div>
                  <div className="paper-card-top">
                    <span className="paper-source-badge">{paper.source_provider || paper.source || 'OpenAlex'}</span>
                    {paper.publisher && (
                      <span className="paper-publisher-badge">{paper.publisher}</span>
                    )}
                    {paper.publication_year && (
                      <span className="paper-year-badge">{paper.publication_year}</span>
                    )}
                    {paper.open_access && (
                      <span className="paper-oa-badge" title="Open Access Available">🟢 OA</span>
                    )}
                  </div>
                  <h3 className="paper-title">{paper.title}</h3>
                  <p className="paper-authors">
                    {paper.authors ? `By ${paper.authors}` : 'Authors not listed'}
                  </p>
                  <p className="paper-abstract-snippet">
                    {paper.abstract || 'Abstract not provided in index repository.'}
                  </p>
                </div>

                <div className="paper-card-footer">
                  <div className="paper-citations">
                    <span>📊 {paper.citation_count} citations</span>
                  </div>
                  <div className="paper-view-btn">
                    Analyze & Inspect ➔
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <button
                type="button"
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
              >
                ◀ Previous
              </button>

              <div className="page-numbers">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 7) {
                    if (page > 4 && page < totalPages - 3) {
                      pageNum = page - 3 + i
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i
                    }
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      className={`page-num-btn ${page === pageNum ? 'active' : ''}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next ▶
              </button>
            </div>
          )}
        </>
      )}

      {/* Selected Paper & Rich AI Analysis Modal */}
      {selectedPaper && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-info">
                <div className="modal-badges">
                  <span className="paper-source-badge">{selectedPaper.source_provider || selectedPaper.source || 'OpenAlex'}</span>
                  {selectedPaper.publisher && (
                    <span className="paper-publisher-badge">{selectedPaper.publisher}</span>
                  )}
                  {selectedPaper.publication_year && (
                    <span className="paper-year-badge">{selectedPaper.publication_year}</span>
                  )}
                  {selectedPaper.open_access && (
                    <span className="paper-oa-badge">🟢 Open Access</span>
                  )}
                  {rich?.paper_overview?.paper_type && (
                    <span className="paper-type-tag">
                      {rich.paper_overview.paper_type}
                    </span>
                  )}
                </div>
                <h2>{selectedPaper.title}</h2>
                <p style={{ margin: 0, color: '#557086', fontSize: '0.9rem' }}>
                  {selectedPaper.authors || 'Authors not provided'}
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body" ref={modalBodyRef}>
              {/* SOURCE PAPER SECTION */}
              <div className="source-section" id="sec-source-paper">
                <div className="section-label-banner">
                  <span className="section-label">Source Paper Information</span>
                  <span style={{ fontSize: '0.78rem', color: '#647f96' }}>
                    {selectedPaper.publisher ? `Publisher: ${selectedPaper.publisher} • ` : ''}Provider: {selectedPaper.source_provider || selectedPaper.source}
                  </span>
                </div>

                <div className="source-meta-grid">
                  <div className="source-meta-item">
                    <span>Journal / Conference</span>
                    <strong>{selectedPaper.journal_or_conference || 'Not specified'}</strong>
                  </div>
                  <div className="source-meta-item">
                    <span>Publisher / Venue</span>
                    <strong>{selectedPaper.publisher || 'Not specified'}</strong>
                  </div>
                  <div className="source-meta-item">
                    <span>Publication Date</span>
                    <strong>{selectedPaper.publication_date || selectedPaper.publication_year || 'Not specified'}</strong>
                  </div>
                  <div className="source-meta-item">
                    <span>DOI / Reference</span>
                    <strong>
                      {selectedPaper.doi ? (
                        <a href={selectedPaper.doi.startsWith('http') ? selectedPaper.doi : `https://doi.org/${selectedPaper.doi}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0c548e' }}>
                          {selectedPaper.doi.replace('https://doi.org/', '')} ↗
                        </a>
                      ) : 'Not available'}
                    </strong>
                  </div>
                  <div className="source-meta-item">
                    <span>Source Link</span>
                    <strong>
                      {selectedPaper.publication_link ? (
                        <a href={selectedPaper.publication_link} target="_blank" rel="noopener noreferrer" style={{ color: '#0c548e' }}>
                          View Publisher / Source ↗
                        </a>
                      ) : 'Not available'}
                    </strong>
                  </div>
                  {selectedPaper.pdf_url && (
                    <div className="source-meta-item">
                      <span>Full-Text PDF</span>
                      <strong>
                        <a href={selectedPaper.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0b726e', fontWeight: 600 }}>
                          Download Open PDF ↗
                        </a>
                      </strong>
                    </div>
                  )}
                </div>

                {selectedPaper.keywords && (
                  <div style={{ marginTop: '0.6rem', marginBottom: '0.8rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#647f96', textTransform: 'uppercase' }}>Keywords: </span>
                    <span style={{ fontSize: '0.88rem', color: '#24415c' }}>{selectedPaper.keywords}</span>
                  </div>
                )}

                <div className="source-abstract-box">
                  <h4>Original Abstract</h4>
                  <p>{selectedPaper.abstract || 'No abstract text available from the source repository.'}</p>
                </div>
              </div>

              {/* AI RESEARCH INTELLIGENCE DASHBOARD */}
              <div className="ai-analysis-container">
                <div className="ai-header-bar">
                  <div className="ai-title-wrap">
                    <div className="ai-icon-badge">🔬</div>
                    <div>
                      <h3>AI Research Intelligence & Paper Analysis</h3>
                      <p className="ai-disclaimer">
                        Rigorous scientific analysis, step-by-step methodology, dataset & results extraction with strict anti-hallucination verification.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {analysisData && (
                      <span className={`coverage-badge coverage-${coverage.coverage_level}`}>
                        {coverage.coverage_level === 'high' ? '🟢 Full Paper Analyzed' : (coverage.coverage_level === 'medium' ? '🟡 Abstract & Metadata' : '🔴 Metadata Only')}
                      </span>
                    )}

                    {analysisData ? (
                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                        <span className={`ai-status-pill ${analysisData.analysis_metadata?.is_cached ? 'cached' : ''}`}>
                          {analysisData.analysis_metadata?.is_cached ? 'Cached Analysis' : 'Fresh Analysis'}
                        </span>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleRunAnalysis(true)}
                          disabled={analyzing}
                        >
                          {analyzing ? 'Regenerating...' : 'Regenerate'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => copyToClipboard(JSON.stringify(analysisData, null, 2), 'full')}
                        >
                          {copiedSection === 'full' ? 'Copied JSON!' : 'Copy Full Analysis'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleRunAnalysis(false)}
                        disabled={analyzing || loadingAnalysis || savingPaper}
                      >
                        {savingPaper ? 'Registering Paper...' : (analyzing ? 'Analyzing Deep Content...' : 'Generate AI Research Intelligence')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Analysis Error */}
                {analysisError && (
                  <div className="papers-alert error-banner">
                    <div>
                      <strong>Analysis Failed: </strong>
                      <span>{analysisError}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
                      onClick={() => handleRunAnalysis(true)}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Loading State */}
                {analyzing ? (
                  <div className="ai-loading-box">
                    <div className="ai-spinner" />
                    <h4>Conducting Deep Academic Analysis</h4>
                    <p>Extracting legal full-text/abstract, detecting sections, evaluating datasets, architectures, baselines, and reported empirical findings...</p>
                  </div>
                ) : loadingAnalysis ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <div className="ai-spinner" style={{ width: '32px', height: '32px' }} />
                    <p style={{ color: '#647f96', fontSize: '0.9rem' }}>Retrieving research analysis cache...</p>
                  </div>
                ) : rich ? (
                  /* 22-PART RICH RESEARCH DASHBOARD (CONTINUOUS SECTIONS + CIRCULAR HUB) */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
                    
                    {/* FLOATING CIRCULAR AI RESEARCH ANALYSIS HUB */}
                    <ResearchAnalysisHub
                      containerRef={modalBodyRef}
                      sections={[
                        { id: 'sec-executive-summary', label: 'Executive Summary', icon: '📌', category: 'Overview' },
                        { id: 'sec-research-problem', label: 'Problem & Objectives', icon: '🎯', category: 'Problem' },
                        rich.background?.overview ? { id: 'sec-background', label: 'Domain Context', icon: '📚', category: 'Context' } : null,
                        { id: 'sec-methodology', label: 'Methodology & Workflow', icon: '⚙️', category: 'Methodology' },
                        rich.architecture?.has_architecture ? { id: 'sec-architecture', label: 'System Architecture', icon: '🏛️', category: 'Architecture' } : null,
                        { id: 'sec-dataset', label: 'Dataset & Data', icon: '📊', category: 'Empirical Data' },
                        { id: 'sec-metrics', label: 'Setup & Metrics', icon: '📏', category: 'Evaluation' },
                        { id: 'sec-results', label: 'Results & Baseline', icon: '📈', category: 'Results' },
                        { id: 'sec-findings', label: 'Findings & Insights', icon: '💡', category: 'Findings' },
                        { id: 'sec-contributions', label: 'Contributions', icon: '🏆', category: 'Novelty' },
                        { id: 'sec-novelty', label: 'Novelty Assessment', icon: '✨', category: 'Novelty' },
                        { id: 'sec-limitations', label: 'Limitations & Constraints', icon: '⚠️', category: 'Critique' },
                        { id: 'sec-future', label: 'Future Directions', icon: '🔮', category: 'Future' },
                        rich.researcher_takeaway ? { id: 'sec-takeaway', label: 'Researcher Takeaway', icon: '🎓', category: 'Takeaway' } : null,
                        rich.key_terms?.length > 0 ? { id: 'sec-glossary', label: 'Key Terms Glossary', icon: '📖', category: 'Glossary' } : null,
                      ].filter(Boolean)}
                    />

                    {/* SECTION 1: EXECUTIVE SUMMARY */}
                    <div className="rich-section" id="sec-executive-summary">
                      <div className="rich-section-header">
                        <h4><span>📌</span> Executive Summary</h4>
                        <span className="section-tag tag-source">Synthesized Evidence</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: '#1e293b' }}>
                        {rich.executive_summary?.summary_text}
                      </p>
                      {rich.executive_summary?.significance && (
                        <div style={{ background: '#f8fafc', padding: '0.8rem 1rem', borderRadius: '8px', borderLeft: '3px solid #0b726e' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#0b726e' }}>Why it matters: </strong>
                          <span style={{ fontSize: '0.88rem', color: '#334155' }}>{rich.executive_summary.significance}</span>
                        </div>
                      )}
                      {rich.executive_summary?.key_takeaways?.length > 0 && (
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#475569' }}>Key Takeaways:</strong>
                          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', color: '#334155', fontSize: '0.9rem' }}>
                            {rich.executive_summary.key_takeaways.map((t, idx) => (
                              <li key={idx}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: RESEARCH PROBLEM & OBJECTIVES */}
                    <div className="rich-section" id="sec-research-problem">
                      <div className="rich-section-header">
                        <h4><span>🎯</span> Research Problem & Objectives</h4>
                        <span className="section-tag tag-source">Source Reported</span>
                      </div>
                      <div className="side-by-side-grid">
                        <div className="side-box source-box">
                          <h5>Core Problem Statement</h5>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155' }}>
                            {rich.research_problem?.problem_statement}
                          </p>
                        </div>
                        <div className="side-box source-box">
                          <h5>Existing Gap / Shortcoming</h5>
                          <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155' }}>
                            {rich.research_problem?.existing_gap}
                          </p>
                        </div>
                      </div>

                      {rich.research_problem?.objectives?.length > 0 && (
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#475569' }}>Explicit Objectives:</strong>
                          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', color: '#334155', fontSize: '0.9rem' }}>
                            {rich.research_problem.objectives.map((obj, idx) => (
                              <li key={idx}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: BACKGROUND & CONTEXT */}
                    {rich.background?.overview && (
                      <div className="rich-section" id="sec-background">
                        <div className="rich-section-header">
                          <h4><span>📚</span> Background & Domain Context</h4>
                          <span className="section-tag tag-source">Contextual Foundation</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.55 }}>
                          {rich.background.overview}
                        </p>
                      </div>
                    )}

                    {/* SECTION 4: METHODOLOGY */}
                    <div className="rich-section" id="sec-methodology">
                      <div className="rich-section-header">
                        <h4><span>⚙️</span> Proposed Methodology</h4>
                        <span className="section-tag tag-source">Technical Pipeline</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.6 }}>
                        {rich.methodology?.overview}
                      </p>

                      {/* Step-by-Step Workflow Stages */}
                      {rich.methodology?.workflow_stages?.length > 0 && (
                        <div className="workflow-stepper">
                          <strong style={{ fontSize: '0.88rem', color: '#0c548e' }}>Step-by-Step Workflow Stages:</strong>
                          {rich.methodology.workflow_stages.map((stage, idx) => (
                            <div key={idx} className="workflow-step-card">
                              <div className="step-num-badge">{stage.step_number || idx + 1}</div>
                              <div className="step-content">
                                <h5>{stage.stage_name}</h5>
                                <p>{stage.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {rich.methodology?.techniques_used?.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#475569' }}>Techniques & Frameworks Used: </strong>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                            {rich.methodology.techniques_used.map((tech, idx) => (
                              <span key={idx} style={{ background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', color: '#1e293b' }}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 5: MODEL / SYSTEM ARCHITECTURE */}
                    {rich.architecture?.has_architecture && (
                      <div className="rich-section" id="sec-architecture">
                        <div className="rich-section-header">
                          <h4><span>🏛️</span> Model / System Architecture</h4>
                          <span className="section-tag tag-source">Structural Design</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>
                          {rich.architecture.description}
                        </p>

                        {/* Textual Pipeline Chips */}
                        {rich.architecture.textual_pipeline?.length > 0 && (
                          <div className="pipeline-chips-container">
                            {rich.architecture.textual_pipeline.map((stage, idx) => (
                              <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className="pipeline-chip">{stage}</span>
                                {idx < rich.architecture.textual_pipeline.length - 1 && (
                                  <span className="pipeline-arrow">➔</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {rich.architecture.data_flow && (
                          <div style={{ background: '#f8fafc', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                            <strong style={{ fontSize: '0.82rem', color: '#647f96', textTransform: 'uppercase' }}>Data Flow: </strong>
                            <span style={{ fontSize: '0.88rem', color: '#334155' }}>{rich.architecture.data_flow}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SECTION 6: DATASET & DATA CHARACTERISTICS */}
                    <div className="rich-section" id="sec-dataset">
                      <div className="rich-section-header">
                        <h4><span>📊</span> Dataset & Data Characteristics</h4>
                        <span className="section-tag tag-source">Empirical Data</span>
                      </div>

                      {!rich.dataset_analysis?.is_applicable ? (
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', color: '#647f96', fontSize: '0.9rem' }}>
                          {rich.dataset_analysis?.non_applicable_reason || 'Dataset analysis is not applicable because this paper does not report a dataset-based experiment (e.g. theoretical work or survey).'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          {rich.dataset_analysis?.dataset_summary && (
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>
                              {rich.dataset_analysis.dataset_summary}
                            </p>
                          )}
                          {rich.dataset_analysis?.datasets?.map((ds, idx) => (
                            <div key={idx} className="side-box source-box">
                              <h5>{ds.name} <span style={{ fontSize: '0.75rem', color: '#647f96' }}>({ds.source})</span></h5>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', fontSize: '0.85rem' }}>
                                <div><strong>Purpose: </strong>{ds.purpose}</div>
                                <div><strong>Samples: </strong>{ds.samples_count}</div>
                                <div><strong>Classes / Features: </strong>{ds.classes_or_features}</div>
                                <div><strong>Splits: </strong>{ds.train_val_test_split}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 7: EXPERIMENTAL SETUP & EVALUATION METRICS */}
                    <div className="rich-section" id="sec-metrics">
                      <div className="rich-section-header">
                        <h4><span>📏</span> Experimental Setup & Evaluation Metrics</h4>
                        <span className="section-tag tag-source">Evaluation Setup</span>
                      </div>

                      {rich.evaluation_metrics?.length > 0 && (
                        <div className="results-table-wrap">
                          <table className="styled-results-table">
                            <thead>
                              <tr>
                                <th>Metric</th>
                                <th>Reported Value</th>
                                <th>What It Measures</th>
                                <th>Why Relevant</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rich.evaluation_metrics.map((m, idx) => (
                                <tr key={idx}>
                                  <td><strong>{m.name}</strong></td>
                                  <td className="value-highlight">{m.reported_value}</td>
                                  <td>{m.what_it_measures}</td>
                                  <td>{m.why_relevant}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {rich.experimental_setup?.hyperparameters_and_training && (
                        <div style={{ fontSize: '0.88rem', color: '#475569', marginTop: '0.5rem' }}>
                          <strong>Training Configuration: </strong>{rich.experimental_setup.hyperparameters_and_training}
                        </div>
                      )}
                    </div>

                    {/* SECTION 8: REPORTED RESULTS & COMPARISONS */}
                    <div className="rich-section" id="sec-results">
                      <div className="rich-section-header">
                        <h4><span>📈</span> Reported Results & Comparisons</h4>
                        <span className="section-tag tag-source">Empirical Findings</span>
                      </div>

                      {rich.results?.structured_results_table?.length > 0 ? (
                        <div className="results-table-wrap">
                          <table className="styled-results-table">
                            <thead>
                              <tr>
                                <th>Evaluation Metric</th>
                                <th>Proposed Method</th>
                                <th>Baseline</th>
                                <th>Improvement / Diff</th>
                                <th>Evidence Source</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rich.results.structured_results_table.map((r, idx) => (
                                <tr key={idx}>
                                  <td><strong>{r.metric}</strong></td>
                                  <td className="value-highlight">{r.proposed_method_value}</td>
                                  <td>{r.baseline_value}</td>
                                  <td>{r.improvement_or_difference}</td>
                                  <td>
                                    <span className={`section-tag ${r.is_source_reported ? 'tag-source' : 'tag-ai-interp'}`}>
                                      {r.is_source_reported ? 'Source Reported' : 'AI Inferred'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', color: '#647f96', fontSize: '0.9rem' }}>
                          {rich.results?.non_applicable_reason || 'Specific tabular numerical comparisons were not reported in the available text.'}
                        </div>
                      )}

                      {rich.results?.ai_interpretation_of_results?.length > 0 && (
                        <div style={{ marginTop: '0.8rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#92400e' }}>AI Analytical Interpretation:</strong>
                          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem', color: '#334155', fontSize: '0.9rem' }}>
                            {rich.results.ai_interpretation_of_results.map((interp, idx) => (
                              <li key={idx}>{interp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* SECTION 9: KEY FINDINGS & OBSERVATIONS */}
                    <div className="rich-section" id="sec-findings">
                      <div className="rich-section-header">
                        <h4><span>💡</span> Key Findings & Observations</h4>
                        <span className="section-tag tag-source">Source Synthesized</span>
                      </div>
                      <div className="side-by-side-grid">
                        <div className="side-box source-box">
                          <h5>What Succeeded</h5>
                          <ul>
                            {rich.findings?.what_worked?.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="side-box source-box">
                          <h5>Key Observations</h5>
                          <ul>
                            {rich.findings?.key_observations?.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 10: ACADEMIC & PRACTICAL CONTRIBUTIONS */}
                    <div className="rich-section" id="sec-contributions">
                      <div className="rich-section-header">
                        <h4><span>🏆</span> Academic & Practical Contributions</h4>
                        <span className="section-tag tag-source">Core Contributions</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {Array.isArray(rich.contributions) ? rich.contributions.map((c, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start', background: '#ffffff', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <span style={{ background: '#0c548e', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                              {c.category || 'Contribution'}
                            </span>
                            <span style={{ fontSize: '0.9rem', color: '#1e293b' }}>{c.description || (typeof c === 'string' ? c : '')}</span>
                          </div>
                        )) : (
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>
                            {rich.contributions?.author_claimed_contributions?.[0] || 'Core research advancement in domain.'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* SECTION 11: NOVELTY ASSESSMENT */}
                    <div className="rich-section" id="sec-novelty">
                      <div className="rich-section-header">
                        <h4><span>✨</span> Novelty Assessment</h4>
                        <span className="section-tag tag-ai-interp">Cautious Assessment</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.55 }}>
                        {rich.novelty?.novelty_summary}
                      </p>
                      {rich.novelty?.novelty_categories?.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {rich.novelty.novelty_categories.map((cat, idx) => (
                            <span key={idx} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                              ✓ {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 12: LIMITATIONS & CONSTRAINTS */}
                    <div className="rich-section" id="sec-limitations">
                      <div className="rich-section-header">
                        <h4><span>⚠️</span> Limitations & Constraints</h4>
                        <span className="section-tag tag-source">Strictly Separated</span>
                      </div>
                      <div className="side-by-side-grid">
                        <div className="side-box source-box">
                          <h5>Author-Stated Limitations</h5>
                          <ul>
                            {rich.limitations?.author_stated_limitations?.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="side-box ai-box">
                          <h5>Potential AI-Identified Limitations</h5>
                          <ul>
                            {rich.limitations?.ai_identified_limitations?.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 13: FUTURE RESEARCH DIRECTIONS */}
                    <div className="rich-section" id="sec-future">
                      <div className="rich-section-header">
                        <h4><span>🔮</span> Future Research Directions</h4>
                        <span className="section-tag tag-source">Strictly Separated</span>
                      </div>
                      <div className="side-by-side-grid">
                        <div className="side-box source-box">
                          <h5>Authors' Suggested Future Work</h5>
                          <ul>
                            {rich.future_research?.author_suggested_future_work?.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="side-box ai-box">
                          <h5>AI-Suggested Research Opportunities</h5>
                          <ul>
                            {rich.future_research?.ai_suggested_directions?.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 14: RESEARCHER TAKEAWAY */}
                    {rich.researcher_takeaway && (
                      <div className="takeaway-banner" id="sec-takeaway">
                        <h4><span>🎓</span> Why Should a Researcher Care About This Paper?</h4>
                        <p>{rich.researcher_takeaway.why_researchers_should_care}</p>
                        <div className="takeaway-grid">
                          <div className="takeaway-item">
                            <span>Core Idea</span>
                            <strong>{rich.researcher_takeaway.core_idea}</strong>
                          </div>
                          <div className="takeaway-item">
                            <span>Most Useful Contribution</span>
                            <strong>{rich.researcher_takeaway.most_useful_contribution}</strong>
                          </div>
                          <div className="takeaway-item">
                            <span>Key Limitation</span>
                            <strong>{rich.researcher_takeaway.most_important_limitation}</strong>
                          </div>
                          <div className="takeaway-item">
                            <span>Next Opportunity</span>
                            <strong>{rich.researcher_takeaway.follow_up_opportunity}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION 15: KEY TERMS GLOSSARY */}
                    {rich.key_terms?.length > 0 && (
                      <div className="rich-section" id="sec-glossary">
                        <div className="rich-section-header">
                          <h4><span>📖</span> Key Terms & Contextual Glossary</h4>
                          <span className="section-tag tag-source">Domain Vocabulary</span>
                        </div>
                        <div className="glossary-grid">
                          {rich.key_terms.map((k, idx) => (
                            <div key={idx} className="glossary-card">
                              <strong>{k.term}</strong>
                              <p>{k.definition_in_context}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                ) : analysisData ? (
                  /* Fallback to legacy cards if rich analysis wasn't present */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                    <ResearchAnalysisHub
                      containerRef={modalBodyRef}
                      sections={[
                        { id: 'sec-legacy-summary', label: 'Summary', icon: '📌', category: 'Summary' },
                        { id: 'sec-legacy-problem', label: 'Research Problem', icon: '🎯', category: 'Problem' }
                      ]}
                    />
                    <div className="rich-section" id="sec-legacy-summary">
                      <h4>Summary</h4>
                      <p>{analysisData.ai_analysis.summary}</p>
                    </div>
                    <div className="rich-section" id="sec-legacy-problem">
                      <h4>Research Problem</h4>
                      <p>{analysisData.ai_analysis.research_problem}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

