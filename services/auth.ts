// services/auth.ts - COMPLETE AUTH SERVICE WITH FIXED ADMIN ROLE HANDLING
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
  };
  message?: string;
}

export const login = async (
  email: string,
  password: string,
): Promise<LoginResponse> => {
  try {
    console.log("[Auth] Attempting login for:", email);
    console.log("[Auth] API URL:", api.defaults.baseURL);

    const response = await api.post("/auth/login", {
      email: email.trim(),
      password: password,
    });

    console.log("[Auth] Login response:", response.data);

    // Handle different response structures
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

    if (!token || !userData) {
      throw new Error("Missing token or user data in response");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }

    // IMPORTANT FIX: Preserve the role exactly as returned from server
    // For admin users, the server should return role as "admin", "super_admin", or "staff"
    const userRole = userData.role || "user";

    console.log("[Auth] User role from server:", userRole);
    console.log(
      "[Auth] Is admin check:",
      userRole === "admin" ||
        userRole === "super_admin" ||
        userRole === "staff",
    );

    return {
      token,
      user: {
        id: userData._id || userData.id,
        _id: userData._id || userData.id,
        username: userData.username || userData.email.split("@")[0],
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
    console.error("[Auth] Login error details:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
    });

    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      throw new Error("Server is not responding. Please try again later.");
    }

    if (error.message === "Network Error") {
      throw new Error(
        "Cannot connect to server. Please check your internet connection.",
      );
    }

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Invalid email or password";
    throw new Error(errorMessage);
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    console.error("[Auth] Logout error:", error);
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  }
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await api.get("/auth/me");

    let userData;
    if (response.data.data) {
      userData = response.data.data;
    } else if (response.data.user) {
      userData = response.data.user;
    } else {
      userData = response.data;
    }

    // IMPORTANT FIX: Preserve the role exactly as returned from server
    const userRole = userData.role || "user";
    console.log("[Auth] getCurrentUser role:", userRole);

    return {
      _id: userData._id || userData.id,
      id: userData._id || userData.id,
      username: userData.username || userData.email?.split("@")[0] || "",
      email: userData.email || "",
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      role: userRole,
      status: userData.status || "active",
      profilePicture: userData.profilePicture,
    };
  } catch (error: any) {
    console.error("[Auth] Get current user error:", error);
    throw error;
  }
};

export const register = async (userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}): Promise<LoginResponse> => {
  try {
    const response = await api.post("/auth/register", userData);

    let token: string;
    let data: any;

    if (response.data.data) {
      token = response.data.data.token;
      data = response.data.data.user;
    } else if (response.data.token) {
      token = response.data.token;
      data = response.data.user;
    } else {
      throw new Error("Invalid response structure");
    }

    const userRole = data.role || "user";

    return {
      token,
      user: {
        id: data._id || data.id,
        _id: data._id || data.id,
        username: data.username || data.email.split("@")[0],
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: userRole,
        status: "active",
      },
    };
  } catch (error: any) {
    console.error("[Auth] Register error:", error);
    throw error;
  }
};

export const registerWithApplication = async (
  data: RegisterWithApplicationData,
): Promise<LoginResponse> => {
  try {
    console.log("[Auth] Registering with application:", data.applicationId);

    const response = await api.post("/auth/register-with-application", {
      username: data.username,
      email: data.email,
      password: data.password,
      applicationId: data.applicationId,
    });

    console.log("[Auth] Registration response:", response.data);

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
        username: userData.username || data.username,
        email: userData.email || data.email,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        role: userRole,
        status: "active",
      },
    };
  } catch (error: any) {
    console.error(
      "[Auth] Register with application error:",
      error.response?.data || error.message,
    );
    const errorMessage = error.response?.data?.message || "Registration failed";
    throw new Error(errorMessage);
  }
};

export const checkApplicationStatus = async (
  applicationId: string,
): Promise<ApplicationStatusResponse> => {
  try {
    console.log("[Auth] Checking application status:", applicationId);

    // FIXED: Reduced timeout and better error handling
    const response = await api.get(`/auth/check-application/${applicationId}`, {
      timeout: 5000, // 5 second timeout
    });

    console.log("[Auth] Application status response:", response.data);

    // FIXED: Handle all possible response structures immediately
    if (response.data && response.data.data) {
      return {
        success: true,
        data: {
          status: response.data.data.status,
          email: response.data.data.email,
          firstName: response.data.data.firstName,
          lastName: response.data.data.lastName,
          applicationId: response.data.data.applicationId || applicationId,
        },
      };
    }

    if (response.data && response.data.success && response.data.data) {
      return {
        success: true,
        data: {
          status: response.data.data.status,
          email: response.data.data.email,
          firstName: response.data.data.firstName,
          lastName: response.data.data.lastName,
          applicationId: response.data.data.applicationId || applicationId,
        },
      };
    }

    if (
      response.data &&
      (response.data.status === "approved" ||
        response.data.status === "pending" ||
        response.data.status === "rejected")
    ) {
      return {
        success: true,
        data: {
          status: response.data.status,
          email: response.data.email,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          applicationId: response.data.applicationId || applicationId,
        },
      };
    }

    // If we get here, no valid data found
    return {
      success: false,
      message: response.data?.message || "Application not found",
    };
  } catch (error: any) {
    console.error(
      "[Auth] Check application error:",
      error.response?.data || error.message,
    );

    // FIXED: Immediate return for 404
    if (error.response?.status === 404) {
      return {
        success: false,
        message: "Application ID not found",
      };
    }

    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      return {
        success: false,
        message: "Server timeout. Please try again.",
      };
    }

    return {
      success: false,
      message:
        error.response?.data?.message || "Failed to check application status",
    };
  }
};
