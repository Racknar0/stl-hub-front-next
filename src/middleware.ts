import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextFetchEvent } from 'next/server';
import { queueCampaignTracking } from './helpers/edgeAttribution';

const IGNORE = /^\/(_next|api|favicon\.ico|.*\.[a-z0-9]+)$/i;
const CANONICAL_HOST = 'stl-hub.com';
const BLOCKED_IP_HOSTS = new Set(['77.237.239.254']);

function normalizeHost(host: string) {
  return String(host || '').trim().toLowerCase().replace(/:\d+$/, '');
}

export function middleware(req: NextRequest, event: NextFetchEvent) {
  const host = normalizeHost(req.headers.get('host') || req.nextUrl.host);

  // SEO: Forzar redirección 301 de www a non-www (evita contenido duplicado)
  if (host.startsWith('www.')) {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    url.host = CANONICAL_HOST;
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  // SEO: evita indexación por IP directa y fuerza dominio canónico HTTPS.
  if (BLOCKED_IP_HOSTS.has(host)) {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    url.host = CANONICAL_HOST;
    url.port = '';
    return NextResponse.redirect(url, 301);
  }

  const { pathname } = req.nextUrl;

  if (IGNORE.test(pathname)) return NextResponse.next();

  // /en → cookie en y seguimos (la rewrite la hace next.config.js)
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-lang', 'en');

    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    res.cookies.set('lang', 'en', { path: '/' });
    queueCampaignTracking(req, event, res);
    return res;
  }

  // /es → cookie es y (opcional) redirige a la ruta base sin /es
  if (pathname === '/es' || pathname.startsWith('/es/')) {
    const res = NextResponse.redirect(new URL(pathname.replace(/^\/es/, '') || '/', req.url));
    res.cookies.set('lang', 'es', { path: '/' });
    queueCampaignTracking(req, event, res);
    return res;
  }

  // Resto de rutas (base) → por defecto ES
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-lang', 'es');

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  res.cookies.set('lang', 'es', { path: '/' });
  queueCampaignTracking(req, event, res);
  return res;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};