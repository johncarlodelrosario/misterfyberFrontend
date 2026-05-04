// contexts/AuthContext.tsx - COMPLETE FIXED FILE
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      const userData = await getCurrentUser();
      console.log("User data from API:", userData);

      // Determine if user is admin based on role or isAdmin flag
      const isAdmin = userData.role !== undefined || userData.isAdmin === true;

      setUser({
        id: userData._id || userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || (isAdmin ? "admin" : "user"),
        status: userData.status,
        profilePicture: userData.profilePicture,
        isAdmin: isAdmin,
      });
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await loginApi(email, password);
      localStorage.setItem("token", response.token);

      const userData = response.user;
      const isAdmin = userData.role !== undefined || userData.isAdmin === true;

      setUser({
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || (isAdmin ? "admin" : "user"),
        status: userData.status,
        isAdmin: isAdmin,
      });

      toast.success(
        `Welcome back, ${userData.firstName || userData.username}!`,
      );

      // Redirect based on role or admin status
      if (isAdmin || userData.role) {
        router.push("/admin");
      } else {
        router.push("/user/dashboard");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      router.push("/login");
      toast.success("Logged out successfully");
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
