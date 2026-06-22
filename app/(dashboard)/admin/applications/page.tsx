"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getAllApplications,
  approveApplication,
  rejectApplication,
} from "@/services/admin";
import { startBillingForApplication } from "@/services/billing";
import {
  submitApplication,
  getActiveBuildings,
  Building,
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
  FiUser,
  FiCreditCard,
  FiPlus,
  FiUpload,
  FiDownload,
  FiFileText,
  FiWifi,
  FiEdit2,
  FiSave,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

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

const CACHE_DURATION = 60 * 60 * 1000;
const MAX_STORED_APPLICATIONS = 500;
const CHECK_INTERVAL = 15000;
const ITEMS_PER_PAGE = 20;

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

const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null || isNaN(price)) {
    return "0.00";
  }
  return price.toFixed(2);
};

const getSpeed = (plan: any): string => {
  if (!plan) return "N/A";
  if (plan.speed?.download) return `${plan.speed.download} Mbps`;
  if (plan.speed) return `${plan.speed} Mbps`;
  return "N/A";
};

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
  const [editingMacAddress, setEditingMacAddress] = useState<string | null>(
    null,
  );
  const [tempMacAddress, setTempMacAddress] = useState("");

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // State to track if table is fully visible
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    macAddress: "",
    idImage: null as File | null,
  });

  const refreshInProgressRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const PRODUCTION_URL = "https://misterfyberbackend.onrender.com";

  // Table scroll controls - using ref for the table container
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Check if sidebar is open
  useEffect(() => {
    const checkSidebar = () => {
      const sidebar = document.querySelector("aside");
      if (sidebar) {
        const isOpen =
          !sidebar.classList.contains("hidden") &&
          sidebar.classList.contains("translate-x-0");
        setSidebarOpen(isOpen);
      }
    };

    checkSidebar();
    window.addEventListener("resize", checkSidebar);

    // Observe sidebar changes
    const observer = new MutationObserver(checkSidebar);
    const sidebar = document.querySelector("aside");
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => {
      window.removeEventListener("resize", checkSidebar);
      observer.disconnect();
    };
  }, []);

  const checkTableScroll = useCallback(() => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        tableContainerRef.current;
      setShowLeftButton(scrollLeft > 10);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  // Check scroll on mount and resize
  useEffect(() => {
    const checkScroll = () => {
      checkTableScroll();
    };

    checkScroll();
    window.addEventListener("resize", checkScroll);

    const observer = new ResizeObserver(checkScroll);
    if (tableContainerRef.current) {
      observer.observe(tableContainerRef.current);
    }

    return () => {
      window.removeEventListener("resize", checkScroll);
      observer.disconnect();
    };
  }, [checkTableScroll]);

  const scrollTableLeft = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: -300, behavior: "smooth" });
      setTimeout(checkTableScroll, 300);
    }
  };

  const scrollTableRight = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollBy({ left: 300, behavior: "smooth" });
      setTimeout(checkTableScroll, 300);
    }
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter.searchTerm, filter.statusFilter]);

  useEffect(() => {
    persistentStorage.setItem(STORAGE_KEYS.FILTER_STATE, filter);
  }, [filter]);

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

  useEffect(() => {
    if (showAddCustomerModal) {
      loadBuildingsAndPlans();
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

  const quickRefresh = useCallback(async () => {
    if (refreshInProgressRef.current) return;

    try {
      console.log("⚡ Quick refresh after adding customer...");
      const data = await getAllApplications({ page: 1, limit: 100 });
      const applicationsList = data.data || [];

      setApplications(applicationsList);
      setLastFetchTime(new Date());

      setTimeout(() => {
        const dataToStore: StoredApplicationsData = {
          applications: applicationsList.slice(0, MAX_STORED_APPLICATIONS),
          timestamp: Date.now(),
          version: STORAGE_KEYS.CACHE_VERSION,
          totalCount: applicationsList.length,
        };
        persistentStorage.setItem(STORAGE_KEYS.APPLICATIONS, dataToStore);
        persistentStorage.setItem(STORAGE_KEYS.PRELOAD_CACHE, dataToStore);

        const total = applicationsList.length;
        const pending = applicationsList.filter(
          (a: any) => a.status === "pending",
        ).length;
        persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_TOTAL, total);
        persistentStorage.setItem(STORAGE_KEYS.LAST_KNOWN_PENDING, pending);
      }, 100);
    } catch (error) {
      console.error("Quick refresh failed:", error);
    }
  }, []);

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

  const fetchFullApplicationDetails = async (appId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${PRODUCTION_URL}/api/applications/${appId}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        },
      );
      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch application details:", error);
      return null;
    }
  };

  const handleViewApplication = async (app: any) => {
    const loadingToast = toast.loading("Loading application details...");

    try {
      const fullDetails = await fetchFullApplicationDetails(app._id);
      toast.dismiss(loadingToast);

      if (fullDetails) {
        setSelectedApp(fullDetails);
      } else {
        setSelectedApp(app);
        toast.error("Could not load full details, showing partial data");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      setSelectedApp(app);
      toast.error("Error loading details");
    }
  };

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
      setTimeout(() => quickRefresh(), 500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve");
    } finally {
      setProcessingId(null);
    }
  };

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
      setTimeout(() => quickRefresh(), 500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject");
    } finally {
      setProcessingId(null);
    }
  };

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
        setTimeout(() => quickRefresh(), 500);
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

  const handleUpdateMacAddress = async (
    applicationId: string,
    macAddress: string,
  ) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${PRODUCTION_URL}/api/applications/${applicationId}/mac-address`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ macAddress }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        setApplications((prev) =>
          prev.map((app) =>
            app._id === applicationId
              ? { ...app, macAddress: result.data?.macAddress || macAddress }
              : app,
          ),
        );
        toast.success("MAC address updated successfully");
      } else {
        toast.error("Failed to update MAC address");
      }
    } catch (error) {
      toast.error("Error updating MAC address");
    } finally {
      setEditingMacAddress(null);
      setTempMacAddress("");
    }
  };

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
        app.email?.toLowerCase().includes(filter.searchTerm.toLowerCase()) ||
        (app.macAddress &&
          app.macAddress
            .toLowerCase()
            .includes(filter.searchTerm.toLowerCase()));
      const matchesStatus =
        filter.statusFilter === "all" || app.status === filter.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, filter.searchTerm, filter.statusFilter]);

  // Pagination calculations
  const totalPages = useMemo(() => {
    return Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);
  }, [filteredApplications.length]);

  const currentApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredApplications.slice(startIndex, endIndex);
  }, [filteredApplications, currentPage]);

  // Check scroll when data changes - moved AFTER currentApplications is declared
  useEffect(() => {
    setTimeout(checkTableScroll, 100);
  }, [currentApplications, checkTableScroll]);

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
      macAddress: "",
      idImage: null,
    });
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
      const result = await submitApplication(customerForm as any);

      if (result.success && result.data) {
        const newApplication = result.data;
        setApplications((prev) => [newApplication, ...prev]);

        toast.success(
          `✅ Customer ${customerForm.firstName} ${customerForm.lastName} added successfully!`,
        );
        setShowAddCustomerModal(false);
        resetCustomerForm();

        setTimeout(() => {
          quickRefresh();
        }, 1000);
      } else {
        toast.error(result.message || "Failed to submit application");
      }
    } catch (error: any) {
      console.error("Failed to submit application:", error);
      toast.error(
        error.response?.data?.message || "Failed to submit application",
      );
    } finally {
      setSubmitting(false);
    }
  };

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
      "macAddress",
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
      "AA:BB:CC:DD:EE:FF",
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

          const applicationsList: any[] = [];

          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = parseCSVLine(lines[i]);
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index]?.trim() || "";
            });

            const buildingId = buildingMap.get(
              row.buildingName?.toLowerCase().trim(),
            );
            if (!buildingId) {
              console.warn(`Building not found: ${row.buildingName}`);
              continue;
            }

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

            applicationsList.push({
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
              macAddress: row.macAddress || "",
            });
          }

          resolve(applicationsList);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleBulkUpload = async () => {
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setBulkSubmitting(true);
    setBulkResults(null);

    try {
      const applicationsList = await parseCsvAndPrepareData(csvFile);

      if (applicationsList.length === 0) {
        toast.error("No valid applications found in CSV");
        setBulkSubmitting(false);
        return;
      }

      const success: any[] = [];
      const failed: any[] = [];

      for (let i = 0; i < applicationsList.length; i++) {
        const app = applicationsList[i];
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
        setTimeout(() => quickRefresh(), 1000);
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
    <div className="px-2 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 max-w-full overflow-x-hidden relative">
      {hasNewApplicant && (
        <div className="mb-3 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-3 rounded-lg shadow-md animate-pulse">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <FiBell className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <p className="font-bold text-green-800 text-xs sm:text-sm">
                🆕 New Applicant{newApplicantCount > 1 ? "s" : ""} Detected!
              </p>
              <p className="text-xs text-green-700">
                {newApplicantCount} new applicant
                {newApplicantCount > 1 ? "s have" : " has"} been added. Page is
                automatically refreshing...
              </p>
            </div>
            <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">
            Applications
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Review and manage customer applications
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              resetCustomerForm();
              setShowAddCustomerModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm"
          >
            <FiPlus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Add Customer</span>
            <span className="xs:hidden">Add</span>
          </button>

          <button
            onClick={() => {
              resetBulkUpload();
              setShowBulkUploadModal(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm"
          >
            <FiUpload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bulk Upload</span>
            <span className="sm:hidden">Bulk</span>
          </button>

          <div className="hidden lg:flex text-xs text-gray-500 items-center gap-1">
            <FiClock className="w-3 h-3" />
            <span>Auto: 15s | Last: {getLastFetchDisplay()}</span>
          </div>

          <button
            onClick={() => fetchApplications()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-xs sm:text-sm"
          >
            <FiRefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden xs:inline">
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
            <span className="xs:hidden">
              <FiRefreshCw className="w-3.5 h-3.5" />
            </span>
          </button>

          <button
            onClick={clearCache}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm"
          >
            <FiDatabase className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Cache</span>
          </button>
        </div>
      </div>

      {!isOnline && (
        <div className="mb-3 bg-yellow-50 border-l-4 border-yellow-400 p-2 rounded">
          <div className="flex items-center gap-2">
            <FiWifiOff className="w-3.5 h-3.5 text-yellow-400" />
            <p className="text-xs text-yellow-700">
              Offline mode - showing cached data
            </p>
          </div>
        </div>
      )}

      {error && applications.length > 0 && (
        <div className="mb-3 bg-blue-50 border-l-4 border-blue-400 p-2 rounded">
          <p className="text-xs text-blue-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 rounded-md p-2 border border-yellow-200">
          <div className="text-xs text-yellow-600">Pending</div>
          <div className="text-lg font-bold text-yellow-700">
            {stats.pending}
          </div>
        </div>
        <div className="bg-green-50 rounded-md p-2 border border-green-200">
          <div className="text-xs text-green-600">Approved</div>
          <div className="text-lg font-bold text-green-700">
            {stats.approved}
          </div>
        </div>
        <div className="bg-red-50 rounded-md p-2 border border-red-200">
          <div className="text-xs text-red-600">Rejected</div>
          <div className="text-lg font-bold text-red-700">{stats.rejected}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-2 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Search by ID, name, email, or MAC..."
              value={filter.searchTerm}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, searchTerm: e.target.value }))
              }
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={filter.statusFilter}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, statusFilter: e.target.value }))
            }
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status ({stats.total})</option>
            <option value="pending">Pending ({stats.pending})</option>
            <option value="approved">Approved ({stats.approved})</option>
            <option value="rejected">Rejected ({stats.rejected})</option>
          </select>
        </div>
      </div>

      {/* Table with scroll buttons */}
      <div className="relative">
        {/* Left Scroll Button - Only show when table is not fully visible */}
        {showLeftButton && (
          <button
            onClick={scrollTableLeft}
            className="fixed top-1/2 transform -translate-y-1/2 z-40 bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 hover:scale-105"
            aria-label="Scroll table left"
            style={{
              boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
              left: sidebarOpen ? "265px" : "12px",
            }}
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Right Scroll Button - Only show when table is not fully visible */}
        {showRightButton && (
          <button
            onClick={scrollTableRight}
            className="fixed right-3 top-1/2 transform -translate-y-1/2 z-40 bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 hover:scale-105"
            aria-label="Scroll table right"
            style={{
              boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            }}
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        )}

        <div
          ref={tableContainerRef}
          className="bg-white rounded-md border border-gray-200 overflow-x-auto shadow-sm scroll-smooth"
          style={{
            scrollbarWidth: "thin",
            msOverflowStyle: "none",
          }}
          onScroll={checkTableScroll}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              height: 6px;
            }
            div::-webkit-scrollbar-track {
              background: #f1f1f1;
              border-radius: 10px;
            }
            div::-webkit-scrollbar-thumb {
              background: #c1c1c1;
              border-radius: 10px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #a8a8a8;
            }
          `}</style>
          <table className="min-w-[950px] w-full border-collapse">
            <thead>
              <tr className="bg-[#f0f0f0] border-b border-gray-300">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300 w-[50px]">
                  #
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">
                  ID
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">
                  Email
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">
                  Plan
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">
                  MAC Address
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentApplications.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-500 text-sm"
                  >
                    {applications.length === 0
                      ? "No applications found"
                      : "No applications match your filters"}
                  </td>
                </tr>
              ) : (
                currentApplications.map((app: any, idx: number) => {
                  const globalIndex =
                    (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                  return (
                    <tr
                      key={app._id}
                      className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"}`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 border-r border-gray-100 text-center">
                        {globalIndex}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-900 border-r border-gray-100">
                        {app.applicationId}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 border-r border-gray-100">
                        {app.firstName} {app.lastName}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 border-r border-gray-100">
                        {app.email}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 border-r border-gray-100">
                        {app.planId?.name || "N/A"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-mono border-r border-gray-100">
                        {editingMacAddress === app._id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tempMacAddress}
                              onChange={(e) =>
                                setTempMacAddress(e.target.value)
                              }
                              className="w-28 px-1.5 py-0.5 text-xs border border-gray-300 rounded font-mono"
                              placeholder="AA:BB:CC:DD:EE:FF"
                              autoFocus
                            />
                            <button
                              onClick={() =>
                                handleUpdateMacAddress(app._id, tempMacAddress)
                              }
                              className="text-green-600 hover:text-green-800"
                            >
                              <FiSave className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMacAddress(null);
                                setTempMacAddress("");
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FiX className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">
                              {app.macAddress || "—"}
                            </span>
                            <button
                              onClick={() => {
                                setEditingMacAddress(app._id);
                                setTempMacAddress(app.macAddress || "");
                              }}
                              className="text-gray-400 hover:text-blue-600"
                              title="Edit MAC Address"
                            >
                              <FiEdit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap border-r border-gray-100">
                        <span
                          className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(app.status)}`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 border-r border-gray-100">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewApplication(app)}
                            className="text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium"
                          >
                            <FiEye className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline">View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="px-3 py-1.5 bg-[#f0f0f0] border-t border-gray-300 text-xs text-gray-600 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
              {Math.min(
                currentPage * ITEMS_PER_PAGE,
                filteredApplications.length,
              )}{" "}
              of {filteredApplications.length} applications
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1"
              >
                <FiChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <span className="text-xs text-gray-700">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2.5 py-1 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1"
              >
                Next
                <FiChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-lg font-bold">
                  {selectedApp.status === "pending"
                    ? "Review Application"
                    : "Application Details"}
                </h2>
                <p className="text-xs text-gray-500 font-mono">
                  {selectedApp.applicationId}
                </p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                  <FiUser className="w-4 h-4" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
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
                  <div>
                    <span className="text-gray-500">MAC Address:</span>{" "}
                    <span className="font-mono font-medium">
                      {selectedApp.macAddress || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                  Building & Unit Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Building:</span>{" "}
                    <span className="font-medium">
                      {selectedApp.buildingId?.buildingName ||
                        selectedApp.buildingName ||
                        "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Floor:</span>{" "}
                    <span className="font-medium">
                      {selectedApp.floor || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Unit Number:</span>{" "}
                    <span className="font-medium">
                      {selectedApp.unitNumber || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                  Plan Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
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

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <FiCreditCard className="w-4 h-4" />
                    ID Verification
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">ID Type:</span>{" "}
                    {selectedApp.idType &&
                    selectedApp.idType !== "undefined" &&
                    selectedApp.idType !== "Not Provided"
                      ? selectedApp.idType
                      : "Not provided"}
                  </div>
                  <div>
                    <span className="text-gray-500">ID Number:</span>{" "}
                    {selectedApp.idNumber &&
                    selectedApp.idNumber !== "undefined" &&
                    selectedApp.idNumber !== "Not Provided"
                      ? selectedApp.idNumber
                      : "Not provided"}
                  </div>
                </div>
                {selectedApp.idImage &&
                  selectedApp.idImage !== "uploads/id-cards/placeholder.jpg" &&
                  selectedApp.idImage !== "" && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">
                        ID Image:
                      </div>
                      <div
                        className="relative border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => {
                          const url = getImageUrl(selectedApp.idImage);
                          if (url) {
                            setImagePreview(url);
                            setShowImageModal(true);
                          } else {
                            toast.error("Could not load image URL");
                          }
                        }}
                      >
                        <img
                          src={getImageUrl(selectedApp.idImage) || ""}
                          alt="ID Document"
                          className="w-full max-h-48 object-contain bg-gray-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                          <FiImage className="w-3 h-3" />
                          Enlarge
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {selectedApp.adminNotes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">
                    Admin Notes
                  </h3>
                  <p className="text-xs text-gray-700">
                    {selectedApp.adminNotes}
                  </p>
                </div>
              )}

              {selectedApp.notes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">
                    Customer Notes
                  </h3>
                  <p className="text-xs text-gray-700">{selectedApp.notes}</p>
                </div>
              )}

              {selectedApp.status === "pending" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      id="adminNotes"
                      rows={2}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Add notes about this application..."
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => setSelectedApp(null)}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-xs"
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
                      className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50 text-xs"
                    >
                      {processingId === selectedApp._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiX className="w-3.5 h-3.5" />
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
                      className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50 text-xs"
                    >
                      {processingId === selectedApp._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FiCheck className="w-3.5 h-3.5" />
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

      {showBillingModal && selectedAppForBilling && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg max-w-md w-full p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-gray-900">Start Billing</h2>
              <button
                onClick={() => {
                  setShowBillingModal(false);
                  setSelectedAppForBilling(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="bg-blue-50 p-2 rounded-md">
                <p className="text-xs text-blue-800">
                  <strong>Customer:</strong> {selectedAppForBilling.firstName}{" "}
                  {selectedAppForBilling.lastName}
                </p>
                <p className="text-xs text-blue-800">
                  <strong>Email:</strong> {selectedAppForBilling.email}
                </p>
                <p className="text-xs text-blue-800 font-mono">
                  <strong>App ID:</strong> {selectedAppForBilling.applicationId}
                </p>
                <p className="text-xs text-blue-800">
                  <strong>Plan:</strong>{" "}
                  {selectedAppForBilling.planId?.name || "N/A"} - ₱
                  {selectedAppForBilling.planId?.price || 0}/month
                </p>
                {selectedAppForBilling.macAddress && (
                  <p className="text-xs text-blue-800 font-mono">
                    <strong>MAC:</strong> {selectedAppForBilling.macAddress}
                  </p>
                )}
              </div>
              <div className="bg-yellow-50 p-2 rounded-md">
                <p className="text-xs text-yellow-800">
                  ⚠️ Starting billing will:
                </p>
                <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                  <li>Generate pro-rated bill</li>
                  <li>Send invoice to customer</li>
                  <li>Create billing cycle</li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-3">
                <button
                  onClick={() => {
                    setShowBillingModal(false);
                    setSelectedAppForBilling(null);
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleStartBilling(selectedAppForBilling)}
                  disabled={processingId === selectedAppForBilling._id}
                  className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs"
                >
                  {processingId === selectedAppForBilling._id ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiPlay className="w-3.5 h-3.5" />
                  )}
                  Start Billing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              className="absolute -top-8 right-0 text-white hover:text-gray-300"
            >
              <FiX className="w-6 h-6" />
            </button>
            <img
              src={imagePreview}
              alt="ID Document"
              className="w-full h-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              loading="lazy"
              onError={() => {
                toast.error("Failed to load image.");
                setShowImageModal(false);
                setImagePreview(null);
              }}
            />
          </div>
        </div>
      )}

      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Add New Customer
                </h2>
                <p className="text-xs text-gray-500">
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
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomerSubmit} className="p-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-1.5 text-sm">
                  <FiUser className="w-4 h-4" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                  Building & Unit
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select Building</option>
                      {buildings.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.buildingName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                  Internet Plan
                </h3>
                <select
                  value={customerForm.planId}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, planId: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select Plan</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} - ₱{formatPrice(p.price)}/month
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-1.5 text-sm">
                  <FiWifi className="w-4 h-4" /> Network Config
                </h3>
                <input
                  type="text"
                  value={customerForm.macAddress}
                  onChange={(e) =>
                    setCustomerForm({
                      ...customerForm,
                      macAddress: e.target.value,
                    })
                  }
                  placeholder="MAC Address (optional)"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md font-mono"
                />
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-1.5 text-sm">
                  <FiCreditCard className="w-4 h-4" /> ID Verification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select ID Type</option>
                      {ID_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
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
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-0.5">
                      ID Image (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0])
                          setCustomerForm({
                            ...customerForm,
                            idImage: e.target.files[0],
                          });
                      }}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                  Additional Notes
                </h3>
                <textarea
                  value={customerForm.notes}
                  onChange={(e) =>
                    setCustomerForm({ ...customerForm, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
                  placeholder="Any additional information..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    resetCustomerForm();
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50 text-xs"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiPlus className="w-3.5 h-3.5" />
                  )}{" "}
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Bulk Upload Customers</h2>
                <p className="text-xs text-gray-500">
                  Upload multiple applications via CSV
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  resetBulkUpload();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 p-3 rounded-md">
                <h3 className="font-semibold text-blue-800 mb-1 flex items-center gap-1 text-sm">
                  <FiFileText className="w-4 h-4" /> Instructions
                </h3>
                <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
                  <li>
                    Download template, fill data (building/plan names must
                    match)
                  </li>
                  <li>MAC address optional</li>
                  <li>Upload completed CSV</li>
                </ul>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <h3 className="font-semibold mb-2 text-sm">
                  1. Download Template
                </h3>
                <button
                  onClick={downloadCsvTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded-md text-xs"
                >
                  <FiDownload className="w-3.5 h-3.5" /> Download Template
                </button>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <h3 className="font-semibold mb-2 text-sm">2. Upload CSV</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                  <FiUpload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-600 mb-1">
                    {csvFile ? csvFile.name : "Click or drag CSV"}
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="hidden"
                    id="csv-upload-bulk"
                  />
                  <label
                    htmlFor="csv-upload-bulk"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md cursor-pointer text-xs"
                  >
                    <FiUpload className="w-3.5 h-3.5" /> Select File
                  </label>
                </div>
              </div>
              {bulkResults && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <h3 className="font-semibold mb-2 text-sm">Results</h3>
                  <div className="space-y-2">
                    <div className="bg-green-50 p-2 rounded">
                      <p className="text-green-800 font-medium text-xs">
                        ✓ Success: {bulkResults.success.length}
                      </p>
                      {bulkResults.success.length > 0 && (
                        <details>
                          <summary className="text-xs text-green-700 cursor-pointer">
                            Details
                          </summary>
                          <ul className="mt-1 text-xs">
                            {bulkResults.success.map((a, i) => (
                              <li key={i}>
                                {a.firstName} {a.lastName}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                    {bulkResults.failed.length > 0 && (
                      <div className="bg-red-50 p-2 rounded">
                        <p className="text-red-800 font-medium text-xs">
                          ✗ Failed: {bulkResults.failed.length}
                        </p>
                        <details>
                          <summary className="text-xs text-red-700 cursor-pointer">
                            Details
                          </summary>
                          <ul className="mt-1 text-xs">
                            {bulkResults.failed.map((a, i) => (
                              <li key={i}>
                                {a.firstName} {a.lastName} - {a.error}
                              </li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  onClick={() => {
                    setShowBulkUploadModal(false);
                    resetBulkUpload();
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 text-xs"
                >
                  Close
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={!csvFile || bulkSubmitting}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-md flex items-center gap-1.5 disabled:opacity-50 text-xs"
                >
                  {bulkSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FiUpload className="w-3.5 h-3.5" />
                  )}{" "}
                  Process
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
