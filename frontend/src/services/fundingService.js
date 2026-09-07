import { apiFetch } from './api'

export async function getPersonalizedFundingRecommendations({
  token,
  limit = 10,
  minScore = 0.0,
  researchArea = '',
  fundingType = '',
  agency = '',
} = {}) {
  const queryParams = new URLSearchParams()
  if (limit) queryParams.set('limit', limit)
  if (minScore) queryParams.set('min_score', minScore)
  if (researchArea) queryParams.set('research_area', researchArea)
  if (fundingType) queryParams.set('funding_type', fundingType)
  if (agency) queryParams.set('agency', agency)

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ''

  return apiFetch(`/funding/recommendations/me${queryString}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function matchSingleFundingOpportunity(token, fundingOpportunityId) {
  return apiFetch('/funding/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ funding_opportunity_id: fundingOpportunityId }),
  })
}

export async function getAllFundingOpportunities({ skip = 0, limit = 20 } = {}) {
  return apiFetch(`/funding?skip=${skip}&limit=${limit}`)
}

export async function getFundingOpportunityDetails(opportunityId) {
  return apiFetch(`/funding/${opportunityId}`)
}

export async function importFundingOpportunities(token, search, perPage = 10) {
  return apiFetch('/funding/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ search, per_page: perPage }),
  })
}
