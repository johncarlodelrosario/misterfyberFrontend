// frontend/services/api.ts - COMPLETE FIXED VERSION
import axios from "axios";
import toast from "react-hot-toast";

// ==================== CACHE CONFIGURATION ====================
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ITEMS = 15;

// Memory cache for ultra-fast access
const memoryCache = new Map();
const pendingRequests = new Map();

// ==================== SAFE STORAGE ====================
let cacheKeys: string[] = [];

const safeStorage = {
  setItem: (key: string, value: string): boolean => {
    try {
      if (new Blob([value]).size / (1024 * 1024) > 2) return false;

      const storedKeys = localStorage.getItem("cache_keys");
      cacheKeys = storedKeys ? JSON.parse(storedKeys) : [];

      if (cacheKeys.length >= MAX_CACHE_ITEMS && !cacheKeys.includes(key)) {
        const oldestKey = cacheKeys.shift();
        if (oldestKey) localStorage.removeItem(oldestKey);
      }

      if (!cacheKeys.includes(key)) {
        cacheKeys.push(key);
        localStorage.setItem("cache_keys", JSON.stringify(cacheKeys));
      }

      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
      const storedKeys = localStorage.getItem("cache_keys");
      if (storedKeys) {
        const keys = JSON.parse(storedKeys);
        localStorage.setItem(
          "cache_keys",
          JSON.stringify(keys.filter((k: string) => k !== key)),
        );
      }
    } catch {}
  },
};

// ==================== BACKEND URL ====================
const getApiUrl = (): string => {
  // Server-side rendering
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "/api";
  }

  // Use relative /api in production (handled by next.config.js rewrites)
  // This is the KEY FIX - use relative path so rewrites work
  const isProduction =
    process.env.NODE_ENV === "production" ||
    window.location.hostname.includes("vercel.app") ||
    window.location.hostname.includes("misterfyber.com");

  if (isProduction) {
    // Use relative path - next.config.js rewrites will proxy to backend
    return "/api";
  }

  // Development - use localhost
  return "http://localhost:5000/api";
};

// ==================== AXIOS INSTANCE ====================
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true, // Important for cookies
  timeout: 30000, // Increased timeout for production
});

// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use(
  async (config) => {
    // Add token
    const token =
      typeof window !== "undefined" ? safeStorage.getItem("token") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Remove cache headers
    delete config.headers["cache-control"];
    delete config.headers["Cache-Control"];

    // Generate request key for deduplication
    const requestKey = `${config.method}-${config.url}-${JSON.stringify(
      config.params || {},
    )}-${JSON.stringify(config.data || {})}`;

    // Check if request is already in flight
    if (pendingRequests.has(requestKey)) {
      return pendingRequests.get(requestKey);
    }

    // Check memory cache for GET requests
    if (config.method === "get") {
      const cached = memoryCache.get(requestKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return Promise.reject({ __cached: true, data: cached.data });
      }
    }

    // Store the request key in config for response interceptor
    (config as any).__requestKey = requestKey;
    (config as any).__isGetRequest = config.method === "get";
    (config as any).__cacheKey = requestKey;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ==================== RESPONSE INTERCEPTOR ====================
api.interceptors.response.use(
  (response) => {
    const config = response.config as any;
    const requestKey = config.__requestKey;

    // Remove from pending requests
    pendingRequests.delete(requestKey);

    // Cache GET responses in memory
    if (config.__isGetRequest && response.data) {
      memoryCache.set(requestKey, {
        data: response,
        timestamp: Date.now(),
      });

      // Auto-expire cache
      setTimeout(() => memoryCache.delete(requestKey), CACHE_DURATION);
    }

    return response;
  },
  async (error) => {
    // Handle cached responses
    if (error?.__cached) {
      return Promise.resolve(error.data);
    }

    const config = error.config;
    if (!config) return Promise.reject(error);

    // Remove from pending requests
    const requestKey = config.__requestKey;
    if (requestKey) pendingRequests.delete(requestKey);

    // Network errors - fast retry with backoff
    if (
      error.code === "ERR_NETWORK" ||
      error.message?.includes("Network Error") ||
      error.code === "ECONNABORTED" ||
      error.message?.includes("timeout")
    ) {
      // Try cache first
      if (config.__cacheKey && memoryCache.has(config.__cacheKey)) {
        const cached = memoryCache.get(config.__cacheKey);
        if (Date.now() - cached.timestamp < CACHE_DURATION) {
          return Promise.resolve(cached.data);
        }
      }

      // Retry logic
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 2) {
        config.__retryCount += 1;
        const delay = config.__retryCount * 300;

        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(config);
      }
    }

    // Auth errors
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        safeStorage.removeItem("token");
        if (
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register") &&
          !window.location.pathname.includes("/application-status")
        ) {
          window.location.href = "/login";
        }
      }
    }

    // Silent fail for non-critical errors in production
    if (
      process.env.NODE_ENV === "production" &&
      error.response?.status >= 500
    ) {
      console.warn("Server error:", error.response?.status);
      return Promise.reject({ __silent: true, message: "Server error" });
    }

    return Promise.reject(error);
  },
);

export default api;
export { safeStorage };
