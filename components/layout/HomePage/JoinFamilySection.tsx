// app/components/JoinFamilySection.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

const JoinFamilySection: React.FC = () => {
  return (
    <section className="relative w-full py-12 md:py-16 lg:py-20 overflow-hidden">
      {/* Background container with Fam.png image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url('/Fam.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Gradient overlay for better blending - with top dim effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080616] via-black/50 to-black/70"></div>
      </div>

      {/* Content container with max-width constraints */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
        >
          {/* Badge/Subtitle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-[#00A3E0] bg-white/10 backdrop-blur-sm rounded-full">
              Join Our Community
            </span>
          </motion.div>

          {/* Main Heading - Smaller font */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Ready to Join{" "}
            <span className="relative inline-block">
              <span className="absolute inset-x-0 bottom-1.5 h-2 bg-[#00A3E0]/30 blur-sm"></span>
              <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-[#00A3E0] to-[#00D4FF]">
                Our Family
              </span>
            </span>
            ?
          </h2>

          {/* Description - Smaller font */}
          <p className="text-sm md:text-base lg:text-lg text-gray-200 mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            Experience the difference with Misterfyber.
            <br className="hidden sm:block" />
            <span className="text-white/90">
              We're here to connect you to a better tomorrow.
            </span>
          </p>

          {/* CTA Button Group - Smaller buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group relative inline-flex items-center justify-center px-5 sm:px-6 py-2.5 text-sm md:text-base font-semibold text-white bg-gradient-to-r from-[#00A3E0] to-[#0082B3] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              onClick={() => {
                window.location.href = "/get-started";
              }}
            >
              <span className="relative z-10">Get Started Today</span>
              <span className="absolute inset-0 bg-gradient-to-r from-[#00D4FF] to-[#00A3E0] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <svg
                className="relative z-10 w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </motion.button>

            {/* Secondary Button - Smaller */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 sm:px-6 py-2.5 text-sm md:text-base font-semibold text-white border border-white/30 rounded-full hover:bg-white/10 hover:border-white/50 transition-all duration-300 backdrop-blur-sm"
              onClick={() => {
                window.location.href = "/contact";
              }}
            >
              Contact Us
            </motion.button>
          </div>

          {/* Trust indicators - Smaller and more compact */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/10"
          >
            <p className="text-xs text-gray-300 mb-2">
              Trusted by thousands of happy customers
            </p>
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 text-gray-300 text-xs">
              <span>✓ 24/7 Support</span>
              <span>✓ 99.9% Uptime</span>
              <span>✓ No Hidden Fees</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default JoinFamilySection;
