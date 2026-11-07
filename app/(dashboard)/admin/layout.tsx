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
  FiMail,
  FiFileText,
  FiMail as FiEmailIcon,
  FiLoader,
  FiDroplet,
  FiCheck,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { getAllApplications } from "@/services/admin";
import {
  getCustomerEmailAlertsPreference,
  toggleCustomerEmailAlerts,
  getAdminThemePreference,
  updateAdminThemePreference,
} from "@/services/admin";
import invoiceService from "@/services/invoiceService";

// ==================== CONSTANTS ====================
const PRELOAD_CACHE_KEY = "misterfyber_preload_applications";
const PRELOAD_TIMESTAMP_KEY = "misterfyber_preload_timestamp";
const SIDEBAR_STATE_KEY = "misterfyber_sidebar_collapsed";
const THEME_STATE_KEY = "misterfyber_admin_theme";
const PRELOAD_DURATION = 10 * 60 * 1000;
const MAX_APPS_TO_STORE = 50;
const MAX_DATA_SIZE = 4 * 1024 * 1024;

// ==================== UNIFIED THEME ====================
interface AppTheme {
  id: string;
  name: string;
  swatch: string;
  isDark: boolean;
  appBg: string;
  sidebarBg: string;
  sidebarBorder: string;
  sidebarText: string;
  sidebarTextMuted: string;
  sidebarNavHover: string;
  sidebarNavActiveBg: string;
  sidebarNavActiveText: string;
  headerBg: string;
  headerBorder: string;
  headerText: string;
}

const APP_THEMES: AppTheme[] = [
  // --- LIGHT THEMES ---
  {
    id: "porcelain",
    name: "Porcelain",
    swatch: "#ffffff",
    isDark: false,
    appBg: "#f8fafc",
    sidebarBg: "#ffffff",
    sidebarBorder: "#f1f5f9",
    sidebarText: "#1e293b",
    sidebarTextMuted: "#94a3b8",
    sidebarNavHover: "#f8fafc",
    sidebarNavActiveBg: "#eff6ff",
    sidebarNavActiveText: "#3b82f6",
    headerBg: "rgba(255, 255, 255, 0.85)",
    headerBorder: "#f1f5f9",
    headerText: "#1e293b",
  },
  {
    id: "zinc-light",
    name: "Zinc Light",
    swatch: "#f4f4f5",
    isDark: false,
    appBg: "#fafafa",
    sidebarBg: "#ffffff",
    sidebarBorder: "#e4e4e7",
    sidebarText: "#18181b",
    sidebarTextMuted: "#a1a1aa",
    sidebarNavHover: "#f4f4f5",
    sidebarNavActiveBg: "#e4e4e7",
    sidebarNavActiveText: "#27272a",
    headerBg: "rgba(255, 255, 255, 0.85)",
    headerBorder: "#e4e4e7",
    headerText: "#18181b",
  },
  {
    id: "warm-sand",
    name: "Warm Sand",
    swatch: "#fdfbf7",
    isDark: false,
    appBg: "#f7f4ef",
    sidebarBg: "#fdfbf7",
    sidebarBorder: "#ede9e1",
    sidebarText: "#44403c",
    sidebarTextMuted: "#a8a29e",
    sidebarNavHover: "#f4efe8",
    sidebarNavActiveBg: "#e7e5e4",
    sidebarNavActiveText: "#78716c",
    headerBg: "rgba(253, 251, 247, 0.85)",
    headerBorder: "#ede9e1",
    headerText: "#44403c",
  },
  {
    id: "sage-mint",
    name: "Sage Mint",
    swatch: "#f4fbf7",
    isDark: false,
    appBg: "#f2fcf6",
    sidebarBg: "#f4fbf7",
    sidebarBorder: "#dcfce7",
    sidebarText: "#064e3b",
    sidebarTextMuted: "#6ee7b7",
    sidebarNavHover: "#e6f8ee",
    sidebarNavActiveBg: "#d1fae5",
    sidebarNavActiveText: "#047857",
    headerBg: "rgba(244, 251, 247, 0.85)",
    headerBorder: "#dcfce7",
    headerText: "#064e3b",
  },
  {
    id: "sky-light",
    name: "Sky Light",
    swatch: "#f0f9ff",
    isDark: false,
    appBg: "#f0f9ff",
    sidebarBg: "#ffffff",
    sidebarBorder: "#e0f2fe",
    sidebarText: "#0c4a6e",
    sidebarTextMuted: "#7dd3fc",
    sidebarNavHover: "#f0f9ff",
    sidebarNavActiveBg: "#e0f2fe",
    sidebarNavActiveText: "#0284c7",
    headerBg: "rgba(255, 255, 255, 0.85)",
    headerBorder: "#e0f2fe",
    headerText: "#0c4a6e",
  },
  {
    id: "rose-light",
    name: "Rose Light",
    swatch: "#fff1f2",
    isDark: false,
    appBg: "#fff1f2",
    sidebarBg: "#ffffff",
    sidebarBorder: "#ffe4e6",
    sidebarText: "#881337",
    sidebarTextMuted: "#fda4af",
    sidebarNavHover: "#fff1f2",
    sidebarNavActiveBg: "#ffe4e6",
    sidebarNavActiveText: "#e11d48",
    headerBg: "rgba(255, 255, 255, 0.85)",
    headerBorder: "#ffe4e6",
    headerText: "#881337",
  },
  {
    id: "violet-light",
    name: "Lavender",
    swatch: "#f5f3ff",
    isDark: false,
    appBg: "#f5f3ff",
    sidebarBg: "#ffffff",
    sidebarBorder: "#ede9fe",
    sidebarText: "#4c1d95",
    sidebarTextMuted: "#c4b5fd",
    sidebarNavHover: "#f5f3ff",
    sidebarNavActiveBg: "#ede9fe",
    sidebarNavActiveText: "#7c3aed",
    headerBg: "rgba(255, 255, 255, 0.85)",
    headerBorder: "#ede9fe",
    headerText: "#4c1d95",
  },
  {
    id: "amber-light",
    name: "Golden Hour",
    swatch: "#fffbeb",
    isDark: false,
    appBg: "#fffbeb",
    sidebarBg: "#ffffff",
    sidebarBorder: "#fef3c7",
    sidebarText: "#78350f",
    sidebarTextMuted: "#fcd34d",
    sidebarNavHover: "#fffbeb",
    sidebarNavActiveBg: "#fef3c7",
    sidebarNavActiveText: "#d97706",
    headerBg: "rgba(255, 255, 255, 0.85)",
    headerBorder: "#fef3c7",
    headerText: "#78350f",
  },

  // --- DARK THEMES ---
  {
    id: "obsidian",
    name: "Obsidian",
    swatch: "#18181b",
    isDark: true,
    appBg: "#121212",
    sidebarBg: "#18181b",
    sidebarBorder: "#27272a",
    sidebarText: "#f4f4f5",
    sidebarTextMuted: "#a1a1aa",
    sidebarNavHover: "#27272a",
    sidebarNavActiveBg: "#3f3f46",
    sidebarNavActiveText: "#fafafa",
    headerBg: "rgba(24, 24, 27, 0.85)",
    headerBorder: "#27272a",
    headerText: "#f4f4f5",
  },
  {
    id: "midnight",
    name: "Midnight",
    swatch: "#1e293b",
    isDark: true,
    appBg: "#0f172a",
    sidebarBg: "#1e293b",
    sidebarBorder: "#334155",
    sidebarText: "#f8fafc",
    sidebarTextMuted: "#94a3b8",
    sidebarNavHover: "#334155",
    sidebarNavActiveBg: "#334155",
    sidebarNavActiveText: "#e2e8f0",
    headerBg: "rgba(30, 41, 59, 0.85)",
    headerBorder: "#334155",
    headerText: "#f8fafc",
  },
  {
    id: "charcoal",
    name: "Charcoal",
    swatch: "#27272a",
    isDark: true,
    appBg: "#18181b",
    sidebarBg: "#27272a",
    sidebarBorder: "#3f3f46",
    sidebarText: "#fafafa",
    sidebarTextMuted: "#a1a1aa",
    sidebarNavHover: "#3f3f46",
    sidebarNavActiveBg: "#52525b",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(39, 39, 42, 0.85)",
    headerBorder: "#3f3f46",
    headerText: "#fafafa",
  },
  {
    id: "abyss",
    name: "Abyss",
    swatch: "#0c4a6e",
    isDark: true,
    appBg: "#082f49",
    sidebarBg: "#0c4a6e",
    sidebarBorder: "#075985",
    sidebarText: "#e0f2fe",
    sidebarTextMuted: "#7dd3fc",
    sidebarNavHover: "#075985",
    sidebarNavActiveBg: "#0284c7",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(12, 74, 110, 0.85)",
    headerBorder: "#075985",
    headerText: "#e0f2fe",
  },
  {
    id: "deep-forest",
    name: "Deep Forest",
    swatch: "#064e3b",
    isDark: true,
    appBg: "#022c22",
    sidebarBg: "#064e3b",
    sidebarBorder: "#065f46",
    sidebarText: "#ecfdf5",
    sidebarTextMuted: "#34d399",
    sidebarNavHover: "#065f46",
    sidebarNavActiveBg: "#059669",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(6, 78, 59, 0.85)",
    headerBorder: "#065f46",
    headerText: "#ecfdf5",
  },
  {
    id: "velvet",
    name: "Velvet",
    swatch: "#4c1d95",
    isDark: true,
    appBg: "#2e1065",
    sidebarBg: "#4c1d95",
    sidebarBorder: "#5b21b6",
    sidebarText: "#ede9fe",
    sidebarTextMuted: "#a78bfa",
    sidebarNavHover: "#5b21b6",
    sidebarNavActiveBg: "#7c3aed",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(76, 29, 149, 0.85)",
    headerBorder: "#5b21b6",
    headerText: "#ede9fe",
  },
  {
    id: "wine",
    name: "Wine",
    swatch: "#881337",
    isDark: true,
    appBg: "#4c0519",
    sidebarBg: "#881337",
    sidebarBorder: "#9f1239",
    sidebarText: "#ffe4e6",
    sidebarTextMuted: "#fda4af",
    sidebarNavHover: "#9f1239",
    sidebarNavActiveBg: "#e11d48",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(136, 19, 55, 0.85)",
    headerBorder: "#9f1239",
    headerText: "#ffe4e6",
  },
  {
    id: "crimson",
    name: "Crimson",
    swatch: "#7f1d1d",
    isDark: true,
    appBg: "#450a0a",
    sidebarBg: "#7f1d1d",
    sidebarBorder: "#991b1b",
    sidebarText: "#fef2f2",
    sidebarTextMuted: "#fca5a5",
    sidebarNavHover: "#991b1b",
    sidebarNavActiveBg: "#dc2626",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(127, 29, 29, 0.85)",
    headerBorder: "#991b1b",
    headerText: "#fef2f2",
  },
  {
    id: "navy",
    name: "Navy",
    swatch: "#1e3a8a",
    isDark: true,
    appBg: "#172554",
    sidebarBg: "#1e3a8a",
    sidebarBorder: "#1e40af",
    sidebarText: "#eff6ff",
    sidebarTextMuted: "#93c5fd",
    sidebarNavHover: "#1e40af",
    sidebarNavActiveBg: "#2563eb",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(30, 58, 138, 0.85)",
    headerBorder: "#1e40af",
    headerText: "#eff6ff",
  },
  {
    id: "teal",
    name: "Teal",
    swatch: "#134e4a",
    isDark: true,
    appBg: "#042f2e",
    sidebarBg: "#134e4a",
    sidebarBorder: "#115e59",
    sidebarText: "#f0fdfa",
    sidebarTextMuted: "#5eead4",
    sidebarNavHover: "#115e59",
    sidebarNavActiveBg: "#0d9488",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(19, 78, 74, 0.85)",
    headerBorder: "#115e59",
    headerText: "#f0fdfa",
  },
  {
    id: "mocha",
    name: "Mocha",
    swatch: "#451a03",
    isDark: true,
    appBg: "#270c02",
    sidebarBg: "#451a03",
    sidebarBorder: "#582005",
    sidebarText: "#fef3c7",
    sidebarTextMuted: "#d97706",
    sidebarNavHover: "#582005",
    sidebarNavActiveBg: "#b45309",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(69, 26, 3, 0.85)",
    headerBorder: "#582005",
    headerText: "#fef3c7",
  },
  {
    id: "indigo",
    name: "Indigo Night",
    swatch: "#3730a3",
    isDark: true,
    appBg: "#1e1b4b",
    sidebarBg: "#3730a3",
    sidebarBorder: "#4338ca",
    sidebarText: "#e0e7ff",
    sidebarTextMuted: "#a5b4fc",
    sidebarNavHover: "#4338ca",
    sidebarNavActiveBg: "#4f46e5",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(55, 48, 163, 0.85)",
    headerBorder: "#4338ca",
    headerText: "#e0e7ff",
  },
  {
    id: "slate-dark",
    name: "Slate Dark",
    swatch: "#0f172a",
    isDark: true,
    appBg: "#020617",
    sidebarBg: "#0f172a",
    sidebarBorder: "#1e293b",
    sidebarText: "#f1f5f9",
    sidebarTextMuted: "#64748b",
    sidebarNavHover: "#1e293b",
    sidebarNavActiveBg: "#334155",
    sidebarNavActiveText: "#f8fafc",
    headerBg: "rgba(15, 23, 42, 0.85)",
    headerBorder: "#1e293b",
    headerText: "#f1f5f9",
  },
  {
    id: "neon-cyber",
    name: "Cyber",
    swatch: "#09090b",
    isDark: true,
    appBg: "#000000",
    sidebarBg: "#09090b",
    sidebarBorder: "#22d3ee",
    sidebarText: "#22d3ee",
    sidebarTextMuted: "#67e8f9",
    sidebarNavHover: "#164e63",
    sidebarNavActiveBg: "#06b6d4",
    sidebarNavActiveText: "#000000",
    headerBg: "rgba(9, 9, 11, 0.85)",
    headerBorder: "#22d3ee",
    headerText: "#22d3ee",
  },
  {
    id: "strawberry",
    name: "Strawberry",
    swatch: "#831843",
    isDark: true,
    appBg: "#500724",
    sidebarBg: "#831843",
    sidebarBorder: "#9d174d",
    sidebarText: "#fdf2f8",
    sidebarTextMuted: "#f9a8d4",
    sidebarNavHover: "#9d174d",
    sidebarNavActiveBg: "#db2777",
    sidebarNavActiveText: "#ffffff",
    headerBg: "rgba(131, 24, 67, 0.85)",
    headerBorder: "#9d174d",
    headerText: "#fdf2f8",
  },
  {
    id: "matrix",
    name: "Matrix",
    swatch: "#000000",
    isDark: true,
    appBg: "#000000",
    sidebarBg: "#0a0a0a",
    sidebarBorder: "#22c55e",
    sidebarText: "#22c55e",
    sidebarTextMuted: "#4ade80",
    sidebarNavHover: "#14532d",
    sidebarNavActiveBg: "#16a34a",
    sidebarNavActiveText: "#000000",
    headerBg: "rgba(10, 10, 10, 0.85)",
    headerBorder: "#22c55e",
    headerText: "#22c55e",
  },
];

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

// ==================== NAVIGATION ====================
const navItems: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: FiHome, section: "main" },
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
  {
    name: "Manual Email",
    href: "/admin/manual-email",
    icon: FiMail,
    section: "system",
  },
];

// ==================== STORAGE ====================
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
      if (new Blob([serialized]).size > MAX_DATA_SIZE) return false;
      localStorage.setItem(key, serialized);
      return true;
    } catch (e: any) {
      if (e.name === "QuotaExceededError") {
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
        } catch {
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
    } catch {
      return null;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

// ==================== COMPONENT ====================
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
  const [emailEnabled, setEmailEnabled] = useState<boolean | undefined>(
    undefined,
  );
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [emailLoaded, setEmailLoaded] = useState(false);
  const [themeId, setThemeId] = useState<string>("porcelain");
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const preloadedRef = useRef(false);
  const themeLoadedRef = useRef(false);

  // ==================== THEME PERSISTENCE (PER-ACCOUNT FROM DB) ====================
  useEffect(() => {
    const savedState = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (savedState !== null) setSidebarCollapsed(savedState === "true");
    setMounted(true);
  }, []);

  // ⭐ Load theme from DB when user is available (runs once per user)
  useEffect(() => {
    const loadTheme = async () => {
      if (!user || themeLoadedRef.current) return;

      // Use 'id' or '_id' to match User type
      const userId = (user as any)?.id || (user as any)?._id;
      if (!userId) return;

      // First, try localStorage for instant paint (prevents flash)
      const cachedTheme = localStorage.getItem(THEME_STATE_KEY);
      if (
        cachedTheme &&
        APP_THEMES.some((t) => t.id === cachedTheme) &&
        !themeLoaded
      ) {
        setThemeId(cachedTheme);
      }

      // Then fetch the authoritative value from DB
      try {
        const savedTheme = await getAdminThemePreference();
        if (savedTheme && APP_THEMES.some((t) => t.id === savedTheme)) {
          setThemeId(savedTheme);
          // Sync localStorage with DB value
          localStorage.setItem(THEME_STATE_KEY, savedTheme);
        }
      } catch {
        // Fallback to cached theme (already set above) or default
      } finally {
        setThemeLoaded(true);
        themeLoadedRef.current = true;
      }
    };

    loadTheme();
  }, [user, themeLoaded]);

  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem(SIDEBAR_STATE_KEY, String(newState));
  };

  // ⭐ Save theme: update UI immediately + persist to DB + cache in localStorage
  const selectTheme = async (id: string) => {
    const previousTheme = themeId;
    setThemeId(id);
    setShowThemePicker(false);

    // Optimistic localStorage cache (instant on next visit)
    try {
      localStorage.setItem(THEME_STATE_KEY, id);
    } catch {}

    const t = APP_THEMES.find((x) => x.id === id);
    toast.success(`Theme: ${t?.name ?? id}`);

    // Persist to DB
    try {
      const success = await updateAdminThemePreference(id);
      if (!success) {
        throw new Error("Server rejected theme update");
      }
    } catch {
      // Rollback on failure
      setThemeId(previousTheme);
      try {
        localStorage.setItem(THEME_STATE_KEY, previousTheme);
      } catch {}
      toast.error("Failed to save theme to server");
    }
  };

  const activeTheme = useMemo(
    () => APP_THEMES.find((t) => t.id === themeId) ?? APP_THEMES[0],
    [themeId],
  );

  // ==================== CLICK OUTSIDE ====================
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      )
        setShowNotifications(false);
      if (themeRef.current && !themeRef.current.contains(event.target as Node))
        setShowThemePicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ==================== EMAIL ====================
  const fetchEmailStatus = useCallback(async () => {
    try {
      const result = await getCustomerEmailAlertsPreference();
      setEmailEnabled(result.data?.customerEmailAlertsEnabled);
      setEmailLoaded(true);
    } catch {
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
    } catch {
      toast.error("Failed to toggle email settings");
      await fetchEmailStatus();
    } finally {
      setTogglingEmail(false);
    }
  }, [emailEnabled, togglingEmail, fetchEmailStatus]);

  // ==================== PRELOAD ====================
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
        setPendingCount(
          cachedData.applications.filter((a: any) => a.status === "pending")
            .length,
        );
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
        setPendingCount(
          applicationsList.filter((a: any) => a.status === "pending").length,
        );
      } catch {}
    };
    preloadApplications();
  }, [isAuthenticated, user]);

  // ==================== OVERDUE ====================
  useEffect(() => {
    const fetchOverdue = async () => {
      if (!isAuthenticated || !user?.role) return;
      try {
        const result = await invoiceService.getInvoices({
          status: "overdue",
          limit: 100,
        });
        setOverdueInvoices(result.data?.length || 0);
      } catch {}
    };
    fetchOverdue();
  }, [isAuthenticated, user]);

  // ==================== NOTIFICATIONS ====================
  const generateNotifications = useCallback(() => {
    const list: Notification[] = [];
    if (pendingCount > 0)
      list.push({
        id: "pending-apps",
        title: "Pending Applications",
        description: `${pendingCount} application${pendingCount > 1 ? "s" : ""} awaiting review`,
        type: "application",
        time: "Now",
        read: false,
        link: "/admin/applications",
        icon: "📝",
      });
    if (pendingPlanChanges > 0)
      list.push({
        id: "plan-changes",
        title: "Plan Change Requests",
        description: `${pendingPlanChanges} customer${pendingPlanChanges > 1 ? "s" : ""} requested plan change`,
        type: "billing",
        time: "Now",
        read: false,
        link: "/admin/billing",
        icon: "🔄",
      });
    if (overdueInvoices > 0)
      list.push({
        id: "overdue-invoices",
        title: "Overdue Invoices",
        description: `${overdueInvoices} invoice${overdueInvoices > 1 ? "s" : ""} are overdue`,
        type: "invoice",
        time: "Now",
        read: false,
        link: "/admin/invoice",
        icon: "⚠️",
      });
    setNotifications(list);
    setUnreadCount(list.length);
  }, [pendingCount, pendingPlanChanges, overdueInvoices]);

  useEffect(() => {
    generateNotifications();
  }, [generateNotifications]);

  // ==================== EMAIL ON AUTH ====================
  useEffect(() => {
    if (isAuthenticated && user?.role && !emailLoaded) fetchEmailStatus();
  }, [isAuthenticated, user, fetchEmailStatus, emailLoaded]);

  // ==================== AUTH GUARD ====================
  useEffect(() => {
    if (!isLoading && mounted) {
      const isAdminUser =
        user !== null &&
        (user.role === "super_admin" ||
          user.role === "admin" ||
          user.role === "staff");
      if (!isAuthenticated) router.push("/login");
      else if (!isAdminUser && user) router.push("/user/dashboard");
    }
  }, [isAuthenticated, isLoading, user, router, mounted]);

  // ==================== PLAN CHANGES ====================
  useEffect(() => {
    const fetchPlanChanges = async () => {
      if (!isAuthenticated || !user?.role) return;
      try {
        const { getAllBillingCycles } = await import("@/services/admin");
        const cyclesData = await getAllBillingCycles({ limit: 100 }).catch(
          () => ({ data: [] }),
        );
        setPendingPlanChanges(
          cyclesData.data?.filter(
            (c: any) => c.pendingPlanChange?.status === "pending",
          ).length || 0,
        );
      } catch {}
    };
    fetchPlanChanges();
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    try {
      await logout();
      preloadStorage.removeItem(PRELOAD_CACHE_KEY);
      preloadStorage.removeItem(PRELOAD_TIMESTAMP_KEY);
      // Don't clear theme from localStorage — it's keyed per user anyway
      router.push("/login");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.success("All notifications marked as read");
  };

  const isAdminUser =
    user !== null &&
    (user.role === "super_admin" ||
      user.role === "admin" ||
      user.role === "staff");
  const isEmailEnabled = emailEnabled === true;
  const isEmailDisabled = emailEnabled === false;

  const groupedNavItems = useMemo(() => {
    const groups: Record<string, NavItem[]> = {
      main: [],
      management: [],
      financial: [],
      system: [],
    };
    navItems.forEach((item) => {
      const section = item.section || "main";
      if (groups[section]) groups[section].push(item);
    });
    return groups;
  }, []);

  const sectionLabels: Record<string, string> = {
    main: "Overview",
    management: "Management",
    financial: "Finance",
    system: "System",
  };

  // ⭐ Wait for BOTH mount AND theme load to avoid flash
  if (!mounted || isLoading || !themeLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-[3px] border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-slate-700 font-semibold text-base tracking-tight">
            Loading workspace
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Preparing your dashboard
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdminUser) return null;

  return (
    <div
      style={{ backgroundColor: activeTheme.appBg }}
      className="min-h-screen transition-colors duration-300"
    >
      {/* MOBILE TOGGLE */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-sm border border-slate-200"
      >
        {sidebarOpen ? (
          <FiX size={20} className="text-slate-700" />
        ) : (
          <FiMenu size={20} className="text-slate-700" />
        )}
      </button>

      {/* OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ==================== SIDEBAR ==================== */}
      <aside
        style={{
          backgroundColor: activeTheme.sidebarBg,
          borderRightColor: activeTheme.sidebarBorder,
        }}
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out border-r ${
          sidebarCollapsed ? "w-[76px]" : "w-64"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* LOGO */}
          <div
            style={{ borderBottomColor: activeTheme.sidebarBorder }}
            className={`flex items-center ${sidebarCollapsed ? "justify-center px-3" : "justify-between px-5"} h-16 border-b`}
          >
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2.5">
                <Image
                  src="/Logo.png"
                  alt="MisterFyber"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                />
                <div className="min-w-0">
                  <h1
                    style={{ color: activeTheme.sidebarText }}
                    className="text-[15px] font-bold leading-tight tracking-tight"
                  >
                    MisterFyber
                  </h1>
                  <p
                    style={{ color: activeTheme.sidebarTextMuted }}
                    className="text-[10px] font-medium tracking-wider uppercase leading-tight"
                  >
                    Admin Console
                  </p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <Image
                src="/Logo.png"
                alt="Logo"
                width={34}
                height={34}
                className="object-contain"
                priority
              />
            )}
            {!sidebarCollapsed && (
              <button
                onClick={toggleSidebarCollapse}
                style={{
                  backgroundColor: activeTheme.sidebarNavHover,
                  color: activeTheme.sidebarTextMuted,
                }}
                className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md"
              >
                <FiChevronLeft size={16} />
              </button>
            )}
          </div>

          {sidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              style={{ color: activeTheme.sidebarTextMuted }}
              className="hidden lg:flex items-center justify-center w-full py-2"
            >
              <FiChevronRight size={16} />
            </button>
          )}

          {/* USER */}
          <div
            style={{ borderBottomColor: activeTheme.sidebarBorder }}
            className={`px-4 py-4 border-b ${sidebarCollapsed ? "flex justify-center" : ""}`}
          >
            <div
              className={`flex ${sidebarCollapsed ? "justify-center" : "items-center gap-3"}`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold text-sm">
                    {user?.firstName?.[0] || user?.username?.[0] || "A"}
                  </span>
                </div>
                <div
                  style={{ borderColor: activeTheme.sidebarBg }}
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2"
                />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p
                    style={{ color: activeTheme.sidebarText }}
                    className="text-sm font-semibold truncate leading-tight"
                  >
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p
                    style={{ color: activeTheme.sidebarTextMuted }}
                    className="text-[11px] mt-0.5 font-medium truncate"
                  >
                    {user?.role === "super_admin"
                      ? "Super Administrator"
                      : user?.role === "admin"
                        ? "Administrator"
                        : "Staff Member"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* NAV */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
            {Object.entries(groupedNavItems).map(
              ([section, items]) =>
                items.length > 0 && (
                  <div key={section} className="mb-5">
                    {!sidebarCollapsed && (
                      <p
                        style={{ color: activeTheme.sidebarTextMuted }}
                        className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-2"
                      >
                        {sectionLabels[section] || section}
                      </p>
                    )}
                    {sidebarCollapsed && section !== "main" && (
                      <div
                        style={{ borderTopColor: activeTheme.sidebarBorder }}
                        className="mx-2 mb-2 border-t"
                      />
                    )}
                    <div className="space-y-0.5">
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
                            onMouseEnter={(e) => {
                              if (!isActive)
                                e.currentTarget.style.backgroundColor =
                                  activeTheme.sidebarNavHover;
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive)
                                e.currentTarget.style.backgroundColor =
                                  "transparent";
                            }}
                            style={{
                              backgroundColor: isActive
                                ? activeTheme.sidebarNavActiveBg
                                : "transparent",
                              color: isActive
                                ? activeTheme.sidebarNavActiveText
                                : activeTheme.sidebarTextMuted,
                            }}
                            className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} px-3 py-2 rounded-lg transition-colors duration-150 relative`}
                            title={sidebarCollapsed ? item.name : undefined}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <item.icon
                                style={{
                                  color: isActive
                                    ? activeTheme.sidebarNavActiveText
                                    : activeTheme.sidebarTextMuted,
                                }}
                                className="flex-shrink-0 w-[18px] h-[18px]"
                              />
                              {!sidebarCollapsed && (
                                <span
                                  className={`text-[13px] truncate ${isActive ? "font-semibold" : "font-medium"}`}
                                >
                                  {item.name}
                                </span>
                              )}
                            </div>
                            {!sidebarCollapsed && showBadge && (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                                {badgeCount > 99 ? "99+" : badgeCount}
                              </span>
                            )}
                            {sidebarCollapsed && showBadge && (
                              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] bg-amber-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-1">
                                {badgeCount > 99 ? "99+" : badgeCount}
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

          {/* BOTTOM */}
          <div
            style={{ borderTopColor: activeTheme.sidebarBorder }}
            className="p-3 border-t space-y-1"
          >
            <button
              onClick={handleLogout}
              style={{ color: activeTheme.sidebarTextMuted }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.2)";
                e.currentTarget.style.color = "#fca5a5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = activeTheme.sidebarTextMuted;
              }}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "justify-start"} px-3 py-2 rounded-lg transition-colors duration-150`}
            >
              <FiLogOut
                className={`flex-shrink-0 w-[18px] h-[18px] ${sidebarCollapsed ? "" : "mr-3"}`}
              />
              {!sidebarCollapsed && (
                <span className="text-[13px] font-medium">Sign out</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN ==================== */}
      <div
        className={`transition-all duration-300 ${sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-64"} min-h-screen`}
      >
        {/* HEADER */}
        <header
          style={{
            backgroundColor: activeTheme.headerBg,
            borderBottomColor: activeTheme.headerBorder,
            color: activeTheme.headerText,
          }}
          className="backdrop-blur-xl sticky top-0 z-20 border-b"
        >
          <div className="flex items-center justify-between px-6 py-3 lg:px-8">
            <div className="lg:hidden w-8" />
            <div className="hidden lg:block">
              <p
                style={{ color: activeTheme.headerText }}
                className="text-[13px] font-semibold capitalize"
              >
                {pathname === "/admin"
                  ? "Dashboard Overview"
                  : pathname
                      ?.split("/")
                      .filter(Boolean)
                      .pop()
                      ?.replace(/-/g, " ") || "Dashboard"}
              </p>
              <p
                style={{ color: activeTheme.headerText }}
                className="text-[11px] mt-0.5 opacity-60"
              >
                Admin Console
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* UNIFIED THEME PICKER */}
              <div className="relative" ref={themeRef}>
                <button
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  style={{
                    backgroundColor: activeTheme.sidebarNavHover,
                    borderColor: activeTheme.headerBorder,
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all duration-150"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/30"
                    style={{ backgroundColor: activeTheme.swatch }}
                  />
                  <FiDroplet className="w-3.5 h-3.5 opacity-70" />
                  <span className="hidden lg:inline text-[11px] font-medium">
                    {activeTheme.name}
                  </span>
                </button>

                {showThemePicker && (
                  <div
                    style={{
                      backgroundColor: activeTheme.isDark
                        ? "#1e293b"
                        : "#ffffff",
                      borderColor: activeTheme.headerBorder,
                    }}
                    className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl border overflow-hidden z-50 animate-fadeInDown"
                  >
                    <div
                      style={{ borderBottomColor: activeTheme.headerBorder }}
                      className="px-4 py-3 border-b"
                    >
                      <h3
                        style={{ color: activeTheme.headerText }}
                        className="font-semibold text-[13px]"
                      >
                        App Theme
                      </h3>
                      <p className="text-[11px] opacity-60 mt-0.5">
                        Sidebar, header & background
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                      {APP_THEMES.map((theme) => {
                        const isActive = theme.id === themeId;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => selectTheme(theme.id)}
                            style={{
                              borderColor: isActive
                                ? "#6366f1"
                                : activeTheme.headerBorder,
                              backgroundColor: isActive
                                ? "rgba(99,102,241,0.1)"
                                : "transparent",
                            }}
                            className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border transition-all duration-150 ${isActive ? "ring-1 ring-indigo-500" : ""}`}
                          >
                            <span
                              className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: theme.swatch }}
                            >
                              {isActive && (
                                <FiCheck
                                  className={`w-4 h-4 ${theme.isDark ? "text-white" : "text-indigo-600"}`}
                                />
                              )}
                            </span>
                            <p
                              style={{
                                color: activeTheme.isDark
                                  ? "#e2e8f0"
                                  : "#334155",
                              }}
                              className="text-[10px] font-semibold text-center leading-tight line-clamp-2 w-full"
                            >
                              {theme.name}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2">
                <div
                  style={{
                    backgroundColor: activeTheme.sidebarNavHover,
                    borderColor: activeTheme.headerBorder,
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border"
                >
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="text-[11px] font-medium">Operational</span>
                </div>

                <div
                  style={{
                    backgroundColor: activeTheme.sidebarNavHover,
                    borderColor: activeTheme.headerBorder,
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border"
                >
                  <FiEmailIcon className="w-3.5 h-3.5 opacity-70" />
                  <button
                    onClick={handleToggleEmail}
                    disabled={togglingEmail || !emailLoaded}
                    className={`relative inline-flex h-4 w-8 items-center rounded-full transition-all duration-300 ${togglingEmail || !emailLoaded ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${isEmailEnabled ? "bg-emerald-500" : isEmailDisabled ? "bg-slate-300" : "bg-amber-400"}`}
                  >
                    {togglingEmail ? (
                      <FiLoader className="w-2.5 h-2.5 text-white animate-spin mx-auto" />
                    ) : (
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${isEmailEnabled ? "translate-x-[18px]" : "translate-x-0.5"}`}
                      />
                    )}
                  </button>
                  <span className="text-[10px] font-semibold uppercase tracking-wide min-w-[22px] opacity-70">
                    {!emailLoaded
                      ? "..."
                      : isEmailEnabled
                        ? "On"
                        : isEmailDisabled
                          ? "Off"
                          : "—"}
                  </span>
                </div>
              </div>

              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 opacity-70 hover:opacity-100 rounded-lg"
                >
                  <FiBell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center px-1 font-semibold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div
                    style={{
                      backgroundColor: activeTheme.isDark
                        ? "#1e293b"
                        : "#ffffff",
                      borderColor: activeTheme.headerBorder,
                    }}
                    className="absolute right-0 mt-2 w-[340px] rounded-xl shadow-xl border overflow-hidden z-50 animate-fadeInDown"
                  >
                    <div
                      style={{ borderBottomColor: activeTheme.headerBorder }}
                      className="flex justify-between items-center px-4 py-3 border-b"
                    >
                      <h3
                        style={{ color: activeTheme.headerText }}
                        className="font-semibold text-[13px]"
                      >
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-[11px] text-indigo-500 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[360px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-6 py-10 text-center">
                          <p
                            style={{ color: activeTheme.headerText }}
                            className="font-medium text-[13px]"
                          >
                            No new notifications
                          </p>
                          <p className="text-[11px] mt-0.5 opacity-60">
                            You&apos;re all caught up
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.link}
                            onClick={() => {
                              setShowNotifications(false);
                              if (!n.read) {
                                setNotifications((prev) =>
                                  prev.map((x) =>
                                    x.id === n.id ? { ...x, read: true } : x,
                                  ),
                                );
                                setUnreadCount((p) => Math.max(0, p - 1));
                              }
                            }}
                            style={{
                              borderBottomColor: activeTheme.headerBorder,
                              color: activeTheme.headerText,
                            }}
                            className="flex items-start gap-3 px-4 py-3 border-b last:border-0"
                          >
                            {n.icon && (
                              <div
                                style={{
                                  backgroundColor: activeTheme.sidebarBg,
                                }}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                              >
                                {n.icon}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[12px] truncate">
                                {n.title}
                              </p>
                              <p className="text-[11px] mt-0.5 opacity-70">
                                {n.description}
                              </p>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div
                style={{
                  backgroundColor: activeTheme.sidebarNavHover,
                  borderColor: activeTheme.headerBorder,
                }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border"
              >
                <FiActivity className="w-3.5 h-3.5 opacity-70" />
                <span className="text-[11px] font-medium">
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

        <main className="p-6 lg:p-8">{children}</main>
      </div>

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInDown {
          animation: fadeInDown 0.2s ease-out;
        }
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
