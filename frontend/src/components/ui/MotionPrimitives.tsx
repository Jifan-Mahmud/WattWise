"use client";

import React from "react";
import { motion } from "motion/react";

export const UNSLOP_EASE = [0.22, 1, 0.36, 1] as const;

export function PageEntrance({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: UNSLOP_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function WattWiseMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.6"
        className="text-ww-hairline-strong"
      />
      <path
        d="M6.5 14.5L9.5 8.5L12.5 13.5L15.5 7.5L17.5 12"
        stroke="var(--ww-accent)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
