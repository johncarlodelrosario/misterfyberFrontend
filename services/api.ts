// services/api.ts - COMPLETE API CLIENT WITH DEBUGGING
import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "https://misterfyberbackend.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 120000, // Increased to 60 seconds
  withCredentials: false, // Important: set to false for CORS
});

// Request interceptor - attaches token to every request
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.url} - Token attached`,
      );
    } else {
      console.log(
        `[API Request] ${config.method?.toUpperCase()} ${config.url} - No token`,
      );
    }

    // Log full URL for debugging
    console.log(`[API Request] Full URL: ${config.baseURL}${config.url}`);

    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  },
);

// Response interceptor - handles errors globally
api.interceptors.response.use(
  (response) => {
    console.log(
      `[API Response] ${response.config.url} - Status: ${response.status}`,
    );
    return response;
  },
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("[API] Request timeout - server may be slow or down");
    }

    if (error.response) {
      console.error(
        `[API Error] ${error.response.config.url} - Status: ${error.response.status}`,
      );
      console.error(`[API Error] Message:`, error.response.data);

      // Handle 401 Unauthorized - token expired or invalid
      if (error.response.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          // Only redirect if not already on login page
          if (!window.location.pathname.includes("/login")) {
            console.log("[API] Token expired, redirecting to login");
            window.location.href = "/login";
          }
        }
      }

      // Handle 403 Forbidden - insufficient permissions
      if (error.response.status === 403) {
        console.error(
          "[API] Forbidden: User does not have required permissions",
        );
      }
    } else if (error.request) {
      console.error("[API] No response received:", error.request);
      console.error("[API] This might be a CORS issue or the server is down");
    } else {
      console.error("[API] Request error:", error.message);
    }

    return Promise.reject(error);
  },
);

export default api;
