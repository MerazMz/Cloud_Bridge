import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Next.js 16 Proxy — replaces middleware.ts.
 * Handles route protection and auth redirects.
 */

// Routes that require authentication
const protectedRoutes = ["/dashboard"];

// Routes only accessible to unauthenticated users
const authRoutes = ["/login", "/verify-otp", "/verify-password"];

// API routes that require authentication
const protectedApiRoutes = ["/api/auth/me", "/api/auth/logout"];

function getAccessSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("access_token")?.value;

  if (!token) return false;

  try {
    await jwtVerify(token, getAccessSecret(), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await isAuthenticated(request);

  // Protect dashboard and other authenticated routes
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect API routes that require auth
  const isProtectedApi = protectedApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedApi && !authenticated) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect root to appropriate page
  if (pathname === "/") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth/send-otp, api/auth/verify-otp, api/auth/verify-2fa (public auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!api/auth/send-otp|api/auth/verify-otp|api/auth/verify-2fa|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
