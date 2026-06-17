// app/components/Footer.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiArrowUp,
  FiSend,
  FiHeart,
  FiGlobe,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { useState, useEffect } from "react";

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
        className="relative bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/footer/view.png')",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent z-10" />

        {/* Newsletter Section */}
        <div className="relative border-b border-white/30 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm mb-4 border border-white/40">
                  <FiSend className="w-4 h-4 text-white" />
                  <span className="text-xs font-semibold tracking-wide text-white">
                    STAY UPDATED
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-3 text-white">
                  Subscribe to Newsletter
                </h3>
                <p className="text-white/80 text-lg">
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
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-12 py-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white/60 focus:ring-2 focus:ring-white/20 transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-white text-gray-900 rounded-xl font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 group border border-white/20"
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
              <Link href="/" className="block mb-5">
                <Image
                  src="/Logo.png"
                  alt="MisterFyber Logo"
                  width={200}
                  height={65}
                  className="object-contain brightness-0 invert"
                />
              </Link>
              <p className="text-white/80 mb-5 leading-relaxed">
                Providing lightning-fast and reliable internet service to homes
                and businesses since 2026.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-xl mb-5 relative inline-block text-white">
                Quick Links
                <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-white/50 rounded-full"></div>
              </h3>
              <ul className="space-y-3.5">
                <li>
                  <Link
                    href="/"
                    className="text-white/70 hover:text-white transition-all duration-300 flex items-center gap-2 group"
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
                    className="text-white/70 hover:text-white transition-all duration-300 flex items-center gap-2 group"
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
                    className="text-white/70 hover:text-white transition-all duration-300 flex items-center gap-2 group"
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
                    className="text-white/70 hover:text-white transition-all duration-300 flex items-center gap-2 group"
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
                    className="text-white/70 hover:text-white transition-all duration-300 flex items-center gap-2 group"
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
              <h3 className="font-bold text-xl mb-5 relative inline-block text-white">
                Contact Us
                <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-white/50 rounded-full"></div>
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3 group">
                  <FiMapPin className="mt-1 text-white/70 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-white/70 group-hover:text-white transition">
                    630 Anonas, Sta. Mesa, Manila, 1016 Kalakhang Maynila
                  </span>
                </li>
                <li className="flex items-center space-x-3 group">
                  <FiPhone className="text-white/70 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-white/70 group-hover:text-white transition">
                    (0969) 341 4876 - Fountain Breeze Condominium
                  </span>
                </li>
                <li className="flex items-center space-x-3 group">
                  <FiPhone className="text-white/70 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-white/70 group-hover:text-white transition">
                    (0955) 732 7694 - Silk Residences
                  </span>
                </li>
                <li className="flex items-center space-x-3 group">
                  <FiMail className="text-white/70 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="text-white/70 group-hover:text-white transition">
                    admin@misterfyber.com
                  </span>
                </li>
              </ul>

              <div className="mt-8 pt-6 border-t border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <FiGlobe className="text-white/70 w-4 h-4" />
                  <p className="text-sm text-white/60 font-medium">
                    Business Hours
                  </p>
                </div>
                <p className="text-sm text-white/70">
                  Mon - Fri:{" "}
                  <span className="text-white">8:00 AM - 5:00 PM</span>
                </p>
                <p className="text-sm text-white/60 mt-1">
                  Weekend support via chat
                </p>
              </div>
            </div>

            {/* Trust Badge */}
            <div>
              <h3 className="font-bold text-xl mb-5 relative inline-block text-white">
                Trust & Safety
                <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-white/50 rounded-full"></div>
              </h3>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <FiShield className="text-white/70 w-5 h-5" />
                  <span className="font-semibold text-white">
                    99.5% Uptime Guarantee
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <FiUsers className="text-white/70 w-5 h-5" />
                  <span className="font-semibold text-white">
                    24/7 Security Monitoring
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/20 mt-12 pt-8 text-center">
            <p className="text-white/60 text-sm flex items-center justify-center gap-2 flex-wrap">
              &copy; {new Date().getFullYear()} MisterFyber. All rights
              reserved.
              <span className="hidden md:inline">•</span>
              <Link href="/privacy" className="hover:text-white transition">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-white transition">
                Terms of Service
              </Link>
              <span className="flex items-center gap-1 text-white/40">
                Made with{" "}
                <FiHeart className="w-3 h-3 text-red-400 animate-pulse" /> by
                MisterFyber
              </span>
            </p>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-all duration-300 z-40 hover:shadow-white/20 group border border-white/30"
        >
          <FiArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
        </button>
      )}
    </>
  );
}
