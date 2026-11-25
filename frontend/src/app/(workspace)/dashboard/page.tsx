"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileArrowDown,
  Play,
  Pause,
  ArrowRotateRight,
  Check,
  CircleCheck,
} from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { downloadCsvExport } from "@/lib/api";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import {
  StatCard,
  StatusBadge,
  LoadingPanel,
  ErrorPanel,
} from "@/components/ui/DataState";
import {
  ConsumptionChart,
  type DailySeriesPoint,
} from "@/components/charts/ConsumptionChart";

interface BuildingOption {
  _id: string;
  name: string;
  code: string;
}

interface DepartmentOption {
  _id: string;
  name: string;
  buildingId: string;
}

interface OrgPortfolioItem {
  _id: string;
  name: string;
  isCurrent: boolean;
}

interface OverviewPayload {
  kpis: {
    totalKwh: number;
    totalCost: number;
    totalCarbonKg: number;
    avgDailyKwh: number;
    peakKwh: number;
    lowestKwh: number;
    recordCount: number;
    anomalyCount: number;
    prevPeriodKwh: number;
    prevPeriodCost: number;
    deltaPct: number;
    efficiencyScore: number;
  };
  dailySeries: DailySeriesPoint[];
  buildingBreakdown: Array<{
    _id: string;
    name: string;
    totalKwh: number;
    totalCost: number;
    anomalies: number;
  }>;
  departmentBreakdown: Array<{
    _id: string;
    name: string;
    totalKwh: number;
    totalCost: number;
  }>;
  meterBreakdown: Array<{
    _id: string;
    meterCode: string;
    buildingName: string;
    totalKwh: number;
    totalCost: number;
    peakKwh: number;
  }>;
  activeAlerts: Array<{
    _id: string;
    title: string;
    buildingName: string;
    meterCode: string;
    severity: "High" | "Medium" | "Low";
    status: "New" | "Acknowledged" | "Resolved";
    measuredValue: number;
    thresholdValue: number;
    unit: string;
    triggeredAt: string;
  }>;
  meterHealth: {
    Healthy: number;
    Degraded: number;
    Offline: number;
  };
}

interface SimulationReading {
  _id: string;
  meterCode: string;
  buildingName: string;
  consumptionKwh: number;
  estimatedCost: number;
  isAnomaly: boolean;
  timestamp: string;
}

const PRESETS = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "90d", label: "90 days" },
] as const;

export default function DashboardPage() {
  const { user, organization, token, apiFetch, refreshToken, notify } =
    useWattWise();

  const [preset, setPreset] = useState<string>("30d");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [buildingId, setBuildingId] = useState<string>("all");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [chartMode, setChartMode] = useState<"area" | "bar">("area");

  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [portfolio, setPortfolio] = useState<OrgPortfolioItem[]>([]);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [liveFeed, setLiveFeed] = useState<SimulationReading[]>([]);

  const canWrite =
    user?.role === "Organization Admin" || user?.role === "Facility Manager";
  const canTriageAlerts = user?.role !== "Viewer";

  const buildOverviewQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (startDate && endDate) {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    } else {
      params.set("preset", preset);
    }
    if (buildingId !== "all") params.set("buildingId", buildingId);
    if (departmentId !== "all") params.set("departmentId", departmentId);
    return `/api/dashboard/overview?${params.toString()}`;
  }, [preset, startDate, endDate, buildingId, departmentId]);

  const loadDimensions = useCallback(async () => {
    try {
      const [bRes, dRes, pRes] = await Promise.all([
        apiFetch<{ buildings: BuildingOption[] }>("/api/buildings"),
        apiFetch<{ departments: DepartmentOption[] }>("/api/departments"),
        apiFetch<{ organizations: OrgPortfolioItem[] }>(
          "/api/organizations/portfolio"
        ),
      ]);
      setBuildings(bRes.buildings);
      setDepartments(dRes.departments);
      setPortfolio(pRes.organizations);
    } catch {
      // handled in overview fetch
    }
  }, [apiFetch]);

  const loadOverview = useCallback(
    async (skipCache = false) => {
      setError(null);
      try {
        const data = await apiFetch<OverviewPayload>(buildOverviewQuery(), {
          skipCache,
        });
        setOverview(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load energy overview."
        );
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, buildOverviewQuery]
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<{ buildings: BuildingOption[] }>("/api/buildings"),
      apiFetch<{ departments: DepartmentOption[] }>("/api/departments"),
      apiFetch<{ organizations: OrgPortfolioItem[] }>(
        "/api/organizations/portfolio"
      ),
    ])
      .then(([bRes, dRes, pRes]) => {
        if (!active) return;
        setBuildings(bRes.buildings);
        setDepartments(dRes.departments);
        setPortfolio(pRes.organizations);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [apiFetch]);

  useEffect(() => {
    let active = true;
    apiFetch<OverviewPayload>(buildOverviewQuery())
      .then((data) => {
        if (!active) return;
        setError(null);
        setOverview(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load energy overview."
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, buildOverviewQuery]);

  const runSimulationTick = useCallback(async () => {
    if (!canWrite) return;
    setSimulating(true);
    try {
      const res = await apiFetch<{
        readings: SimulationReading[];
        triggeredAlerts: Array<{ title: string }>;
      }>("/api/simulation/tick", { method: "POST" });

      if (res.readings.length) {
        setLiveFeed((prev) => [...res.readings, ...prev].slice(0, 8));
      }
      if (res.triggeredAlerts.length) {
        notify(
          `Threshold triggered: ${res.triggeredAlerts[0].title}`,
          "negative"
        );
      }
      await loadOverview(true);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Simulation tick failed",
        "negative"
      );
      setLiveMode(false);
    } finally {
      setSimulating(false);
    }
  }, [apiFetch, canWrite, loadOverview, notify]);

  useEffect(() => {
    if (!liveMode || !canWrite) return;
    const timer = setInterval(() => {
      runSimulationTick();
    }, 8000);
    return () => clearInterval(timer);
  }, [liveMode, canWrite, runSimulationTick]);

  async function handleOrgSwitch(nextOrgId: string) {
    try {
      await apiFetch("/api/organizations/switch", {
        method: "POST",
        body: JSON.stringify({ organizationId: nextOrgId }),
      });
      await refreshToken();
      setBuildingId("all");
      setDepartmentId("all");
      await Promise.all([loadDimensions(), loadOverview(true)]);
      notify("Switched active organization", "positive");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Unable to switch organization",
        "negative"
      );
    }
  }

  async function handleAlertAction(
    alertId: string,
    status: "Acknowledged" | "Resolved"
  ) {
    try {
      await apiFetch(`/api/alerts/${alertId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      notify(`Alert marked as ${status}`, "positive");
      await loadOverview(true);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Unable to update alert",
        "negative"
      );
    }
  }

  async function handleExportCsv() {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      } else {
        params.set("preset", preset);
      }
      if (buildingId !== "all") params.set("buildingId", buildingId);
      if (departmentId !== "all") params.set("departmentId", departmentId);

      await downloadCsvExport(
        `/api/energy-records/export?${params.toString()}`,
        token,
        `wattwise-${organization?.slug || "export"}.csv`
      );
      notify("CSV export downloaded", "positive");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Export failed", "negative");
    }
  }

  const visibleDepartments =
    buildingId === "all"
      ? departments
      : departments.filter((d) => d.buildingId === buildingId);

  const kpis = overview?.kpis;
  const maxBuildingKwh = overview?.buildingBreakdown?.[0]?.totalKwh || 1;
  const totalMetersCount =
    (overview?.meterHealth.Healthy || 0) +
    (overview?.meterHealth.Degraded || 0) +
    (overview?.meterHealth.Offline || 0);

  return (
    <PageEntrance className="space-y-6">
      {/* Page Title & Action Strip */}
      <div className="flex flex-col justify-between gap-4 border-b border-ww-hairline pb-5 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] font-medium leading-[1.15] tracking-[-0.02em] text-ww-fg sm:text-[32px]">
              Energy overview
            </h1>
            <span className="font-mono text-[13px] text-ww-fg-muted">
              Nov 2026
            </span>
          </div>
          <p className="mt-1 text-[14px] text-ww-fg-secondary">
            {organization?.name || "Organization"} ·{" "}
            {kpis ? `${kpis.recordCount.toLocaleString()} readings aggregated` : "Loading telemetry"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user?.role === "Organization Admin" && portfolio.length > 1 && (
            <select
              aria-label="Switch organization"
              value={organization?.id || ""}
              onChange={(e) => handleOrgSwitch(e.target.value)}
              className="h-9 rounded-[8px] border border-ww-hairline-strong bg-ww-card px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
            >
              {portfolio.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}

          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                if (!liveMode) {
                  setLiveMode(true);
                  runSimulationTick();
                } else {
                  setLiveMode(false);
                }
              }}
              className={`h-9 rounded-[8px] border px-3 text-[13px] ${
                liveMode
                  ? "border-ww-accent bg-ww-accent-soft text-ww-fg"
                  : "border-ww-hairline-strong bg-ww-card text-ww-fg-secondary"
              }`}
            >
              {liveMode ? (
                <>
                  <Pause className="mr-1.5 h-3.5 w-3.5 text-ww-accent" />
                  Live monitor on
                </>
              ) : (
                <>
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Live monitor
                </>
              )}
            </Button>
          )}

          <Button
            size="sm"
            onPress={handleExportCsv}
            className="h-9 rounded-[8px] bg-ww-fg px-3.5 text-[13px] font-medium text-ww-bg"
          >
            <FileArrowDown className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-[10px] border border-ww-hairline bg-ww-card p-1">
          {PRESETS.map((p) => {
            const active = preset === p.id && !startDate && !endDate;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setPreset(p.id);
                }}
                className={`h-7 rounded-[6px] px-2.5 text-[12px] transition-colors ${
                  active
                    ? "bg-ww-raised font-medium text-ww-fg"
                    : "text-ww-fg-secondary hover:text-ww-fg"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-2.5 font-mono text-[12px] text-ww-fg outline-none focus:border-ww-accent"
          />
          <span className="text-[12px] text-ww-fg-muted">to</span>
          <input
            type="date"
            aria-label="End date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-2.5 font-mono text-[12px] text-ww-fg outline-none focus:border-ww-accent"
          />

          <select
            aria-label="Filter by building"
            value={buildingId}
            onChange={(e) => {
              setBuildingId(e.target.value);
              setDepartmentId("all");
            }}
            className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
          >
            <option value="all">All buildings</option>
            {buildings.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
          >
            <option value="all">All departments</option>
            {visibleDepartments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Telemetry Ticker (when Live monitor active or recent ticks exist) */}
      {(liveMode || liveFeed.length > 0) && (
        <div className="ww-card flex flex-col justify-between gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span
              className={`h-2 w-2 rounded-full ${
                liveMode ? "animate-pulse bg-ww-positive" : "bg-ww-fg-muted"
              }`}
            />
            <div>
              <p className="text-[13px] font-medium text-ww-fg">
                Live meter simulation stream
              </p>
              <p className="font-mono text-[12px] text-ww-fg-muted">
                {liveFeed[0]
                  ? `Latest: ${liveFeed[0].meterCode} · ${liveFeed[0].consumptionKwh} kWh ($${liveFeed[0].estimatedCost})`
                  : "Waiting for next telemetry tick…"}
              </p>
            </div>
          </div>
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              isDisabled={simulating}
              onPress={runSimulationTick}
            >
              <ArrowRotateRight className="mr-1.5 h-3.5 w-3.5" />
              {simulating ? "Sampling…" : "Sample tick now"}
            </Button>
          )}
        </div>
      )}

      {error && <ErrorPanel message={error} onRetry={() => loadOverview(true)} />}

      {loading && !overview ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingPanel key={i} rows={2} />
            ))}
          </div>
          <LoadingPanel rows={6} />
        </div>
      ) : (
        overview &&
        kpis && (
          <>
            {/* 5 KPI Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                label="Total consumption"
                value={kpis.totalKwh.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
                unit="kWh"
                delta={`${kpis.deltaPct > 0 ? "+" : ""}${kpis.deltaPct}% vs prior period`}
                deltaTone={kpis.deltaPct <= 0 ? "positive" : "negative"}
              />
              <StatCard
                label="Total electricity cost"
                value={`$${kpis.totalCost.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}`}
                delta={`$${kpis.prevPeriodCost.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })} prior period`}
              />
              <StatCard
                label="Average daily usage"
                value={kpis.avgDailyKwh.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
                unit="kWh/d"
                delta={`${(kpis.totalCarbonKg / 1000).toFixed(1)} t CO₂e emitted`}
              />
              <StatCard
                label="Peak reading"
                value={kpis.peakKwh.toFixed(1)}
                unit="kWh"
                delta={`Lowest ${kpis.lowestKwh.toFixed(1)} kWh`}
              />
              <StatCard
                label="System efficiency"
                value={`${kpis.efficiencyScore}%`}
                delta={`${kpis.anomalyCount} threshold anomalies`}
                deltaTone={kpis.anomalyCount > 0 ? "negative" : "positive"}
              />
            </div>

            {/* Main Focal Chart + Building Consumption Breakdown */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="ww-card p-6 lg:col-span-8">
                <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-[16px] font-medium text-ww-fg">
                      Consumption vs period average
                    </h2>
                    <p className="text-[13px] text-ww-fg-secondary">
                      Daily total electricity draw with baseline reference line
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChartMode("area")}
                      className={`h-7 rounded-[6px] border px-2.5 text-[12px] transition-colors ${
                        chartMode === "area"
                          ? "border-ww-hairline-strong bg-ww-raised text-ww-fg"
                          : "border-transparent text-ww-fg-muted hover:text-ww-fg"
                      }`}
                    >
                      Curve
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode("bar")}
                      className={`h-7 rounded-[6px] border px-2.5 text-[12px] transition-colors ${
                        chartMode === "bar"
                          ? "border-ww-hairline-strong bg-ww-raised text-ww-fg"
                          : "border-transparent text-ww-fg-muted hover:text-ww-fg"
                      }`}
                    >
                      Bars
                    </button>
                  </div>
                </div>

                <ConsumptionChart data={overview.dailySeries} mode={chartMode} />

                <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-ww-hairline pt-3 text-[12px] text-ww-fg-secondary">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-ww-accent" />
                    Daily consumption (kWh)
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-0.5 w-4 border-t border-dashed border-ww-fg-muted" />
                    Period daily baseline
                  </span>
                </div>
              </div>

              {/* Ranked Building Breakdown */}
              <div className="ww-card flex flex-col justify-between p-6 lg:col-span-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-medium text-ww-fg">
                      Consumption by building
                    </h2>
                    <Link
                      href="/buildings"
                      className="text-[12px] text-ww-fg-muted hover:text-ww-fg"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="mt-5 space-y-4">
                    {overview.buildingBreakdown.map((b, idx) => {
                      const pct = Math.max(
                        6,
                        Math.round((b.totalKwh / maxBuildingKwh) * 100)
                      );
                      return (
                        <div key={b._id}>
                          <div className="flex items-baseline justify-between gap-2 text-[13px]">
                            <span className="truncate font-medium text-ww-fg">
                              {b.name}
                            </span>
                            <span className="tabular-nums shrink-0 font-mono text-[12px] text-ww-fg-secondary">
                              {b.totalKwh.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })}{" "}
                              kWh
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
                          <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-ww-fg-muted">
                            <span>
                              ${b.totalCost.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })}
                            </span>
                            <span>{b.anomalies} anomalies</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Meter Health Strip */}
                <div className="mt-6 border-t border-ww-hairline pt-4">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-ww-fg-secondary">
                      Meter fleet health ({totalMetersCount})
                    </span>
                    <Link
                      href="/meters"
                      className="font-mono text-ww-fg-muted hover:text-ww-fg"
                    >
                      Inspect
                    </Link>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <StatusBadge
                      label={`${overview.meterHealth.Healthy} healthy`}
                      tone="positive"
                    />
                    <StatusBadge
                      label={`${overview.meterHealth.Degraded} degraded`}
                      tone="warning"
                    />
                    <StatusBadge
                      label={`${overview.meterHealth.Offline} offline`}
                      tone="negative"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Alerts + Department & Meter Tables */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Alerts Feed */}
              <div className="ww-card p-6 lg:col-span-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[16px] font-medium text-ww-fg">
                      Active alerts
                    </h2>
                    <p className="text-[13px] text-ww-fg-secondary">
                      Threshold breaches and unusual load detections
                    </p>
                  </div>
                  <Link
                    href="/alerts"
                    className="text-[13px] text-ww-fg-secondary hover:text-ww-fg"
                  >
                    Manage all
                  </Link>
                </div>

                <div className="mt-4 divide-y divide-ww-hairline">
                  {overview.activeAlerts.length === 0 ? (
                    <p className="py-8 text-center text-[13px] text-ww-fg-muted">
                      No open alerts for this organization.
                    </p>
                  ) : (
                    overview.activeAlerts.map((alert) => (
                      <div
                        key={alert._id}
                        className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              label={alert.severity}
                              tone={
                                alert.severity === "High"
                                  ? "negative"
                                  : alert.severity === "Medium"
                                  ? "warning"
                                  : "neutral"
                              }
                            />
                            <StatusBadge
                              label={alert.status}
                              tone={
                                alert.status === "New" ? "accent" : "neutral"
                              }
                            />
                            <span className="font-mono text-[11px] text-ww-fg-muted">
                              {alert.meterCode}
                            </span>
                          </div>
                          <p className="mt-1.5 truncate text-[13px] font-medium text-ww-fg">
                            {alert.title}
                          </p>
                          <p className="mt-0.5 font-mono text-[12px] text-ww-fg-muted">
                            {alert.buildingName} · {alert.measuredValue}{" "}
                            {alert.unit} vs {alert.thresholdValue} {alert.unit}
                          </p>
                        </div>

                        {canTriageAlerts && (
                          <div className="flex shrink-0 items-center gap-1.5">
                            {alert.status === "New" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onPress={() =>
                                  handleAlertAction(alert._id, "Acknowledged")
                                }
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Ack
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onPress={() =>
                                handleAlertAction(alert._id, "Resolved")
                              }
                            >
                              <CircleCheck className="mr-1 h-3.5 w-3.5 text-ww-positive" />
                              Resolve
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Department & Meter Breakdown */}
              <div className="ww-card p-6 lg:col-span-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[16px] font-medium text-ww-fg">
                      Department and meter leaders
                    </h2>
                    <p className="text-[13px] text-ww-fg-secondary">
                      Highest electricity consumption inside selected scope
                    </p>
                  </div>
                  <Link
                    href="/analytics"
                    className="text-[13px] text-ww-fg-secondary hover:text-ww-fg"
                  >
                    Deep analytics
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[12px] text-ww-fg-muted">
                      Top departments
                    </p>
                    <div className="divide-y divide-ww-hairline">
                      {overview.departmentBreakdown.slice(0, 5).map((d) => (
                        <div
                          key={d._id}
                          className="flex items-center justify-between gap-2 py-2.5 text-[13px]"
                        >
                          <span className="truncate text-ww-fg">{d.name}</span>
                          <span className="tabular-nums shrink-0 font-mono text-[12px] text-ww-fg-secondary">
                            {d.totalKwh.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}{" "}
                            kWh
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[12px] text-ww-fg-muted">
                      Top meters
                    </p>
                    <div className="divide-y divide-ww-hairline">
                      {overview.meterBreakdown.slice(0, 5).map((m) => (
                        <div
                          key={m._id}
                          className="flex items-center justify-between gap-2 py-2.5 text-[13px]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[12px] text-ww-fg">
                              {m.meterCode}
                            </p>
                            <p className="truncate text-[11px] text-ww-fg-muted">
                              {m.buildingName}
                            </p>
                          </div>
                          <span className="tabular-nums shrink-0 font-mono text-[12px] text-ww-fg-secondary">
                            ${m.totalCost.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
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
