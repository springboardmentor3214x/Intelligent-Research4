import React, { useState, useEffect } from 'react'
import { technologyService } from '../services/technologyService'
import './TechnologyAdoption.css'

export default function TechnologyAdoption({ customAnalysis, onClearCustom }) {
  const [technologies, setTechnologies] = useState([])
  const [selectedTechId, setSelectedTechId] = useState('')
  const [adoptionData, setAdoptionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adoptionLoading, setAdoptionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadTechnologies()
  }, [])

  useEffect(() => {
    if (customAnalysis) {
      setAdoptionData({
        technology: customAnalysis.technology,
        adoption: customAnalysis.adoption,
        coverage: customAnalysis.coverage,
        yearly_evidence: customAnalysis.yearly_evidence,
      })
      if (customAnalysis.technology_id) {
        setSelectedTechId(customAnalysis.technology_id)
      }
    }
  }, [customAnalysis])

  async function loadTechnologies() {
    try {
      setLoading(true)
      setError('')
      const list = await technologyService.getTechnologies()
      setTechnologies(list || [])
      if (list && list.length > 0 && !customAnalysis) {
        setSelectedTechId(list[0].id)
        loadAdoption(list[0].technology_name)
      }
    } catch (err) {
      setError(err.message || 'Failed to load technologies')
    } finally {
      setLoading(false)
    }
  }

  async function loadAdoption(techName) {
    if (!techName) return
    try {
      setAdoptionLoading(true)
      const data = await technologyService.analyzeCustomTechnology(techName)
      setAdoptionData({
        technology: data.technology,
        adoption: data.adoption,
        coverage: data.coverage,
        yearly_evidence: data.yearly_evidence,
      })
    } catch (err) {
      console.error('Failed to load adoption data:', err)
    } finally {
      setAdoptionLoading(false)
    }
  }

  function handleSelectChange(e) {
    const techName = e.target.value
    setSelectedTechId(techName)
    if (onClearCustom) onClearCustom()
    loadAdoption(techName)
  }

  return (
    <div className="tech-adoption-container">
      {/* Header */}
      <div className="adoption-header-card">
        <div className="adoption-header-left">
          <div className="platform-tag">MARKET ADOPTION INTELLIGENCE</div>
          <h1 className="page-title">Independent Market Adoption &amp; Deployment</h1>
          <p className="page-subtitle">
            Market adoption measures practical industrial implementation and enterprise IP assignment,
            strictly decoupled from the six technological maturity indicators.
          </p>
        </div>

        {/* Technology Selector */}
        <div className="adoption-selector-box">
          <label className="selector-label">Select Tracked Technology:</label>
          <select
            className="tech-dropdown-select"
            value={selectedTechId}
            onChange={handleSelectChange}
          >
            {technologies.map((t) => (
              <option key={t.id} value={t.technology_name}>
                {t.technology_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
        </div>
      )}

      {loading || adoptionLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Analyzing enterprise adoption &amp; deployment signals...</p>
        </div>
      ) : adoptionData ? (
        <div className="adoption-content-grid">
          {/* 1. Main Adoption Status Banner */}
          <div className="adoption-main-card">
            <div className="adoption-main-left">
              <span className="adoption-badge-tag">Market Adoption Assessment</span>
              <h2 className="adoption-tech-title">{adoptionData.technology}</h2>
              <div className="adoption-level-row">
                <span className="adoption-level-label">Observed Adoption Level:</span>
                <span className={`adoption-level-pill level-${(adoptionData.adoption?.level || 'insufficient').toLowerCase().replace(/\s+/g, '-')}`}>
                  {adoptionData.adoption?.level || 'Insufficient Evidence'}
                </span>
                <span className="adoption-trend-pill">
                  Trend: <strong>{adoptionData.adoption?.trend || 'Nascent'}</strong>
                </span>
              </div>
              <p className="adoption-summary-text">
                {adoptionData.adoption?.status_summary}
              </p>
              <div className="adoption-disclaimer-box">
                💡 <strong>Methodology Note:</strong> {adoptionData.adoption?.evidence_notes}
              </div>
            </div>

            <div className="adoption-main-right">
              <div className="commercial-orgs-panel">
                <h4 className="orgs-panel-title">Active Commercial Assignees ({adoptionData.adoption?.active_commercial_organizations?.length || 0})</h4>
                <div className="orgs-list-box">
                  {adoptionData.adoption?.active_commercial_organizations?.length > 0 ? (
                    adoptionData.adoption.active_commercial_organizations.map((org, i) => (
                      <span key={i} className="org-chip">🏢 {org}</span>
                    ))
                  ) : (
                    <span className="no-orgs-text">No commercial assignees identified in connected records</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Multi-Year Activity & Deployment Matrix */}
          <div className="adoption-matrix-card">
            <h3 className="matrix-title">Multi-Year Deployment &amp; Activity Timeline</h3>
            <div className="matrix-table-wrap">
              <table className="adoption-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Research Papers</th>
                    <th>Patent Filings</th>
                    <th>Active Organizations</th>
                    <th>Identified Domains</th>
                    <th>Total Activity</th>
                    <th>YoY Research Growth</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {adoptionData.yearly_evidence?.length > 0 ? (
                    adoptionData.yearly_evidence.map((row) => (
                      <tr key={row.year}>
                        <td className="font-bold">{row.year}</td>
                        <td>{row.research_count}</td>
                        <td>{row.patent_count}</td>
                        <td>{row.organization_count}</td>
                        <td>{row.application_count}</td>
                        <td className="font-bold text-blue">{row.total_activity}</td>
                        <td>
                          {row.yoy_research_growth !== null ? (
                            <span className={row.yoy_research_growth >= 0 ? 'text-green' : 'text-red'}>
                              {row.yoy_research_growth > 0 ? '+' : ''}{row.yoy_research_growth}%
                            </span>
                          ) : (
                            <span className="text-muted">N/A</span>
                          )}
                        </td>
                        <td className="text-notes">{row.yoy_growth_notes || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="empty-table-cell">No historical timeline records available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>Select a technology above to inspect market adoption data.</p>
        </div>
      )}
    </div>
  )
}
