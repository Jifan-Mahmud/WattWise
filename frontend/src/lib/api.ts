export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface CacheEntry {
  expiresAt: number;
  data: unknown;
}

const getCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15_000;

export function invalidateApiCache(prefix?: string) {
  if (!prefix) {
    getCache.clear();
    return;
  }
  for (const key of getCache.keys()) {
    if (key.includes(prefix)) {
      getCache.delete(key);
    }
  }
}

export async function apiRequest<T>(
  path: string,
  token: string,
  options: RequestInit & { skipCache?: boolean } = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const cacheKey = `${token.slice(-12)}:${url}`;

  if (method === "GET" && !options.skipCache) {
    const cached = getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) message = errBody.error;
    } catch {
      // keep fallback message
    }
    throw new ApiError(message, res.status);
  }

  const data = (await res.json()) as T;

  if (method === "GET") {
    getCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      data,
    });
  } else {
    // Any write mutation invalidates cached GET views for instant consistency
    getCache.clear();
  }

  return data;
}

export async function downloadCsvExport(path: string, token: string, filename = "wattwise-export.csv") {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new ApiError(`Export failed (${res.status})`, res.status);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
