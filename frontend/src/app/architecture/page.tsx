"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Factory,
  Layers,
  BranchesRight,
  PlugConnection,
  Database,
  ArrowRight,
} from "@gravity-ui/icons";
import { PublicSiteShell } from "@/components/layout/PublicSiteShell";
import {
  PageEntrance,
  StaggerGroup,
  StaggerItem,
  AnimatedNumber,
} from "@/components/ui/MotionPrimitives";

const HIERARCHY_NODES = [
  {
    label: "Organizations",
    count: 3,
    detail: "Northgrid Commercial, Apex Semiconductor, Metro University",
    icon: ShieldCheck,
  },
  {
    label: "Buildings",
    count: 12,
    detail: "Offices, cleanrooms, logistics hubs, and campus facilities",
    icon: Factory,
  },
  {
    label: "Floors",
    count: 36,
    detail: "3 levels per building with square-footage intensity tracking",
    icon: Layers,
  },
  {
    label: "Departments",
    count: 60,
    detail: "HVAC, Chiller, Server Room, Lighting, and Production budgets",
    icon: BranchesRight,
  },
  {
    label: "Meters",
    count: 84,
    detail: "Real-time voltage, power factor, threshold, and health telemetry",
    icon: PlugConnection,
  },
  {
    label: "Energy records",
    count: 60480,
    detail: "Sep–Nov time-series records indexed for sub-second queries",
    icon: Database,
  },
];

export default function ArchitecturePage() {
  return (
    <PublicSiteShell>
      <PageEntrance className="mx-auto max-w-[1280px] space-y-12 px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 border-b border-ww-hairline pb-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[13px] text-ww-accent">Architecture</p>
            <h1 className="mt-2 text-[36px] font-medium leading-[1.1] tracking-[-0.025em] text-ww-fg sm:text-[44px]">
              Full infrastructure hierarchy and time-series pipeline
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed text-ww-fg-secondary">
              Every electricity reading traces back cleanly to its meter,
              department, floor, building, and parent organization in MongoDB Atlas.
            </p>
          </div>
          <Link
            href="/records"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-ww-fg px-4 text-[14px] font-medium text-ww-bg transition-transform active:scale-[0.98]"
          >
            Inspect 60k+ records
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HIERARCHY_NODES.map((node) => {
            const Icon = node.icon;
            return (
              <StaggerItem key={node.label}>
                <div className="ww-card h-full p-5 transition-colors hover:border-ww-hairline-strong">
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4 text-ww-accent" />
                    <span className="font-mono text-[11px] text-ww-fg-muted">
                      Indexed
                    </span>
                  </div>
                  <p className="mt-4 tabular-nums text-[28px] font-medium text-ww-fg">
                    <AnimatedNumber value={node.count} />
                  </p>
                  <p className="mt-1 text-[15px] font-medium text-ww-fg">
                    {node.label}
                  </p>
                  <p className="mt-1.5 text-[13px] text-ww-fg-secondary">
                    {node.detail}
                  </p>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </PageEntrance>
    </PublicSiteShell>
  );
}
