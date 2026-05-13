// app/components/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  FiHome,
  FiUsers,
  FiPackage,
  FiCreditCard,
  FiFileText,
  FiSettings,
  FiMenu,
  FiX,
  FiUserCheck,
} from "react-icons/fi";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const adminNavItems: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: FiHome },
  { name: "Applications", href: "/admin/applications", icon: FiFileText },
  { name: "Users", href: "/admin/users", icon: FiUsers },
  { name: "Plans", href: "/admin/plans", icon: FiPackage },
  { name: "Payments", href: "/admin/payments", icon: FiCreditCard },
  { name: "Settings", href: "/admin/settings", icon: FiSettings },
];

const userNavItems: NavItem[] = [
  { name: "Dashboard", href: "/user/dashboard", icon: FiHome },
  { name: "My Profile", href: "/user/profile", icon: FiUserCheck },
  { name: "Billing", href: "/user/billing", icon: FiCreditCard },
  { name: "Settings", href: "/user/settings", icon: FiSettings },
];

interface SidebarProps {
  role: "admin" | "user";
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = role === "admin" ? adminNavItems : userNavItems;

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:shadow-sm
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b">
          <Link
            href={role === "admin" ? "/admin" : "/user/dashboard"}
            className="flex items-center gap-2 group"
          >
            <Image
              src="/misterfyber.png"
              alt="MisterFyber Logo"
              width={48}
              height={48}
              className="transition-transform group-hover:scale-110"
            />
            <span className="font-bold text-lg text-primary-600">
              MisterFyber
            </span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-500">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    isActive(item.href)
                      ? "bg-primary-50 text-primary-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
