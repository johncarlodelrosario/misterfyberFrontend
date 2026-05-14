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
  FiRefreshCw,
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

  const checkApplication = useCallback(
    async (id: string) => {
      setCheckError(null);

      if (!id || id.length < 8) {
        setApplicationValid(null);
        setAppStatus(null);
        setCheckingApp(false);
        return;
      }

      setCheckingApp(true);

      try {
        console.log("[Register] Checking application:", id);
        const result = await checkApplicationStatus(id);
        console.log("[Register] Result:", result);

        if (result.success && result.data?.status === "approved") {
          setApplicationValid(true);
          setAppStatus(result.data);
          if (result.data.email) {
            setValue("email", result.data.email, { shouldValidate: true });
          }
        } else {
          setApplicationValid(false);
          setAppStatus(result.data || null);
          setCheckError(result.message || "Invalid Application ID");
        }
      } catch (error: any) {
        console.error("[Register] Error:", error);
        setApplicationValid(false);
        setAppStatus(null);
        setCheckError(error.message || "Failed to verify application ID");
      } finally {
        setCheckingApp(false);
      }
    },
    [setValue],
  );

  // Debounced check
  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      checkApplication(applicationId);
    }, 500);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
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
      await registerWithApplication({
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
      toast.error(error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (applicationId) {
      checkApplication(applicationId);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#080616]">
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
              className="font-medium text-blue-400 hover:text-blue-300"
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
                <input
                  id="applicationId"
                  {...register("applicationId")}
                  type="text"
                  className={`appearance-none block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-900 text-white ${
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
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
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
                      is still pending approval.
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
                  {checkError.includes("Cannot connect") && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <FiRefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                </div>
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
              <input
                id="username"
                {...register("username")}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-900 text-white"
                placeholder="Choose a username"
              />
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
              <input
                id="email"
                {...register("email")}
                type="email"
                className={`appearance-none block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                  appStatus?.email
                    ? "bg-gray-800 text-gray-300"
                    : "bg-gray-900 text-white"
                } border-gray-700`}
                placeholder="your@email.com"
                readOnly={!!appStatus?.email}
              />
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
                <input
                  id="password"
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-900 text-white pr-10"
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
                <input
                  id="confirmPassword"
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-900 text-white pr-10"
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

          <button
            type="submit"
            disabled={isLoading || checkingApp}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

          <div className="text-center text-sm text-gray-400">
            <p>Don't have an Application ID?</p>
            <Link
              href="/apply"
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Apply for internet connection first →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
