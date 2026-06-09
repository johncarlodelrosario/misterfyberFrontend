"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  FiMail,
  FiPhone,
  FiMessageSquare,
  FiHelpCircle,
  FiBookOpen,
  FiUsers,
  FiArrowRight,
} from "react-icons/fi";
import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import ApplicationStatus from "@/app/application-status/page";

const faqs = [
  {
    question: "How do I apply for internet connection?",
    answer:
      "You can apply by visiting our Apply page and filling out the application form. Simply select your building, provide your floor and unit number, choose your preferred plan, and submit your valid ID. Once submitted, our team will review your application and contact you within 24-48 hours.",
  },
  {
    question: "What documents do I need to apply?",
    answer:
      "You need a valid government-issued ID (Driver's License, Passport, National ID, PRC ID, UMID, Postal ID, Voter's ID, SSS ID, GSIS eCard, PhilHealth ID, Pag-IBIG Loyalty Card, NBI Clearance, TIN ID, Senior Citizen ID, PWD ID, or any valid government ID).",
  },
  {
    question: "How do I check my application status?",
    answer:
      "You can check your application status using the application tracker below. Simply enter your Application ID (format: APP-XXXXXX-XXXXXX) to see real-time updates on your application.",
  },
  {
    question: "How long does installation take?",
    answer:
      "Installation typically takes 3-5 business days after application approval and payment of installation fee. Our technical team will contact you to schedule the installation at your preferred time.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept various payment methods including credit/debit cards, GCash, Maya, bank transfer (BPI, BDO, Metrobank, UnionBank), and over-the-counter payments (7-Eleven, Bayad Center, Palawan Express).",
  },
  {
    question: "Is there a lock-in period?",
    answer:
      "No, our plans are month-to-month with no lock-in period. You can cancel anytime with 30 days notice. No hidden fees or termination charges.",
  },
  {
    question: "What if I have technical issues?",
    answer:
      "Our technical support team is available 24/7. You can reach us via phone, email, or through your customer dashboard. We aim to resolve technical issues within 24 hours.",
  },
  {
    question: "Can I change my plan after installation?",
    answer:
      "Yes, you can upgrade or downgrade your plan anytime through your customer dashboard. Plan changes will take effect on your next billing cycle.",
  },
  {
    question: "What internet speeds do you offer?",
    answer:
      "We offer various plans ranging from 50 Mbps to 1 Gbps. Visit our Plans page to see our complete list of internet plans with speeds and pricing.",
  },
  {
    question: "Do I need to buy my own router?",
    answer:
      "We provide a free WiFi router upon installation. The router is configured specifically for our network to ensure optimal performance.",
  },
];

const supportChannels = [
  {
    icon: FiPhone,
    title: "Phone Support",
    info: "(0969) 341 4876 - Fountain Breeze Condominium",
    info1: "(0955) 732 7694 - Silk Residences",

    hours: "24/7",
    action: "tel:(0969) 341 4876 - Fountain Breeze Condominium",
    action1: "tel:(0955) 732 7694 - Silk Residences",

    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: FiMail,
    title: "Email Support",
    info: "admin@misterfyber.com",
    hours: "Response within 24 hours",
    action: "mailto:admin@misterfyber.com",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: FiMessageSquare,
    title: "Live Chat",
    info: "Chat with an agent",
    hours: "8 AM - 8 PM daily",
    action: "#",
    gradient: "from-green-500 to-emerald-500",
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 z-50 origin-left"
        style={{ scaleX }}
      />
      <Header />
      <main className="min-h-screen bg-white">
        {/* Hero Section with Custom Banner Image - INCREASED HEIGHT */}
        <section className="relative min-h-[500px] md:min-h-[650px] flex items-center overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/support/supportBanner.png"
              alt="Support Center Banner"
              fill
              className="object-cover object-center"
              priority
            />
            {/* Dark Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
          </div>

          {/* Animated decorative elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full filter blur-3xl animate-pulse z-0" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-400/10 rounded-full filter blur-3xl animate-pulse delay-1000 z-0" />

          <div className="container-custom text-center relative z-10 w-full px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-gray-700"
            >
              <FiHelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold uppercase text-gray-300 tracking-wider">
                Support Center
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 px-2"
            >
              How can we{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                help you?
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto px-2"
            >
              We're here to assist you with any questions or concerns you may
              have.
            </motion.p>
          </div>
        </section>

        {/* Application Status Tracker - Imported Component */}
        <ApplicationStatus />

        {/* Support Channels */}
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="container-custom px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Get in{" "}
                <span className="bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
                  Touch
                </span>
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Choose your preferred way to contact us
              </p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {supportChannels.map((channel, index) => (
                <motion.a
                  key={index}
                  href={channel.action}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ y: -5 }}
                  className="bg-gray-50 rounded-2xl p-6 sm:p-8 text-center hover:shadow-xl transition-all duration-300 border border-gray-200 group"
                >
                  <div
                    className={`inline-flex p-3 sm:p-4 rounded-xl bg-gradient-to-r ${channel.gradient} mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <channel.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    {channel.title}
                  </h3>
                  <p className="text-gray-600 mb-1 text-sm sm:text-base">
                    {channel.info}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {channel.hours}
                  </p>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="container-custom px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-1.5 mb-4">
                <FiHelpCircle className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-xs font-semibold uppercase text-blue-600 tracking-wider">
                  FAQ
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Frequently Asked{" "}
                <span className="bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
                  Questions
                </span>
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Find answers to common questions about our service
              </p>
            </motion.div>
            <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="bg-gray-50 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 text-left flex justify-between items-center gap-2"
                  >
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">
                      {faq.question}
                    </span>
                    <FiHelpCircle
                      className={`w-5 h-5 text-blue-500 flex-shrink-0 transform transition-transform duration-300 ${openFaq === index ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openFaq === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-4 sm:px-6 pb-4 border-t border-gray-200 pt-3"
                    >
                      <p className="text-gray-600 text-sm sm:text-base">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Self-Help Resources */}
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="container-custom px-4 sm:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Self-Help{" "}
                <span className="bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">
                  Resources
                </span>
              </h2>
              <p className="text-gray-600 text-sm sm:text-base">
                Access guides and connect with our community
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              <Link href="/guides">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  whileHover={{ y: -5 }}
                  className="bg-gray-50 rounded-2xl p-6 sm:p-8 text-center shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 group cursor-pointer"
                >
                  <div className="inline-flex p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                    <FiBookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    User Guides
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">
                    Step-by-step guides to help you manage your account,
                    troubleshoot issues, and maximize your internet experience
                  </p>
                  <span className="text-blue-600 font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all text-sm sm:text-base">
                    View Guides
                    <FiArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </motion.div>
              </Link>
              <Link href="/forum">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  whileHover={{ y: -5 }}
                  className="bg-gray-50 rounded-2xl p-6 sm:p-8 text-center shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 group cursor-pointer"
                >
                  <div className="inline-flex p-3 sm:p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                    <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    Community Forum
                  </h3>
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">
                    Connect with other users, share experiences, get tips, and
                    find answers from our knowledgeable community members
                  </p>
                  <span className="text-blue-600 font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all text-sm sm:text-base">
                    Join Community
                    <FiArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </motion.div>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
