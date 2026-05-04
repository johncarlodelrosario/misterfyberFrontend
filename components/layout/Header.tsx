// app/components/Header.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiMenu,
  FiX,
  FiUser,
  FiSearch,
  FiBell,
  FiChevronDown,
  FiLogOut,
  FiUserCheck,
  FiCreditCard,
  FiHome,
  FiHeadphones,
  FiInfo,
} from "react-icons/fi";
import Logo from "./Logo";
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useMockAuth();
  const searchRef = useRef<HTMLDivElement>(null);
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

  // Track mouse position for interactive glass effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-500 ease-in-out
          ${isVisible ? "translate-y-0" : "-translate-y-full"}
        `}
      >
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <nav
            ref={navRef}
            className="relative mx-auto max-w-6xl rounded-2xl md:rounded-full transition-all duration-500 overflow-hidden"
          >
            {/* Glass background */}
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xl" />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/10 to-white/30" />

            {/* Mouse follow spotlight */}
            <div
              className="absolute inset-0 transition-opacity duration-150 pointer-events-none"
              style={{
                background: `radial-gradient(circle 400px at ${mousePosition.x}px ${mousePosition.y}px, rgba(0, 168, 107, 0.06) 0%, transparent 70%)`,
              }}
            />

            {/* Top border highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

            {/* Bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* Content */}
            <div className="relative px-3 md:px-5 py-2">
              <div className="flex items-center justify-between gap-3">
                {/* Logo */}
                <div className="flex-shrink-0">
                  <Logo className="scale-150 ml-2" />
                </div>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-1">
                  {navigation.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    const isHovered = hoveredItem === item.name;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onMouseEnter={() => setHoveredItem(item.name)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`
                          relative px-4 py-2 rounded-full text-sm font-medium
                          transition-all duration-200 flex items-center gap-2
                          ${
                            active
                              ? "text-accent-700 bg-white/50 shadow-sm"
                              : "text-gray-700 hover:text-accent-600 hover:bg-white/40"
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
                  {/* Search */}
                  <div className="relative" ref={searchRef}>
                    {isSearchOpen ? (
                      <form
                        onSubmit={handleSearch}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-20"
                      >
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search..."
                          className="w-56 md:w-72 pl-10 pr-4 py-2 text-sm
                            bg-white/95 backdrop-blur-xl
                            border border-gray-200 rounded-full
                            text-gray-900 placeholder-gray-400
                            focus:outline-none focus:ring-2 focus:ring-accent-400/50 focus:border-transparent
                            shadow-lg"
                          autoFocus
                        />
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsSearchOpen(true)}
                        className="p-2 rounded-full text-gray-500 hover:text-accent-600 hover:bg-white/40 transition-all duration-200"
                      >
                        <FiSearch className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Notification */}
                  {isAuthenticated && (
                    <button className="relative p-2 rounded-full text-gray-500 hover:text-accent-600 hover:bg-white/40 transition-all duration-200">
                      <FiBell className="w-5 h-5" />
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full" />
                    </button>
                  )}

                  {/* Auth */}
                  {isAuthenticated ? (
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full
                          bg-white/40 hover:bg-white/60 transition-all duration-200"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 flex items-center justify-center">
                          <FiUser className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 hidden md:inline">
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
                            bg-white/95 backdrop-blur-xl rounded-xl shadow-xl
                            border border-gray-100 py-1 z-30"
                        >
                          <div className="px-3 py-2.5 border-b border-gray-100">
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
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:text-accent-600 hover:bg-gray-50 transition-colors"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <FiHome className="w-4 h-4" />
                              Dashboard
                            </Link>
                            <Link
                              href="/user/profile"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:text-accent-600 hover:bg-gray-50 transition-colors"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <FiUserCheck className="w-4 h-4" />
                              Profile
                            </Link>
                            <Link
                              href="/user/billing"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:text-accent-600 hover:bg-gray-50 transition-colors"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <FiCreditCard className="w-4 h-4" />
                              Billing
                            </Link>
                          </div>
                          <hr className="my-1 border-gray-100" />
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
                      className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-accent-600 rounded-full hover:bg-white/40 transition-all duration-200"
                    >
                      Sign In
                    </Link>
                  )}

                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="lg:hidden p-2 rounded-full text-gray-500 hover:text-accent-600 hover:bg-white/40 transition-all duration-200"
                  >
                    {isMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
                  </button>
                </div>
              </div>

              {/* Mobile Menu */}
              {isMenuOpen && (
                <div className="lg:hidden mt-3 pt-3 border-t border-gray-200/50">
                  <div className="flex flex-col gap-1">
                    {navigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`
                            flex items-center gap-3 px-4 py-3 rounded-xl
                            text-base font-medium transition-all duration-200
                            ${
                              isActive(item.href)
                                ? "bg-white/50 text-accent-700"
                                : "text-gray-700 hover:text-accent-600 hover:bg-white/30"
                            }
                          `}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Icon className="w-5 h-5" />
                          {item.name}
                        </Link>
                      );
                    })}

                    {!isAuthenticated && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50">
                        <Link
                          href="/login"
                          className="flex items-center px-4 py-3 text-base font-medium text-gray-700 hover:text-accent-600 hover:bg-white/30 rounded-xl transition-all duration-200"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Sign In
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}
