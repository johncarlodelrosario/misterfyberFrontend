"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiHome,
  FiUser,
  FiCreditCard,
  FiWifi,
  FiHelpCircle,
  FiLogOut,
  FiMenu,
  FiX,
  FiBell,
  FiSettings,
  FiFileText,
  FiMessageSquare,
  FiActivity,
  FiPieChart,
} from "react-icons/fi";
import toast from "react-hot-toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/user/dashboard", icon: FiHome },
    { name: "My Profile", href: "/user/profile", icon: FiUser },
    { name: "Billing", href: "/user/billing", icon: FiCreditCard },
    { name: "My Plan", href: "/user/plan", icon: FiWifi },
    { name: "Usage History", href: "/user/usage", icon: FiActivity },
    { name: "Support Tickets", href: "/user/tickets", icon: FiMessageSquare },
    { name: "Transactions", href: "/user/transactions", icon: FiFileText },
    { name: "Settings", href: "/user/settings", icon: FiSettings },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen overflow-hidden">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 md:static md:z-0`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <Link
                href="/user/dashboard"
                className="flex items-center space-x-2"
              >
                <span className="text-2xl">🌐</span>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  Mister Fyber
                </span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md text-gray-500 hover:text-gray-700 md:hidden"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* User info */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center text-white font-semibold text-lg">
                  {user?.firstName?.charAt(0)?.toUpperCase() ||
                    user?.username?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.firstName || user?.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4">
              <ul className="space-y-1 px-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive
                            ? "bg-gradient-to-r from-blue-50 to-emerald-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <item.icon
                          className={`w-5 h-5 ${isActive ? "text-blue-600" : "text-gray-500"}`}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Logout button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <FiLogOut className="w-5 h-5" />
                <span className="text-sm font-medium">
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top header - mobile only */}
          <header className="bg-white shadow-sm md:hidden sticky top-0 z-10">
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <button className="p-2 rounded-md text-gray-600 hover:bg-gray-100 relative">
                  <FiBell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
