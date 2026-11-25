"use client";

import React, { useEffect, useState } from "react";
import { Pencil } from "@gravity-ui/icons";
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

  function openEdit(target: OrgUser) {
    setEditing(target);
    setEditRole(target.role);
    setEditStatus(target.status);
    setEditDepts(target.departmentIds.map(String));
  }

  function toggleDept(id: string) {
    setEditDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
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
          Manage organization team members, RBAC roles, and department scopes
        </p>
      </div>

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
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-ww-raised/40">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-ww-fg">{u.name}</p>
                    <p className="font-mono text-[12px] text-ww-fg-muted">
                      {u.email}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge
                      label={u.role}
                      tone={u.role === "Organization Admin" ? "accent" : "neutral"}
                    />
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
                    <Button variant="outline" size="sm" onPress={() => openEdit(u)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
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
                {departments.map((d) => (
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
                ))}
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
