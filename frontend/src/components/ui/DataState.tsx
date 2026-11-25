"use client";

import React from "react";
import { TriangleExclamation, ArrowRotateRight } from "@gravity-ui/icons";
import { Button } from "@heroui/react";

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaTone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
}) {
  const deltaColor =
    deltaTone === "positive"
      ? "text-ww-positive"
      : deltaTone === "negative"
      ? "text-ww-negative"
      : "text-ww-fg-muted";

  return (
    <div className="ww-card flex flex-col justify-between p-5">
      <p className="text-[13px] font-normal text-ww-fg-secondary">{label}</p>
      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span className="tabular-nums text-[28px] font-medium leading-none tracking-[-0.02em] text-ww-fg">
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[12px] text-ww-fg-muted">{unit}</span>
        )}
      </div>
      {delta && (
        <p className={`mt-2.5 tabular-nums text-[12px] font-normal ${deltaColor}`}>
          {delta}
        </p>
      )}
    </div>
  );
}

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "positive" | "negative" | "warning" | "accent" | "neutral";
}) {
  const toneStyles: Record<string, string> = {
    positive: "bg-ww-positive-soft text-ww-positive border-transparent",
    negative: "bg-ww-negative-soft text-ww-negative border-transparent",
    warning: "bg-ww-warning-soft text-ww-warning border-transparent",
    accent: "bg-ww-accent-soft text-ww-accent border-transparent",
    neutral: "bg-ww-raised text-ww-fg-secondary border-ww-hairline",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-0.5 text-[12px] font-medium leading-4 ${toneStyles[tone]}`}
    >
      {label}
    </span>
  );
}

export function LoadingPanel({ rows = 4 }: { rows?: number }) {
  return (
    <div className="ww-card space-y-3 p-6">
      <div className="h-4 w-40 rounded bg-ww-raised" />
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-full rounded-lg bg-ww-raised"
            style={{ opacity: Math.max(0.35, 1 - i * 0.14) }}
          />
        ))}
      </div>
    </div>
  );
}

export function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="ww-card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ww-negative-soft text-ww-negative">
          <TriangleExclamation className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[14px] font-medium text-ww-fg">
            Unable to load telemetry
          </p>
          <p className="mt-0.5 text-[13px] text-ww-fg-secondary">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onPress={onRetry}>
          <ArrowRotateRight className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyPanel({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ww-card flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-[15px] font-medium text-ww-fg">{title}</p>
      <p className="mt-1 max-w-md text-[13px] text-ww-fg-secondary">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
