import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
  res.cookies.set("access_token", "", opts);
  res.cookies.set("refresh_token", "", opts);
  return res;
}
