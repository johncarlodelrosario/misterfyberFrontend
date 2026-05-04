"use client";

import { IconType } from "react-icons";
import { useEffect, useState } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  color: "primary" | "green" | "blue" | "red" | "yellow" | "purple";
  change?: number | null;
  loading?: boolean;
}

const colorClasses = {
  primary: {
    bg: "bg-primary-100",
    text: "text-primary-600",
    iconBg: "bg-primary-50",
  },
  green: {
    bg: "bg-green-100",
    text: "text-green-600",
    iconBg: "bg-green-50",
  },
  blue: {
    bg: "bg-blue-100",
    text: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  red: {
    bg: "bg-red-100",
    text: "text-red-600",
    iconBg: "bg-red-50",
  },
  yellow: {
    bg: "bg-yellow-100",
    text: "text-yellow-600",
    iconBg: "bg-yellow-50",
  },
  purple: {
    bg: "bg-purple-100",
    text: "text-purple-600",
    iconBg: "bg-purple-50",
  },
};

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  change,
  loading = false,
}: StatsCardProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!loading && typeof value === "number") {
      setIsAnimating(true);
      const duration = 1000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current += increment;
        if (step >= steps) {
          setAnimatedValue(value);
          clearInterval(timer);
          setTimeout(() => setIsAnimating(false), 500);
        } else {
          setAnimatedValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    } else {
      setAnimatedValue(typeof value === "number" ? value : 0);
    }
  }, [value, loading]);

  const displayValue =
    typeof value === "string"
      ? value
      : isAnimating
        ? animatedValue.toLocaleString()
        : value.toLocaleString();

  return (
    <div className="card p-6 hover-lift card-hover animate-slideUp">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900">{displayValue}</p>
          )}
          {change !== undefined && change !== null && !loading && (
            <div
              className={`flex items-center gap-1 mt-2 text-xs font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              <span className="text-lg">{change >= 0 ? "↑" : "↓"}</span>
              <span>{Math.abs(change)}% from last month</span>
            </div>
          )}
        </div>
        <div
          className={`w-14 h-14 ${colorClasses[color].iconBg} rounded-xl flex items-center justify-center shadow-sm`}
        >
          <Icon className={`w-7 h-7 ${colorClasses[color].text}`} />
        </div>
      </div>
    </div>
  );
}
