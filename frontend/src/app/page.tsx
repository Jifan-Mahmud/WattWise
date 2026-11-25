"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ChartLine,
  ShieldCheck,
  Bell,
  Factory,
  Layers,
  BranchesRight,
  PlugConnection,
  Database,
  Sun,
  Moon,
} from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { PageEntrance, WattWiseMark } from "@/components/ui/MotionPrimitives";
import { StatusBadge } from "@/components/ui/DataState";

const PREVIEW_BARS = [
  { day: "Mon", kwh: 20400, active: false },
  { day: "Tue", kwh: 22100, active: false },
  { day: "Wed", kwh: 19800, active: false },
  { day: "Thu", kwh: 24800, active: false },
  { day: "Fri", kwh: 23400, active: false },
  { day: "Sat", kwh: 14900, active: false },
  { day: "Sun", kwh: 15200, active: false },
  { day: "Mon", kwh: 21900, active: false },
  { day: "Tue", kwh: 25600, active: false },
  { day: "Wed", kwh: 28100, active: true },
];

const ROLE_CAPABILITIES = [
  {
    role: "Organization Admin",
    scope: "Full organization",
    summary:
      "Configure buildings, floors, departments, meters, user roles, and portfolio settings.",
  },
  {
    role: "Facility Manager",
    scope: "Meters & alerts",
    summary:
      "Register meters, tune consumption thresholds, acknowledge spikes, and export reports.",
  },
  {
    role: "Department Manager",
    scope: "Assigned departments",
    summary:
      "Monitor department costs against budget, inspect load history, and review savings.",
  },
  {
    role: "Viewer",
    scope: "Read-only",
    summary:
      "Inspect dashboards, analytics curves, and historical reports with write protection enforced.",
  },
];

const HIERARCHY_NODES = [
  { label: "Organizations", count: "3", icon: ShieldCheck },
  { label: "Buildings", count: "12", icon: Factory },
  { label: "Floors", count: "36", icon: Layers },
  { label: "Departments", count: "60", icon: BranchesRight },
  { label: "Meters", count: "84", icon: PlugConnection },
  { label: "Energy records", count: "60,480", icon: Database },
];

export default function LandingPage() {
  const { user, theme, toggleTheme } = useWattWise();

  return (
    <div className="min-h-screen bg-ww-bg text-ww-fg">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-ww-hairline bg-ww-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 text-ww-fg">
              <WattWiseMark size={20} />
              <span className="text-[16px] font-semibold tracking-[-0.01em]">
                WattWise
              </span>
            </Link>
            <nav className="hidden items-center gap-6 text-[14px] text-ww-fg-secondary md:flex">
              <a href="#preview" className="transition-colors hover:text-ww-fg">
                Platform
              </a>
              <a href="#capabilities" className="transition-colors hover:text-ww-fg">
                Capabilities
              </a>
              <a href="#architecture" className="transition-colors hover:text-ww-fg">
                Architecture
              </a>
              <a href="#roles" className="transition-colors hover:text-ww-fg">
                Roles
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-ww-hairline bg-ww-card text-ww-fg-secondary transition-colors hover:text-ww-fg"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-ww-fg px-4 text-[14px] font-medium text-ww-bg transition-opacity hover:opacity-90"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-[14px] text-ww-fg-secondary transition-colors hover:text-ww-fg"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-ww-fg px-4 text-[14px] font-medium text-ww-bg transition-opacity hover:opacity-90"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Atmospheric Scene Hero */}
      <section className="relative overflow-hidden border-b border-ww-hairline bg-[#141415] text-[#ededed]">
        <div className="pointer-events-none absolute inset-0">
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
        </div>

        <PageEntrance className="relative mx-auto max-w-[1280px] px-4 pt-20 sm:px-6 lg:px-8 lg:pt-28">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 text-[13px] text-[#a1a1a6]">
              <span className="h-2 w-2 rounded-full bg-[#e57a25]" />
              <span>Real-time grid and facility telemetry</span>
            </div>

            <h1 className="mt-4 text-[40px] font-medium leading-[1.06] tracking-[-0.03em] text-[#ededed] sm:text-[56px] lg:text-[64px]">
              Energy intelligence for every building
            </h1>

            <p className="mt-5 max-w-[34rem] text-[18px] leading-[1.55] text-[#a1a1a6]">
              Monitor sub-meter electricity consumption, catch off-hours load
              anomalies, and lower tariff costs across buildings, floors, and
              departments.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="inline-flex h-11 items-center gap-2 rounded-[8px] bg-[#ededed] px-5 text-[14px] font-medium text-[#141415] transition-opacity hover:opacity-90"
              >
                {user ? "Open workspace" : "Launch demo workspace"}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#capabilities"
                className="inline-flex h-11 items-center rounded-[8px] border border-[rgba(237,237,237,0.16)] bg-[#19191b]/80 px-5 text-[14px] font-medium text-[#ededed] transition-colors hover:bg-[#232325]"
              >
                Explore platform
              </a>
            </div>
          </div>

          {/* Coded Product Preview rising from bottom edge */}
          <div id="preview" className="mt-16 translate-y-2">
            <div className="rounded-t-[16px] border border-b-0 border-[rgba(237,237,237,0.12)] bg-[#141415] shadow-2xl">
              {/* Window Top Bar */}
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

              {/* Preview Body */}
              <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-12">
                {/* 4 KPI Strip */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-12">
                  <div className="rounded-[12px] border border-[rgba(237,237,237,0.08)] bg-[#19191b] p-4">
                    <p className="text-[12px] text-[#a1a1a6]">Total consumption</p>
                    <p className="mt-2 tabular-nums text-[24px] font-medium leading-none text-[#ededed]">
                      621,306{" "}
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
                      $90,089
                    </p>
                    <p className="mt-2 font-mono text-[12px] text-[#85858b]">
                      $0.145 / kWh tariff
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-[rgba(237,237,237,0.08)] bg-[#19191b] p-4">
                    <p className="text-[12px] text-[#a1a1a6]">Peak meter load</p>
                    <p className="mt-2 tabular-nums text-[24px] font-medium leading-none text-[#ededed]">
                      279.7{" "}
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
                      94.4%
                    </p>
                    <p className="mt-2 text-[12px] text-[#4cc38a]">
                      256.0 t CO₂e logged
                    </p>
                  </div>
                </div>

                {/* Focal Daily Load Bars */}
                <div className="rounded-[12px] border border-[rgba(237,237,237,0.08)] bg-[#19191b] p-5 lg:col-span-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-medium text-[#ededed]">
                        Daily consumption profile
                      </p>
                      <p className="text-[12px] text-[#85858b]">
                        Trailing 10 days across 40 Northgrid meters
                      </p>
                    </div>
                    <span className="rounded-[6px] border border-[rgba(237,237,237,0.08)] bg-[#232325] px-2.5 py-1 font-mono text-[11px] text-[#a1a1a6]">
                      kWh / day
                    </span>
                  </div>
                  <div className="mt-6 flex h-36 items-end gap-2">
                    {PREVIEW_BARS.map((bar, idx) => {
                      const pct = Math.round((bar.kwh / 30000) * 100);
                      return (
                        <div
                          key={`${bar.day}-${idx}`}
                          className="flex flex-1 flex-col items-center gap-2"
                        >
                          <div className="flex h-28 w-full items-end">
                            <div
                              className="w-full rounded-[6px] transition-colors"
                              style={{
                                height: `${pct}%`,
                                backgroundColor: bar.active
                                  ? "#e57a25"
                                  : "#2b2b2f",
                              }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-[#85858b]">
                            {bar.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Alert Snapshot */}
                <div className="flex flex-col justify-between rounded-[12px] border border-[rgba(237,237,237,0.08)] bg-[#19191b] p-5 lg:col-span-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[14px] font-medium text-[#ededed]">
                        Active anomaly feed
                      </p>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#e57a25]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#e57a25]" />
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
          </div>
        </PageEntrance>
      </section>

      {/* Capabilities */}
      <section
        id="capabilities"
        className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="max-w-2xl">
          <p className="text-[13px] text-ww-accent">Capabilities</p>
          <h2 className="mt-2 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-ww-fg sm:text-[34px]">
            Built for facility engineers and multi-site finance teams
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="ww-card p-6">
            <ChartLine className="h-4 w-4 text-ww-accent" />
            <h3 className="mt-4 text-[16px] font-medium text-ww-fg">
              Server-side time-series analytics
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ww-fg-secondary">
              MongoDB aggregation pipelines compute hourly curves, daily totals,
              monthly baselines, and 7-day load forecasts across tens of thousands
              of readings.
            </p>
          </div>
          <div className="ww-card p-6">
            <Bell className="h-4 w-4 text-ww-accent" />
            <h3 className="mt-4 text-[16px] font-medium text-ww-fg">
              Threshold rules and anomaly triage
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ww-fg-secondary">
              Define per-building or per-meter kWh limits and spike ratios. Exceeding
              a threshold automatically creates a trackable New, Acknowledged, or
              Resolved alert.
            </p>
          </div>
          <div className="ww-card p-6">
            <ShieldCheck className="h-4 w-4 text-ww-accent" />
            <h3 className="mt-4 text-[16px] font-medium text-ww-fg">
              Organization and department isolation
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ww-fg-secondary">
              JWT-verified Better Auth sessions enforce strict tenant isolation,
              department scoping, duplicate reading guards, and read-only Viewer
              locks.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture Scale */}
      <section
        id="architecture"
        className="border-y border-ww-hairline bg-ww-card/40 py-16"
      >
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-[13px] text-ww-accent">Pre-seeded dataset</p>
              <h2 className="mt-2 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-ww-fg">
                Full infrastructure hierarchy in MongoDB Atlas
              </h2>
            </div>
            <p className="text-[14px] text-ww-fg-secondary">
              Every reading maps to meter, department, floor, building, and
              organization.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {HIERARCHY_NODES.map((node) => {
              const Icon = node.icon;
              return (
                <div key={node.label} className="ww-card p-4">
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4 text-ww-fg-muted" />
                    <span className="font-mono text-[11px] text-ww-fg-muted">
                      Active
                    </span>
                  </div>
                  <p className="mt-4 tabular-nums text-[24px] font-medium text-ww-fg">
                    {node.count}
                  </p>
                  <p className="mt-1 text-[13px] text-ww-fg-secondary">
                    {node.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Role Access Matrix */}
      <section
        id="roles"
        className="mx-auto max-w-[1280px] px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[13px] text-ww-accent">Role-based access</p>
            <h2 className="mt-2 text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-ww-fg">
              Four distinct operator perspectives
            </h2>
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Test all 4 roles in demo
            </Button>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_CAPABILITIES.map((item) => (
            <div key={item.role} className="ww-card flex flex-col justify-between p-5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-medium text-ww-fg">
                    {item.role}
                  </h3>
                </div>
                <div className="mt-2">
                  <StatusBadge label={item.scope} tone="neutral" />
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-ww-fg-secondary">
                  {item.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-ww-hairline py-8">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 px-4 text-[13px] text-ww-fg-muted sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 text-ww-fg">
            <WattWiseMark size={18} />
            <span className="font-medium">WattWise</span>
            <span className="text-ww-fg-muted">
              · Smart Energy Consumption Intelligence
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-ww-fg">
              Log in
            </Link>
            <Link href="/register" className="hover:text-ww-fg">
              Create account
            </Link>
            <Link href="/dashboard" className="hover:text-ww-fg">
              Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
