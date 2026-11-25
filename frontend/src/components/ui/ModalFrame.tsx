"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Xmark } from "@gravity-ui/icons";
import { UNSLOP_EASE } from "@/components/ui/MotionPrimitives";

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: UNSLOP_EASE }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.985 }}
            transition={{ duration: 0.22, ease: UNSLOP_EASE }}
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
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ww-fg-muted transition-colors hover:bg-ww-raised hover:text-ww-fg"
              >
                <Xmark className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
