import api from "./api";

interface LoginResponse {
  token: string;
  user: {
    id: string;
    _id?: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
    status: string;
    isAdmin?: boolean;
    profilePicture?: string;
  };
}

interface User {
  _id: string;
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  profilePicture?: string;
}

interface RegisterWithApplicationData {
  username: string;
  email: string;
  password: string;
  applicationId: string;
}

interface ApplicationStatusResponse {
  success: boolean;
  data?: {
    status: "pending" | "approved" | "rejected";
    email?: string;
    firstName?: string;
    lastName?: string;
    applicationId: string;
    planName?: string;
    billingStarted?: boolean;
    hasBill?: boolean;
    billInfo?: {
      invoiceNumber: string;
      total: number;
      dueDate: string;
      isProRated: boolean;
    };
  };
  message?: string;
}

// ==================== GET API URL - PRODUCTION FIXED ====================
const getApiUrl = (): string => {
  // Server-side rendering
  if (typeof window === "undefined") {
    return (
      process.env.NEXT_PUBLIC_API_URL ||
      "https://misterfyberbackend.onrender.com/api"
    );
  }

  // Check if in production environment
  const isProduction = process.env.NODE_ENV === "production";

  // Check if on production domain
  const isProdDomain =
    window.location.hostname.includes("vercel.app") ||
    window.location.hostname.includes("misterfyber.com") ||
    window.location.hostname.includes("render.com");

  // ALWAYS USE RENDER BACKEND FOR PRODUCTION
  if (isProduction || isProdDomain) {
    console.log("🌍 PRODUCTION: Using Render backend in authService");
    return "https://misterfyberbackend.onrender.com/api";
  }

  // DEVELOPMENT - Use localhost
  console.log("🛠️ DEVELOPMENT: Using local backend in authService");
  return "http://localhost:5000/api";
};

export const login = async (
  identifier: string,
  password: string,
): Promise<LoginResponse> => {
  try {
    const apiUrl = getApiUrl();
    console.log("🔐 [Auth] Attempting login for:", identifier);
    console.log("🔐 [Auth] Using API URL:", apiUrl);

    const isEmail = identifier.includes("@") && identifier.includes(".");
    const payload = isEmail
      ? { email: identifier, password }
      : { username: identifier, password };

    // Use FULL URL for login
    const response = await api.post(`${apiUrl}/auth/login`, payload);

    let token: string;
    let userData: any;

    if (response.data.data) {
      token = response.data.data.token;
      userData = response.data.data.user;
    } else if (response.data.token) {
      token = response.data.token;
      userData = response.data.user;
    } else {
      throw new Error("Invalid response structure from server");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }

    const userRole = userData.role || "user";

    return {
      token,
      user: {
        id: userData._id || userData.id,
        _id: userData._id || userData.id,
        username: userData.username || userData.email?.split("@")[0] || "",
        email: userData.email,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        role: userRole,
        status: userData.status || "active",
        isAdmin:
          userRole === "admin" ||
          userRole === "super_admin" ||
          userRole === "staff",
        profilePicture: userData.profilePicture,
      },
    };
  } catch (error: any) {
    console.error("❌ [Auth] Login error:", error.message);

    // Enhanced error handling
    if (error.response?.status === 405) {
      throw new Error(
        "Login endpoint not found (405). Please check if the backend is running at: " +
          getApiUrl(),
      );
    }

    if (
      error.code === "ERR_NETWORK" ||
      error.message?.includes("Network Error")
    ) {
      throw new Error(
        "Cannot connect to server. Please check if the backend is running at: " +
          getApiUrl(),
      );
    }

    if (error.message?.includes("CORS")) {
      throw new Error("CORS error. Please check backend CORS configuration.");
    }

    throw new Error(
      error.response?.data?.message || error.message || "Login failed",
    );
  }
};

export const logout = async (): Promise<void> => {
  try {
    const apiUrl = getApiUrl();
    await api.post(`${apiUrl}/auth/logout`);
  } catch (error) {
    console.error("❌ [Auth] Logout error:", error);
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  }
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const apiUrl = getApiUrl();
    console.log("🔐 [Auth] Getting current user from:", `${apiUrl}/auth/me`);

    const response = await api.get(`${apiUrl}/auth/me`);

    let userData;
    if (response.data.data) {
      userData = response.data.data;
    } else if (response.data.user) {
      userData = response.data.user;
    } else {
      userData = response.data;
    }

    return {
      _id: userData._id || userData.id,
      id: userData._id || userData.id,
      username: userData.username || userData.email?.split("@")[0] || "",
      email: userData.email || "",
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      role: userData.role || "user",
      status: userData.status || "active",
      profilePicture: userData.profilePicture,
    };
  } catch (error: any) {
    console.error("❌ [Auth] Get current user error:", error);
    throw error;
  }
};

export const registerWithApplication = async (
  data: RegisterWithApplicationData,
): Promise<LoginResponse> => {
  try {
    const apiUrl = getApiUrl();
    console.log(
      "🔐 [Auth] Registering with application using:",
      `${apiUrl}/auth/register-with-application`,
    );

    const response = await api.post(
      `${apiUrl}/auth/register-with-application`,
      {
        username: data.username,
        email: data.email,
        password: data.password,
        applicationId: data.applicationId,
      },
    );

    let token: string;
    let userData: any;

    if (response.data.data) {
      token = response.data.data.token;
      userData = response.data.data.user;
    } else if (response.data.token) {
      token = response.data.token;
      userData = response.data.user;
    } else {
      throw new Error("Invalid response structure from server");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }

    return {
      token,
      user: {
        id: userData._id || userData.id,
        _id: userData._id || userData.id,
        username: userData.username || data.username,
        email: userData.email || data.email,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        role: userData.role || "user",
        status: "active",
      },
    };
  } catch (error: any) {
    console.error("❌ [Auth] Register error:", error.message);
    throw new Error(
      error.response?.data?.message || error.message || "Registration failed",
    );
  }
};

export const checkApplicationStatus = async (
  applicationId: string,
): Promise<ApplicationStatusResponse> => {
  if (!applicationId || applicationId.length < 8) {
    return {
      success: false,
      message: "Application ID must be at least 8 characters",
    };
  }

  console.log("🔐 [Auth] Checking application status:", applicationId);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const apiUrl = getApiUrl();
    // Use FULL URL for application check
    const url = `${apiUrl}/auth/check-application/${applicationId}`;
    console.log("🔐 [Auth] Checking URL:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: "Application ID not found. Please check and try again.",
        };
      }
      return {
        success: false,
        message: `Server error: ${response.status}`,
      };
    }

    const result = await response.json();
    console.log("[Auth] Application check result:", result);

    const responseData = result.data || result;

    if (responseData.status === "approved") {
      return {
        success: true,
        data: {
          status: "approved",
          email: responseData.email || "",
          firstName: responseData.firstName || "",
          lastName: responseData.lastName || "",
          applicationId: responseData.applicationId || applicationId,
          planName: responseData.planName,
          billingStarted: responseData.billingStarted || false,
          hasBill: responseData.hasBill || false,
          billInfo: responseData.billInfo,
        },
      };
    }

    if (responseData.status === "pending") {
      return {
        success: false,
        message: "Your application is still pending approval. Please wait.",
        data: { status: "pending", applicationId },
      };
    }

    if (responseData.status === "rejected") {
      return {
        success: false,
        message: "Your application was rejected. Please contact support.",
        data: { status: "rejected", applicationId },
      };
    }

    return {
      success: false,
      message: result.message || "Invalid application status",
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("❌ [Auth] Fetch error:", error.name, error.message);

    if (error.name === "AbortError") {
      return {
        success: false,
        message: "Server is taking too long to respond. Please try again.",
      };
    }

    if (
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError")
    ) {
      return {
        success: false,
        message:
          "Cannot connect to server. The backend may be down or waking up from cold start. Please wait a moment and try again.",
      };
    }

    return {
      success: false,
      message: error.message || "Failed to check application status",
    };
  }
};
