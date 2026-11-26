"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, TriangleExclamation } from "@gravity-ui/icons";
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

const ROLES: UserRole[] = [
  "Organization Admin",
  "Facility Manager",
  "Department Manager",
  "Viewer",
];

function RegisterFormPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshToken, notify } = useWattWise();

  const redirectTarget = sanitizeRedirectPath(searchParams.get("redirect"));
  const paramRole = searchParams.get("role") as UserRole | null;
  const initialRole: UserRole =
    paramRole && ROLES.includes(paramRole) ? paramRole : "Organization Admin";
  const initialMode = searchParams.get("mode") === "create" ? "create" : "join";
  const initialOrg = searchParams.get("org") || "";
  const urlError = formatOAuthError(
    searchParams.get("error"),
    searchParams.get("error_description")
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(initialRole);
  const [orgMode, setOrgMode] = useState<"join" | "create">(initialMode);
  const [organizationName, setOrganizationName] = useState(initialOrg);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
          role,
          organizationName:
            orgMode === "create" ? organizationName.trim() : undefined,
        }),
      });

      if (!profileRes.ok) {
        const errBody = await profileRes.json().catch(() => ({}));
        throw new Error(
          errBody.error || "Unable to initialize organization profile."
        );
      }

      await refreshToken();
      notify("Account created", "positive");
      router.push(redirectTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError(null);

    if (orgMode === "create" && organizationName.trim().length < 2) {
      setError("Please enter an organization name (at least 2 characters).");
      return;
    }

    setGoogleLoading(true);
    try {
      const newUserCallbackURL = buildHref("/api/auth/google-complete", {
        role,
        org: orgMode === "create" ? organizationName.trim() : undefined,
        redirect: redirectTarget !== "/dashboard" ? redirectTarget : undefined,
      });

      const res = await signIn.social({
        provider: "google",
        callbackURL: redirectTarget,
        newUserCallbackURL,
        errorCallbackURL: buildHref("/register", {
          role,
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
        Register an operator profile or provision a new organization.
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
          <label
            htmlFor="reg-role"
            className="block text-[13px] font-medium text-ww-fg-secondary"
          >
            Role
          </label>
          <select
            id="reg-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1.5 h-10 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[14px] text-ww-fg outline-none transition-colors focus:border-ww-accent"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-[13px] font-medium text-ww-fg-secondary">
            Organization workspace
          </span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrgMode("join")}
              className={`h-9 rounded-[8px] border px-3 text-[13px] transition-colors ${
                orgMode === "join"
                  ? "border-ww-accent bg-ww-accent-soft text-ww-fg"
                  : "border-ww-hairline bg-ww-bg text-ww-fg-secondary"
              }`}
            >
              Join Northgrid demo
            </button>
            <button
              type="button"
              onClick={() => setOrgMode("create")}
              className={`h-9 rounded-[8px] border px-3 text-[13px] transition-colors ${
                orgMode === "create"
                  ? "border-ww-accent bg-ww-accent-soft text-ww-fg"
                  : "border-ww-hairline bg-ww-bg text-ww-fg-secondary"
              }`}
            >
              New organization
            </button>
          </div>
          {orgMode === "create" && (
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
