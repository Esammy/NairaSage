/**
 * Parse Cookie header. Values may contain "=" (e.g. JWT padding), so do not use split("=").
 */
export function parseRequestCookies(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const segment of cookieHeader.split(";")) {
    const part = segment.trim();
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    let value = part.slice(eq + 1);
    try {
      value = decodeURIComponent(value);
    } catch {
      /* keep raw */
    }
    out[name] = value;
  }
  return out;
}

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24,
};

export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export function getDjangoApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
}

export async function fetchNewAccessToken(refreshToken: string): Promise<string | null> {
  const base = getDjangoApiBase();
  const res = await fetch(`${base}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access?: string };
  return data.access ?? null;
}
