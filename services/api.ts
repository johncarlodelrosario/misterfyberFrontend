import axios from "axios";
import toast from "react-hot-toast";

// Cache for pending requests (deduplication)
const pendingRequests = new Map();
const responseCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Safe storage wrapper to handle quota exceeded
const safeStorage = {
  setItem: (key: string, value: string): boolean => {
    try {
      const sizeInMB = new Blob([value]).size / (1024 * 1024);
      if (sizeInMB > 4) {
        console.warn(
          `Data too large (${sizeInMB.toFixed(2)}MB) for localStorage`,
        );
        return false;
      }
      localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      if (e.name === "QuotaExceededError") {
        console.error("Storage quota exceeded, clearing old cache...");
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
    } catch (e) {}
  },
};

// Health check cache
let isBackendHealthy: boolean | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

const checkBackendHealth = async (): Promise<boolean> => {
  const now = Date.now();
  if (
    isBackendHealthy !== null &&
    now - lastHealthCheck < HEALTH_CHECK_INTERVAL
  ) {
    return isBackendHealthy;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      "https://misterfyberbackend.onrender.com/health",
      {
        signal: controller.signal,
        mode: "cors", // Explicitly request CORS
      },
    );
    clearTimeout(timeoutId);

    isBackendHealthy = response.ok;
    lastHealthCheck = now;
    return isBackendHealthy;
  } catch (error) {
    console.warn("Health check failed:", error);
    isBackendHealthy = false;
    lastHealthCheck = now;
    return false;
  }
};

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "https://misterfyberbackend.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false,
  timeout: 30000, // 30 second timeout
});

// Add CORS headers to all requests
api.interceptors.request.use(async (config) => {
  const token =
    typeof window !== "undefined" ? safeStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add CORS headers
  config.headers["Origin"] = window.location.origin;

  const requestKey = `${config.method}-${config.url}-${JSON.stringify(config.params)}-${JSON.stringify(config.data)}`;

  if (pendingRequests.has(requestKey)) {
    console.log(`🔄 Deduplicating request: ${requestKey}`);
    return pendingRequests.get(requestKey);
  }

  if (config.method === "get" && responseCache.has(requestKey)) {
    const cached = responseCache.get(requestKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Cache hit: ${requestKey}`);
      return Promise.reject({ __cached: true, data: cached.data });
    } else {
      responseCache.delete(requestKey);
    }
  }

  return config;
});

// Response interceptor with enhanced retry logic
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

    // Handle CORS errors specifically
    if (error.message?.includes("CORS") || error.code === "ERR_NETWORK") {
      console.error("CORS or Network error detected:", error.message);

      if (!config || config.__retryCount >= 3) {
        // Return a more user-friendly error
        return Promise.reject(
          new Error(
            "Unable to connect to server. Please check your connection and try again.",
          ),
        );
      }

      config.__retryCount = config.__retryCount || 0;
      config.__retryCount += 1;

      // Exponential backoff
      const delay = Math.min(Math.pow(2, config.__retryCount) * 1000, 10000);
      console.log(`Retrying in ${delay}ms (attempt ${config.__retryCount}/3)`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    // Handle network errors with exponential backoff retry
    if (
      error.code === "ERR_NETWORK_IO_SUSPENDED" ||
      error.message?.includes("Network Error") ||
      error.code === "ECONNABORTED" ||
      error.message?.includes("timeout")
    ) {
      console.warn(
        `Network error detected, retry count: ${config?.__retryCount || 0}`,
      );

      if (!config || config.__retryCount >= 3) {
        if (config?.url?.includes("/applications")) {
          console.log("Max retries reached, checking cache fallback...");
          const requestKey = `${config.method}-${config.url}-${JSON.stringify(config.params)}`;
          if (responseCache.has(requestKey)) {
            const cached = responseCache.get(requestKey);
            console.log("Using cached data as fallback");
            return Promise.resolve(cached.data);
          }
        }
        return Promise.reject(error);
      }

      config.__retryCount = config.__retryCount || 0;
      config.__retryCount += 1;

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(Math.pow(2, config.__retryCount) * 1000, 8000);
      console.log(`Retrying in ${delay}ms (attempt ${config.__retryCount}/3)`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        safeStorage.removeItem("token");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
export { safeStorage, checkBackendHealth };
