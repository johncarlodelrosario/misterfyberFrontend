/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    domains: ["localhost", "your-backend-domain.com", "www.misterfyber.com"],
    unoptimized: process.env.NODE_ENV === "development",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours
  },

  // Enable compression for faster loading
  compress: true,

  // Use SWC for faster minification (2-3x faster than Babel)
  swcMinify: true,

  // Disable React strict mode in production for performance
  reactStrictMode: false,

  // Disable source maps in production (reduces bundle size)
  productionBrowserSourceMaps: false,

  // Powering the Next.js build (remove for security)
  poweredByHeader: false,

  // Generate ETags for better caching
  generateEtags: true,

  // Performance optimizations
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 60 seconds
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
    legacyBrowsers: false,
    optimizeCss: true, // Optimize CSS for faster loading
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production (keep errors and warnings)
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
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
    // Use the correct destination: www.misterfyber.com
    const apiDestination = "https://www.misterfyber.com/api/:path*";

    return [
      {
        source: "/api/:path*",
        destination: apiDestination,
      },
      // Para sa uploads/images
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

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Optimize bundle size (only in production)
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            // Separate vendor chunks
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
              name: "vendors",
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            // Separate react-icons
            reactIcons: {
              test: /[\\/]node_modules[\\/]react-icons[\\/]/,
              name: "react-icons",
              chunks: "all",
              priority: 10,
            },
            // Separate chart.js
            chartjs: {
              test: /[\\/]node_modules[\\/](chart.js|react-chartjs-2)[\\/]/,
              name: "chartjs",
              chunks: "all",
              priority: 10,
            },
          },
        },
      };
    }

    // Ignore warnings from specific packages
    config.ignoreWarnings = [
      { module: /node_modules\/react-icons/ },
      { module: /node_modules\/chart.js/ },
    ];

    return config;
  },

  // Trailing slash configuration
  trailingSlash: false,

  // Skip middleware for better performance
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
