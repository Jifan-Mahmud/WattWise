/**
 * Shared URLSearchParams and routing helpers for consistent API queries,
 * browser URL filter synchronization, and shareable deep links.
 */

export type ParamPrimitive = string | number | boolean | null | undefined;
export type ParamRecord = Record<string, ParamPrimitive>;

/**
 * Build a URLSearchParams instance while omitting empty, "all", and default values
 * so shareable URLs remain concise and deterministic.
 */
export function buildSearchParams(
  params: ParamRecord,
  defaults?: ParamRecord
): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (!value || value === "all" || value === "false") continue;
    if (defaults && defaults[key] !== undefined && String(defaults[key]) === value) {
      continue;
    }
    search.set(key, value);
  }
  return search;
}

/**
 * Construct an API path with URLSearchParams query string.
 */
export function buildApiUrl(pathname: string, params?: ParamRecord): string {
  if (!params) return pathname;
  const search = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (!value || value === "all") continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Construct a shareable frontend route href from a pathname and filter record.
 */
export function buildHref(
  pathname: string,
  params?: ParamRecord,
  defaults?: ParamRecord
): string {
  if (!params) return pathname;
  const qs = buildSearchParams(params, defaults).toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Shared date + dimension filter serializer used by overview, reports, and CSV exports.
 */
export function buildDateFilterRecord(opts: {
  preset: string;
  startDate?: string;
  endDate?: string;
  buildingId?: string;
  departmentId?: string;
}): ParamRecord {
  const record: ParamRecord = {};
  if (opts.startDate && opts.endDate) {
    record.startDate = opts.startDate;
    record.endDate = opts.endDate;
  } else {
    record.preset = opts.preset;
  }
  if (opts.buildingId && opts.buildingId !== "all") {
    record.buildingId = opts.buildingId;
  }
  if (opts.departmentId && opts.departmentId !== "all") {
    record.departmentId = opts.departmentId;
  }
  return record;
}

/**
 * Allow only safe same-origin relative redirect targets after authentication.
 */
export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  return trimmed;
}
