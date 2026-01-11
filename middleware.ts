// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MOBILE_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const isMobile = MOBILE_REGEX.test(ua);

  const { pathname } = req.nextUrl;

  // Allowlist
  if (
    pathname.startsWith("/app-only") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|webp)$/)
  ) {
    return NextResponse.next();
  }

  if (isMobile) {
    const url = req.nextUrl.clone();
    url.pathname = "/app-only";
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
