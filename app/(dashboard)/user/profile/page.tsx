// app/(dashboard)/user/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import { getUserProfile, updateUserProfile } from "@/services/user";
import { useAuth } from "@/contexts/AuthContext";
import {
  FiSave,
  FiRefreshCw,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
} from "react-icons/fi";
import UserLayout from "@/components/User/UserLayout";
import { getActiveBuildings, Building } from "@/services/building";

const schema = yup.object({
  firstName: yup.string().required("First name is required"),
  lastName: yup.string().required("Last name is required"),
  phoneNumber: yup.string().required("Phone number is required"),
  buildingId: yup.string(),
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
  const [profileData, setProfileData] = useState<any>(null);

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

  // Load buildings
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
      const data = await getUserProfile();
      setProfileData(data);

      setValue("firstName", data.firstName || "");
      setValue("lastName", data.lastName || "");
      setValue("phoneNumber", data.phoneNumber || "");

      // Extract building ID from various possible locations
      let userBuildingId = "";
      if ((data as any).buildingId) {
        userBuildingId = (data as any).buildingId;
      } else if ((data as any).building?._id) {
        userBuildingId = (data as any).building._id;
      } else if ((data as any).address?.buildingName) {
        // Try to find by name
        const found = buildings.find(
          (b) => b.buildingName === (data as any).address.buildingName,
        );
        if (found) userBuildingId = found._id;
      }

      setValue("buildingId", userBuildingId);
    } catch (error: any) {
      console.error("Failed to load profile:", error);
      toast.error(error.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingBuildings) {
      loadProfile();
    }
  }, [loadingBuildings]);

  const onSubmit = async (data: FormData) => {
    setUpdating(true);
    try {
      await updateUserProfile(data as any);
      toast.success("Profile updated successfully");
      await loadProfile();
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

        <div className="max-w-2xl space-y-6">
          {/* Read-Only Info Card */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiUser className="w-5 h-5 text-blue-600" />
              Account Information
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FiMail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email || "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FiUser className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Username</p>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.username || "Not set"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Form */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiMapPin className="w-5 h-5 text-blue-600" />
              Personal Information
            </h2>
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
                  Phone Number *
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    {...register("phoneNumber")}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
                {errors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Building
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
              </div>

              {/* Selected Building Details */}
              {selectedBuilding && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <FiMapPin className="w-4 h-4 text-blue-600" />
                    Your Selected Building
                  </h3>
                  <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
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
