import axios from "axios";

// Cache for pending requests (deduplication)
const pendingRequests = new Map();
const responseCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "https://misterfyberbackend.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

// Request interceptor - deduplicate identical requests
api.interceptors.request.use(async (config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
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

// Response interceptor
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
  (error) => {
    // Handle deduplication error
    if (error?.__cached) {
      return Promise.resolve(error.data);
    }

    if (error.code === "ECONNABORTED") {
      console.error("[API] Request timeout");
    }

    if (error.response) {
      if (error.response.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
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
