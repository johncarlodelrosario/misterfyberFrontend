"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import { getUserProfile, updateUserProfile } from "@/services/user";
import { useAuth } from "@/contexts/AuthContext";
import { FiSave, FiRefreshCw } from "react-icons/fi";
import UserLayout from "@/components/User/UserLayout";
import { getActiveBuildings, Building } from "@/services/building";

const schema = yup.object({
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
  phoneNumber: yup.string().required("Phone number is required"),
  buildingId: yup.string().required("Please select a building"),
});

type FormData = yup.InferType<typeof schema>;

export default function UserProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(
    null,
  );
  const [loadingBuildings, setLoadingBuildings] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      buildingId: "",
    },
  });

  const buildingId = watch("buildingId");

  // Load buildings when component mounts
  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const activeBuildings = await getActiveBuildings();
        setBuildings(activeBuildings);
      } catch (error: any) {
        console.error("Failed to load buildings:", error);
        toast.error("Failed to load building list");
      } finally {
        setLoadingBuildings(false);
      }
    };
    loadBuildings();
  }, []);

  // Update selected building when buildingId changes
  useEffect(() => {
    if (buildingId) {
      const building = buildings.find((b) => b._id === buildingId);
      setSelectedBuilding(building || null);
    } else {
      setSelectedBuilding(null);
    }
  }, [buildingId, buildings]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = (await getUserProfile()) as any; // Temporary fix

      setValue("firstName", data.firstName || "");
      setValue("lastName", data.lastName || "");
      setValue("phoneNumber", data.phoneNumber || "");

      // Try to get buildingId from different possible locations
      let userBuildingId = "";

      // Check if buildingId exists directly
      if (data.buildingId) {
        userBuildingId = data.buildingId;
      }
      // Check if building object exists with _id
      else if (data.building && data.building._id) {
        userBuildingId = data.building._id;
      }
      // Check if it's in application data
      else if (data.application && data.application.buildingId) {
        userBuildingId = data.application.buildingId;
      }
      // Check if it's in selectedBuilding field
      else if (data.selectedBuilding) {
        userBuildingId = data.selectedBuilding;
      }

      console.log("Loaded building ID:", userBuildingId); // Debug log
      setValue("buildingId", userBuildingId);
    } catch (error: any) {
      console.error("Failed to load profile:", error);
      toast.error(error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const onSubmit = async (data: FormData) => {
    setUpdating(true);
    try {
      await updateUserProfile(data);
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  if (loading || loadingBuildings) {
    return (
      <UserLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading profile...</p>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Update your personal information</p>
        </div>

        <div className="max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    {...register("firstName")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    {...register("lastName")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  {...register("phoneNumber")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Building *
                </label>
                <select
                  {...register("buildingId")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={buildingId || ""}
                >
                  <option value="">Select a building</option>
                  {buildings.map((building) => (
                    <option key={building._id} value={building._id}>
                      {building.buildingName} - {building.streetAddress},{" "}
                      {building.city}
                    </option>
                  ))}
                </select>
                {errors.buildingId && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.buildingId.message}
                  </p>
                )}
              </div>

              {/* Display selected building details */}
              {selectedBuilding && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span>🏢</span> Your Selected Building
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Building:</span>{" "}
                      {selectedBuilding.buildingName}
                    </p>
                    <p>
                      <span className="font-medium">Address:</span>{" "}
                      {selectedBuilding.streetAddress}
                    </p>
                    <p>
                      <span className="font-medium">Barangay:</span>{" "}
                      {selectedBuilding.barangay}
                    </p>
                    <p>
                      <span className="font-medium">City:</span>{" "}
                      {selectedBuilding.city}
                    </p>
                    <p>
                      <span className="font-medium">Province:</span>{" "}
                      {selectedBuilding.province}
                    </p>
                    <p>
                      <span className="font-medium">Region:</span>{" "}
                      {selectedBuilding.region}
                    </p>
                    <p>
                      <span className="font-medium">Zip Code:</span>{" "}
                      {selectedBuilding.zipCode}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiSave className="w-4 h-4" />
                  {updating ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={loadProfile}
                  className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
