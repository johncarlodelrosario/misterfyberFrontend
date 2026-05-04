// app/(dashboard)/admin/layout.tsx - COMPLETE FIXED FILE
"use client";

import { useState, useEffect } from "react";
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
} from "react-icons/fi";
import toast from "react-hot-toast";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingPlanChanges, setPendingPlanChanges] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check if user is admin (has role property)
    if (!isLoading && mounted) {
      const isAdminUser =
        user !== null &&
        (user.role === "super_admin" ||
          user.role === "admin" ||
          user.role === "staff");

      console.log("Admin layout check:", {
        isAuthenticated,
        isLoading,
        userRole: user?.role,
        isAdminUser,
        hasUser: !!user,
      });

      if (!isAuthenticated) {
        console.log("Not authenticated, redirecting to login");
        router.push("/login");
      } else if (!isAdminUser && user) {
        console.log("User is not admin, redirecting to user dashboard");
        router.push("/user/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, user, router, mounted]);

  // Fetch pending applications and plan changes count
  useEffect(() => {
    const fetchPendingCounts = async () => {
      if (!isAuthenticated || !user?.role) return;

      try {
        const { getAllApplications, getAllBillingCycles } =
          await import("@/services/admin");

        const [applicationsData, cyclesData] = await Promise.all([
          getAllApplications().catch(() => ({ data: [] })),
          getAllBillingCycles({ limit: 100 }).catch(() => ({ data: [] })),
        ]);

        const pending =
          applicationsData.data?.filter((app: any) => app.status === "pending")
            .length || 0;
        setPendingCount(pending);

        const pendingChanges =
          cyclesData.data?.filter(
            (cycle: any) => cycle.pendingPlanChange?.status === "pending",
          ).length || 0;
        setPendingPlanChanges(pendingChanges);
      } catch (error) {
        console.error("Failed to fetch pending counts:", error);
      }
    };

    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated or not admin
  if (!isAuthenticated) {
    return null;
  }

  const isAdminUser =
    user !== null &&
    (user.role === "super_admin" ||
      user.role === "admin" ||
      user.role === "staff");
  if (!isAdminUser) {
    return null;
  }

  const totalNotifications = pendingCount + pendingPlanChanges;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all"
      >
        {sidebarOpen ? (
          <FiX size={24} className="text-gray-600" />
        ) : (
          <FiMenu size={24} className="text-gray-600" />
        )}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform duration-300 ease-in-out transform bg-gradient-to-b from-blue-700 to-blue-900 text-white ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 shadow-xl`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 px-4 border-b border-blue-600">
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">MisterFyber</h1>
              <p className="text-xs text-blue-200 mt-1">Administrator Panel</p>
            </div>
          </div>

          {/* User Info */}
          <div className="px-4 py-5 border-b border-blue-600">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-semibold text-xl">
                  {user?.firstName?.[0] || user?.username?.[0] || "A"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-blue-200 truncate">
                  {user?.role === "super_admin"
                    ? "Super Administrator"
                    : user?.role === "admin"
                      ? "Administrator"
                      : "Staff"}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-200">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(`${item.href}/`);

              let badge = undefined;
              if (item.name === "Applications" && pendingCount > 0) {
                badge = pendingCount;
              } else if (item.name === "Billing" && pendingPlanChanges > 0) {
                badge = pendingPlanChanges;
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 text-sm rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "bg-blue-800 text-white shadow-md"
                      : "text-blue-100 hover:bg-blue-800 hover:text-white"
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className="w-5 h-5 mr-3" />
                    <span>{item.name}</span>
                  </div>
                  {badge && (
                    <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-blue-600 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-200 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200 group"
            >
              <FiLogOut className="w-5 h-5 mr-3 group-hover:rotate-180 transition-transform duration-300" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Top Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3 lg:px-8">
            <div className="flex items-center lg:hidden">
              <div className="w-8"></div>
            </div>

            <div className="flex-1 flex justify-end items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-medium">
                    System Online
                  </span>
                </div>
              </div>

              <div className="relative">
                <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <FiBell className="w-5 h-5" />
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse px-1">
                      {totalNotifications > 9 ? "9+" : totalNotifications}
                    </span>
                  )}
                </button>
                {totalNotifications > 0 && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border p-3 text-sm z-50">
                    <p className="font-semibold text-gray-800 mb-2">
                      Notifications
                    </p>
                    {pendingCount > 0 && (
                      <Link
                        href="/admin/applications"
                        className="block py-1 text-yellow-600 hover:text-yellow-700"
                      >
                        📝 {pendingCount} pending application(s)
                      </Link>
                    )}
                    {pendingPlanChanges > 0 && (
                      <Link
                        href="/admin/billing"
                        className="block py-1 text-blue-600 hover:text-blue-700"
                      >
                        🔄 {pendingPlanChanges} pending plan change(s)
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 px-3 py-1.5 bg-blue-50 rounded-full">
                <FiActivity className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">
                  Admin Access
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
