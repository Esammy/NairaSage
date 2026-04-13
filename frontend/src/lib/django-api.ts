/**
 * Helpers for Django REST (DRF) list pagination and server-side fetches.
 */

export function getDjangoApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  return raw.replace(/\/$/, "");
}

/** DRF PageNumberPagination returns { count, next, previous, results }. */
export function unwrapResults<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (
    body &&
    typeof body === "object" &&
    "results" in body &&
    Array.isArray((body as { results: unknown }).results)
  ) {
    return (body as { results: T[] }).results;
  }
  return [];
}

export async function djangoServerFetch(
  pathWithOptionalQuery: string,
  accessToken: string | undefined,
  init?: RequestInit
): Promise<Response> {
  const base = getDjangoApiBaseUrl();
  const [rawPath, queryString] = pathWithOptionalQuery.split("?");
  const normalized = rawPath.replace(/^\//, "").replace(/\/$/, "");
  let url = `${base}/${normalized}/`;
  if (queryString) {
    url += `?${queryString}`;
  }
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return fetch(url, {
    ...init,
    headers,
    cache: init?.cache ?? "no-store",
  });
}

export async function djangoServerJson<T>(
  path: string,
  accessToken: string | undefined
): Promise<T | null> {
  const res = await djangoServerFetch(path, accessToken);
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}
