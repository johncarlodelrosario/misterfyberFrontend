import api from './api'

export interface Plan {
  _id: string
  name: string
  description: string
  price: number
  speed: {
    download: number
    upload: number
  }
  features: string[]
  duration: number
  mikrotikProfile: string
  isActive: boolean
}

export const getPlans = async (): Promise<Plan[]> => {
  const response = await api.get('/plans')
  // Handle both response formats: { data: [...] } or { success: true, data: [...] }
  if (response.data.data && Array.isArray(response.data.data)) {
    return response.data.data
  }
  if (Array.isArray(response.data)) {
    return response.data
  }
  return []
}

export const getPlan = async (id: string): Promise<Plan> => {
  const response = await api.get(`/plans/${id}`)
  return response.data.data || response.data
}

export const createPlan = async (data: Partial<Plan>) => {
  const response = await api.post('/plans', data)
  return response.data.data || response.data
}

export const updatePlan = async (id: string, data: Partial<Plan>) => {
  const response = await api.put(`/plans/${id}`, data)
  return response.data.data || response.data
}

export const deletePlan = async (id: string) => {
  const response = await api.delete(`/plans/${id}`)
  return response.data
}