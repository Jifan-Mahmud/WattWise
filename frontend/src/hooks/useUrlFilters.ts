"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildHref, type ParamPrimitive } from "@/lib/url-params";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export type FilterSchema = Record<string, string | number | boolean>;

/**
 * Synchronize page filter/search state with browser URL Search Params so every
 * filtered view survives refreshes and can be shared as a direct URL.
 */
export function useUrlFilters<T extends FilterSchema>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => {
    const resolved = { ...defaults } as Record<string, string | number | boolean>;
    for (const [key, defVal] of Object.entries(defaults)) {
      const raw = searchParams.get(key);
      if (raw === null) continue;

      if (typeof defVal === "boolean") {
        resolved[key] = raw === "true" || raw === "1";
      } else if (typeof defVal === "number") {
        const parsed = Number(raw);
        resolved[key] = Number.isFinite(parsed) && parsed > 0 ? parsed : defVal;
      } else {
        resolved[key] = raw;
      }
    }
    return resolved as T;
  }, [searchParams, defaults]);

  const commitFilters = useCallback(
    (next: T) => {
      const currentRaw: Record<string, ParamPrimitive> = {};
      for (const key of Object.keys(defaults)) {
        currentRaw[key] = next[key];
      }
      const nextUrl = buildHref(pathname, currentRaw, defaults);
      const currentQs = searchParams.toString();
      const currentUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false });
      }
    },
    [defaults, pathname, router, searchParams]
  );

  const setFilters = useCallback(
    (patch: Partial<T>) => {
      commitFilters({ ...filters, ...patch });
    },
    [commitFilters, filters]
  );

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      commitFilters({ ...filters, [key]: value });
    },
    [commitFilters, filters]
  );

  const resetFilters = useCallback(() => {
    commitFilters(defaults);
  }, [commitFilters, defaults]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
  };
}

/**
 * Keeps a text search input responsive while debouncing URL Search Param updates
 * and immediately reflecting external URL changes (Reset, Back/Forward, deep links).
 */
export function useUrlSearchInput(
  urlQuery: string,
  onSync: (nextQuery: string) => void,
  delayMs = 280
) {
  const [draft, setDraft] = useState<{ base: string; text: string } | null>(null);

  const inputValue = draft && draft.base === urlQuery ? draft.text : urlQuery;
  const debouncedValue = useDebouncedValue(inputValue, delayMs);

  const setInputValue = useCallback(
    (nextText: string) => {
      setDraft({ base: urlQuery, text: nextText });
    },
    [urlQuery]
  );

  useEffect(() => {
    if (debouncedValue !== urlQuery) {
      onSync(debouncedValue);
    }
  }, [debouncedValue, urlQuery, onSync]);

  return [inputValue, setInputValue] as const;
}
