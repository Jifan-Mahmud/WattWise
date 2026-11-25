"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChartLine, Bell, FileArrowDown } from "@gravity-ui/icons";
import { PublicSiteShell } from "@/components/layout/PublicSiteShell";
import {
  PageEntrance,
  StaggerGroup,
  StaggerItem,
  AnimatedNumber,
  UNSLOP_EASE,
} from "@/components/ui/MotionPrimitives";
import { StatusBadge } from "@/components/ui/DataState";

const ORGS_PREVIEW = [
  {
    name: "Northgrid Commercial Holdings",
    industry: "Commercial Real Estate",
    buildings: 5,
    meters: 40,
    mtdKwh: 621306,
    tariff: "$0.145 / kWh",
    efficiency: 94.4,
  },
  {
    name: "Apex Semiconductor Fab",
    industry: "Industrial Manufacturing",
    buildings: 4,
    meters: 28,
    mtdKwh: 842190,
    tariff: "$0.118 / kWh",
    efficiency: 92.8,
  },
  {
    name: "Metro University Campus",
    industry: "Higher Education",
    buildings: 3,
    meters: 16,
    mtdKwh: 418640,
    tariff: "$0.132 / kWh",
    efficiency: 95.9,
  },
];

export default function PlatformPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const current = ORGS_PREVIEW[selectedIdx];

  return (
    <PublicSiteShell>
      <PageEntrance className="mx-auto max-w-[1280px] space-y-12 px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 border-b border-ww-hairline pb-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[13px] text-ww-accent">Platform</p>
            <h1 className="mt-2 text-[36px] font-medium leading-[1.1] tracking-[-0.025em] text-ww-fg sm:text-[44px]">
              One telemetry surface for multi-site energy teams
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed text-ww-fg-secondary">
              Inspect live sub-meter load across commercial offices, factories,
              and campuses without switching between disconnected spreadsheets.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-ww-fg px-4 text-[14px] font-medium text-ww-bg transition-transform active:scale-[0.98]"
          >
            Launch live workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Interactive Organization Switcher Preview */}
        <div className="ww-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ww-hairline pb-5">
            <div>
              <h2 className="text-[18px] font-medium text-ww-fg">
                Multi-organization telemetry preview
              </h2>
              <p className="text-[13px] text-ww-fg-secondary">
                Select an organization to inspect its live fleet profile
              </p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-[8px] border border-ww-hairline bg-ww-bg p-1">
              {ORGS_PREVIEW.map((org, idx) => {
                const active = idx === selectedIdx;
                return (
                  <button
                    key={org.name}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    className={`relative h-8 rounded-[6px] px-3 text-[13px] transition-colors ${
                      active
                        ? "font-medium text-ww-fg"
                        : "text-ww-fg-secondary hover:text-ww-fg"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="platform-org-pill"
                        transition={{ duration: 0.22, ease: UNSLOP_EASE }}
                        className="absolute inset-0 rounded-[6px] bg-ww-raised"
                      />
                    )}
                    <span className="relative z-10">{org.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.24, ease: UNSLOP_EASE }}
              className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div className="ww-card p-5">
                <p className="text-[12px] text-ww-fg-muted">Organization</p>
                <p className="mt-2 text-[16px] font-medium text-ww-fg">
                  {current.name}
                </p>
                <div className="mt-2">
                  <StatusBadge label={current.industry} tone="neutral" />
                </div>
              </div>
              <div className="ww-card p-5">
                <p className="text-[12px] text-ww-fg-muted">30-day usage</p>
                <p className="mt-2 tabular-nums text-[24px] font-medium text-ww-fg">
                  <AnimatedNumber value={current.mtdKwh} suffix=" kWh" />
                </p>
                <p className="mt-1 font-mono text-[12px] text-ww-fg-muted">
                  {current.tariff}
                </p>
              </div>
              <div className="ww-card p-5">
                <p className="text-[12px] text-ww-fg-muted">Managed assets</p>
                <p className="mt-2 tabular-nums text-[24px] font-medium text-ww-fg">
                  <AnimatedNumber value={current.buildings} suffix=" buildings" />
                </p>
                <p className="mt-1 font-mono text-[12px] text-ww-fg-secondary">
                  {current.meters} active meters
                </p>
              </div>
              <div className="ww-card p-5">
                <p className="text-[12px] text-ww-fg-muted">Efficiency score</p>
                <p className="mt-2 tabular-nums text-[24px] font-medium text-ww-positive">
                  <AnimatedNumber value={current.efficiency} decimals={1} suffix="%" />
                </p>
                <p className="mt-1 text-[12px] text-ww-fg-muted">
                  Live anomaly monitoring
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Core Modules Overview */}
        <StaggerGroup className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StaggerItem>
            <div className="ww-card h-full p-6">
              <ChartLine className="h-4 w-4 text-ww-accent" />
              <h3 className="mt-4 text-[16px] font-medium text-ww-fg">
                Real-time simulation stream
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ww-fg-secondary">
                Facility managers can run live meter simulation ticks directly from
                the overview dashboard to watch kWh draw and alerts update live.
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="ww-card h-full p-6">
              <Bell className="h-4 w-4 text-ww-accent" />
              <h3 className="mt-4 text-[16px] font-medium text-ww-fg">
                Threshold breach triage
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ww-fg-secondary">
                Acknowledge and resolve New alerts inline, with full audit trail
                tracking who acknowledged or closed each spike event.
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="ww-card h-full p-6">
              <FileArrowDown className="h-4 w-4 text-ww-accent" />
              <h3 className="mt-4 text-[16px] font-medium text-ww-fg">
                Streaming CSV & print PDF
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ww-fg-secondary">
                Stream filtered energy logs straight from MongoDB cursors into
                spreadsheet-safe CSV or print clean executive ledger PDFs.
              </p>
            </div>
          </StaggerItem>
        </StaggerGroup>
      </PageEntrance>
    </PublicSiteShell>
  );
}
