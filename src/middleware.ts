import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

const EMPLOYEE_COOKIE = "sss_employee_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/cash")) {
    const isPublicCashRoute =
      pathname.startsWith("/cash/login") || pathname.startsWith("/cash/logout");

    if (!isPublicCashRoute && !request.cookies.get(EMPLOYEE_COOKIE)?.value) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/cash/login";
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_SECRET_KEY?.trim();
  const hasAccess = secret && request.cookies.get(ADMIN_COOKIE)?.value === secret;

  if (hasAccess) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = secret ? "" : "?missing_secret=1";

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/cash/:path*"],
};
