"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
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
  FiClipboard,
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
  { name: "Billing", href: "/admin/billing", icon: FiClipboard },
  { name: "Buildings", href: "/admin/buildings", icon: FiBuilding },
  { name: "Plans", href: "/admin/plans", icon: FiPackage },
];

// Optimized storage wrapper with size checking
const preloadStorage = {
  setItem: (key: string, value: any): boolean => {
    try {
      let dataToStore = value;

      if (key === PRELOAD_CACHE_KEY && value.applications) {
        const limitedApps = value.applications.slice(0, MAX_APPS_TO_STORE);
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);
  const preloadedRef = useRef(false);

  useEffect(() => {
    const savedState = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (savedState !== null) {
      setSidebarCollapsed(savedState === "true");
    }
    setMounted(true);
  }, []);

  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem(SIDEBAR_STATE_KEY, String(newState));
  };

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

  useEffect(() => {
    const preloadApplications = async () => {
      if (!isAuthenticated || !user?.role || preloadedRef.current) return;

      const isAdminUser =
        user.role === "super_admin" ||
        user.role === "admin" ||
        user.role === "staff";
      if (!isAdminUser) return;

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
        preloadedRef.current = true;
        return;
      }

      preloadedRef.current = true;

      try {
        console.log("🔄 Preloading applications data once...");
        const data = await getAllApplications({ page: 1, limit: 100 });
        const applicationsList = data.data || [];

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
      }
    };

    preloadApplications();
  }, [isAuthenticated, user]);

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
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    try {
      await logout();
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
      >
        {sidebarOpen ? (
          <FiX size={22} className="text-gray-400" />
        ) : (
          <FiMenu size={22} className="text-gray-400" />
        )}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-white border-r border-gray-100 ${
          sidebarCollapsed ? "w-20" : "w-72"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div
            className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} px-4 h-24 border-b border-gray-100`}
          >
            {!sidebarCollapsed && (
              <div className="flex justify-center w-full">
                <Image
                  src="/Logo.png"
                  alt="Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center">
                <Image
                  src="/Logo.png"
                  alt="Logo"
                  width={50}
                  height={50}
                  className="object-contain"
                />
              </div>
            )}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200 text-gray-400 hover:text-gray-600"
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
            className={`px-4 py-5 border-b border-gray-100 ${sidebarCollapsed ? "text-center" : ""}`}
          >
            <div
              className={`flex ${sidebarCollapsed ? "flex-col" : "items-center"} gap-3`}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xl">
                  {user?.firstName?.[0] || user?.username?.[0] || "A"}
                </span>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.role === "super_admin"
                      ? "Super Admin"
                      : user?.role === "admin"
                        ? "Admin"
                        : "Staff"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-400">Active</span>
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
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
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
                      <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
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
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "justify-start"} px-3 py-3 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group`}
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
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 lg:px-8">
            <div className="flex items-center lg:hidden">
              <div className="w-8"></div>
            </div>

            <div className="flex-1 flex justify-end items-center space-x-4">
              {/* System Status */}
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-500 font-medium">
                    Online
                  </span>
                </div>
              </div>

              {/* Notifications Dropdown */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-200"
                >
                  <FiBell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-400 text-white text-xs rounded-full flex items-center justify-center shadow-sm px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Panel */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-fadeInDown">
                    <div className="flex justify-between items-center px-5 py-4 bg-gray-50/50 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-700">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FiBell className="w-6 h-6 text-gray-300" />
                          </div>
                          <p className="text-gray-400 text-sm">
                            No new notifications
                          </p>
                          <p className="text-gray-300 text-xs mt-1">
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
                            className={`block px-5 py-3 hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0 ${
                              !notification.read ? "bg-gray-50/30" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-2 h-2 rounded-full mt-2 ${!notification.read ? "bg-gray-500" : "bg-gray-200"}`}
                              ></div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-700 text-sm">
                                  {notification.title}
                                </p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                  {notification.description}
                                </p>
                                <p className="text-gray-300 text-xs mt-1 flex items-center gap-1">
                                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                  {notification.time}
                                </p>
                              </div>
                              {notification.type === "application" && (
                                <div className="w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center">
                                  <span className="text-amber-500 text-xs">
                                    📝
                                  </span>
                                </div>
                              )}
                              {notification.type === "billing" && (
                                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                                  <span className="text-blue-500 text-xs">
                                    ₱
                                  </span>
                                </div>
                              )}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>

                    <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 text-center">
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Badge */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-50 rounded-full">
                <FiActivity className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500 font-medium">
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
