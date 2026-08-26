// services/application.ts
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
  isActive: boolean;
}

export interface ApplicationData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  buildingId: string;
  tower: string;
  floor: string;
  unitNumber: string;
  notes?: string;
  planId: string;
  idType: string;
  idNumber: string;
  macAddress?: string;
  idImage?: File;
}

export interface Region {
  code: string;
  name: string;
}

export interface Province {
  code: string;
  name: string;
}

export interface City {
  code: string;
  name: string;
}

export interface Barangay {
  name: string;
}

export interface ApplicationFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  buildingId?: string;
}

export interface PaginatedResponse {
  success: boolean;
  data: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

// Fast cache
const appCache = new Map();
const CACHE_TTL = 30 * 1000;

function getCachedApp<T>(key: string): T | null {
  const cached = appCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    appCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedApp<T>(key: string, data: T): void {
  if (appCache.size > 20) {
    const firstKey = appCache.keys().next().value;
    if (firstKey) appCache.delete(firstKey);
  }
  appCache.set(key, { data, timestamp: Date.now() });
}

// ============ ADDRESS ENDPOINTS ============
export const getRegions = async (): Promise<Region[]> => {
  const cacheKey = "regions";
  const cached = getCachedApp<Region[]>(cacheKey);
  if (cached) return cached;

  const response = await api.get("/applications/address/regions");
  const data = response.data.data || [];
  setCachedApp(cacheKey, data);
  return data;
};

export const getProvincesByRegion = async (
  regionCode: string,
): Promise<Province[]> => {
  const cacheKey = `provinces_${regionCode}`;
  const cached = getCachedApp<Province[]>(cacheKey);
  if (cached) return cached;

  const response = await api.get(
    `/applications/address/provinces/${regionCode}`,
  );
  const data = response.data.data || [];
  setCachedApp(cacheKey, data);
  return data;
};

export const getCitiesByProvince = async (
  provinceCode: string,
): Promise<City[]> => {
  const cacheKey = `cities_${provinceCode}`;
  const cached = getCachedApp<City[]>(cacheKey);
  if (cached) return cached;

  const response = await api.get(
    `/applications/address/cities/${provinceCode}`,
  );
  const data = response.data.data || [];
  setCachedApp(cacheKey, data);
  return data;
};

export const getBarangaysByCity = async (
  cityCode: string,
): Promise<Barangay[]> => {
  const cacheKey = `barangays_${cityCode}`;
  const cached = getCachedApp<Barangay[]>(cacheKey);
  if (cached) return cached;

  const response = await api.get(`/applications/address/barangays/${cityCode}`);
  const data = response.data.data || [];
  setCachedApp(cacheKey, data);
  return data;
};

// ============ BUILDINGS ============
export const getActiveBuildings = async (): Promise<Building[]> => {
  const cacheKey = "active_buildings";
  const cached = getCachedApp<Building[]>(cacheKey);
  if (cached) return cached;

  const response = await api.get("/buildings/active");
  const data = response.data.data || [];
  setCachedApp(cacheKey, data);
  return data;
};

// ============ GET ALL APPLICATIONS (PAGINATED) ============
export const getAllApplications = async (
  filters: ApplicationFilters = {},
): Promise<PaginatedResponse> => {
  const { page = 1, limit = 20, status, search, buildingId } = filters;
  const cacheKey = `apps_${page}_${limit}_${status || "all"}_${search || "none"}_${buildingId || "none"}`;

  if (!filters.forceRefresh) {
    const cached = getCachedApp<PaginatedResponse>(cacheKey);
    if (cached) return cached;
  }

  const params: any = { page, limit };
  if (status && status !== "all") params.status = status;
  if (search) params.search = search;
  if (buildingId) params.buildingId = buildingId;

  const response = await api.get("/applications", { params });
  const result = response.data;
  setCachedApp(cacheKey, result);
  return result;
};

// ============ GET ALL APPLICATIONS (NO LIMIT - ALL DATA) ============
export const getAllApplicationsUnlimited = async (): Promise<any[]> => {
  const cacheKey = "apps_all";
  const cached = getCachedApp<any[]>(cacheKey);
  if (cached) return cached;

  const response = await api.get("/applications/all");
  const data = response.data.data || [];
  setCachedApp(cacheKey, data);
  return data;
};

// ============ SUBMIT APPLICATION ============
export const submitApplication = async (data: ApplicationData) => {
  const formData = new FormData();

  formData.append("firstName", data.firstName);
  formData.append("lastName", data.lastName);
  formData.append("email", data.email);
  formData.append("phoneNumber", data.phoneNumber);
  formData.append("buildingId", data.buildingId);
  formData.append("tower", data.tower);
  formData.append("floor", data.floor);
  formData.append("unitNumber", data.unitNumber);
  if (data.notes) {
    formData.append("notes", data.notes);
  }
  formData.append("planId", data.planId);
  formData.append("idType", data.idType);
  formData.append("idNumber", data.idNumber);

  if (data.macAddress && data.macAddress.trim()) {
    formData.append("macAddress", data.macAddress);
  }

  if (data.idImage) {
    formData.append("idImage", data.idImage);
  }

  const response = await api.post("/applications", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  // Clear cache on new submission
  appCache.clear();
  return response.data;
};

// ============ CHECK APPLICATION STATUS ============
export const checkApplicationStatus = async (applicationId: string) => {
  const response = await api.get(`/applications/status/${applicationId}`);
  return response.data;
};

// ============ GET SINGLE APPLICATION ============
export const getApplication = async (id: string) => {
  const cacheKey = `app_${id}`;
  const cached = getCachedApp(cacheKey);
  if (cached) return cached;

  const response = await api.get(`/applications/${id}`);
  const data = response.data;
  setCachedApp(cacheKey, data);
  return data;
};

// ============ APPROVE / REJECT ============
export const approveApplication = async (id: string, adminNotes?: string) => {
  const response = await api.put(`/applications/${id}/approve`, { adminNotes });
  appCache.clear();
  return response.data;
};

export const rejectApplication = async (id: string, adminNotes?: string) => {
  const response = await api.put(`/applications/${id}/reject`, { adminNotes });
  appCache.clear();
  return response.data;
};

// ============ START BILLING ============
export const startBillingForApplication = async (
  applicationId: string,
  data: { installationDate?: string; notes?: string },
) => {
  const response = await api.post(
    `/applications/${applicationId}/start-billing`,
    data,
  );
  appCache.clear();
  return response.data;
};

// ============ UPDATE MAC ADDRESS ============
export const updateMacAddress = async (id: string, macAddress: string) => {
  const response = await api.patch(`/applications/${id}/mac-address`, {
    macAddress,
  });
  appCache.clear();
  return response.data;
};

// ============ UPDATE TOWER ============
export const updateTower = async (id: string, tower: string) => {
  const response = await api.patch(`/applications/${id}/tower`, { tower });
  appCache.clear();
  return response.data;
};

// ============ CLEAR CACHE ============
export const clearApplicationCache = () => {
  appCache.clear();
};
