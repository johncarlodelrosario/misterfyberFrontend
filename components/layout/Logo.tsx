// components/layout/Logo.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "" }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center group ${className}`}>
      <div className="relative">
        <Image
          src="/misterfyber.png"
          alt="MisterFyber Logo"
          width={100}
          height={100}
          className="transition-transform duration-300 group-hover:scale-110"
          priority
        />
      </div>
    </Link>
  );
}
