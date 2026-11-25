"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useWattWise } from "@/components/providers/AppProviders";
import { PageEntrance } from "@/components/ui/MotionPrimitives";
import { StatusBadge, LoadingPanel, ErrorPanel } from "@/components/ui/DataState";

export default function SettingsPage() {
  const { user, theme, setTheme, apiFetch, refreshToken, notify } =
    useWattWise();
  const isAdmin = user?.role === "Organization Admin";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    timezone: "America/New_York",
  });

  const [orgForm, setOrgForm] = useState({
    name: "",
    industry: "",
    timezone: "America/New_York",
    currency: "USD",
    tariffPerKwh: "0.145",
    emissionFactorKgPerKwh: "0.412",
    contactEmail: "",
  });

  useEffect(() => {
    let active = true;
    apiFetch<{
      profile: { name: string; timezone: string } | null;
      organization: {
        name: string;
        industry: string;
        timezone: string;
        currency: string;
        tariffPerKwh: number;
        emissionFactorKgPerKwh: number;
        contactEmail?: string;
      } | null;
    }>("/api/profile")
      .then((res) => {
        if (!active) return;
        setError(null);
        if (res.profile) {
          setProfileForm({
            name: res.profile.name || "",
            timezone: res.profile.timezone || "UTC",
          });
        }
        if (res.organization) {
          setOrgForm({
            name: res.organization.name || "",
            industry: res.organization.industry || "",
            timezone: res.organization.timezone || "UTC",
            currency: res.organization.currency || "USD",
            tariffPerKwh: String(res.organization.tariffPerKwh ?? 0.145),
            emissionFactorKgPerKwh: String(
              res.organization.emissionFactorKgPerKwh ?? 0.412
            ),
            contactEmail: res.organization.contactEmail || "",
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load settings");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apiFetch]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: profileForm.name,
          timezone: profileForm.timezone,
          themePreference: theme,
        }),
      });
      await refreshToken();
      notify("Profile settings updated", "positive");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "negative");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveOrg(e: React.FormEvent) {
    e.preventDefault();
    setSavingOrg(true);
    try {
      await apiFetch("/api/organizations/current", {
        method: "PATCH",
        body: JSON.stringify({
          name: orgForm.name,
          industry: orgForm.industry,
          timezone: orgForm.timezone,
          currency: orgForm.currency,
          tariffPerKwh: Number(orgForm.tariffPerKwh),
          emissionFactorKgPerKwh: Number(orgForm.emissionFactorKgPerKwh),
          contactEmail: orgForm.contactEmail || undefined,
        }),
      });
      await refreshToken();
      notify("Organization configuration updated", "positive");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Update failed", "negative");
    } finally {
      setSavingOrg(false);
    }
  }

  return (
    <PageEntrance className="space-y-6">
      <div className="border-b border-ww-hairline pb-5">
        <h1 className="text-[28px] font-medium tracking-[-0.02em] text-ww-fg">
          Settings
        </h1>
        <p className="mt-1 text-[14px] text-ww-fg-secondary">
          Personal workspace preferences and organization tariff calibration
        </p>
      </div>

      {error && <ErrorPanel message={error} />}

      {loading ? (
        <LoadingPanel rows={6} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Profile Settings */}
          <form onSubmit={handleSaveProfile} className="ww-card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-medium text-ww-fg">
                Profile settings
              </h2>
              <StatusBadge label={user?.role || "Viewer"} tone="neutral" />
            </div>

            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Display name
              </label>
              <input
                required
                value={profileForm.name}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, name: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>

            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Email address
              </label>
              <input
                disabled
                value={user?.email || ""}
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline bg-ww-raised/50 px-3 font-mono text-[13px] text-ww-fg-muted"
              />
            </div>

            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Preferred timezone
              </label>
              <input
                required
                value={profileForm.timezone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, timezone: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 font-mono text-[13px] text-ww-fg outline-none focus:border-ww-accent"
              />
            </div>

            <div>
              <span className="block text-[12px] text-ww-fg-secondary">
                Interface theme
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`h-9 rounded-[8px] border text-[13px] ${
                    theme === "dark"
                      ? "border-ww-accent bg-ww-accent-soft text-ww-fg"
                      : "border-ww-hairline bg-ww-bg text-ww-fg-secondary"
                  }`}
                >
                  Dark graphite
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`h-9 rounded-[8px] border text-[13px] ${
                    theme === "light"
                      ? "border-ww-accent bg-ww-accent-soft text-ww-fg"
                      : "border-ww-hairline bg-ww-bg text-ww-fg-secondary"
                  }`}
                >
                  Light studio
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                size="sm"
                isDisabled={savingProfile}
                className="bg-ww-fg text-ww-bg"
              >
                {savingProfile ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>

          {/* Organization Information */}
          <form onSubmit={handleSaveOrg} className="ww-card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-medium text-ww-fg">
                Organization information
              </h2>
              {!isAdmin && <StatusBadge label="Admin only" tone="neutral" />}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] text-ww-fg-secondary">
                  Organization name
                </label>
                <input
                  disabled={!isAdmin}
                  required
                  value={orgForm.name}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, name: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[12px] text-ww-fg-secondary">
                  Industry
                </label>
                <input
                  disabled={!isAdmin}
                  required
                  value={orgForm.industry}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, industry: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none focus:border-ww-accent disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] text-ww-fg-secondary">
                  Tariff ($/kWh)
                </label>
                <input
                  disabled={!isAdmin}
                  type="number"
                  step="0.001"
                  required
                  value={orgForm.tariffPerKwh}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, tariffPerKwh: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[12px] text-ww-fg-secondary">
                  CO₂e (kg/kWh)
                </label>
                <input
                  disabled={!isAdmin}
                  type="number"
                  step="0.001"
                  required
                  value={orgForm.emissionFactorKgPerKwh}
                  onChange={(e) =>
                    setOrgForm({
                      ...orgForm,
                      emissionFactorKgPerKwh: e.target.value,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 tabular-nums text-[13px] text-ww-fg outline-none focus:border-ww-accent disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-[12px] text-ww-fg-secondary">
                  Currency
                </label>
                <input
                  disabled={!isAdmin}
                  required
                  value={orgForm.currency}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, currency: e.target.value })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 font-mono text-[13px] text-ww-fg outline-none focus:border-ww-accent disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] text-ww-fg-secondary">
                Contact email
              </label>
              <input
                disabled={!isAdmin}
                type="email"
                value={orgForm.contactEmail}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, contactEmail: e.target.value })
                }
                className="mt-1 h-9 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 font-mono text-[13px] text-ww-fg outline-none focus:border-ww-accent disabled:opacity-60"
              />
            </div>

            {isAdmin && (
              <div className="pt-2">
                <Button
                  type="submit"
                  size="sm"
                  isDisabled={savingOrg}
                  className="bg-ww-fg text-ww-bg"
                >
                  {savingOrg ? "Saving…" : "Save organization"}
                </Button>
              </div>
            )}
          </form>
        </div>
      )}
    </PageEntrance>
  );
}
