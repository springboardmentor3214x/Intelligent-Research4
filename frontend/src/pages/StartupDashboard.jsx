import { useContext, useEffect, useState } from 'react'

import { AuthContext } from '../context/auth-context'

import {
  getPersonalizedFundingRecommendations,
} from '../services/fundingService'

import patentService from '../services/patentService'


function StatCard({ title, value, description }) {
  return (
    <div className="startup-stat-card">
      <p className="startup-stat-title">
        {title}
      </p>

      <h3>
        {value}
      </h3>

      <p className="startup-stat-description">
        {description}
      </p>
    </div>
  )
}


function SectionHeader({ title, description }) {
  return (
    <div className="startup-section-header">
      <h2>
        {title}
      </h2>

      <p>
        {description}
      </p>
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


        /*
         * The funding service calls:
         *
         * GET /funding/recommendations/me
         *
         * Handle the possible response containers
         * without changing the existing service.
         */

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


        /*
         * Existing patentService calls:
         *
         * GET /patents
         */

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
      //
      // No Technology API was shown in the backend
      // files you provided.
      //
      // Therefore we do NOT invent an endpoint here.
      //
      // This section is ready for the actual Module 6
      // API when your teammate provides it.
      //
      setTechnology([])


      // ============================================
      // MODULE 8 - COMMERCIALIZATION INSIGHTS
      // ============================================
      //
      // No Commercialization API was shown in the
      // backend files you provided.
      //
      // Therefore we do NOT invent an endpoint here.
      //
      // This section is ready for the actual Module 8
      // API when your teammate provides it.
      //
      setCommercialization([])


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
              : 'Module 6 integration pending'
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
              : 'Module 8 integration pending'
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


        {technology.length === 0 ? (

          <div className="startup-empty">

            Technology opportunity data will appear
            here after the Module 6 API is connected.

          </div>

        ) : (

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
                  {item.name ||
                    item.title ||
                    item.technology ||
                    'Technology Opportunity'}
                </h3>


                <p>
                  {item.description ||
                    item.summary ||
                    'Technology opportunity identified by the platform.'}
                </p>


                {item.growth && (

                  <div className="startup-card-meta">

                    <strong>
                      Growth:
                    </strong>{' '}

                    {item.growth}

                  </div>

                )}


                {item.adoption && (

                  <div className="startup-card-meta">

                    <strong>
                      Adoption:
                    </strong>{' '}

                    {item.adoption}

                  </div>

                )}

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

                  <th>
                    Patent
                  </th>

                  <th>
                    Assignee
                  </th>

                  <th>
                    Technology
                  </th>

                  <th>
                    Status
                  </th>

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


        {commercialization.length === 0 ? (

          <div className="startup-empty">

            Commercialization insight data will
            appear here after the Module 8 API
            is connected.

          </div>

        ) : (

          <div className="startup-card-grid">

            {commercialization.map((item, index) => (

              <article
                className="startup-info-card"
                key={item.id || index}
              >

                <span className="startup-card-label">
                  Opportunity
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


                {item.type && (

                  <div className="startup-card-meta">

                    <strong>
                      Type:
                    </strong>{' '}

                    {item.type}

                  </div>

                )}


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