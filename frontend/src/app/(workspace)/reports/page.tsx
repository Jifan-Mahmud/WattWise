"use client";

import React, { useEffect, useState } from "react";
import { FileArrowDown, Printer, Plus, TrashBin } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { downloadCsvExport } from "@/lib/api";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import {
  StatusBadge,
  LoadingPanel,
  ErrorPanel,
} from "@/components/ui/DataState";
import { ModalFrame } from "@/components/ui/ModalFrame";

interface ReportSummary {
  generatedAt: string;
  organization: string;
  currency: string;
  range: { start: string; end: string };
  totals: {
    totalKwh: number;
    totalCost: number;
    carbonKg: number;
    readings: number;
  };
  breakdown: Array<{
    building: string;
    department: string;
    totalKwh: number;
    totalCost: number;
    carbonKg: number;
    peakKwh: number;
    readings: number;
    anomalies: number;
  }>;
}

interface ScheduledReport {
  _id: string;
  name: string;
  frequency: "Daily" | "Weekly" | "Monthly";
  format: "CSV" | "PDF";
  recipients: string[];
  nextRunAt: string;
  enabled: boolean;
}

interface RefBuilding {
  _id: string;
  name: string;
}

export default function ReportsPage() {
  const { user, token, apiFetch, notify } = useWattWise();
  const canSchedule =
    user?.role === "Organization Admin" || user?.role === "Facility Manager";

  const [preset, setPreset] = useState("30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [buildingId, setBuildingId] = useState("all");

  const [buildings, setBuildings] = useState<RefBuilding[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    frequency: "Weekly" as "Daily" | "Weekly" | "Monthly",
    format: "PDF" as "CSV" | "PDF",
    recipients: "",
  });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (startDate && endDate) {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    } else {
      params.set("preset", preset);
    }
    if (buildingId !== "all") params.set("buildingId", buildingId);

    Promise.all([
      apiFetch<ReportSummary>(`/api/reports/summary?${params.toString()}`),
      apiFetch<{ schedules: ScheduledReport[] }>("/api/reports/scheduled"),
      apiFetch<{ buildings: RefBuilding[] }>("/api/buildings"),
    ])
      .then(([sRes, schRes, bRes]) => {
        if (!active) return;
        setError(null);
        setSummary(sRes);
        setSchedules(schRes.schedules);
        setBuildings(bRes.buildings);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to generate report");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, preset, startDate, endDate, buildingId, refreshTick]);

  async function handleExportCsv() {
    if (!token) return;
    const params = new URLSearchParams();
    if (startDate && endDate) {
      params.set("startDate", startDate);
      params.set("endDate", endDate);
    } else {
      params.set("preset", preset);
    }
    if (buildingId !== "all") params.set("buildingId", buildingId);
    await downloadCsvExport(
      `/api/energy-records/export?${params.toString()}`,
      token,
      "wattwise-custom-report.csv"
    );
    notify("CSV report downloaded", "positive");
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const recipients = form.recipients
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await apiFetch("/api/reports/scheduled", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          frequency: form.frequency,
          format: form.format,
          recipients,
          enabled: true,
        }),
      });
      notify("Scheduled report created", "positive");
      setModalOpen(false);
      setForm({ name: "", frequency: "Weekly", format: "PDF", recipients: "" });
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Schedule failed", "negative");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSchedule(id: string) {
    try {
      await apiFetch(`/api/reports/scheduled/${id}`, { method: "DELETE" });
      notify("Schedule removed", "positive");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Delete failed", "negative");
    }
  }

  return (
    <PageEntrance className="space-y-6">
      <div className="no-print flex flex-col justify-between gap-4 border-b border-ww-hairline pb-5 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-[28px] font-medium tracking-[-0.02em] text-ww-fg">
            Energy reports
          </h1>
          <p className="mt-1 text-[14px] text-ww-fg-secondary">
            Custom date range summaries, CSV downloads, printable PDF exports, and
            scheduled delivery
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onPress={() => window.print()}
            className="h-9 rounded-[8px] border-ww-hairline-strong bg-ww-card text-[13px]"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Export PDF
          </Button>
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

      {/* Filters */}
      <div className="no-print flex flex-wrap items-center gap-2.5">
        <select
          aria-label="Date preset"
          value={preset}
          onChange={(e) => {
            setStartDate("");
            setEndDate("");
            setPreset(e.target.value);
          }}
          className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="this_month">This month</option>
          <option value="last_month">Last month</option>
          <option value="90d">Last 90 days</option>
        </select>

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
          aria-label="Building filter"
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
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

      {error && (
        <ErrorPanel message={error} onRetry={() => setRefreshTick((t) => t + 1)} />
      )}

      {loading && !summary ? (
        <LoadingPanel rows={7} />
      ) : (
        summary && (
          <>
            {/* Printable Report Summary Card */}
            <div className="ww-card overflow-x-auto p-6">
              <div className="flex flex-col justify-between gap-4 border-b border-ww-hairline pb-4 sm:flex-row sm:items-end">
                <div>
                  <p className="font-mono text-[12px] text-ww-fg-muted">
                    {summary.organization}
                  </p>
                  <h2 className="mt-1 text-[18px] font-medium text-ww-fg">
                    Executive Energy Consumption Ledger
                  </h2>
                  <p className="mt-0.5 font-mono text-[12px] text-ww-fg-secondary">
                    Window: {new Date(summary.range.start).toISOString().slice(0, 10)} to{" "}
                    {new Date(summary.range.end).toISOString().slice(0, 10)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-6 tabular-nums text-[13px]">
                  <div>
                    <p className="text-ww-fg-muted">Total usage</p>
                    <p className="font-medium text-ww-fg">
                      {summary.totals.totalKwh.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      kWh
                    </p>
                  </div>
                  <div>
                    <p className="text-ww-fg-muted">Total cost</p>
                    <p className="font-medium text-ww-fg">
                      ${summary.totals.totalCost.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-ww-fg-muted">Emissions</p>
                    <p className="font-medium text-ww-fg">
                      {(summary.totals.carbonKg / 1000).toFixed(2)} t CO₂e
                    </p>
                  </div>
                </div>
              </div>

              <table className="mt-4 w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-ww-hairline text-ww-fg-muted">
                    <th className="py-3 pr-3 font-normal">Building</th>
                    <th className="py-3 pr-3 font-normal">Department</th>
                    <th className="py-3 pr-3 text-right font-normal">Readings</th>
                    <th className="py-3 pr-3 text-right font-normal">Total kWh</th>
                    <th className="py-3 pr-3 text-right font-normal">Peak kWh</th>
                    <th className="py-3 pr-3 text-right font-normal">Cost ($)</th>
                    <th className="py-3 text-right font-normal">CO₂e (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ww-hairline">
                  {summary.breakdown.map((row, idx) => (
                    <tr key={`${row.building}-${row.department}-${idx}`}>
                      <td className="py-2.5 pr-3 font-medium text-ww-fg">
                        {row.building}
                      </td>
                      <td className="py-2.5 pr-3 text-ww-fg-secondary">
                        {row.department}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-ww-fg-muted">
                        {row.readings.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-ww-fg">
                        {row.totalKwh.toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-ww-fg-secondary">
                        {row.peakKwh.toFixed(1)}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-ww-fg">
                        ${row.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-ww-fg-secondary">
                        {row.carbonKg.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Scheduled Reports */}
            <div className="no-print ww-card p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-[16px] font-medium text-ww-fg">
                    Scheduled energy reports
                  </h2>
                  <p className="text-[13px] text-ww-fg-secondary">
                    Automated daily, weekly, and monthly dispatches
                  </p>
                </div>
                {canSchedule && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setModalOpen(true)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add schedule
                  </Button>
                )}
              </div>

              <div className="mt-4 divide-y divide-ww-hairline">
                {schedules.map((s) => (
                  <div
                    key={s._id}
                    className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-ww-fg">
                          {s.name}
                        </span>
                        <StatusBadge label={s.frequency} tone="neutral" />
                        <StatusBadge label={s.format} tone="accent" />
                      </div>
                      <p className="mt-1 font-mono text-[12px] text-ww-fg-muted">
                        Recipients: {s.recipients.join(", ")}
                      </p>
                    </div>
                    {canSchedule && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(s._id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-ww-fg-muted hover:bg-ww-negative-soft hover:text-ww-negative"
                        aria-label={`Delete ${s.name}`}
                      >
                        <TrashBin className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      )}

      <ModalFrame
        open={modalOpen}
        title="Schedule automated report"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div>
            <label className="block text-[12px] text-ww-fg-secondary">
              Report title
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Weekly Building Tariff Audit"
              className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Frequency
              </label>
              <select
                value={form.frequency}
                onChange={(e) =>
                  setForm({
                    ...form,
                    frequency: e.target.value as "Daily" | "Weekly" | "Monthly",
                  })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Format
              </label>
              <select
                value={form.format}
                onChange={(e) =>
                  setForm({
                    ...form,
                    format: e.target.value as "CSV" | "PDF",
                  })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                <option value="PDF">PDF</option>
                <option value="CSV">CSV</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-ww-fg-secondary">
              Recipients (comma-separated emails)
            </label>
            <input
              required
              value={form.recipients}
              onChange={(e) => setForm({ ...form, recipients: e.target.value })}
              placeholder="ops@northgrid.io, finance@northgrid.io"
              className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
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
              {submitting ? "Saving…" : "Create schedule"}
            </Button>
          </div>
        </form>
      </ModalFrame>
    </PageEntrance>
  );
}
