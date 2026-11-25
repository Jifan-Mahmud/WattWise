"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PlugConnection, ShieldCheck } from "@gravity-ui/icons";
import {
  AnimatedNumber,
  StaggerGroup,
  StaggerItem,
  UNSLOP_EASE,
} from "@/components/ui/MotionPrimitives";

interface TelemetrySample {
  code: string;
  building: string;
  kwh: number;
  kw: number;
  voltage: number;
  pf: number;
  status: "Normal" | "Peak" | "Optimal";
}

const LIVE_SAMPLES: TelemetrySample[] = [
  { code: "MTR-NG-01", building: "Northgrid Tower A", kwh: 48.6, kw: 52.1, voltage: 480, pf: 0.98, status: "Normal" },
  { code: "MTR-MRD-04", building: "Meridian Plaza", kwh: 64.2, kw: 68.9, voltage: 479, pf: 0.96, status: "Peak" },
  { code: "MTR-HRB-02", building: "Harbor Exchange", kwh: 36.4, kw: 38.0, voltage: 481, pf: 0.99, status: "Optimal" },
  { code: "MTR-CDA-06", building: "Central Data Annex", kwh: 82.5, kw: 86.4, voltage: 480, pf: 0.97, status: "Normal" },
  { code: "MTR-VNG-03", building: "Vanguard Logistics", kwh: 29.8, kw: 31.2, voltage: 482, pf: 0.98, status: "Optimal" },
];

export function AuthVisualShowcase({ className }: { className?: string }) {
  const [sampleIdx, setSampleIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSampleIdx((prev) => (prev + 1) % LIVE_SAMPLES.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const sample = LIVE_SAMPLES[sampleIdx];

  return (
    <div
      className={`ww-panel relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 ${
        className || ""
      }`}
    >
      {/* Subtle ambient background glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ww-accent/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-ww-positive/5 blur-3xl" />

      <div className="relative z-10 space-y-6">
        {/* Header strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-ww-hairline bg-ww-bg px-3 py-1 font-mono text-[12px] text-ww-fg">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ww-positive opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ww-positive" />
            </span>
            <span>Live telemetry stream</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-ww-fg-muted">
            <PlugConnection className="h-3.5 w-3.5 text-ww-accent" />
            <span>84 active smart meters</span>
          </div>
        </div>

        <div>
          <h2 className="text-[20px] font-medium tracking-[-0.015em] text-ww-fg sm:text-[22px]">
            Energy intelligence & load optimization
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ww-fg-secondary">
            Continuous sub-meter monitoring, automated baseline anomaly flagging,
            and Scope 2 carbon accounting across enterprise commercial portfolios.
          </p>
        </div>

        {/* Animated Telemetry Waveform */}
        <div className="rounded-[12px] border border-ww-hairline bg-ww-bg p-4">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-ww-fg">Diurnal load trace (kWh)</span>
            <span className="font-mono text-ww-accent font-medium">Nov 2026 baseline</span>
          </div>

          <div className="relative mt-2 h-28 w-full overflow-hidden">
            <svg
              className="h-full w-full"
              viewBox="0 0 520 110"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="authTelemetryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ww-accent)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--ww-accent)" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Shaded Area Under Wave */}
              <motion.path
                d="M0,75 Q40,30 80,60 T160,40 T240,65 T320,35 T400,50 T480,25 T520,40 L520,110 L0,110 Z"
                fill="url(#authTelemetryGrad)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, ease: UNSLOP_EASE }}
              />

              {/* Crisp Animated Wave Stroke */}
              <motion.path
                d="M0,75 Q40,30 80,60 T160,40 T240,65 T320,35 T400,50 T480,25 T520,40"
                stroke="var(--ww-accent)"
                strokeWidth="2.2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease: UNSLOP_EASE }}
              />

              {/* Reference Baseline Line */}
              <line
                x1="0"
                y1="55"
                x2="520"
                y2="55"
                stroke="var(--ww-fg-muted)"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.4"
              />

              {/* Pulsing telemetry marker at peak load */}
              <circle cx="480" cy="25" r="4.5" fill="var(--ww-accent)" />
              <circle
                cx="480"
                cy="25"
                r="9"
                fill="var(--ww-accent)"
                opacity="0.35"
                className="animate-ping"
              />
            </svg>
          </div>
        </div>

        {/* 4 Staggered Live Metric Counters */}
        <StaggerGroup className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StaggerItem className="rounded-[10px] border border-ww-hairline bg-ww-bg p-3">
            <p className="text-[11px] text-ww-fg-muted">Consumption</p>
            <p className="mt-1 tabular-nums text-[18px] font-medium leading-none text-ww-fg">
              <AnimatedNumber value={621306} />
            </p>
            <p className="mt-1 text-[11px] text-ww-positive">30d verified</p>
          </StaggerItem>

          <StaggerItem className="rounded-[10px] border border-ww-hairline bg-ww-bg p-3">
            <p className="text-[11px] text-ww-fg-muted">Peak load</p>
            <p className="mt-1 tabular-nums text-[18px] font-medium leading-none text-ww-fg">
              <AnimatedNumber value={279.7} decimals={1} />
            </p>
            <p className="mt-1 text-[11px] text-ww-accent">kW demand</p>
          </StaggerItem>

          <StaggerItem className="rounded-[10px] border border-ww-hairline bg-ww-bg p-3">
            <p className="text-[11px] text-ww-fg-muted">Efficiency</p>
            <p className="mt-1 tabular-nums text-[18px] font-medium leading-none text-ww-fg">
              <AnimatedNumber value={94.4} decimals={1} suffix="%" />
            </p>
            <p className="mt-1 text-[11px] text-ww-positive">High rating</p>
          </StaggerItem>

          <StaggerItem className="rounded-[10px] border border-ww-hairline bg-ww-bg p-3">
            <p className="text-[11px] text-ww-fg-muted">Carbon offset</p>
            <p className="mt-1 tabular-nums text-[18px] font-medium leading-none text-ww-fg">
              <AnimatedNumber value={256.0} decimals={1} />
            </p>
            <p className="mt-1 text-[11px] text-ww-fg-muted">t CO₂e</p>
          </StaggerItem>
        </StaggerGroup>

        {/* Dynamic Telemetry Packet Feed Ticker */}
        <div className="rounded-[10px] border border-ww-hairline bg-ww-bg p-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-ww-fg-secondary">Current meter packet:</span>
            <span className="font-mono text-[11px] text-ww-fg-muted">
              Auto-sampling every 4s
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={sample.code}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: UNSLOP_EASE }}
              className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-ww-hairline pt-2 font-mono text-[12px]"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-ww-fg">{sample.code}</span>
                <span className="text-ww-fg-muted">·</span>
                <span className="text-ww-fg-secondary truncate max-w-[140px] sm:max-w-none">
                  {sample.building}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-ww-fg-secondary">{sample.voltage}V</span>
                <span className="text-ww-fg-secondary">PF {sample.pf}</span>
                <span className="font-medium text-ww-accent">{sample.kwh} kWh</span>
                <span
                  className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium ${
                    sample.status === "Peak"
                      ? "bg-ww-negative-soft text-ww-negative"
                      : sample.status === "Optimal"
                      ? "bg-ww-positive-soft text-ww-positive"
                      : "bg-ww-raised text-ww-fg"
                  }`}
                >
                  {sample.status}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Verified Dataset Scale Footer */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-ww-hairline pt-4 font-mono text-[11px] text-ww-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-ww-positive" />
          Enterprise multi-tenant isolation
        </span>
        <span>3 orgs · 12 bldgs · 84 meters · 60,480 readings</span>
      </div>
    </div>
  );
}
