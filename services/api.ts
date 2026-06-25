import axios from "axios";
import toast from "react-hot-toast";

// Cache for pending requests (deduplication)
const pendingRequests = new Map();
const responseCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// LRU Cache for localStorage
const MAX_CACHE_ITEMS = 20;
let cacheKeys: string[] = [];

// Safe storage wrapper with LRU
const safeStorage = {
  setItem: (key: string, value: string): boolean => {
    try {
      const sizeInMB = new Blob([value]).size / (1024 * 1024);
      if (sizeInMB > 2) {
        console.warn(
          `Data too large (${sizeInMB.toFixed(2)}MB) for localStorage`,
        );
        return false;
      }

      // LRU: Remove oldest if cache is full
      try {
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
      } catch (e) {
        // Ignore cache key errors
      }

      localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      if (e.name === "QuotaExceededError") {
        console.error("Storage quota exceeded, clearing old cache...");
        // Clear all caches except current
        const keysToRemove = ["applications_cache", "old_applications_cache"];
        keysToRemove.forEach((k) => {
          if (k !== key) {
            try {
              localStorage.removeItem(k);
            } catch (err) {}
          }
        });
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          return false;
        }
      }
      return false;
    }
  },
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
      // Also remove from cache keys
      try {
        const storedKeys = localStorage.getItem("cache_keys");
        if (storedKeys) {
          const keys = JSON.parse(storedKeys);
          const filtered = keys.filter((k: string) => k !== key);
          localStorage.setItem("cache_keys", JSON.stringify(filtered));
        }
      } catch (e) {}
    } catch (e) {}
  },
};

// Health check cache with non-blocking
let isBackendHealthy: boolean | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
let healthCheckPromise: Promise<boolean> | null = null;

const checkBackendHealth = async (): Promise<boolean> => {
  const now = Date.now();
  if (
    isBackendHealthy !== null &&
    now - lastHealthCheck < HEALTH_CHECK_INTERVAL
  ) {
    return isBackendHealthy;
  }

  // If health check is already in progress, return cached value
  if (healthCheckPromise) {
    return healthCheckPromise;
  }

  healthCheckPromise = (async () => {
    const healthUrls = [
      "http://localhost:5000/health",
      "https://misterfyberbackend.onrender.com/health",
    ];

    for (const url of healthUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(url, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          isBackendHealthy = true;
          lastHealthCheck = now;
          healthCheckPromise = null;
          return true;
        }
      } catch (error) {
        // Silent fail
      }
    }

    isBackendHealthy = false;
    lastHealthCheck = now;
    healthCheckPromise = null;
    return false;
  })();

  return healthCheckPromise;
};

// Determine API URL based on environment
const getApiUrl = () => {
  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"));

  if (isDevelopment) {
    return "http://localhost:5000/api";
  }

  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes("vercel.app")
  ) {
    return "/api";
  }

  return (
    process.env.NEXT_PUBLIC_API_URL ||
    "https://misterfyberbackend.onrender.com/api"
  );
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false,
  timeout: 15000, // Reduced from 30s to 15s
});

// Request interceptor with non-blocking health check
api.interceptors.request.use(async (config) => {
  const token =
    typeof window !== "undefined" ? safeStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  delete config.headers["cache-control"];
  delete config.headers["Cache-Control"];

  // Non-blocking health check - don't await, use with timeout
  if (config.url?.includes("/applications") && config.method === "get") {
    try {
      const isHealthy = await Promise.race([
        checkBackendHealth(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 100)),
      ]);

      if (!isHealthy) {
        const requestKey = `${config.method}-${config.url}-${JSON.stringify(config.params)}`;
        if (responseCache.has(requestKey)) {
          const cached = responseCache.get(requestKey);
          if (Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log("Using cached data while backend wakes up");
            return Promise.reject({ __cached: true, data: cached.data });
          }
        }
      }
    } catch (e) {
      // Silent fail - proceed with request
    }
  }

  const requestKey = `${config.method}-${config.url}-${JSON.stringify(config.params)}-${JSON.stringify(config.data)}`;

  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  if (config.method === "get" && responseCache.has(requestKey)) {
    const cached = responseCache.get(requestKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return Promise.reject({ __cached: true, data: cached.data });
    } else {
      responseCache.delete(requestKey);
    }
  }

  return config;
});

// Response interceptor with optimized retry
api.interceptors.response.use(
  (response) => {
    if (response.config.method === "get") {
      const requestKey = `${response.config.method}-${response.config.url}-${JSON.stringify(response.config.params)}`;
      responseCache.set(requestKey, {
        data: response,
        timestamp: Date.now(),
      });
      setTimeout(() => responseCache.delete(requestKey), CACHE_DURATION);
    }
    return response;
  },
  async (error) => {
    if (error?.__cached) {
      return Promise.resolve(error.data);
    }

    const config = error.config;

    // Handle network errors with exponential backoff
    if (
      error.code === "ERR_NETWORK_IO_SUSPENDED" ||
      error.message?.includes("Network Error") ||
      error.code === "ECONNABORTED" ||
      error.message?.includes("timeout")
    ) {
      if (!config || config.__retryCount >= 2) {
        // Reduced from 3 to 2
        if (config?.url?.includes("/applications")) {
          const requestKey = `${config.method}-${config.url}-${JSON.stringify(config.params)}`;
          if (responseCache.has(requestKey)) {
            const cached = responseCache.get(requestKey);
            return Promise.resolve(cached.data);
          }
        }
        return Promise.reject(error);
      }

      config.__retryCount = config.__retryCount || 0;
      config.__retryCount += 1;

      // Faster backoff: 500ms, 1000ms
      const delay = config.__retryCount * 500;

      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

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

    return Promise.reject(error);
  },
);

export default api;
export { safeStorage, checkBackendHealth };
