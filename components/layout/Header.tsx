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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
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
            {/* Glass background - dark theme */}
            <div className="absolute inset-0 bg-[#080616]/80 backdrop-blur-xl" />

            {/* Clear border around the nav */}
            <div className="absolute inset-0 rounded-2xl md:rounded-full border border-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.3)]" />

            {/* Gradient overlay - blue accent */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10" />

            {/* Mouse follow spotlight - blue glow */}
            <div
              className="absolute inset-0 transition-opacity duration-150 pointer-events-none"
              style={{
                background: `radial-gradient(circle 400px at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.12) 0%, transparent 70%)`,
              }}
            />

            {/* Top border highlight - brighter blue */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

            {/* Bottom border - brighter blue */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

            {/* Left border accent */}
            <div className="absolute left-0 top-1/4 bottom-1/4 w-px bg-gradient-to-b from-transparent via-blue-400/40 to-transparent" />

            {/* Right border accent */}
            <div className="absolute right-0 top-1/4 bottom-1/4 w-px bg-gradient-to-b from-transparent via-blue-400/40 to-transparent" />

            {/* Content */}
            <div className="relative px-3 md:px-5 py-1.5">
              <div className="flex items-center justify-between gap-3">
                {/* Logo */}
                <div className="flex-shrink-0 group/logo">
                  <Link href="/" className="block relative">
                    <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300" />
                    <Image
                      src="/Logo.png"
                      alt="MisterFiber Logo"
                      width={140}
                      height={50}
                      className="object-contain w-auto h-12 md:h-14 relative"
                      priority
                    />
                  </Link>
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
                          relative px-3 py-1.5 rounded-full text-sm font-medium
                          transition-all duration-200 flex items-center gap-2
                          ${
                            active
                              ? "text-blue-400 bg-white/10 shadow-sm border border-blue-500/50 shadow-blue-500/20"
                              : "text-blue-300 hover:text-blue-400 hover:bg-white/5"
                          }
                        `}
                      >
                        {/* Hover glow effect */}
                        {isHovered && (
                          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md" />
                        )}
                        <Icon className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1 md:gap-2">
                  {/* Notification */}
                  {isAuthenticated && (
                    <button className="relative p-1.5 rounded-full text-blue-400 hover:text-blue-300 hover:bg-white/5 transition-all duration-200 group/bell">
                      <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md opacity-0 group-hover/bell:opacity-100 transition-opacity duration-300" />
                      <FiBell className="w-4 h-4 relative z-10" />
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50" />
                    </button>
                  )}

                  {/* Auth */}
                  {isAuthenticated ? (
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full
                          bg-white/10 hover:bg-white/20 transition-all duration-200 border border-blue-500/50
                          hover:shadow-lg hover:shadow-blue-500/20 group/auth"
                      >
                        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md opacity-0 group-hover/auth:opacity-100 transition-opacity duration-300" />
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center relative z-10 shadow-lg shadow-blue-500/30">
                          <FiUser className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-medium text-blue-300 hidden md:inline relative z-10">
                          Account
                        </span>
                        <FiChevronDown
                          className={`w-3 h-3 text-blue-400 transition-transform duration-200 relative z-10 ${isDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div
                          className="absolute right-0 mt-2 w-52
                            bg-[#080616]/95 backdrop-blur-xl rounded-xl shadow-xl
                            border border-blue-500/40 py-1 z-30
                            shadow-blue-500/20"
                        >
                          <div className="px-3 py-2 border-b border-blue-500/30">
                            <p className="text-sm font-semibold text-white">
                              {user?.firstName || "User"}
                            </p>
                            <p className="text-xs text-blue-300 mt-0.5 truncate">
                              {user?.email || "user@example.com"}
                            </p>
                          </div>
                          <div className="py-1">
                            <Link
                              href="/user/dashboard"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-blue-300 hover:text-blue-400 hover:bg-white/5 transition-colors"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <FiHome className="w-4 h-4" />
                              Dashboard
                            </Link>
                            <Link
                              href="/user/profile"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-blue-300 hover:text-blue-400 hover:bg-white/5 transition-colors"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <FiUserCheck className="w-4 h-4" />
                              Profile
                            </Link>
                            <Link
                              href="/user/billing"
                              className="flex items-center gap-2.5 px-3 py-2 text-sm text-blue-300 hover:text-blue-400 hover:bg-white/5 transition-colors"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <FiCreditCard className="w-4 h-4" />
                              Billing
                            </Link>
                          </div>
                          <hr className="my-1 border-blue-500/30" />
                          <button
                            onClick={() => {
                              logout();
                              setIsDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
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
                      className="px-3 py-1 text-sm font-medium text-blue-300 hover:text-blue-400 rounded-full hover:bg-white/5 transition-all duration-200 relative group/signin"
                    >
                      <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md opacity-0 group-hover/signin:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10">Sign In</span>
                    </Link>
                  )}

                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="lg:hidden p-1.5 rounded-full text-blue-400 hover:text-blue-300 hover:bg-white/5 transition-all duration-200 relative group/menu"
                  >
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md opacity-0 group-hover/menu:opacity-100 transition-opacity duration-300" />
                    {isMenuOpen ? (
                      <FiX size={18} className="relative z-10" />
                    ) : (
                      <FiMenu size={18} className="relative z-10" />
                    )}
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
                    className="lg:hidden mt-2 pt-2 border-t border-blue-500/40"
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
                                  ? "bg-white/10 text-blue-400 border border-blue-500/40 shadow-blue-500/20"
                                  : "text-blue-300 hover:text-blue-400 hover:bg-white/5"
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
                        <div className="mt-1 pt-1 border-t border-blue-500/40">
                          <Link
                            href="/login"
                            className="flex items-center px-4 py-2.5 text-sm font-medium text-blue-300 hover:text-blue-400 hover:bg-white/5 rounded-xl transition-all duration-200"
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
