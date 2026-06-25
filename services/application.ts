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

export const getActiveBuildings = async (): Promise<Building[]> => {
  const response = await api.get("/buildings/active");
  return response.data.data;
};

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
  return response.data;
};

export const checkApplicationStatus = async (applicationId: string) => {
  const response = await api.get(`/applications/status/${applicationId}`);
  return response.data;
};
