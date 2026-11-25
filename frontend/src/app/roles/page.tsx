"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Check, Xmark } from "@gravity-ui/icons";
import { PublicSiteShell } from "@/components/layout/PublicSiteShell";
import {
  PageEntrance,
  StaggerGroup,
  StaggerItem,
} from "@/components/ui/MotionPrimitives";
import { StatusBadge } from "@/components/ui/DataState";

const ROLES = [
  {
    role: "Organization Admin",
    demoEmail: "admin@wattwise.io",
    scope: "Full organization",
    summary:
      "Manage organization settings, switch portfolios, create buildings/floors/departments/meters, and assign user roles.",
  },
  {
    role: "Facility Manager",
    demoEmail: "facility@wattwise.io",
    scope: "Meters & alerts",
    summary:
      "Register meters, log readings, run live simulations, configure threshold rules, resolve alerts, and schedule reports.",
  },
  {
    role: "Department Manager",
    demoEmail: "dept@wattwise.io",
    scope: "Assigned departments",
    summary:
      "Scoped strictly to authorized department consumption, budget utilization, records, insights, and alert acknowledgment.",
  },
  {
    role: "Viewer",
    demoEmail: "viewer@wattwise.io",
    scope: "Read-only",
    summary:
      "Inspect authorized dashboards, charts, comparisons, and export reports with all write mutations blocked at the API layer.",
  },
];

const PERMISSION_MATRIX = [
  {
    capability: "View dashboards, analytics, and reports",
    admin: true,
    facility: true,
    dept: true,
    viewer: true,
  },
  {
    capability: "Export CSV and printable PDF reports",
    admin: true,
    facility: true,
    dept: true,
    viewer: true,
  },
  {
    capability: "Acknowledge & resolve alerts / recommendations",
    admin: true,
    facility: true,
    dept: true,
    viewer: false,
  },
  {
    capability: "Manage meters, thresholds, and log readings",
    admin: true,
    facility: true,
    dept: false,
    viewer: false,
  },
  {
    capability: "Create/edit buildings, floors, departments & users",
    admin: true,
    facility: false,
    dept: false,
    viewer: false,
  },
];

function CellMark({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <Check className="mx-auto h-4 w-4 text-ww-positive" />
  ) : (
    <Xmark className="mx-auto h-4 w-4 text-ww-fg-muted" />
  );
}

export default function RolesPage() {
  return (
    <PublicSiteShell>
      <PageEntrance className="mx-auto max-w-[1280px] space-y-12 px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 border-b border-ww-hairline pb-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[13px] text-ww-accent">Role-based access</p>
            <h1 className="mt-2 text-[36px] font-medium leading-[1.1] tracking-[-0.025em] text-ww-fg sm:text-[44px]">
              Four distinct operator perspectives
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed text-ww-fg-secondary">
              WattWise enforces multi-organization isolation, department scoping,
              and read-only Viewer protection across both the UI and Express API.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-[8px] bg-ww-fg px-4 text-[14px] font-medium text-ww-bg transition-transform active:scale-[0.98]"
          >
            Sign in with demo roles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <StaggerGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((item) => (
            <StaggerItem key={item.role}>
              <div className="ww-card flex h-full flex-col justify-between p-5 transition-colors hover:border-ww-hairline-strong">
                <div>
                  <h2 className="text-[16px] font-medium text-ww-fg">
                    {item.role}
                  </h2>
                  <div className="mt-2">
                    <StatusBadge label={item.scope} tone="neutral" />
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-ww-fg-secondary">
                    {item.summary}
                  </p>
                </div>
                <p className="mt-4 border-t border-ww-hairline pt-3 font-mono text-[11px] text-ww-fg-muted">
                  {item.demoEmail}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>

        <div className="ww-card overflow-x-auto p-6">
          <h2 className="text-[18px] font-medium text-ww-fg">
            Permission matrix
          </h2>
          <table className="mt-4 w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-ww-hairline text-ww-fg-muted">
                <th className="py-3 pr-4 font-normal">Capability</th>
                <th className="py-3 text-center font-normal">Org Admin</th>
                <th className="py-3 text-center font-normal">Facility Mgr</th>
                <th className="py-3 text-center font-normal">Dept Mgr</th>
                <th className="py-3 text-center font-normal">Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ww-hairline">
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.capability}>
                  <td className="py-3.5 pr-4 text-ww-fg">{row.capability}</td>
                  <td className="py-3.5">
                    <CellMark allowed={row.admin} />
                  </td>
                  <td className="py-3.5">
                    <CellMark allowed={row.facility} />
                  </td>
                  <td className="py-3.5">
                    <CellMark allowed={row.dept} />
                  </td>
                  <td className="py-3.5">
                    <CellMark allowed={row.viewer} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageEntrance>
    </PublicSiteShell>
  );
}
