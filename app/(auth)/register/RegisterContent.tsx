"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import {
  FiMail,
  FiLock,
  FiUser,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
} from "react-icons/fi";
import {
  registerWithApplication,
  checkApplicationStatus,
} from "@/services/auth";

const schema = yup.object({
  username: yup
    .string()
    .min(3, "Username must be at least 3 characters")
    .required("Username is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Confirm password is required"),
  applicationId: yup.string().required("Application ID is required"),
});

type FormData = yup.InferType<typeof schema>;

export default function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [applicationValid, setApplicationValid] = useState<boolean | null>(
    null,
  );
  const [checkingApp, setCheckingApp] = useState(false);
  const [appStatus, setAppStatus] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: "",
    },
  });

  const applicationId = watch("applicationId");

  // Check application ID on change
  useEffect(() => {
    const checkApplication = async () => {
      if (!applicationId || applicationId.length < 8) {
        setApplicationValid(null);
        return;
      }

      setCheckingApp(true);
      try {
        const result = await checkApplicationStatus(applicationId);
        if (result.success && result.data) {
          const status = result.data.status;
          if (status === "approved") {
            setApplicationValid(true);
            setAppStatus(result.data);
            // Auto-fill email from application
            if (result.data.email) {
              setValue("email", result.data.email, { shouldValidate: true });
            }
          } else if (status === "pending") {
            setApplicationValid(false);
            setAppStatus({ status: "pending" });
          } else if (status === "rejected") {
            setApplicationValid(false);
            setAppStatus({ status: "rejected" });
          }
        } else {
          setApplicationValid(false);
        }
      } catch (error: any) {
        console.error("Error checking application:", error);
        setApplicationValid(false);
      } finally {
        setCheckingApp(false);
      }
    };

    const timeout = setTimeout(checkApplication, 500);
    return () => clearTimeout(timeout);
  }, [applicationId, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!applicationValid) {
      toast.error("Please enter a valid approved application ID");
      return;
    }

    setIsLoading(true);
    try {
      const response = await registerWithApplication({
        username: data.username,
        email: data.email,
        password: data.password,
        applicationId: data.applicationId,
      });

      toast.success("Registration successful! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: "#080616" }}
    >
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="text-center">
            <span className="text-4xl">🌐</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary-400 hover:text-primary-300"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Application ID */}
            <div>
              <label
                htmlFor="applicationId"
                className="block text-sm font-medium text-gray-300"
              >
                Application ID *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCheckCircle className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="applicationId"
                  {...register("applicationId")}
                  type="text"
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-900 text-white ${
                    applicationValid === true
                      ? "border-green-500"
                      : applicationValid === false
                        ? "border-red-500"
                        : "border-gray-700"
                  }`}
                  placeholder="Enter your Application ID (e.g., SLK2603123456)"
                />
                {checkingApp && (
                  <div className="absolute right-3 top-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-400"></div>
                  </div>
                )}
              </div>
              {applicationValid === true && appStatus && (
                <p className="mt-1 text-sm text-green-400">
                  ✓ Application approved! You can now register.
                </p>
              )}
              {applicationValid === false &&
                appStatus?.status === "pending" && (
                  <p className="mt-1 text-sm text-yellow-400">
                    ⏳ Your application is still pending approval. Please wait
                    for admin approval.
                  </p>
                )}
              {applicationValid === false &&
                appStatus?.status === "rejected" && (
                  <p className="mt-1 text-sm text-red-400">
                    ✗ Your application was rejected. Please contact support.
                  </p>
                )}
              {applicationValid === false && !appStatus && (
                <p className="mt-1 text-sm text-red-400">
                  Invalid Application ID. Please check and try again.
                </p>
              )}
              {errors.applicationId && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.applicationId.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300"
              >
                Username *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  {...register("username")}
                  type="text"
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-900 text-white"
                  placeholder="Choose a username"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300"
              >
                Email Address *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  {...register("email")}
                  type="email"
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-800 text-white"
                  placeholder="your@email.com"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Email is auto-filled from your application
              </p>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300"
              >
                Password *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-900 text-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300"
              >
                Confirm Password *
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-900 text-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !applicationValid}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </div>

          <div className="text-center text-sm text-gray-400">
            <p>Don't have an Application ID?</p>
            <Link
              href="/apply"
              className="text-primary-400 hover:text-primary-300 font-medium"
            >
              Apply for internet connection first →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
