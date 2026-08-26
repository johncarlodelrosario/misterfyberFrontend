// services/building.ts
import api from "./api";

export interface Building {
  _id: string;
  buildingName: string;
  region: string;
  province: string;
  city: string;
  barangay: string;
  streetAddress: string;
  zipCode: string;
  location: "breeze" | "sil" | "other" | "";
  installationFee: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BuildingInstallationFee {
  buildingId: string;
  buildingName: string;
  installationFee: number;
  location: string;
}

// Cache for buildings
const buildingCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

function getCachedBuildings(key: string): any | null {
  const cached = buildingCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    buildingCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedBuildings(key: string, data: any): void {
  buildingCache.set(key, { data, timestamp: Date.now() });
}

export const getActiveBuildings = async (
  forceRefresh = false,
): Promise<Building[]> => {
  const cacheKey = "active_buildings";

  if (!forceRefresh) {
    const cached = getCachedBuildings(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/buildings/active");
    const data = response.data.data || [];
    setCachedBuildings(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching active buildings:", error);
    return [];
  }
};

export const getAllBuildings = async (params?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
  forceRefresh?: boolean;
}) => {
  const cacheKey = `buildings_${params?.page || 1}_${params?.limit || 20}_${params?.isActive}`;

  if (!params?.forceRefresh) {
    const cached = getCachedBuildings(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await api.get("/buildings", { params });
    const data = response.data;
    setCachedBuildings(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching buildings:", error);
    return { success: true, data: [], totalPages: 0, currentPage: 1, total: 0 };
  }
};

export const createBuilding = async (data: Partial<Building>) => {
  const response = await api.post("/buildings", data);
  buildingCache.clear(); // Clear all building cache
  return response.data;
};

export const updateBuilding = async (id: string, data: Partial<Building>) => {
  const response = await api.put(`/buildings/${id}`, data);
  buildingCache.clear();
  return response.data;
};

export const deleteBuilding = async (id: string) => {
  const response = await api.delete(`/buildings/${id}`);
  buildingCache.clear();
  return response.data;
};

export const getBuildingInstallationFee = async (
  buildingId: string,
): Promise<BuildingInstallationFee> => {
  const cacheKey = `building_fee_${buildingId}`;
  const cached = getCachedBuildings(cacheKey);
  if (cached) return cached;

  try {
    const response = await api.get(`/buildings/${buildingId}/installation-fee`);
    const data = response.data.data;
    setCachedBuildings(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching building installation fee:", error);
    throw error;
  }
};

export const updateBuildingInstallationFee = async (
  buildingId: string,
  installationFee: number,
): Promise<BuildingInstallationFee> => {
  const response = await api.put(`/buildings/${buildingId}/installation-fee`, {
    installationFee,
  });
  buildingCache.clear();
  return response.data.data;
};

export const clearBuildingCache = () => {
  buildingCache.clear();
};
