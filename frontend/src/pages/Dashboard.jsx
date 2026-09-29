import { useContext, useEffect, useMemo, useState } from 'react'
import { AuthContext } from '../context/auth-context'
import {
  getDashboardPapers,
  getResearchTrends,
  getFundingRecommendations,
  getDashboardPatents,
  getInnovationScore,
} from '../services/dashboardService'

function StatCard({ label, value, subtitle }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="muted">{subtitle}</div>}
    </div>
  )
}

function Section({ title, children, action }) {
  return (
    <section className="card dashboard-section">
      <div className="section-header">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ message }) {
  return <div className="empty-state">{message}</div>
}

function LoadingState() {
  return <div className="dashboard-loading">Loading researcher intelligence...</div>
}

export default function Dashboard() {
  const { token, user } = useContext(AuthContext)

  const [papers, setPapers] = useState([])
  const [trends, setTrends] = useState(null)
  const [funding, setFunding] = useState([])
  const [patents, setPatents] = useState([])
  const [innovation, setInnovation] = useState(null)

  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    if (!token) return

    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setErrors([])

      const results = await Promise.allSettled([
        getDashboardPapers(token),
        getResearchTrends(token),
        getFundingRecommendations(token),
        getDashboardPatents(token),
        getInnovationScore(
          token,
          user?.research_domain || 'Artificial Intelligence'
        ),
      ])

      if (cancelled) return

      const newErrors = []

      if (results[0].status === 'fulfilled') {
        setPapers(results[0].value?.papers || [])
      } else {
        newErrors.push('Publication data')
      }

      if (results[1].status === 'fulfilled') {
        setTrends(results[1].value)
      } else {
        newErrors.push('Research trends')
      }

      if (results[2].status === 'fulfilled') {
        setFunding(results[2].value?.recommendations || [])
      } else {
        newErrors.push('Funding recommendations')
      }

      if (results[3].status === 'fulfilled') {
        setPatents(
          Array.isArray(results[3].value)
            ? results[3].value
            : results[3].value?.patents || []
        )
      } else {
        newErrors.push('Patent intelligence')
      }

      if (results[4].status === 'fulfilled') {
        setInnovation(results[4].value)
      } else {
        newErrors.push('Innovation score')
      }

      setErrors(newErrors)
      setLoading(false)
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [token, user?.research_domain])

  const publicationCount = papers.length

  const citationCount = useMemo(
    () =>
      papers.reduce(
        (total, paper) => total + Number(paper.citation_count || 0),
        0
      ),
    [papers]
  )

  const patentCount = patents.length

  const yearDistribution = trends?.year_wise_distribution || []

  const maxYearCount = Math.max(
    ...yearDistribution.map(item => Number(item.paper_count || 0)),
    1
  )

  const topTopics = trends?.top_topics || []

  const factors = innovation?.factors || {}

  const factorList = [
    ['Research Novelty', factors.research_novelty],
    ['Patent Strength', factors.patent_strength],
    ['Technology Maturity', factors.tech_maturity],
    ['Market Potential', factors.market_potential],
    ['Funding Relevance', factors.funding_relevance],
  ]

  if (loading) {
    return (
      <div className="page">
        <LoadingState />
      </div>
    )
  }

  return (
    <div className="page dashboard-page">
      <div className="dashboard-header">
        <div>
          <div className="eyebrow">RESEARCHER DASHBOARD</div>
          <h1>
            Welcome, {user?.name || user?.email?.split('@')[0] || 'Researcher'}
          </h1>
          <p className="muted">
            Research intelligence, funding opportunities, patent insights and
            innovation analytics in one place.
          </p>
        </div>

        <div className="researcher-meta">
          <span>{user?.research_domain || 'Research'}</span>
          {user?.organization && <span>{user.organization}</span>}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="dashboard-warning">
          Some dashboard sources could not be loaded: {errors.join(', ')}.
        </div>
      )}

      <div className="dashboard-grid stats-grid">
        <StatCard
          label="Publications"
          value={publicationCount}
          subtitle="Indexed research papers"
        />

        <StatCard
          label="Citations"
          value={citationCount}
          subtitle="Across indexed publications"
        />

        <StatCard
          label="Patents"
          value={patentCount}
          subtitle="Indexed patent records"
        />

        <StatCard
          label="Innovation Score"
          value={
            innovation?.overall_score != null
              ? `${Number(innovation.overall_score).toFixed(1)}/100`
              : '—'
          }
          subtitle={innovation?.innovation_level || 'Evidence-based assessment'}
        />
      </div>

      <div className="dashboard-two-column">
        <Section title="Research Trends">
          {yearDistribution.length === 0 ? (
            <EmptyState message="No research trend data available." />
          ) : (
            <div className="trend-chart">
              {yearDistribution.map(item => {
                const count = Number(item.paper_count || 0)
                const height = Math.max(
                  8,
                  (count / maxYearCount) * 100
                )

                return (
                  <div className="trend-column" key={item.year}>
                    <div className="trend-value">{count}</div>
                    <div
                      className="trend-bar"
                      style={{ height: `${height}%` }}
                    />
                    <div className="trend-year">{item.year}</div>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        <Section title="Innovation Score">
          {!innovation ? (
            <EmptyState message="Innovation score is unavailable." />
          ) : (
            <>
              <div className="innovation-score">
                <div className="score-number">
                  {Number(innovation.overall_score || 0).toFixed(1)}
                </div>
                <div>
                  <div className="score-label">Overall Score / 100</div>
                  <div className="score-level">
                    {innovation.innovation_level}
                  </div>
                </div>
              </div>

              <div className="factor-list">
                {factorList.map(([name, factor]) => {
                  const score = factor?.normalized_score

                  return (
                    <div className="factor-row" key={name}>
                      <div className="factor-name">{name}</div>

                      <div className="factor-track">
                        <div
                          className="factor-fill"
                          style={{
                            width:
                              score != null
                                ? `${Math.max(0, Math.min(100, score))}%`
                                : '0%',
                          }}
                        />
                      </div>

                      <div className="factor-score">
                        {score != null
                          ? `${Number(score).toFixed(1)}`
                          : 'N/A'}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="muted score-coverage">
                Evidence coverage: {innovation.evidence_coverage || 'N/A'}
              </div>
            </>
          )}
        </Section>
      </div>

      <div className="dashboard-two-column">
        <Section title="Funding Recommendations">
          {funding.length === 0 ? (
            <EmptyState message="No matching funding opportunities found." />
          ) : (
            <div className="recommendation-list">
              {funding.slice(0, 5).map(item => (
                <div className="recommendation-item" key={item.id}>
                  <div>
                    <h3>{item.title}</h3>
                    <p className="muted">
                      {item.agency || 'Funding agency'}
                    </p>
                  </div>

                  <div className="recommendation-right">
                    {item.relevance_percentage != null && (
                      <span className="badge">
                        {Number(item.relevance_percentage).toFixed(0)}% match
                      </span>
                    )}

                    <span className="muted">
                      {item.deadline_status || 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Patent Insights">
          {patents.length === 0 ? (
            <EmptyState message="No patent intelligence available." />
          ) : (
            <div className="recommendation-list">
              {patents.slice(0, 5).map(patent => (
                <div className="recommendation-item" key={patent.id}>
                  <div>
                    <h3>{patent.title || 'Untitled Patent'}</h3>
                    <p className="muted">
                      {patent.assignee || 'Unknown assignee'}
                    </p>
                  </div>

                  <div className="recommendation-right">
                    <span className="badge">
                      {patent.technology_domain || 'Technology'}
                    </span>

                    <span className="muted">
                      {patent.citation_count || 0} citations
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="dashboard-two-column">
        <Section title="Publication Analytics">
          {papers.length === 0 ? (
            <EmptyState message="No publications available." />
          ) : (
            <div className="analytics-list">
              <div>
                <span className="muted">Total Publications</span>
                <strong>{publicationCount}</strong>
              </div>

              <div>
                <span className="muted">Total Citations</span>
                <strong>{citationCount}</strong>
              </div>

              <div>
                <span className="muted">Research Domains</span>
                <strong>
                  {new Set(
                    papers
                      .map(p => p.research_domain)
                      .filter(Boolean)
                  ).size}
                </strong>
              </div>

              <div>
                <span className="muted">Publication Years</span>
                <strong>{yearDistribution.length}</strong>
              </div>
            </div>
          )}
        </Section>

        <Section title="Trending Topics">
          {topTopics.length === 0 ? (
            <EmptyState message="No trending topics available." />
          ) : (
            <div className="topic-list">
              {topTopics.slice(0, 8).map(topic => (
                <div className="topic-item" key={topic.topic}>
                  <span>{topic.topic}</span>
                  <span className="badge">
                    {topic.count} papers
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
