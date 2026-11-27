"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Factory,
  Magnifier,
  TriangleExclamation,
} from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { signIn, signUp } from "@/lib/auth-client";
import { useWattWise, type UserRole } from "@/components/providers/AppProviders";
import { PageEntrance, WattWiseMark } from "@/components/ui/MotionPrimitives";
import { AuthVisualShowcase } from "@/components/auth/AuthVisualShowcase";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { PasswordInput } from "@/components/auth/PasswordInput";
import {
  buildHref,
  formatOAuthError,
  sanitizeRedirectPath,
} from "@/lib/url-params";

type JoinRole = "Viewer" | "Facility Manager" | "Department Manager";

interface OrgDirectoryItem {
  id: string;
  name: string;
  slug: string;
  industry: string;
}

const JOINABLE_ROLES: Array<{ value: JoinRole; label: string }> = [
  { value: "Viewer", label: "Viewer (Immediate read-only access)" },
  {
    value: "Facility Manager",
    label: "Facility Manager (Requires Organization Admin approval)",
  },
  {
    value: "Department Manager",
    label: "Department Manager (Requires Organization Admin approval)",
  },
];

function RegisterFormPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshToken, notify } = useWattWise();

  const redirectTarget = sanitizeRedirectPath(searchParams.get("redirect"));
  const paramRole = searchParams.get("role") as UserRole | null;
  const initialRequestedRole: JoinRole =
    paramRole === "Facility Manager" || paramRole === "Department Manager"
      ? paramRole
      : "Viewer";
  const initialMode = searchParams.get("mode") === "create" ? "create" : "join";
  const initialOrg = searchParams.get("org") || "";
  const urlError = formatOAuthError(
    searchParams.get("error"),
    searchParams.get("error_description")
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgMode, setOrgMode] = useState<"join" | "create">(initialMode);
  const [requestedRole, setRequestedRole] =
    useState<JoinRole>(initialRequestedRole);
  const [organizationName, setOrganizationName] = useState(initialOrg);

  const [orgSearch, setOrgSearch] = useState("");
  const [orgResults, setOrgResults] = useState<OrgDirectoryItem[]>([]);
  const [searchingOrgs, setSearchingOrgs] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrgDirectoryItem | null>(null);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError);

  useEffect(() => {
    if (orgMode !== "join") return;
    let active = true;
    const timer = setTimeout(() => {
      setSearchingOrgs(true);
      const url = orgSearch.trim()
        ? `/api/auth/organizations?q=${encodeURIComponent(orgSearch.trim())}`
        : "/api/auth/organizations";
      fetch(url, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to search organizations");
          return res.json() as Promise<{ organizations: OrgDirectoryItem[] }>;
        })
        .then((data) => {
          if (!active) return;
          setOrgResults(data.organizations);
          setSelectedOrg((prev) => prev || data.organizations[0] || null);
        })
        .catch(() => {
          if (!active) return;
          setOrgResults([]);
        })
        .finally(() => {
          if (active) setSearchingOrgs(false);
        });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [orgMode, orgSearch]);

  const roleSummaryNote = useMemo(() => {
    if (orgMode === "create") {
      return "As creator, your account starts directly as Organization Admin and can approve team members.";
    }
    if (requestedRole === "Viewer") {
      return "Joining an existing organization provisions a read-only Viewer account immediately.";
    }
    return `You will start immediately as Viewer while your ${requestedRole} request awaits Organization Admin approval.`;
  }, [orgMode, requestedRole]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (orgMode === "join" && !selectedOrg) {
      setError("Please search and select an organization to join.");
      return;
    }
    if (orgMode === "create" && organizationName.trim().length < 2) {
      setError("Please enter an organization name (at least 2 characters).");
      return;
    }

    setLoading(true);
    try {
      const res = await signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (res.error) {
        setError(res.error.message || "Registration failed.");
        return;
      }

      const profileRes = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mode: orgMode,
          organizationId: orgMode === "join" ? selectedOrg?.id : undefined,
          organizationName:
            orgMode === "create" ? organizationName.trim() : undefined,
          requestedRole: orgMode === "join" ? requestedRole : undefined,
        }),
      });

      if (!profileRes.ok) {
        const errBody = await profileRes.json().catch(() => ({}));
        throw new Error(
          errBody.error || "Unable to initialize organization profile."
        );
      }

      await refreshToken();
      if (orgMode === "create") {
        notify("Organization created — signed in as Organization Admin", "positive");
      } else if (requestedRole !== "Viewer") {
        notify(
          `Joined as Viewer — ${requestedRole} request sent to Organization Admin`,
          "positive"
        );
      } else {
        notify("Account created as Viewer", "positive");
      }
      router.push(redirectTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError(null);

    if (orgMode === "join" && !selectedOrg) {
      setError("Please search and select an organization to join.");
      return;
    }
    if (orgMode === "create" && organizationName.trim().length < 2) {
      setError("Please enter an organization name (at least 2 characters).");
      return;
    }

    setGoogleLoading(true);
    try {
      const googleCompleteUrl = buildHref("/api/auth/google-complete", {
        mode: orgMode,
        orgId: orgMode === "join" ? selectedOrg?.id : undefined,
        org: orgMode === "create" ? organizationName.trim() : undefined,
        requestedRole: orgMode === "join" ? requestedRole : undefined,
        redirect: redirectTarget !== "/dashboard" ? redirectTarget : undefined,
      });

      const res = await signIn.social({
        provider: "google",
        callbackURL: googleCompleteUrl,
        newUserCallbackURL: googleCompleteUrl,
        errorCallbackURL: buildHref("/register", {
          role: orgMode === "join" ? requestedRole : undefined,
          mode: orgMode === "create" ? "create" : undefined,
          redirect: redirectTarget !== "/dashboard" ? redirectTarget : undefined,
        }),
      });

      if (res?.error) {
        setError(res.error.message || "Unable to start Google sign-up.");
        setGoogleLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-up failed.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="ww-panel p-6 sm:p-8 lg:col-span-5">
      <h1 className="text-[26px] font-medium tracking-[-0.02em] text-ww-fg">
        Create WattWise account
      </h1>
      <p className="mt-1.5 text-[14px] text-ww-fg-secondary">
        Join an existing organization as a Viewer or create your own workspace.
      </p>

      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-[8px] border border-ww-negative/30 bg-ww-negative-soft p-3 text-[13px] text-ww-negative">
          <TriangleExclamation className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="reg-name"
            className="block text-[13px] font-medium text-ww-fg-secondary"
          >
            Full name
          </label>
          <input
            id="reg-name"
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Blake"
            className="mt-1.5 h-10 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[14px] text-ww-fg outline-none transition-colors focus:border-ww-accent"
          />
        </div>

        <div>
          <label
            htmlFor="reg-email"
            className="block text-[13px] font-medium text-ww-fg-secondary"
          >
            Work email
          </label>
          <input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jordan@company.com"
            className="mt-1.5 h-10 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[14px] text-ww-fg outline-none transition-colors focus:border-ww-accent"
          />
        </div>

        <div>
          <label
            htmlFor="reg-password"
            className="block text-[13px] font-medium text-ww-fg-secondary"
          >
            Password
          </label>
          <PasswordInput
            id="reg-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div>
          <span className="block text-[13px] font-medium text-ww-fg-secondary">
            Organization workspace
          </span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrgMode("join")}
              className={`h-9 rounded-[8px] border px-3 text-[13px] font-medium transition-colors ${
                orgMode === "join"
                  ? "border-ww-accent bg-ww-accent-soft text-ww-fg"
                  : "border-ww-hairline bg-ww-bg text-ww-fg-secondary hover:border-ww-hairline-strong"
              }`}
            >
              Join organization
            </button>
            <button
              type="button"
              onClick={() => setOrgMode("create")}
              className={`h-9 rounded-[8px] border px-3 text-[13px] font-medium transition-colors ${
                orgMode === "create"
                  ? "border-ww-accent bg-ww-accent-soft text-ww-fg"
                  : "border-ww-hairline bg-ww-bg text-ww-fg-secondary hover:border-ww-hairline-strong"
              }`}
            >
              New organization
            </button>
          </div>

          {orgMode === "join" ? (
            <div className="mt-3 space-y-2 rounded-[8px] border border-ww-hairline bg-ww-bg p-3">
              <div className="relative">
                <Magnifier className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ww-fg-muted" />
                <input
                  type="text"
                  aria-label="Search organizations"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder="Search organization by name or sector..."
                  className="h-9 w-full rounded-[6px] border border-ww-hairline-strong bg-ww-card pl-8 pr-3 text-[13px] text-ww-fg outline-none transition-colors focus:border-ww-accent"
                />
              </div>

              {selectedOrg && (
                <div className="flex items-center justify-between gap-2 rounded-[6px] border border-ww-accent/40 bg-ww-accent-soft px-2.5 py-1.5 text-[12px]">
                  <span className="truncate font-medium text-ww-fg">
                    Selected: {selectedOrg.name}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-ww-fg-muted">
                    {selectedOrg.industry}
                  </span>
                </div>
              )}

              <div className="max-h-36 space-y-1 overflow-y-auto pr-0.5">
                {searchingOrgs && orgResults.length === 0 ? (
                  <p className="py-2 text-center text-[12px] text-ww-fg-muted">
                    Searching organizations…
                  </p>
                ) : orgResults.length === 0 ? (
                  <p className="py-2 text-center text-[12px] text-ww-fg-muted">
                    No organizations match &ldquo;{orgSearch.trim()}&rdquo;
                  </p>
                ) : (
                  orgResults.map((org) => {
                    const active = selectedOrg?.id === org.id;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        onClick={() => setSelectedOrg(org)}
                        className={`flex w-full items-center justify-between gap-2 rounded-[6px] border px-2.5 py-1.5 text-left transition-colors ${
                          active
                            ? "border-ww-accent bg-ww-accent-soft/70 text-ww-fg"
                            : "border-transparent bg-ww-raised/60 text-ww-fg-secondary hover:border-ww-hairline hover:text-ww-fg"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Factory className="h-3.5 w-3.5 shrink-0 text-ww-fg-muted" />
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-ww-fg">
                              {org.name}
                            </p>
                            <p className="truncate text-[11px] text-ww-fg-muted">
                              {org.industry}
                            </p>
                          </div>
                        </div>
                        {active && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-ww-accent" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <input
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Acme Industrial Campus"
              className="mt-2.5 h-10 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[14px] text-ww-fg outline-none transition-colors focus:border-ww-accent"
            />
          )}
        </div>

        <div>
          {orgMode === "join" ? (
            <>
              <label
                htmlFor="reg-role"
                className="block text-[13px] font-medium text-ww-fg-secondary"
              >
                Requested access role
              </label>
              <select
                id="reg-role"
                value={requestedRole}
                onChange={(e) => setRequestedRole(e.target.value as JoinRole)}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[13px] text-ww-fg outline-none transition-colors focus:border-ww-accent"
              >
                {JOINABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="rounded-[8px] border border-ww-accent/35 bg-ww-accent-soft px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-ww-fg-secondary">
                  Assigned workspace role
                </span>
                <span className="rounded bg-ww-card px-2 py-0.5 text-[11px] font-medium text-ww-accent">
                  Organization Admin
                </span>
              </div>
            </div>
          )}
          <p className="mt-1.5 text-[11px] leading-relaxed text-ww-fg-muted">
            {roleSummaryNote}
          </p>
        </div>

        <Button
          type="submit"
          fullWidth
          isDisabled={loading || googleLoading}
          className="mt-2 h-10 rounded-[8px] bg-ww-fg text-[14px] font-medium text-ww-bg"
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-ww-hairline" />
        <span className="text-[12px] text-ww-fg-muted">or sign up with</span>
        <div className="h-px flex-1 bg-ww-hairline" />
      </div>

      <GoogleAuthButton
        label="Continue with Google"
        loading={googleLoading}
        disabled={loading}
        onClick={handleGoogleRegister}
      />

      <p className="mt-6 text-center text-[13px] text-ww-fg-secondary">
        Already have an account?{" "}
        <Link
          href={buildHref("/login", {
            redirect: redirectTarget !== "/dashboard" ? redirectTarget : undefined,
          })}
          className="font-medium text-ww-fg underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-ww-bg text-ww-fg">
      <header className="border-b border-ww-hairline">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 text-ww-fg">
            <WattWiseMark size={20} />
            <span className="text-[16px] font-semibold">WattWise</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-ww-fg-secondary hover:text-ww-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to overview
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 items-center px-4 py-12 sm:px-6">
        <PageEntrance className="grid w-full grid-cols-1 gap-8 lg:grid-cols-12">
          <Suspense
            fallback={
              <div className="ww-panel flex min-h-[460px] items-center justify-center p-8 lg:col-span-5">
                <span className="text-[13px] text-ww-fg-muted">
                  Loading registration form…
                </span>
              </div>
            }
          >
            <RegisterFormPanel />
          </Suspense>

          <AuthVisualShowcase className="lg:col-span-7" />
        </PageEntrance>
      </main>
    </div>
  );
}
