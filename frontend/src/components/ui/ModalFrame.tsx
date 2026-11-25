"use client";

import React, { useEffect } from "react";
import { Xmark } from "@gravity-ui/icons";

export function ModalFrame({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      onClick={onClose}
    >
      <div
        className="ww-panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ww-hairline pb-4">
          <div>
            <h2 className="text-[18px] font-medium text-ww-fg">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-[13px] text-ww-fg-secondary">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ww-fg-muted hover:bg-ww-raised hover:text-ww-fg"
          >
            <Xmark className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
