"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Check, Link as LinkIcon } from "@gravity-ui/icons";
import { useWattWise } from "@/components/providers/AppProviders";

interface ShareLinkButtonProps {
  className?: string;
  compact?: boolean;
}

/**
 * Copies the current full URL (including active search params) to clipboard
 * so any filtered view can be shared directly with teammates.
 */
export function ShareLinkButton({
  className = "",
  compact = false,
}: ShareLinkButtonProps) {
  const { notify } = useWattWise();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      notify("Shareable link copied", "positive");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify("Copy link from your browser address bar", "neutral");
    }
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={handleCopy}
      title="Copy shareable link with current filters"
      aria-label="Copy shareable link"
      className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-ww-hairline-strong bg-ww-card px-2.5 text-[12px] font-medium text-ww-fg-secondary transition-colors hover:bg-ww-raised hover:text-ww-fg ${className}`}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-ww-positive" />
      ) : (
        <LinkIcon className="h-3.5 w-3.5 text-ww-accent" />
      )}
      {!compact && (
        <span className="hidden sm:inline">
          {copied ? "Copied" : "Share link"}
        </span>
      )}
    </motion.button>
  );
}
