"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Magnifier, Plus, TrashBin } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  MotionBar,
  PageEntrance,
  StaggerGroup,
  StaggerItem,
} from "@/components/ui/MotionPrimitives";
import {
  StatusBadge,
  LoadingPanel,
  ErrorPanel,
  EmptyPanel,
} from "@/components/ui/DataState";
import { ModalFrame } from "@/components/ui/ModalFrame";

interface BuildingItem {
  _id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  totalSqFt: number;
  targetMonthlyKwh: number;
  status: "Operational" | "Maintenance";
  floorsCount: number;
  metersCount: number;
  mtdKwh: number;
  mtdCost: number;
}

export default function BuildingsPage() {
  const { user, apiFetch, notify } = useWattWise();
  const isAdmin = user?.role === "Organization Admin";

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 280);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    totalSqFt: "250000",
    targetMonthlyKwh: "180000",
    status: "Operational" as "Operational" | "Maintenance",
  });

  useEffect(() => {
    let active = true;
    const qs = debouncedQuery ? `?q=${encodeURIComponent(debouncedQuery)}` : "";
    apiFetch<{ buildings: BuildingItem[] }>(`/api/buildings${qs}`)
      .then((res) => {
        if (!active) return;
        setError(null);
        setBuildings(res.buildings);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load buildings");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, debouncedQuery, refreshTick]);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      try {
        await apiFetch("/api/buildings", {
          method: "POST",
          body: JSON.stringify(form),
        });
        notify("Building registered", "positive");
        setModalOpen(false);
        setForm({
          name: "",
          code: "",
          address: "",
          city: "",
          totalSqFt: "250000",
          targetMonthlyKwh: "180000",
          status: "Operational",
        });
        setRefreshTick((t) => t + 1);
      } catch (err) {
        notify(
          err instanceof Error ? err.message : "Failed to create building",
          "negative"
        );
      } finally {
        setSubmitting(false);
      }
    },
    [apiFetch, form, notify]
  );

  async function handleToggleStatus(b: BuildingItem) {
    const nextStatus = b.status === "Operational" ? "Maintenance" : "Operational";
    try {
      await apiFetch(`/api/buildings/${b._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      notify(`${b.name} set to ${nextStatus}`, "positive");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "negative");
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await apiFetch(`/api/buildings/${id}`, { method: "DELETE" });
      notify(`Removed ${name}`, "positive");
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
            Buildings
          </h1>
          <p className="mt-1 text-[14px] text-ww-fg-secondary">
            Manage physical properties, monthly energy targets, and operational state
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Magnifier className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ww-fg-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search buildings"
              className="h-9 w-56 rounded-[8px] border border-ww-hairline bg-ww-card pl-9 pr-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
            />
          </div>
          {isAdmin && (
            <Button
              size="sm"
              onPress={() => setModalOpen(true)}
              className="h-9 rounded-[8px] bg-ww-fg px-3.5 text-[13px] font-medium text-ww-bg"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add building
            </Button>
          )}
        </div>
      </div>

      {error && (
        <ErrorPanel message={error} onRetry={() => setRefreshTick((t) => t + 1)} />
      )}

      {loading ? (
        <LoadingPanel rows={5} />
      ) : buildings.length === 0 ? (
        <EmptyPanel
          title="No buildings found"
          description="Register a facility building or adjust your search query."
        />
      ) : (
        <StaggerGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {buildings.map((b) => {
            const targetPct = Math.min(
              100,
              Math.round((b.mtdKwh / Math.max(1, b.targetMonthlyKwh)) * 100)
            );
            return (
              <StaggerItem
                key={b._id}
                className="ww-card flex flex-col justify-between p-5 transition-colors hover:border-ww-hairline-strong"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[11px] text-ww-fg-muted">
                        {b.code}
                      </span>
                      <h2 className="mt-0.5 text-[16px] font-medium text-ww-fg">
                        {b.name}
                      </h2>
                      <p className="text-[12px] text-ww-fg-secondary">
                        {b.address}, {b.city}
                      </p>
                    </div>
                    <StatusBadge
                      label={b.status}
                      tone={b.status === "Operational" ? "positive" : "warning"}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-ww-hairline py-3 text-[12px]">
                    <div>
                      <p className="text-ww-fg-muted">Floors</p>
                      <p className="mt-0.5 tabular-nums font-medium text-ww-fg">
                        {b.floorsCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-ww-fg-muted">Meters</p>
                      <p className="mt-0.5 tabular-nums font-medium text-ww-fg">
                        {b.metersCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-ww-fg-muted">Area</p>
                      <p className="mt-0.5 tabular-nums font-medium text-ww-fg">
                        {(b.totalSqFt / 1000).toFixed(0)}k sq ft
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span className="text-ww-fg-secondary">
                        Month-to-date draw
                      </span>
                      <span className="tabular-nums font-mono text-ww-fg">
                        {b.mtdKwh.toLocaleString()} /{" "}
                        {b.targetMonthlyKwh.toLocaleString()} kWh
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ww-raised">
                      <MotionBar
                        pct={targetPct}
                        color={
                          targetPct > 90
                            ? "var(--ww-accent)"
                            : "var(--ww-positive)"
                        }
                      />
                    </div>
                    <p className="mt-1.5 tabular-nums font-mono text-[12px] text-ww-fg-muted">
                      MTD Cost: ${b.mtdCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-4 flex items-center justify-between border-t border-ww-hairline pt-3">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(b)}
                      className="text-[12px] text-ww-fg-secondary hover:text-ww-fg"
                    >
                      Mark as{" "}
                      {b.status === "Operational" ? "Maintenance" : "Operational"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b._id, b.name)}
                      aria-label={`Delete ${b.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-[6px] text-ww-fg-muted hover:bg-ww-negative-soft hover:text-ww-negative"
                    >
                      <TrashBin className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}

      <ModalFrame
        open={modalOpen}
        title="Register building"
        subtitle="Add a facility building inside your organization portfolio"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Building name
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Northgrid Annex B"
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Building code
              </label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="NG-ANX-B"
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 font-mono text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Street address
              </label>
              <input
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="220 Park Ave"
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                City
              </label>
              <input
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="New York"
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Area (sq ft)
              </label>
              <input
                type="number"
                required
                min={100}
                value={form.totalSqFt}
                onChange={(e) => setForm({ ...form, totalSqFt: e.target.value })}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Monthly target (kWh)
              </label>
              <input
                type="number"
                required
                min={100}
                value={form.targetMonthlyKwh}
                onChange={(e) =>
                  setForm({ ...form, targetMonthlyKwh: e.target.value })
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
              {submitting ? "Saving…" : "Create building"}
            </Button>
          </div>
        </form>
      </ModalFrame>
    </PageEntrance>
  );
}
