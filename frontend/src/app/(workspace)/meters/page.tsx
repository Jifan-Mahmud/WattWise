"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Magnifier, Plus, TrashBin } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { useUrlFilters, useUrlSearchInput } from "@/hooks/useUrlFilters";
import { buildApiUrl, buildHref } from "@/lib/url-params";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import {
  StatusBadge,
  LoadingPanel,
  ErrorPanel,
  EmptyPanel,
} from "@/components/ui/DataState";
import { ModalFrame } from "@/components/ui/ModalFrame";

interface MeterItem {
  _id: string;
  meterCode: string;
  name: string;
  meterType: string;
  buildingName: string;
  departmentName: string;
  ratedCapacityKw: number;
  baselineHourlyKwh: number;
  thresholdHourlyKwh: number;
  healthStatus: "Healthy" | "Degraded" | "Offline";
  voltage: number;
  powerFactor: number;
}

interface RefBuilding {
  _id: string;
  name: string;
}

interface RefDepartment {
  _id: string;
  buildingId: string;
  floorId: string;
  name: string;
}

const METER_TYPES = [
  "HVAC",
  "Lighting",
  "Production",
  "Server Room",
  "Main Feeder",
  "Chiller",
] as const;

const DEFAULT_METER_FILTERS = {
  q: "",
  buildingId: "all",
  health: "all",
};

export default function MetersPage() {
  const { user, apiFetch, notify } = useWattWise();
  const canEdit =
    user?.role === "Organization Admin" || user?.role === "Facility Manager";

  const { filters, setFilter } = useUrlFilters(DEFAULT_METER_FILTERS);
  const { q: urlQuery, buildingId, health: healthFilter } = filters;
  const handleQuerySync = useCallback(
    (nextQuery: string) => setFilter("q", nextQuery),
    [setFilter]
  );
  const [queryInput, setQueryInput] = useUrlSearchInput(
    urlQuery,
    handleQuerySync
  );
  const [meters, setMeters] = useState<MeterItem[]>([]);
  const [buildings, setBuildings] = useState<RefBuilding[]>([]);
  const [departments, setDepartments] = useState<RefDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    buildingId: "",
    departmentId: "",
    floorId: "",
    meterCode: "",
    name: "",
    meterType: "HVAC",
    ratedCapacityKw: "180",
    baselineHourlyKwh: "52",
    thresholdHourlyKwh: "85",
  });

  useEffect(() => {
    let active = true;
    const metersUrl = buildApiUrl("/api/meters", {
      q: urlQuery || undefined,
      buildingId,
      healthStatus: healthFilter,
    });

    Promise.all([
      apiFetch<{ meters: MeterItem[] }>(metersUrl),
      apiFetch<{ buildings: RefBuilding[] }>("/api/buildings"),
      apiFetch<{ departments: RefDepartment[] }>("/api/departments"),
    ])
      .then(([mRes, bRes, dRes]) => {
        if (!active) return;
        setError(null);
        setMeters(mRes.meters);
        setBuildings(bRes.buildings);
        setDepartments(dRes.departments);
        const bId = bRes.buildings[0]?._id || "";
        const dept = dRes.departments.find((d) => d.buildingId === bId);
        setForm((prev) => ({
          ...prev,
          buildingId: prev.buildingId || bId,
          departmentId: prev.departmentId || dept?._id || "",
          floorId: prev.floorId || dept?.floorId || "",
        }));
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load meters");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, urlQuery, buildingId, healthFilter, refreshTick]);

  const modalDepts = departments.filter((d) => d.buildingId === form.buildingId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/meters", {
        method: "POST",
        body: JSON.stringify(form),
      });
      notify("Electricity meter registered", "positive");
      setModalOpen(false);
      setForm((p) => ({ ...p, meterCode: "", name: "" }));
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Registration failed", "negative");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCycleHealth(m: MeterItem) {
    const order: MeterItem["healthStatus"][] = ["Healthy", "Degraded", "Offline"];
    const next = order[(order.indexOf(m.healthStatus) + 1) % order.length];
    try {
      await apiFetch(`/api/meters/${m._id}`, {
        method: "PATCH",
        body: JSON.stringify({ healthStatus: next }),
      });
      notify(`${m.meterCode} status changed to ${next}`, "positive");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "negative");
    }
  }

  async function handleDelete(id: string, code: string) {
    try {
      await apiFetch(`/api/meters/${id}`, { method: "DELETE" });
      notify(`Removed ${code}`, "positive");
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
            Meters and fleet health
          </h1>
          <p className="mt-1 text-[14px] text-ww-fg-secondary">
            Sub-meter registry, hourly thresholds, power factor, and telemetry status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Magnifier className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ww-fg-muted" />
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search meters"
              className="h-9 w-44 rounded-[8px] border border-ww-hairline bg-ww-card pl-9 pr-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
            />
          </div>

          <select
            aria-label="Filter meters by building"
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

          <select
            aria-label="Filter meters by health status"
            value={healthFilter}
            onChange={(e) => setFilter("health", e.target.value)}
            className="h-9 rounded-[8px] border border-ww-hairline bg-ww-card px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
          >
            <option value="all">All health</option>
            <option value="Healthy">Healthy</option>
            <option value="Degraded">Degraded</option>
            <option value="Offline">Offline</option>
          </select>

          {canEdit && (
            <Button
              size="sm"
              onPress={() => setModalOpen(true)}
              className="h-9 rounded-[8px] bg-ww-fg px-3.5 text-[13px] font-medium text-ww-bg"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Register meter
            </Button>
          )}
        </div>
      </div>

      {error && (
        <ErrorPanel message={error} onRetry={() => setRefreshTick((t) => t + 1)} />
      )}

      {loading ? (
        <LoadingPanel rows={7} />
      ) : meters.length === 0 ? (
        <EmptyPanel
          title="No meters match filters"
          description="Adjust your search query or register a new sub-meter."
        />
      ) : (
        <div className="ww-card overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-ww-hairline text-ww-fg-muted">
                <th className="px-5 py-3.5 font-normal">Meter code</th>
                <th className="px-5 py-3.5 font-normal">Type</th>
                <th className="px-5 py-3.5 font-normal">Location</th>
                <th className="px-5 py-3.5 text-right font-normal">Baseline</th>
                <th className="px-5 py-3.5 text-right font-normal">Threshold</th>
                <th className="px-5 py-3.5 text-right font-normal">Voltage / PF</th>
                <th className="px-5 py-3.5 font-normal">Health</th>
                {canEdit && <th className="px-5 py-3.5 text-right font-normal">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ww-hairline">
              {meters.map((m) => (
                <tr key={m._id} className="hover:bg-ww-raised/40">
                  <td className="px-5 py-3.5">
                    <Link
                      href={buildHref("/records", { q: m.meterCode })}
                      className="font-mono text-[12px] font-medium text-ww-fg underline-offset-4 hover:text-ww-accent hover:underline"
                    >
                      {m.meterCode}
                    </Link>
                    <p className="text-[12px] text-ww-fg-secondary">{m.name}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ww-fg-secondary">{m.meterType}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-ww-fg">{m.buildingName}</p>
                    <p className="text-[12px] text-ww-fg-muted">{m.departmentName}</p>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-ww-fg">
                    {m.baselineHourlyKwh} kWh
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-ww-accent">
                    {m.thresholdHourlyKwh} kWh
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-mono text-[12px] text-ww-fg-secondary">
                    {m.voltage}V · {m.powerFactor}
                  </td>
                  <td className="px-5 py-3.5">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => handleCycleHealth(m)}
                        title="Click to cycle health state"
                      >
                        <StatusBadge
                          label={m.healthStatus}
                          tone={
                            m.healthStatus === "Healthy"
                              ? "positive"
                              : m.healthStatus === "Degraded"
                              ? "warning"
                              : "negative"
                          }
                        />
                      </button>
                    ) : (
                      <StatusBadge
                        label={m.healthStatus}
                        tone={
                          m.healthStatus === "Healthy"
                            ? "positive"
                            : m.healthStatus === "Degraded"
                            ? "warning"
                            : "negative"
                        }
                      />
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(m._id, m.meterCode)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ww-fg-muted hover:bg-ww-negative-soft hover:text-ww-negative"
                        aria-label={`Delete ${m.meterCode}`}
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
        title="Register electricity meter"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Building
              </label>
              <select
                required
                value={form.buildingId}
                onChange={(e) => {
                  const bId = e.target.value;
                  const dept = departments.find((d) => d.buildingId === bId);
                  setForm({
                    ...form,
                    buildingId: bId,
                    departmentId: dept?._id || "",
                    floorId: dept?.floorId || "",
                  });
                }}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                {buildings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Department
              </label>
              <select
                required
                value={form.departmentId}
                onChange={(e) => {
                  const dept = departments.find((d) => d._id === e.target.value);
                  setForm({
                    ...form,
                    departmentId: e.target.value,
                    floorId: dept?.floorId || form.floorId,
                  });
                }}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                {modalDepts.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Meter code
              </label>
              <input
                required
                value={form.meterCode}
                onChange={(e) => setForm({ ...form, meterCode: e.target.value })}
                placeholder="MTR-NG-99"
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 font-mono text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Meter type
              </label>
              <select
                value={form.meterType}
                onChange={(e) => setForm({ ...form, meterType: e.target.value })}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                {METER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] text-ww-fg-secondary">
              Meter label
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Rooftop Chiller Secondary Feeder"
              className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Capacity (kW)
              </label>
              <input
                type="number"
                required
                value={form.ratedCapacityKw}
                onChange={(e) =>
                  setForm({ ...form, ratedCapacityKw: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Baseline (kWh)
              </label>
              <input
                type="number"
                required
                value={form.baselineHourlyKwh}
                onChange={(e) =>
                  setForm({ ...form, baselineHourlyKwh: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Threshold (kWh)
              </label>
              <input
                type="number"
                required
                value={form.thresholdHourlyKwh}
                onChange={(e) =>
                  setForm({ ...form, thresholdHourlyKwh: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
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
              {submitting ? "Saving…" : "Register meter"}
            </Button>
          </div>
        </form>
      </ModalFrame>
    </PageEntrance>
  );
}
