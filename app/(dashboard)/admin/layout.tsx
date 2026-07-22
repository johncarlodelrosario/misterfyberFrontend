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
  FiTrendingUp,
  FiCalendar,
  FiSettings,
  FiHelpCircle,
  FiMail,
  FiFileText,
  FiMail as FiEmailIcon,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { getAllApplications } from "@/services/admin";
import {
  getCustomerEmailAlertsPreference,
  toggleCustomerEmailAlerts,
} from "@/services/admin";
import invoiceService from "@/services/invoiceService";

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
  type: "application" | "billing" | "payment" | "system" | "invoice";
  time: string;
  read: boolean;
  link: string;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: FiHome },
  { name: "Applications", href: "/admin/applications", icon: FiUserCheck },
  { name: "Payments", href: "/admin/payments", icon: FiCreditCard },
  { name: "Billing", href: "/admin/billing", icon: FiClipboard },
  { name: "Invoices", href: "/admin/invoice", icon: FiFileText },
  { name: "Manual Email", href: "/admin/manual-email", icon: FiMail },
  { name: "Buildings", href: "/admin/buildings", icon: FiBuilding },
  { name: "Plans", href: "/admin/plans", icon: FiPackage },
  { name: "Users", href: "/admin/users", icon: FiUsers },
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
  const [overdueInvoices, setOverdueInvoices] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement>(null);
  const preloadedRef = useRef(false);

  // ==================== EMAIL ALERT TOGGLE STATE ====================
  // CRITICAL FIX: Start with undefined to represent "not loaded" state
  const [emailEnabled, setEmailEnabled] = useState<boolean | undefined>(
    undefined,
  );
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [emailLoaded, setEmailLoaded] = useState(false);

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

  // ==================== FETCH EMAIL PREFERENCE ====================
  const fetchEmailStatus = useCallback(async () => {
    try {
      const result = await getCustomerEmailAlertsPreference();
      // Get the EXACT value from server - could be undefined, true, or false
      const value = result.data?.customerEmailAlertsEnabled;

      // Set the state to whatever the server returns (even if undefined)
      setEmailEnabled(value);
      setEmailLoaded(true);

      console.log(
        `📧 Email alert status loaded: ${value === undefined ? "NOT SET (undefined)" : value}`,
      );
    } catch (error) {
      console.error("Failed to fetch email status:", error);
      setEmailLoaded(true);
      // Leave emailEnabled as undefined on error
    }
  }, []);

  // ==================== TOGGLE EMAIL ====================
  const handleToggleEmail = useCallback(async () => {
    if (togglingEmail) return;

    setTogglingEmail(true);
    try {
      // Toggle: if currently undefined, default to true for the toggle action
      const currentState = emailEnabled === undefined ? true : emailEnabled;
      const newState = !currentState;

      const result = await toggleCustomerEmailAlerts(newState);
      if (result.success) {
        setEmailEnabled(newState);
        toast.success(
          `Customer email alerts ${newState ? "enabled" : "disabled"}`,
        );
      } else {
        toast.error(result.message || "Failed to toggle email settings");
        // Refresh to get actual state
        await fetchEmailStatus();
      }
    } catch (error) {
      console.error("Failed to toggle email:", error);
      toast.error("Failed to toggle email settings");
      // Refresh to get actual state
      await fetchEmailStatus();
    } finally {
      setTogglingEmail(false);
    }
  }, [emailEnabled, togglingEmail, fetchEmailStatus]);

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

  // Fetch overdue invoices count
  useEffect(() => {
    const fetchOverdueInvoices = async () => {
      if (!isAuthenticated || !user?.role) return;

      try {
        const result = await invoiceService.getInvoices({
          status: "overdue",
          limit: 100,
        });
        const overdueCount = result.data?.length || 0;
        setOverdueInvoices(overdueCount);
      } catch (error) {
        console.error("Failed to fetch overdue invoices:", error);
      }
    };

    fetchOverdueInvoices();
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

    if (overdueInvoices > 0) {
      newNotifications.push({
        id: "overdue-invoices",
        title: "Overdue Invoices",
        description: `${overdueInvoices} invoice${overdueInvoices > 1 ? "s" : ""} are overdue`,
        type: "invoice",
        time: "Now",
        read: false,
        link: "/admin/invoice",
      });
    }

    setNotifications(newNotifications);
    setUnreadCount(newNotifications.length);
  }, [pendingCount, pendingPlanChanges, overdueInvoices]);

  useEffect(() => {
    generateNotifications();
  }, [generateNotifications]);

  // Fetch email status on mount - ONLY after auth is ready
  useEffect(() => {
    if (isAuthenticated && user?.role && !emailLoaded) {
      fetchEmailStatus();
    }
  }, [isAuthenticated, user, fetchEmailStatus, emailLoaded]);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gray-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-gray-500 font-medium text-lg">
            Loading dashboard...
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Please wait while we prepare your workspace
          </p>
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

  // Determine email display state
  const isEmailEnabled = emailEnabled === true;
  const isEmailDisabled = emailEnabled === false;
  const isEmailNotSet = emailEnabled === undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-5 left-5 z-50 p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 backdrop-blur-sm"
      >
        {sidebarOpen ? (
          <FiX size={22} className="text-gray-500" />
        ) : (
          <FiMenu size={22} className="text-gray-500" />
        )}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-white/95 backdrop-blur-md border-r border-gray-100 shadow-xl ${
          sidebarCollapsed ? "w-24" : "w-80"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div
            className={`flex items-center ${sidebarCollapsed ? "justify-center py-6" : "justify-between px-6"} h-28 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/50`}
          >
            {!sidebarCollapsed && (
              <div className="flex justify-center w-full">
                <Image
                  src="/Logo.png"
                  alt="Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
            )}
            {sidebarCollapsed && (
              <div className="flex items-center justify-center">
                <Image
                  src="/Logo.png"
                  alt="Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
            )}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white hover:bg-gray-100 transition-all duration-200 text-gray-400 hover:text-gray-600 shadow-sm border border-gray-200"
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
            className={`px-5 py-6 border-b border-gray-100 bg-white ${sidebarCollapsed ? "text-center" : ""}`}
          >
            <div
              className={`flex ${sidebarCollapsed ? "flex-col items-center" : "items-center"} gap-4`}
            >
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-700 rounded-2xl flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-2xl">
                    {user?.firstName?.[0] || user?.username?.[0] || "A"}
                  </span>
                </div>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-800 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium">
                    {user?.role === "super_admin"
                      ? "Super Administrator"
                      : user?.role === "admin"
                        ? "Administrator"
                        : "Staff Member"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-gray-500">Active Now</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);
                const showBadge =
                  (item.name === "Applications" && pendingCount > 0) ||
                  (item.name === "Billing" && pendingPlanChanges > 0) ||
                  (item.name === "Invoices" && overdueInvoices > 0);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-900 shadow-sm"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={`${sidebarCollapsed ? "w-6 h-6" : "w-5 h-5 mr-3"} transition-all ${isActive ? "text-gray-700" : "text-gray-400 group-hover:text-gray-600"}`}
                      />
                      {!sidebarCollapsed && (
                        <span className="text-sm font-medium">{item.name}</span>
                      )}
                    </div>
                    {!sidebarCollapsed && showBadge && (
                      <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                        {item.name === "Applications"
                          ? pendingCount
                          : item.name === "Invoices"
                            ? overdueInvoices
                            : pendingPlanChanges}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/30">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "justify-start"} px-4 py-3 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 group`}
              title="Logout"
            >
              <FiLogOut
                className={`${sidebarCollapsed ? "w-5 h-5" : "w-5 h-5 mr-3"} group-hover:scale-110 transition-transform duration-300`}
              />
              {!sidebarCollapsed && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? "lg:ml-24" : "lg:ml-80"} min-h-screen`}
      >
        {/* Top Header */}
        <header className="bg-white/70 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 lg:px-8">
            <div className="flex items-center lg:hidden">
              <div className="w-8"></div>
            </div>

            <div className="flex-1 flex justify-end items-center space-x-4">
              {/* System Status & Email Toggle */}
              <div className="hidden md:flex items-center space-x-3">
                {/* System Online Status */}
                <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600 font-medium">
                    System Online
                  </span>
                </div>

                {/* Email Alert Toggle Switch - FIXED: No auto toggle */}
                <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                  <FiEmailIcon
                    className={`w-4 h-4 ${
                      isEmailEnabled
                        ? "text-emerald-600"
                        : isEmailDisabled
                          ? "text-gray-400"
                          : "text-yellow-500"
                    }`}
                  />
                  <button
                    onClick={handleToggleEmail}
                    disabled={togglingEmail || !emailLoaded}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 flex-shrink-0 ${
                      togglingEmail || !emailLoaded
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    } ${
                      isEmailEnabled
                        ? "bg-emerald-500"
                        : isEmailDisabled
                          ? "bg-gray-300"
                          : "bg-yellow-400"
                    }`}
                    title={
                      !emailLoaded
                        ? "Loading..."
                        : isEmailEnabled
                          ? "Customer emails: ON"
                          : isEmailDisabled
                            ? "Customer emails: OFF"
                            : "Customer emails: Not Set"
                    }
                  >
                    {togglingEmail ? (
                      <FiLoader className="w-3.5 h-3.5 text-white animate-spin mx-auto" />
                    ) : (
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                          isEmailEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    )}
                  </button>
                  <span
                    className={`text-xs font-medium ${
                      isEmailEnabled
                        ? "text-emerald-600"
                        : isEmailDisabled
                          ? "text-gray-500"
                          : "text-yellow-600"
                    }`}
                  >
                    {!emailLoaded
                      ? "..."
                      : isEmailEnabled
                        ? "ON"
                        : isEmailDisabled
                          ? "OFF"
                          : "—"}
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
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-400 text-white text-xs rounded-full flex items-center justify-center shadow-md px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Panel */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fadeInDown">
                    <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                      <h3 className="font-semibold text-gray-800">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiBell className="w-8 h-8 text-gray-300" />
                          </div>
                          <p className="text-gray-500 font-medium">
                            No new notifications
                          </p>
                          <p className="text-gray-400 text-sm mt-1">
                            You're all caught up!
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
                            className={`block px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                              !notification.read ? "bg-gray-50/50" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-2 h-2 rounded-full mt-2 ${!notification.read ? "bg-gray-600" : "bg-gray-300"}`}
                              ></div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800 text-sm">
                                  {notification.title}
                                </p>
                                <p className="text-gray-500 text-xs mt-1">
                                  {notification.description}
                                </p>
                                <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
                                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                  {notification.time}
                                </p>
                              </div>
                              {notification.type === "application" && (
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                                  <span className="text-amber-600 text-sm">
                                    📝
                                  </span>
                                </div>
                              )}
                              {notification.type === "billing" && (
                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                  <span className="text-blue-600 text-sm font-bold">
                                    ₱
                                  </span>
                                </div>
                              )}
                              {notification.type === "invoice" && (
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                  <span className="text-red-600 text-sm">
                                    📄
                                  </span>
                                </div>
                              )}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>

                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
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
              <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                <FiActivity className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 font-medium">
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
        <main className="p-6 lg:p-8">{children}</main>
      </div>

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInDown {
          animation: fadeInDown 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
