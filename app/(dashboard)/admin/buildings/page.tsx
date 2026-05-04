"use client";

import { useState, useEffect } from "react";
import {
  getAllBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  Building,
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
import { FiPlus, FiEdit2, FiTrash2, FiX } from "react-icons/fi";

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);

  const [formData, setFormData] = useState({
    buildingName: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    streetAddress: "",
    zipCode: "",
    isActive: true,
  });

  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [isNCR, setIsNCR] = useState(false);

  // Hardcoded NCR cities as fallback
  const ncrCitiesFallback = [
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

  // Handle region change and NCR detection
  useEffect(() => {
    const ncrCodes = ["NCR", "National Capital Region", "13", "1300000000"];
    const ncrDetected = ncrCodes.includes(formData.region);
    setIsNCR(ncrDetected);

    if (formData.region) {
      if (ncrDetected) {
        // For NCR: auto-set province
        setFormData((prev) => ({
          ...prev,
          province: "NCR",
          city: "",
          barangay: "",
        }));
        // Load cities for NCR
        loadCitiesForNCR();
      } else {
        // For non-NCR: load provinces
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

  // Handle province change for non-NCR
  useEffect(() => {
    if (formData.province && !isNCR) {
      loadCities(formData.province);
      setFormData((prev) => ({ ...prev, city: "", barangay: "" }));
      setBarangays([]);
    }
  }, [formData.province, isNCR]);

  // Handle city change
  useEffect(() => {
    if (formData.city) {
      loadBarangays(formData.city);
      setFormData((prev) => ({ ...prev, barangay: "" }));
    }
  }, [formData.city]);

  const loadBuildings = async () => {
    try {
      setLoading(true);
      const data = await getAllBuildings({ limit: 100 });
      setBuildings(data.data);
    } catch (error) {
      console.error("Failed to load buildings:", error);
      toast.error("Failed to load buildings");
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
    }
  };

  const loadProvinces = async (regionCode: string) => {
    try {
      setLoadingAddress(true);
      const data = await getProvincesByRegion(regionCode);
      setProvinces(data);
    } catch (error) {
      console.error("Failed to load provinces:", error);
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
    } finally {
      setLoadingAddress(false);
    }
  };

  const loadCitiesForNCR = async () => {
    try {
      setLoadingAddress(true);

      // Try multiple approaches to get NCR cities
      let citiesData = [];

      // Approach 1: Try getting provinces first then cities
      try {
        const provincesData = await getProvincesByRegion(formData.region);
        if (provincesData && provincesData.length > 0) {
          citiesData = await getCitiesByProvince(provincesData[0].code);
        }
      } catch (e) {
        console.log("Approach 1 failed:", e);
      }

      // Approach 2: If no cities found, use fallback hardcoded cities
      if (!citiesData || citiesData.length === 0) {
        console.log("Using fallback NCR cities");
        citiesData = ncrCitiesFallback;
        toast.success("Using default NCR cities list");
      }

      setCities(citiesData);
    } catch (error) {
      console.error("Failed to load cities for NCR:", error);
      // Use fallback cities
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

    const submitData = {
      buildingName: formData.buildingName,
      region: formData.region,
      province: isNCR ? null : formData.province,
      city: formData.city,
      barangay: formData.barangay,
      streetAddress: formData.streetAddress,
      zipCode: formData.zipCode,
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
      toast.error(error.response?.data?.message || "Failed to save building");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this building?")) return;
    try {
      await deleteBuilding(id);
      toast.success("Building deleted successfully");
      loadBuildings();
    } catch (error) {
      console.error("Failed to delete building:", error);
      toast.error("Failed to delete building");
    }
  };

  const handleEdit = (building: Building) => {
    setEditingBuilding(building);
    const ncrCodes = ["NCR", "National Capital Region", "13", "1300000000"];
    const isBuildingNCR = ncrCodes.includes(building.region);

    setFormData({
      buildingName: building.buildingName,
      region: building.region,
      province: building.province || "",
      city: building.city,
      barangay: building.barangay,
      streetAddress: building.streetAddress,
      zipCode: building.zipCode || "",
      isActive: building.isActive,
    });

    setIsNCR(isBuildingNCR);

    // Load appropriate data for editing
    if (isBuildingNCR) {
      loadCitiesForNCR();
    } else if (building.province) {
      loadCities(building.province);
    }

    // Load barangays after cities are loaded
    if (building.city) {
      setTimeout(() => {
        loadBarangays(building.city);
      }, 1000);
    }

    setIsModalOpen(true);
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
      isActive: true,
    });
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    setIsNCR(false);
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Buildings Management
          </h1>
          <p className="text-gray-600">
            Manage building locations for client applications
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {buildings.map((building) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
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
    </div>
  );
}
