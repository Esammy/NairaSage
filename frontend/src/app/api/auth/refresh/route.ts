import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import axios from "axios";

const DJANGO_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refresh = cookieStore.get("refresh_token")?.value;
    if (!refresh) {
      return NextResponse.json({ detail: "No refresh token." }, { status: 401 });
    }

    const response = await axios.post(`${DJANGO_URL}/auth/token/refresh/`, {
      refresh,
    });

    const { access, refresh: newRefresh } = response.data;
    const nextResponse = NextResponse.json({ success: true });

    nextResponse.cookies.set("access_token", access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    if (newRefresh) {
      nextResponse.cookies.set("refresh_token", newRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return nextResponse;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } };
    const status = err.response?.status || 401;
    return NextResponse.json({ detail: "Session could not be extended." }, { status });
  }
}
