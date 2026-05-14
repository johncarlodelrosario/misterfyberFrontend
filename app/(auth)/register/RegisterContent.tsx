"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  FiAlertCircle,
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
  applicationId: yup
    .string()
    .min(8, "Application ID must be at least 8 characters")
    .required("Application ID is required"),
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
  const [checkError, setCheckError] = useState<string | null>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      applicationId: searchParams?.get("appId") || "",
    },
  });

  const applicationId = watch("applicationId");

  // FIXED: Optimized check application with abort controller
  const checkApplication = useCallback(
    async (id: string) => {
      // Clear previous error
      setCheckError(null);

      if (!id || id.length < 8) {
        setApplicationValid(null);
        setAppStatus(null);
        setCheckingApp(false);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setCheckingApp(true);

      try {
        console.log("[Register] Checking application:", id);
        const result = await checkApplicationStatus(id);
        console.log("[Register] Check result:", result);

        if (result.success && result.data) {
          const status = result.data.status;
          if (status === "approved") {
            setApplicationValid(true);
            setAppStatus(result.data);
            setCheckError(null);
            // Auto-fill email from application
            if (result.data.email) {
              setValue("email", result.data.email, { shouldValidate: true });
            }
          } else if (status === "pending") {
            setApplicationValid(false);
            setAppStatus({ status: "pending" });
            setCheckError("Your application is still pending approval");
          } else if (status === "rejected") {
            setApplicationValid(false);
            setAppStatus({ status: "rejected" });
            setCheckError(
              "Your application was rejected. Please contact support.",
            );
          } else {
            setApplicationValid(false);
            setAppStatus(null);
            setCheckError("Invalid application status");
          }
        } else {
          setApplicationValid(false);
          setAppStatus(null);
          setCheckError(result.message || "Application ID not found");
        }
      } catch (error: any) {
        console.error("[Register] Error checking application:", error);
        setApplicationValid(false);
        setAppStatus(null);
        setCheckError(error.message || "Failed to verify application ID");
      } finally {
        setCheckingApp(false);
      }
    },
    [setValue],
  );

  // FIXED: Debounced effect with cleanup
  useEffect(() => {
    // Clear previous timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // Set new timeout for debounce
    checkTimeoutRef.current = setTimeout(() => {
      checkApplication(applicationId);
    }, 500); // 500ms debounce

    // Cleanup on unmount or when applicationId changes
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [applicationId, checkApplication]);

  const onSubmit = async (data: FormData) => {
    if (!applicationValid) {
      toast.error(checkError || "Please enter a valid approved application ID");
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
      console.error("[Register] Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
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
                  <FiCheckCircle
                    className={`h-5 w-5 ${
                      applicationValid === true
                        ? "text-green-400"
                        : applicationValid === false
                          ? "text-red-400"
                          : "text-gray-400"
                    }`}
                  />
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
                  placeholder="Enter your Application ID (e.g., FOU26053180539)"
                  autoComplete="off"
                />
                {checkingApp && (
                  <div className="absolute right-3 top-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-400"></div>
                  </div>
                )}
              </div>

              {/* Status Messages */}
              {applicationValid === true && appStatus && (
                <div className="mt-2 p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <FiCheckCircle className="h-4 w-4" />✓ Application approved!
                    You can now register.
                  </p>
                </div>
              )}

              {applicationValid === false &&
                appStatus?.status === "pending" && (
                  <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                    <p className="text-sm text-yellow-400 flex items-center gap-2">
                      <FiAlertCircle className="h-4 w-4" />⏳ Your application
                      is still pending approval. Please wait for admin approval.
                    </p>
                  </div>
                )}

              {applicationValid === false &&
                appStatus?.status === "rejected" && (
                  <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <FiAlertCircle className="h-4 w-4" />✗ Your application
                      was rejected. Please contact support.
                    </p>
                  </div>
                )}

              {checkError && !appStatus && (
                <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <FiAlertCircle className="h-4 w-4" />
                    {checkError}
                  </p>
                </div>
              )}

              {errors.applicationId && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.applicationId.message}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-500">
                Need an Application ID?{" "}
                <Link
                  href="/apply"
                  className="text-primary-400 hover:text-primary-300"
                >
                  Apply for internet connection first
                </Link>
              </p>
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
                  autoComplete="off"
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
                  className={`appearance-none block w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${
                    appStatus?.email
                      ? "bg-gray-800 text-gray-300"
                      : "bg-gray-900 text-white"
                  } border-gray-700`}
                  placeholder="your@email.com"
                  readOnly={!!appStatus?.email}
                  autoComplete="off"
                />
              </div>
              {appStatus?.email && (
                <p className="mt-1 text-xs text-green-400">
                  Email auto-filled from your application
                </p>
              )}
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
                  autoComplete="new-password"
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
                  autoComplete="new-password"
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
