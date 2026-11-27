"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutCellsLarge,
  ChartLine,
  Database,
  Bell,
  Bulb,
  FileText,
  Factory,
  Layers,
  BranchesRight,
  PlugConnection,
  Persons,
  Gear,
  Magnifier,
  Sun,
  Moon,
  Bars,
  Xmark,
  ArrowRightFromSquare,
  ChevronRight,
} from "@gravity-ui/icons";
import { useWattWise, type UserRole } from "@/components/providers/AppProviders";
import { WattWiseMark, UNSLOP_EASE } from "@/components/ui/MotionPrimitives";
import { StatusBadge } from "@/components/ui/DataState";
import { ShareLinkButton } from "@/components/ui/ShareLinkButton";
import { buildHref } from "@/lib/url-params";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Monitoring",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutCellsLarge },
      { label: "Analytics", href: "/analytics", icon: ChartLine },
      { label: "Energy records", href: "/records", icon: Database },
      { label: "Alerts & rules", href: "/alerts", icon: Bell },
      { label: "Energy insights", href: "/insights", icon: Bulb },
      { label: "Reports", href: "/reports", icon: FileText },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { label: "Buildings", href: "/buildings", icon: Factory },
      { label: "Floors", href: "/floors", icon: Layers },
      { label: "Departments", href: "/departments", icon: BranchesRight },
      { label: "Meters", href: "/meters", icon: PlugConnection },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        label: "Users & roles",
        href: "/users",
        icon: Persons,
        roles: ["Organization Admin"],
      },
      { label: "Settings", href: "/settings", icon: Gear },
    ],
  },
];

function AuthRedirectGuard() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loadingAuth } = useWattWise();

  useEffect(() => {
    if (!loadingAuth && !user) {
      const qs = searchParams.toString();
      const target = qs ? `${pathname}?${qs}` : pathname;
      router.replace(buildHref("/login", { redirect: target }));
    }
  }, [loadingAuth, user, pathname, searchParams, router]);

  return null;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, organization, theme, toggleTheme, loadingAuth, signOutUser } =
    useWattWise();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const visibleGroups = useMemo(() => {
    const role = user?.role;
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => !item.roles || (role && item.roles.includes(role))),
    })).filter((g) => g.items.length > 0);
  }, [user?.role]);

  const flatItems = useMemo(
    () =>
      visibleGroups.flatMap((g) => g.items).filter((item) =>
        item.label.toLowerCase().includes(cmdQuery.trim().toLowerCase())
      ),
    [visibleGroups, cmdQuery]
  );

  const activeTitle = useMemo(() => {
    for (const group of NAV_GROUPS) {
      const match = group.items.find((i) => pathname === i.href);
      if (match) return match.label;
    }
    return "Workspace";
  }, [pathname]);

  const showAuthOverlay = loadingAuth || !user;

  const renderSidebar = (idSuffix: string) => (
    <div className="flex h-full flex-col bg-ww-sidebar px-4 py-4">
      <div className="flex h-9 items-center justify-between px-1">
        <Link href="/dashboard" className="flex items-center gap-2.5 text-ww-fg">
          <WattWiseMark size={20} />
          <span className="text-[16px] font-semibold tracking-[-0.01em]">
            WattWise
          </span>
        </Link>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ww-fg-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-ww-positive" />
          Grid
        </span>
      </div>

      <div className="mt-3 rounded-[8px] border border-ww-hairline bg-ww-card px-3 py-2">
        <p className="truncate text-[13px] font-medium text-ww-fg">
          {organization?.name || "Organization"}
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-ww-fg-muted">
          {organization?.industry || "ClimateTech"}
        </p>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onClick={() => setCmdOpen(true)}
        className="mt-3 flex h-9 w-full items-center gap-2 rounded-[8px] border border-ww-hairline bg-ww-card px-2.5 text-[13px] text-ww-fg-muted transition-colors hover:border-ww-hairline-strong hover:text-ww-fg-secondary"
      >
        <Magnifier className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search</span>
        <kbd className="rounded-[4px] border border-ww-hairline bg-ww-raised px-1.5 py-0.5 font-mono text-[10px] text-ww-fg-muted">
          ⌘K
        </kbd>
      </motion.button>

      <nav className="mt-2 flex-1 overflow-y-auto pr-0.5">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mt-6 first:mt-4">
            <p className="mb-2 px-2.5 text-[12px] font-normal text-ww-fg-muted">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`group relative flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] transition-colors ${
                      active
                        ? "font-medium text-ww-fg"
                        : "font-normal text-ww-fg-secondary hover:bg-ww-raised/50 hover:text-ww-fg"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId={`sidebar-active-pill-${idSuffix}`}
                        transition={{ duration: 0.22, ease: UNSLOP_EASE }}
                        className="ww-active-row absolute inset-0 rounded-[8px]"
                      />
                    )}
                    <span className="relative z-10 flex w-4 shrink-0 items-center justify-center">
                      <Icon
                        className={`h-4 w-4 transition-colors ${
                          active
                            ? "text-ww-accent"
                            : "text-ww-fg-muted group-hover:text-ww-fg-secondary"
                        }`}
                      />
                    </span>
                    <span className="relative z-10 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-ww-hairline pt-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ww-fg">
              {user?.name || "Operator"}
            </p>
            <p className="truncate text-[12px] text-ww-fg-muted">
              {user?.role || "Workspace"}
            </p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={async () => {
              await signOutUser();
              router.push("/login");
            }}
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-ww-fg-muted transition-colors hover:bg-ww-raised hover:text-ww-fg"
          >
            <ArrowRightFromSquare className="h-4 w-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-ww-bg text-ww-fg">
      <Suspense fallback={null}>
        <AuthRedirectGuard />
      </Suspense>

      {showAuthOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ww-bg text-ww-fg-secondary">
          <div className="flex items-center gap-3 text-[14px]">
            <WattWiseMark size={20} />
            <span>Loading telemetry workspace…</span>
          </div>
        </div>
      )}

      <aside className="hidden w-[260px] shrink-0 border-r border-ww-hairline lg:block">
        <div className="sticky top-0 h-screen">{renderSidebar("desktop")}</div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: UNSLOP_EASE }}
            className="fixed inset-0 z-50 flex lg:hidden"
          >
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.24, ease: UNSLOP_EASE }}
              className="relative z-10 h-full w-[260px] border-r border-ww-hairline"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg text-ww-fg-muted hover:bg-ww-raised"
                aria-label="Close navigation"
              >
                <Xmark className="h-4 w-4" />
              </button>
              {renderSidebar("mobile")}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ww-hairline bg-ww-bg/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-ww-hairline text-ww-fg-secondary hover:bg-ww-raised lg:hidden"
              aria-label="Open menu"
            >
              <Bars className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-[14px]">
              <span className="text-ww-fg-muted">WattWise</span>
              <ChevronRight className="h-3.5 w-3.5 text-ww-fg-muted" />
              <span className="font-medium text-ww-fg">{activeTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {user?.role === "Viewer" && (
              <StatusBadge label="Read-only" tone="neutral" />
            )}
            {user?.requestStatus === "Pending" && user?.requestedRole && (
              <StatusBadge label={`Pending: ${user.requestedRole}`} tone="warning" />
            )}
            <ShareLinkButton />
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-ww-hairline-strong bg-ww-card text-ww-fg transition-colors hover:bg-ww-raised"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </motion.button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <AnimatePresence>
        {cmdOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: UNSLOP_EASE }}
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[14vh]"
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.985 }}
              transition={{ duration: 0.2, ease: UNSLOP_EASE }}
              className="ww-panel w-full max-w-md overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 border-b border-ww-hairline px-4 py-3">
                <Magnifier className="h-4 w-4 text-ww-fg-muted" />
                <input
                  autoFocus
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Jump to view…"
                  className="w-full bg-transparent text-[14px] text-ww-fg outline-none placeholder:text-ww-fg-muted"
                />
                <kbd className="rounded-[4px] border border-ww-hairline bg-ww-raised px-1.5 py-0.5 font-mono text-[10px] text-ww-fg-muted">
                  ESC
                </kbd>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {flatItems.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[13px] text-ww-fg-muted">
                    No matching views
                  </p>
                ) : (
                  flatItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          router.push(item.href);
                          setCmdOpen(false);
                          setCmdQuery("");
                        }}
                        className="flex h-9 w-full items-center gap-2.5 rounded-[8px] px-3 text-left text-[14px] text-ww-fg-secondary transition-colors hover:bg-ww-raised hover:text-ww-fg"
                      >
                        <Icon className="h-4 w-4 text-ww-fg-muted" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
