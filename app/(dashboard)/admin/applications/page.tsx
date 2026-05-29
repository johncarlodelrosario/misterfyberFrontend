"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getAllApplications,
  approveApplication,
  rejectApplication,
  getApplicationBillingStatus,
} from "@/services/admin";
import { startBillingForApplication } from "@/services/billing";
import {
  submitApplication,
  getActiveBuildings,
  Building,
  Region,
  Province,
  City,
  Barangay,
  getRegions,
  getProvincesByRegion,
  getCitiesByProvince,
  getBarangaysByCity,
} from "@/services/application";
import { getPlans as getAllPlans, Plan } from "@/services/plan";
import toast from "react-hot-toast";
import {
  FiEye,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiSearch,
  FiImage,
  FiWifiOff,
  FiDatabase,
  FiClock,
  FiBell,
  FiPlay,
  FiPhone,
  FiMail,
  FiUser,
  FiHome,
  FiCreditCard,
  FiPlus,
  FiUpload,
  FiDownload,
  FiFileText,
} from "react-icons/fi";

// ==================== PERSISTENT STORAGE CONFIGURATION ====================
const STORAGE_KEYS = {
  APPLICATIONS: "misterfyber_applications_data",
  LAST_FETCH: "misterfyber_last_fetch",
  FILTER_STATE: "misterfyber_applications_filter",
  CACHE_VERSION: "misterfyber_cache_v3",
  PRELOAD_CACHE: "misterfyber_preload_applications",
  PRELOAD_TIMESTAMP: "misterfyber_preload_timestamp",
  LAST_KNOWN_TOTAL: "misterfyber_last_known_total",
  LAST_KNOWN_PENDING: "misterfyber_last_known_pending",
};

const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes
const MAX_STORED_APPLICATIONS = 500;
const CHECK_INTERVAL = 15000; // Check every 15 seconds for new applicants

interface StoredApplicationsData {
  applications: any[];
  timestamp: number;
  version: string;
  totalCount: number;
}

interface FilterState {
  searchTerm: string;
  statusFilter: string;
}

const persistentStorage = {
  setItem: (key: string, value: any): boolean => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e: any) {
      if (e.name === "QuotaExceededError") {
        Object.values(STORAGE_KEYS).forEach((k) => {
          if (k !== key) {
            try {
              localStorage.removeItem(k);
            } catch (err) {}
          }
        });
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (retryError) {
          return false;
        }
      }
      return false;
    }
  },
  getItem: (key: string): any => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  },
  clearAll: (): void => {
    try {
      Object.values(STORAGE_KEYS).forEach((key) =>
        localStorage.removeItem(key),
      );
    } catch (e) {}
  },
};

// Helper function to safely format price
const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null || isNaN(price)) {
    return "0.00";
  }
  return price.toFixed(2);
};

// Helper function to safely get speed
const getSpeed = (plan: any): string => {
  if (!plan) return "N/A";
  if (plan.speed?.download) return `${plan.speed.download} Mbps`;
  if (plan.speed) return `${plan.speed} Mbps`;
  return "N/A";
};

// ID Types
const ID_TYPES = [
  "Philippine National ID",
  "Driver's License",
  "Passport",
  "UMID",
  "Postal ID",
  "Voter's ID",
  "PRC ID",
  "GSIS ID",
  "SSS ID",
  "Other",
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [hasNewApplicant, setHasNewApplicant] = useState(false);
  const [newApplicantCount, setNewApplicantCount] = useState(0);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedAppForBilling, setSelectedAppForBilling] = useState<any>(null);
  const [filter, setFilter] = useState<FilterState>(() => {
    const savedFilter = persistentStorage.getItem(STORAGE_KEYS.FILTER_STATE);
    return savedFilter || { searchTerm: "", statusFilter: "all" };
  });

  // Add Customer Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkResults, setBulkResults] = useState<{
    success: any[];
    failed: any[];
  } | null>(null);

  // Address state for Add Customer form
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [streetAddress, setStreetAddress] = useState("");

  // Form state for Add Customer
  const [customerForm, setCustomerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    buildingId: "",
    floor: "",
    unitNumber: "",
    notes: "",
    planId: "",
    idType: "",
    idNumber: "",
    idImage: null as File | null,
  });

  const refreshInProgressRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const PRODUCTION_URL = "https://misterfyberbackend.onrender.com";

  // Save filter to storage
  useEffect(() => {
    persistentStorage.setItem(STORAGE_KEYS.FILTER_STATE, filter);
  }, [filter]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Network connected");
      checkForNewApplicants();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Network disconnected");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load buildings and plans for modals
  useEffect(() => {
    if (showAddCustomerModal) {
      loadBuildingsAndPlans();
      loadRegions();
    }
  }, [showAddCustomerModal]);

  const loadBuildingsAndPlans = async () => {
    try {
      const [buildingsData, plansData] = await Promise.all([
        getActiveBuildings(),
        getAllPlans(),
      ]);
      setBuildings(buildingsData);
      setPlans(plansData);
    } catch (error) {
      console.error("Failed to load buildings/plans:", error);
      toast.error("Failed to load buildings and plans");
    }
  };

  const loadRegions = async () => {
    try {
      const regionsData = await getRegions();
      setRegions(regionsData);
    } catch (error) {
      console.error("Failed to load regions:", error);
      toast.error("Failed to load address data");
    }
  };

  const loadProvinces = async (regionCode: string) => {
    try {
      const provincesData = await getProvincesByRegion(regionCode);
      setProvinces(provincesData);
      setCities([]);
      setBarangays([]);
      setSelectedProvince("");
      setSelectedCity("");
      setSelectedBarangay("");
    } catch (error) {
      console.error("Failed to load provinces:", error);
      toast.error("Failed to load provinces");
    }
  };

  const loadCities = async (provinceCode: string) => {
    try {
      const citiesData = await getCitiesByProvince(provinceCode);
      setCities(citiesData);
      setBarangays([]);
      setSelectedCity("");
      setSelectedBarangay("");
    } catch (error) {
      console.error("Failed to load cities:", error);
      toast.error("Failed to load cities");
    }
  };

  const loadBarangays = async (cityCode: string) => {
    try {
      const barangaysData = await getBarangaysByCity(cityCode);
      setBarangays(barangaysData);
      setSelectedBarangay("");
    } catch (error) {
      console.error("Failed to load barangays:", error);
      toast.error("Failed to load barangays");
    }
  };

  const handleRegionChange = (regionCode: string) => {
    setSelectedRegion(regionCode);
    loadProvinces(regionCode);
  };

  const handleProvinceChange = (provinceCode: string) => {
    setSelectedProvince(provinceCode);
    loadCities(provinceCode);
  };

  const handleCityChange = (cityCode: string) => {
    setSelectedCity(cityCode);
    loadBarangays(cityCode);
  };

  const resetAddressForm = () => {
    setSelectedRegion("");
    setSelectedProvince("");
    setSelectedCity("");
    setSelectedBarangay("");
    setStreetAddress("");
    setRegions([]);
    setProvinces([]);
    setCities([]);
    setBarangays([]);
  };

  const resetCustomerForm = () => {
    setCustomerForm({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      buildingId: "",
      floor: "",
      unitNumber: "",
      notes: "",
      planId: "",
      idType: "",
      idNumber: "",
      idImage: null,
    });
    resetAddressForm();
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !customerForm.firstName ||
      !customerForm.lastName ||
      !customerForm.email ||
      !customerForm.phoneNumber ||
      !customerForm.buildingId ||
      !customerForm.planId ||
      !customerForm.idType ||
      !customerForm.idNumber
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      await submitApplication(customerForm as any);
      toast.success("Customer application submitted successfully!");
      setShowAddCustomerModal(false);
      resetCustomerForm();
      fetchApplications(); // Refresh the list
    } catch (error: any) {
      console.error("Failed to submit application:", error);
      toast.error(
        error.response?.data?.message || "Failed to submit application",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle CSV file upload for bulk upload
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setCsvFile(file);
        setBulkResults(null);
      } else {
        toast.error("Please upload a valid CSV file");
        setCsvFile(null);
      }
    }
  };

  // Download CSV template
  const downloadCsvTemplate = () => {
    const headers = [
      "firstName",
      "lastName",
      "email",
      "phoneNumber",
      "buildingName",
      "floor",
      "unitNumber",
      "planName",
      "idType",
      "idNumber",
      "notes",
    ];

    const exampleRow = [
      "John",
      "Doe",
      "john.doe@example.com",
      "09123456789",
      "Tower 1",
      "5th Floor",
      "Unit 501",
      "Fiber 100 Mbps",
      "Philippine National ID",
      "1234-5678-9012",
      "Interested in installation",
    ];

    const csvContent = [headers.join(","), exampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customer_applications_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  // Parse CSV and map building/plan names to IDs
  const parseCsvAndPrepareData = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split("\n");
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/\r/g, ""));

          // Get buildings and plans for mapping
          const [buildingsData, plansData] = await Promise.all([
            getActiveBuildings(),
            getAllPlans(),
          ]);

          const buildingMap = new Map();
          buildingsData.forEach((b: Building) => {
            buildingMap.set(b.buildingName.toLowerCase().trim(), b._id);
          });

          const planMap = new Map();
          plansData.forEach((p: Plan) => {
            planMap.set(p.name.toLowerCase().trim(), p._id);
          });

          const applications: any[] = [];

          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = parseCSVLine(lines[i]);
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index]?.trim() || "";
            });

            // Map building name to ID
            const buildingId = buildingMap.get(
              row.buildingName?.toLowerCase().trim(),
            );
            if (!buildingId) {
              console.warn(`Building not found: ${row.buildingName}`);
              continue;
            }

            // Map plan name to ID
            const planId = planMap.get(row.planName?.toLowerCase().trim());
            if (!planId) {
              console.warn(`Plan not found: ${row.planName}`);
              continue;
            }

            if (
              !row.firstName ||
              !row.lastName ||
              !row.email ||
              !row.phoneNumber
            ) {
              console.warn(`Missing required fields for row ${i}`);
              continue;
            }

            applications.push({
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email,
              phoneNumber: row.phoneNumber,
              buildingId: buildingId,
              floor: row.floor || "",
              unitNumber: row.unitNumber || "",
              notes: row.notes || "",
              planId: planId,
              idType: row.idType || ID_TYPES[0],
              idNumber: row.idNumber || "N/A",
            });
          }

          resolve(applications);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Helper to parse CSV line with quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleBulkUpload = async () => {
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setBulkSubmitting(true);
    setBulkResults(null);

    try {
      const applications = await parseCsvAndPrepareData(csvFile);

      if (applications.length === 0) {
        toast.error("No valid applications found in CSV");
        setBulkSubmitting(false);
        return;
      }

      const success: any[] = [];
      const failed: any[] = [];

      // Submit each application
      for (let i = 0; i < applications.length; i++) {
        const app = applications[i];
        try {
          const result = await submitApplication(app);
          success.push({ ...app, result: result.data });
          toast.success(`✓ ${app.firstName} ${app.lastName} added`);
        } catch (error: any) {
          failed.push({
            ...app,
            error:
              error.response?.data?.message || error.message || "Unknown error",
          });
          toast.error(`✗ Failed: ${app.firstName} ${app.lastName}`);
        }
      }

      setBulkResults({ success, failed });

      if (success.length > 0) {
        toast.success(`Successfully added ${success.length} customers`);
        fetchApplications(); // Refresh the list
      }

      if (failed.length > 0) {
        toast.error(`Failed to add ${failed.length} customers`);
      }
    } catch (error: any) {
      console.error("Bulk upload failed:", error);
      toast.error(error.message || "Bulk upload failed");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const resetBulkUpload = () => {
    setCsvFile(null);
    setBulkResults(null);
    setShowBulkUploadModal(false);
  };

  // Check for new applicants function
  const checkForNewApplicants = useCallback(async () => {
    if (refreshInProgressRef.current) return;

    try {
      const data = await getAllApplications({ page: 1, limit: 100 });
      const applicationsList = data.data || [];
      const currentTotal = applicationsList.length;
      const currentPending = applicationsList.filter(
        (a: any) => a.status === "pending",
      ).length;

      const lastKnownTotal =
        (persistentStorage.getItem(STORAGE_KEYS.LAST_KNOWN_TOTAL) as number) ||
        applications.length;
      const lastKnownPending =
        (persistentStorage.getItem(
          STORAGE_KEYS.LAST_KNOWN_PENDING,
        ) as number) ||
        applications.filter((a: any) => a.status === "pending").length;

      const hasNew =
        currentTotal > lastKnownTotal || currentPending > lastKnownPending;
      const newCount =
        currentTotal - lastKnownTotal + (currentPending - lastKnownPending);

      if (hasNew) {
        console.log(
          `🆕 New applicant detected! Total: ${lastKnownTotal} → ${currentTotal}, Pending: ${lastKnownPending} → ${currentPending}`,
        );
        setHasNewApplicant(true);
        setNewApplicantCount(newCount > 0 ? newCount : 1);
        await silentRefresh();

        setTimeout(() => {
          setHasNewApplicant(false);
          setNewApplicantCount(0);
        }, 5000);
      }
    } catch (error) {
      console.error("Failed to check for new applicants:", error);
    }
  }, [applications.length]);

  // Periodically check for new applicants
  useEffect(() => {
    if (isOnline && !initialLoading) {
      intervalRef.current = setInterval(() => {
        checkForNewApplicants();
      }, CHECK_INTERVAL);

      console.log("🔍 Started checking for new applicants every 15 seconds");
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOnline, initialLoading, checkForNewApplicants]);

  // Load from localStorage on mount
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const preloadData = persistentStorage.getItem(
          STORAGE_KEYS.PRELOAD_CACHE,
        ) as StoredApplicationsData | null;
        const storedData = persistentStorage.getItem(
          STORAGE_KEYS.APPLICATIONS,
        ) as StoredApplicationsData | null;
        const lastFetch = persistentStorage.getItem(STORAGE_KEYS.LAST_FETCH);

        if (
          preloadData &&
          preloadData.applications &&
          preloadData.applications.length > 0
        ) {
          console.log(
            `📦 LOADING from PRELOAD: ${preloadData.applications.length} applications`,
          );
          setApplications(preloadData.applications);
          if (preloadData.timestamp)
            setLastFetchTime(new Date(preloadData.timestamp));

          const total = preloadData.applications.length;
          const pending = preloadData.applications.filter(
            (a: any) => a.status === "pending",
          ).length;
          persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_TOTAL, total);
          persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_PENDING, pending);

          setInitialLoading(false);
          return;
        }

        if (
          storedData &&
          storedData.applications &&
          storedData.applications.length > 0
        ) {
          console.log(
            `📦 LOADING from CACHE: ${storedData.applications.length} applications`,
          );
          setApplications(storedData.applications);
          if (lastFetch) setLastFetchTime(new Date(lastFetch));

          const total = storedData.applications.length;
          const pending = storedData.applications.filter(
            (a: any) => a.status === "pending",
          ).length;
          persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_TOTAL, total);
          persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_PENDING, pending);

          setInitialLoading(false);
          return;
        }

        fetchApplications();
      } catch (err) {
        console.error("Failed to load from storage:", err);
        fetchApplications();
      }
    };

    loadStoredData();
  }, []);

  // Silent refresh
  const silentRefresh = useCallback(async () => {
    if (refreshInProgressRef.current) return;
    refreshInProgressRef.current = true;

    try {
      console.log("🔄 Silent refresh - new applicant detected...");
      const data = await getAllApplications({ page: 1, limit: 100 });
      const applicationsList = data.data || [];

      if (applicationsList.length > 0) {
        setApplications(applicationsList);
        setLastFetchTime(new Date());

        const dataToStore: StoredApplicationsData = {
          applications: applicationsList.slice(0, MAX_STORED_APPLICATIONS),
          timestamp: Date.now(),
          version: STORAGE_KEYS.CACHE_VERSION,
          totalCount: applicationsList.length,
        };

        persistentStorage.setItem(STORAGE_KEYS.APPLICATIONS, dataToStore);
        persistentStorage.setItem(STORAGE_KEYS.LAST_FETCH, Date.now());
        persistentStorage.setItem(STORAGE_KEYS.PRELOAD_CACHE, dataToStore);
        persistentStorage.setItem(STORAGE_KEYS.PRELOAD_TIMESTAMP, Date.now());

        const total = applicationsList.length;
        const pending = applicationsList.filter(
          (a: any) => a.status === "pending",
        ).length;
        persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_TOTAL, total);
        persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_PENDING, pending);

        localStorage.setItem("misterfyber_pending_count", pending.toString());

        toast.success(
          `🆕 New applicant(s) loaded! Total: ${total} applications`,
        );
      }
    } catch (error) {
      console.log("Silent refresh failed");
    } finally {
      refreshInProgressRef.current = false;
    }
  }, []);

  // Manual refresh
  const fetchApplications = useCallback(async () => {
    if (refreshInProgressRef.current) return;
    refreshInProgressRef.current = true;
    setRefreshing(true);
    setError(null);

    try {
      console.log("🔄 Manual refresh...");
      const data = await getAllApplications({ page: 1, limit: 100 });
      const applicationsList = data.data || [];

      console.log(`✅ Received ${applicationsList.length} applications`);
      setApplications(applicationsList);
      setLastFetchTime(new Date());

      const dataToStore: StoredApplicationsData = {
        applications: applicationsList.slice(0, MAX_STORED_APPLICATIONS),
        timestamp: Date.now(),
        version: STORAGE_KEYS.CACHE_VERSION,
        totalCount: applicationsList.length,
      };

      persistentStorage.setItem(STORAGE_KEYS.APPLICATIONS, dataToStore);
      persistentStorage.setItem(STORAGE_KEYS.LAST_FETCH, Date.now());
      persistentStorage.setItem(STORAGE_KEYS.PRELOAD_CACHE, dataToStore);
      persistentStorage.setItem(STORAGE_KEYS.PRELOAD_TIMESTAMP, Date.now());

      const total = applicationsList.length;
      const pending = applicationsList.filter(
        (a: any) => a.status === "pending",
      ).length;
      persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_TOTAL, total);
      persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_PENDING, pending);

      localStorage.setItem("misterfyber_pending_count", pending.toString());

      toast.success(`Loaded ${applicationsList.length} applications`);
      setHasNewApplicant(false);
    } catch (error: any) {
      console.error("Failed to fetch:", error);
      const storedData = persistentStorage.getItem(STORAGE_KEYS.APPLICATIONS);
      if (storedData?.applications?.length > 0) {
        setApplications(storedData.applications);
        setError(
          `Network error. Showing ${storedData.applications.length} cached.`,
        );
        toast.error("Network error, using cached data");
      } else {
        setError("Unable to connect to server.");
        toast.error("Failed to connect");
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      refreshInProgressRef.current = false;
    }
  }, []);

  // Update counts when applications change
  useEffect(() => {
    if (applications.length > 0 && !initialLoading) {
      const total = applications.length;
      const pending = applications.filter(
        (a: any) => a.status === "pending",
      ).length;
      persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_TOTAL, total);
      persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_PENDING, pending);

      const dataToStore: StoredApplicationsData = {
        applications: applications.slice(0, MAX_STORED_APPLICATIONS),
        timestamp: Date.now(),
        version: STORAGE_KEYS.CACHE_VERSION,
        totalCount: applications.length,
      };
      persistentStorage.setItem(STORAGE_KEYS.APPLICATIONS, dataToStore);
      persistentStorage.setItem(STORAGE_KEYS.PRELOAD_CACHE, dataToStore);
      persistentStorage.setItem(STORAGE_KEYS.PRELOAD_TIMESTAMP, Date.now());
    }
  }, [applications, initialLoading]);

  // Handle approve
  const handleApprove = async (id: string, adminNotes?: string) => {
    try {
      setProcessingId(id);
      await approveApplication(id, adminNotes);
      toast.success("Application approved successfully");

      setApplications((prevApplications) =>
        prevApplications.map((app) =>
          app._id === id ? { ...app, status: "approved" } : app,
        ),
      );

      setSelectedApp(null);
      fetchApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject
  const handleReject = async (id: string, adminNotes?: string) => {
    try {
      setProcessingId(id);
      await rejectApplication(id, adminNotes);
      toast.success("Application rejected");

      setApplications((prevApplications) =>
        prevApplications.map((app) =>
          app._id === id ? { ...app, status: "rejected" } : app,
        ),
      );

      setSelectedApp(null);
      fetchApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle start billing for application
  const handleStartBilling = async (app: any) => {
    try {
      setProcessingId(app._id);
      toast.loading("Starting billing...", { id: "start-billing" });

      const result = await startBillingForApplication(app.applicationId, {});

      toast.dismiss("start-billing");

      if (result.success) {
        toast.success(
          `✅ Billing started for ${app.firstName} ${app.lastName}! Invoice sent to ${app.email}`,
        );
        fetchApplications();
        setSelectedAppForBilling(null);
        setShowBillingModal(false);
      } else {
        toast.error(result.message || "Failed to start billing");
      }
    } catch (error: any) {
      toast.dismiss("start-billing");
      toast.error(error.response?.data?.message || "Failed to start billing");
    } finally {
      setProcessingId(null);
    }
  };

  // Get image URL
  const getImageUrl = useCallback(
    (imagePath: string) => {
      if (!imagePath) return null;
      if (imagePath.startsWith("http://") || imagePath.startsWith("https://"))
        return imagePath;
      if (imagePath.startsWith("data:image")) return imagePath;
      let cleanPath = imagePath.replace(/^\/+/, "");
      if (
        !cleanPath.startsWith("uploads/") &&
        !cleanPath.startsWith("uploads\\")
      ) {
        cleanPath = `uploads/${cleanPath}`;
      }
      cleanPath = cleanPath.replace(/\\/g, "/");
      return `${PRODUCTION_URL}/${cleanPath}`;
    },
    [PRODUCTION_URL],
  );

  const filteredApplications = useMemo(() => {
    if (!applications || applications.length === 0) return [];
    return applications.filter((app: any) => {
      const matchesSearch =
        !filter.searchTerm ||
        app.applicationId
          ?.toLowerCase()
          .includes(filter.searchTerm.toLowerCase()) ||
        app.firstName
          ?.toLowerCase()
          .includes(filter.searchTerm.toLowerCase()) ||
        app.lastName?.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
        app.email?.toLowerCase().includes(filter.searchTerm.toLowerCase());
      const matchesStatus =
        filter.statusFilter === "all" || app.status === filter.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, filter.searchTerm, filter.statusFilter]);

  const getStatusBadge = useCallback((status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  }, []);

  const clearCache = useCallback(() => {
    persistentStorage.clearAll();
    toast.success("Cache cleared");
    setApplications([]);
    setError(null);
    fetchApplications();
  }, [fetchApplications]);

  const getLastFetchDisplay = useCallback(() => {
    if (!lastFetchTime) return "Never";
    const now = new Date();
    const diff = now.getTime() - lastFetchTime.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }, [lastFetchTime]);

  const stats = useMemo(
    () => ({
      pending: applications.filter((a) => a.status === "pending").length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
      total: applications.length,
    }),
    [applications],
  );

  if (initialLoading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* New Applicant Alert Banner */}
      {hasNewApplicant && (
        <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-lg shadow-md animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <FiBell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-green-800">
                🆕 New Applicant{newApplicantCount > 1 ? "s" : ""} Detected!
              </p>
              <p className="text-sm text-green-700">
                {newApplicantCount} new applicant
                {newApplicantCount > 1 ? "s have" : " has"} been added. Page is
                automatically refreshing...
              </p>
            </div>
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600">
            Review and manage customer applications
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Add Customer Button */}
          <button
            onClick={() => {
              resetCustomerForm();
              setShowAddCustomerModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            Add Customer
          </button>

          {/* Bulk Upload Button */}
          <button
            onClick={() => {
              resetBulkUpload();
              setShowBulkUploadModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FiUpload className="w-4 h-4" />
            Bulk Upload
          </button>

          <div className="text-sm text-gray-500 flex items-center gap-1">
            <FiClock className="w-3 h-3" />
            <span>
              Auto-check: Every 15 seconds | Last updated:{" "}
              {getLastFetchDisplay()}
            </span>
          </div>
          <button
            onClick={() => fetchApplications()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <FiRefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={clearCache}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <FiDatabase className="w-4 h-4" />
            Clear Cache
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {!isOnline && (
        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
          <div className="flex items-center gap-2">
            <FiWifiOff className="w-4 h-4 text-yellow-400" />
            <p className="text-sm text-yellow-700">
              Offline mode - showing cached data
            </p>
          </div>
        </div>
      )}

      {error && applications.length > 0 && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
          <p className="text-sm text-blue-700">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Total Applications</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="text-sm text-yellow-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-700">
            {stats.pending}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="text-sm text-green-600">Approved</div>
          <div className="text-2xl font-bold text-green-700">
            {stats.approved}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="text-sm text-red-600">Rejected</div>
          <div className="text-2xl font-bold text-red-700">
            {stats.rejected}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, name, or email..."
              value={filter.searchTerm}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, searchTerm: e.target.value }))
              }
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={filter.statusFilter}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, statusFilter: e.target.value }))
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status ({stats.total})</option>
            <option value="pending">Pending ({stats.pending})</option>
            <option value="approved">Approved ({stats.approved})</option>
            <option value="rejected">Rejected ({stats.rejected})</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {applications.length === 0
                      ? "No applications found"
                      : "No applications match your filters"}
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app: any) => (
                  <tr
                    key={app._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {app.applicationId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {app.firstName} {app.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {app.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {app.planId?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(app.status)}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium"
                        >
                          <FiEye className="w-4 h-4" />
                          View
                        </button>
                        {app.status === "approved" && !app.billingStarted && (
                          <button
                            onClick={() => {
                              setSelectedAppForBilling(app);
                              setShowBillingModal(true);
                            }}
                            className="text-green-600 hover:text-green-800 flex items-center gap-1 font-medium"
                            title="Start Billing"
                          >
                            <FiPlay className="w-4 h-4" />
                            Start Billing
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Showing {filteredApplications.length} of {applications.length}{" "}
          applications
        </div>
      </div>

      {/* Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedApp.status === "pending"
                    ? "Review Application"
                    : "Application Details"}
                </h2>
                <p className="text-sm text-gray-500 font-mono">
                  {selectedApp.applicationId}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FiUser className="w-4 h-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>{" "}
                    <span className="font-medium">
                      {selectedApp.firstName} {selectedApp.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>{" "}
                    <span className="font-medium">{selectedApp.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>{" "}
                    <span className="font-medium">
                      {selectedApp.phoneNumber || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Plan Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Plan:</span>{" "}
                    {selectedApp.planId?.name || "N/A"}
                  </div>
                  <div>
                    <span className="text-gray-500">Price:</span> ₱
                    {formatPrice(selectedApp.planId?.price)}/month
                  </div>
                  <div>
                    <span className="text-gray-500">Speed:</span>{" "}
                    {getSpeed(selectedApp.planId)}
                  </div>
                </div>
              </div>

              {/* ID Verification */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <FiCreditCard className="w-4 h-4" />
                    ID Verification
                  </h3>
                  {selectedApp.idImage && (
                    <button
                      onClick={() => {
                        const url = getImageUrl(selectedApp.idImage);
                        if (url) {
                          setImagePreview(url);
                          setShowImageModal(true);
                        } else {
                          toast.error("Could not load image URL");
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                    >
                      <FiImage className="w-4 h-4" />
                      View ID
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">ID Type:</span>{" "}
                    {selectedApp.idType && selectedApp.idType !== "undefined"
                      ? selectedApp.idType
                      : "Not provided"}
                  </div>
                  <div>
                    <span className="text-gray-500">ID Number:</span>{" "}
                    {selectedApp.idNumber &&
                    selectedApp.idNumber !== "undefined"
                      ? selectedApp.idNumber
                      : "Not provided"}
                  </div>
                </div>
              </div>

              {/* Notes if any */}
              {selectedApp.notes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700">{selectedApp.notes}</p>
                </div>
              )}

              {/* Start Billing Button for Approved Apps without billing */}
              {selectedApp.status === "approved" &&
                !selectedApp.billingStarted && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSelectedAppForBilling(selectedApp);
                        setShowBillingModal(true);
                        setSelectedApp(null);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <FiPlay className="w-4 h-4" />
                      Start Billing
                    </button>
                  </div>
                )}

              {/* Approve/Reject buttons for Pending Apps */}
              {selectedApp.status === "pending" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes
                    </label>
                    <textarea
                      id="adminNotes"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Add notes about this application..."
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedApp(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const notes = (
                          document.getElementById(
                            "adminNotes",
                          ) as HTMLTextAreaElement
                        )?.value;
                        handleReject(selectedApp._id, notes);
                      }}
                      disabled={processingId === selectedApp._id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      {processingId === selectedApp._id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiX />
                      )}
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        const notes = (
                          document.getElementById(
                            "adminNotes",
                          ) as HTMLTextAreaElement
                        )?.value;
                        handleApprove(selectedApp._id, notes);
                      }}
                      disabled={processingId === selectedApp._id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                    >
                      {processingId === selectedApp._id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiCheck />
                      )}
                      Approve
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Start Billing Modal */}
      {showBillingModal && selectedAppForBilling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Start Billing</h2>
              <button
                onClick={() => {
                  setShowBillingModal(false);
                  setSelectedAppForBilling(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Customer:</strong> {selectedAppForBilling.firstName}{" "}
                  {selectedAppForBilling.lastName}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Email:</strong> {selectedAppForBilling.email}
                </p>
                <p className="text-sm text-blue-800 font-mono">
                  <strong>Application ID:</strong>{" "}
                  {selectedAppForBilling.applicationId}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Plan:</strong>{" "}
                  {selectedAppForBilling.planId?.name || "N/A"} - ₱
                  {selectedAppForBilling.planId?.price || 0}/month
                </p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ Starting billing will:
                </p>
                <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                  <li>Generate pro-rated bill based on current date</li>
                  <li>Send invoice to customer's email</li>
                  <li>Create billing cycle for this application</li>
                </ul>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowBillingModal(false);
                    setSelectedAppForBilling(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStartBilling(selectedAppForBilling)}
                  disabled={processingId === selectedAppForBilling._id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingId === selectedAppForBilling._id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiPlay className="w-4 h-4" />
                  )}
                  Start Billing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && imagePreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowImageModal(false);
            setImagePreview(null);
          }}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => {
                setShowImageModal(false);
                setImagePreview(null);
              }}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <FiX className="w-8 h-8" />
            </button>
            <img
              src={imagePreview}
              alt="ID Document"
              className="w-full h-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              loading="lazy"
              onError={() => {
                toast.error(
                  "Failed to load image. Please check if the file exists.",
                );
                setShowImageModal(false);
                setImagePreview(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Add New Customer
                </h2>
                <p className="text-sm text-gray-500">
                  Create a new fiber internet application
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddCustomerModal(false);
                  resetCustomerForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="p-6 space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiUser className="w-4 h-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={customerForm.firstName}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          firstName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={customerForm.lastName}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          lastName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={customerForm.phoneNumber}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          phoneNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiHome className="w-4 h-4" />
                  Address Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Region
                    </label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Region</option>
                      {regions.map((region) => (
                        <option key={region.code} value={region.code}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province
                    </label>
                    <select
                      value={selectedProvince}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      disabled={!selectedRegion}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    >
                      <option value="">Select Province</option>
                      {provinces.map((province) => (
                        <option key={province.code} value={province.code}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City/Municipality
                    </label>
                    <select
                      value={selectedCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      disabled={!selectedProvince}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    >
                      <option value="">Select City</option>
                      {cities.map((city) => (
                        <option key={city.code} value={city.code}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barangay
                    </label>
                    <select
                      value={selectedBarangay}
                      onChange={(e) => setSelectedBarangay(e.target.value)}
                      disabled={!selectedCity}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                    >
                      <option value="">Select Barangay</option>
                      {barangays.map((barangay, index) => (
                        <option key={index} value={barangay.name}>
                          {barangay.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="House/Unit No., Street, Subdivision"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Building and Unit Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Building & Unit Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Building *
                    </label>
                    <select
                      value={customerForm.buildingId}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          buildingId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="">Select Building</option>
                      {buildings.map((building) => (
                        <option key={building._id} value={building._id}>
                          {building.buildingName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Floor
                    </label>
                    <input
                      type="text"
                      value={customerForm.floor}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          floor: e.target.value,
                        })
                      }
                      placeholder="e.g., 5th Floor"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Number *
                    </label>
                    <input
                      type="text"
                      value={customerForm.unitNumber}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          unitNumber: e.target.value,
                        })
                      }
                      placeholder="e.g., Unit 501"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Plan Selection */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Internet Plan
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Plan *
                  </label>
                  <select
                    value={customerForm.planId}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        planId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select Plan</option>
                    {plans.map((plan) => (
                      <option key={plan._id} value={plan._id}>
                        {plan.name} - ₱{formatPrice(plan.price)}/month
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ID Verification */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FiCreditCard className="w-4 h-4" />
                  ID Verification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID Type *
                    </label>
                    <select
                      value={customerForm.idType}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          idType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="">Select ID Type</option>
                      {ID_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID Number *
                    </label>
                    <input
                      type="text"
                      value={customerForm.idNumber}
                      onChange={(e) =>
                        setCustomerForm({
                          ...customerForm,
                          idNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID Image (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setCustomerForm({
                            ...customerForm,
                            idImage: e.target.files[0],
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload a clear photo of the ID (JPG, PNG, or PDF)
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Additional Notes
                </h3>
                <textarea
                  value={customerForm.notes}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Any additional information or special requests..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    resetCustomerForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiPlus className="w-4 h-4" />
                  )}
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Bulk Upload Customers
                </h2>
                <p className="text-sm text-gray-500">
                  Upload multiple applications via CSV file
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  resetBulkUpload();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <FiFileText className="w-4 h-4" />
                  Instructions
                </h3>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Download the CSV template below</li>
                  <li>
                    Fill in customer data (building name and plan name must
                    exactly match existing records)
                  </li>
                  <li>Upload the completed CSV file</li>
                  <li>
                    System will automatically map building and plan names to IDs
                  </li>
                </ul>
              </div>

              {/* CSV Template Download */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  1. Download Template
                </h3>
                <button
                  onClick={downloadCsvTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <FiDownload className="w-4 h-4" />
                  Download CSV Template
                </button>
              </div>

              {/* CSV File Upload */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  2. Upload CSV File
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    {csvFile ? csvFile.name : "Click or drag CSV file here"}
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer"
                  >
                    <FiUpload className="w-4 h-4" />
                    Select CSV File
                  </label>
                </div>
              </div>

              {/* Bulk Upload Results */}
              {bulkResults && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Upload Results
                  </h3>
                  <div className="space-y-2">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-green-800 font-medium">
                        ✓ Success: {bulkResults.success.length} applications
                      </p>
                      {bulkResults.success.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-green-700 cursor-pointer">
                            View details
                          </summary>
                          <ul className="mt-2 text-sm text-green-600 space-y-1">
                            {bulkResults.success.map((app, idx) => (
                              <li key={idx}>
                                {app.firstName} {app.lastName} - {app.email}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                    {bulkResults.failed.length > 0 && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-red-800 font-medium">
                          ✗ Failed: {bulkResults.failed.length} applications
                        </p>
                        <details className="mt-2">
                          <summary className="text-sm text-red-700 cursor-pointer">
                            View details
                          </summary>
                          <ul className="mt-2 text-sm text-red-600 space-y-1">
                            {bulkResults.failed.map((app, idx) => (
                              <li key={idx}>
                                {app.firstName} {app.lastName} - {app.error}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowBulkUploadModal(false);
                    resetBulkUpload();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={!csvFile || bulkSubmitting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {bulkSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiUpload className="w-4 h-4" />
                  )}
                  Upload and Process
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
