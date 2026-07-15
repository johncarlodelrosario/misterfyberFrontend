"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiFileText,
  FiUpload,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiClipboard,
  FiCheckSquare,
  FiSquare,
  FiHome,
  FiLayers,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "@/services/api";
import { getActiveBuildings, Building } from "@/services/building";
import TermsAndConditionsModal from "@/components/common/TermsAndConditionsModal";

interface Plan {
  _id: string;
  name: string;
  price: number;
  speed: {
    download: number;
    upload: number;
  };
  isActive: boolean;
}

// The component that uses useSearchParams - wrapped in Suspense
function ApplyFormContent() {
  const searchParams = useSearchParams();
  const planIdFromUrl = searchParams.get("plan");

  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    tower: "",
    floor: "",
    unitNumber: "",
    notes: "",
    idType: "",
    idNumber: "",
  });
  const [idImage, setIdImage] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Terms and Conditions state
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchBuildings();
  }, []);

  useEffect(() => {
    if (planIdFromUrl && plans.length > 0) {
      const planExists = plans.find((plan) => plan._id === planIdFromUrl);
      if (planExists) {
        setSelectedPlan(planIdFromUrl);
        toast.success(`Plan pre-selected! You can change it if needed.`);
      }
    }
  }, [planIdFromUrl, plans]);

  const fetchPlans = async () => {
    try {
      const response = await api.get("/plans");
      const data = response.data;
      let plansData = [];
      if (data.data && Array.isArray(data.data)) plansData = data.data;
      else if (Array.isArray(data)) plansData = data;
      else if (data.plans && Array.isArray(data.plans)) plansData = data.plans;
      else plansData = [];

      // Filter to only show active plans
      let activePlans = plansData.filter(
        (plan: Plan) => plan.isActive !== false,
      );

      // Filter to ONLY show "Fiber Plan 999"
      activePlans = activePlans.filter(
        (plan: Plan) => plan.name === "Fiber Plan 999",
      );

      setPlans(activePlans);

      // Auto-select the plan if available
      if (activePlans.length > 0) {
        setSelectedPlan(activePlans[0]._id);
      } else {
        toast.error("Fiber Plan 999 is currently not available");
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      toast.error("Failed to load plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const buildingsData = await getActiveBuildings();
      console.log("All buildings from database:", buildingsData);

      // Try to find Vitalez with case-insensitive matching
      const vitalezBuildings = buildingsData.filter((building: Building) => {
        const buildingName = building.buildingName?.toLowerCase() || "";
        return buildingName.includes("vitalez") || buildingName === "vitalez";
      });

      console.log("Filtered Vitalez buildings:", vitalezBuildings);

      setBuildings(vitalezBuildings);

      // Auto-select Vitalez if available
      if (vitalezBuildings.length > 0) {
        setSelectedBuilding(vitalezBuildings[0]._id);
        console.log(
          "Auto-selected building:",
          vitalezBuildings[0].buildingName,
        );
      } else {
        // If no Vitalez found, show all buildings as fallback
        console.log("No Vitalez found, showing all buildings");
        setBuildings(buildingsData);
        if (buildingsData.length > 0) {
          setSelectedBuilding(buildingsData[0]._id);
        }
        toast.error("Vitalez not found. Please select a building.");
      }
    } catch (error) {
      console.error("Failed to fetch buildings:", error);
      toast.error("Failed to load buildings");
    } finally {
      setLoadingBuildings(false);
    }
  };

  const handleBuildingChange = (buildingId: string) => {
    setSelectedBuilding(buildingId);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleIdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large. Max 5MB");
        return;
      }
      if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
        toast.error("Only JPG, JPEG, PNG files allowed");
        return;
      }
      setIdImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if terms and conditions are accepted
    if (!acceptedTerms) {
      toast.error("Please read and accept the Terms and Conditions to proceed");
      return;
    }

    if (!selectedPlan) {
      toast.error("Please select a plan");
      return;
    }

    if (!selectedBuilding) {
      toast.error("Please select a building");
      return;
    }

    // Validate tower field (required by backend)
    if (!formData.tower || formData.tower.trim() === "") {
      toast.error("Please enter the tower name/number");
      return;
    }

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.phoneNumber
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.idType || !formData.idNumber) {
      toast.error("Please provide ID information");
      return;
    }

    if (!idImage) {
      toast.error("Please upload your ID image");
      return;
    }

    setLoading(true);

    try {
      const submitFormData = new FormData();
      submitFormData.append("firstName", formData.firstName);
      submitFormData.append("lastName", formData.lastName);
      submitFormData.append("email", formData.email);
      submitFormData.append("phoneNumber", formData.phoneNumber);
      submitFormData.append("planId", selectedPlan);
      submitFormData.append("buildingId", selectedBuilding);
      submitFormData.append("tower", formData.tower);
      submitFormData.append("floor", formData.floor);
      submitFormData.append("unitNumber", formData.unitNumber);
      if (formData.notes) {
        submitFormData.append("notes", formData.notes);
      }
      submitFormData.append("idType", formData.idType);
      submitFormData.append("idNumber", formData.idNumber);
      submitFormData.append("idImage", idImage);
      submitFormData.append("acceptedTerms", "true");

      const response = await api.post("/applications", submitFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const data = response.data;

      if (response.status === 200 || response.status === 201) {
        toast.success("Application submitted successfully!");
        if (data.data && data.data.applicationId) {
          toast.success(`Your Application ID: ${data.data.applicationId}`, {
            duration: 5000,
          });
        }
        setStep(3);
      } else {
        toast.error(data.message || "Failed to submit application");
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Network error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanDetails = plans.find((plan) => plan._id === selectedPlan);
  const selectedBuildingDetails = buildings.find(
    (b) => b._id === selectedBuilding,
  );

  // Get the selected plan details for the contract summary
  const getSelectedPlanSpeed = () => {
    if (selectedPlanDetails?.speed?.download) {
      return `${selectedPlanDetails.speed.download} mbps`;
    }
    return "___ mbps";
  };

  const getSelectedPlanName = () => {
    return selectedPlanDetails?.name || "______";
  };

  const handleAcceptTerms = () => {
    setAcceptedTerms(true);
    setShowTermsModal(false);
    toast.success("You have accepted the Terms and Conditions");
  };

  return (
    <>
      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleAcceptTerms}
        planName={getSelectedPlanName()}
        planSpeed={getSelectedPlanSpeed()}
      />

      <div className="min-h-screen bg-white pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Apply for Internet Service
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base px-4">
              Fill out the form below to start your internet connection
            </p>
          </motion.div>

          {step === 3 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center border border-gray-200"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                Application Submitted!
              </h2>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">
                Thank you for applying. Our team will review your application
                and contact you within 24-48 hours.
              </p>

              <button
                onClick={() => {
                  setStep(1);
                  setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    phoneNumber: "",
                    tower: "",
                    floor: "",
                    unitNumber: "",
                    notes: "",
                    idType: "",
                    idNumber: "",
                  });
                  setIdImage(null);
                  setIdPreview(null);
                  setSelectedBuilding("");
                  setAcceptedTerms(false);
                  window.scrollTo(0, 0);
                }}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition text-sm sm:text-base"
              >
                Apply Again
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-5 sm:space-y-6 order-2 lg:order-1">
                  {/* Personal Information */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-200"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FiUser className="text-blue-600" />
                      Personal Information
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm sm:text-base placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm sm:text-base placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm sm:text-base placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm sm:text-base placeholder-gray-400"
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Address Information with Building Selection */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-200"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FiMapPin className="text-blue-600" />
                      Address Information
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Building *
                        </label>
                        {loadingBuildings ? (
                          <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <FiLoader className="w-4 h-4 animate-spin" />
                            Loading buildings...
                          </div>
                        ) : (
                          <select
                            value={selectedBuilding}
                            onChange={(e) =>
                              handleBuildingChange(e.target.value)
                            }
                            required
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm sm:text-base"
                          >
                            <option value="" disabled className="text-gray-400">
                              Select a building
                            </option>
                            {buildings.map((building) => (
                              <option
                                key={building._id}
                                value={building._id}
                                className="text-gray-900"
                              >
                                {building.buildingName}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      {selectedBuildingDetails && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <p className="text-xs sm:text-sm text-blue-800">
                            {selectedBuildingDetails.buildingName}
                            <br />
                            {selectedBuildingDetails.streetAddress},{" "}
                            {selectedBuildingDetails.barangay}
                            <br />
                            {selectedBuildingDetails.city},{" "}
                            {selectedBuildingDetails.province}{" "}
                            {selectedBuildingDetails.zipCode}
                          </p>
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tower *
                          </label>
                          <input
                            type="text"
                            name="tower"
                            value={formData.tower}
                            onChange={handleInputChange}
                            placeholder="e.g., Tower A, B, 1, 2"
                            required
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm sm:text-base placeholder-gray-400"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter the tower name or number
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Floor
                          </label>
                          <input
                            type="text"
                            name="floor"
                            value={formData.floor}
                            onChange={handleInputChange}
                            placeholder="Floor number"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm sm:text-base placeholder-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Number
                          </label>
                          <input
                            type="text"
                            name="unitNumber"
                            value={formData.unitNumber}
                            onChange={handleInputChange}
                            placeholder="Unit #"
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm sm:text-base placeholder-gray-400"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Additional Notes */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-200"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FiClipboard className="text-blue-600" />
                      Additional Notes (Optional)
                    </h2>
                    <div>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder="Any special requests or additional information you'd like to share? (e.g., preferred installation date, special instructions, etc.)"
                        rows={4}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 text-sm sm:text-base placeholder-gray-400"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Max 500 characters. Tell us anything we should know
                        about your application.
                      </p>
                    </div>
                  </motion.div>

                  {/* ID Verification */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-200"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FiFileText className="text-blue-600" />
                      ID Verification
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ID Type *
                        </label>
                        <select
                          name="idType"
                          value={formData.idType}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm sm:text-base"
                        >
                          <option value="" className="text-gray-400">
                            Select ID type
                          </option>
                          <option value="philippine_passport">
                            Philippine Passport
                          </option>
                          <option value="philsys_national_id">
                            PhilSys National ID
                          </option>
                          <option value="driver_license">
                            Driver's License
                          </option>
                          <option value="umid_id">UMID ID</option>
                          <option value="prc_id">PRC ID</option>
                          <option value="postal_id">Postal ID</option>
                          <option value="voter_id">Voter's ID</option>
                          <option value="sss_id">SSS ID</option>
                          <option value="gsis_ecard">GSIS eCard</option>
                          <option value="philhealth_id">PhilHealth ID</option>
                          <option value="pagibig_loyalty_card">
                            Pag-IBIG Loyalty Card
                          </option>
                          <option value="nbi_clearance">NBI Clearance</option>
                          <option value="tin_id">TIN ID</option>
                          <option value="senior_citizen_id">
                            Senior Citizen ID
                          </option>
                          <option value="pwd_id">PWD ID</option>
                          <option value="barangay_id">Barangay ID</option>
                          <option value="company_id">Company ID</option>
                          <option value="school_id">School ID</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ID Number *
                        </label>
                        <input
                          type="text"
                          name="idNumber"
                          value={formData.idNumber}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm sm:text-base placeholder-gray-400"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload ID Image *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition bg-gray-50">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleIdImageChange}
                          className="hidden"
                          id="idImage"
                          required
                        />
                        <label htmlFor="idImage" className="cursor-pointer">
                          {idPreview ? (
                            <div className="space-y-2">
                              <img
                                src={idPreview}
                                alt="ID Preview"
                                className="max-h-40 mx-auto rounded"
                              />
                              <p className="text-sm text-blue-600">
                                Click to change
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <FiUpload className="w-8 h-8 mx-auto text-gray-400" />
                              <p className="text-sm text-gray-600">
                                Click to upload ID image
                              </p>
                              <p className="text-xs text-gray-400">
                                JPG, PNG, JPEG (Max 5MB)
                              </p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </motion.div>

                  {/* Terms and Conditions Checkbox */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-gray-200"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => setAcceptedTerms(!acceptedTerms)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {acceptedTerms ? (
                          <FiCheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <FiSquare className="w-5 h-5 text-gray-400 hover:text-blue-600 transition" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">
                          I have read, understood, and agree to the{" "}
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-blue-600 hover:text-blue-800 underline font-semibold"
                          >
                            Terms and Conditions
                          </button>{" "}
                          of Mister Fyber's internet service. I confirm that I
                          avail Plan{" "}
                          <span className="font-semibold text-gray-900">
                            {getSelectedPlanName()}
                          </span>{" "}
                          with{" "}
                          <span className="font-semibold text-gray-900">
                            {getSelectedPlanSpeed()}
                          </span>
                          .
                        </p>
                        {!acceptedTerms && (
                          <p className="text-xs text-red-600 mt-1">
                            * You must accept the Terms and Conditions to
                            proceed
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 text-sm sm:text-base"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <FiLoader className="w-5 h-5 animate-spin" />
                        Submitting...
                      </span>
                    ) : (
                      "Submit Application"
                    )}
                  </button>
                </div>

                {/* Plan Selection Sidebar */}
                <div className="lg:col-span-1 order-1 lg:order-2">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 lg:sticky lg:top-24 border border-gray-200"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                      Select Plan
                    </h2>
                    {loadingPlans ? (
                      <div className="text-center py-8">
                        <FiLoader className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {plans.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500 text-sm">
                              No plans available at the moment
                            </p>
                          </div>
                        ) : (
                          plans.map((plan) => (
                            <label
                              key={plan._id}
                              className={`block p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition ${
                                selectedPlan === plan._id
                                  ? "border-blue-600 bg-blue-50"
                                  : "border-gray-200 hover:border-blue-400 bg-gray-50"
                              }`}
                            >
                              <input
                                type="radio"
                                name="plan"
                                value={plan._id}
                                checked={selectedPlan === plan._id}
                                onChange={() => setSelectedPlan(plan._id)}
                                className="hidden"
                              />
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                    {plan.name}
                                  </h3>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {plan.speed?.download} Mbps
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-blue-600 text-sm sm:text-base">
                                    ₱{plan.price.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    /month
                                  </p>
                                </div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                    {selectedPlanDetails && (
                      <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs sm:text-sm text-gray-700">
                          <span className="font-semibold text-blue-700">
                            Selected Plan:
                          </span>{" "}
                          {selectedPlanDetails.name} - ₱
                          {selectedPlanDetails.price.toLocaleString()}/month
                        </p>
                      </div>
                    )}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700">
                        <FiAlertCircle className="inline mr-1" />
                        You can change the plan anytime before submitting
                      </p>
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <FiLayers className="text-blue-500" />
                        <strong>Tower required:</strong> Please enter the tower
                        name/number
                      </p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// Main page component with Suspense boundary
export default function ApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <FiLoader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading application form...</p>
          </div>
        </div>
      }
    >
      <ApplyFormContent />
    </Suspense>
  );
}
