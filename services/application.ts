// services/application.ts - COMPLETE WITH checkApplicationStatus
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
  forceRefresh?: boolean;
  fields?: string;
}

export interface PaginatedResponse {
  success: boolean;
  data: any[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  fromCache?: boolean;
}

// ==================== SUPER FAST CACHE ====================
const appCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds
const MAX_CACHE_ITEMS = 30;

// Cache for addresses (longer TTL since they don't change often)
const addressCache = new Map();
const ADDRESS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for buildings (longer TTL)
const buildingCache = new Map();
const BUILDING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache stats for debugging
let cacheHits = 0;
let cacheMisses = 0;

function getCacheKey(key: string): string {
  return key;
}

function getCachedApp<T>(key: string): T | null {
  const cacheKey = getCacheKey(key);
  const cached = appCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    appCache.delete(cacheKey);
    return null;
  }
  cacheHits++;
  return cached.data;
}

function setCachedApp<T>(key: string, data: T): void {
  const cacheKey = getCacheKey(key);
  if (appCache.size >= MAX_CACHE_ITEMS) {
    const firstKey = appCache.keys().next().value;
    if (firstKey) appCache.delete(firstKey);
  }
  appCache.set(cacheKey, { data, timestamp: Date.now() });
}

function getCachedAddress<T>(key: string): T | null {
  const cached = addressCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > ADDRESS_CACHE_TTL) {
    addressCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedAddress<T>(key: string, data: T): void {
  addressCache.set(key, { data, timestamp: Date.now() });
}

function getCachedBuildings<T>(key: string): T | null {
  const cached = buildingCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > BUILDING_CACHE_TTL) {
    buildingCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedBuildings<T>(key: string, data: T): void {
  buildingCache.set(key, { data, timestamp: Date.now() });
}

export function getCacheStats() {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    ratio: cacheHits / (cacheHits + cacheMisses) || 0,
    size: appCache.size,
    addressSize: addressCache.size,
    buildingSize: buildingCache.size,
  };
}

// ============ ADDRESS ENDPOINTS WITH CACHE ============
export const getRegions = async (forceRefresh = false): Promise<Region[]> => {
  const cacheKey = "regions";

  if (!forceRefresh) {
    const cached = getCachedAddress<Region[]>(cacheKey);
    if (cached) return cached;
  }
  cacheMisses++;

  try {
    const response = await api.get("/applications/address/regions");
    const data = response.data.data || [];
    setCachedAddress(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching regions:", error);
    return [];
  }
};

export const getProvincesByRegion = async (
  regionCode: string,
  forceRefresh = false,
): Promise<Province[]> => {
  const cacheKey = `provinces_${regionCode}`;

  if (!forceRefresh) {
    const cached = getCachedAddress<Province[]>(cacheKey);
    if (cached) return cached;
  }
  cacheMisses++;

  try {
    const response = await api.get(
      `/applications/address/provinces/${regionCode}`,
    );
    const data = response.data.data || [];
    setCachedAddress(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching provinces:", error);
    return [];
  }
};

export const getCitiesByProvince = async (
  provinceCode: string,
  forceRefresh = false,
): Promise<City[]> => {
  const cacheKey = `cities_${provinceCode}`;

  if (!forceRefresh) {
    const cached = getCachedAddress<City[]>(cacheKey);
    if (cached) return cached;
  }
  cacheMisses++;

  try {
    const response = await api.get(
      `/applications/address/cities/${provinceCode}`,
    );
    const data = response.data.data || [];
    setCachedAddress(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching cities:", error);
    return [];
  }
};

export const getBarangaysByCity = async (
  cityCode: string,
  forceRefresh = false,
): Promise<Barangay[]> => {
  const cacheKey = `barangays_${cityCode}`;

  if (!forceRefresh) {
    const cached = getCachedAddress<Barangay[]>(cacheKey);
    if (cached) return cached;
  }
  cacheMisses++;

  try {
    const response = await api.get(
      `/applications/address/barangays/${cityCode}`,
    );
    const data = response.data.data || [];
    setCachedAddress(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching barangays:", error);
    return [];
  }
};

// ============ BUILDINGS WITH CACHE ============
export const getActiveBuildings = async (
  forceRefresh = false,
): Promise<Building[]> => {
  const cacheKey = "active_buildings";

  if (!forceRefresh) {
    const cached = getCachedBuildings<Building[]>(cacheKey);
    if (cached) return cached;
  }
  cacheMisses++;

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

// ============ GET ALL APPLICATIONS (ULTRA OPTIMIZED) ============
export const getAllApplications = async (
  filters: ApplicationFilters = {},
): Promise<PaginatedResponse> => {
  const {
    page = 1,
    limit = 20,
    status,
    search,
    buildingId,
    forceRefresh = false,
    fields = "firstName,lastName,email,phoneNumber,status,createdAt,idNumber,buildingId,planId,tower,floor,unitNumber",
  } = filters;

  const cacheKey = `apps_${page}_${limit}_${status || "all"}_${search || "none"}_${buildingId || "none"}`;

  // Try cache first (only if not forceRefresh)
  if (!forceRefresh) {
    const cached = getCachedApp<PaginatedResponse>(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }
  }
  cacheMisses++;

  // Build params with minimal fields
  const params: any = {
    page,
    limit,
    fields, // Only request needed fields
  };
  if (status && status !== "all") params.status = status;
  if (search) params.search = search;
  if (buildingId) params.buildingId = buildingId;

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await api.get("/applications", {
      params,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = response.data;
    const data = result.data || [];
    const total = result.total || 0;
    const totalPages = result.totalPages || 1;
    const currentPage = result.currentPage || page;
    const limitActual = result.limit || limit;

    const returnData: PaginatedResponse = {
      success: true,
      data,
      total,
      totalPages,
      currentPage,
      limit: limitActual,
      fromCache: false,
    };

    // Cache the result
    setCachedApp(cacheKey, returnData);
    return returnData;
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.warn("Request timeout for applications");
      return {
        success: false,
        data: [],
        total: 0,
        totalPages: 0,
        currentPage: page,
        limit,
      };
    }
    console.error("Error fetching applications:", error);
    return {
      success: false,
      data: [],
      total: 0,
      totalPages: 0,
      currentPage: page,
      limit,
    };
  }
};

// ============ GET ALL APPLICATIONS (NO LIMIT - WITH CACHE) ============
export const getAllApplicationsUnlimited = async (
  forceRefresh = false,
): Promise<any[]> => {
  const cacheKey = "apps_all";

  if (!forceRefresh) {
    const cached = getCachedApp<any[]>(cacheKey);
    if (cached) return cached;
  }
  cacheMisses++;

  try {
    const response = await api.get("/applications/all");
    const data = response.data.data || [];
    setCachedApp(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching all applications:", error);
    return [];
  }
};

// ============ SUBMIT APPLICATION WITH CACHE CLEAR ============
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

  try {
    const response = await api.post("/applications", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 15000, // 15 second timeout for file upload
    });
    // Clear cache on new submission
    clearAllCache();
    return response.data;
  } catch (error) {
    console.error("Error submitting application:", error);
    throw error;
  }
};

// ============ CHECK APPLICATION STATUS ============
export const checkApplicationStatus = async (applicationId: string) => {
  try {
    const response = await api.get(`/applications/status/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error("Error checking application status:", error);
    throw error;
  }
};

// ============ GET SINGLE APPLICATION WITH CACHE ============
export const getApplication = async (id: string, forceRefresh = false) => {
  const cacheKey = `app_${id}`;

  if (!forceRefresh) {
    const cached = getCachedApp(cacheKey);
    if (cached) return cached;
  }
  cacheMisses++;

  try {
    const response = await api.get(`/applications/${id}`);
    const data = response.data;
    setCachedApp(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching application ${id}:`, error);
    throw error;
  }
};

// ============ APPROVE WITH CACHE CLEAR ============
export const approveApplication = async (id: string, adminNotes?: string) => {
  try {
    const response = await api.put(`/applications/${id}/approve`, {
      adminNotes,
    });
    clearAllCache();
    return response.data;
  } catch (error) {
    console.error(`Error approving application ${id}:`, error);
    throw error;
  }
};

// ============ REJECT WITH CACHE CLEAR ============
export const rejectApplication = async (id: string, adminNotes?: string) => {
  try {
    const response = await api.put(`/applications/${id}/reject`, {
      adminNotes,
    });
    clearAllCache();
    return response.data;
  } catch (error) {
    console.error(`Error rejecting application ${id}:`, error);
    throw error;
  }
};

// ============ START BILLING WITH CACHE CLEAR ============
export const startBillingForApplication = async (
  applicationId: string,
  data: {
    installationDate?: string;
    notes?: string;
    includeInstallationFee?: boolean;
  } = {},
) => {
  try {
    const response = await api.post(
      `/applications/${applicationId}/start-billing`,
      data,
    );
    clearAllCache();
    return response.data;
  } catch (error) {
    console.error(`Error starting billing for ${applicationId}:`, error);
    throw error;
  }
};

// ============ UPDATE MAC ADDRESS ============
export const updateMacAddress = async (id: string, macAddress: string) => {
  try {
    const response = await api.patch(`/applications/${id}/mac-address`, {
      macAddress,
    });
    clearAllCache();
    return response.data;
  } catch (error) {
    console.error(`Error updating MAC address for ${id}:`, error);
    throw error;
  }
};

// ============ UPDATE TOWER ============
export const updateTower = async (id: string, tower: string) => {
  try {
    const response = await api.patch(`/applications/${id}/tower`, { tower });
    clearAllCache();
    return response.data;
  } catch (error) {
    console.error(`Error updating tower for ${id}:`, error);
    throw error;
  }
};

// ============ CLEAR ALL CACHES ============
export const clearAllCache = () => {
  appCache.clear();
  addressCache.clear();
  buildingCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
  console.log("🗑️ All caches cleared");
};

// ============ CLEAR APPLICATION CACHE ============
export const clearApplicationCache = () => {
  appCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
  console.log("🗑️ Application cache cleared");
};

// ============ PRE-FETCH FOR FASTER LOADING ============
export const prefetchApplications = async (
  filters: ApplicationFilters = {},
) => {
  const { page = 1, limit = 20, status, search, buildingId } = filters;
  const cacheKey = `apps_${page}_${limit}_${status || "all"}_${search || "none"}_${buildingId || "none"}`;

  // Check if already cached
  const cached = getCachedApp(cacheKey);
  if (cached) return cached;

  // Pre-fetch in background
  return getAllApplications({ ...filters, forceRefresh: true });
};

// ============ BATCH FETCH FOR MULTIPLE PAGES ============
export const prefetchMultiplePages = async (
  pages: number[],
  filters: ApplicationFilters = {},
) => {
  const promises = pages.map((page) =>
    prefetchApplications({ ...filters, page }),
  );
  await Promise.all(promises);
};

// ============ DEBOUNCED SEARCH ============
let searchTimeout: NodeJS.Timeout | null = null;

export const debouncedSearch = (
  query: string,
  callback: (results: any[]) => void,
  delay: number = 300,
) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(async () => {
    try {
      const response = await getAllApplications({
        search: query,
        limit: 10,
        page: 1,
      });
      callback(response.data || []);
    } catch (error) {
      console.error("Search error:", error);
      callback([]);
    }
  }, delay);
};

// ============ EXPORT DEFAULT ============
export default {
  // Address
  getRegions,
  getProvincesByRegion,
  getCitiesByProvince,
  getBarangaysByCity,

  // Buildings
  getActiveBuildings,

  // Applications
  getAllApplications,
  getAllApplicationsUnlimited,
  getApplication,
  checkApplicationStatus,
  submitApplication,
  approveApplication,
  rejectApplication,
  startBillingForApplication,
  updateMacAddress,
  updateTower,

  // Cache
  clearAllCache,
  clearApplicationCache,
  getCacheStats,
  prefetchApplications,
  prefetchMultiplePages,
  debouncedSearch,
};
