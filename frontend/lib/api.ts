// Base URL of the backend API service. Public so client components can read it.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export const api = (path: string) => `${API_BASE}${path}`;
