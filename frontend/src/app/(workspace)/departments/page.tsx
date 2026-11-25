"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Magnifier, Plus, TrashBin } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { useUrlFilters, useUrlSearchInput } from "@/hooks/useUrlFilters";
import { buildApiUrl } from "@/lib/url-params";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import { LoadingPanel, ErrorPanel, EmptyPanel } from "@/components/ui/DataState";
import { ModalFrame } from "@/components/ui/ModalFrame";

interface DepartmentItem {
  _id: string;
  name: string;
  code: string;
  costCenter: string;
  buildingId: string;
  buildingName: string;
  floorId: string;
  floorName: string;
  monthlyBudgetUsd: number;
  headcount: number;
  mtdKwh: number;
  mtdCost: number;
}

interface BuildingRef {
  _id: string;
  name: string;
}

interface FloorRef {
  _id: string;
  buildingId: string;
  name: string;
}

const DEFAULT_DEPARTMENT_FILTERS = {
  q: "",
  buildingId: "all",
};

export default function DepartmentsPage() {
  const { user, apiFetch, notify } = useWattWise();
  const isAdmin = user?.role === "Organization Admin";

  const { filters, setFilter } = useUrlFilters(DEFAULT_DEPARTMENT_FILTERS);
  const { q: urlQuery, buildingId } = filters;
  const handleQuerySync = useCallback(
    (nextQuery: string) => setFilter("q", nextQuery),
    [setFilter]
  );
  const [queryInput, setQueryInput] = useUrlSearchInput(
    urlQuery,
    handleQuerySync
  );
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [buildings, setBuildings] = useState<BuildingRef[]>([]);
  const [floors, setFloors] = useState<FloorRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    buildingId: "",
    floorId: "",
    name: "",
    code: "",
    costCenter: "CC-NEW-101",
    monthlyBudgetUsd: "16000",
    headcount: "35",
  });

  useEffect(() => {
    let active = true;
    const deptUrl = buildApiUrl("/api/departments", {
      q: urlQuery || undefined,
      buildingId,
    });

    Promise.all([
      apiFetch<{ departments: DepartmentItem[] }>(deptUrl),
      apiFetch<{ buildings: BuildingRef[] }>("/api/buildings"),
      apiFetch<{ floors: FloorRef[] }>("/api/floors"),
    ])
      .then(([dRes, bRes, fRes]) => {
        if (!active) return;
        setError(null);
        setDepartments(dRes.departments);
        setBuildings(bRes.buildings);
        setFloors(fRes.floors);
        const firstBuilding = bRes.buildings[0]?._id || "";
        const firstFloor =
          fRes.floors.find((f) => f.buildingId === firstBuilding)?._id || "";
        setForm((prev) => ({
          ...prev,
          buildingId: prev.buildingId || firstBuilding,
          floorId: prev.floorId || firstFloor,
        }));
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load departments");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, urlQuery, buildingId, refreshTick]);

  const modalFloors = floors.filter((f) => f.buildingId === form.buildingId);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/departments", {
        method: "POST",
        body: JSON.stringify(form),
      });
      notify("Department created", "positive");
      setModalOpen(false);
      setForm((p) => ({ ...p, name: "", code: "" }));
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Create failed", "negative");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await apiFetch(`/api/departments/${id}`, { method: "DELETE" });
      notify(`Deleted ${name}`, "positive");
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
            Departments
          </h1>
          <p className="mt-1 text-[14px] text-ww-fg-secondary">
            Cost centers, monthly electricity budgets, and department consumption
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Magnifier className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ww-fg-muted" />
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search departments"
              className="h-9 w-48 rounded-[8px] border border-ww-hairline bg-ww-card pl-9 pr-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
            />
          </div>

          <select
            aria-label="Filter departments by building"
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
              Add department
            </Button>
          )}
        </div>
      </div>

      {error && (
        <ErrorPanel message={error} onRetry={() => setRefreshTick((t) => t + 1)} />
      )}

      {loading ? (
        <LoadingPanel rows={6} />
      ) : departments.length === 0 ? (
        <EmptyPanel
          title="No departments in scope"
          description="Try clearing your search filter or contact an Organization Admin."
        />
      ) : (
        <div className="ww-card overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-ww-hairline text-ww-fg-muted">
                <th className="px-5 py-3.5 font-normal">Department</th>
                <th className="px-5 py-3.5 font-normal">Building & floor</th>
                <th className="px-5 py-3.5 font-normal">Cost center</th>
                <th className="px-5 py-3.5 text-right font-normal">MTD usage</th>
                <th className="px-5 py-3.5 text-right font-normal">MTD cost</th>
                <th className="px-5 py-3.5 text-right font-normal">Budget util</th>
                {isAdmin && <th className="px-5 py-3.5 text-right font-normal">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ww-hairline">
              {departments.map((d) => {
                const util = Math.round(
                  (d.mtdCost / Math.max(1, d.monthlyBudgetUsd)) * 100
                );
                return (
                  <tr key={d._id} className="hover:bg-ww-raised/40">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ww-fg">{d.name}</p>
                      <p className="font-mono text-[11px] text-ww-fg-muted">
                        {d.code}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-ww-fg">{d.buildingName}</p>
                      <p className="text-[12px] text-ww-fg-muted">{d.floorName}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[12px] text-ww-fg-secondary">
                      {d.costCenter}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-ww-fg">
                      {d.mtdKwh.toLocaleString()} kWh
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-ww-fg">
                      ${d.mtdCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span
                        className={
                          util > 95
                            ? "font-medium text-ww-negative"
                            : "text-ww-fg-secondary"
                        }
                      >
                        {util}%
                      </span>{" "}
                      <span className="font-mono text-[11px] text-ww-fg-muted">
                        / ${d.monthlyBudgetUsd.toLocaleString()}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(d._id, d.name)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-ww-fg-muted hover:bg-ww-negative-soft hover:text-ww-negative"
                          aria-label={`Delete ${d.name}`}
                        >
                          <TrashBin className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalFrame
        open={modalOpen}
        title="Add department"
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
                  const firstF = floors.find((f) => f.buildingId === bId)?._id || "";
                  setForm({ ...form, buildingId: bId, floorId: firstF });
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
                Floor
              </label>
              <select
                required
                value={form.floorId}
                onChange={(e) => setForm({ ...form, floorId: e.target.value })}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                {modalFloors.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Department name
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Battery Storage Array"
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Code
              </label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="NG-BESS-01"
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 font-mono text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Cost center
              </label>
              <input
                required
                value={form.costCenter}
                onChange={(e) =>
                  setForm({ ...form, costCenter: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 font-mono text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Monthly budget ($)
              </label>
              <input
                type="number"
                required
                min={100}
                value={form.monthlyBudgetUsd}
                onChange={(e) =>
                  setForm({ ...form, monthlyBudgetUsd: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Headcount
              </label>
              <input
                type="number"
                required
                min={1}
                value={form.headcount}
                onChange={(e) =>
                  setForm({ ...form, headcount: e.target.value })
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
              {submitting ? "Saving…" : "Create department"}
            </Button>
          </div>
        </form>
      </ModalFrame>
    </PageEntrance>
  );
}
