"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Magnifier,
  Plus,
  FileArrowDown,
  ChevronLeft,
  ChevronRight,
} from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { useUrlFilters, useUrlSearchInput } from "@/hooks/useUrlFilters";
import { downloadCsvExport } from "@/lib/api";
import { buildApiUrl } from "@/lib/url-params";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import {
  StatusBadge,
  LoadingPanel,
  ErrorPanel,
  EmptyPanel,
} from "@/components/ui/DataState";
import { ModalFrame } from "@/components/ui/ModalFrame";

interface EnergyRecordItem {
  _id: string;
  meterCode: string;
  buildingName: string;
  departmentName: string;
  consumptionKwh: number;
  demandKw: number;
  estimatedCost: number;
  carbonKg: number;
  timestamp: string;
  isAnomaly: boolean;
  source: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface RefOption {
  _id: string;
  name: string;
  meterCode?: string;
}

const DEFAULT_RECORD_FILTERS = {
  q: "",
  preset: "90d",
  buildingId: "all",
  anomalyOnly: false,
  sortBy: "timestamp",
  sortDir: "desc",
  page: 1,
};

export default function EnergyRecordsPage() {
  const { user, token, apiFetch, notify } = useWattWise();
  const canCreate =
    user?.role === "Organization Admin" || user?.role === "Facility Manager";

  const { filters, setFilter, setFilters } = useUrlFilters(
    DEFAULT_RECORD_FILTERS
  );
  const { q: urlQuery, preset, buildingId, anomalyOnly, sortBy, page } = filters;
  const sortDir: "asc" | "desc" = filters.sortDir === "asc" ? "asc" : "desc";

  const handleQuerySync = useCallback(
    (nextQuery: string) => {
      setFilters({ q: nextQuery, page: 1 });
    },
    [setFilters]
  );
  const [queryInput, setQueryInput] = useUrlSearchInput(urlQuery, handleQuerySync);

  const [records, setRecords] = useState<EnergyRecordItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 1,
  });
  const [buildings, setBuildings] = useState<RefOption[]>([]);
  const [meters, setMeters] = useState<RefOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    meterId: "",
    consumptionKwh: "64.5",
    demandKw: "68.2",
    timestamp: new Date().toISOString().slice(0, 16),
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<{ buildings: RefOption[] }>("/api/buildings"),
      apiFetch<{ meters: RefOption[] }>("/api/meters"),
    ])
      .then(([bRes, mRes]) => {
        if (!active) return;
        setBuildings(bRes.buildings);
        setMeters(mRes.meters);
        setForm((prev) => ({
          ...prev,
          meterId: prev.meterId || mRes.meters[0]?._id || "",
        }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [apiFetch]);

  useEffect(() => {
    let active = true;
    const url = buildApiUrl("/api/energy-records", {
      page,
      limit: 25,
      preset,
      sortBy,
      sortDir,
      q: urlQuery || undefined,
      buildingId,
      anomalyOnly: anomalyOnly ? "true" : undefined,
    });

    apiFetch<{ records: EnergyRecordItem[]; pagination: PaginationMeta }>(url)
      .then((res) => {
        if (!active) return;
        setError(null);
        setRecords(res.records);
        setPagination(res.pagination);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load records");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    apiFetch,
    page,
    preset,
    buildingId,
    anomalyOnly,
    sortBy,
    sortDir,
    urlQuery,
    refreshTick,
  ]);

  function handleSort(field: string) {
    if (sortBy === field) {
      setFilters({ sortDir: sortDir === "desc" ? "asc" : "desc", page: 1 });
    } else {
      setFilters({ sortBy: field, sortDir: "desc", page: 1 });
    }
  }

  async function handleCreateRecord(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch<{ triggeredAlert: { title: string } | null }>(
        "/api/energy-records",
        {
          method: "POST",
          body: JSON.stringify({
            meterId: form.meterId,
            consumptionKwh: Number(form.consumptionKwh),
            demandKw: Number(form.demandKw),
            timestamp: new Date(form.timestamp).toISOString(),
          }),
        }
      );
      notify(
        res.triggeredAlert
          ? `Reading saved & alert triggered: ${res.triggeredAlert.title}`
          : "Energy reading recorded",
        res.triggeredAlert ? "negative" : "positive"
      );
      setModalOpen(false);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Failed to record reading",
        "negative"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport() {
    if (!token) return;
    const exportUrl = buildApiUrl("/api/energy-records/export", {
      preset,
      q: urlQuery || undefined,
      buildingId,
      anomalyOnly: anomalyOnly ? "true" : undefined,
    });
    await downloadCsvExport(exportUrl, token, "wattwise-energy-records.csv");
    notify("CSV export downloaded", "positive");
  }

  return (
    <PageEntrance className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-ww-hairline pb-5 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-[28px] font-medium tracking-[-0.02em] text-ww-fg">
            Energy records
          </h1>
          <p className="mt-1 tabular-nums text-[14px] text-ww-fg-secondary">
            {pagination.totalCount.toLocaleString()} time-series meter readings
            with duplicate protection
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onPress={handleExport}
            className="h-9 rounded-[8px] border-ww-hairline-strong bg-ww-card text-[13px]"
          >
            <FileArrowDown className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
          {canCreate && (
            <Button
              size="sm"
              onPress={() => setModalOpen(true)}
              className="h-9 rounded-[8px] bg-ww-fg px-3.5 text-[13px] font-medium text-ww-bg"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Log reading
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <Magnifier className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ww-fg-muted" />
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search meter, building, dept"
            className="h-9 w-60 rounded-[8px] border border-ww-hairline bg-ww-card pl-9 pr-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
          />
        </div>

        <select
          aria-label="Date range preset"
          value={preset}
          onChange={(e) => {
            setFilters({ preset: e.target.value, page: 1 });
          }}
          className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
        >
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>

        <select
          aria-label="Filter by building"
          value={buildingId}
          onChange={(e) => {
            setFilters({ buildingId: e.target.value, page: 1 });
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

        <button
          type="button"
          onClick={() => {
            setFilters({ anomalyOnly: !anomalyOnly, page: 1 });
          }}
          className={`h-9 rounded-[8px] border px-3 text-[13px] transition-colors ${
            anomalyOnly
              ? "border-ww-negative/40 bg-ww-negative-soft text-ww-negative"
              : "border-ww-hairline bg-ww-card text-ww-fg-secondary"
          }`}
        >
          Anomalies only
        </button>
      </div>

      {error && (
        <ErrorPanel message={error} onRetry={() => setRefreshTick((t) => t + 1)} />
      )}

      {loading ? (
        <LoadingPanel rows={8} />
      ) : records.length === 0 ? (
        <EmptyPanel
          title="No energy readings found"
          description="Try widening the date range or clearing active filters."
        />
      ) : (
        <div className="ww-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-ww-hairline text-ww-fg-muted">
                  <th className="px-5 py-3.5 font-normal">
                    <button
                      type="button"
                      onClick={() => handleSort("timestamp")}
                      className="hover:text-ww-fg"
                    >
                      Timestamp {sortBy === "timestamp" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 font-normal">Meter</th>
                  <th className="px-5 py-3.5 font-normal">Building & dept</th>
                  <th className="px-5 py-3.5 text-right font-normal">
                    <button
                      type="button"
                      onClick={() => handleSort("consumptionKwh")}
                      className="hover:text-ww-fg"
                    >
                      Usage {sortBy === "consumptionKwh" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-right font-normal">Demand</th>
                  <th className="px-5 py-3.5 text-right font-normal">
                    <button
                      type="button"
                      onClick={() => handleSort("estimatedCost")}
                      className="hover:text-ww-fg"
                    >
                      Cost {sortBy === "estimatedCost" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </button>
                  </th>
                  <th className="px-5 py-3.5 text-right font-normal">Carbon</th>
                  <th className="px-5 py-3.5 font-normal">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ww-hairline">
                {records.map((r) => (
                  <tr key={r._id} className="hover:bg-ww-raised/40">
                    <td className="px-5 py-3 font-mono text-[12px] text-ww-fg-secondary">
                      {new Date(r.timestamp).toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ww-fg">
                      {r.meterCode}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-ww-fg">{r.buildingName}</p>
                      <p className="text-[12px] text-ww-fg-muted">
                        {r.departmentName}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium text-ww-fg">
                      {r.consumptionKwh.toFixed(2)} kWh
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-ww-fg-secondary">
                      {r.demandKw.toFixed(1)} kW
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-ww-fg">
                      ${r.estimatedCost.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-ww-fg-muted">
                      {r.carbonKg.toFixed(1)} kg
                    </td>
                    <td className="px-5 py-3">
                      {r.isAnomaly ? (
                        <StatusBadge label="Anomaly" tone="negative" />
                      ) : (
                        <StatusBadge label="Normal" tone="neutral" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-ww-hairline px-5 py-3 text-[13px] text-ww-fg-secondary">
            <span className="tabular-nums font-mono text-[12px]">
              Page {pagination.page} of {pagination.totalPages.toLocaleString()} (
              {pagination.totalCount.toLocaleString()} total)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                isDisabled={page <= 1}
                onPress={() => setFilter("page", Math.max(1, page - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                isDisabled={page >= pagination.totalPages}
                onPress={() =>
                  setFilter("page", Math.min(pagination.totalPages, page + 1))
                }
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <ModalFrame
        open={modalOpen}
        title="Log meter reading"
        subtitle="Cost and carbon are computed automatically; duplicate meter timestamps are rejected"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreateRecord} className="space-y-4">
          <div>
            <label className="block text-[12px] text-ww-fg-secondary">
              Electricity meter
            </label>
            <select
              required
              value={form.meterId}
              onChange={(e) => setForm({ ...form, meterId: e.target.value })}
              className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 font-mono text-[12px] text-ww-fg outline-none focus:border-ww-accent"
            >
              {meters.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.meterCode} — {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Consumption (kWh)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.consumptionKwh}
                onChange={(e) =>
                  setForm({ ...form, consumptionKwh: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Peak demand (kW)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.demandKw}
                onChange={(e) => setForm({ ...form, demandKw: e.target.value })}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-ww-fg-secondary">
              Timestamp (UTC)
            </label>
            <input
              type="datetime-local"
              required
              value={form.timestamp}
              onChange={(e) => setForm({ ...form, timestamp: e.target.value })}
              className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 font-mono text-[13px] text-ww-fg outline-none focus:border-ww-accent"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onPress={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isDisabled={submitting}
              className="bg-ww-fg text-ww-bg"
            >
              {submitting ? "Recording…" : "Save reading"}
            </Button>
          </div>
        </form>
      </ModalFrame>
    </PageEntrance>
  );
}
