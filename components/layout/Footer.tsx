// app/components/Footer.tsx
"use client";

import Link from "next/link";
import {
  FiFacebook,
  FiTwitter,
  FiInstagram,
  FiMail,
  FiPhone,
  FiMapPin,
  FiLinkedin,
  FiArrowUp,
  FiSend,
  FiHeart,
  FiGlobe,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { useState, useEffect } from "react";
import Logo from "./Logo";

export default function Footer() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Subscribe:", email);
    setEmail("");
  };

  return (
    <>
      <footer
        className="relative text-white bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/footer/mountainFiberNight.png')",
        }}
      >
        {/* Dark overlay for text readability - NO BLUR, just dark overlay */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40" />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-500 to-transparent z-10" />

        {/* Newsletter Section */}
        <div className="relative border-b border-white/10 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 mb-4">
                  <FiSend className="w-4 h-4 text-accent-400" />
                  <span className="text-xs font-semibold tracking-wide text-accent-300">
                    STAY UPDATED
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Subscribe to Newsletter
                </h3>
                <p className="text-gray-300 text-lg">
                  Get the latest updates on promos, new plans, and exclusive
                  offers
                </p>
              </div>
              <div>
                <form
                  onSubmit={handleSubscribe}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="flex-1 relative">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-12 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-gradient-to-r from-accent-600 to-accent-700 rounded-xl font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 group"
                  >
                    <span>Subscribe</span>
                    <FiSend className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Company Info */}
            <div>
              <Logo
                showText={true}
                className="mb-5 scale-110"
                textClassName="text-white bg-gradient-to-r from-primary-400 to-accent-400"
              />
              <p className="text-gray-300 mb-5 leading-relaxed">
                Providing lightning-fast and reliable internet service to homes
                and 2026.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-xl mb-5 relative inline-block">
                Quick Links
                <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-accent-500 to-transparent rounded-full"></div>
              </h3>
              <ul className="space-y-3.5">
                <li>
                  <Link
                    href="/"
                    className="text-gray-300 hover:text-accent-400 transition-all duration-300 flex items-center gap-2 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      →
                    </span>{" "}
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/plans"
                    className="text-gray-300 hover:text-accent-400 transition-all duration-300 flex items-center gap-2 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      →
                    </span>{" "}
                    Plans
                  </Link>
                </li>
                <li>
                  <Link
                    href="/support"
                    className="text-gray-300 hover:text-accent-400 transition-all duration-300 flex items-center gap-2 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      →
                    </span>{" "}
                    Support
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-gray-300 hover:text-accent-400 transition-all duration-300 flex items-center gap-2 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      →
                    </span>{" "}
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/apply"
                    className="text-gray-300 hover:text-accent-400 transition-all duration-300 flex items-center gap-2 group"
                  >
                    <span className="group-hover:translate-x-1 transition-transform">
                      →
                    </span>{" "}
                    Apply Now
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="font-bold text-xl mb-5 relative inline-block">
                Contact Us
                <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-accent-500 to-transparent rounded-full"></div>
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3 group">
                  <FiMapPin className="mt-1 text-accent-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-gray-300 group-hover:text-gray-200 transition">
                    630 Anonas, Sta. Mesa, Manila, 1016 Kalakhang Maynila
                  </span>
                </li>
                <li className="flex items-center space-x-3 group">
                  <FiPhone className="text-accent-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-gray-300 group-hover:text-gray-200 transition">
                    +63 939 874 7934
                  </span>
                </li>
                <li className="flex items-center space-x-3 group">
                  <FiMail className="text-accent-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-gray-300 group-hover:text-gray-200 transition">
                    admin@misterfiber.com
                  </span>
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <FiGlobe className="text-accent-400 w-4 h-4" />
                  <p className="text-sm text-gray-400 font-medium">
                    Business Hours
                  </p>
                </div>
                <p className="text-sm text-gray-300">
                  Mon - Fri:{" "}
                  <span className="text-white">8:00 AM - 5:00 PM</span>
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Weekend support via chat
                </p>
              </div>
            </div>

            {/* Trust Badge */}
            <div>
              <h3 className="font-bold text-xl mb-5 relative inline-block">
                Trust & Safety
                <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-gradient-to-r from-accent-500 to-transparent rounded-full"></div>
              </h3>
              <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <FiShield className="text-accent-400 w-5 h-5" />
                  <span className="font-semibold">99.5% Uptime Guarantee</span>
                </div>
                <div className="flex items-center gap-3">
                  <FiUsers className="text-accent-400 w-5 h-5" />
                  <span className="font-semibold">
                    24/7 Security Monitoring
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 mt-12 pt-8 text-center">
            <p className="text-gray-400 text-sm flex items-center justify-center gap-2 flex-wrap">
              &copy; {new Date().getFullYear()} MisterFiber. All rights
              reserved.
              <span className="hidden md:inline">•</span>
              <Link
                href="/privacy"
                className="hover:text-accent-400 transition"
              >
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-accent-400 transition">
                Terms of Service
              </Link>
              <span className="flex items-center gap-1 text-gray-500">
                Made with{" "}
                <FiHeart className="w-3 h-3 text-red-500 animate-pulse" /> by
                MisterFiber
              </span>
            </p>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-accent-600 to-accent-700 rounded-2xl shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-all duration-300 z-40 hover:shadow-accent-500/30 group"
        >
          <FiArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
        </button>
      )}
    </>
  );
}
