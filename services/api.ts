import axios from "axios";

// Cache for pending requests (deduplication)
const pendingRequests = new Map();
const responseCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Safe storage wrapper to handle quota exceeded
const safeStorage = {
  setItem: (key: string, value: string): boolean => {
    try {
      // Check size before setting
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

        // Clear old cache entries
        const keysToRemove = ["applications_cache", "old_applications_cache"];
        keysToRemove.forEach((k) => {
          if (k !== key) {
            try {
              localStorage.removeItem(k);
            } catch (err) {
              console.error(`Failed to remove ${k}:`, err);
            }
          }
        });

        // Try one more time
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.error("Still cannot save to storage after cleanup");
          return false;
        }
      }
      console.error("Storage error:", e);
      return false;
    }
  },

  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error("Failed to read from storage:", e);
      return null;
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("Failed to remove from storage:", e);
    }
  },
};

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "https://misterfyberbackend.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
  timeout: 30000, // 30 second timeout
});

// Request interceptor - deduplicate identical requests with retry logic
api.interceptors.request.use(async (config) => {
  const token =
    typeof window !== "undefined" ? safeStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Create a unique key for the request
  const requestKey = `${config.method}-${config.url}-${JSON.stringify(config.params)}-${JSON.stringify(config.data)}`;

  // Check if same request is already in progress
  if (pendingRequests.has(requestKey)) {
    console.log(`🔄 Deduplicating request: ${requestKey}`);
    return pendingRequests.get(requestKey);
  }

  // For GET requests, check cache first
  if (config.method === "get" && responseCache.has(requestKey)) {
    const cached = responseCache.get(requestKey);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Cache hit: ${requestKey}`);
      // Cancel the actual request and return cached data
      return Promise.reject({ __cached: true, data: cached.data });
    } else {
      responseCache.delete(requestKey);
    }
  }

  return config;
});

// Response interceptor with retry logic for network errors
api.interceptors.response.use(
  (response) => {
    // Cache GET requests
    if (response.config.method === "get") {
      const requestKey = `${response.config.method}-${response.config.url}-${JSON.stringify(response.config.params)}`;
      responseCache.set(requestKey, {
        data: response,
        timestamp: Date.now(),
      });
      // Clear old cache entries
      setTimeout(() => {
        responseCache.delete(requestKey);
      }, CACHE_DURATION);
    }
    return response;
  },
  async (error) => {
    // Handle deduplication error
    if (error?.__cached) {
      return Promise.resolve(error.data);
    }

    // Handle network I/O suspended errors with retry
    if (
      error.code === "ERR_NETWORK_IO_SUSPENDED" ||
      error.message?.includes("Network Error")
    ) {
      console.warn("Network I/O suspended, retrying...");

      const config = error.config;
      if (!config || config.__retryCount >= 3) {
        return Promise.reject(error);
      }

      config.__retryCount = config.__retryCount || 0;
      config.__retryCount += 1;

      // Exponential backoff
      const delay = Math.pow(2, config.__retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return api(config);
    }

    if (error.code === "ECONNABORTED") {
      console.error("[API] Request timeout");
    }

    if (error.response) {
      if (error.response.status === 401) {
        if (typeof window !== "undefined") {
          safeStorage.removeItem("token");
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
export { safeStorage };
