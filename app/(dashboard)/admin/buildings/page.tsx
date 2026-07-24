// frontend/app/admin/buildings/page.tsx - COMPLETE FIXED WITH TYPE SAFETY

"use client";

import { useState, useEffect } from "react";
import {
  getAllBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  Building,
  updateBuildingInstallationFee,
} from "@/services/building";
import {
  getRegions,
  getProvincesByRegion,
  getCitiesByProvince,
  getBarangaysByCity,
  Region,
  Province,
  City,
  Barangay,
} from "@/services/application";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiAlertCircle,
  FiHome,
} from "react-icons/fi";

type LocationType = "" | "breeze" | "sil" | "other";

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [isInstallationFeeModalOpen, setIsInstallationFeeModalOpen] =
    useState(false);
  const [selectedBuildingForFee, setSelectedBuildingForFee] =
    useState<Building | null>(null);
  const [tempInstallationFee, setTempInstallationFee] = useState<number>(0);

  const [formData, setFormData] = useState({
    buildingName: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    streetAddress: "",
    zipCode: "",
    location: "" as LocationType,
    installationFee: 1500,
    isActive: true,
  });

  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [isNCR, setIsNCR] = useState(false);

  const ncrCitiesFallback: City[] = [
    { code: "1374010000", name: "Manila" },
    { code: "1374020000", name: "Quezon City" },
    { code: "1374030000", name: "Caloocan" },
    { code: "1374040000", name: "Las Piñas" },
    { code: "1374050000", name: "Makati" },
    { code: "1374060000", name: "Malabon" },
    { code: "1374070000", name: "Mandaluyong" },
    { code: "1374080000", name: "Marikina" },
    { code: "1374090000", name: "Muntinlupa" },
    { code: "1374100000", name: "Navotas" },
    { code: "1374110000", name: "Parañaque" },
    { code: "1374120000", name: "Pasay" },
    { code: "1374130000", name: "Pasig" },
    { code: "1374140000", name: "Pateros" },
    { code: "1374150000", name: "San Juan" },
    { code: "1374160000", name: "Taguig" },
    { code: "1374170000", name: "Valenzuela" },
  ];

  useEffect(() => {
    loadBuildings();
    loadRegions();
  }, []);

  useEffect(() => {
    const ncrCodes = ["NCR", "National Capital Region", "13", "1300000000"];
    const ncrDetected = ncrCodes.includes(formData.region);
    setIsNCR(ncrDetected);

    if (formData.region) {
      if (ncrDetected) {
        setFormData((prev) => ({
          ...prev,
          province: "NCR",
          city: "",
          barangay: "",
        }));
        loadCitiesForNCR();
      } else {
        loadProvinces(formData.region);
        setFormData((prev) => ({
          ...prev,
          province: "",
          city: "",
          barangay: "",
        }));
        setCities([]);
        setBarangays([]);
      }
    }
  }, [formData.region]);

  useEffect(() => {
    if (formData.province && !isNCR) {
      loadCities(formData.province);
      setFormData((prev) => ({ ...prev, city: "", barangay: "" }));
      setBarangays([]);
    }
  }, [formData.province, isNCR]);

  useEffect(() => {
    if (formData.city) {
      loadBarangays(formData.city);
      setFormData((prev) => ({ ...prev, barangay: "" }));
    }
  }, [formData.city]);

  const loadBuildings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllBuildings({ limit: 100 });
      setBuildings(data.data);
    } catch (error: any) {
      console.error("Failed to load buildings:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to load buildings";
      setError(errorMessage);
      if (error.response?.status === 403) {
        toast.error(
          "Access denied: You don't have permission to manage buildings.",
        );
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRegions = async () => {
    try {
      const data = await getRegions();
      setRegions(data);
    } catch (error) {
      console.error("Failed to load regions:", error);
      toast.error("Failed to load regions");
    }
  };

  const loadProvinces = async (regionCode: string) => {
    try {
      setLoadingAddress(true);
      const data = await getProvincesByRegion(regionCode);
      setProvinces(data);
    } catch (error) {
      console.error("Failed to load provinces:", error);
      toast.error("Failed to load provinces");
    } finally {
      setLoadingAddress(false);
    }
  };

  const loadCities = async (provinceCode: string) => {
    try {
      setLoadingAddress(true);
      const data = await getCitiesByProvince(provinceCode);
      setCities(data);
    } catch (error) {
      console.error("Failed to load cities:", error);
      setCities([]);
      toast.error("Failed to load cities");
    } finally {
      setLoadingAddress(false);
    }
  };

  const loadCitiesForNCR = async () => {
    try {
      setLoadingAddress(true);
      let citiesData: City[] = [];
      try {
        const provincesData = await getProvincesByRegion(formData.region);
        if (provincesData && provincesData.length > 0) {
          citiesData = await getCitiesByProvince(provincesData[0].code);
        }
      } catch (e) {
        console.log("Approach 1 failed:", e);
      }
      if (!citiesData || citiesData.length === 0) {
        console.log("Using fallback NCR cities");
        citiesData = ncrCitiesFallback;
        toast.success("Using default NCR cities list");
      }
      setCities(citiesData);
    } catch (error) {
      console.error("Failed to load cities for NCR:", error);
      setCities(ncrCitiesFallback);
      toast.success("Using default NCR cities list");
    } finally {
      setLoadingAddress(false);
    }
  };

  const loadBarangays = async (cityCode: string) => {
    try {
      setLoadingAddress(true);
      const data = await getBarangaysByCity(cityCode);
      setBarangays(data);
    } catch (error) {
      console.error("Failed to load barangays:", error);
      toast.error("Failed to load barangays");
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.buildingName ||
      !formData.region ||
      (!isNCR && !formData.province) ||
      !formData.city ||
      !formData.barangay ||
      !formData.streetAddress
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate location type
    const validLocations: LocationType[] = ["", "breeze", "sil", "other"];
    const locationValue = formData.location as string;
    const validLocation = validLocations.includes(locationValue as LocationType)
      ? (locationValue as LocationType)
      : "";

    const submitData: Partial<Building> = {
      buildingName: formData.buildingName,
      region: formData.region,
      province: isNCR ? undefined : formData.province,
      city: formData.city,
      barangay: formData.barangay,
      streetAddress: formData.streetAddress,
      zipCode: formData.zipCode || undefined,
      location: validLocation,
      installationFee: formData.installationFee || 1500,
      isActive: formData.isActive,
    };

    try {
      if (editingBuilding) {
        await updateBuilding(editingBuilding._id, submitData);
        toast.success("Building updated successfully");
      } else {
        await createBuilding(submitData);
        toast.success("Building created successfully");
      }
      setIsModalOpen(false);
      resetForm();
      loadBuildings();
    } catch (error: any) {
      console.error("Failed to save building:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to save building";
      if (error.response?.status === 403) {
        toast.error(
          "Access denied: You don't have permission to manage buildings.",
        );
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this building?")) return;
    try {
      await deleteBuilding(id);
      toast.success("Building deleted successfully");
      loadBuildings();
    } catch (error: any) {
      console.error("Failed to delete building:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to delete building";
      if (error.response?.status === 403) {
        toast.error(
          "Access denied: You don't have permission to delete buildings.",
        );
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (building: Building) => {
    setEditingBuilding(building);
    const ncrCodes = ["NCR", "National Capital Region", "13", "1300000000"];
    const isBuildingNCR = ncrCodes.includes(building.region);

    // Validate location type
    const validLocations: LocationType[] = ["", "breeze", "sil", "other"];
    const locationValue = building.location || "";
    const validLocation = validLocations.includes(locationValue as LocationType)
      ? (locationValue as LocationType)
      : "";

    setFormData({
      buildingName: building.buildingName,
      region: building.region,
      province: building.province || "",
      city: building.city,
      barangay: building.barangay,
      streetAddress: building.streetAddress,
      zipCode: building.zipCode || "",
      location: validLocation,
      installationFee: building.installationFee || 1500,
      isActive: building.isActive,
    });

    setIsNCR(isBuildingNCR);

    if (isBuildingNCR) {
      loadCitiesForNCR();
    } else if (building.province) {
      loadCities(building.province);
    }

    if (building.city) {
      setTimeout(() => {
        loadBarangays(building.city);
      }, 1000);
    }

    setIsModalOpen(true);
  };

  const handleUpdateInstallationFee = async () => {
    if (!selectedBuildingForFee) return;
    try {
      await updateBuildingInstallationFee(
        selectedBuildingForFee._id,
        tempInstallationFee,
      );
      toast.success(
        `Installation fee updated to ₱${tempInstallationFee.toLocaleString()}`,
      );
      setIsInstallationFeeModalOpen(false);
      setSelectedBuildingForFee(null);
      loadBuildings();
    } catch (error: any) {
      console.error("Failed to update installation fee:", error);
      toast.error(
        error.response?.data?.message || "Failed to update installation fee",
      );
    }
  };

  const openInstallationFeeModal = (building: Building) => {
    setSelectedBuildingForFee(building);
    setTempInstallationFee(building.installationFee || 1500);
    setIsInstallationFeeModalOpen(true);
  };

  const resetForm = () => {
    setEditingBuilding(null);
    setFormData({
      buildingName: "",
      region: "",
      province: "",
      city: "",
      barangay: "",
      streetAddress: "",
      zipCode: "",
      location: "",
      installationFee: 1500,
      isActive: true,
    });
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    setIsNCR(false);
  };

  // Handle location select change with type safety
  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as LocationType;
    setFormData({ ...formData, location: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading buildings...</p>
        </div>
      </div>
    );
  }

  if ((error && error.includes("No role assigned")) || error?.includes("403")) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the Buildings Management page.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your administrator to request access or assign you
            the appropriate role.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Buildings Management
          </h1>
          <p className="text-gray-600">
            Manage building locations and installation fees
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" />
          Add Building
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Building Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Installation Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {buildings.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No buildings found. Click "Add Building" to create one.
                  </td>
                </tr>
              ) : (
                buildings.map((building) => (
                  <tr key={building._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {building.buildingName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{building.streetAddress}</div>
                      <div className="text-xs text-gray-400">
                        {building.barangay}, {building.city}
                        {building.province && `, ${building.province}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ₱{(building.installationFee || 0).toLocaleString()}
                      </span>
                      <button
                        onClick={() => openInstallationFeeModal(building)}
                        className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                      >
                        <FiHome className="w-4 h-4 inline" />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${building.location ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-500"}`}
                      >
                        {building.location
                          ? building.location.toUpperCase()
                          : "Not Set"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          building.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {building.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleEdit(building)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(building._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {editingBuilding ? "Edit Building" : "Add New Building"}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Building Name *
                  </label>
                  <input
                    type="text"
                    value={formData.buildingName}
                    onChange={(e) =>
                      setFormData({ ...formData, buildingName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region *
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Region</option>
                    {regions.map((region) => (
                      <option key={region.code} value={region.code}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!isNCR && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province *
                    </label>
                    <select
                      value={formData.province}
                      onChange={(e) =>
                        setFormData({ ...formData, province: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      disabled={!formData.region || loadingAddress}
                      required={!isNCR}
                    >
                      <option value="">Select Province</option>
                      {provinces.map((province) => (
                        <option key={province.code} value={province.code}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City/Municipality *
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    disabled={loadingAddress || !formData.region}
                    required
                  >
                    <option value="">Select City/Municipality</option>
                    {cities.map((city) => (
                      <option key={city.code} value={city.code}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                  {loadingAddress && (
                    <p className="text-sm text-gray-500 mt-1">
                      Loading cities...
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay *
                  </label>
                  <select
                    value={formData.barangay}
                    onChange={(e) =>
                      setFormData({ ...formData, barangay: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    disabled={!formData.city || loadingAddress}
                    required
                  >
                    <option value="">Select Barangay</option>
                    {barangays.map((barangay) => (
                      <option key={barangay.name} value={barangay.name}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.streetAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        streetAddress: e.target.value,
                      })
                    }
                    placeholder="e.g., 123 Main Street"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Zip Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) =>
                      setFormData({ ...formData, zipCode: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={formData.location}
                    onChange={handleLocationChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Location</option>
                    <option value="breeze">Breeze</option>
                    <option value="sil">SIL</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Installation Fee (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.installationFee}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        installationFee: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This fee will be charged to customers when billing starts
                    for this building.
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Active (visible to clients)
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingBuilding ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Installation Fee Modal */}
      {isInstallationFeeModalOpen && selectedBuildingForFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Update Installation Fee</h2>
              <button
                onClick={() => {
                  setIsInstallationFeeModalOpen(false);
                  setSelectedBuildingForFee(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>Building:</strong>{" "}
                  {selectedBuildingForFee.buildingName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Current Fee:</strong> ₱
                  {(
                    selectedBuildingForFee.installationFee || 0
                  ).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Installation Fee (₱)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={tempInstallationFee}
                  onChange={(e) =>
                    setTempInstallationFee(parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This fee will be charged to customers when billing starts for
                  this building.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setIsInstallationFeeModalOpen(false);
                    setSelectedBuildingForFee(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateInstallationFee}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Fee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
