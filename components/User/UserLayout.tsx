"use client";

import { useState } from "react";
import Sidebar from "./Sidebar"; // This imports the correct user sidebar
import { FiMenu, FiBell } from "react-icons/fi";

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
          <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
        </div>
      </div>
    </div>
  );
}
