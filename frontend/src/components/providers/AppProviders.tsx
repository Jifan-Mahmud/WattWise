"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { authClient, useSession } from "@/lib/auth-client";
import { apiRequest, invalidateApiCache } from "@/lib/api";

export type UserRole =
  | "Organization Admin"
  | "Facility Manager"
  | "Department Manager"
  | "Viewer";

export interface WattWiseUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  requestedRole?: UserRole | null;
  requestStatus?: "Pending" | "Approved" | "Dismissed" | null;
  organizationId: string;
  departmentIds: string[];
  themePreference: "dark" | "light";
  timezone: string;
}

export interface WattWiseOrg {
  id: string;
  name: string;
  slug: string;
  industry: string;
  currency: string;
  tariffPerKwh: number;
  emissionFactorKgPerKwh: number;
  timezone: string;
}

interface ToastItem {
  id: string;
  title: string;
  tone: "neutral" | "positive" | "negative";
}

interface AppContextValue {
  theme: "dark" | "light";
  setTheme: (next: "dark" | "light") => void;
  toggleTheme: () => void;
  user: WattWiseUser | null;
  organization: WattWiseOrg | null;
  token: string | null;
  loadingAuth: boolean;
  authError: string | null;
  refreshToken: () => Promise<string | null>;
  apiFetch: <T>(path: string, options?: RequestInit & { skipCache?: boolean }) => Promise<T>;
  signOutUser: () => Promise<void>;
  notify: (title: string, tone?: "neutral" | "positive" | "negative") => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const THEME_EVENT = "wattwise-theme-change";

function subscribeTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

function getThemeSnapshot(): "dark" | "light" {
  const saved = window.localStorage.getItem("wattwise-theme");
  return saved === "light" ? "light" : "dark";
}

function getServerThemeSnapshot(): "dark" | "light" {
  return "dark";
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: sessionPending } = useSession();

  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot
  );

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<WattWiseUser | null>(null);
  const [organization, setOrganization] = useState<WattWiseOrg | null>(null);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const applyThemeDom = useCallback((mode: "dark" | "light") => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(mode);
    root.setAttribute("data-theme", mode);
  }, []);

  useEffect(() => {
    applyThemeDom(theme);
  }, [theme, applyThemeDom]);

  const setTheme = useCallback(
    (next: "dark" | "light") => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("wattwise-theme", next);
        window.dispatchEvent(new Event(THEME_EVENT));
      }
      applyThemeDom(next);
      if (token) {
        apiRequest("/api/profile", token, {
          method: "PATCH",
          body: JSON.stringify({ themePreference: next }),
        }).catch(() => {});
      }
    },
    [applyThemeDom, token]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const notify = useCallback(
    (title: string, tone: "neutral" | "positive" | "negative" = "neutral") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      setAuthError(null);
      const res = await fetch("/api/auth/token", { cache: "no-store" });
      if (res.status === 401) {
        setToken(null);
        setUser(null);
        setOrganization(null);
        return null;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Unable to verify session");
      }
      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      setOrganization(data.organization);
      setResolvedEmail(data.user?.email || null);
      if (
        data.user?.themePreference &&
        typeof window !== "undefined" &&
        !window.localStorage.getItem("wattwise-theme")
      ) {
        window.localStorage.setItem("wattwise-theme", data.user.themePreference);
        window.dispatchEvent(new Event(THEME_EVENT));
      }
      return data.token;
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Authentication error");
      return null;
    }
  }, []);

  const sessionEmail = session?.user?.email || null;

  useEffect(() => {
    if (sessionPending || !sessionEmail) return;
    let active = true;
    fetch("/api/auth/token", { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setToken(null);
          setUser(null);
          setOrganization(null);
          setResolvedEmail(sessionEmail);
          return;
        }
        const data = await res.json();
        if (!active) return;
        setToken(data.token);
        setUser(data.user);
        setOrganization(data.organization);
        setResolvedEmail(sessionEmail);
      })
      .catch((err) => {
        if (!active) return;
        setAuthError(err instanceof Error ? err.message : "Authentication error");
        setResolvedEmail(sessionEmail);
      });
    return () => {
      active = false;
    };
  }, [sessionPending, sessionEmail]);

  const activeToken = sessionEmail ? token : null;
  const activeUser = sessionEmail ? user : null;
  const activeOrg = sessionEmail ? organization : null;
  const loadingAuth =
    sessionPending || (Boolean(sessionEmail) && resolvedEmail !== sessionEmail);

  const apiFetch = useCallback(
    async <T,>(
      path: string,
      options: RequestInit & { skipCache?: boolean } = {}
    ): Promise<T> => {
      let bearer = activeToken;
      if (!bearer) {
        bearer = await refreshToken();
      }
      if (!bearer) {
        throw new Error("Please sign in to access WattWise data.");
      }
      return apiRequest<T>(path, bearer, options);
    },
    [activeToken, refreshToken]
  );

  const signOutUser = useCallback(async () => {
    invalidateApiCache();
    await authClient.signOut();
    setToken(null);
    setUser(null);
    setOrganization(null);
    setResolvedEmail(null);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      user: activeUser,
      organization: activeOrg,
      token: activeToken,
      loadingAuth,
      authError,
      refreshToken,
      apiFetch,
      signOutUser,
      notify,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      activeUser,
      activeOrg,
      activeToken,
      loadingAuth,
      authError,
      refreshToken,
      apiFetch,
      signOutUser,
      notify,
    ]
  );

  return (
    <MotionConfig reducedMotion="user">
      <AppContext.Provider value={value}>
        {children}
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-5 right-5 z-[100001] flex flex-col gap-2"
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-ww-hairline-strong bg-ww-card px-3.5 py-2.5 text-[13px] text-ww-fg shadow-lg"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      t.tone === "positive"
                        ? "var(--ww-positive)"
                        : t.tone === "negative"
                        ? "var(--ww-negative)"
                        : "var(--ww-accent)",
                  }}
                />
                <span>{t.title}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </AppContext.Provider>
    </MotionConfig>
  );
}

export function useWattWise() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useWattWise must be used inside AppProviders");
  }
  return ctx;
}
