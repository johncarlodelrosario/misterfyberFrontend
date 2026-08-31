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

export interface Plan {
  _id: string;
  name: string;
  price: number;
  speed?: {
    download: number;
    upload: number;
  };
  isActive?: boolean;
}

export interface ApplicationData {
  firstName: string;
  lastName: string;
  middleName?: string;
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
  idImage?: File | string;
  birthDate?: string;
  gender?: string;
  status?: string;
  serviceStatus?: string;
  installationFee?: number;
  installationFeePaid?: boolean;
  adminNotes?: string;
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

// ============ PLANS ============
export const getPlans = async (): Promise<Plan[]> => {
  const response = await api.get("/plans");
  return response.data.data;
};

// ============ GET ALL APPLICATIONS (PAGINATED) ============
export const getAllApplications = async (
  filters: ApplicationFilters = {},
): Promise<PaginatedResponse> => {
  const { page = 1, limit = 20, status, search, buildingId } = filters;

  const params: any = { page, limit };

  if (status && status !== "all" && status !== "") {
    params.status = status;
  }

  if (search && search.trim() !== "") {
    params.search = search.trim();
  }

  if (buildingId && buildingId !== "" && buildingId !== "all") {
    params.buildingId = buildingId;
  }

  console.log("getAllApplications params:", params);

  const response = await api.get("/applications", { params });
  return response.data;
};

// ============ GET ALL APPLICATIONS (NO LIMIT - ALL DATA) ============
export const getAllApplicationsUnlimited = async (): Promise<any[]> => {
  const response = await api.get("/applications/all");
  return response.data.data;
};

// ============ SUBMIT APPLICATION - FIXED ============
export const submitApplication = async (data: ApplicationData) => {
  try {
    const formData = new FormData();

    // Required fields
    formData.append("firstName", data.firstName.trim());
    formData.append("lastName", data.lastName.trim());
    formData.append("email", data.email.trim().toLowerCase());
    formData.append("phoneNumber", data.phoneNumber.trim());
    formData.append("buildingId", data.buildingId);
    formData.append("floor", data.floor.trim());
    formData.append("unitNumber", data.unitNumber.trim());
    formData.append("planId", data.planId);
    formData.append("idType", data.idType);
    formData.append("idNumber", data.idNumber.trim());

    // Optional fields - only append if they have values
    if (data.middleName && data.middleName.trim()) {
      formData.append("middleName", data.middleName.trim());
    }

    if (data.tower && data.tower.trim()) {
      formData.append("tower", data.tower.trim());
    }

    if (data.notes && data.notes.trim()) {
      formData.append("notes", data.notes.trim());
    }

    if (data.macAddress && data.macAddress.trim()) {
      formData.append("macAddress", data.macAddress.trim());
    }

    if (data.birthDate) {
      formData.append("birthDate", data.birthDate);
    }

    if (data.gender && data.gender.trim()) {
      const validGenders = ["male", "female", "other"];
      const normalizedGender = data.gender.toLowerCase().trim();
      if (validGenders.includes(normalizedGender)) {
        formData.append("gender", normalizedGender);
      }
    }

    // ID Image
    if (data.idImage && data.idImage instanceof File) {
      formData.append("idImage", data.idImage);
    }

    // Log what we're sending (for debugging)
    console.log("📤 Submitting application with:");
    console.log("  - Email:", data.email);
    console.log("  - Phone:", data.phoneNumber);
    console.log("  - Building:", data.buildingId);
    console.log("  - Unit:", data.floor, data.unitNumber);

    const response = await api.post("/applications", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error: any) {
    // ✅ Better error handling
    console.error("❌ Submit application error:", error);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      const data = error.response.data;

      console.error("  - Status:", status);
      console.error("  - Data:", data);

      if (status === 409) {
        // Conflict - already exists
        throw {
          status: 409,
          message: data.message || "Application conflict detected",
          data: data,
        };
      }

      if (status === 400) {
        // Validation error
        throw {
          status: 400,
          message: data.message || "Validation failed",
          errors: data.errors || [],
        };
      }

      throw {
        status: status,
        message: data.message || "Server error",
        data: data,
      };
    }

    if (error.request) {
      // The request was made but no response was received
      throw {
        status: 0,
        message: "Network error - no response from server",
      };
    }

    // Something happened in setting up the request that triggered an Error
    throw {
      status: 0,
      message: error.message || "Unknown error",
    };
  }
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

// ============ DELETE APPLICATION ============
export const deleteApplication = async (id: string) => {
  const response = await api.delete(`/applications/${id}`);
  return response.data;
};

// ============ BULK DELETE APPLICATIONS ============
export const bulkDeleteApplications = async (applicationIds: string[]) => {
  const response = await api.post("/applications/bulk-delete", {
    applicationIds,
  });
  return response.data;
};

// ============ UPDATE APPLICATION - PUT (FULL UPDATE) ============
export const updateApplication = async (
  id: string,
  data: Partial<ApplicationData>,
) => {
  const formData = new FormData();

  if (data.firstName) formData.append("firstName", data.firstName);
  if (data.lastName) formData.append("lastName", data.lastName);
  if (data.middleName !== undefined)
    formData.append("middleName", data.middleName || "");
  if (data.email) formData.append("email", data.email);
  if (data.phoneNumber) formData.append("phoneNumber", data.phoneNumber);
  if (data.buildingId) formData.append("buildingId", data.buildingId);
  if (data.tower !== undefined) formData.append("tower", data.tower || "");
  if (data.floor) formData.append("floor", data.floor);
  if (data.unitNumber) formData.append("unitNumber", data.unitNumber);
  if (data.planId) formData.append("planId", data.planId);
  if (data.idType) formData.append("idType", data.idType);
  if (data.idNumber) formData.append("idNumber", data.idNumber);
  if (data.notes !== undefined) formData.append("notes", data.notes || "");
  if (data.macAddress !== undefined)
    formData.append("macAddress", data.macAddress || "");
  if (data.birthDate) formData.append("birthDate", data.birthDate);
  if (data.gender) formData.append("gender", data.gender);
  if (data.adminNotes !== undefined)
    formData.append("adminNotes", data.adminNotes || "");
  if (data.status) formData.append("status", data.status);
  if (data.serviceStatus) formData.append("serviceStatus", data.serviceStatus);
  if (data.installationFee !== undefined)
    formData.append("installationFee", String(data.installationFee));
  if (data.installationFeePaid !== undefined)
    formData.append("installationFeePaid", String(data.installationFeePaid));

  if (data.idImage instanceof File) {
    formData.append("idImage", data.idImage);
  }

  const response = await api.put(`/applications/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

// ============ PATCH UPDATE APPLICATION - PARTIAL UPDATE ============
export const patchApplication = async (
  id: string,
  data: Partial<ApplicationData>,
) => {
  const cleanData: Record<string, any> = {};

  const fields = [
    "firstName",
    "lastName",
    "middleName",
    "email",
    "phoneNumber",
    "buildingId",
    "tower",
    "floor",
    "unitNumber",
    "planId",
    "idType",
    "idNumber",
    "macAddress",
    "notes",
    "adminNotes",
    "birthDate",
    "status",
    "serviceStatus",
    "installationFee",
    "installationFeePaid",
  ];

  fields.forEach((field) => {
    const value = data[field as keyof ApplicationData];
    if (value !== undefined && value !== null && value !== "") {
      cleanData[field] = value;
    }
  });

  if (data.gender !== undefined && data.gender !== null && data.gender !== "") {
    const validGenders = ["male", "female", "other"];
    const normalizedGender = data.gender.toLowerCase().trim();
    if (validGenders.includes(normalizedGender)) {
      cleanData.gender = normalizedGender;
    }
  }

  if (data.installationFee !== undefined) {
    cleanData.installationFee = Number(data.installationFee);
  }

  if (data.installationFeePaid !== undefined) {
    cleanData.installationFeePaid = data.installationFeePaid;
  }

  console.log("📤 PATCH data being sent:", JSON.stringify(cleanData, null, 2));

  const response = await api.patch(`/applications/${id}`, cleanData);
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

// ============ UPDATE STATUS ============
export const updateStatus = async (id: string, status: string) => {
  const response = await api.patch(`/applications/${id}/status`, { status });
  return response.data;
};

// ============ CLEAR CACHE ============
export const clearApplicationCache = async () => {
  const response = await api.post("/applications/cache/clear");
  return response.data;
};
