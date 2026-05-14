"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getAllApplications,
  approveApplication,
  rejectApplication,
} from "@/services/admin";
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
} from "react-icons/fi";

// ==================== PERSISTENT STORAGE CONFIGURATION ====================
const STORAGE_KEYS = {
  APPLICATIONS: "misterfyber_applications_data",
  LAST_FETCH: "misterfyber_last_fetch",
  FILTER_STATE: "misterfyber_applications_filter",
  CACHE_VERSION: "misterfyber_cache_v2",
  PRELOAD_CACHE: "misterfyber_preload_applications",
  PRELOAD_TIMESTAMP: "misterfyber_preload_timestamp",
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const PRELOAD_DURATION = 10 * 60 * 1000; // 10 minutes for preload data
const MAX_STORED_APPLICATIONS = 500;

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

// ==================== PERSISTENT STORAGE WRAPPER ====================
const persistentStorage = {
  setItem: (key: string, value: any): boolean => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e: any) {
      if (e.name === "QuotaExceededError") {
        console.error("Storage quota exceeded, clearing old data...");
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
      console.error(`Failed to read ${key} from storage:`, e);
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
      console.log("All persistent storage cleared");
    } catch (e) {}
  },
};

// ==================== COMPONENT ====================
export default function ApplicationsPage() {
  // State
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
  const [filter, setFilter] = useState<FilterState>(() => {
    const savedFilter = persistentStorage.getItem(STORAGE_KEYS.FILTER_STATE);
    return savedFilter || { searchTerm: "", statusFilter: "all" };
  });

  const refreshInProgressRef = useRef(false);
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
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Network disconnected. Viewing cached data.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // CRITICAL: Load from localStorage IMMEDIATELY - Check preload data first
  useEffect(() => {
    const loadStoredData = () => {
      try {
        // FIRST: Check for preloaded data from layout
        const preloadData = persistentStorage.getItem(
          STORAGE_KEYS.PRELOAD_CACHE,
        ) as StoredApplicationsData | null;
        const preloadTimestamp = persistentStorage.getItem(
          STORAGE_KEYS.PRELOAD_TIMESTAMP,
        ) as number | null;

        // SECOND: Check for regular cached data
        const storedData = persistentStorage.getItem(
          STORAGE_KEYS.APPLICATIONS,
        ) as StoredApplicationsData | null;
        const lastFetch = persistentStorage.getItem(STORAGE_KEYS.LAST_FETCH);

        // Use preload data if it's fresh (less than 10 minutes old)
        const isPreloadFresh =
          preloadData &&
          preloadData.applications?.length > 0 &&
          preloadTimestamp &&
          Date.now() - preloadTimestamp < PRELOAD_DURATION;

        // Use regular cached data if available and preload is not fresh
        const isCacheValid =
          storedData &&
          storedData.applications?.length > 0 &&
          Date.now() - storedData.timestamp < CACHE_DURATION;

        if (isPreloadFresh) {
          console.log(
            `📦 INSTANT LOAD from PRELOAD: ${preloadData.applications.length} applications`,
          );
          setApplications(preloadData.applications);
          if (preloadTimestamp) setLastFetchTime(new Date(preloadTimestamp));
          setInitialLoading(false);

          // Check if we need background refresh (preload is older than 5 min but still fresh)
          if (
            preloadTimestamp &&
            Date.now() - preloadTimestamp > 5 * 60 * 1000 &&
            isOnline &&
            !refreshInProgressRef.current
          ) {
            console.log(
              "Preload data is a bit old, refreshing in background...",
            );
            setTimeout(() => silentRefresh(), 1000);
          }
        } else if (isCacheValid) {
          console.log(
            `📦 INSTANT LOAD from CACHE: ${storedData.applications.length} applications`,
          );
          setApplications(storedData.applications);
          if (lastFetch) setLastFetchTime(new Date(lastFetch));
          setInitialLoading(false);

          // Background refresh if cache is old
          const cacheAge = Date.now() - storedData.timestamp;
          if (
            cacheAge > CACHE_DURATION / 2 &&
            isOnline &&
            !refreshInProgressRef.current
          ) {
            console.log("Cache aging, refreshing in background...");
            setTimeout(() => silentRefresh(), 1000);
          }
        } else {
          // No valid cached data, fetch fresh
          console.log("No valid cached data, fetching...");
          fetchApplications();
        }
      } catch (err) {
        console.error("Failed to load from storage:", err);
        fetchApplications();
      }
    };

    loadStoredData();
  }, []); // Empty dependency - runs ONCE on mount

  // Silent refresh - NO LOADING STATE (uses preload cache)
  const silentRefresh = useCallback(async () => {
    if (refreshInProgressRef.current) return;
    refreshInProgressRef.current = true;

    try {
      console.log("🔄 Silent background refresh...");
      const data = await getAllApplications({ page: 1, limit: 100 });
      const applicationsList = data.data || [];

      if (applicationsList.length > 0) {
        setApplications(applicationsList);
        setLastFetchTime(new Date());

        // Update both caches
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

        console.log(
          `✅ Background refresh completed: ${applicationsList.length} applications`,
        );

        // Update pending count in localStorage for layout to read
        const pendingCount = applicationsList.filter(
          (a: any) => a.status === "pending",
        ).length;
        localStorage.setItem(
          "misterfyber_pending_count",
          pendingCount.toString(),
        );
      }
    } catch (error) {
      console.log("Background refresh failed, keeping cached data");
    } finally {
      refreshInProgressRef.current = false;
    }
  }, []);

  // Manual fetch with loading indicator
  const fetchApplications = useCallback(async () => {
    if (refreshInProgressRef.current) return;
    refreshInProgressRef.current = true;
    setRefreshing(true);
    setError(null);

    try {
      console.log("🔄 Manual refresh fetching applications...");
      const data = await getAllApplications({ page: 1, limit: 100 });
      const applicationsList = data.data || [];

      console.log(`✅ Received ${applicationsList.length} applications`);
      setApplications(applicationsList);
      setLastFetchTime(new Date());

      // Save to both storages
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

      // Update pending count for layout
      const pendingCount = applicationsList.filter(
        (a: any) => a.status === "pending",
      ).length;
      localStorage.setItem(
        "misterfyber_pending_count",
        pendingCount.toString(),
      );

      toast.success(`Loaded ${applicationsList.length} applications`);
    } catch (error: any) {
      console.error("Failed to fetch applications:", error);

      // Try to use cached data as fallback
      const storedData = persistentStorage.getItem(STORAGE_KEYS.APPLICATIONS);
      if (storedData?.applications?.length > 0) {
        setApplications(storedData.applications);
        setError(
          `Network error. Showing ${storedData.applications.length} cached applications.`,
        );
        toast.error("Network error, using cached data");
      } else {
        setError("Unable to connect to server. Please check your connection.");
        toast.error("Failed to connect to server");
      }
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      refreshInProgressRef.current = false;
    }
  }, []);

  // Save to preload cache whenever applications change (for layout to use)
  useEffect(() => {
    if (applications.length > 0 && !initialLoading) {
      const dataToStore: StoredApplicationsData = {
        applications: applications.slice(0, MAX_STORED_APPLICATIONS),
        timestamp: Date.now(),
        version: STORAGE_KEYS.CACHE_VERSION,
        totalCount: applications.length,
      };
      persistentStorage.setItem(STORAGE_KEYS.APPLICATIONS, dataToStore);
      persistentStorage.setItem(STORAGE_KEYS.PRELOAD_CACHE, dataToStore);
      persistentStorage.setItem(STORAGE_KEYS.PRELOAD_TIMESTAMP, Date.now());

      // Update pending count for layout badge
      const pendingCount = applications.filter(
        (a: any) => a.status === "pending",
      ).length;
      localStorage.setItem(
        "misterfyber_pending_count",
        pendingCount.toString(),
      );
    }
  }, [applications, initialLoading]);

  // Handle approve
  const handleApprove = async (id: string, adminNotes?: string) => {
    try {
      setProcessingId(id);
      await approveApplication(id, adminNotes);
      toast.success("Application approved successfully");
      await fetchApplications();
      setSelectedApp(null);
    } catch (error: any) {
      console.error("Approve error:", error);
      toast.error(
        error.response?.data?.message || "Failed to approve application",
      );
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
      await fetchApplications();
      setSelectedApp(null);
    } catch (error: any) {
      console.error("Reject error:", error);
      toast.error(
        error.response?.data?.message || "Failed to reject application",
      );
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
      if (!cleanPath.startsWith("uploads/")) cleanPath = `uploads/${cleanPath}`;
      return `${PRODUCTION_URL}/${cleanPath}`;
    },
    [PRODUCTION_URL],
  );

  // Filtered applications
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

  // Get status badge
  const getStatusBadge = useCallback((status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    persistentStorage.clearAll();
    toast.success("Cache cleared");
    setApplications([]);
    setError(null);
    fetchApplications();
  }, [fetchApplications]);

  // Format last fetch time
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

  // Stats
  const stats = useMemo(
    () => ({
      pending: applications.filter((a) => a.status === "pending").length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
      total: applications.length,
    }),
    [applications],
  );

  // Show loading ONLY on first ever load with no data
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
      {/* Header */}
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600">
            Review and manage customer applications
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <FiClock className="w-3 h-3" />
            <span>Last updated: {getLastFetchDisplay()}</span>
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
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium"
                      >
                        <FiEye className="w-4 h-4" />
                        View
                      </button>
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
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
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
                      {selectedApp.phoneNumber}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Address</h3>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-500">Building:</span>{" "}
                    {selectedApp.buildingId?.buildingName || "N/A"}
                  </div>
                  <div>
                    <span className="text-gray-500">Floor:</span>{" "}
                    {selectedApp.floor || "N/A"}
                  </div>
                  <div>
                    <span className="text-gray-500">Unit Number:</span>{" "}
                    {selectedApp.unitNumber || "N/A"}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Plan Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Plan:</span>{" "}
                    {selectedApp.planId?.name}
                  </div>
                  <div>
                    <span className="text-gray-500">Price:</span> ₱
                    {selectedApp.planId?.price}/month
                  </div>
                  <div>
                    <span className="text-gray-500">Speed:</span>{" "}
                    {selectedApp.planId?.speed?.download} Mbps
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-gray-900">
                    ID Verification
                  </h3>
                  {selectedApp.idImage && (
                    <button
                      onClick={() => {
                        const url = getImageUrl(selectedApp.idImage);
                        if (url) {
                          setImagePreview(url);
                          setShowImageModal(true);
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
                    {selectedApp.idType}
                  </div>
                  <div>
                    <span className="text-gray-500">ID Number:</span>{" "}
                    {selectedApp.idNumber}
                  </div>
                </div>
              </div>

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
            />
          </div>
        </div>
      )}
    </div>
  );
}
