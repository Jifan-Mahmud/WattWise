"use client";

import React from "react";
import { motion } from "motion/react";

interface GoogleAuthButtonProps {
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function GoogleAuthButton({
  label = "Continue with Google",
  loading = false,
  disabled = false,
  onClick,
}: GoogleAuthButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.985 }}
      disabled={disabled || loading}
      onClick={onClick}
      className="flex h-10 w-full items-center justify-center gap-2.5 rounded-[8px] border border-ww-hairline-strong bg-ww-bg px-4 text-[14px] font-medium text-ww-fg transition-colors hover:bg-ww-raised disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.24 0-5.99-2.19-6.97-5.13H1.04v3.14C3.05 21.15 7.21 24 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.03 14.02A7.18 7.18 0 0 1 4.65 12c0-.7.13-1.38.38-2.02V6.84H1.04A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.04 5.16l3.99-3.14Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.8 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.05 2.85 1.04 6.84l3.99 3.14c.98-2.94 3.73-5.23 6.97-5.23Z"
        />
      </svg>
      <span>{loading ? "Connecting to Google…" : label}</span>
    </motion.button>
  );
}
