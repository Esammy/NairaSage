import { NextResponse } from "next/server";
import {
  parseRequestCookies,
  fetchNewAccessToken,
  getDjangoApiBase,
  accessTokenCookieOptions,
} from "@/lib/request-cookies";

export async function PATCH(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const cookies = parseRequestCookies(cookieHeader);
    let accessToken: string | undefined = cookies["access_token"];
    const refreshToken = cookies["refresh_token"];

    if (!accessToken && refreshToken) {
      accessToken = (await fetchNewAccessToken(refreshToken)) ?? undefined;
    }

    const body = await request.json();
    const base = getDjangoApiBase();

    async function patchDna(token: string | undefined) {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      return fetch(`${base}/dna/`, { method: "PATCH", headers, body: JSON.stringify(body) });
    }

    let response = await patchDna(accessToken);

    if (response.status === 401 && refreshToken) {
      const newAccess = await fetchNewAccessToken(refreshToken);
      if (newAccess) {
        accessToken = newAccess;
        response = await patchDna(newAccess);
      }
    }

    const data = await response.json().catch(() => ({}));
    const nextRes = NextResponse.json(data, { status: response.status });
    if (accessToken && accessToken !== cookies["access_token"]) {
      nextRes.cookies.set("access_token", accessToken, accessTokenCookieOptions);
    }
    return nextRes;
  } catch (error: unknown) {
    console.error("DNA Proxy Error:", error);
    return NextResponse.json({ error: "Failed to update DNA" }, { status: 500 });
  }
}
