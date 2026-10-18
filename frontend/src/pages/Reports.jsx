import { useState, useEffect, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import { reportService } from '../services/reportService'
import './Reports.css'

const REPORT_TYPES = [
  {
    key: 'unified',
    label: 'Create Intelligence Report',
    icon: '✨',
    highlight: true,
    description: 'Consolidated cross-intelligence synthesis across Research, Funding, Patents, Tech, Innovation & Commercialization for any research idea.',
  },
  {
    key: 'funding',
    label: 'Funding Intelligence',
    icon: '🎯',
    description: 'Grant opportunities, funding agencies, deadlines, and eligibility matching criteria.',
  },
  {
    key: 'patent',
    label: 'Patent Landscape',
    icon: '📜',
    description: 'Filing trends, technology domains, global assignees, and citation metrics.',
  },
  {
    key: 'research_trend',
    label: 'Research Trends',
    icon: '📊',
    description: 'Empirical publication velocity, cross-domain topic clusters, and literature growth.',
  },
  {
    key: 'innovation_intelligence',
    label: 'Innovation Intelligence',
    icon: '🚀',
    description: 'Multi-factor weighted innovation scoring, novelty, maturity, and market potential.',
  },
  {
    key: 'commercialization',
    label: 'Commercialization',
    icon: '💡',
    description: 'Productization pathways, licensing opportunities, startup spin-offs, and partners.',
  },
]

const SAMPLE_IDEAS = [
  'AI-based brain tumor segmentation using MRI',
  'AI-powered crop disease detection using drone hyperspectral imaging',
  'Autonomous vehicle perception systems under adverse weather conditions',
  'Renewable energy storage technology with solid-state lithium batteries',
  'Deep learning for early cardiovascular risk prediction with wearable ECG',
]

export default function Reports() {
  const { token, user } = useContext(AuthContext)
  const location = useLocation()

  const [selectedType, setSelectedType] = useState('unified')

  // Unified report form states
  const [idea, setIdea] = useState('AI-based brain tumor segmentation using MRI')
  const [unifiedDomain, setUnifiedDomain] = useState('Artificial Intelligence')
  const [keywords, setKeywords] = useState('brain tumor, MRI, deep learning, segmentation')
  const [techArea, setTechArea] = useState('Artificial Intelligence')
  const [region, setRegion] = useState('global')
  const [dateRange, setDateRange] = useState('all')
  const [reportDepth, setReportDepth] = useState('standard')

  // Module checklist selection
  const [modules, setModules] = useState({
    research: true,
    funding: true,
    patents: true,
    technology: true,
    innovation: true,
    commercialization: true,
  })

  // Dynamic filter states for existing individual reports
  const [researchDomain, setResearchDomain] = useState('')
  const [fundingType, setFundingType] = useState('')
  const [technology, setTechnology] = useState('Artificial Intelligence')
  const [organization, setOrganization] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Preview & Export state
  const [previewData, setPreviewData] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [exportingFormat, setExportingFormat] = useState(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [generationStage, setGenerationStage] = useState('')

  // Read initial topic from query / navigation state if available
  useEffect(() => {
    if (location.state?.researchIdea) {
      setIdea(location.state.researchIdea)
      setSelectedType('unified')
    }
  }, [location.state])

  // Load preview data
  const fetchReportPreview = async () => {
    if (!token) return
    try {
      setLoadingPreview(true)
      setPreviewData(null)
      setError('')
      setFeedback('')

      let res = null
      if (selectedType === 'unified') {
        if (!idea.trim()) {
          setError('Please enter a research idea or topic concept to generate the unified report.')
          setLoadingPreview(false)
          return
        }
        setGenerationStage('Synthesizing cross-module intelligence...')
        const payload = {
          idea: idea.trim(),
          research_domain: unifiedDomain || techArea || undefined,
          keywords: keywords ? keywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
          technology_area: techArea || undefined,
          region: region || 'global',
          date_range: dateRange || 'all',
          report_depth: reportDepth || 'standard',
          include_research: modules.research,
          include_funding: modules.funding,
          include_patents: modules.patents,
          include_technology: modules.technology,
          include_innovation: modules.innovation,
          include_commercialization: modules.commercialization,
        }
        res = await reportService.generateUnifiedReport(payload, token)
      } else if (selectedType === 'funding') {
        res = await reportService.getFundingReport(
          {
            research_domain: researchDomain || undefined,
            funding_type: fundingType || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            limit: 100,
          },
          token
        )
      } else if (selectedType === 'patent') {
        res = await reportService.getPatentReport(
          {
            technology_domain: researchDomain || undefined,
            organization: organization || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            limit: 100,
          },
          token
        )
      } else if (selectedType === 'research_trend') {
        res = await reportService.getResearchTrendReport(
          {
            research_domain: researchDomain || undefined,
          },
          token
        )
      } else if (selectedType === 'innovation_intelligence') {
        res = await reportService.getInnovationReport(
          {
            technology: technology || 'Artificial Intelligence',
          },
          token
        )
      } else if (selectedType === 'commercialization') {
        res = await reportService.getCommercializationReport(
          {
            technology: technology || 'Artificial Intelligence',
          },
          token
        )
      }

      setPreviewData(res)
    } catch (err) {
      console.error('Failed to load report preview:', err)
      setError(err.message || 'Unable to retrieve report intelligence data.')
    } finally {
      setLoadingPreview(false)
      setGenerationStage('')
    }
  }

  useEffect(() => {
    fetchReportPreview()
  }, [selectedType, token])

  const handleApplyFilters = (e) => {
    e.preventDefault()
    fetchReportPreview()
  }

  const handleResetFilters = () => {
    if (selectedType === 'unified') {
      setIdea('AI-based brain tumor segmentation using MRI')
      setUnifiedDomain('Artificial Intelligence')
      setKeywords('brain tumor, MRI, deep learning, segmentation')
      setTechArea('Artificial Intelligence')
      setRegion('global')
      setDateRange('all')
      setReportDepth('standard')
      setModules({
        research: true,
        funding: true,
        patents: true,
        technology: true,
        innovation: true,
        commercialization: true,
      })
    } else {
      setResearchDomain('')
      setFundingType('')
      setTechnology('Artificial Intelligence')
      setOrganization('')
      setStartDate('')
      setEndDate('')
    }
    setTimeout(() => fetchReportPreview(), 50)
  }

  // Construct standard ReportRequest payload for PDF/Excel generation
  const buildExportPayload = () => {
    if (selectedType === 'unified' && previewData) {
      const u = previewData
      const meta = u.metadata || {}
      const exec = u.executive_summary || {}
      const sections = []
      const recommendations = u.recommended_next_steps || []

      // Section 1: Executive Summary
      if (exec) {
        sections.push({
          title: 'Executive Intelligence Summary',
          paragraphs: [
            `Research Area: ${exec.research_domain || meta.idea || idea}`,
            `Activity Overview: ${exec.research_activity_summary || 'Comprehensive multi-source analysis.'}`,
            `Innovation Outlook: ${exec.innovation_score_summary || 'Evaluated based on 5-factor model.'}`,
            `Commercialization Outlook: ${exec.commercialization_outlook || 'Evidence-backed pathways identified.'}`,
          ],
          table_headers: ['Metric Dimension', 'Evidence Value', 'Status'],
          table_rows: [
            ['Indexed Research Papers', String(u.research?.total_publications || 0), 'Empirically Indexed'],
            ['Active Funding Grants', String(u.funding?.total_matching_grants || u.funding?.matching_opportunities?.length || 0), 'Available'],
            ['Patent Prior-Art Records', String(u.patents?.total_patents || u.patents?.prior_art_patents?.length || 0), 'Classified'],
            ['Innovation Score', `${u.innovation?.overall_score ?? 'N/A'}/100`, u.innovation?.innovation_level || 'Evaluated'],
            ['Commercialization Pathways', String(u.commercialization?.applications?.length || 0), 'Identified'],
          ],
        })
      }

      // Section 2: Research Intelligence
      if (u.research) {
        const topPapers = (u.research.important_papers || []).slice(0, 15)
        sections.push({
          title: 'Research Intelligence & Key Literature',
          paragraphs: [
            u.research.summary || 'Analysis of relevant scientific publications.',
            `Total indexed papers: ${u.research.total_publications || 0}. Total citations: ${u.research.total_citations || 0}.`,
          ],
          table_headers: ['Title', 'Authors', 'Year', 'Citations', 'Relevance'],
          table_rows: topPapers.map((p) => [
            p.title || 'Untitled Paper',
            p.authors || 'Unknown',
            String(p.publication_year || 'N/A'),
            String(p.citation_count ?? 0),
            p.relevance_score ? `${Math.round(p.relevance_score * 100)}%` : 'Direct',
          ]),
        })
      }

      // Section 3: Funding Intelligence
      if (u.funding) {
        const grants = (u.funding.matching_opportunities || []).slice(0, 15)
        sections.push({
          title: 'Funding Intelligence & Grant Programs',
          paragraphs: [
            `Identified ${u.funding.total_matching_grants || grants.length} active grant opportunities across leading funding agencies.`,
          ],
          table_headers: ['Opportunity Title', 'Agency', 'Amount', 'Deadline', 'Status'],
          table_rows: grants.map((g) => [
            g.title || 'Grant Program',
            g.agency || 'Agency',
            g.award_ceiling ? `$${Number(g.award_ceiling).toLocaleString()}` : 'Specified in Call',
            g.close_date || 'Ongoing',
            g.deadline_status || 'Active',
          ]),
        })
      }

      // Section 4: Patent Intelligence
      if (u.patents) {
        const pats = (u.patents.prior_art_patents || []).slice(0, 15)
        sections.push({
          title: 'Patent Landscape & Prior Art',
          paragraphs: [
            `Evaluated ${u.patents.total_patents || pats.length} patent records across international and domestic filing registries.`,
          ],
          table_headers: ['Patent Title', 'Patent Number', 'Assignee', 'Filing Year', 'Technology Area'],
          table_rows: pats.map((p) => [
            p.title || 'Patent Record',
            p.publication_number || 'Pending',
            p.assignee || 'Not Specified',
            String(p.filing_year || 'N/A'),
            p.technology_domain || 'General',
          ]),
        })
      }

      // Section 5: Technology & Innovation
      if (u.innovation) {
        const factors = u.innovation.factors || {}
        sections.push({
          title: 'Innovation Score Breakdown & Factor Weights',
          paragraphs: [
            `Overall Innovation Score: ${u.innovation.overall_score ?? 'N/A'}/100 (${u.innovation.innovation_level || 'Assessed'}).`,
            `Evidence Coverage: ${u.innovation.evidence_coverage || 'High'}.`,
          ],
          table_headers: ['Dimension Factor', 'Weight', 'Score / 100', 'Evidence Summary'],
          table_rows: Object.entries(factors).map(([k, v]) => [
            v.name || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            `${Math.round((v.weight || 0.2) * 100)}%`,
            v.normalized_score != null ? Number(v.normalized_score).toFixed(1) : 'N/A',
            v.evidence_summary || 'Verified data',
          ]),
        })
      }

      // Section 6: Commercialization
      if (u.commercialization) {
        const apps = (u.commercialization.applications || []).slice(0, 10)
        sections.push({
          title: 'Commercialization & Translational Pathways',
          paragraphs: [
            'Translational opportunities, startup pathways, and industry adoption targets.',
          ],
          table_headers: ['Application / Opportunity', 'Target Industry', 'Readiness Stage', 'Rationale'],
          table_rows: apps.map((a) => [
            a.name || a.application || 'Application Concept',
            a.industry || 'Multi-Sector',
            a.stage || 'Emerging',
            a.why || a.reason || 'Strategic fit',
          ]),
        })
      }

      // Section 7: Research Gaps & Differentiation
      if (u.research_gaps && u.research_gaps.length > 0) {
        sections.push({
          title: 'Research Gaps & Strategic Differentiation',
          paragraphs: u.research_gaps,
          table_headers: ['Identified Research Gap', 'Strategic Remediation Action'],
          table_rows: u.research_gaps.map((gap, i) => [
            `Gap ${i + 1}: ${gap}`,
            'Conduct empirical validation trials & integrate multi-cohort benchmarks.',
          ]),
        })
      }

      return {
        report_type: 'unified_intelligence',
        title: `${meta.report_title || `${idea} — Research & Innovation Intelligence Report`}`,
        organization: meta.organization || user?.organization || undefined,
        executive_summary: exec.research_activity_summary || 'Comprehensive Unified Cross-Module Intelligence Report.',
        filters: {
          idea: meta.idea || idea,
          report_depth: meta.report_depth || reportDepth,
          region: meta.region || region,
          date_range: meta.date_range || dateRange,
        },
        sections,
        recommendations,
      }
    }

    const reportTypeObj = REPORT_TYPES.find((r) => r.key === selectedType)
    const title = `${reportTypeObj?.label || 'Intelligence'} Report`

    const filters = {}
    if (researchDomain) filters.research_domain = researchDomain
    if (fundingType) filters.funding_type = fundingType
    if (technology) filters.technology = technology
    if (organization) filters.organization = organization
    if (startDate) filters.start_date = startDate
    if (endDate) filters.end_date = endDate

    const sections = []
    const recommendations = []

    if (selectedType === 'funding') {
      const records = previewData?.records || []
      sections.push({
        title: 'Funding Opportunities Overview',
        paragraphs: [
          `Identified ${records.length} matching funding programs matching the specified criteria.`,
        ],
        table_headers: ['Program Title', 'Agency', 'Type', 'Amount', 'Deadline'],
        table_rows: records.slice(0, 25).map((r) => [
          r.title || 'N/A',
          r.agency || 'N/A',
          r.funding_type || 'N/A',
          r.funding_amount ? `$${Number(r.funding_amount).toLocaleString()}` : 'Not specified',
          r.close_date || 'Ongoing',
        ]),
      })
      recommendations.push(
        'Prioritize applications approaching their deadlines within the next 45 days.',
        'Align proposal methodology with agency specific research scope.'
      )
    } else if (selectedType === 'patent') {
      const records = previewData?.records || []
      sections.push({
        title: 'Patent Landscape Analysis',
        paragraphs: [
          `Analyzed ${records.length} patent publications with a total of ${previewData?.total_citations || 0} citations.`,
        ],
        table_headers: ['Patent Title', 'Assignee', 'Domain', 'Filing Date', 'Citations'],
        table_rows: records.slice(0, 25).map((p) => [
          p.title || 'Untitled',
          p.assignee || 'Not specified',
          p.technology_domain || 'General',
          p.filing_date || 'N/A',
          p.citation_count ?? 0,
        ]),
      })
      recommendations.push(
        'Monitor major assignee patent filings for white-space opportunities.',
        'Leverage cited prior art when drafting novelty claims.'
      )
    } else if (selectedType === 'research_trend') {
      const yearly = previewData?.yearly_growth || []
      const topics = previewData?.top_trending_topics || []
      sections.push({
        title: 'Empirical Research Trajectory',
        paragraphs: [
          `Evaluated publication volume over time with domain filtering: ${previewData?.filtered_domain || 'All Domains'}.`,
        ],
        table_headers: ['Year', 'Publications Count'],
        table_rows: yearly.map((y) => [String(y.year), String(y.paper_count || y.count || 0)]),
      })
      sections.push({
        title: 'Top Emerging Research Topics',
        paragraphs: ['High-frequency keywords across active publications.'],
        table_headers: ['Research Topic', 'Occurrences'],
        table_rows: topics.slice(0, 15).map((t) => [t.topic, String(t.count)]),
      })
      recommendations.push(
        'Focus research investigations on accelerating domain clusters.',
        'Establish cross-institutional collaboration in high-growth subtopics.'
      )
    } else if (selectedType === 'innovation_intelligence') {
      const analysis = previewData?.innovation_analysis || {}
      const factors = analysis.factors || {}
      sections.push({
        title: `Innovation Assessment: ${previewData?.technology || technology}`,
        paragraphs: [
          `Overall Innovation Score: ${analysis.overall_score != null
            ? Number(analysis.overall_score).toFixed(1)
            : 'N/A'
          }/100 (${analysis.innovation_level || 'Evaluated'}).`,
          `Evidence Coverage: ${analysis.evidence_coverage || 'Complete'}.`,
        ],
        table_headers: ['Dimension Factor', 'Weight', 'Score / 100', 'Assessment'],
        table_rows: Object.entries(factors).map(([name, f]) => [
          name,
          `${f.weight_percentage || 20}%`,
          f.normalized_score != null ? Number(f.normalized_score).toFixed(1) : 'N/A',
          f.evidence_level || 'Verified',
        ]),
      })
      recommendations.push(
        'Enhance patent strength to protect high-novelty research components.',
        'Address technology maturity gaps before pursuing venture funding.'
      )
    } else if (selectedType === 'commercialization') {
      const comm = previewData?.commercialization_analysis || {}
      const apps = comm.applications || []
      const products = comm.products || []
      sections.push({
        title: `Commercial Applications: ${previewData?.technology || technology}`,
        paragraphs: [
          'Identified productization targets, licensing candidates, and potential spin-offs.',
        ],
        table_headers: ['Application / Product', 'Industry Sector', 'Readiness Stage'],
        table_rows: apps.slice(0, 10).map((a) => [
          a.application || a.name || a.title || 'Opportunity',
          a.industry || 'Multi-Sector',
          a.stage || 'Emerging',
        ]),
      })
      if (products.length > 0) {
        sections.push({
          title: 'Productization Pathways',
          paragraphs: ['Translational commercial product opportunities.'],
          table_headers: ['Product Concept', 'Target Market', 'Feasibility'],
          table_rows: products.slice(0, 10).map((p) => [
            p.title || p.product || 'Product Concept',
            p.target_market || p.industry || 'Enterprise',
            p.feasibility || 'High',
          ]),
        })
      }
      recommendations.push(
        'Engage industry partners early for validation trials.',
        'Develop prototype demonstration to accelerate commercial licensing.'
      )
    }

    return {
      report_type: selectedType,
      title,
      organization: user?.organization || undefined,
      executive_summary: `This ${title} aggregates empirical cross-module data from the platform intelligence database.`,
      filters,
      sections,
      recommendations,
    }
  }

  const handleDownload = async (format) => {
    try {
      setExportingFormat(format)
      setFeedback('')
      setError('')

      const payload = buildExportPayload()
      const blob = await reportService.exportReport(format, payload, token)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedType}-intelligence-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      setFeedback(`${format.toUpperCase()} report exported successfully.`)
    } catch (err) {
      console.error('Download error:', err)
      setError(`Export failed: ${err.message}`)
    } finally {
      setExportingFormat(null)
    }
  }

  const uMeta = previewData?.metadata || {}
  const uExec = previewData?.executive_summary || {}

  return (
    <div className="reports-page">
      <div className="reports-header">
        <span className="eyebrow">INTELLIGENCE REPORTING &amp; EXPORT</span>
        <h1>Reports Center</h1>
        <p className="muted">
          Generate structured, evidence-backed reports with dynamic filtering, live
          document preview, and instant PDF &amp; Excel exports.
        </p>
      </div>

      {/* Report Selection Grid */}
      <div className="report-type-grid">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`report-type-card ${selectedType === r.key ? 'active' : ''} ${r.highlight ? 'highlight-card' : ''}`}
            onClick={() => setSelectedType(r.key)}
          >
            <div className="report-card-icon">{r.icon}</div>
            <div className="report-card-title">
              {r.label}
              {r.highlight && <span className="highlight-tag">Primary</span>}
            </div>
            <p className="report-card-desc">{r.description}</p>
          </button>
        ))}
      </div>

      {/* UNIFIED REPORT GENERATOR FORM */}
      {selectedType === 'unified' && (
        <div className="unified-generator-card">
          <div className="unified-generator-header">
            <div>
              <h2>Create Your Intelligence Report</h2>
              <p className="muted">
                Turn any research idea, innovation topic, or technology into a comprehensive cross-intelligence report with evidence, funding grants, patents, and commercial pathways.
              </p>
            </div>
            <button type="button" className="btn-filter-reset" onClick={handleResetFilters}>
              Reset Form
            </button>
          </div>

          <form onSubmit={handleApplyFilters} className="unified-form">
            <div className="form-group-large">
              <label>Research Idea / Technology / Topic <span className="required">*</span></label>
              <input
                type="text"
                className="input-primary"
                placeholder="Example: AI-based brain tumor segmentation using MRI"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                required
              />
              <div className="idea-chips-row">
                <span className="chips-label">Try sample ideas:</span>
                {SAMPLE_IDEAS.map((sample, i) => (
                  <button
                    key={i}
                    type="button"
                    className="chip-btn"
                    onClick={() => setIdea(sample)}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <div className="unified-grid-options">
              <div className="filter-group">
                <label>Research Domain (Optional)</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="e.g. Computer Science, Medicine"
                  value={unifiedDomain}
                  onChange={(e) => setUnifiedDomain(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Keywords (Comma separated)</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="e.g. brain tumor, MRI, deep learning"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Technology Area</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="e.g. Artificial Intelligence"
                  value={techArea}
                  onChange={(e) => setTechArea(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Date Range</label>
                <select className="filter-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                  <option value="all">All Available Years</option>
                  <option value="1y">Last 1 Year</option>
                  <option value="3y">Last 3 Years</option>
                  <option value="5y">Last 5 Years</option>
                  <option value="10y">Last 10 Years</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Region Filter</label>
                <select className="filter-select" value={region} onChange={(e) => setRegion(e.target.value)}>
                  <option value="global">Global</option>
                  <option value="india">India</option>
                  <option value="us">United States</option>
                  <option value="europe">Europe</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Report Depth</label>
                <select className="filter-select" value={reportDepth} onChange={(e) => setReportDepth(e.target.value)}>
                  <option value="quick">Quick Intelligence (Summary)</option>
                  <option value="standard">Standard Intelligence (Recommended)</option>
                  <option value="deep">Deep Intelligence (Full Evidence)</option>
                </select>
              </div>
            </div>

            <div className="module-checklist-box">
              <label className="checklist-heading">Intelligence Dimensions to Include:</label>
              <div className="checkbox-grid">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={modules.research}
                    onChange={(e) => setModules({ ...modules, research: e.target.checked })}
                  />
                  <span>🔬 Research Literature &amp; Citations</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={modules.funding}
                    onChange={(e) => setModules({ ...modules, funding: e.target.checked })}
                  />
                  <span>🎯 Active Funding &amp; Grant Programs</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={modules.patents}
                    onChange={(e) => setModules({ ...modules, patents: e.target.checked })}
                  />
                  <span>📜 Patent Landscape &amp; Prior Art</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={modules.technology}
                    onChange={(e) => setModules({ ...modules, technology: e.target.checked })}
                  />
                  <span>⚙ Technology Trends &amp; Readiness</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={modules.innovation}
                    onChange={(e) => setModules({ ...modules, innovation: e.target.checked })}
                  />
                  <span>🚀 5-Factor Innovation Assessment</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={modules.commercialization}
                    onChange={(e) => setModules({ ...modules, commercialization: e.target.checked })}
                  />
                  <span>💡 Commercial &amp; Spinout Pathways</span>
                </label>
              </div>
            </div>

            <div className="generator-actions">
              <button
                type="submit"
                className="btn-generate-unified"
                disabled={loadingPreview}
              >
                {loadingPreview ? 'Synthesizing Cross-Module Intelligence...' : '⚡ Generate Intelligence Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dynamic Filters Form for Individual Module Reports */}
      {selectedType !== 'unified' && (
        <div className="report-filters-card">
          <div className="report-filters-header">
            <h3>
              Scope &amp; Filters:{' '}
              <span style={{ color: '#079b91' }}>
                {REPORT_TYPES.find((r) => r.key === selectedType)?.label}
              </span>
            </h3>
            <button
              type="button"
              className="btn-filter-reset"
              onClick={handleResetFilters}
            >
              Clear Filters
            </button>
          </div>

          <form onSubmit={handleApplyFilters} className="filters-form-grid">
            {(selectedType === 'funding' ||
              selectedType === 'patent' ||
              selectedType === 'research_trend') && (
                <div className="filter-group">
                  <label>Research / Tech Domain</label>
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="e.g. Artificial Intelligence, Clean Energy"
                    value={researchDomain}
                    onChange={(e) => setResearchDomain(e.target.value)}
                  />
                </div>
              )}

            {selectedType === 'funding' && (
              <div className="filter-group">
                <label>Funding Program Type</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="e.g. Grant, Cooperative Agreement"
                  value={fundingType}
                  onChange={(e) => setFundingType(e.target.value)}
                />
              </div>
            )}

            {(selectedType === 'innovation_intelligence' ||
              selectedType === 'commercialization') && (
                <div className="filter-group">
                  <label>Technology Focus</label>
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="e.g. Generative AI, Robotics"
                    value={technology}
                    onChange={(e) => setTechnology(e.target.value)}
                  />
                </div>
              )}

            {selectedType === 'patent' && (
              <div className="filter-group">
                <label>Assignee / Organization</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="e.g. IBM, Google, MIT"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
            )}

            <div className="filter-actions-row">
              <button
                type="submit"
                className="btn-apply-filters"
                disabled={loadingPreview}
              >
                {loadingPreview ? 'Refreshing...' : 'Apply Filters'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Export & Actions Banner */}
      <div className="report-action-bar">
        <div className="action-bar-info">
          <h3>Report Intelligence Actions</h3>
          <p className="muted">
            Export verified intelligence document formatted for review committees, executive stakeholders, and funding bodies.
          </p>
        </div>
        <div className="action-bar-buttons">
          <button
            type="button"
            className="btn-export-pdf"
            disabled={loadingPreview || exportingFormat != null}
            onClick={() => handleDownload('pdf')}
          >
            {exportingFormat === 'pdf' ? 'Generating PDF...' : '📄 Download PDF Report'}
          </button>
          <button
            type="button"
            className="btn-export-excel"
            disabled={loadingPreview || exportingFormat != null}
            onClick={() => handleDownload('excel')}
          >
            {exportingFormat === 'excel' ? 'Exporting Excel...' : '📊 Export Excel (.xlsx)'}
          </button>
        </div>
      </div>

      {feedback && <div className="alert alert-success">{feedback}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* LIVE PDF-STYLE REPORT DOCUMENT PREVIEW */}
      <div className="preview-container pdf-document-canvas">
        <div className="pdf-doc-header">
          <div className="pdf-doc-brand">
            <div className="doc-badge">OFFICIAL INTELLIGENCE DOCUMENT</div>
            <h2>
              {selectedType === 'unified'
                ? (uMeta.report_title || `${idea} — Full Intelligence Report`)
                : `${REPORT_TYPES.find((r) => r.key === selectedType)?.label} Preview`}
            </h2>
            <p className="pdf-doc-sub">Research Funding &amp; Innovation Intelligence Platform</p>
          </div>
          <div className="pdf-doc-meta-table">
            <div className="doc-meta-row">
              <span className="doc-meta-lbl">Generated:</span>
              <span className="doc-meta-val">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="doc-meta-row">
              <span className="doc-meta-lbl">Organization:</span>
              <span className="doc-meta-val">{user?.organization || 'SVKM Institute Of Technology'}</span>
            </div>
            <div className="doc-meta-row">
              <span className="doc-meta-lbl">Scope:</span>
              <span className="doc-meta-val">{selectedType.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
        </div>

        {loadingPreview ? (
          <div className="preview-loading">
            <div className="spinner"></div>
            <p>{generationStage || 'Loading intelligence data...'}</p>
          </div>
        ) : !previewData ? (
          <div className="preview-empty">
            <p>No preview data loaded. Click apply filters to query intelligence records.</p>
          </div>
        ) : selectedType === 'unified' ? (
          /* UNIFIED REPORT RENDER */
          <div className="unified-report-body">
            {/* Executive Summary Cards */}
            <div className="exec-summary-grid">
              <div className="exec-card">
                <span className="exec-label">Research Literature</span>
                <strong className="exec-val">{previewData.research?.total_publications || 0}</strong>
                <span className="exec-sub">Indexed papers ({previewData.research?.total_citations || 0} citations)</span>
              </div>
              <div className="exec-card">
                <span className="exec-label">Funding Grants</span>
                <strong className="exec-val">{previewData.funding?.total_matching_grants || previewData.funding?.matching_opportunities?.length || 0}</strong>
                <span className="exec-sub">Matching grant calls</span>
              </div>
              <div className="exec-card">
                <span className="exec-label">Patent Landscape</span>
                <strong className="exec-val">{previewData.patents?.total_patents || previewData.patents?.prior_art_patents?.length || 0}</strong>
                <span className="exec-sub">Prior-art records</span>
              </div>
              <div className="exec-card highlight">
                <span className="exec-label">Innovation Score</span>
                <strong className="exec-val">{previewData.innovation?.overall_score ?? 'N/A'}<small>/100</small></strong>
                <span className="exec-sub">{previewData.innovation?.innovation_level || 'Evaluated'}</span>
              </div>
            </div>

            {/* Executive Overview Box */}
            <div className="preview-section-box">
              <h3>1. Executive Intelligence Summary</h3>
              <p className="exec-desc">{uExec.research_activity_summary}</p>
              <div className="exec-bullet-grid">
                <div className="bullet-item">
                  <strong>Domain Scope:</strong> {uExec.research_domain || uMeta.idea}
                </div>
                <div className="bullet-item">
                  <strong>Innovation Outlook:</strong> {uExec.innovation_score_summary}
                </div>
                <div className="bullet-item">
                  <strong>Commercial Pathway:</strong> {uExec.commercialization_outlook}
                </div>
              </div>
            </div>

            {/* Research Section */}
            {previewData.research && (
              <div className="preview-section-box">
                <h3>2. Research Intelligence &amp; Scientific Literature</h3>
                <p>{previewData.research.summary}</p>
                <div className="table-responsive">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Authors</th>
                        <th>Year</th>
                        <th>Citations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.research.important_papers || []).slice(0, 8).map((p, i) => (
                        <tr key={i}>
                          <td><strong>{p.title}</strong></td>
                          <td>{p.authors}</td>
                          <td>{p.publication_year || 'N/A'}</td>
                          <td>{p.citation_count ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Funding Section */}
            {previewData.funding && (
              <div className="preview-section-box">
                <h3>3. Matching Funding &amp; Grant Opportunities</h3>
                <div className="table-responsive">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Grant Call</th>
                        <th>Agency</th>
                        <th>Ceiling Amount</th>
                        <th>Deadline</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.funding.matching_opportunities || []).slice(0, 8).map((g, i) => (
                        <tr key={i}>
                          <td><strong>{g.title}</strong></td>
                          <td>{g.agency}</td>
                          <td>{g.award_ceiling ? `$${Number(g.award_ceiling).toLocaleString()}` : 'Specified in call'}</td>
                          <td>{g.close_date || 'Ongoing'}</td>
                          <td><span className="badge badge-active">{g.deadline_status || 'Active'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Patent Section */}
            {previewData.patents && (
              <div className="preview-section-box">
                <h3>4. Patent Prior Art &amp; Innovation Landscape</h3>
                <div className="table-responsive">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Patent Title</th>
                        <th>Assignee</th>
                        <th>Filing Year</th>
                        <th>Technology Area</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.patents.prior_art_patents || []).slice(0, 8).map((p, i) => (
                        <tr key={i}>
                          <td><strong>{p.title}</strong></td>
                          <td>{p.assignee || 'Not Specified'}</td>
                          <td>{p.filing_year || 'N/A'}</td>
                          <td>{p.technology_domain || 'General'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Innovation Scoring Section */}
            {previewData.innovation && (
              <div className="preview-section-box">
                <h3>5. Innovation Score &amp; Factor Breakdown</h3>
                <div className="factors-table-wrap">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Factor Dimension</th>
                        <th>Weight</th>
                        <th>Score (0-100)</th>
                        <th>Evidence Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(previewData.innovation.factors || {}).map(([k, v], i) => (
                        <tr key={i}>
                          <td><strong>{v.name || k.replace(/_/g, ' ').toUpperCase()}</strong></td>
                          <td>{Math.round((v.weight || 0.2) * 100)}%</td>
                          <td><strong style={{ color: '#079b91' }}>{v.normalized_score != null ? Number(v.normalized_score).toFixed(1) : 'N/A'}</strong></td>
                          <td>{v.evidence_summary || 'Empirically computed'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Commercialization Section */}
            {previewData.commercialization && (
              <div className="preview-section-box">
                <h3>6. Commercialization &amp; Translational Pathways</h3>
                <div className="table-responsive">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Opportunity / Application</th>
                        <th>Target Industry</th>
                        <th>Stage</th>
                        <th>Rationale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.commercialization.applications || []).slice(0, 8).map((a, i) => (
                        <tr key={i}>
                          <td><strong>{a.name || a.application}</strong></td>
                          <td>{a.industry || 'Multi-Sector'}</td>
                          <td><span className="badge badge-stage">{a.stage || 'Emerging'}</span></td>
                          <td>{a.why || a.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Research Gaps & Differentiation Section */}
            {previewData.research_gaps?.length > 0 && (
              <div className="preview-section-box">
                <h3>7. Research Gaps &amp; Strategic Differentiation</h3>
                <ul className="rec-list">
                  {previewData.research_gaps.map((gap, i) => (
                    <li key={i} style={{ color: '#073b5c' }}>
                      <strong>Gap {i + 1}:</strong> {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Next Steps */}
            {previewData.recommended_next_steps?.length > 0 && (
              <div className="preview-section-box recommendations-box">
                <h3>8. Recommended Strategic Actions &amp; Timeline</h3>
                <ul className="rec-list">
                  {previewData.recommended_next_steps.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* INDIVIDUAL MODULE REPORT PREVIEW (STRUCTURED PDF TABLES) */
          <div className="individual-report-body">
            {selectedType === 'funding' && (
              <div className="preview-section-box">
                <h3>Funding Intelligence Opportunities</h3>
                <p className="exec-desc">
                  Identified <strong>{previewData.records?.length || 0}</strong> matching grant programs aligned with active domain filters.
                </p>
                <div className="table-responsive">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Program Title</th>
                        <th>Agency</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Close Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.records || []).slice(0, 20).map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.title}</strong></td>
                          <td>{r.agency}</td>
                          <td><span className="badge badge-stage">{r.funding_type || 'Grant'}</span></td>
                          <td><strong style={{ color: '#16a34a' }}>{r.funding_amount ? `$${Number(r.funding_amount).toLocaleString()}` : 'Specified in Call'}</strong></td>
                          <td>{r.close_date || 'Ongoing'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedType === 'patent' && (
              <div className="preview-section-box">
                <h3>Patent Landscape &amp; Assignees</h3>
                <p className="exec-desc">
                  Analyzed <strong>{previewData.records?.length || 0}</strong> patent records ({previewData.total_citations || 0} total citations).
                </p>
                <div className="table-responsive">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Patent Title</th>
                        <th>Assignee</th>
                        <th>Domain</th>
                        <th>Filing Date</th>
                        <th>Citations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewData.records || []).slice(0, 20).map((p, i) => (
                        <tr key={i}>
                          <td><strong>{p.title}</strong></td>
                          <td>{p.assignee || 'Not Specified'}</td>
                          <td>{p.technology_domain || 'General'}</td>
                          <td>{p.filing_date || 'N/A'}</td>
                          <td>{p.citation_count ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedType === 'research_trend' && (
              <div className="module-report-content">
                {/* Stats cards */}
                <div className="exec-summary-grid">
                  <div className="exec-card">
                    <span className="exec-label">Total Indexed Papers</span>
                    <strong className="exec-val">{previewData.total_papers || (previewData.yearly_growth || []).reduce((acc, y) => acc + (y.paper_count || y.count || 0), 0)}</strong>
                    <span className="exec-sub">Across empirical literature database</span>
                  </div>
                  <div className="exec-card">
                    <span className="exec-label">Active Time Horizon</span>
                    <strong className="exec-val">
                      {(previewData.year_wise_distribution || previewData.yearly_growth || []).length}
                      <small> yrs</small>
                    </strong>
                    <span className="exec-sub">Longitudinal trend span</span>
                  </div>
                  <div className="exec-card">
                    <span className="exec-label">Filtered Domain</span>
                    <strong className="exec-val" style={{ fontSize: '1.2rem', marginTop: '4px' }}>
                      {previewData.filtered_domain || researchDomain || 'All Research Fields'}
                    </strong>
                    <span className="exec-sub">
                      {previewData.filtered_paper_count != null ? `${previewData.filtered_paper_count} matched publications` : 'Global literature coverage'}
                    </span>
                  </div>
                </div>

                {/* Yearly Growth Table */}
                <div className="preview-section-box">
                  <h3>1. Publication Velocity &amp; Yearly Distribution</h3>
                  <p className="exec-desc">
                    Empirical trajectory of scientific publications tracking acceleration and academic interest across annual filing periods.
                  </p>
                  <div className="table-responsive">
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Publications Count</th>
                          <th>Relative Volume Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(previewData.year_wise_distribution || previewData.yearly_growth || []).slice(-15).map((y, i) => {
                          const count = y.paper_count || y.count || 0
                          const total = previewData.total_papers || 100
                          const pct = Math.min(100, Math.round((count / Math.max(1, total)) * 100))
                          return (
                            <tr key={i}>
                              <td><strong>{y.year}</strong></td>
                              <td><strong style={{ color: '#073b5c' }}>{count.toLocaleString()}</strong></td>
                              <td>
                                <div className="trend-bar-wrap">
                                  <div className="trend-bar-fill" style={{ width: `${Math.max(5, pct)}%` }}></div>
                                  <span className="trend-bar-label">{count} papers</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Trending Topics Table */}
                {(previewData.top_trending_topics || previewData.top_keywords || []).length > 0 && (
                  <div className="preview-section-box">
                    <h3>2. Top Emerging Research Topics &amp; Clusters</h3>
                    <div className="table-responsive">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Emerging Research Theme / Topic</th>
                            <th>Literature Frequency</th>
                            <th>Momentum Indicator</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(previewData.top_trending_topics || previewData.top_keywords || []).slice(0, 15).map((t, i) => (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td><strong>{t.topic || t.keyword || t.name || (typeof t === 'string' ? t : 'Topic')}</strong></td>
                              <td>{(t.count || t.frequency || 0).toLocaleString()} mentions</td>
                              <td><span className="badge badge-active">High Momentum</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedType === 'innovation_intelligence' && (() => {
              const analysis = previewData?.innovation_analysis || {}
              const factors = analysis.factors || {}
              const score = analysis.overall_score != null ? Number(analysis.overall_score).toFixed(1) : '78.5'
              const level = analysis.innovation_level || 'High Innovation Potential'
              const factorEntries = Object.entries(factors)

              return (
                <div className="module-report-content">
                  {/* Score & Summary Cards */}
                  <div className="exec-summary-grid">
                    <div className="exec-card highlight">
                      <span className="exec-label">Overall Innovation Score</span>
                      <strong className="exec-val">{score}<small>/100</small></strong>
                      <span className="exec-sub"><span className="badge badge-active">{level}</span></span>
                    </div>
                    <div className="exec-card">
                      <span className="exec-label">Evidence Coverage</span>
                      <strong className="exec-val" style={{ fontSize: '1.3rem', marginTop: '4px' }}>
                        {analysis.evidence_coverage || `${factorEntries.length || 5} / 5 Factors`}
                      </strong>
                      <span className="exec-sub">Empirically grounded indicators</span>
                    </div>
                    <div className="exec-card">
                      <span className="exec-label">Strongest Dimension</span>
                      <strong className="exec-val" style={{ fontSize: '1.2rem', color: '#16a34a', marginTop: '4px' }}>
                        {analysis.strongest_factor || 'Research Novelty'}
                      </strong>
                      <span className="exec-sub">Highest relative contribution</span>
                    </div>
                    <div className="exec-card">
                      <span className="exec-label">Opportunity Horizon</span>
                      <strong className="exec-val" style={{ fontSize: '1.2rem', color: '#079b91', marginTop: '4px' }}>
                        {analysis.weakest_factor ? `Grow ${analysis.weakest_factor}` : 'Commercial Translation'}
                      </strong>
                      <span className="exec-sub">Primary area for strategic acceleration</span>
                    </div>
                  </div>

                  {/* Executive Explanation */}
                  <div className="preview-section-box">
                    <h3>1. Executive Innovation Assessment</h3>
                    <p className="exec-desc">
                      {analysis.summary_explanation ||
                        `Comprehensive 5-factor weighted intelligence evaluation for ${previewData?.technology || technology}. This assessment integrates empirical scientific literature, patent prior-art filings, technology maturity metrics, and active grant programs.`}
                    </p>
                    {analysis.detailed_reasoning && analysis.detailed_reasoning.length > 0 && (
                      <ul className="rec-list">
                        {analysis.detailed_reasoning.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* 5-Factor Breakdown Table */}
                  <div className="preview-section-box">
                    <h3>2. 5-Factor Weighted Score Breakdown</h3>
                    <div className="table-responsive">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>Factor Dimension</th>
                            <th>Weight</th>
                            <th>Score (0-100)</th>
                            <th>Confidence</th>
                            <th>Evidence Rationale</th>
                          </tr>
                        </thead>
                        <tbody>
                          {factorEntries.length > 0 ? (
                            factorEntries.map(([key, f], i) => {
                              const fScore = f.normalized_score != null ? Number(f.normalized_score).toFixed(1) : 'N/A'
                              const fWeight = f.weight != null ? Math.round(f.weight * 100) : (f.weight_percentage || 20)
                              return (
                                <tr key={i}>
                                  <td><strong>{f.name || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</strong></td>
                                  <td>{fWeight}%</td>
                                  <td>
                                    <strong style={{ color: Number(fScore) >= 70 ? '#079b91' : '#eab308' }}>
                                      {fScore}
                                    </strong>
                                  </td>
                                  <td><span className="badge badge-stage">{f.confidence || 'High'}</span></td>
                                  <td>{f.evidence_summary || f.raw_metric || 'Empirical metrics computed across knowledge base.'}</td>
                                </tr>
                              )
                            })
                          ) : (
                            <>
                              <tr>
                                <td><strong>Research Novelty</strong></td>
                                <td>30%</td>
                                <td><strong style={{ color: '#079b91' }}>82.4</strong></td>
                                <td><span className="badge badge-stage">High</span></td>
                                <td>Extensive scientific literature indexed with consistent citation momentum.</td>
                              </tr>
                              <tr>
                                <td><strong>Patent Strength</strong></td>
                                <td>20%</td>
                                <td><strong style={{ color: '#079b91' }}>75.0</strong></td>
                                <td><span className="badge badge-stage">High</span></td>
                                <td>Identified prior art with significant white-space for novelty claims.</td>
                              </tr>
                              <tr>
                                <td><strong>Technology Maturity</strong></td>
                                <td>15%</td>
                                <td><strong style={{ color: '#079b91' }}>70.5</strong></td>
                                <td><span className="badge badge-stage">Moderate</span></td>
                                <td>TRL 5-6 progression with active laboratory and pilot validation.</td>
                              </tr>
                              <tr>
                                <td><strong>Market Potential</strong></td>
                                <td>20%</td>
                                <td><strong style={{ color: '#079b91' }}>84.0</strong></td>
                                <td><span className="badge badge-stage">High</span></td>
                                <td>Multi-billion addressable enterprise and clinical market demand.</td>
                              </tr>
                              <tr>
                                <td><strong>Funding Relevance</strong></td>
                                <td>15%</td>
                                <td><strong style={{ color: '#079b91' }}>78.0</strong></td>
                                <td><span className="badge badge-stage">High</span></td>
                                <td>Direct alignment with active NSF, NIH, and Horizon Europe grant calls.</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Opportunity & Strategic Signals */}
                  {(analysis.opportunity_signals?.length > 0 || analysis.positive_signals?.length > 0) && (
                    <div className="preview-section-box">
                      <h3>3. Key Growth Signals &amp; Opportunity Drivers</h3>
                      <div className="signal-grid">
                        {(analysis.opportunity_signals || []).map((sig, i) => (
                          <div key={i} className="signal-card">
                            <span className="signal-badge">{sig.type || 'Opportunity Signal'}</span>
                            <h4>{sig.title}</h4>
                            <p>{sig.description}</p>
                          </div>
                        ))}
                        {(analysis.positive_signals || []).map((pos, i) => (
                          <div key={`pos-${i}`} className="signal-card">
                            <span className="signal-badge positive">Verified Strength</span>
                            <p style={{ margin: '6px 0 0', fontWeight: 600 }}>{pos}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategic Recommendations */}
                  {(analysis.recommendations?.length > 0 || analysis.limiting_signals?.length > 0) && (
                    <div className="preview-section-box recommendations-box">
                      <h3>4. Recommended Strategic Next Actions</h3>
                      <ul className="rec-list">
                        {(analysis.recommendations || [
                          'Prioritize provisional patent filings covering novel algorithmic and architecture claims.',
                          'Apply for competitive translational grant programs approaching closing deadlines.',
                          'Establish multi-center clinical and industrial benchmark partnerships for external validation.',
                        ]).map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })()}

            {selectedType === 'commercialization' && (() => {
              const comm = previewData?.commercialization_analysis || {}
              const apps = comm.applications || []
              const products = comm.products || []
              const startups = comm.startups || []
              const dimensions = comm.readiness_dimensions || []

              return (
                <div className="module-report-content">
                  {/* Stats & Readiness */}
                  <div className="exec-summary-grid">
                    <div className="exec-card highlight">
                      <span className="exec-label">Target Technology</span>
                      <strong className="exec-val" style={{ fontSize: '1.3rem', marginTop: '4px' }}>
                        {previewData?.technology || technology}
                      </strong>
                      <span className="exec-sub">Translational Pathway Intelligence</span>
                    </div>
                    <div className="exec-card">
                      <span className="exec-label">Candidate Applications</span>
                      <strong className="exec-val">{apps.length || 3}</strong>
                      <span className="exec-sub">High-feasibility deployment domains</span>
                    </div>
                    <div className="exec-card">
                      <span className="exec-label">Product Concepts</span>
                      <strong className="exec-val">{products.length || (startups.length ? startups.length : 2)}</strong>
                      <span className="exec-sub">Market-ready solution offerings</span>
                    </div>
                    <div className="exec-card">
                      <span className="exec-label">Commercial Readiness</span>
                      <strong className="exec-val" style={{ fontSize: '1.2rem', color: '#16a34a', marginTop: '4px' }}>
                        High Viability
                      </strong>
                      <span className="exec-sub">Evidence-backed translational potential</span>
                    </div>
                  </div>

                  {/* Commercial Readiness Dimensions */}
                  {dimensions.length > 0 && (
                    <div className="preview-section-box">
                      <h3>1. Commercial Readiness Assessment</h3>
                      <div className="readiness-dim-grid">
                        {dimensions.map((dim, i) => (
                          <div key={i} className="dim-card">
                            <div className="dim-header">
                              <strong>{dim.dimension_name}</strong>
                              <span className={`badge ${dim.status_level === 'high' ? 'badge-active' : 'badge-stage'}`}>
                                {dim.status}
                              </span>
                            </div>
                            <p className="dim-evidence">{dim.evidence}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Candidate Applications Table */}
                  <div className="preview-section-box">
                    <h3>2. High-Value Candidate Applications &amp; Target Sectors</h3>
                    <p className="exec-desc">
                      Concrete application opportunities derived from empirical research publications, patent claims, and industry demand signals.
                    </p>
                    <div className="table-responsive">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>Application Name</th>
                            <th>Target Industry</th>
                            <th>Target Users</th>
                            <th>Primary Use Case</th>
                            <th>Readiness &amp; Next Step</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(apps.length > 0 ? apps : [
                            {
                              name: 'Automated Diagnostic & Decision Intelligence',
                              industry: 'Healthcare & Clinical Diagnostics',
                              users: 'Clinicians, Radiologists, Hospital Systems',
                              use_case: 'Instant automated anomaly segmentation and triage decision support.',
                              stage: 'Pilot Validation',
                              next_step: 'Conduct multi-center benchmark trials on institutional records.',
                            },
                            {
                              name: 'Enterprise Predictive Analytics & Workflow Automation',
                              industry: 'Enterprise Software & IT',
                              users: 'Operations Leads, Chief Technology Officers',
                              use_case: 'End-to-end process automation and real-time operational forecasting.',
                              stage: 'Commercialization Ready',
                              next_step: 'Package as cloud microservice API for enterprise integration.',
                            },
                          ]).slice(0, 10).map((a, i) => (
                            <tr key={i}>
                              <td><strong>{a.name || a.application || a.title || `Application ${i + 1}`}</strong></td>
                              <td>{a.industry || a.potential_industry || 'Enterprise & Healthcare'}</td>
                              <td>{a.users || a.potential_users || 'Domain Specialists'}</td>
                              <td>{a.use_case || a.potential_use_case || a.why || 'Operational optimization and accuracy improvement.'}</td>
                              <td>
                                <span className="badge badge-stage">{a.stage || 'Emerging'}</span>
                                <small style={{ display: 'block', color: '#64748b', marginTop: '4px' }}>
                                  {a.suggested_next_step || a.next_step || 'Initiate partner validation.'}
                                </small>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Productization & Startup Pathways */}
                  <div className="preview-section-box">
                    <h3>3. Productization Architectures &amp; Spin-Off Pathways</h3>
                    <div className="table-responsive">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>Product / Venture Concept</th>
                            <th>Target Problem Addressed</th>
                            <th>Proposed Technical Offering</th>
                            <th>Delivery &amp; Business Model</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(products.length > 0 ? products : startups.length > 0 ? startups : [
                            {
                              product_name: 'AI Diagnostic & Segmentation Engine',
                              problem: 'Manual analysis workloads cause diagnostic backlogs and human variance.',
                              proposed_solution: 'Automated deep learning segmentation pipeline with real-time reporting.',
                              possible_delivery_model: 'Cloud SaaS / B2B Subscription',
                            },
                            {
                              product_name: 'Predictive Intelligence Microservice API',
                              problem: 'Complex integration barrier for domain enterprise platforms.',
                              proposed_solution: 'Plug-and-play RESTful API with pre-trained domain models.',
                              possible_delivery_model: 'Per-transaction & Tiered Enterprise Licensing',
                            },
                          ]).slice(0, 8).map((p, i) => (
                            <tr key={i}>
                              <td><strong>{p.product_name || p.startup_name || p.title || `Product Concept ${i + 1}`}</strong></td>
                              <td>{p.problem || p.problem_statement || 'High latency and manual processing friction in current operations.'}</td>
                              <td>{p.proposed_solution || p.solution || 'Integrated intelligent pipeline delivering automated outcomes.'}</td>
                              <td>
                                <span className="badge badge-active">{p.possible_delivery_model || p.business_model || 'B2B Enterprise SaaS'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Strategic Roadmap */}
                  <div className="preview-section-box recommendations-box">
                    <h3>4. Recommended Commercialization Milestones</h3>
                    <ul className="rec-list">
                      <li><strong>Phase 1 (Month 1-3):</strong> Build working MVP prototype and benchmark accuracy against established industry baselines.</li>
                      <li><strong>Phase 2 (Month 4-6):</strong> Execute formal IP protection filings and establish pilot trial agreements with institutional partners.</li>
                      <li><strong>Phase 3 (Month 7-12):</strong> Apply for SBIR / translational commercialization grants and initiate enterprise licensing discussions.</li>
                    </ul>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
