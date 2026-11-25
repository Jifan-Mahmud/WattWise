"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, TriangleExclamation } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { signIn } from "@/lib/auth-client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo-accounts";
import { useWattWise } from "@/components/providers/AppProviders";
import { PageEntrance, WattWiseMark } from "@/components/ui/MotionPrimitives";
import { AuthVisualShowcase } from "@/components/auth/AuthVisualShowcase";

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

            {/* Quick Demo Credentials Autofill */}
            <div className="mt-6 border-t border-ww-hairline pt-4">
              <p className="text-[12px] font-medium text-ww-fg-secondary">
                Quick evaluation accounts:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acct) => {
                  const busy = activeDemo === acct.email;
                  return (
                    <button
                      key={acct.email}
                      type="button"
                      disabled={Boolean(activeDemo) || loading}
                      onClick={() => handleDemoLogin(acct.email, acct.role)}
                      className="flex items-center justify-between rounded-[8px] border border-ww-hairline bg-ww-bg px-2.5 py-1.5 text-left text-[12px] text-ww-fg transition-colors hover:border-ww-hairline-strong hover:bg-ww-raised disabled:opacity-60"
                    >
                      <span className="truncate font-medium">{acct.role}</span>
                      <span className="ml-1 font-mono text-[11px] text-ww-accent">
                        {busy ? "…" : "Sign in"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-5 text-center text-[13px] text-ww-fg-secondary">
              Need a new organization or operator account?{" "}
              <Link
                href="/register"
                className="font-medium text-ww-fg underline underline-offset-4"
              >
                Register
              </Link>
            </p>
          </div>

          {/* Right: Interactive Energy Telemetry Motion Showcase */}
          <AuthVisualShowcase className="lg:col-span-7" />
        </PageEntrance>
      </main>
    </div>
  );
}
