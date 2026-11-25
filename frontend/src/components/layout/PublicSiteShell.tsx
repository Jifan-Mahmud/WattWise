"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Sun, Moon } from "@gravity-ui/icons";
import { useWattWise } from "@/components/providers/AppProviders";
import { WattWiseMark, UNSLOP_EASE } from "@/components/ui/MotionPrimitives";

const PUBLIC_NAV = [
  { label: "Platform", href: "/platform" },
  { label: "Capabilities", href: "/capabilities" },
  { label: "Architecture", href: "/architecture" },
  { label: "Roles", href: "/roles" },
];

export function PublicSiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, theme, toggleTheme } = useWattWise();

  return (
    <div className="flex min-h-screen flex-col bg-ww-bg text-ww-fg">
      <header className="sticky top-0 z-40 border-b border-ww-hairline bg-ww-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 text-ww-fg">
              <WattWiseMark size={20} />
              <span className="text-[16px] font-semibold tracking-[-0.01em]">
                WattWise
              </span>
            </Link>

            <nav className="hidden items-center gap-1 text-[14px] md:flex">
              {PUBLIC_NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative rounded-[8px] px-3 py-1.5 transition-colors ${
                      active
                        ? "font-medium text-ww-fg"
                        : "text-ww-fg-secondary hover:text-ww-fg"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="public-nav-pill"
                        transition={{ duration: 0.24, ease: UNSLOP_EASE }}
                        className="absolute inset-0 rounded-[8px] border border-ww-hairline bg-ww-raised"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-ww-hairline-strong bg-ww-card text-ww-fg transition-colors hover:bg-ww-raised"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </motion.button>
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-ww-fg px-4 text-[14px] font-medium text-ww-bg transition-transform active:scale-[0.98]"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-[14px] text-ww-fg-secondary transition-colors hover:text-ww-fg"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-ww-fg px-4 text-[14px] font-medium text-ww-bg transition-transform active:scale-[0.98]"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto border-t border-ww-hairline px-4 py-1.5 text-[13px] md:hidden">
          {PUBLIC_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-[6px] px-2.5 py-1 transition-colors ${
                  active
                    ? "bg-ww-raised font-medium text-ww-fg"
                    : "text-ww-fg-secondary hover:text-ww-fg"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-ww-hairline py-8">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 px-4 text-[13px] text-ww-fg-muted sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5 text-ww-fg">
            <WattWiseMark size={18} />
            <span className="font-medium">WattWise</span>
            <span className="text-ww-fg-muted">
              · Smart Energy Consumption Intelligence
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Link href="/platform" className="hover:text-ww-fg">
              Platform
            </Link>
            <Link href="/capabilities" className="hover:text-ww-fg">
              Capabilities
            </Link>
            <Link href="/architecture" className="hover:text-ww-fg">
              Architecture
            </Link>
            <Link href="/roles" className="hover:text-ww-fg">
              Roles
            </Link>
            <Link href="/login" className="hover:text-ww-fg">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
