"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import {
  FiHome,
  FiUser,
  FiCreditCard,
  FiWifi,
  FiHelpCircle,
  FiLogOut,
  FiBell,
  FiSettings,
  FiFileText,
  FiMessageSquare,
  FiActivity,
  FiChevronLeft,
} from "react-icons/fi";
import toast from "react-hot-toast";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/user/dashboard", icon: FiHome },
    { name: "My Profile", href: "/user/profile", icon: FiUser },
    { name: "Billing", href: "/user/billing", icon: FiCreditCard },
    { name: "My Plan", href: "/user/plan", icon: FiWifi },
    { name: "Usage History", href: "/user/usage", icon: FiActivity },
    { name: "Support Tickets", href: "/user/tickets", icon: FiMessageSquare },
    { name: "Transactions", href: "/user/transactions", icon: FiFileText },
    { name: "Notifications", href: "/user/notifications", icon: FiBell },
    { name: "Settings", href: "/user/settings", icon: FiSettings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/login");
      onClose();
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-xl 
          transform transition-transform duration-300 ease-in-out overflow-y-auto
          md:translate-x-0 md:static md:z-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <Link
              href="/user/dashboard"
              className="flex items-center justify-center w-full"
              onClick={onClose}
            >
              <Image
                src="/Logo.png"
                alt="Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </Link>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-500 hover:text-gray-700 md:hidden"
            >
              <FiChevronLeft className="w-5 h-5" />
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
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4">
            <ul className="space-y-1 px-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive
                          ? "bg-gradient-to-r from-blue-50 to-emerald-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isActive ? "text-blue-600" : "text-gray-500"
                        }`}
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
              className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <FiLogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
