"use client";

import React from "react";
import { motion } from "motion/react";
import { Bell, ChartLine, ShieldCheck } from "@gravity-ui/icons";
import {
  StaggerGroup,
  StaggerItem,
  UNSLOP_EASE,
} from "@/components/ui/MotionPrimitives";

const HIGHLIGHTS = [
  {
    icon: ChartLine,
    title: "Live visibility",
    detail: "Building & meter trends",
  },
  {
    icon: Bell,
    title: "Threshold alerts",
    detail: "Catch spikes early",
  },
  {
    icon: ShieldCheck,
    title: "Scoped access",
    detail: "Role-based isolation",
  },
];

export function AuthVisualShowcase({ className }: { className?: string }) {
  return (
    <div
      className={`ww-panel relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 ${
        className || ""
      }`}
    >
      <div className="relative z-10 space-y-6">
        {/* Minimal status label */}
        <div className="inline-flex items-center gap-2 rounded-full border border-ww-hairline bg-ww-bg px-3 py-1 text-[12px] text-ww-fg-secondary">
          <motion.span
            className="h-2 w-2 rounded-full bg-ww-positive"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <span>WattWise Telemetry</span>
        </div>

        {/* Clean heading */}
        <div>
          <h2 className="text-[22px] font-medium tracking-[-0.02em] text-ww-fg sm:text-[24px]">
            Energy visibility, simplified
          </h2>
          <p className="mt-2 max-w-[460px] text-[14px] leading-relaxed text-ww-fg-secondary">
            Monitor sub-meter consumption, catch off-hours load anomalies, and
            manage building efficiency from a single workspace.
          </p>
        </div>

        {/* Calm Animated Waveform Card */}
        <div className="rounded-[12px] border border-ww-hairline bg-ww-bg p-5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-ww-fg">Grid load curve</span>
            <span className="font-mono text-[11px] text-ww-accent">Active</span>
          </div>

          <div className="relative mt-3 h-36 w-full overflow-hidden">
            <svg
              className="h-full w-full"
              viewBox="0 0 520 130"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="authSimpleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--ww-accent)"
                    stopOpacity={0.22}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--ww-accent)"
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>

              {/* Subtle horizontal reference guides */}
              <line
                x1="0"
                y1="38"
                x2="520"
                y2="38"
                stroke="var(--ww-hairline)"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="72"
                x2="520"
                y2="72"
                stroke="var(--ww-hairline)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="106"
                x2="520"
                y2="106"
                stroke="var(--ww-hairline)"
                strokeWidth="1"
              />

              {/* Soft secondary baseline wave */}
              <motion.path
                d="M0,92 Q65,68 130,84 T260,72 T390,82 T520,66"
                stroke="var(--ww-positive)"
                strokeWidth="1.5"
                strokeOpacity={0.35}
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: UNSLOP_EASE, delay: 0.1 }}
              />

              {/* Area fill under primary wave */}
              <motion.path
                d="M0,88 Q50,36 100,68 T200,46 T300,76 T400,42 T520,52 L520,130 L0,130 Z"
                fill="url(#authSimpleGrad)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, ease: UNSLOP_EASE }}
              />

              {/* Primary load trace */}
              <motion.path
                d="M0,88 Q50,36 100,68 T200,46 T300,76 T400,42 T520,52"
                stroke="var(--ww-accent)"
                strokeWidth="2.2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.3, ease: UNSLOP_EASE }}
              />

              {/* Continuous subtle pulse traveling along curve */}
              <motion.path
                d="M0,88 Q50,36 100,68 T200,46 T300,76 T400,42 T520,52"
                stroke="var(--ww-fg)"
                strokeWidth="2.2"
                strokeOpacity={0.55}
                strokeDasharray="10 90"
                fill="none"
                animate={{ strokeDashoffset: [0, -200] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Minimal 3-item footer */}
      <StaggerGroup className="relative z-10 mt-6 grid grid-cols-1 gap-4 border-t border-ww-hairline pt-5 sm:grid-cols-3">
        {HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <StaggerItem key={item.title} className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-ww-hairline bg-ww-bg text-ww-accent">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[13px] font-medium leading-tight text-ww-fg">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[12px] text-ww-fg-muted">
                  {item.detail}
                </p>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerGroup>
    </div>
  );
}
