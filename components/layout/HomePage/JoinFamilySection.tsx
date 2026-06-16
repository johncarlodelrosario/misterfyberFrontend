// app/components/JoinFamilySection.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";

const JoinFamilySection: React.FC = () => {
  return (
    <section className="relative w-full py-24 md:py-32 lg:py-40 overflow-hidden">
      {/* Background container with joinourfam.png image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url('/joinourfam.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Gradient overlay for better blending - with top dim effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#080616] via-black/50 to-black/70"></div>
      </div>

      {/* Content container with max-width constraints - text on left */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 text-left">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
        >
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

          {/* Trust indicators - Smaller and more compact */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-white/10"
          >
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
