/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    domains: ["localhost", "your-backend-domain.com", "www.misterfyber.com"],
    unoptimized: process.env.NODE_ENV === "development",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24,
  },

  // Enable compression for faster loading
  compress: true,

  // Use SWC for faster minification
  swcMinify: true,

  // Disable React strict mode in production for performance
  reactStrictMode: false,

  // Disable source maps in production
  productionBrowserSourceMaps: false,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // Generate ETags for better caching
  generateEtags: true,

  // Performance optimizations
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      "react-icons",
      "react-icons/fi",
      "react-icons/fa",
      "react-icons/ai",
      "react-icons/bi",
      "react-icons/md",
      "recharts",
      "chart.js",
      "react-chartjs-2",
      "@heroicons/react",
      "lucide-react",
    ],
    swcTraceProfiling: false,
    // INALIS: legacyBrowsers (invalid key sa Next.js 16)
    optimizeCss: true,
  },

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Rewrites for API (para iwas CORS)
  async rewrites() {
    const apiDestination = "https://www.misterfyber.com/api/:path*";

    return [
      {
        source: "/api/:path*",
        destination: apiDestination,
      },
      {
        source: "/uploads/:path*",
        destination: "https://www.misterfyber.com/uploads/:path*",
      },
    ];
  },

  // Redirects para sa SEO at better UX
  async redirects() {
    return [
      {
        source: "/admin/index",
        destination: "/admin",
        permanent: true,
      },
      {
        source: "/user/index",
        destination: "/user/dashboard",
        permanent: true,
      },
    ];
  },

  // Trailing slash configuration
  trailingSlash: false,

  // Skip middleware for better performance
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
