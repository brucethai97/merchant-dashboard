import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/update-session";

const PUBLIC_PATH_PREFIXES = ["/login", "/signup"] as const;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Only allow same-origin relative paths (avoid open redirects). */
function safeInternalPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const { response, user } = await updateSession(request);

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const nextTarget = safeInternalPath(`${pathname}${search}`);
    loginUrl.searchParams.set("next", nextTarget);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicPath(pathname)) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const target = safeInternalPath(nextParam ?? "/");
    const redirectUrl = new URL(target, request.nextUrl.origin);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip static assets and Next internals — everything else runs auth refresh
     * and route protection.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
