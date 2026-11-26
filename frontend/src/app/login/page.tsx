"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, TriangleExclamation } from "@gravity-ui/icons";
import { Button } from "@heroui/react";
import { signIn } from "@/lib/auth-client";
import { useWattWise } from "@/components/providers/AppProviders";
import { PageEntrance, WattWiseMark } from "@/components/ui/MotionPrimitives";
import { AuthVisualShowcase } from "@/components/auth/AuthVisualShowcase";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { buildHref, sanitizeRedirectPath } from "@/lib/url-params";

function formatOAuthError(code: string | null): string | null {
  if (!code) return null;
  if (code === "access_denied") return "Google sign-in was cancelled.";
  if (code === "oauth_session" || code === "oauth_setup") {
    return "Could not complete Google account setup. Please try again.";
  }
  return "Google authentication failed. Please check your Google OAuth settings or try email sign-in.";
}

function LoginFormPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshToken, notify } = useWattWise();

  const redirectTarget = sanitizeRedirectPath(searchParams.get("redirect"));
  const initialEmail = searchParams.get("email") || "";
  const urlError = formatOAuthError(searchParams.get("error"));

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(urlError);

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
      router.push(redirectTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    try {
      const res = await signIn.social({
        provider: "google",
        callbackURL: redirectTarget,
        errorCallbackURL: buildHref("/login", {
          error: "oauth_failed",
          redirect: redirectTarget !== "/dashboard" ? redirectTarget : undefined,
        }),
      });
      if (res?.error) {
        setError(res.error.message || "Unable to start Google sign-in.");
        setGoogleLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="ww-panel flex flex-col justify-center p-6 sm:p-8 lg:col-span-5">
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

      <div className="mt-6">
        <GoogleAuthButton
          label="Continue with Google"
          loading={googleLoading}
          disabled={loading}
          onClick={handleGoogleLogin}
        />

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-ww-hairline" />
          <span className="text-[12px] text-ww-fg-muted">or with email</span>
          <div className="h-px flex-1 bg-ww-hairline" />
        </div>
      </div>

      <form onSubmit={handleCredentialLogin} className="space-y-4">
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
          isDisabled={loading || googleLoading}
          className="mt-2 h-10 rounded-[8px] bg-ww-fg text-[14px] font-medium text-ww-bg"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ww-fg-secondary">
        Need a new organization or operator account?{" "}
        <Link
          href={buildHref("/register", {
            redirect: redirectTarget !== "/dashboard" ? redirectTarget : undefined,
          })}
          className="font-medium text-ww-fg underline underline-offset-4"
        >
          Register
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
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
              <div className="ww-panel flex min-h-[380px] items-center justify-center p-8 lg:col-span-5">
                <span className="text-[13px] text-ww-fg-muted">
                  Loading sign-in form…
                </span>
              </div>
            }
          >
            <LoginFormPanel />
          </Suspense>

          <AuthVisualShowcase className="lg:col-span-7" />
        </PageEntrance>
      </main>
    </div>
  );
}
