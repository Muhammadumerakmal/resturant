// Base URL of the backend API service. Public so client components can read it.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

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
  } = {},
): Promise<T> {
  const { method = "GET", body, staffKey, signal, cache } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (staffKey) headers["x-staff-key"] = staffKey;

  const res = await fetch(api(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    cache: cache ?? "no-store",
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
