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
  FiAlertCircle,
  FiWifiOff,
} from "react-icons/fi";

// Cache configuration
const CACHE_KEY = "applications_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheData {
  applications: any[];
  timestamp: number;
}

interface FilterState {
  searchTerm: string;
  statusFilter: string;
}

// Safe storage wrapper
const safeStorage = {
  setItem: (key: string, value: any): boolean => {
    try {
      const serialized = JSON.stringify(value);
      const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
      if (sizeInMB > 4) {
        console.warn(
          `Data too large (${sizeInMB.toFixed(2)}MB) for cache, skipping`,
        );
        return false;
      }
      localStorage.setItem(key, serialized);
      return true;
    } catch (e: any) {
      if (e.name === "QuotaExceededError") {
        console.error("Storage quota exceeded");
        try {
          localStorage.removeItem(CACHE_KEY);
          localStorage.removeItem("old_applications_cache");
          const smallerData = {
            applications: value.applications.slice(0, 50),
            timestamp: value.timestamp,
          };
          localStorage.setItem(key, JSON.stringify(smallerData));
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
      console.error("Failed to read from storage:", e);
      return null;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  },
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({
    searchTerm: "",
    statusFilter: "all",
  });
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [isWakingBackend, setIsWakingBackend] = useState(false);
  const loadAttempts = useRef(0);

  const PRODUCTION_URL = "https://misterfyberbackend.onrender.com";

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Network connected. Refreshing data...");
      loadApplications(true);
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

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const cachedData = safeStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const isExpired = Date.now() - cachedData.timestamp > CACHE_DURATION;
        if (
          !isExpired &&
          cachedData.applications &&
          cachedData.applications.length > 0
        ) {
          setApplications(cachedData.applications);
          setLoading(false);
          console.log(
            `Loaded ${cachedData.applications.length} applications from cache`,
          );
        }
      }
    } catch (err) {
      console.error("Failed to parse cached data:", err);
      safeStorage.removeItem(CACHE_KEY);
    }

    // Initial load with small delay to let page render
    const timer = setTimeout(() => {
      loadApplications();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Save to localStorage whenever applications update
  const saveToCache = useCallback((apps: any[]) => {
    if (!apps || apps.length === 0) return;
    const cacheData: CacheData = {
      applications: apps,
      timestamp: Date.now(),
    };
    safeStorage.setItem(CACHE_KEY, cacheData);
  }, []);

  // Wake up backend with health check
  const wakeBackend = useCallback(async (): Promise<boolean> => {
    setIsWakingBackend(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        "https://misterfyberbackend.onrender.com/health",
        {
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      const isHealthy = response.ok;
      console.log(
        `Backend health check: ${isHealthy ? "healthy" : "unhealthy"}`,
      );
      return isHealthy;
    } catch (error) {
      console.log("Backend health check failed, may be waking up...");
      return false;
    } finally {
      setIsWakingBackend(false);
    }
  }, []);

  const loadApplications = async (forceRefresh = false) => {
    if (!isOnline && !forceRefresh) {
      const cachedData = safeStorage.getItem(CACHE_KEY);
      if (cachedData?.applications?.length > 0) {
        setApplications(cachedData.applications);
        setError("You are offline. Showing cached data.");
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      loadAttempts.current++;

      // Try to wake backend if this is first attempt or retry
      if (loadAttempts.current === 1 || retryCount > 0) {
        console.log("Checking backend health...");
        await wakeBackend();
        // Wait a bit for backend to wake up
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("Fetching applications from API...");
      const data = await getAllApplications();
      const applicationsList = data.data || [];

      console.log(`Received ${applicationsList.length} applications`);
      setApplications(applicationsList);
      saveToCache(applicationsList);
      setRetryCount(0);
      loadAttempts.current = 0;
    } catch (error: any) {
      console.error("Failed to load applications:", error);

      let errorMessage = "Failed to load applications. ";
      if (!isOnline) {
        errorMessage = "No internet connection. ";
      } else if (
        error.code === "ERR_NETWORK_IO_SUSPENDED" ||
        error.message?.includes("Network Error")
      ) {
        errorMessage = "Backend server is waking up. ";
      } else if (error.code === "ECONNABORTED") {
        errorMessage = "Request timed out. ";
      }

      // Try to load from cache as fallback
      const cachedData = safeStorage.getItem(CACHE_KEY);
      if (cachedData?.applications?.length > 0) {
        setApplications(cachedData.applications);
        errorMessage += `Showing ${cachedData.applications.length} cached applications.`;
        setError(errorMessage);
        toast(errorMessage, { icon: "📦", duration: 4000 });
        setLoading(false);
        return;
      }

      errorMessage += "Please check your connection and try again.";
      setError(errorMessage);

      // Auto retry with exponential backoff (max 5 retries)
      if (retryCount < 5) {
        const delay = Math.min(Math.pow(2, retryCount) * 2000, 30000);
        console.log(
          `Auto-retrying in ${delay / 1000} seconds... (Attempt ${retryCount + 1}/5)`,
        );

        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
          loadApplications(forceRefresh);
        }, delay);
      } else {
        toast.error(
          "Unable to connect after multiple attempts. Please refresh the page.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, adminNotes?: string) => {
    try {
      setProcessingId(id);
      await approveApplication(id, adminNotes);
      toast.success("Application approved successfully");
      await loadApplications(true);
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

  const handleReject = async (id: string, adminNotes?: string) => {
    try {
      setProcessingId(id);
      await rejectApplication(id, adminNotes);
      toast.success("Application rejected");
      await loadApplications(true);
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

  const getImageUrl = useCallback(
    (imagePath: string) => {
      if (!imagePath) return null;
      if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath;
      }
      if (imagePath.startsWith("data:image")) {
        return imagePath;
      }
      let cleanPath = imagePath.replace(/^\/+/, "");
      if (!cleanPath.startsWith("uploads/")) {
        cleanPath = `uploads/${cleanPath}`;
      }
      return `${PRODUCTION_URL}/${cleanPath}`;
    },
    [PRODUCTION_URL],
  );

  const filteredApplications = useMemo(() => {
    if (!applications || applications.length === 0) return [];

    return applications.filter((app: any) => {
      const matchesSearch =
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
    safeStorage.removeItem(CACHE_KEY);
    toast.success("Cache cleared");
    setApplications([]);
    setError(null);
    loadApplications(true);
  }, []);

  // Loading State
  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
          {isWakingBackend && (
            <p className="text-sm text-blue-500 mt-2">
              Waking up backend server...
            </p>
          )}
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Retry attempt {retryCount}/5 (waiting{" "}
              {Math.min(Math.pow(2, retryCount) * 2, 30)}s)...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error State with no cached data
  if (error && applications.length === 0 && !isOnline) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiWifiOff className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No Internet Connection
          </h2>
          <p className="text-gray-600 mb-4">
            Please check your network and try again.
          </p>
          <button
            onClick={() => loadApplications(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (error && applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Backend Waking Up
          </h2>
          <p className="text-gray-600 mb-4">
            The server is starting up. This may take 30-60 seconds.
          </p>
          <div className="space-x-3">
            <button
              onClick={() => loadApplications(true)}
              disabled={isWakingBackend}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isWakingBackend ? "Waking up..." : "Try Again"}
            </button>
            <button
              onClick={clearCache}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="text-gray-600">Review and manage customer applications</p>
      </div>

      {/* Connection Status Banner */}
      {!isOnline && (
        <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-center">
            <FiWifiOff className="w-5 h-5 text-yellow-400 mr-2" />
            <p className="text-sm text-yellow-700">
              You are offline. Showing cached data from last successful load.
            </p>
          </div>
        </div>
      )}

      {error && applications.length > 0 && (
        <div className="mb-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <p className="text-sm text-blue-700">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6">
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
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => loadApplications(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            disabled={loading || isWakingBackend}
          >
            <FiRefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={clearCache}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm text-yellow-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-700">
            {applications.filter((a) => a.status === "pending").length}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600">Approved</div>
          <div className="text-2xl font-bold text-green-700">
            {applications.filter((a) => a.status === "approved").length}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-600">Rejected</div>
          <div className="text-2xl font-bold text-red-700">
            {applications.filter((a) => a.status === "rejected").length}
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application ID
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
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {applications.length === 0 && !loading
                      ? "No applications found"
                      : "No applications match your filters"}
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app: any) => (
                  <tr key={app._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {app.applicationId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.firstName} {app.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                      >
                        <FiEye className="w-4 h-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedApp.status === "pending"
                      ? "Review Application"
                      : "Application Details"}
                  </h2>
                  {selectedApp.status !== "pending" && (
                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedApp.status)}`}
                    >
                      {selectedApp.status.toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>
                      <span className="text-gray-500">Name:</span>{" "}
                      {selectedApp.firstName} {selectedApp.lastName}
                    </p>
                    <p>
                      <span className="text-gray-500">Email:</span>{" "}
                      {selectedApp.email}
                    </p>
                    <p>
                      <span className="text-gray-500">Phone:</span>{" "}
                      {selectedApp.phoneNumber}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
                  <div className="text-sm">
                    <p>
                      <span className="text-gray-500">Building:</span>{" "}
                      {selectedApp.buildingId?.buildingName || "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">Floor:</span>{" "}
                      {selectedApp.floor || "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">Unit Number:</span>{" "}
                      {selectedApp.unitNumber || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Plan Details
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>
                      <span className="text-gray-500">Plan:</span>{" "}
                      {selectedApp.planId?.name}
                    </p>
                    <p>
                      <span className="text-gray-500">Price:</span> ₱
                      {selectedApp.planId?.price}/month
                    </p>
                    <p>
                      <span className="text-gray-500">Speed:</span>{" "}
                      {selectedApp.planId?.speed?.download} Mbps
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900">
                      ID Verification
                    </h3>
                    {selectedApp.idImage && (
                      <button
                        onClick={() => {
                          const imageUrl = getImageUrl(selectedApp.idImage);
                          if (imageUrl) {
                            setImagePreview(imageUrl);
                            setShowImageModal(true);
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        <FiImage className="w-4 h-4" />
                        View ID Image
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>
                      <span className="text-gray-500">ID Type:</span>{" "}
                      {selectedApp.idType}
                    </p>
                    <p>
                      <span className="text-gray-500">ID Number:</span>{" "}
                      {selectedApp.idNumber}
                    </p>
                  </div>
                </div>

                {selectedApp.status === "pending" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin Notes
                      </label>
                      <textarea
                        id="adminNotes"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Add any notes about this application..."
                      />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
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
                          ).value;
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
                          ).value;
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
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && imagePreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => {
            setShowImageModal(false);
            setImagePreview(null);
          }}
        >
          <div className="relative max-w-4xl w-full mx-4">
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
