"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, TriangleExclamation } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { signIn } from "@/lib/auth-client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-users";
import { useWattWise } from "@/components/providers/AppProviders";
import { PageEntrance, WattWiseMark } from "@/components/ui/MotionPrimitives";
import { StatusBadge } from "@/components/ui/DataState";

export default function LoginPage() {
  const router = useRouter();
  const { refreshToken, notify } = useWattWise();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCredentialLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn.email({ email: email.trim(), password });
      if (res.error) {
        setError(res.error.message || "Invalid email or password.");
        return;
      }
      await refreshToken();
      notify("Signed in to WattWise", "positive");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(demoEmail: string, roleLabel: string) {
    setError(null);
    setActiveDemo(demoEmail);
    try {
      const boot = await fetch("/api/auth/demo-bootstrap", { method: "POST" });
      if (!boot.ok) {
        throw new Error("Unable to initialize demo account.");
      }
      const res = await signIn.email({
        email: demoEmail,
        password: DEMO_PASSWORD,
      });
      if (res.error) {
        throw new Error(res.error.message || "Demo sign in failed.");
      }
      await refreshToken();
      notify(`Signed in as ${roleLabel}`, "positive");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo login failed.");
    } finally {
      setActiveDemo(null);
    }
  }

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
          {/* Left: Standard Sign-In Form */}
          <div className="ww-panel p-6 sm:p-8 lg:col-span-5">
            <h1 className="text-[26px] font-medium tracking-[-0.02em] text-ww-fg">
              Sign in to WattWise
            </h1>
            <p className="mt-1.5 text-[14px] text-ww-fg-secondary">
              Access your organization energy telemetry and alerts.
            </p>

            {error && (
              <div className="mt-5 flex items-start gap-2.5 rounded-[8px] border border-ww-negative/30 bg-ww-negative-soft p-3 text-[13px] text-ww-negative">
                <TriangleExclamation className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCredentialLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[13px] font-medium text-ww-fg-secondary"
                >
                  Work email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1.5 h-10 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[14px] text-ww-fg outline-none transition-colors focus:border-ww-accent"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-[13px] font-medium text-ww-fg-secondary"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="mt-1.5 h-10 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-3 text-[14px] text-ww-fg outline-none transition-colors focus:border-ww-accent"
                />
              </div>

              <Button
                type="submit"
                fullWidth
                isDisabled={loading || Boolean(activeDemo)}
                className="mt-2 h-10 rounded-[8px] bg-ww-fg text-[14px] font-medium text-ww-bg"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-ww-fg-secondary">
              Need a new organization or operator account?{" "}
              <Link
                href="/register"
                className="font-medium text-ww-fg underline underline-offset-4"
              >
                Register
              </Link>
            </p>
          </div>

          {/* Right: 1-Click Role Evaluation Access */}
          <div className="ww-panel flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
            <div>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[18px] font-medium text-ww-fg">
                  Demo role access
                </h2>
                <span className="font-mono text-[12px] text-ww-fg-muted">
                  Northgrid Commercial Holdings
                </span>
              </div>
              <p className="mt-1 text-[13px] text-ww-fg-secondary">
                Select any role below to sign in with an authentic Better Auth
                session and verify role-based permissions.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((acct) => {
                  const busy = activeDemo === acct.email;
                  return (
                    <button
                      key={acct.email}
                      type="button"
                      disabled={Boolean(activeDemo) || loading}
                      onClick={() => handleDemoLogin(acct.email, acct.role)}
                      className="flex flex-col justify-between rounded-[12px] border border-ww-hairline bg-ww-bg p-4 text-left transition-colors hover:border-ww-hairline-strong hover:bg-ww-raised/50 disabled:opacity-60"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <StatusBadge
                            label={acct.role}
                            tone={
                              acct.role === "Organization Admin"
                                ? "accent"
                                : "neutral"
                            }
                          />
                          <ArrowRight className="h-3.5 w-3.5 text-ww-fg-muted" />
                        </div>
                        <p className="mt-3 text-[14px] font-medium text-ww-fg">
                          {acct.name}
                        </p>
                        <p className="font-mono text-[12px] text-ww-fg-muted">
                          {acct.email}
                        </p>
                        <p className="mt-2 text-[12px] leading-relaxed text-ww-fg-secondary">
                          {acct.description}
                        </p>
                      </div>
                      <p className="mt-3 text-[12px] font-medium text-ww-accent">
                        {busy ? "Authenticating…" : "Continue as role"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 rounded-[8px] border border-ww-hairline bg-ww-bg px-4 py-3 font-mono text-[12px] text-ww-fg-muted">
              Dataset ready: 3 organizations · 12 buildings · 36 floors · 60
              departments · 84 meters · 60,480 records
            </div>
          </div>
        </PageEntrance>
      </main>
    </div>
  );
}
