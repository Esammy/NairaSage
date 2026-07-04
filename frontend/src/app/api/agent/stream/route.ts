import { NextResponse } from "next/server";
import {
  parseRequestCookies,
  fetchNewAccessToken,
  getDjangoApiBase,
  accessTokenCookieOptions,
} from "@/lib/request-cookies";

// The coordinator stream (routing -> parallel specialists -> synthesis) can run
// well past Vercel's short default. Allow up to 60s (Hobby max; Pro can go 300)
// so the orchestration stream is never cut mid-flight.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie");
    const cookies = parseRequestCookies(cookieHeader);
    let accessToken: string | undefined = cookies["access_token"];
    const refreshToken = cookies["refresh_token"];

    if (!refreshToken && !accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!accessToken && refreshToken) {
      accessToken = (await fetchNewAccessToken(refreshToken)) ?? undefined;
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyText = await request.text();
    const base = getDjangoApiBase();

    async function streamWithToken(token: string) {
      return fetch(`${base}/agent/chat/stream/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`,
        },
        body: bodyText,
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

    if (!response.ok) {
      const errText = await response.text();
      let payload: Record<string, unknown> = { detail: errText || "Request failed" };
      try {
        payload = JSON.parse(errText) as Record<string, unknown>;
      } catch {
        /* keep text in detail above */
      }
      if (response.status === 401) {
        return NextResponse.json(
          { detail: (payload.detail as string) || "Unauthorized" },
          { status: 401 }
        );
      }
      return NextResponse.json(payload, { status: response.status });
    }

    if (!response.body) {
      return NextResponse.json({ detail: "Empty stream response" }, { status: 502 });
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
    console.error("Agent Stream Proxy Error:", message);
    return NextResponse.json({ error: "Stream failed", detail: message }, { status: 500 });
  }
}
