import { apiFetch } from './api'

/**
 * Module 8: Commercialization Recommendation API Service
 * Member 1: Research Commercialization Analysis
 * Member 2: Productization + Startup Recommendations
 */

export async function getFullCommercializationAnalysis(technology) {
  const encodedTech = encodeURIComponent(technology.trim())
  return apiFetch(`/commercialization/analyze/${encodedTech}`)
}

export async function getCommercialApplications(technology) {
  const encodedTech = encodeURIComponent(technology.trim())
  return apiFetch(`/commercialization/applications/${encodedTech}`)
}

export async function getProductizationRecommendations(technology) {
  const encodedTech = encodeURIComponent(technology.trim())
  return apiFetch(`/commercialization/products/${encodedTech}`)
}

export async function getStartupRecommendations(technology) {
  const encodedTech = encodeURIComponent(technology.trim())
  return apiFetch(`/commercialization/startups/${encodedTech}`)
}
