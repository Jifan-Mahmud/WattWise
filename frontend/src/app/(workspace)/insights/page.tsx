"use client";

import React, { useEffect, useState } from "react";
import { Check, Xmark } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import {
  StatCard,
  StatusBadge,
  LoadingPanel,
  ErrorPanel,
} from "@/components/ui/DataState";

interface InsightsPayload {
  anomalies: Array<{
    _id: string;
    meterCode: string;
    buildingName: string;
    departmentName: string;
    consumptionKwh: number;
    estimatedCost: number;
    timestamp: string;
  }>;
  peakHours: Array<{ hour: string; avgKwh: number; totalKwh: number }>;
  highestConsumers: {
    buildings: Array<{ _id: string; name: string; totalKwh: number; totalCost: number }>;
    departments: Array<{ _id: string; name: string; totalKwh: number; totalCost: number }>;
  };
  historicalComparison: {
    currentKwh: number;
    currentCost: number;
    prevKwh: number;
    prevCost: number;
    changePct: number;
  };
  carbonSummary: {
    totalCarbonKg: number;
    metricTonsCo2: number;
    equivalentTreesYear: number;
  };
  recommendations: Array<{
    _id: string;
    title: string;
    category: string;
    summary: string;
    buildingName: string;
    departmentName: string;
    estimatedMonthlySavingsUsd: number;
    estimatedKwhReduction: number;
    status: "Open" | "Accepted" | "Dismissed";
  }>;
}

export default function InsightsPage() {
  const { user, apiFetch, notify } = useWattWise();
  const canAct = user?.role !== "Viewer";

  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch<InsightsPayload>("/api/insights")
      .then((res) => {
        if (!active) return;
        setError(null);
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load insights");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, refreshTick]);

  async function handleRecommendation(
    id: string,
    status: "Accepted" | "Dismissed"
  ) {
    try {
      await apiFetch(`/api/insights/recommendations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      notify(`Recommendation ${status.toLowerCase()}`, "positive");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "negative");
    }
  }

  const potentialMonthlySavings =
    data?.recommendations
      .filter((r) => r.status !== "Dismissed")
      .reduce((acc, r) => acc + r.estimatedMonthlySavingsUsd, 0) || 0;

  return (
    <PageEntrance className="space-y-6">
      <div className="border-b border-ww-hairline pb-5">
        <h1 className="text-[28px] font-medium tracking-[-0.02em] text-ww-fg">
          Energy insights and carbon
        </h1>
        <p className="mt-1 text-[14px] text-ww-fg-secondary">
          Automated anomaly identification, peak load windows, saving recommendations,
          and Scope 2 emissions
        </p>
      </div>

      {error && (
        <ErrorPanel message={error} onRetry={() => setRefreshTick((t) => t + 1)} />
      )}

      {loading && !data ? (
        <LoadingPanel rows={6} />
      ) : (
        data && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Potential monthly savings"
                value={`$${potentialMonthlySavings.toLocaleString()}`}
                delta="From active efficiency recommendations"
                deltaTone="positive"
              />
              <StatCard
                label="Scope 2 carbon footprint"
                value={data.carbonSummary.metricTonsCo2.toFixed(1)}
                unit="t CO₂e"
                delta={`~${data.carbonSummary.equivalentTreesYear.toLocaleString()} tree-years offset`}
              />
              <StatCard
                label="Peak demand window"
                value={data.peakHours[0]?.hour || "13:00"}
                delta={
                  data.peakHours[0]
                    ? `${data.peakHours[0].avgKwh} kWh avg hourly load`
                    : undefined
                }
              />
              <StatCard
                label="Historical period delta"
                value={`${data.historicalComparison.changePct > 0 ? "+" : ""}${data.historicalComparison.changePct}%`}
                delta={`${data.historicalComparison.currentKwh.toLocaleString()} vs ${data.historicalComparison.prevKwh.toLocaleString()} kWh`}
                deltaTone={
                  data.historicalComparison.changePct <= 0 ? "positive" : "negative"
                }
              />
            </div>

            {/* Recommendations */}
            <div className="ww-card p-6">
              <h2 className="text-[16px] font-medium text-ww-fg">
                Automated energy-saving recommendations
              </h2>
              <p className="text-[13px] text-ww-fg-secondary">
                Derived from off-hours HVAC baseload, tariff peaks, and meter profiles
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                {data.recommendations.map((rec) => (
                  <div
                    key={rec._id}
                    className="flex flex-col justify-between rounded-[12px] border border-ww-hairline bg-ww-bg p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge label={rec.category} tone="accent" />
                        <StatusBadge
                          label={rec.status}
                          tone={
                            rec.status === "Accepted"
                              ? "positive"
                              : rec.status === "Dismissed"
                              ? "neutral"
                              : "warning"
                          }
                        />
                      </div>
                      <h3 className="mt-3 text-[15px] font-medium text-ww-fg">
                        {rec.title}
                      </h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ww-fg-secondary">
                        {rec.summary}
                      </p>
                      <p className="mt-2 font-mono text-[12px] text-ww-fg-muted">
                        {rec.buildingName} · {rec.departmentName}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ww-hairline pt-3">
                      <div className="tabular-nums text-[13px]">
                        <span className="font-medium text-ww-positive">
                          Save ${rec.estimatedMonthlySavingsUsd.toLocaleString()}/mo
                        </span>{" "}
                        <span className="font-mono text-[12px] text-ww-fg-muted">
                          ({rec.estimatedKwhReduction.toLocaleString()} kWh)
                        </span>
                      </div>

                      {canAct && rec.status === "Open" && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onPress={() =>
                              handleRecommendation(rec._id, "Accepted")
                            }
                          >
                            <Check className="mr-1 h-3.5 w-3.5 text-ww-positive" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onPress={() =>
                              handleRecommendation(rec._id, "Dismissed")
                            }
                          >
                            <Xmark className="mr-1 h-3.5 w-3.5" />
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Highest Usage + Peak Hours + Anomalies */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="ww-card p-6 lg:col-span-5">
                <h2 className="text-[16px] font-medium text-ww-fg">
                  Peak hours and top consumers
                </h2>
                <div className="mt-4 space-y-5">
                  <div>
                    <p className="mb-2 text-[12px] text-ww-fg-muted">
                      Highest-load hours (UTC)
                    </p>
                    <div className="divide-y divide-ww-hairline">
                      {data.peakHours.map((h) => (
                        <div
                          key={h.hour}
                          className="flex items-center justify-between py-2 text-[13px]"
                        >
                          <span className="font-mono text-ww-fg">{h.hour}</span>
                          <span className="tabular-nums font-mono text-[12px] text-ww-fg-secondary">
                            {h.avgKwh} kWh avg
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[12px] text-ww-fg-muted">
                      Highest consuming buildings
                    </p>
                    <div className="divide-y divide-ww-hairline">
                      {data.highestConsumers.buildings.map((b) => (
                        <div
                          key={b._id}
                          className="flex items-center justify-between py-2 text-[13px]"
                        >
                          <span className="text-ww-fg">{b.name}</span>
                          <span className="tabular-nums font-mono text-[12px] text-ww-fg-secondary">
                            {b.totalKwh.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}{" "}
                            kWh
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ww-card overflow-x-auto p-6 lg:col-span-7">
                <h2 className="text-[16px] font-medium text-ww-fg">
                  Largest unusual consumption spikes
                </h2>
                <p className="text-[13px] text-ww-fg-secondary">
                  Recent outlier meter events exceeding configured bounds
                </p>
                <table className="mt-4 w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-ww-hairline text-ww-fg-muted">
                      <th className="py-2.5 pr-3 font-normal">Timestamp</th>
                      <th className="py-2.5 pr-3 font-normal">Meter</th>
                      <th className="py-2.5 pr-3 font-normal">Building</th>
                      <th className="py-2.5 text-right font-normal">Spike</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ww-hairline">
                    {data.anomalies.slice(0, 8).map((a) => (
                      <tr key={a._id}>
                        <td className="py-2.5 pr-3 font-mono text-[12px] text-ww-fg-secondary">
                          {new Date(a.timestamp).toISOString().slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[12px] text-ww-fg">
                          {a.meterCode}
                        </td>
                        <td className="py-2.5 pr-3 text-ww-fg-secondary">
                          {a.buildingName}
                        </td>
                        <td className="py-2.5 text-right tabular-nums font-medium text-ww-negative">
                          {a.consumptionKwh.toFixed(1)} kWh
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </PageEntrance>
  );
}
