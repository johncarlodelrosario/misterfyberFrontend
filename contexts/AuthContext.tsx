"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  login as loginApi,
  logout as logoutApi,
  getCurrentUser,
} from "@/services/auth";

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  status: string;
  profilePicture?: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const authChecked = useRef(false);

  const checkAuth = useCallback(async () => {
    // Prevent multiple calls
    if (authChecked.current) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        authChecked.current = true;
        return;
      }

      const userData = await getCurrentUser();
      const isAdmin =
        userData.role === "admin" || (userData as any).isAdmin === true;
      const userRole = isAdmin ? "admin" : userData.role || "user";

      setUser({
        id: userData._id || userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userRole,
        status: userData.status,
        profilePicture: userData.profilePicture,
        isAdmin: isAdmin,
      });
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
      authChecked.current = true;
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const response = await loginApi(email, password);
        localStorage.setItem("token", response.token);

        const userData = response.user;
        const isAdmin = userData.role === "admin" || userData.isAdmin === true;
        const userRole = isAdmin ? "admin" : userData.role || "user";

        const newUser = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userRole,
          status: userData.status,
          isAdmin: isAdmin,
        };

        setUser(newUser);
        toast.success(
          `Welcome back, ${userData.firstName || userData.username}!`,
        );

        if (isAdmin || userRole === "admin") {
          router.push("/admin");
        } else {
          router.push("/user/dashboard");
        }
      } catch (error: any) {
        toast.error(error.message || "Login failed");
        throw error;
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      authChecked.current = false;
      router.push("/login");
      toast.success("Logged out successfully");
    }
  }, [router]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
