"use client";

import React from "react";

export interface VerifiedBadgeProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  title?: string;
  showTooltip?: boolean;
}

const sizeMap = {
  xs: "size-3.5 min-w-3.5",
  sm: "size-4 min-w-4",
  md: "size-5 min-w-5",
  lg: "size-6 min-w-6",
  xl: "size-8 min-w-8",
};

/**
 * Official Blue Verified Badge
 * Matches geometry and color palette of public/verified-badge.json:
 * Circle fill: Official Blue (#1877F2 / #1138F7)
 * Path: White checkmark (M152 252 L225 325 L360 178)
 * Lifetime permanent verification badge.
 */
export default function VerifiedBadge({
  size = "sm",
  className = "",
  title = "Verified Contestant • Identity & Aadhaar Verified",
  showTooltip = true,
}: VerifiedBadgeProps) {
  const sizeClass = sizeMap[size] || sizeMap.sm;

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 align-middle select-none transition-transform hover:scale-110 ${className}`}
      title={showTooltip ? title : undefined}
      role="img"
      aria-label="Verified Contestant"
    >
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClass} drop-shadow-[0_1px_3px_rgba(24,119,242,0.45)]`}
      >
        <circle cx="256" cy="256" r="256" fill="#1877F2" />
        <path
          d="M152 254L225 327L360 176"
          stroke="#FFFFFF"
          strokeWidth="46"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
