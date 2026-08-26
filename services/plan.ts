// services/plan.ts
import api from "./api";

export interface Plan {
  _id: string;
  name: string;
  description: string;
  price: number;
  speed: {
    download: number;
    upload: number;
  };
  features: string[];
  duration: number;
  mikrotikProfile: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Cache for plans
const planCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

function getCachedPlans(key: string): any | null {
  const cached = planCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    planCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedPlans(key: string, data: any): void {
  planCache.set(key, { data, timestamp: Date.now() });
}

export const getPlans = async (forceRefresh = false): Promise<Plan[]> => {
  const cacheKey = "all_plans";

  if (!forceRefresh) {
    const cached = getCachedPlans(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/plans");
    let data = [];
    if (response.data.data && Array.isArray(response.data.data)) {
      data = response.data.data;
    } else if (Array.isArray(response.data)) {
      data = response.data;
    }
    setCachedPlans(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching plans:", error);
    return [];
  }
};

export const getPlan = async (id: string): Promise<Plan | null> => {
  const cacheKey = `plan_${id}`;
  const cached = getCachedPlans(cacheKey);
  if (cached) return cached;

  try {
    const response = await api.get(`/plans/${id}`);
    const data = response.data.data || response.data;
    setCachedPlans(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching plan ${id}:`, error);
    return null;
  }
};

export const createPlan = async (data: Partial<Plan>) => {
  const response = await api.post("/plans", data);
  planCache.clear();
  return response.data.data || response.data;
};

export const updatePlan = async (id: string, data: Partial<Plan>) => {
  const response = await api.put(`/plans/${id}`, data);
  planCache.clear();
  return response.data.data || response.data;
};

export const deletePlan = async (id: string) => {
  const response = await api.delete(`/plans/${id}`);
  planCache.clear();
  return response.data;
};

export const clearPlanCache = () => {
  planCache.clear();
};
