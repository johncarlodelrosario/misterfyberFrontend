/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    domains: [
      "localhost",
      "misterfyberbackend.onrender.com",
      "your-backend-domain.com",
    ],
    unoptimized: process.env.NODE_ENV === "development",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Compression and optimization
  compress: true,
  swcMinify: true,
  reactStrictMode: false, // Set to false for better performance in production

  // Production optimizations
  productionBrowserSourceMaps: false,

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
    modularizeImports: {
      "react-icons/fi": {
        transform: "react-icons/fi/{{member}}",
      },
      "react-icons/fa": {
        transform: "react-icons/fa/{{member}}",
      },
      "react-icons/ai": {
        transform: "react-icons/ai/{{member}}",
      },
    },
  },

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
    styledComponents: false,
    emotion: false,
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: "/(.*)",
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
        ],
      },
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
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  // Proxy rewrites for development (avoid CORS)
  async rewrites() {
    const isDev = process.env.NODE_ENV === "development";
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://misterfyberbackend.onrender.com";

    const rewrites = [];

    if (isDev) {
      // Development rewrites (to local backend)
      rewrites.push({
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      });
      rewrites.push({
        source: "/uploads/:path*",
        destination: "http://localhost:5000/uploads/:path*",
      });
    } else {
      // Production rewrites (optional - you might not need this if using direct API calls)
      rewrites.push({
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      });
      rewrites.push({
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      });
    }

    return rewrites;
  },

  // Redirects for SEO and UX
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
    // Optimize bundle size
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
            // Separate react-icons into its own chunk
            reactIcons: {
              test: /[\\/]node_modules[\\/]react-icons[\\/]/,
              name: "react-icons",
              chunks: "all",
              priority: 10,
            },
            // Separate chart.js into its own chunk
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

  // On-Demand Entries (for faster development)
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 2,
  },

  // Powering the Next.js build
  poweredByHeader: false,

  // Generate ETags for caching
  generateEtags: true,

  // Trailing slashes
  trailingSlash: false,

  // skipMiddlewareUrlNormalize for performance
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
