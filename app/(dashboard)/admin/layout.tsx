"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  FiBarChart2,
  FiUserPlus,
  FiDollarSign,
  FiClock,
  FiArrowRight,
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi";
import toast from "react-hot-toast";
import { getAllApplications } from "@/services/admin";
import {
  getCustomerEmailAlertsPreference,
  toggleCustomerEmailAlerts,
} from "@/services/admin";
import invoiceService from "@/services/invoiceService";

// ==================== CONSTANTS & CONFIGURATION ====================
const PRELOAD_CACHE_KEY = "misterfyber_preload_applications";
const PRELOAD_TIMESTAMP_KEY = "misterfyber_preload_timestamp";
const SIDEBAR_STATE_KEY = "misterfyber_sidebar_collapsed";
const PRELOAD_DURATION = 10 * 60 * 1000; // 10 minutes
const MAX_APPS_TO_STORE = 50;
const MAX_DATA_SIZE = 4 * 1024 * 1024; // 4MB

// ==================== TYPES ====================
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
  section?: "main" | "management" | "financial" | "system";
}

interface Notification {
  id: string;
  title: string;
  description: string;
  type: "application" | "billing" | "payment" | "system" | "invoice";
  time: string;
  read: boolean;
  link: string;
  icon?: string;
}

// ==================== NAVIGATION CONFIGURATION ====================
const navItems: NavItem[] = [
  // Main
  { name: "Dashboard", href: "/admin", icon: FiHome, section: "main" },
  // Management
  {
    name: "Applications",
    href: "/admin/applications",
    icon: FiUserCheck,
    section: "management",
  },
  { name: "Users", href: "/admin/users", icon: FiUsers, section: "management" },
  {
    name: "Buildings",
    href: "/admin/buildings",
    icon: FiBuilding,
    section: "management",
  },
  {
    name: "Plans",
    href: "/admin/plans",
    icon: FiPackage,
    section: "management",
  },
  // Financial
  {
    name: "Billing",
    href: "/admin/billing",
    icon: FiClipboard,
    section: "financial",
  },
  {
    name: "Payments",
    href: "/admin/payments",
    icon: FiCreditCard,
    section: "financial",
  },
  {
    name: "Invoices",
    href: "/admin/invoice",
    icon: FiFileText,
    section: "financial",
  },
  // System
  {
    name: "Manual Email",
    href: "/admin/manual-email",
    icon: FiMail,
    section: "system",
  },
];

// ==================== STORAGE UTILITIES ====================
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

// ==================== MAIN COMPONENT ====================
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // ==================== STATE ====================
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingPlanChanges, setPendingPlanChanges] = useState(0);
  const [overdueInvoices, setOverdueInvoices] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [emailEnabled, setEmailEnabled] = useState<boolean | undefined>(
    undefined,
  );
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [emailLoaded, setEmailLoaded] = useState(false);
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const preloadedRef = useRef(false);

  // ==================== SIDEBAR PERSISTENCE ====================
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

  // ==================== NOTIFICATION CLICK OUTSIDE ====================
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

  // ==================== EMAIL PREFERENCE ====================
  const fetchEmailStatus = useCallback(async () => {
    try {
      const result = await getCustomerEmailAlertsPreference();
      const value = result.data?.customerEmailAlertsEnabled;
      setEmailEnabled(value);
      setEmailLoaded(true);
    } catch (error) {
      console.error("Failed to fetch email status:", error);
      setEmailLoaded(true);
    }
  }, []);

  const handleToggleEmail = useCallback(async () => {
    if (togglingEmail) return;

    setTogglingEmail(true);
    try {
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
        await fetchEmailStatus();
      }
    } catch (error) {
      console.error("Failed to toggle email:", error);
      toast.error("Failed to toggle email settings");
      await fetchEmailStatus();
    } finally {
      setTogglingEmail(false);
    }
  }, [emailEnabled, togglingEmail, fetchEmailStatus]);

  // ==================== PRELOAD APPLICATIONS ====================
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
        const pending = cachedData.applications.filter(
          (app: any) => app.status === "pending",
        ).length;
        setPendingCount(pending);
        preloadedRef.current = true;
        return;
      }

      preloadedRef.current = true;

      try {
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
      } catch (error) {
        console.error("Failed to preload applications:", error);
      }
    };

    preloadApplications();
  }, [isAuthenticated, user]);

  // ==================== FETCH OVERDUE INVOICES ====================
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

  // ==================== GENERATE NOTIFICATIONS ====================
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
        icon: "📝",
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
        icon: "🔄",
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
        icon: "⚠️",
      });
    }

    setNotifications(newNotifications);
    setUnreadCount(newNotifications.length);
  }, [pendingCount, pendingPlanChanges, overdueInvoices]);

  useEffect(() => {
    generateNotifications();
  }, [generateNotifications]);

  // ==================== FETCH EMAIL ON AUTH ====================
  useEffect(() => {
    if (isAuthenticated && user?.role && !emailLoaded) {
      fetchEmailStatus();
    }
  }, [isAuthenticated, user, fetchEmailStatus, emailLoaded]);

  // ==================== AUTH GUARD ====================
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

  // ==================== FETCH PENDING PLAN CHANGES ====================
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

  // ==================== HANDLERS ====================
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

  // ==================== COMPUTED ====================
  const isAdminUser =
    user !== null &&
    (user.role === "super_admin" ||
      user.role === "admin" ||
      user.role === "staff");

  const isEmailEnabled = emailEnabled === true;
  const isEmailDisabled = emailEnabled === false;
  const isEmailNotSet = emailEnabled === undefined;

  // Group nav items by section
  const groupedNavItems = useMemo(() => {
    const groups: Record<string, NavItem[]> = {
      main: [],
      management: [],
      financial: [],
      system: [],
    };
    navItems.forEach((item) => {
      const section = item.section || "main";
      if (groups[section]) {
        groups[section].push(item);
      }
    });
    return groups;
  }, []);

  const sectionLabels: Record<string, string> = {
    main: "Main",
    management: "Management",
    financial: "Financial",
    system: "System",
  };

  // ==================== RENDER: LOADING ====================
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-indigo-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-slate-600 font-medium text-lg">
            Loading dashboard...
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Preparing your workspace
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdminUser) return null;

  // ==================== RENDER: MAIN ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* ==================== MOBILE SIDEBAR TOGGLE ==================== */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-5 left-5 z-50 p-3 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 backdrop-blur-sm"
      >
        {sidebarOpen ? (
          <FiX size={22} className="text-black" />
        ) : (
          <FiMenu size={22} className="text-black" />
        )}
      </button>

      {/* ==================== MOBILE OVERLAY ==================== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden transition-all duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ==================== SIDEBAR ==================== */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out bg-white backdrop-blur-xl border-r border-slate-100 shadow-2xl shadow-slate-200/50 ${
          sidebarCollapsed ? "w-24" : "w-80"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* ===== LOGO ===== */}
          <div
            className={`flex items-center ${sidebarCollapsed ? "justify-center py-6" : "justify-between px-6"} h-28 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/50`}
          >
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12">
                  <Image
                    src="/Logo.png"
                    alt="MisterFyber"
                    width={48}
                    height={48}
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                    MisterFyber
                  </h1>
                  <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                    Admin Panel
                  </p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="flex items-center justify-center">
                <Image
                  src="/Logo.png"
                  alt="Logo"
                  width={56}
                  height={56}
                  className="object-contain"
                  priority
                />
              </div>
            )}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl bg-white hover:bg-slate-50 transition-all duration-200 text-black hover:text-black shadow-sm border border-slate-200 hover:border-slate-300"
            >
              {sidebarCollapsed ? (
                <FiChevronRight size={18} className="text-black" />
              ) : (
                <FiChevronLeft size={18} className="text-black" />
              )}
            </button>
          </div>

          {/* ===== USER PROFILE ===== */}
          <div
            className={`px-5 py-6 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/30 ${
              sidebarCollapsed ? "text-center" : ""
            }`}
          >
            <div
              className={`flex ${sidebarCollapsed ? "flex-col items-center" : "items-center"} gap-4`}
            >
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                  <span className="text-white font-bold text-2xl">
                    {user?.firstName?.[0] || user?.username?.[0] || "A"}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white"></div>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-black truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-black mt-0.5 font-medium">
                    {user?.role === "super_admin"
                      ? "Super Administrator"
                      : user?.role === "admin"
                        ? "Administrator"
                        : "Staff Member"}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-black">Online</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== NAVIGATION ===== */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {Object.entries(groupedNavItems).map(
              ([section, items]) =>
                items.length > 0 && (
                  <div key={section} className="mb-6">
                    {!sidebarCollapsed && (
                      <p className="text-[10px] font-semibold text-black uppercase tracking-wider px-3 mb-3">
                        {sectionLabels[section] || section}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {items.map((item) => {
                        const isActive =
                          pathname === item.href ||
                          pathname?.startsWith(`${item.href}/`);
                        const showBadge =
                          (item.name === "Applications" && pendingCount > 0) ||
                          (item.name === "Billing" && pendingPlanChanges > 0) ||
                          (item.name === "Invoices" && overdueInvoices > 0);
                        const badgeCount =
                          item.name === "Applications"
                            ? pendingCount
                            : item.name === "Invoices"
                              ? overdueInvoices
                              : pendingPlanChanges;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            onMouseEnter={() => setHoveredNavItem(item.name)}
                            onMouseLeave={() => setHoveredNavItem(null)}
                            className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                              isActive
                                ? "bg-gradient-to-r from-indigo-50 to-indigo-100/50 text-black shadow-sm"
                                : "text-black hover:bg-slate-50 hover:text-black"
                            }`}
                          >
                            <div className="flex items-center">
                              <item.icon
                                className={`${sidebarCollapsed ? "w-6 h-6" : "w-5 h-5 mr-3"} transition-all ${
                                  isActive
                                    ? "text-black"
                                    : "text-black group-hover:text-black"
                                }`}
                              />
                              {!sidebarCollapsed && (
                                <span
                                  className={`text-sm font-medium ${isActive ? "text-black" : "text-black"}`}
                                >
                                  {item.name}
                                </span>
                              )}
                            </div>
                            {!sidebarCollapsed && showBadge && (
                              <span className="bg-amber-100 text-black text-xs px-2.5 py-1 rounded-full font-semibold">
                                {badgeCount}
                              </span>
                            )}
                            {sidebarCollapsed && showBadge && (
                              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-amber-100 text-black text-[10px] rounded-full flex items-center justify-center font-semibold">
                                {badgeCount}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ),
            )}
          </nav>

          {/* ===== BOTTOM ACTIONS ===== */}
          <div className="p-4 border-t border-slate-100 bg-gradient-to-r from-white to-slate-50/50">
            <button
              onClick={handleLogout}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "justify-start"} px-4 py-3 text-sm text-black hover:text-black hover:bg-red-50 rounded-xl transition-all duration-200 group`}
              title="Logout"
            >
              <FiLogOut
                className={`${sidebarCollapsed ? "w-5 h-5" : "w-5 h-5 mr-3"} text-black group-hover:scale-110 transition-transform duration-300`}
              />
              {!sidebarCollapsed && (
                <span className="font-medium text-black">Logout</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? "lg:ml-24" : "lg:ml-80"} min-h-screen`}
      >
        {/* ===== TOP HEADER ===== */}
        <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-20 border-b border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 lg:px-8">
            <div className="flex items-center lg:hidden">
              <div className="w-8"></div>
            </div>

            <div className="flex-1 flex justify-end items-center space-x-4">
              {/* ===== SYSTEM STATUS & EMAIL TOGGLE ===== */}
              <div className="hidden md:flex items-center space-x-3">
                {/* System Status */}
                <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-black font-medium">
                    System Online
                  </span>
                </div>

                {/* Email Toggle */}
                <div className="flex items-center space-x-2 px-3 py-2 bg-white rounded-full shadow-sm border border-slate-100">
                  <FiEmailIcon className={`w-4 h-4 text-black`} />
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
                          ? "bg-slate-300"
                          : "bg-amber-400"
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
                  <span className={`text-xs font-medium text-black`}>
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

              {/* ===== NOTIFICATIONS ===== */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 text-black hover:text-black hover:bg-slate-100 rounded-xl transition-all duration-200"
                >
                  <FiBell className="w-5 h-5 text-black" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-rose-400 text-white text-xs rounded-full flex items-center justify-center shadow-md px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Panel */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fadeInDown">
                    <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                      <h3 className="font-semibold text-black">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-black hover:text-black font-medium transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiBell className="w-8 h-8 text-black" />
                          </div>
                          <p className="text-black font-medium">
                            No new notifications
                          </p>
                          <p className="text-black text-sm mt-1">
                            You&apos;re all caught up!
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
                            className={`block px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                              !notification.read ? "bg-slate-50/50" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-2 h-2 rounded-full mt-2 ${!notification.read ? "bg-indigo-600" : "bg-slate-300"}`}
                              ></div>
                              <div className="flex-1">
                                <p className="font-semibold text-black text-sm">
                                  {notification.title}
                                </p>
                                <p className="text-black text-xs mt-1">
                                  {notification.description}
                                </p>
                                <p className="text-black text-xs mt-2 flex items-center gap-1">
                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                  {notification.time}
                                </p>
                              </div>
                              {notification.icon && (
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-lg">
                                  {notification.icon}
                                </div>
                              )}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>

                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-black hover:text-black font-medium"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ===== ADMIN BADGE ===== */}
              <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
                <FiActivity className="w-4 h-4 text-black" />
                <span className="text-sm text-black font-medium">
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

        {/* ===== PAGE CONTENT ===== */}
        <main className="p-6 lg:p-8">{children}</main>
      </div>

      {/* ==================== GLOBAL STYLES ==================== */}
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

        /* Custom scrollbar */
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 9999px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
