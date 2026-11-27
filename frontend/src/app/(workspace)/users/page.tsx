"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Xmark } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { useWattWise, type UserRole } from "@/components/providers/AppProviders";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import {
  StatusBadge,
  LoadingPanel,
  ErrorPanel,
} from "@/components/ui/DataState";
import { ModalFrame } from "@/components/ui/ModalFrame";

interface OrgUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  requestedRole?: UserRole | null;
  requestStatus?: "Pending" | "Approved" | "Dismissed" | null;
  departmentIds: string[];
  departmentNames: string[];
  status: "Active" | "Suspended";
}

interface DeptOption {
  _id: string;
  name: string;
  code: string;
}

const ALL_ROLES: UserRole[] = [
  "Organization Admin",
  "Facility Manager",
  "Department Manager",
  "Viewer",
];

export default function UsersPage() {
  const { user, apiFetch, notify } = useWattWise();
  const isAdmin = user?.role === "Organization Admin";

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [editing, setEditing] = useState<OrgUser | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("Viewer");
  const [editStatus, setEditStatus] = useState<"Active" | "Suspended">("Active");
  const [editDepts, setEditDepts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    Promise.all([
      apiFetch<{ users: OrgUser[] }>("/api/users"),
      apiFetch<{ departments: DeptOption[] }>("/api/departments"),
    ])
      .then(([uRes, dRes]) => {
        if (!active) return;
        setError(null);
        setUsers(uRes.users);
        setDepartments(dRes.departments);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load users");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch, isAdmin, refreshTick]);

  const pendingRequests = useMemo(
    () => users.filter((u) => u.requestStatus === "Pending" && u.requestedRole),
    [users]
  );

  function openEdit(target: OrgUser, preselectRole?: UserRole) {
    setEditing(target);
    setEditRole(preselectRole || target.role);
    setEditStatus(target.status);
    setEditDepts(target.departmentIds.map(String));
  }

  function toggleDept(id: string) {
    setEditDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  async function handleQuickRequestAction(
    target: OrgUser,
    action: "approve" | "dismiss"
  ) {
    if (
      action === "approve" &&
      target.requestedRole === "Department Manager" &&
      departments.length > 0
    ) {
      openEdit(target, "Department Manager");
      return;
    }

    const nextRole =
      action === "approve" && target.requestedRole
        ? target.requestedRole
        : target.role;

    try {
      await apiFetch(`/api/users/${target._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: nextRole,
          status: target.status,
          departmentIds: [],
          requestAction: action,
        }),
      });
      notify(
        action === "approve"
          ? `${target.name} promoted to ${nextRole}`
          : `Kept ${target.name} as ${target.role}`,
        "positive"
      );
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Action failed", "negative");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await apiFetch(`/api/users/${editing._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          role: editRole,
          status: editStatus,
          departmentIds: editRole === "Department Manager" ? editDepts : [],
          requestAction:
            editing.requestStatus === "Pending"
              ? editRole === "Viewer"
                ? "dismiss"
                : "approve"
              : undefined,
        }),
      });
      notify(`Updated ${editing.name}`, "positive");
      setEditing(null);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "negative");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <PageEntrance>
        <ErrorPanel message="User and role administration requires Organization Admin permissions." />
      </PageEntrance>
    );
  }

  return (
    <PageEntrance className="space-y-6">
      <div className="border-b border-ww-hairline pb-5">
        <h1 className="text-[28px] font-medium tracking-[-0.02em] text-ww-fg">
          Users and permissions
        </h1>
        <p className="mt-1 text-[14px] text-ww-fg-secondary">
          Review pending role requests, assign organization RBAC roles, and scope
          departments
        </p>
      </div>

      {pendingRequests.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-ww-warning/40 bg-ww-warning-soft/50 px-4 py-3 text-[13px] text-ww-fg">
          <div>
            <span className="font-medium">
              {pendingRequests.length} pending role request
              {pendingRequests.length > 1 ? "s" : ""}
            </span>{" "}
            <span className="text-ww-fg-secondary">
              — new members joined as Viewer and requested elevated permissions.
            </span>
          </div>
          <StatusBadge label="Approval required" tone="warning" />
        </div>
      )}

      {error && (
        <ErrorPanel message={error} onRetry={() => setRefreshTick((t) => t + 1)} />
      )}

      {loading ? (
        <LoadingPanel rows={5} />
      ) : (
        <div className="ww-card overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-ww-hairline text-ww-fg-muted">
                <th className="px-5 py-3.5 font-normal">Member</th>
                <th className="px-5 py-3.5 font-normal">Role</th>
                <th className="px-5 py-3.5 font-normal">Department scope</th>
                <th className="px-5 py-3.5 font-normal">Status</th>
                <th className="px-5 py-3.5 text-right font-normal">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ww-hairline">
              {users.map((u) => {
                const hasPending =
                  u.requestStatus === "Pending" && Boolean(u.requestedRole);
                return (
                  <tr key={u._id} className="hover:bg-ww-raised/40">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-ww-fg">{u.name}</p>
                      <p className="font-mono text-[12px] text-ww-fg-muted">
                        {u.email}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge
                          label={u.role}
                          tone={u.role === "Organization Admin" ? "accent" : "neutral"}
                        />
                        {hasPending && u.requestedRole && (
                          <StatusBadge
                            label={`Requested: ${u.requestedRole}`}
                            tone="warning"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-ww-fg-secondary">
                      {u.role === "Department Manager"
                        ? u.departmentNames.length
                          ? u.departmentNames.join(", ")
                          : "Unassigned"
                        : "Organization-wide"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge
                        label={u.status}
                        tone={u.status === "Active" ? "positive" : "negative"}
                      />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        {hasPending && (
                          <>
                            <Button
                              size="sm"
                              onPress={() => handleQuickRequestAction(u, "approve")}
                              className="h-8 bg-ww-fg px-2.5 text-[12px] text-ww-bg"
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onPress={() => handleQuickRequestAction(u, "dismiss")}
                              className="h-8 px-2.5 text-[12px]"
                            >
                              <Xmark className="mr-1 h-3.5 w-3.5" />
                              Keep Viewer
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onPress={() => openEdit(u)}
                          className="h-8 px-2.5 text-[12px]"
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalFrame
        open={Boolean(editing)}
        title={`Edit permissions — ${editing?.name || ""}`}
        subtitle={editing?.email}
        onClose={() => setEditing(null)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {editing?.requestStatus === "Pending" && editing?.requestedRole && (
            <div className="flex items-center justify-between gap-2 rounded-[8px] border border-ww-warning/40 bg-ww-warning-soft/50 px-3 py-2 text-[12px] text-ww-fg">
              <span>
                Requested role: <strong>{editing.requestedRole}</strong>
              </span>
              {editRole !== editing.requestedRole && (
                <button
                  type="button"
                  onClick={() => setEditRole(editing.requestedRole as UserRole)}
                  className="font-medium text-ww-accent underline underline-offset-2"
                >
                  Apply {editing.requestedRole}
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Role
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Account status
              </label>
              <select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(e.target.value as "Active" | "Suspended")
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              >
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          {editRole === "Department Manager" && (
            <div>
              <p className="mb-2 text-[12px] text-ww-fg-secondary">
                Authorized departments
              </p>
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-[8px] border border-ww-hairline bg-ww-bg p-3">
                {departments.length === 0 ? (
                  <p className="py-2 text-center text-[12px] text-ww-fg-muted">
                    No departments created in this organization yet.
                  </p>
                ) : (
                  departments.map((d) => (
                    <label
                      key={d._id}
                      className="flex cursor-pointer items-center gap-2 text-[13px] text-ww-fg"
                    >
                      <input
                        type="checkbox"
                        checked={editDepts.includes(d._id)}
                        onChange={() => toggleDept(d._id)}
                      />
                      <span className="truncate">{d.name}</span>
                      <span className="ml-auto font-mono text-[11px] text-ww-fg-muted">
                        {d.code}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onPress={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isDisabled={saving}
              className="bg-ww-fg text-ww-bg"
            >
              {saving ? "Saving…" : "Save permissions"}
            </Button>
          </div>
        </form>
      </ModalFrame>
    </PageEntrance>
  );
}
