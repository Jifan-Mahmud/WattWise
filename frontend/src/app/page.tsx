"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight } from "@gravity-ui/icons";
import { useWattWise } from "@/components/providers/AppProviders";
import { PublicSiteShell } from "@/components/layout/PublicSiteShell";
import {
  StaggerGroup,
  StaggerItem,
  AnimatedNumber,
  UNSLOP_EASE,
} from "@/components/ui/MotionPrimitives";

const PREVIEW_BARS = [
  { day: "Mon 16", short: "Mon", kwh: 20400 },
  { day: "Tue 17", short: "Tue", kwh: 22100 },
  { day: "Wed 18", short: "Wed", kwh: 19800 },
  { day: "Thu 19", short: "Thu", kwh: 24800 },
  { day: "Fri 20", short: "Fri", kwh: 23400 },
  { day: "Sat 21", short: "Sat", kwh: 14900 },
  { day: "Sun 22", short: "Sun", kwh: 15200 },
  { day: "Mon 23", short: "Mon", kwh: 21900 },
  { day: "Tue 24", short: "Tue", kwh: 25600 },
  { day: "Wed 25", short: "Wed", kwh: 28100 },
];

const QUICK_ROUTES = [
  {
    href: "/platform",
    title: "Platform workspace",
    summary:
      "Explore live overview monitoring, simulation ticks, and interactive controls.",
  },
  {
    href: "/capabilities",
    title: "Capabilities",
    summary:
      "Time-series aggregation, threshold alerting, CSV/PDF reports, and carbon tracking.",
  },
  {
    href: "/architecture",
    title: "System architecture",
    summary:
      "Multi-organization hierarchy, MongoDB compound indexes, and Better Auth JWT flow.",
  },
  {
    href: "/roles",
    title: "Role access matrix",
    summary:
      "Compare Organization Admin, Facility Manager, Department Manager, and Viewer.",
  },
];

export default function LandingPage() {
  const { user } = useWattWise();
  const [activeBarIdx, setActiveBarIdx] = useState(PREVIEW_BARS.length - 1);
  const selectedBar = PREVIEW_BARS[activeBarIdx];

  return (
    <PublicSiteShell>
      {/* Atmospheric Scene Hero */}
      <section className="relative overflow-hidden border-b border-ww-hairline bg-[#141415] text-[#ededed]">
        <motion.div
          initial={{ opacity: 0.55, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: UNSLOP_EASE }}
          className="pointer-events-none absolute inset-0"
        >
          <Image
            src="/hero-turbine.jpg"
            alt="Offshore wind turbine silhouette against a dusk coastal horizon"
            width={1600}
            height={900}
            priority
            className="h-full w-full object-cover object-right opacity-85"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, #141415 0%, #141415 36%, rgba(20,20,21,0.78) 62%, rgba(20,20,21,0.22) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(0deg, #141415 0%, rgba(20,20,21,0.45) 30%, transparent 65%)",
            }}
          />
        </motion.div>

        <div className="relative mx-auto max-w-[1280px] px-4 pt-20 sm:px-6 lg:px-8 lg:pt-28">
          <StaggerGroup className="max-w-xl">
            <StaggerItem>
              <div className="inline-flex items-center gap-2 text-[13px] text-[#a1a1a6]">
                <span className="h-2 w-2 rounded-full bg-[#e57a25]" />
                <span>Real-time grid and facility telemetry</span>
              </div>
            </StaggerItem>

            <StaggerItem>
              <h1 className="mt-4 text-[40px] font-medium leading-[1.06] tracking-[-0.03em] text-[#ededed] sm:text-[56px] lg:text-[64px]">
                Energy intelligence for every building
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="mt-5 max-w-[34rem] text-[18px] leading-[1.55] text-[#a1a1a6]">
                Monitor sub-meter electricity consumption, catch off-hours load
                anomalies, and lower tariff costs across buildings, floors, and
                departments.
              </p>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={user ? "/dashboard" : "/login"}
                  className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#ededed] px-5 text-[14px] font-medium text-[#141415] transition-transform hover:opacity-95 active:scale-[0.98]"
                >
                  {user ? "Open workspace" : "Launch demo workspace"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/platform"
                  className="inline-flex h-11 items-center rounded-[8px] border border-[rgba(237,237,237,0.16)] bg-[#19191b]/80 px-5 text-[14px] font-medium text-[#ededed] transition-colors hover:bg-[#232325] active:scale-[0.98]"
                >
                  Explore platform
                </Link>
              </div>
            </StaggerItem>
          </StaggerGroup>

          {/* Coded Product Preview rising from bottom edge */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: UNSLOP_EASE }}
            className="mt-16 translate-y-2"
          >
            <div className="rounded-t-[16px] border border-b-0 border-[rgba(237,237,237,0.12)] bg-[#141415] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[rgba(237,237,237,0.08)] px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2e2e32]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2e2e32]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2e2e32]" />
                  <span className="ml-3 font-mono text-[12px] text-[#85858b]">
                    Northgrid Commercial Holdings · Overview
                  </span>
                </div>
                <span className="font-mono text-[12px] text-[#a1a1a6]">
                  Nov 2026
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-12">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-12">
                  <div className="rounded-[12px] border border-[rgba(237,237,237,0.08)] bg-[#19191b] p-4">
                    <p className="text-[12px] text-[#a1a1a6]">Total consumption</p>
                    <p className="mt-2 tabular-nums text-[24px] font-medium leading-none text-[#ededed]">
                      <AnimatedNumber value={621306} />{" "}
                      <span className="font-mono text-[12px] text-[#85858b]">
                        kWh
                      </span>
                    </p>
                    <p className="mt-2 text-[12px] text-[#4cc38a]">
                      30-day verified total
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[rgba(237,237,237,0.08)] bg-[#19191b] p-4">
                    <p className="text-[12px] text-[#a1a1a6]">Electricity cost</p>
                    <p className="mt-2 tabular-nums text-[24px] font-medium leading-none text-[#ededed]">
                      <AnimatedNumber value={90089} prefix="$" />
                    </p>
                    <p className="mt-2 font-mono text-[12px] text-[#85858b]">
                      $0.145 / kWh tariff
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[rgba(237,237,237,0.08)] bg-[#19191b] p-4">
                    <p className="text-[12px] text-[#a1a1a6]">Peak meter load</p>
                    <p className="mt-2 tabular-nums text-[24px] font-medium leading-none text-[#ededed]">
                      <AnimatedNumber value={279.7} decimals={1} />{" "}
                      <span className="font-mono text-[12px] text-[#85858b]">
                        kW
                      </span>
                    </p>
                    <p className="mt-2 text-[12px] text-[#e57a25]">
                      112 threshold flags
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[rgba(237,237,237,0.08)] bg-[#19191b] p-4">
                    <p className="text-[12px] text-[#a1a1a6]">Efficiency score</p>
                    <p className="mt-2 tabular-nums text-[24px] font-medium leading-none text-[#ededed]">
                      <AnimatedNumber value={94.4} decimals={1} suffix="%" />
                    </p>
                    <p className="mt-2 text-[12px] text-[#4cc38a]">
                      256.0 t CO₂e logged
                    </p>
                  </div>
                </div>

                {/* Interactive Daily Preview Bars */}
                <div className="rounded-[12px] border border-[rgba(237,237,237,0.08)] bg-[#19191b] p-5 lg:col-span-8">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-medium text-[#ededed]">
                        Daily consumption profile
                      </p>
                      <p className="text-[12px] text-[#85858b]">
                        Hover or select any bar to inspect daily load
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-[6px] border border-[rgba(237,237,237,0.08)] bg-[#232325] px-2.5 py-1 font-mono text-[11px] text-[#ededed]">
                      <span className="text-[#85858b]">{selectedBar.day}:</span>
                      <span className="tabular-nums text-[#e57a25]">
                        {selectedBar.kwh.toLocaleString()} kWh
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 flex h-36 items-end gap-2">
                    {PREVIEW_BARS.map((bar, idx) => {
                      const pct = Math.round((bar.kwh / 30000) * 100);
                      const isActive = idx === activeBarIdx;
                      return (
                        <button
                          key={bar.day}
                          type="button"
                          onMouseEnter={() => setActiveBarIdx(idx)}
                          onClick={() => setActiveBarIdx(idx)}
                          className="flex flex-1 cursor-pointer flex-col items-center gap-2 focus:outline-none"
                        >
                          <div className="flex h-28 w-full items-end">
                            <motion.div
                              initial={{ scaleY: 0 }}
                              animate={{
                                scaleY: 1,
                                backgroundColor: isActive ? "#e57a25" : "#2b2b2f",
                              }}
                              transition={{
                                scaleY: {
                                  duration: 0.45,
                                  delay: 0.25 + idx * 0.035,
                                  ease: UNSLOP_EASE,
                                },
                                backgroundColor: { duration: 0.16 },
                              }}
                              className="w-full origin-bottom rounded-[6px]"
                              style={{ height: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono text-[11px] transition-colors ${
                              isActive ? "text-[#ededed]" : "text-[#85858b]"
                            }`}
                          >
                            {bar.short}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-[12px] border border-[rgba(237,237,237,0.08)] bg-[#19191b] p-5 lg:col-span-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[14px] font-medium text-[#ededed]">
                        Active anomaly feed
                      </p>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#e57a25]">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e57a25]" />
                        Live
                      </span>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      <div className="rounded-[8px] border border-[rgba(237,237,237,0.08)] bg-[#232325] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-[#ededed]">
                            Chiller staging spike
                          </span>
                          <span className="rounded-[4px] bg-[rgba(229,72,77,0.16)] px-1.5 py-0.5 text-[11px] text-[#e5484d]">
                            High
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-[#85858b]">
                          118.4 kWh vs 74.2 kWh baseline
                        </p>
                      </div>
                      <div className="rounded-[8px] border border-[rgba(237,237,237,0.08)] bg-[#141415] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-[#ededed]">
                            Power factor drift
                          </span>
                          <span className="rounded-[4px] bg-[rgba(234,179,8,0.14)] px-1.5 py-0.5 text-[11px] text-[#eab308]">
                            Medium
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-[#85858b]">
                          0.87 PF on Meridian Plaza Feeder 02
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-[12px] text-[#85858b]">
                    Sign in to inspect 60,480 live MongoDB readings.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dedicated Sub-page Navigation Strip */}
      <section className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-8">
        <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ROUTES.map((item) => (
            <StaggerItem key={item.href}>
              <Link
                href={item.href}
                className="ww-card group flex h-full flex-col justify-between p-5 transition-colors hover:border-ww-hairline-strong active:scale-[0.985]"
              >
                <div>
                  <h2 className="text-[16px] font-medium text-ww-fg">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-ww-fg-secondary">
                    {item.summary}
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-ww-accent">
                  Open page
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </section>
    </PublicSiteShell>
  );
}
