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

const STACK_LAYERS = [
  {
    layer: "Frontend Application",
    tech: "Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, HeroUI v3, Recharts, Motion",
    role: "Responsive graphite interface, client TTL response cache, and interactive charts.",
  },
  {
    layer: "Authentication & Session Bridge",
    tech: "Better Auth + @better-auth/mongo-adapter + HS256 JWT",
    role: "Email/password credentials in MongoDB plus signed bearer tokens for Express.",
  },
  {
    layer: "Backend API & Aggregation Engine",
    tech: "Node.js, Express 5, Zod, jose-cjs",
    role: "RBAC enforcement, MongoDB $facet aggregations, CSV cursor streaming, and alerting.",
  },
  {
    layer: "Time-Series Data Store",
    tech: "MongoDB Atlas (11 collections, 21 compound & unique indexes)",
    role: "Unique (meterId, timestamp) deduplication and fast scoped aggregations.",
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

        <div className="ww-card overflow-x-auto p-6">
          <h2 className="text-[18px] font-medium text-ww-fg">
            Full-stack system layers
          </h2>
          <table className="mt-4 w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-ww-hairline text-ww-fg-muted">
                <th className="py-3 pr-4 font-normal">Layer</th>
                <th className="py-3 pr-4 font-normal">Technologies</th>
                <th className="py-3 font-normal">Responsibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ww-hairline">
              {STACK_LAYERS.map((s) => (
                <tr key={s.layer}>
                  <td className="py-3.5 pr-4 font-medium text-ww-fg">
                    {s.layer}
                  </td>
                  <td className="py-3.5 pr-4 font-mono text-[12px] text-ww-fg-secondary">
                    {s.tech}
                  </td>
                  <td className="py-3.5 text-ww-fg-secondary">{s.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageEntrance>
    </PublicSiteShell>
  );
}
