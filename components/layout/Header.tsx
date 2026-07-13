// app/components/Header.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiMenu,
  FiX,
  FiUser,
  FiBell,
  FiChevronDown,
  FiLogOut,
  FiUserCheck,
  FiCreditCard,
  FiHome,
  FiHeadphones,
  FiInfo,
} from "react-icons/fi";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// User type definition
interface User {
  firstName: string;
  email: string;
  lastName?: string;
}

// Temporary mock auth - replace with real auth later
const useMockAuth = () => {
  const [user] = useState<User | null>(null);
  const isAuthenticated = false;
  const logout = () => {};
  return { user, isAuthenticated, logout };
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useMockAuth();
  const navRef = useRef<HTMLElement>(null);

  const navigation = [
    { name: "Home", href: "/", icon: FiHome },
    { name: "Support", href: "/support", icon: FiHeadphones },
    { name: "About", href: "/about", icon: FiInfo },
  ];

  // Handle scroll with smooth hide/show
  useEffect(() => {
    let scrollTimer: NodeJS.Timeout;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const scrollThreshold = 50;

      if (currentScrollY <= scrollThreshold) {
        setIsVisible(true);
      } else if (isScrollingDown && currentScrollY > scrollThreshold) {
        setIsVisible(false);
      } else if (!isScrollingDown) {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    const throttledScroll = () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(handleScroll, 8);
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", throttledScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
    };
  }, [lastScrollY]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDropdownOpen &&
        !(event.target as Element).closest(".dropdown-container")
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-500 ease-in-out
          ${isVisible ? "translate-y-0" : "-translate-y-full"}
        `}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-1.5 md:py-2">
          <nav
            ref={navRef}
            className="relative mx-auto max-w-6xl rounded-2xl md:rounded-full transition-all duration-500 overflow-hidden"
          >
            {/* Solid white background */}
            <div className="absolute inset-0 bg-white" />

            {/* Content */}
            <div className="relative px-3 md:px-5 py-1.5">
              <div className="flex items-center justify-between gap-3">
                {/* Logo */}
                <div className="flex-shrink-0">
                  <Link href="/" className="block">
                    <Image
                      src="/Logo.png"
                      alt="MisterFyber Logo"
                      width={140}
                      height={50}
                      className="object-contain w-auto h-12 md:h-14"
                      priority
                    />
                  </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-1">
                  {navigation.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`
                          relative px-3 py-1.5 rounded-full text-sm font-medium
                          transition-all duration-200 flex items-center gap-2
                          ${
                            active
                              ? "text-blue-600 bg-blue-50"
                              : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                          }
                        `}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1 md:gap-2">
                  {/* Notification */}
                  {isAuthenticated && (
                    <button className="relative p-1.5 rounded-full text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-all duration-200">
                      <FiBell className="w-4 h-4" />
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    </button>
                  )}

                  {/* Auth */}
                  {isAuthenticated ? (
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full
                          bg-gray-50 hover:bg-gray-100 transition-all duration-200"
                      >
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                          <FiUser className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 hidden md:inline">
                          Account
                        </span>
                        <FiChevronDown
                          className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div
                          className="absolute right-0 mt-2 w-52
                            bg-white rounded-xl shadow-lg
                            border border-gray-200 py-1 z-30"
                        >
                          <div className="px-3 py-2 border-b border-gray-200">
                            <p className="text-sm font-semibold text-gray-900">
                              {user?.firstName || "User"}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {user?.email || "user@example.com"}
                            </p>
                          </div>
                          <div className="py-1">
                            <Link
                              href="/user/dashboard"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <FiHome className="w-4 h-4" />
                              Dashboard
                            </Link>
                            <Link
                              href="/user/profile"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <FiUserCheck className="w-4 h-4" />
                              Profile
                            </Link>
                            <Link
                              href="/user/billing"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <FiCreditCard className="w-4 h-4" />
                              Billing
                            </Link>
                          </div>
                          <hr className="my-1 border-gray-200" />
                          <button
                            onClick={() => {
                              logout();
                              setIsDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                          >
                            <FiLogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      className="px-3 py-1 text-sm font-medium text-gray-700 hover:text-blue-600 rounded-full hover:bg-gray-50 transition-all duration-200"
                    >
                      Sign In
                    </Link>
                  )}

                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="lg:hidden p-1.5 rounded-full text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-all duration-200"
                  >
                    {isMenuOpen ? <FiX size={18} /> : <FiMenu size={18} />}
                  </button>
                </div>
              </div>

              {/* Mobile Menu */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="lg:hidden mt-2 pt-2 border-t border-gray-200"
                  >
                    <div className="flex flex-col gap-1">
                      {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`
                              flex items-center gap-3 px-4 py-2.5 rounded-xl
                              text-sm font-medium transition-all duration-200
                              ${
                                isActive(item.href)
                                  ? "bg-blue-50 text-blue-600"
                                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                              }
                            `}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <Icon className="w-4 h-4" />
                            {item.name}
                          </Link>
                        );
                      })}

                      {!isAuthenticated && (
                        <div className="mt-1 pt-1 border-t border-gray-200">
                          <Link
                            href="/login"
                            className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-all duration-200"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            Sign In
                          </Link>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
