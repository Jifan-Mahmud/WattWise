"use client";

import React, { useEffect, useState } from "react";
import { Check, CircleCheck, Plus, TrashBin } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import {
  StatusBadge,
  LoadingPanel,
  ErrorPanel,
  EmptyPanel,
} from "@/components/ui/DataState";
import { ModalFrame } from "@/components/ui/ModalFrame";

interface AlertItem {
  _id: string;
  title: string;
  description: string;
  alertType: string;
  severity: "High" | "Medium" | "Low";
  status: "New" | "Acknowledged" | "Resolved";
  buildingName: string;
  departmentName: string;
  meterCode: string;
  measuredValue: number;
  thresholdValue: number;
  unit: string;
  triggeredAt: string;
  acknowledgedBy?: string | null;
  resolvedBy?: string | null;
}

interface ThresholdItem {
  _id: string;
  name: string;
  metric: "hourly_kwh" | "daily_kwh" | "spike_ratio";
  limitValue: number;
  spikeMultiplier: number;
  severity: "High" | "Medium" | "Low";
  enabled: boolean;
  buildingName: string;
  meterCode: string;
}

interface RefOption {
  _id: string;
  name: string;
  meterCode?: string;
}

export default function AlertsPage() {
  const { user, apiFetch, notify } = useWattWise();
  const canManageRules =
    user?.role === "Organization Admin" || user?.role === "Facility Manager";
  const canTriage = user?.role !== "Viewer";

  const [tab, setTab] = useState<"alerts" | "thresholds">("alerts");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState({ New: 0, Acknowledged: 0, Resolved: 0 });
  const [thresholds, setThresholds] = useState<ThresholdItem[]>([]);
  const [buildings, setBuildings] = useState<RefOption[]>([]);
  const [meters, setMeters] = useState<RefOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    buildingId: "all",
    meterId: "all",
    metric: "hourly_kwh" as "hourly_kwh" | "daily_kwh" | "spike_ratio",
    limitValue: "140",
    spikeMultiplier: "1.6",
    severity: "High" as "High" | "Medium" | "Low",
  });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (severityFilter !== "all") params.set("severity", severityFilter);

    Promise.all([
      apiFetch<{ alerts: AlertItem[]; summary: { New: number; Acknowledged: number; Resolved: number } }>(
        `/api/alerts?${params.toString()}`
      ),
      apiFetch<{ thresholds: ThresholdItem[] }>("/api/thresholds"),
      apiFetch<{ buildings: RefOption[] }>("/api/buildings"),
      apiFetch<{ meters: RefOption[] }>("/api/meters"),
    ])
      .then(([aRes, tRes, bRes, mRes]) => {
        if (!active) return;
        setError(null);
        setAlerts(aRes.alerts);
        setSummary(aRes.summary);
        setThresholds(tRes.thresholds);
        setBuildings(bRes.buildings);
        setMeters(mRes.meters);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load alerts");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, statusFilter, severityFilter, refreshTick]);

  async function handleStatusChange(
    id: string,
    status: "Acknowledged" | "Resolved"
  ) {
    try {
      await apiFetch(`/api/alerts/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      notify(`Alert marked ${status}`, "positive");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "negative");
    }
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/thresholds", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          buildingId: form.buildingId === "all" ? null : form.buildingId,
          meterId: form.meterId === "all" ? null : form.meterId,
          metric: form.metric,
          limitValue: Number(form.limitValue),
          spikeMultiplier: Number(form.spikeMultiplier),
          severity: form.severity,
          enabled: true,
        }),
      });
      notify("Threshold rule created", "positive");
      setModalOpen(false);
      setForm((p) => ({ ...p, name: "" }));
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to create rule", "negative");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleRule(rule: ThresholdItem) {
    try {
      await apiFetch(`/api/thresholds/${rule._id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      notify(`Rule ${rule.enabled ? "paused" : "enabled"}`, "positive");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "negative");
    }
  }

  async function handleDeleteRule(id: string) {
    try {
      await apiFetch(`/api/thresholds/${id}`, { method: "DELETE" });
      notify("Threshold rule removed", "positive");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Delete failed", "negative");
    }
  }

  return (
    <PageEntrance className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-ww-hairline pb-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[28px] font-medium tracking-[-0.02em] text-ww-fg">
            Alerts and thresholds
          </h1>
          <p className="mt-1 text-[14px] text-ww-fg-secondary">
            Triage consumption breaches and configure per-building or per-meter limits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-[8px] border border-ww-hairline bg-ww-card p-1">
            <button
              type="button"
              onClick={() => setTab("alerts")}
              className={`h-7 rounded-[6px] px-3 text-[13px] transition-colors ${
                tab === "alerts"
                  ? "bg-ww-raised font-medium text-ww-fg"
                  : "text-ww-fg-secondary"
              }`}
            >
              Alerts ({summary.New + summary.Acknowledged + summary.Resolved})
            </button>
            <button
              type="button"
              onClick={() => setTab("thresholds")}
              className={`h-7 rounded-[6px] px-3 text-[13px] transition-colors ${
                tab === "thresholds"
                  ? "bg-ww-raised font-medium text-ww-fg"
                  : "text-ww-fg-secondary"
              }`}
            >
              Threshold rules ({thresholds.length})
            </button>
          </div>

          {canManageRules && (
            <Button
              size="sm"
              onPress={() => setModalOpen(true)}
              className="h-9 rounded-[8px] bg-ww-fg px-3.5 text-[13px] font-medium text-ww-bg"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New rule
            </Button>
          )}
        </div>
      </div>

      {error && (
        <ErrorPanel message={error} onRetry={() => setRefreshTick((t) => t + 1)} />
      )}

      {loading ? (
        <LoadingPanel rows={6} />
      ) : tab === "alerts" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={`${summary.New} New`} tone="accent" />
              <StatusBadge
                label={`${summary.Acknowledged} Acknowledged`}
                tone="warning"
              />
              <StatusBadge label={`${summary.Resolved} Resolved`} tone="positive" />
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Filter alert status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                <option value="all">All statuses</option>
                <option value="New">New</option>
                <option value="Acknowledged">Acknowledged</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                aria-label="Filter alert severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                <option value="all">All severities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {alerts.length === 0 ? (
            <EmptyPanel
              title="No alerts match current filter"
              description="All meters within the selected filter are operating within thresholds."
            />
          ) : (
            <div className="ww-card divide-y divide-ww-hairline">
              {alerts.map((a) => (
                <div
                  key={a._id}
                  className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={a.severity}
                        tone={
                          a.severity === "High"
                            ? "negative"
                            : a.severity === "Medium"
                            ? "warning"
                            : "neutral"
                        }
                      />
                      <StatusBadge
                        label={a.status}
                        tone={
                          a.status === "New"
                            ? "accent"
                            : a.status === "Resolved"
                            ? "positive"
                            : "warning"
                        }
                      />
                      <span className="font-mono text-[11px] text-ww-fg-muted">
                        {a.meterCode}
                      </span>
                      <span className="text-[12px] text-ww-fg-muted">
                        {new Date(a.triggeredAt).toISOString().slice(0, 16).replace("T", " ")} UTC
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] font-medium text-ww-fg">
                      {a.title}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ww-fg-secondary">
                      {a.buildingName} · {a.departmentName} — {a.description}
                    </p>
                    {(a.acknowledgedBy || a.resolvedBy) && (
                      <p className="mt-1 font-mono text-[11px] text-ww-fg-muted">
                        {a.resolvedBy
                          ? `Resolved by ${a.resolvedBy}`
                          : `Acknowledged by ${a.acknowledgedBy}`}
                      </p>
                    )}
                  </div>

                  {canTriage && a.status !== "Resolved" && (
                    <div className="flex shrink-0 items-center gap-2">
                      {a.status === "New" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() =>
                            handleStatusChange(a._id, "Acknowledged")
                          }
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          Acknowledge
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => handleStatusChange(a._id, "Resolved")}
                      >
                        <CircleCheck className="mr-1.5 h-3.5 w-3.5 text-ww-positive" />
                        Resolve
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="ww-card overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-ww-hairline text-ww-fg-muted">
                <th className="px-5 py-3.5 font-normal">Rule name</th>
                <th className="px-5 py-3.5 font-normal">Scope</th>
                <th className="px-5 py-3.5 font-normal">Metric</th>
                <th className="px-5 py-3.5 text-right font-normal">Limit</th>
                <th className="px-5 py-3.5 font-normal">Severity</th>
                <th className="px-5 py-3.5 font-normal">State</th>
                {canManageRules && (
                  <th className="px-5 py-3.5 text-right font-normal">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-ww-hairline">
              {thresholds.map((t) => (
                <tr key={t._id} className="hover:bg-ww-raised/40">
                  <td className="px-5 py-3.5 font-medium text-ww-fg">{t.name}</td>
                  <td className="px-5 py-3.5 text-ww-fg-secondary">
                    {t.buildingName} ·{" "}
                    <span className="font-mono text-[12px]">{t.meterCode}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-ww-fg-secondary">
                    {t.metric}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-ww-fg">
                    {t.metric === "spike_ratio"
                      ? `${t.spikeMultiplier}x baseline`
                      : `${t.limitValue} kWh`}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge
                      label={t.severity}
                      tone={t.severity === "High" ? "negative" : "warning"}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    {canManageRules ? (
                      <button type="button" onClick={() => handleToggleRule(t)}>
                        <StatusBadge
                          label={t.enabled ? "Active" : "Paused"}
                          tone={t.enabled ? "positive" : "neutral"}
                        />
                      </button>
                    ) : (
                      <StatusBadge
                        label={t.enabled ? "Active" : "Paused"}
                        tone={t.enabled ? "positive" : "neutral"}
                      />
                    )}
                  </td>
                  {canManageRules && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(t._id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ww-fg-muted hover:bg-ww-negative-soft hover:text-ww-negative"
                        aria-label={`Delete ${t.name}`}
                      >
                        <TrashBin className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalFrame
        open={modalOpen}
        title="Configure alert threshold"
        subtitle="Automatically generate alerts whenever metered usage exceeds configured limits"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <div>
            <label className="block text-[12px] text-ww-fg-secondary">
              Rule name
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Server Room Thermal Ceiling"
              className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Building scope
              </label>
              <select
                value={form.buildingId}
                onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                <option value="all">All buildings</option>
                {buildings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Meter scope
              </label>
              <select
                value={form.meterId}
                onChange={(e) => setForm({ ...form, meterId: e.target.value })}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 font-mono text-[12px] text-ww-fg outline-none focus:border-ww-accent"
              >
                <option value="all">All meters</option>
                {meters.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.meterCode}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Metric
              </label>
              <select
                value={form.metric}
                onChange={(e) =>
                  setForm({
                    ...form,
                    metric: e.target.value as "hourly_kwh" | "daily_kwh" | "spike_ratio",
                  })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                <option value="hourly_kwh">Hourly kWh</option>
                <option value="spike_ratio">Spike Ratio</option>
                <option value="daily_kwh">Daily kWh</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                {form.metric === "spike_ratio" ? "Multiplier (x)" : "Limit (kWh)"}
              </label>
              <input
                type="number"
                step="0.05"
                required
                value={
                  form.metric === "spike_ratio"
                    ? form.spikeMultiplier
                    : form.limitValue
                }
                onChange={(e) =>
                  form.metric === "spike_ratio"
                    ? setForm({ ...form, spikeMultiplier: e.target.value })
                    : setForm({ ...form, limitValue: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Severity
              </label>
              <select
                value={form.severity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    severity: e.target.value as "High" | "Medium" | "Low",
                  })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
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
              {submitting ? "Saving…" : "Save threshold"}
            </Button>
          </div>
        </form>
      </ModalFrame>
    </PageEntrance>
  );
}
