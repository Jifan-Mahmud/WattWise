"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useWattWise } from "@/components/providers/AppProviders";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import { LoadingPanel, ErrorPanel } from "@/components/ui/DataState";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { buildApiUrl } from "@/lib/url-params";

interface AnalyticsPayload {
  hourlyUsage: Array<{ hour: string; avgKwh: number; peakKwh: number }>;
  dailyUsage: Array<{ date: string; label: string; kwh: number; cost: number }>;
  weeklyUsage?: Array<{
    week: string;
    label: string;
    kwh: number;
    cost: number;
    carbonKg: number;
  }>;
  monthlyUsage: Array<{ month: string; kwh: number; cost: number; carbonKg: number }>;
  buildingComparison: Array<{
    id: string;
    name: string;
    kwh: number;
    cost: number;
    carbonKg: number;
    intensityPerSqFt: number;
  }>;
  departmentComparison: Array<{
    id: string;
    name: string;
    kwh: number;
    cost: number;
    budgetUsd: number;
    utilizationPct: number;
  }>;
  costAnalysis: Array<{ category: string; kwh: number; cost: number }>;
  forecast: Array<{
    date: string;
    label: string;
    projectedKwh: number;
    lowerBound: number;
    upperBound: number;
  }>;
}

interface BuildingRef {
  _id: string;
  name: string;
}

function SimpleTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-ww-hairline-strong bg-ww-card px-3 py-2 text-[12px] shadow-lg">
      <p className="font-mono text-[11px] text-ww-fg-muted">{label}</p>
      <div className="mt-1 space-y-0.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span className="text-ww-fg-secondary">{entry.name}</span>
            <span className="tabular-nums font-medium text-ww-fg">
              {typeof entry.value === "number"
                ? entry.value.toLocaleString()
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_ANALYTICS_FILTERS = {
  preset: "30d",
  buildingId: "all",
};

export default function AnalyticsPage() {
  const { apiFetch } = useWattWise();
  const { filters, setFilter } = useUrlFilters(DEFAULT_ANALYTICS_FILTERS);
  const { preset, buildingId } = filters;
  const [buildings, setBuildings] = useState<BuildingRef[]>([]);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch<{ buildings: BuildingRef[] }>("/api/buildings")
      .then((res) => {
        if (active) setBuildings(res.buildings);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [apiFetch]);

  useEffect(() => {
    let active = true;
    const url = buildApiUrl("/api/analytics", { preset, buildingId });

    apiFetch<AnalyticsPayload>(url)
      .then((res) => {
        if (!active) return;
        setError(null);
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load analytics");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, preset, buildingId, refreshTick]);

  const maxCost = data?.costAnalysis?.[0]?.cost || 1;

  return (
    <PageEntrance className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-ww-hairline pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[28px] font-medium tracking-[-0.02em] text-ww-fg">
            Energy analytics
          </h1>
          <p className="mt-1 text-[14px] text-ww-fg-secondary">
            Hourly load profiles, monthly progression, cost attribution, and 7-day
            demand forecast
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Date range"
            value={preset}
            onChange={(e) => setFilter("preset", e.target.value)}
            className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          <select
            aria-label="Filter building"
            value={buildingId}
            onChange={(e) => setFilter("buildingId", e.target.value)}
            className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
          >
            <option value="all">All buildings</option>
            {buildings.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <ErrorPanel message={error} onRetry={() => setRefreshTick((t) => t + 1)} />
      )}

      {loading && !data ? (
        <div className="space-y-4">
          <LoadingPanel rows={5} />
          <LoadingPanel rows={5} />
        </div>
      ) : (
        data && (
          <>
            {/* Row 1: Hourly Profile + Monthly Comparison */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="ww-card p-6 lg:col-span-7">
                <h2 className="text-[16px] font-medium text-ww-fg">
                  Hourly usage profile (UTC)
                </h2>
                <p className="text-[13px] text-ww-fg-secondary">
                  Average vs peak kWh demand by hour of day
                </p>
                <div className="mt-5 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.hourlyUsage}
                      margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--ww-hairline)"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="hour"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
                        interval={3}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
                      />
                      <Tooltip content={<SimpleTooltip />} />
                      <Line
                        type="monotone"
                        name="Peak kWh"
                        dataKey="peakKwh"
                        stroke="var(--ww-fg-muted)"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        name="Avg kWh"
                        dataKey="avgKwh"
                        stroke="var(--ww-accent)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="ww-card p-6 lg:col-span-5">
                <h2 className="text-[16px] font-medium text-ww-fg">
                  Monthly consumption
                </h2>
                <p className="text-[13px] text-ww-fg-secondary">
                  Quarter progression across Sep, Oct, and Nov
                </p>
                <div className="mt-5 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.monthlyUsage}
                      margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--ww-hairline)"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<SimpleTooltip />} />
                      <Bar
                        name="Total kWh"
                        dataKey="kwh"
                        fill="var(--ww-accent)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Row 1.5: Weekly Consumption */}
            <div className="ww-card p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-[16px] font-medium text-ww-fg">
                    Weekly consumption
                  </h2>
                  <p className="text-[13px] text-ww-fg-secondary">
                    ISO week-by-week electricity usage (kWh) across the quarter
                  </p>
                </div>
                <span className="font-mono text-[12px] text-ww-fg-muted">
                  {(data.weeklyUsage ?? []).length} weeks
                </span>
              </div>
              <div className="mt-5 h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.weeklyUsage ?? []}
                    margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--ww-hairline)"
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<SimpleTooltip />} />
                    <Bar
                      name="Weekly kWh"
                      dataKey="kwh"
                      fill="var(--ww-accent)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Row 2: Daily Trend + 7-Day Forecast */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="ww-card p-6 lg:col-span-7">
                <h2 className="text-[16px] font-medium text-ww-fg">
                  Daily usage and spend
                </h2>
                <p className="text-[13px] text-ww-fg-secondary">
                  Daily aggregated kWh consumption over selected window
                </p>
                <div className="mt-5 h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.dailyUsage}
                      margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--ww-hairline)"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
                        minTickGap={16}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<SimpleTooltip />} />
                      <Area
                        type="monotone"
                        name="Daily kWh"
                        dataKey="kwh"
                        stroke="var(--ww-positive)"
                        fill="var(--ww-positive-soft)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="ww-card p-6 lg:col-span-5">
                <h2 className="text-[16px] font-medium text-ww-fg">
                  7-day consumption forecast
                </h2>
                <p className="text-[13px] text-ww-fg-secondary">
                  Projected daily load with ±9% confidence range
                </p>
                <div className="mt-5 h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.forecast}
                      margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--ww-hairline)"
                        strokeDasharray="3 3"
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--ww-fg-muted)", fontSize: 11 }}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<SimpleTooltip />} />
                      <Area
                        type="monotone"
                        name="Upper bound"
                        dataKey="upperBound"
                        stroke="transparent"
                        fill="var(--ww-accent-soft)"
                      />
                      <Line
                        type="monotone"
                        name="Projected kWh"
                        dataKey="projectedKwh"
                        stroke="var(--ww-accent)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: "var(--ww-accent)" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Row 3: Cost Analysis + Building & Department Comparison */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="ww-card p-6 lg:col-span-4">
                <h2 className="text-[16px] font-medium text-ww-fg">
                  Cost by system category
                </h2>
                <p className="text-[13px] text-ww-fg-secondary">
                  Tariff expenditure split across meter types
                </p>
                <div className="mt-5 space-y-4">
                  {data.costAnalysis.map((c, idx) => {
                    const pct = Math.max(
                      6,
                      Math.round((c.cost / maxCost) * 100)
                    );
                    return (
                      <div key={c.category}>
                        <div className="flex items-baseline justify-between text-[13px]">
                          <span className="font-medium text-ww-fg">
                            {c.category}
                          </span>
                          <span className="tabular-nums font-mono text-[12px] text-ww-fg-secondary">
                            ${c.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ww-raised">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor:
                                idx === 0
                                  ? "var(--ww-accent)"
                                  : "var(--ww-fg-muted)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="ww-card overflow-x-auto p-6 lg:col-span-8">
                <h2 className="text-[16px] font-medium text-ww-fg">
                  Building and department comparison
                </h2>
                <p className="text-[13px] text-ww-fg-secondary">
                  Energy intensity per sq ft and department budget utilization
                </p>

                <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[12px] text-ww-fg-muted">
                      Buildings (kWh / sq ft)
                    </p>
                    <div className="divide-y divide-ww-hairline">
                      {data.buildingComparison.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between py-2.5 text-[13px]"
                        >
                          <span className="truncate pr-2 text-ww-fg">
                            {b.name}
                          </span>
                          <span className="tabular-nums shrink-0 font-mono text-[12px] text-ww-fg-secondary">
                            {b.intensityPerSqFt.toFixed(2)} kWh/ft²
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[12px] text-ww-fg-muted">
                      Departments (budget utilization)
                    </p>
                    <div className="divide-y divide-ww-hairline">
                      {data.departmentComparison.slice(0, 6).map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between py-2.5 text-[13px]"
                        >
                          <span className="truncate pr-2 text-ww-fg">
                            {d.name}
                          </span>
                          <span
                            className={`tabular-nums shrink-0 font-mono text-[12px] ${
                              d.utilizationPct > 100
                                ? "text-ww-negative"
                                : "text-ww-fg-secondary"
                            }`}
                          >
                            {d.utilizationPct}% (${d.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )
      )}
    </PageEntrance>
  );
}
