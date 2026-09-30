import { useContext, useEffect, useState } from 'react'

import { AuthContext } from '../context/auth-context'

import {
  getPersonalizedFundingRecommendations,
} from '../services/fundingService'

import patentService from '../services/patentService'

import { technologyService } from '../services/technologyService'

import {
  getFullCommercializationAnalysis,
} from '../services/commercializationService'


function StatCard({ title, value, description }) {
  return (
    <div className="startup-stat-card">
      <p className="startup-stat-title">{title}</p>
      <h3>{value}</h3>
      <p className="startup-stat-description">{description}</p>
    </div>
  )
}


function SectionHeader({ title, description }) {
  return (
    <div className="startup-section-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  )
}


export default function StartupDashboard() {
  const { token, user } = useContext(AuthContext)

  // Module 4 - Funding
  const [funding, setFunding] = useState([])

  // Module 5 - Patents
  const [patents, setPatents] = useState([])

  // Module 6 - Technology
  const [technology, setTechnology] = useState([])

  // Module 8 - Commercialization
  const [commercialization, setCommercialization] = useState([])

  const [loading, setLoading] = useState(true)

  const [fundingError, setFundingError] = useState('')
  const [patentError, setPatentError] = useState('')
  const [technologyError, setTechnologyError] = useState('')
  const [commercializationError, setCommercializationError] =
    useState('')


  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    async function loadDashboard() {
      setLoading(true)

      // ============================================
      // MODULE 4 - FUNDING OPPORTUNITIES
      // ============================================

      try {
        const fundingData =
          await getPersonalizedFundingRecommendations({
            token,
            limit: 6,
          })

        const fundingItems =
          fundingData?.recommendations ||
          fundingData?.opportunities ||
          fundingData?.results ||
          []

        setFunding(
          Array.isArray(fundingItems)
            ? fundingItems
            : []
        )

        setFundingError('')
      } catch (error) {
        console.error(
          'Funding dashboard error:',
          error
        )

        setFundingError(
          'Funding opportunities could not be loaded.'
        )

        setFunding([])
      }


      // ============================================
      // MODULE 5 - PATENT INTELLIGENCE
      // ============================================

      try {
        const patentData =
          await patentService.getPatents('', 6)

        const patentItems =
          Array.isArray(patentData)
            ? patentData
            : patentData?.patents ||
              patentData?.results ||
              []

        setPatents(
          Array.isArray(patentItems)
            ? patentItems
            : []
        )

        setPatentError('')
      } catch (error) {
        console.error(
          'Patent dashboard error:',
          error
        )

        setPatentError(
          'Patent intelligence could not be loaded.'
        )

        setPatents([])
      }


      // ============================================
      // MODULE 6 - TECHNOLOGY OPPORTUNITIES
      // ============================================

      let technologyItems = []

      try {
        const technologyData =
          await technologyService.getEmergingTechnologies()

        technologyItems =
          Array.isArray(technologyData)
            ? technologyData
            : technologyData?.technologies ||
              technologyData?.results ||
              []

        setTechnology(
          Array.isArray(technologyItems)
            ? technologyItems
            : []
        )

        setTechnologyError('')
      } catch (error) {
        console.error(
          'Technology dashboard error:',
          error
        )

        setTechnology([])
        setTechnologyError(
          'Technology opportunities could not be loaded.'
        )
      }


      // ============================================
      // MODULE 8 - COMMERCIALIZATION INSIGHTS
      // ============================================

      try {
        if (technologyItems.length === 0) {
          setCommercialization([])
          setCommercializationError(
            'No emerging technology is available for commercialization analysis.'
          )
        } else {
          const selectedTechnology =
            technologyItems[0]?.technology_name ||
            technologyItems[0]?.name ||
            technologyItems[0]?.title ||
            technologyItems[0]?.technology

          if (!selectedTechnology) {
            setCommercialization([])
            setCommercializationError(
              'No technology was available for commercialization analysis.'
            )
          } else {
            const commercializationData =
              await getFullCommercializationAnalysis(
                selectedTechnology
              )

            const opportunities = []

            const applications =
              commercializationData?.applications ||
              []

            const products =
              commercializationData?.products ||
              []

            const startups =
              commercializationData?.startups ||
              []

            const licensing =
              commercializationData?.licensing_opportunities ||
              []

            const partnerships =
              commercializationData?.industry_partnerships ||
              []


            applications.forEach((item, index) => {
              opportunities.push({
                id: `application-${index}`,
                type: 'Application',
                title:
                  item.application_name ||
                  item.name ||
                  item.title ||
                  'Commercial Application',
                description:
                  item.why_relevant ||
                  item.potential_use_case ||
                  item.description ||
                  'Potential commercial application identified.',
                industry:
                  item.potential_industry ||
                  item.industry ||
                  'Not specified',
              })
            })


            products.forEach((item, index) => {
              opportunities.push({
                id: `product-${index}`,
                type: 'Product',
                title:
                  item.product_name ||
                  item.name ||
                  item.title ||
                  'Product Opportunity',
                description:
                  item.proposed_solution ||
                  item.problem ||
                  item.description ||
                  'Potential productization opportunity identified.',
                industry:
                  item.target_industry ||
                  item.industry ||
                  'Not specified',
              })
            })


            startups.forEach((item, index) => {
              opportunities.push({
                id: `startup-${index}`,
                type: 'Startup',
                title:
                  item.startup_concept ||
                  item.name ||
                  item.title ||
                  'Startup Opportunity',
                description:
                  item.proposed_solution ||
                  item.problem ||
                  item.description ||
                  'Potential startup opportunity identified.',
                industry:
                  item.target_industry ||
                  item.industry ||
                  'Not specified',
              })
            })


            licensing.forEach((item, index) => {
              opportunities.push({
                id: `licensing-${index}`,
                type: 'Licensing',
                title:
                  item.organization ||
                  item.name ||
                  item.title ||
                  'Licensing Opportunity',
                description:
                  item.why_relevant ||
                  item.description ||
                  'Potential licensing opportunity identified.',
                industry:
                  item.industry_domain ||
                  item.industry ||
                  'Not specified',
              })
            })


            partnerships.forEach((item, index) => {
              opportunities.push({
                id: `partnership-${index}`,
                type: 'Industry Partnership',
                title:
                  item.organization ||
                  item.name ||
                  item.title ||
                  'Industry Partnership',
                description:
                  item.synergy_reason ||
                  item.description ||
                  'Potential industry partnership identified.',
                industry:
                  item.target_sector ||
                  item.industry ||
                  'Not specified',
              })
            })


            setCommercialization(
              opportunities.slice(0, 8)
            )

            setCommercializationError('')
          }
        }
      } catch (error) {
        console.error(
          'Commercialization dashboard error:',
          error
        )

        setCommercialization([])
        setCommercializationError(
          'Commercialization insights could not be loaded.'
        )
      }


      setLoading(false)
    }

    loadDashboard()
  }, [token])


  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <section className="startup-dashboard">
        <div className="startup-loading">
          Loading startup intelligence...
        </div>
      </section>
    )
  }


  // ============================================
  // DASHBOARD
  // ============================================

  return (
    <section className="startup-dashboard">

      {/* ========================================
          HEADER
      ========================================= */}

      <div className="startup-dashboard-header">
        <div>
          <p className="eyebrow">
            STARTUP INTELLIGENCE
          </p>

          <h1>
            Welcome,{' '}
            {user?.name ||
              user?.full_name ||
              user?.username ||
              'Startup Founder'}
          </h1>

          <p>
            Discover funding opportunities,
            technology opportunities, patent
            intelligence and commercialization
            insights.
          </p>
        </div>

        <div className="startup-role-badge">
          Startup Founder
        </div>
      </div>


      {/* ========================================
          SUMMARY CARDS
      ========================================= */}

      <div className="startup-stat-grid">

        <StatCard
          title="Funding Opportunities"
          value={funding.length}
          description="Relevant funding opportunities"
        />

        <StatCard
          title="Technology Opportunities"
          value={
            technology.length > 0
              ? technology.length
              : '—'
          }
          description={
            technology.length > 0
              ? 'Emerging technologies identified'
              : 'No technology opportunities available'
          }
        />

        <StatCard
          title="Patent Intelligence"
          value={patents.length}
          description="Patent records available"
        />

        <StatCard
          title="Commercialization"
          value={
            commercialization.length > 0
              ? commercialization.length
              : '—'
          }
          description={
            commercialization.length > 0
              ? 'Business opportunities identified'
              : 'No commercialization insights available'
          }
        />

      </div>


      {/* ========================================
          MODULE 4
          FUNDING OPPORTUNITIES
      ========================================= */}

      <section className="startup-dashboard-section">

        <SectionHeader
          title="Funding Opportunities"
          description="Funding opportunities relevant to your startup."
        />

        {fundingError && (
          <div className="startup-error">
            {fundingError}
          </div>
        )}

        {!fundingError && funding.length === 0 && (
          <div className="startup-empty">
            No funding opportunities are currently
            available.
          </div>
        )}

        {funding.length > 0 && (
          <div className="startup-card-grid">

            {funding.map((item, index) => (
              <article
                className="startup-info-card"
                key={
                  item.id ||
                  item.opportunity_id ||
                  index
                }
              >

                <span className="startup-card-label">
                  Funding
                </span>

                <h3>
                  {item.title ||
                    item.name ||
                    item.opportunity_name ||
                    'Funding Opportunity'}
                </h3>

                <p>
                  {item.description ||
                    item.summary ||
                    item.matched_reason ||
                    'Funding opportunity relevant to your profile.'}
                </p>

                {(item.agency ||
                  item.organization) && (
                  <div className="startup-card-meta">
                    <strong>
                      Organization:
                    </strong>{' '}
                    {item.agency ||
                      item.organization}
                  </div>
                )}

                {(item.close_date ||
                  item.deadline) && (
                  <div className="startup-card-meta">
                    <strong>
                      Deadline:
                    </strong>{' '}
                    {item.close_date ||
                      item.deadline}
                  </div>
                )}

                {item.relevance_score !== undefined && (
                  <div className="startup-score">
                    Relevance:{' '}
                    {Math.round(
                      Number(item.relevance_score)
                    )}
                    %
                  </div>
                )}

              </article>
            ))}

          </div>
        )}

      </section>


      {/* ========================================
          MODULE 6
          TECHNOLOGY OPPORTUNITIES
      ========================================= */}

      <section className="startup-dashboard-section">

        <SectionHeader
          title="Technology Opportunities"
          description="Emerging technologies, research growth and potential startup opportunities."
        />

        {technologyError && (
          <div className="startup-error">
            {technologyError}
          </div>
        )}

        {!technologyError &&
          technology.length === 0 && (
            <div className="startup-empty">
              No technology opportunities are
              currently available.
            </div>
          )}

        {technology.length > 0 && (
          <div className="startup-card-grid">

            {technology.map((item, index) => (
              <article
                className="startup-info-card"
                key={item.id || index}
              >

                <span className="startup-card-label">
                  Technology
                </span>

                <h3>
                  {item.technology_name ||
                    item.name ||
                    item.title ||
                    item.technology ||
                    'Technology Opportunity'}
                </h3>

                <p>
                  {item.description ||
                    item.summary ||
                    'Emerging technology identified by the platform.'}
                </p>

                {item.technology_domain && (
                  <div className="startup-card-meta">
                    <strong>Domain:</strong>{' '}
                    {item.technology_domain}
                  </div>
                )}

                {item.emerging_status && (
                  <div className="startup-card-meta">
                    <strong>Stage:</strong>{' '}
                    {item.emerging_status}
                  </div>
                )}

                {item.research_paper_count !==
                  undefined && (
                  <div className="startup-card-meta">
                    <strong>Research:</strong>{' '}
                    {item.research_paper_count}
                  </div>
                )}

                {item.patent_count !== undefined && (
                  <div className="startup-card-meta">
                    <strong>Patents:</strong>{' '}
                    {item.patent_count}
                  </div>
                )}

                {item.funding_opportunity_count !==
                  undefined && (
                  <div className="startup-card-meta">
                    <strong>Funding:</strong>{' '}
                    {item.funding_opportunity_count}
                  </div>
                )}

                {item.research_growth_rate !==
                  undefined &&
                  item.research_growth_rate !== null && (
                    <div className="startup-card-meta">
                      <strong>
                        Research Growth:
                      </strong>{' '}
                      {item.research_growth_rate}
                    </div>
                  )}

                {item.patent_growth_rate !==
                  undefined &&
                  item.patent_growth_rate !== null && (
                    <div className="startup-card-meta">
                      <strong>
                        Patent Growth:
                      </strong>{' '}
                      {item.patent_growth_rate}
                    </div>
                  )}

                <div className="startup-score">
                  Emerging Score:{' '}
                  {item.emerging_score !== null &&
                  item.emerging_score !== undefined
                    ? Number(
                        item.emerging_score
                      ).toFixed(1)
                    : 'N/A'}
                </div>

              </article>
            ))}

          </div>
        )}

      </section>


      {/* ========================================
          MODULE 5
          PATENT INTELLIGENCE
      ========================================= */}

      <section className="startup-dashboard-section">

        <SectionHeader
          title="Patent Intelligence"
          description="Relevant patents and technology landscape information."
        />

        {patentError && (
          <div className="startup-error">
            {patentError}
          </div>
        )}

        {!patentError && patents.length === 0 && (
          <div className="startup-empty">
            No patent intelligence is currently
            available.
          </div>
        )}

        {patents.length > 0 && (
          <div className="startup-table-wrapper">

            <table className="startup-table">

              <thead>
                <tr>
                  <th>Patent</th>
                  <th>Assignee</th>
                  <th>Technology</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {patents.map((patent, index) => (
                  <tr
                    key={
                      patent.id ||
                      patent.publication_number ||
                      index
                    }
                  >

                    <td>
                      <strong>
                        {patent.title ||
                          'Untitled Patent'}
                      </strong>
                    </td>

                    <td>
                      {patent.assignee ||
                        'Not available'}
                    </td>

                    <td>
                      {patent.technology_domain ||
                        patent.patent_domain ||
                        'Not available'}
                    </td>

                    <td>
                      {patent.status ||
                        patent.patent_status ||
                        'Unknown'}
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>


      {/* ========================================
          MODULE 8
          COMMERCIALIZATION INSIGHTS
      ========================================= */}

      <section className="startup-dashboard-section">

        <SectionHeader
          title="Commercialization Insights"
          description="Potential product, licensing, startup and industry partnership opportunities."
        />

        {commercializationError && (
          <div className="startup-error">
            {commercializationError}
          </div>
        )}

        {!commercializationError &&
          commercialization.length === 0 && (
            <div className="startup-empty">
              No commercialization opportunities
              are currently available.
            </div>
          )}

        {commercialization.length > 0 && (
          <div className="startup-card-grid">

            {commercialization.map((item, index) => (
              <article
                className="startup-info-card"
                key={item.id || index}
              >

                <span className="startup-card-label">
                  {item.type || 'Opportunity'}
                </span>

                <h3>
                  {item.title ||
                    item.name ||
                    'Commercialization Opportunity'}
                </h3>

                <p>
                  {item.description ||
                    item.summary ||
                    'Potential commercialization opportunity identified by the platform.'}
                </p>

                {item.industry && (
                  <div className="startup-card-meta">
                    <strong>
                      Industry:
                    </strong>{' '}
                    {item.industry}
                  </div>
                )}

              </article>
            ))}

          </div>
        )}

      </section>

    </section>
  )
}