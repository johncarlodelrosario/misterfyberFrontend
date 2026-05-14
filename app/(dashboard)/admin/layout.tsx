"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  FiHome,
  FiUsers,
  FiUserCheck,
  FiCreditCard,
  FiHome as FiBuilding,
  FiPackage,
  FiLogOut,
  FiMenu,
  FiX,
  FiBell,
  FiDollarSign,
  FiActivity,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { getAllApplications } from "@/services/admin";

// ==================== PRELOAD CACHE CONFIGURATION ====================
const PRELOAD_CACHE_KEY = "misterfyber_preload_applications";
const PRELOAD_TIMESTAMP_KEY = "misterfyber_preload_timestamp";
const SIDEBAR_STATE_KEY = "misterfyber_sidebar_collapsed";
const PRELOAD_DURATION = 10 * 60 * 1000; // 10 minutes

// LIMIT DATA SIZE TO PREVENT QUOTA EXCEEDED
const MAX_APPS_TO_STORE = 50; // Only store 50 applications max
const MAX_DATA_SIZE = 4 * 1024 * 1024; // 4MB limit

interface PreloadData {
  applications: any[];
  timestamp: number;
  version: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  type: "application" | "billing" | "payment" | "system";
  time: string;
  read: boolean;
  link: string;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: FiHome },
  { name: "Users", href: "/admin/users", icon: FiUsers },
  { name: "Applications", href: "/admin/applications", icon: FiUserCheck },
  { name: "Payments", href: "/admin/payments", icon: FiCreditCard },
  { name: "Billing", href: "/admin/billing", icon: FiDollarSign },
  { name: "Buildings", href: "/admin/buildings", icon: FiBuilding },
  { name: "Plans", href: "/admin/plans", icon: FiPackage },
];

// Optimized storage wrapper with size checking
const preloadStorage = {
  setItem: (key: string, value: any): boolean => {
    try {
      // Optimize data before storing
      let dataToStore = value;

      if (key === PRELOAD_CACHE_KEY && value.applications) {
        // Limit number of applications
        const limitedApps = value.applications.slice(0, MAX_APPS_TO_STORE);
        // Remove large fields to save space
        const optimizedApps = limitedApps.map((app: any) => ({
          _id: app._id,
          applicationId: app.applicationId,
          firstName: app.firstName,
          lastName: app.lastName,
          email: app.email,
          status: app.status,
          createdAt: app.createdAt,
          planId: app.planId
            ? { name: app.planId.name, price: app.planId.price }
            : null,
          buildingId: app.buildingId
            ? { buildingName: app.buildingId.buildingName }
            : null,
        }));

        dataToStore = {
          applications: optimizedApps,
          timestamp: value.timestamp,
          version: value.version || "1.0",
        };
      }

      const serialized = JSON.stringify(dataToStore);

      // Check size before storing
      const sizeInBytes = new Blob([serialized]).size;
      if (sizeInBytes > MAX_DATA_SIZE) {
        console.warn(
          `Data too large (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB), skipping storage`,
        );
        return false;
      }

      localStorage.setItem(key, serialized);
      return true;
    } catch (e: any) {
      if (e.name === "QuotaExceededError") {
        console.error("Storage quota exceeded, clearing old data...");
        try {
          localStorage.removeItem(PRELOAD_CACHE_KEY);
          localStorage.removeItem(PRELOAD_TIMESTAMP_KEY);
          // Try again with smaller data
          if (key === PRELOAD_CACHE_KEY && value.applications) {
            const minimalApps = value.applications.slice(0, 25);
            const minimalData = {
              applications: minimalApps.map((app: any) => ({
                _id: app._id,
                applicationId: app.applicationId,
                firstName: app.firstName,
                lastName: app.lastName,
                email: app.email,
                status: app.status,
                createdAt: app.createdAt,
              })),
              timestamp: value.timestamp,
              version: "minimal",
            };
            localStorage.setItem(key, JSON.stringify(minimalData));
            console.log("Stored minimal data (25 items only)");
            return true;
          }
        } catch (retryError) {
          console.error("Still cannot save after cleanup");
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
    } catch (e) {
      console.error("Failed to remove from storage:", e);
    }
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingPlanChanges, setPendingPlanChanges] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (savedState !== null) {
      setSidebarCollapsed(savedState === "true");
    }
    setMounted(true);
  }, []);

  // Save sidebar state
  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem(SIDEBAR_STATE_KEY, String(newState));
  };

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // PRELOAD APPLICATIONS ON LOGIN (Optimized)
  useEffect(() => {
    const preloadApplications = async () => {
      if (!isAuthenticated || !user?.role) return;

      const isAdminUser =
        user.role === "super_admin" ||
        user.role === "admin" ||
        user.role === "staff";
      if (!isAdminUser) return;

      // Check cache first
      const cachedData = preloadStorage.getItem(
        PRELOAD_CACHE_KEY,
      ) as PreloadData | null;
      const cachedTimestamp = preloadStorage.getItem(PRELOAD_TIMESTAMP_KEY) as
        | number
        | null;
      const now = Date.now();
      const hasValidCache =
        cachedData &&
        cachedData.applications?.length > 0 &&
        cachedTimestamp &&
        now - cachedTimestamp < PRELOAD_DURATION;

      if (hasValidCache) {
        console.log(
          `✅ Using cached preload data: ${cachedData.applications.length} applications`,
        );
        const pending = cachedData.applications.filter(
          (app: any) => app.status === "pending",
        ).length;
        setPendingCount(pending);
        return;
      }

      if (isPreloading) return;
      setIsPreloading(true);

      try {
        console.log("🔄 Preloading applications data on login...");
        const data = await getAllApplications({ page: 1, limit: 100 });
        const applicationsList = data.data || [];

        // Store optimized data
        preloadStorage.setItem(PRELOAD_CACHE_KEY, {
          applications: applicationsList,
          timestamp: now,
          version: "1.0",
        });
        preloadStorage.setItem(PRELOAD_TIMESTAMP_KEY, now);

        const pending = applicationsList.filter(
          (app: any) => app.status === "pending",
        ).length;
        setPendingCount(pending);

        console.log(
          `✅ Preloaded ${applicationsList.length} applications (${pending} pending)`,
        );
      } catch (error) {
        console.error("Failed to preload applications:", error);
      } finally {
        setIsPreloading(false);
      }
    };

    preloadApplications();
  }, [isAuthenticated, user, isPreloading]);

  // Generate notifications
  const generateNotifications = useCallback(() => {
    const newNotifications: Notification[] = [];

    if (pendingCount > 0) {
      newNotifications.push({
        id: "pending-apps",
        title: "Pending Applications",
        description: `${pendingCount} application${pendingCount > 1 ? "s" : ""} awaiting review`,
        type: "application",
        time: "Now",
        read: false,
        link: "/admin/applications",
      });
    }

    if (pendingPlanChanges > 0) {
      newNotifications.push({
        id: "plan-changes",
        title: "Plan Change Requests",
        description: `${pendingPlanChanges} customer${pendingPlanChanges > 1 ? "s" : ""} requested plan change`,
        type: "billing",
        time: "Now",
        read: false,
        link: "/admin/billing",
      });
    }

    setNotifications(newNotifications);
    setUnreadCount(newNotifications.length);
  }, [pendingCount, pendingPlanChanges]);

  useEffect(() => {
    generateNotifications();
  }, [generateNotifications]);

  // Auth check
  useEffect(() => {
    if (!isLoading && mounted) {
      const isAdminUser =
        user !== null &&
        (user.role === "super_admin" ||
          user.role === "admin" ||
          user.role === "staff");

      if (!isAuthenticated) {
        router.push("/login");
      } else if (!isAdminUser && user) {
        router.push("/user/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, user, router, mounted]);

  // Fetch pending plan changes count
  useEffect(() => {
    const fetchPendingPlanChanges = async () => {
      if (!isAuthenticated || !user?.role) return;

      try {
        const { getAllBillingCycles } = await import("@/services/admin");
        const cyclesData = await getAllBillingCycles({ limit: 100 }).catch(
          () => ({ data: [] }),
        );

        const pendingChanges =
          cyclesData.data?.filter(
            (cycle: any) => cycle.pendingPlanChange?.status === "pending",
          ).length || 0;
        setPendingPlanChanges(pendingChanges);
      } catch (error) {
        console.error("Failed to fetch pending plan changes:", error);
      }
    };

    fetchPendingPlanChanges();
    const interval = setInterval(fetchPendingPlanChanges, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    try {
      await logout();
      // Clear all storage on logout
      preloadStorage.removeItem(PRELOAD_CACHE_KEY);
      preloadStorage.removeItem(PRELOAD_TIMESTAMP_KEY);
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.success("All notifications marked as read");
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const isAdminUser =
    user !== null &&
    (user.role === "super_admin" ||
      user.role === "admin" ||
      user.role === "staff");
  if (!isAdminUser) return null;

  const totalNotifications = pendingCount + pendingPlanChanges;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
      >
        {sidebarOpen ? (
          <FiX size={22} className="text-gray-600" />
        ) : (
          <FiMenu size={22} className="text-gray-600" />
        )}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden backdrop-blur-sm transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-gradient-to-b from-blue-800 to-blue-900 text-white shadow-2xl ${
          sidebarCollapsed ? "w-20" : "w-72"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div
            className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} px-4 h-20 border-b border-blue-700/50`}
          >
            {!sidebarCollapsed && (
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  MisterFyber
                </h1>
                <p className="text-xs text-blue-300 mt-0.5">Admin Panel</p>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">MF</span>
              </div>
            )}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-blue-700/50 hover:bg-blue-600 transition-all duration-200"
            >
              {sidebarCollapsed ? (
                <FiChevronRight size={18} />
              ) : (
                <FiChevronLeft size={18} />
              )}
            </button>
          </div>

          {/* User Info */}
          <div
            className={`px-4 py-5 border-b border-blue-700/50 ${sidebarCollapsed ? "text-center" : ""}`}
          >
            <div
              className={`flex ${sidebarCollapsed ? "flex-col" : "items-center"} gap-3`}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-blue-400/30">
                <span className="text-white font-bold text-xl">
                  {user?.firstName?.[0] || user?.username?.[0] || "A"}
                </span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-blue-300 truncate">
                    {user?.role === "super_admin"
                      ? "Super Admin"
                      : user?.role === "admin"
                        ? "Admin"
                        : "Staff"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-300">Active</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 overflow-y-auto">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);
                const showBadge =
                  (item.name === "Applications" && pendingCount > 0) ||
                  (item.name === "Billing" && pendingPlanChanges > 0);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} px-3 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? "bg-blue-700 text-white shadow-lg"
                        : "text-blue-200 hover:bg-blue-700/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={`${sidebarCollapsed ? "w-6 h-6" : "w-5 h-5 mr-3"} transition-all`}
                      />
                      {!sidebarCollapsed && (
                        <span className="text-sm font-medium">{item.name}</span>
                      )}
                    </div>
                    {!sidebarCollapsed && showBadge && (
                      <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold shadow-sm">
                        {item.name === "Applications"
                          ? pendingCount
                          : pendingPlanChanges}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-blue-700/50 space-y-2">
            {isPreloading && (
              <div
                className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-center"} px-3 py-2 mb-2`}
              >
                <div className="w-5 h-5 border-2 border-blue-300 border-t-white rounded-full animate-spin"></div>
                {!sidebarCollapsed && (
                  <span className="text-xs text-blue-300 ml-2">Syncing...</span>
                )}
              </div>
            )}

            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "justify-start"} px-3 py-3 text-sm text-red-300 hover:bg-red-600 hover:text-white rounded-xl transition-all duration-200 group`}
              title="Logout"
            >
              <FiLogOut
                className={`${sidebarCollapsed ? "w-5 h-5" : "w-5 h-5 mr-3"} group-hover:rotate-180 transition-transform duration-300`}
              />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"} min-h-screen`}
      >
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-20 border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 lg:px-8">
            <div className="flex items-center lg:hidden">
              <div className="w-8"></div>
            </div>

            <div className="flex-1 flex justify-end items-center space-x-4">
              {/* System Status */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-medium">
                    Online
                  </span>
                </div>
              </div>

              {/* Notifications Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200"
                >
                  <FiBell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse shadow-md px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Panel */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fadeInDown">
                    <div className="flex justify-between items-center px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiBell className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500 text-sm">
                            No new notifications
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            All caught up!
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <Link
                            key={notification.id}
                            href={notification.link}
                            onClick={() => {
                              setShowNotifications(false);
                              if (!notification.read) {
                                setNotifications((prev) =>
                                  prev.map((n) =>
                                    n.id === notification.id
                                      ? { ...n, read: true }
                                      : n,
                                  ),
                                );
                                setUnreadCount((prev) => Math.max(0, prev - 1));
                              }
                            }}
                            className={`block px-5 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                              !notification.read ? "bg-blue-50/30" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-2 h-2 rounded-full mt-2 ${!notification.read ? "bg-blue-500" : "bg-gray-300"}`}
                              ></div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">
                                  {notification.title}
                                </p>
                                <p className="text-gray-500 text-xs mt-0.5">
                                  {notification.description}
                                </p>
                                <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                  {notification.time}
                                </p>
                              </div>
                              {notification.type === "application" && (
                                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                  <span className="text-yellow-600 text-xs">
                                    📝
                                  </span>
                                </div>
                              )}
                              {notification.type === "billing" && (
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 text-xs">
                                    💰
                                  </span>
                                </div>
                              )}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>

                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-center">
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Badge */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full">
                <FiActivity className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">
                  {user?.role === "super_admin"
                    ? "Super Admin"
                    : user?.role === "admin"
                      ? "Admin"
                      : "Staff"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInDown {
          animation: fadeInDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
