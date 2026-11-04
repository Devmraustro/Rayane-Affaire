import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge middleware — request hardening.
 *
 *  1. Per-request CSP nonce, forwarded to the app so Next can stamp its own
 *     scripts. `strict-dynamic` lets those scripts load their chunks while
 *     blocking injected ones.
 *  2. Security headers (nosniff, referrer, permissions, HSTS in production).
 *  3. `frame-ancestors` allows the hosting preview iframes (Arena/E2B) but no
 *     arbitrary site can reframe the admin area.
 *  4. Cheap gate on /admin: a request without a session cookie is redirected to
 *     the login page. Real authorisation happens server-side in
 *     `app/admin/layout.tsx` (middleware cannot reach the database).
 */

const AUTH_COOKIE = 'ra_session';

function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = isDev
    ? `'self' 'unsafe-inline' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Tailwind ships a stylesheet; Leaflet and Radix set element styles at
    // runtime. Inline styles are allowed, scripts are not.
    "style-src 'self' 'unsafe-inline'",
    // Remote photography (licensed CDNs) + OSM tiles + self-hosted media.
    "img-src 'self' data: blob: https://images.unsplash.com https://upload.wikimedia.org https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
    "font-src 'self' data:",
    "connect-src 'self' https://*.tile.openstreetmap.org https://nominatim.openstreetmap.org",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://*.e2b.app https://*.arena.ai https://*.vercel.app",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV !== 'production';

  // --- Admin gate ---------------------------------------------------------
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginRoute = pathname.startsWith('/admin/login');
  const hasSessionCookie = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  if (isAdminRoute && !isLoginRoute && !hasSessionCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.search = '';
    // Preserve where the user wanted to go (validated server-side on redirect).
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- CSP + headers ------------------------------------------------------
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const csp = buildCsp(nonce, isDev);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-csp-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  // Forwarded so server layouts can distinguish /admin/login from the rest of
  // the admin area without re-parsing the request URL.
  requestHeaders.set('x-pathname', pathname);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(), usb=()',
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }
  return response;
}

export const config = {
  // Skip static assets, the image optimiser and the favicon: they need no CSP
  // nonce and the middleware must not add latency to them.
  matcher: ['/((?!_next/static|_next/image|images/|favicon.ico|icon.svg).*)'],
};
