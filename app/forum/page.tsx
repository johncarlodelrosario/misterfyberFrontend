"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/layout/Footer";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  FiUsers,
  FiSearch,
  FiMessageSquare,
  FiThumbsUp,
  FiMessageCircle,
  FiUser,
  FiClock,
  FiTag,
  FiTrendingUp,
  FiAward,
  FiBookOpen,
  FiHelpCircle,
  FiArrowRight,
  FiPlus,
} from "react-icons/fi";
import Link from "next/link";

const categories = [
  {
    name: "General Discussion",
    count: 234,
    icon: FiUsers,
    color: "from-blue-500 to-cyan-500",
  },
  {
    name: "Technical Support",
    count: 567,
    icon: FiHelpCircle,
    color: "from-purple-500 to-pink-500",
  },
  {
    name: "Tips & Tricks",
    count: 189,
    icon: FiBookOpen,
    color: "from-green-500 to-emerald-500",
  },
  {
    name: "Announcements",
    count: 45,
    icon: FiTrendingUp,
    color: "from-yellow-500 to-orange-500",
  },
];

const trendingTopics = [
  {
    title: "Best router settings for gaming",
    category: "Technical Support",
    replies: 45,
    views: 1234,
    likes: 89,
    lastActive: "2 hours ago",
  },
  {
    title: "How to maximize your fiber internet speed",
    category: "Tips & Tricks",
    replies: 32,
    views: 892,
    likes: 67,
    lastActive: "5 hours ago",
  },
  {
    title: "New customer introduction thread",
    category: "General Discussion",
    replies: 128,
    views: 2341,
    likes: 234,
    lastActive: "1 day ago",
  },
  {
    title: "Maintenance scheduled for this weekend",
    category: "Announcements",
    replies: 23,
    views: 567,
    likes: 45,
    lastActive: "3 hours ago",
  },
];

const recentPosts = [
  {
    title: "Having issues with video calls",
    author: "john_doe",
    category: "Technical Support",
    replies: 5,
    views: 78,
    timeAgo: "10 minutes ago",
  },
  {
    title: "Thanks for the amazing service!",
    author: "maria_s",
    category: "General Discussion",
    replies: 3,
    views: 45,
    timeAgo: "1 hour ago",
  },
  {
    title: "Tip: Place your router here for best coverage",
    author: "tech_guru",
    category: "Tips & Tricks",
    replies: 12,
    views: 234,
    timeAgo: "3 hours ago",
  },
  {
    title: "Speed test results - Fiber plan",
    author: "speed_demon",
    category: "General Discussion",
    replies: 8,
    views: 156,
    timeAgo: "5 hours ago",
  },
];

const topContributors = [
  { name: "TechGuru", posts: 1234, reputation: 5678, avatar: "/avatars/1.jpg" },
  {
    name: "SpeedMaster",
    posts: 892,
    reputation: 3456,
    avatar: "/avatars/2.jpg",
  },
  {
    name: "HelpfulHand",
    posts: 756,
    reputation: 2890,
    avatar: "/avatars/3.jpg",
  },
  {
    name: "FiberExpert",
    posts: 634,
    reputation: 2345,
    avatar: "/avatars/4.jpg",
  },
];

export default function ForumPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-emerald-500 to-blue-600 z-50 origin-left"
        style={{ scaleX }}
      />
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-20">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-800">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-400/20 rounded-full filter blur-3xl animate-pulse delay-1000" />

          <div className="container-custom text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6"
            >
              <FiUsers className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-semibold uppercase text-white tracking-wider">
                Community Forum
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
            >
              Join the{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-emerald-200">
                Conversation
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-xl text-blue-100 max-w-2xl mx-auto"
            >
              Connect with other users, share experiences, and get help from our
              community
            </motion.p>

            {/* Search Bar and New Post Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="max-w-3xl mx-auto mt-8 flex gap-3"
            >
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-0 shadow-lg focus:ring-2 focus:ring-white/50 text-gray-900 placeholder-gray-400"
                />
              </div>
              <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 inline-flex items-center gap-2">
                <FiPlus className="w-5 h-5" />
                New Post
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex justify-center gap-8 mt-8"
            >
              <div className="text-center">
                <div className="text-2xl font-bold text-white">2,345</div>
                <div className="text-sm text-blue-200">Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">8,912</div>
                <div className="text-sm text-blue-200">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">456</div>
                <div className="text-sm text-blue-200">Topics</div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-20 bg-white">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Discussion{" "}
                <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                  Categories
                </span>
              </h2>
              <p className="text-gray-500">Browse discussions by topic</p>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-6">
              {categories.map((category, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center group cursor-pointer"
                >
                  <div
                    className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${category.color} mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {category.count} topics
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trending Topics */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="flex justify-between items-center mb-8"
            >
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  Trending{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                    Topics
                  </span>
                </h2>
                <p className="text-gray-500">
                  Most active discussions right now
                </p>
              </div>
              <Link
                href="#"
                className="text-blue-600 font-medium hover:underline hidden md:block"
              >
                View All →
              </Link>
            </motion.div>

            <div className="space-y-4">
              {trendingTopics.map((topic, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ x: 5 }}
                  className="bg-white rounded-xl p-5 shadow-md border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {topic.category}
                        </span>
                        <span className="text-xs text-gray-400">
                          Last active {topic.lastActive}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {topic.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <FiMessageCircle className="w-3.5 h-3.5" />
                          {topic.replies} replies
                        </span>
                        <span className="flex items-center gap-1">
                          <FiUsers className="w-3.5 h-3.5" />
                          {topic.views} views
                        </span>
                        <span className="flex items-center gap-1">
                          <FiThumbsUp className="w-3.5 h-3.5" />
                          {topic.likes} likes
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-blue-600">
                        <FiThumbsUp className="w-4 h-4" />
                      </button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                        Reply
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Posts & Top Contributors */}
        <section className="py-20 bg-white">
          <div className="container-custom">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Recent Posts */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="flex justify-between items-center mb-6"
                >
                  <h2 className="text-2xl font-bold text-gray-900">
                    Recent <span className="text-blue-600">Posts</span>
                  </h2>
                  <Link
                    href="#"
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    View All →
                  </Link>
                </motion.div>

                <div className="space-y-3">
                  {recentPosts.map((post, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.5 }}
                      viewport={{ once: true }}
                      className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              {post.category}
                            </span>
                            <span className="text-xs text-gray-400">
                              {post.timeAgo}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {post.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <FiUser className="w-3 h-3" />
                              {post.author}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiMessageCircle className="w-3 h-3" />
                              {post.replies} replies
                            </span>
                            <span className="flex items-center gap-1">
                              <FiUsers className="w-3 h-3" />
                              {post.views} views
                            </span>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition">
                          Reply
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Top Contributors */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <FiAward className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-xl font-bold text-gray-900">
                      Top <span className="text-blue-600">Contributors</span>
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {topContributors.map((contributor, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                          {contributor.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {contributor.name}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{contributor.posts} posts</span>
                            <span>{contributor.reputation} reputation</span>
                          </div>
                        </div>
                        {idx === 0 && (
                          <FiAward className="w-5 h-5 text-yellow-500" />
                        )}
                        {idx === 1 && (
                          <FiAward className="w-5 h-5 text-gray-400" />
                        )}
                        {idx === 2 && (
                          <FiAward className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <Link
                      href="#"
                      className="inline-flex items-center justify-center w-full gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition"
                    >
                      Become a Contributor
                      <FiArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>

                {/* Community Guidelines */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  viewport={{ once: true }}
                  className="mt-6 bg-blue-50 rounded-2xl p-5"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Community Guidelines
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Be respectful, helpful, and follow our community rules
                  </p>
                  <Link
                    href="#"
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    Read Guidelines →
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-900 via-blue-800 to-emerald-900">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Can't Find What You're Looking For?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Our support team is always here to help
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/support"
                  className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:shadow-xl transition-all duration-300 inline-flex items-center gap-2 justify-center"
                >
                  Contact Support
                  <FiArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/guides"
                  className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300 inline-flex items-center gap-2 justify-center"
                >
                  Browse Guides
                  <FiBookOpen className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
