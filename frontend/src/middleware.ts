import { NextRequest, NextResponse } from "next/server";

// Rich Dad Wealth OS replaces the legacy /dashboard UI. These 301s send any
// bookmark or inbound link from the old IA into the matching /wealth route.
const LEGACY_MAP: Record<string, string> = {
  "/dashboard": "/wealth",
  "/dashboard/": "/wealth",
  "/dashboard/chat": "/wealth/chat",
  "/dashboard/accounts": "/wealth/statement",
  "/dashboard/investments": "/wealth/deals",
  "/dashboard/goals": "/wealth/path",
  "/dashboard/opportunities": "/wealth/deals",
  "/dashboard/tax": "/wealth/chat?prompt=Help%20me%20reduce%20tax%20legally%20using%20Kiyosaki%27s%20Control%204",
  "/dashboard/debt": "/wealth/statement",
  "/dashboard/learn": "/wealth/library",
};

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const dest = LEGACY_MAP[pathname];
  if (dest) {
    const url = req.nextUrl.clone();
    const [path, destQuery] = dest.split("?");
    url.pathname = path;
    url.search = destQuery ? `?${destQuery}` : search;
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
