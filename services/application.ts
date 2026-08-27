// services/application.ts - COMPLETE FIXED
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

// ============ ADDRESS ENDPOINTS ============
export const getRegions = async (): Promise<Region[]> => {
  const response = await api.get("/applications/address/regions");
  return response.data.data;
};

export const getProvincesByRegion = async (
  regionCode: string,
): Promise<Province[]> => {
  const response = await api.get(
    `/applications/address/provinces/${regionCode}`,
  );
  return response.data.data;
};

export const getCitiesByProvince = async (
  provinceCode: string,
): Promise<City[]> => {
  const response = await api.get(
    `/applications/address/cities/${provinceCode}`,
  );
  return response.data.data;
};

export const getBarangaysByCity = async (
  cityCode: string,
): Promise<Barangay[]> => {
  const response = await api.get(`/applications/address/barangays/${cityCode}`);
  return response.data.data;
};

// ============ BUILDINGS ============
export const getActiveBuildings = async (): Promise<Building[]> => {
  const response = await api.get("/buildings/active");
  return response.data.data;
};

// ============ GET ALL APPLICATIONS (PAGINATED) ============
export const getAllApplications = async (
  filters: ApplicationFilters = {},
): Promise<PaginatedResponse> => {
  const { page = 1, limit = 20, status, search, buildingId } = filters;

  const params: any = { page, limit };
  if (status && status !== "all") params.status = status;
  if (search) params.search = search;
  if (buildingId) params.buildingId = buildingId;

  const response = await api.get("/applications", { params });
  return response.data;
};

// ============ GET ALL APPLICATIONS (NO LIMIT - ALL DATA) ============
export const getAllApplicationsUnlimited = async (): Promise<any[]> => {
  const response = await api.get("/applications/all");
  return response.data.data;
};

// ============ SUBMIT APPLICATION ============
export const submitApplication = async (data: ApplicationData) => {
  const formData = new FormData();

  // Append all required fields
  formData.append("firstName", data.firstName);
  formData.append("lastName", data.lastName);
  formData.append("email", data.email);
  formData.append("phoneNumber", data.phoneNumber);
  formData.append("buildingId", data.buildingId);
  formData.append("tower", data.tower || "");
  formData.append("floor", data.floor);
  formData.append("unitNumber", data.unitNumber);
  formData.append("planId", data.planId);
  formData.append("idType", data.idType);
  formData.append("idNumber", data.idNumber);

  // Optional fields
  if (data.notes && data.notes.trim()) {
    formData.append("notes", data.notes);
  }

  if (data.macAddress && data.macAddress.trim()) {
    formData.append("macAddress", data.macAddress);
  }

  if (data.idImage) {
    formData.append("idImage", data.idImage);
  }

  const response = await api.post("/applications", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

// ============ CHECK APPLICATION STATUS ============
export const checkApplicationStatus = async (applicationId: string) => {
  const response = await api.get(`/applications/status/${applicationId}`);
  return response.data;
};

// ============ GET SINGLE APPLICATION ============
export const getApplication = async (id: string) => {
  const response = await api.get(`/applications/${id}`);
  return response.data;
};

// ============ APPROVE / REJECT ============
export const approveApplication = async (id: string, adminNotes?: string) => {
  const response = await api.put(`/applications/${id}/approve`, { adminNotes });
  return response.data;
};

export const rejectApplication = async (id: string, adminNotes?: string) => {
  const response = await api.put(`/applications/${id}/reject`, { adminNotes });
  return response.data;
};

// ============ UPDATE MAC ADDRESS ============
export const updateMacAddress = async (id: string, macAddress: string) => {
  const response = await api.patch(`/applications/${id}/mac-address`, {
    macAddress,
  });
  return response.data;
};

// ============ UPDATE TOWER ============
export const updateTower = async (id: string, tower: string) => {
  const response = await api.patch(`/applications/${id}/tower`, { tower });
  return response.data;
};

// ============ CLEAR CACHE ============
export const clearApplicationCache = async () => {
  const response = await api.post("/applications/cache/clear");
  return response.data;
};
