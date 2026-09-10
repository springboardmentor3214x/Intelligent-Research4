import { apiFetch } from './api'

export async function getPersonalizedFundingRecommendations({
  token,
  limit = 20,
  minScore = 0.0,
  topic = '',
  researchArea = '',
  fundingType = '',
  agency = '',
  focusTerms = [],
} = {}) {
  const queryParams = new URLSearchParams()
  if (limit) queryParams.set('limit', limit)
  if (minScore) queryParams.set('min_score', minScore)
  if (topic) queryParams.set('topic', topic)
  if (researchArea) queryParams.set('research_area', researchArea)
  if (fundingType) queryParams.set('funding_type', fundingType)
  if (agency) queryParams.set('agency', agency)
  if (focusTerms && focusTerms.length > 0) {
    focusTerms.forEach(t => queryParams.append('focus_terms', t))
  }

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

export async function syncFundingSources({ token, sources = null } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  return apiFetch('/funding/sync', {
    method: 'POST',
    headers,
    body: JSON.stringify({ sources }),
  })
}

export async function saveFundingOpportunity(token, fundingOpportunityId) {
  return apiFetch('/funding/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ funding_opportunity_id: fundingOpportunityId }),
  })
}

export async function getSavedFunding(token) {
  return apiFetch('/funding/saved', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function removeSavedFunding(token, fundingOpportunityId) {
  return apiFetch(`/funding/save/${fundingOpportunityId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

