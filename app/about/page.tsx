"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { FiAward, FiUsers, FiGlobe, FiHeart } from "react-icons/fi";

const values = [
  {
    icon: FiAward,
    title: "Excellence",
    description:
      "We strive for excellence in everything we do, from our technology to our customer service.",
  },
  {
    icon: FiUsers,
    title: "Customer First",
    description:
      "Our customers are at the heart of everything we do. We listen, we care, we deliver.",
  },
  {
    icon: FiGlobe,
    title: "Innovation",
    description:
      "We continuously innovate to bring you the latest technology and best internet experience.",
  },
  {
    icon: FiHeart,
    title: "Integrity",
    description:
      "We operate with transparency, honesty, and integrity in all our dealings.",
  },
];

const team = [
  { name: "John Smith", role: "CEO & Founder", image: "/images/team/1.jpg" },
  { name: "Sarah Johnson", role: "CTO", image: "/images/team/2.jpg" },
  {
    name: "Mike Brown",
    role: "Head of Operations",
    image: "/images/team/3.jpg",
  },
  {
    name: "Emily Davis",
    role: "Customer Support Lead",
    image: "/images/team/4.jpg",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="bg-gray-900">
        {/* Hero Section with Banner Image - Increased Height */}
        <section
          className="relative text-white min-h-[500px] md:min-h-[600px] flex items-center bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/about/aboutBanner.png')",
          }}
        >
          {/* Dark overlay for text contrast */}
          <div className="absolute inset-0 bg-black/70" />

          <div className="container-custom text-center relative z-10 w-full">
            <h1 className="text-5xl font-bold mb-4">About Us</h1>
            <p className="text-xl max-w-2xl mx-auto text-gray-200">
              We're on a mission to provide fast, reliable, and affordable
              internet to everyone.
            </p>
          </div>
        </section>

        {/* Our Story - With background that makes text visible over banner */}
        <section className="py-16 bg-gray-900 relative">
          <div className="container-custom">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-4 text-white">
                  Our Story
                </h2>
                <p className="text-gray-400 mb-4">
                  Founded in 2026, MisterFyber started with a simple idea: to
                  provide high-quality internet service that doesn't break the
                  bank. We saw a gap in the market for affordable, reliable
                  internet with exceptional customer support.
                </p>
                <p className="text-gray-400 mb-4">
                  Today, we're proud to serve thousands of satisfied customers
                  across the country. Our team is dedicated to continuously
                  improving our service and bringing you the best internet
                  experience possible.
                </p>
                <p className="text-gray-400">
                  We believe that fast, reliable internet should be accessible
                  to everyone, and we're committed to making that a reality.
                </p>
              </div>
              <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
                <div className="text-center">
                  <div className="text-6xl mb-4">📡</div>
                  <div className="text-4xl font-bold text-blue-400">5000+</div>
                  <div className="text-gray-400">Happy Customers</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="py-16 bg-gray-800">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-white">Our Values</h2>
              <p className="text-gray-400">
                The principles that guide everything we do
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <div
                  key={index}
                  className="bg-gray-900 rounded-2xl p-6 text-center border border-gray-700"
                >
                  <value.icon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    {value.title}
                  </h3>
                  <p className="text-gray-400">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Team */}
        <section className="py-16 bg-gray-900">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-white">
                Meet Our Team
              </h2>
              <p className="text-gray-400">
                The passionate people behind our service
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member, index) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded-2xl p-6 text-center border border-gray-700"
                >
                  <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl">👤</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-1 text-white">
                    {member.name}
                  </h3>
                  <p className="text-gray-400">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-16">
          <div className="container-custom text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to join our family?
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Experience the difference with our premium internet service
            </p>
            <button className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
              Get Started Today
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
