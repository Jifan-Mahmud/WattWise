"use client";

import React, { useState } from "react";
import { Eye, EyeSlash } from "@gravity-ui/icons";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}

/**
 * Reusable password input with an accessible Eye / EyeSlash visibility toggle.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "Minimum 8 characters",
  required = true,
  minLength = 8,
  autoComplete,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-1.5">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="h-10 w-full rounded-[8px] border border-ww-hairline-strong bg-ww-bg pl-3 pr-10 text-[14px] text-ww-fg outline-none transition-colors focus:border-ww-accent"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[6px] text-ww-fg-muted transition-colors hover:bg-ww-raised hover:text-ww-fg"
      >
        {visible ? (
          <EyeSlash className="h-4 w-4 text-ww-accent" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
