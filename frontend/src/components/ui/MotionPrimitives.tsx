"use client";

import React, { useEffect } from "react";
import {
  motion,
  animate,
  useMotionValue,
  useTransform,
} from "motion/react";

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: UNSLOP_EASE }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGroup({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.045,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.32, ease: UNSLOP_EASE },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const mv = useMotionValue(value);
  const formatted = useTransform(mv, (latest) => {
    const rounded =
      decimals > 0
        ? latest.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : Math.round(latest).toLocaleString();
    return `${prefix}${rounded}${suffix}`;
  });

  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 0.55,
      ease: UNSLOP_EASE,
    });
    return () => controls.stop();
  }, [mv, value]);

  return <motion.span>{formatted}</motion.span>;
}

export function MotionBar({
  pct,
  color,
  delay = 0,
}: {
  pct: number;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      className="h-full origin-left rounded-full"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.48, delay, ease: UNSLOP_EASE }}
      style={{
        width: `${Math.max(4, Math.min(100, pct))}%`,
        backgroundColor: color,
      }}
    />
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
      <motion.path
        d="M6.5 14.5L9.5 8.5L12.5 13.5L15.5 7.5L17.5 12"
        stroke="var(--ww-accent)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0.2, opacity: 0.6 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: UNSLOP_EASE }}
      />
    </svg>
  );
}
