"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, TrashBin } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import { LoadingPanel, ErrorPanel, EmptyPanel } from "@/components/ui/DataState";
import { ModalFrame } from "@/components/ui/ModalFrame";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { buildApiUrl, buildHref } from "@/lib/url-params";

interface FloorItem {
  _id: string;
  buildingId: string;
  buildingName: string;
  floorNumber: number;
  name: string;
  areaSqFt: number;
  departmentsCount: number;
}

interface BuildingRef {
  _id: string;
  name: string;
}

const DEFAULT_FLOOR_FILTERS = { buildingId: "all" };

export default function FloorsPage() {
  const { user, apiFetch, notify } = useWattWise();
  const isAdmin = user?.role === "Organization Admin";

  const { filters, setFilter } = useUrlFilters(DEFAULT_FLOOR_FILTERS);
  const { buildingId } = filters;
  const [floors, setFloors] = useState<FloorItem[]>([]);
  const [buildings, setBuildings] = useState<BuildingRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    buildingId: "",
    floorNumber: "4",
    name: "",
    areaSqFt: "65000",
  });

  useEffect(() => {
    let active = true;
    const floorsUrl = buildApiUrl("/api/floors", { buildingId });
    Promise.all([
      apiFetch<{ floors: FloorItem[] }>(floorsUrl),
      apiFetch<{ buildings: BuildingRef[] }>("/api/buildings"),
    ])
      .then(([fRes, bRes]) => {
        if (!active) return;
        setError(null);
        setFloors(fRes.floors);
        setBuildings(bRes.buildings);
        setForm((prev) => ({
          ...prev,
          buildingId: prev.buildingId || bRes.buildings[0]?._id || "",
        }));
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load floors");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, buildingId, refreshTick]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/floors", {
        method: "POST",
        body: JSON.stringify(form),
      });
      notify("Floor added", "positive");
      setModalOpen(false);
      setForm((p) => ({ ...p, name: "" }));
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to add floor", "negative");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(`/api/floors/${id}`, { method: "DELETE" });
      notify("Floor removed", "positive");
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
            Floors
          </h1>
          <p className="mt-1 text-[14px] text-ww-fg-secondary">
            Level-by-level floor allocation and department distribution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter floors by building"
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

          {isAdmin && (
            <Button
              size="sm"
              onPress={() => setModalOpen(true)}
              className="h-9 rounded-[8px] bg-ww-fg px-3.5 text-[13px] font-medium text-ww-bg"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add floor
            </Button>
          )}
        </div>
      </div>

      {error && (
        <ErrorPanel message={error} onRetry={() => setRefreshTick((t) => t + 1)} />
      )}

      {loading ? (
        <LoadingPanel rows={6} />
      ) : floors.length === 0 ? (
        <EmptyPanel
          title="No floors configured"
          description="Select a different building or add a floor level."
        />
      ) : (
        <div className="ww-card overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-ww-hairline text-ww-fg-muted">
                <th className="px-5 py-3.5 font-normal">Level</th>
                <th className="px-5 py-3.5 font-normal">Floor name</th>
                <th className="px-5 py-3.5 font-normal">Building</th>
                <th className="px-5 py-3.5 text-right font-normal">Area (sq ft)</th>
                <th className="px-5 py-3.5 text-right font-normal">Departments</th>
                {isAdmin && <th className="px-5 py-3.5 text-right font-normal">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ww-hairline">
              {floors.map((f) => (
                <tr key={f._id} className="hover:bg-ww-raised/40">
                  <td className="px-5 py-3.5 font-mono text-ww-fg-secondary">
                    L{String(f.floorNumber).padStart(2, "0")}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-ww-fg">{f.name}</td>
                  <td className="px-5 py-3.5 text-ww-fg-secondary">
                    {f.buildingName}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-ww-fg">
                    {f.areaSqFt.toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-ww-fg-secondary">
                    <Link
                      href={buildHref("/departments", { buildingId: f.buildingId })}
                      className="underline-offset-4 hover:text-ww-accent hover:underline"
                    >
                      {f.departmentsCount}
                    </Link>
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(f._id)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ww-fg-muted hover:bg-ww-negative-soft hover:text-ww-negative"
                        aria-label={`Delete ${f.name}`}
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
        title="Add floor level"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[12px] text-ww-fg-secondary">
              Building
            </label>
            <select
              required
              value={form.buildingId}
              onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
              className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
            >
              {buildings.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Floor number
              </label>
              <input
                type="number"
                required
                value={form.floorNumber}
                onChange={(e) =>
                  setForm({ ...form, floorNumber: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Area (sq ft)
              </label>
              <input
                type="number"
                required
                min={100}
                value={form.areaSqFt}
                onChange={(e) => setForm({ ...form, areaSqFt: e.target.value })}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-ww-fg-secondary">
              Floor description
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Level 04 - Rooftop Chiller Deck"
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
              {submitting ? "Saving…" : "Add floor"}
            </Button>
          </div>
        </form>
      </ModalFrame>
    </PageEntrance>
  );
}
