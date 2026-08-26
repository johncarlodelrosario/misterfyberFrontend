"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  DocumentIcon,
  BuildingOfficeIcon,
  WifiIcon,
  IdentificationIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  HomeModernIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

import {
  submitApplication,
  getActiveBuildings,
  getRegions,
  getProvincesByRegion,
  getCitiesByProvince,
  getBarangaysByCity,
} from "@/services/application";
import { getPlans } from "@/services/plan";

// Validation Schema
const applicationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  buildingId: z.string().min(1, "Please select a building"),
  tower: z.string().min(1, "Tower/block is required"),
  floor: z.string().min(1, "Floor is required"),
  unitNumber: z.string().min(1, "Unit number is required"),
  planId: z.string().min(1, "Please select a plan"),
  idType: z.string().min(1, "ID type is required"),
  idNumber: z.string().min(1, "ID number is required"),
  macAddress: z.string().optional(),
  notes: z.string().optional(),
  idImage: z.any().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

// ID Types
const ID_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "national_id", label: "National ID" },
  { value: "postal_id", label: "Postal ID" },
  { value: "umid", label: "UMID" },
  { value: "prc_id", label: "PRC ID" },
  { value: "other", label: "Other" },
];

export default function NewApplicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [idPreview, setIdPreview] = useState<string | null>(null);

  // Address dropdowns
  const [regions, setRegions] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      buildingId: "",
      tower: "",
      floor: "",
      unitNumber: "",
      planId: "",
      idType: "",
      idNumber: "",
      macAddress: "",
      notes: "",
    },
  });

  const watchIdImage = watch("idImage");

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [buildingsData, plansData, regionsData] = await Promise.all([
          getActiveBuildings(),
          getPlans(),
          getRegions(),
        ]);

        setBuildings(buildingsData);
        setPlans(plansData);
        setRegions(regionsData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load required data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch provinces when region changes
  useEffect(() => {
    if (selectedRegion) {
      getProvincesByRegion(selectedRegion)
        .then(setProvinces)
        .catch(console.error);
      setSelectedProvince("");
      setCities([]);
      setBarangays([]);
    }
  }, [selectedRegion]);

  // Fetch cities when province changes
  useEffect(() => {
    if (selectedProvince) {
      getCitiesByProvince(selectedProvince)
        .then(setCities)
        .catch(console.error);
      setSelectedCity("");
      setBarangays([]);
    }
  }, [selectedProvince]);

  // Fetch barangays when city changes
  useEffect(() => {
    if (selectedCity) {
      getBarangaysByCity(selectedCity).then(setBarangays).catch(console.error);
    }
  }, [selectedCity]);

  // Handle ID image upload
  const handleIdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setValue("idImage", file);
    }
  };

  const removeIdImage = () => {
    setIdPreview(null);
    setValue("idImage", undefined);
    const input = document.getElementById("idImage") as HTMLInputElement;
    if (input) input.value = "";
  };

  // Handle building selection - update address fields
  const handleBuildingSelect = (buildingId: string) => {
    const building = buildings.find((b) => b._id === buildingId);
    if (building) {
      setSelectedRegion(building.region || "");
      setSelectedProvince(building.province || "");
      setSelectedCity(building.city || "");
    }
    setValue("buildingId", buildingId);
  };

  // Submit form
  const onSubmit = async (data: ApplicationFormData) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (key === "idImage" && value instanceof File) {
            formData.append("idImage", value);
          } else if (typeof value === "string") {
            formData.append(key, value);
          }
        }
      });

      const response = await submitApplication(data);
      toast.success("Application submitted successfully!");

      // Navigate to the application detail page
      if (response.data?._id) {
        router.push(`/admin/applications/${response.data._id}`);
      } else {
        router.push("/admin/applications");
      }
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(
        error.response?.data?.message || "Failed to submit application",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Application</h1>
          <p className="text-sm text-gray-500">
            Submit a new customer application
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <UserIcon className="h-5 w-5 text-blue-600" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                {...register("firstName")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Juan"
              />
              {errors.firstName && (
                <p className="text-sm text-red-600 mt-1">
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
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dela Cruz"
              />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.lastName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register("email")}
                  type="email"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="juan@email.com"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register("phoneNumber")}
                  type="tel"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="09171234567"
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Address & Location */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <MapPinIcon className="h-5 w-5 text-blue-600" />
            Address & Location
          </h2>

          <div className="space-y-4">
            {/* Building Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Building *
              </label>
              <select
                {...register("buildingId")}
                onChange={(e) => handleBuildingSelect(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a building...</option>
                {buildings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.buildingName} - {b.streetAddress}
                  </option>
                ))}
              </select>
              {errors.buildingId && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.buildingId.message}
                </p>
              )}
            </div>

            {/* Building Details Display */}
            {selectedRegion && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Region</p>
                  <p className="text-sm font-medium">{selectedRegion}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Province</p>
                  <p className="text-sm font-medium">{selectedProvince}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">City</p>
                  <p className="text-sm font-medium">{selectedCity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Barangay</p>
                  <p className="text-sm font-medium">
                    {barangays.length > 0 ? barangays[0]?.name : "N/A"}
                  </p>
                </div>
              </div>
            )}

            {/* Unit Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tower/Block *
                </label>
                <input
                  {...register("tower")}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tower A"
                />
                {errors.tower && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.tower.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Floor *
                </label>
                <input
                  {...register("floor")}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="5th Floor"
                />
                {errors.floor && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.floor.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Number *
                </label>
                <input
                  {...register("unitNumber")}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Unit 501"
                />
                {errors.unitNumber && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.unitNumber.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <WifiIcon className="h-5 w-5 text-blue-600" />
            Internet Plan
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Plan *
            </label>
            <select
              {...register("planId")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a plan...</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} - ₱{p.price.toLocaleString()}/mo (
                  {p.speed?.download || 0}Mbps)
                </option>
              ))}
            </select>
            {errors.planId && (
              <p className="text-sm text-red-600 mt-1">
                {errors.planId.message}
              </p>
            )}
          </div>

          {/* Selected Plan Details */}
          {watch("planId") && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">
                {plans.find((p) => p._id === watch("planId"))?.name}
              </p>
              <p className="text-sm text-blue-700">
                ₱
                {plans
                  .find((p) => p._id === watch("planId"))
                  ?.price?.toLocaleString() || 0}
                /month
              </p>
            </div>
          )}
        </div>

        {/* ID Information */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <IdentificationIcon className="h-5 w-5 text-blue-600" />
            Identification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Type *
              </label>
              <select
                {...register("idType")}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select ID type...</option>
                {ID_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.idType && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.idType.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Number *
              </label>
              <input
                {...register("idNumber")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter ID number"
              />
              {errors.idNumber && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.idNumber.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload ID Image
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1">
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition ${
                      idPreview
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300"
                    }`}
                  >
                    <input
                      id="idImage"
                      type="file"
                      accept="image/*"
                      onChange={handleIdImageChange}
                      className="hidden"
                    />
                    <CloudArrowUpIcon className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500 mt-1">
                      {idPreview
                        ? "Click to change"
                        : "Click to upload ID image"}
                    </p>
                    <p className="text-xs text-gray-400">Max size: 5MB</p>
                  </div>
                </label>

                {idPreview && (
                  <div className="relative flex-shrink-0">
                    <img
                      src={idPreview}
                      alt="ID Preview"
                      className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeIdImage}
                      className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <DocumentIcon className="h-5 w-5 text-blue-600" />
            Additional Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MAC Address (Optional)
              </label>
              <input
                {...register("macAddress")}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="XX:XX:XX:XX:XX:XX"
              />
              <p className="text-xs text-gray-400 mt-1">
                Format: XX:XX:XX:XX:XX:XX (e.g., 00:1A:2B:3C:4D:5E)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional notes about this application..."
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end sticky bottom-0 bg-white p-4 -mx-4 sm:mx-0 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
