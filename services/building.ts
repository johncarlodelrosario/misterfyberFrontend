// frontend/services/building.ts - COMPLETE WITH INSTALLATION FEE

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

export const getActiveBuildings = async (): Promise<Building[]> => {
  const response = await api.get("/buildings/active");
  return response.data.data;
};

export const getAllBuildings = async (params?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
}) => {
  const response = await api.get("/buildings", { params });
  return response.data;
};

export const createBuilding = async (data: Partial<Building>) => {
  const response = await api.post("/buildings", data);
  return response.data;
};

export const updateBuilding = async (id: string, data: Partial<Building>) => {
  const response = await api.put(`/buildings/${id}`, data);
  return response.data;
};

export const deleteBuilding = async (id: string) => {
  const response = await api.delete(`/buildings/${id}`);
  return response.data;
};

export const getBuildingInstallationFee = async (
  buildingId: string,
): Promise<BuildingInstallationFee> => {
  const response = await api.get(`/buildings/${buildingId}/installation-fee`);
  return response.data.data;
};

export const updateBuildingInstallationFee = async (
  buildingId: string,
  installationFee: number,
): Promise<BuildingInstallationFee> => {
  const response = await api.put(`/buildings/${buildingId}/installation-fee`, {
    installationFee,
  });
  return response.data.data;
};
