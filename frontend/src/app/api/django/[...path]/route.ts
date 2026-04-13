import { NextResponse } from "next/server";
import {
  parseRequestCookies,
  fetchNewAccessToken,
  getDjangoApiBase,
  accessTokenCookieOptions,
} from "@/lib/request-cookies";

async function handleProxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join("/");
    const requestUrl = new URL(request.url);
    const queryString = requestUrl.search;

    const cookieHeader = request.headers.get("cookie");
    const cookies = parseRequestCookies(cookieHeader);
    let accessToken: string | undefined = cookies["access_token"];
    const refreshToken = cookies["refresh_token"];

    const base = getDjangoApiBase();
    const djangoUrl =
      queryString.length > 0
        ? `${base}/${path.replace(/\/$/, "")}${queryString}`
        : `${base}/${path.replace(/\/$/, "")}/`;

    let bodyText: string | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      bodyText = await request.text();
    }

    const skipRefresh =
      path === "auth/token/refresh" ||
      path.startsWith("auth/token/refresh/") ||
      path === "auth/token" ||
      path.startsWith("auth/token/");

    async function callDjango(bearer: string | undefined) {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (bearer) {
        (headers as Record<string, string>)["Authorization"] = `Bearer ${bearer}`;
      }
      const opts: RequestInit = {
        method: request.method,
        headers,
      };
      if (bodyText) opts.body = bodyText;
      return fetch(djangoUrl, opts);
    }

    let response = await callDjango(accessToken);

    if (response.status === 401 && refreshToken && !skipRefresh) {
      const newAccess = await fetchNewAccessToken(refreshToken);
      if (newAccess) {
        accessToken = newAccess;
        response = await callDjango(newAccess);
      }
    }

    const data = await response.text();
    let jsonData: unknown = data;
    try {
      jsonData = JSON.parse(data);
    } catch {
      /* keep text */
    }

    const nextRes = NextResponse.json(jsonData, { status: response.status });
    if (accessToken && accessToken !== cookies["access_token"]) {
      nextRes.cookies.set("access_token", accessToken, accessTokenCookieOptions);
    }
    return nextRes;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Django Proxy Error:`, message);
    return NextResponse.json({ error: "Internal Server Proxy Error" }, { status: 500 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
