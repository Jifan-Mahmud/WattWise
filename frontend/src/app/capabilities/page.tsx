"use client";

import React from "react";
import Link from "next/link";
import {
  ChartLine,
  Bell,
  ShieldCheck,
  Database,
  Bulb,
  FileText,
  ArrowRight,
} from "@gravity-ui/icons";
import { PublicSiteShell } from "@/components/layout/PublicSiteShell";
import {
  PageEntrance,
  StaggerGroup,
  StaggerItem,
} from "@/components/ui/MotionPrimitives";

const CAPABILITIES = [
  {
    icon: ChartLine,
    title: "Server-side time-series analytics",
    description:
      "MongoDB $facet pipelines aggregate hourly diurnal curves, daily usage totals, monthly trends, building kWh/sq ft intensity, and 7-day demand forecasts.",
  },
  {
    icon: Bell,
    title: "Configurable threshold alerting",
    description:
      "Define hourly kWh ceilings or spike-ratio multipliers per organization, building, or individual meter with New, Acknowledged, and Resolved workflows.",
  },
  {
    icon: Database,
    title: "Large-dataset pagination & duplicate guard",
    description:
      "Browse 60,480+ energy records with debounced search, sortable numeric columns, and unique (meterId, timestamp) indexes preventing duplicate ingestion.",
  },
  {
    icon: Bulb,
    title: "Automated efficiency & carbon insights",
    description:
      "Detect off-hours HVAC baseload spikes, pinpoint peak tariff windows, review saving actions, and compute Scope 2 CO₂e emissions consistently.",
  },
  {
    icon: FileText,
    title: "Custom reports & scheduled dispatches",
    description:
      "Generate custom date-range consumption ledgers, stream up to 50,000 rows to CSV safely, print PDF reports, and configure recurring schedules.",
  },
  {
    icon: ShieldCheck,
    title: "Strict multi-tenant & RBAC enforcement",
    description:
      "Every Express API call verifies Better Auth JWT claims, isolates organization tenants, scopes Department Managers, and locks Viewers to read-only.",
  },
];

export default function CapabilitiesPage() {
  return (
    <PublicSiteShell>
      <PageEntrance className="mx-auto max-w-[1280px] space-y-10 px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 border-b border-ww-hairline pb-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[13px] text-ww-accent">Capabilities</p>
            <h1 className="mt-2 text-[36px] font-medium leading-[1.1] tracking-[-0.025em] text-ww-fg sm:text-[44px]">
              Built for facility engineers and multi-site finance teams
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed text-ww-fg-secondary">
              Every module in WattWise converts raw sub-meter readings into
              cost attribution, anomaly alerts, and measurable carbon reductions.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-ww-fg px-4 text-[14px] font-medium text-ww-bg transition-transform active:scale-[0.98]"
          >
            Test capabilities in demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <StaggerGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <StaggerItem key={cap.title}>
                <div className="ww-card h-full p-6 transition-colors hover:border-ww-hairline-strong">
                  <Icon className="h-4 w-4 text-ww-accent" />
                  <h2 className="mt-4 text-[16px] font-medium text-ww-fg">
                    {cap.title}
                  </h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-ww-fg-secondary">
                    {cap.description}
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
