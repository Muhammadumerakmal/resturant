// Base URL of the backend API service. Public so client components can read it.
// NEXT_PUBLIC_* is inlined at build time, so a deploy that forgets to set this
// ships with the localhost default baked in — which can never work in the
// browser on a deployed site. Trim any trailing slash to avoid `//` in paths.
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

export const api = (path: string) => `${API_BASE}${path}`;

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// True when the deployed frontend is about to call `localhost` because
// NEXT_PUBLIC_API_BASE_URL wasn't set at build time. Detected in the browser by
// comparing the (inlined) base against the page's own host.
function isMisconfiguredBaseUrl(): boolean {
  if (typeof window === "undefined") return false; // SSR: nothing to compare to
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return false; // explicitly configured
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

// Thin fetch wrapper: injects the staff key, sends/parses JSON, and throws an
// ApiError carrying the backend's `error` message on non-2xx. Replaces the
// hand-rolled fetch calls scattered across pages.
export async function apiFetch<T = unknown>(
  path: string,
  opts: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    staffKey?: string;
    signal?: AbortSignal;
    cache?: RequestCache;
    credentials?: RequestCredentials;
  } = {},
): Promise<T> {
  const { method = "GET", body, staffKey, signal, cache, credentials } = opts;

  // Turn a missing deploy config into a clear message instead of a bare
  // "Failed to fetch" (browser network error) that points nowhere.
  if (isMisconfiguredBaseUrl()) {
    throw new ApiError(
      "Backend URL is not configured. Set NEXT_PUBLIC_API_BASE_URL in the frontend deployment (to your backend's URL) and redeploy.",
      0,
    );
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (staffKey) headers["x-staff-key"] = staffKey;

  const res = await fetch(api(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache: cache ?? "no-store",
    // Always send the auth cookie (httpOnly JWT) unless a caller opts out.
    credentials: credentials ?? "include",
  });

  // 204 / empty body
  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(
      message,
      res.status,
      data && typeof data === "object" && "details" in data
        ? (data as { details: unknown }).details
        : undefined,
    );
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
