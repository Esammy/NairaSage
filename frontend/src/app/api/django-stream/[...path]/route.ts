import { NextResponse } from "next/server";
import {
  parseRequestCookies,
  fetchNewAccessToken,
  getDjangoApiBase,
  accessTokenCookieOptions,
} from "@/lib/request-cookies";

/** Django SSE endpoints allowed through this streaming proxy (the generic
 * /api/django proxy buffers the whole body, which breaks streaming). */
const STREAMABLE = [/^wealth\/deals\/\d+\/deep-analysis$/];

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join("/").replace(/\/$/, "");
    if (!STREAMABLE.some((re) => re.test(path))) {
      return NextResponse.json({ error: "Not a streamable endpoint" }, { status: 404 });
    }

    const cookieHeader = request.headers.get("cookie");
    const cookies = parseRequestCookies(cookieHeader);
    let accessToken: string | undefined = cookies["access_token"];
    const refreshToken = cookies["refresh_token"];

    if (!accessToken && refreshToken) {
      accessToken = (await fetchNewAccessToken(refreshToken)) ?? undefined;
    }
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyText = await request.text();
    const base = getDjangoApiBase();

    async function streamWithToken(token: string) {
      return fetch(`${base}/${path}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        body: bodyText || "{}",
      });
    }

    let response = await streamWithToken(accessToken);
    if (response.status === 401 && refreshToken) {
      const newAccess = await fetchNewAccessToken(refreshToken);
      if (newAccess) {
        accessToken = newAccess;
        response = await streamWithToken(newAccess);
      }
    }

    if (!response.ok || !response.body) {
      const errText = await response.text();
      let payload: Record<string, unknown> = { detail: errText || "Request failed" };
      try {
        payload = JSON.parse(errText) as Record<string, unknown>;
      } catch {
        /* keep text in detail above */
      }
      return NextResponse.json(payload, { status: response.status || 502 });
    }

    const res = new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
    if (accessToken !== cookies["access_token"]) {
      res.cookies.set("access_token", accessToken, accessTokenCookieOptions);
    }
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Django Stream Proxy Error:", message);
    return NextResponse.json({ error: "Stream failed", detail: message }, { status: 500 });
  }
}
