import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextFetchEvent } from 'next/server';

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

  // SEO: redirección permanente de rutas legacy /tags/* hacia /search?tags=*
  // (evita páginas blandas 200 con NEXT_REDIRECT en HTML y consolida señales)
  const rootTagsMatch = pathname.match(/^\/tags\/?$/i);
  if (rootTagsMatch) {
    const url = req.nextUrl.clone();
    url.pathname = '/search';
    url.search = '';
    return NextResponse.redirect(url, 308);
  }

  const rootTagValueMatch = pathname.match(/^\/tags\/([^/]+)\/?$/i);
  if (rootTagValueMatch) {
    const tag = decodeURIComponent(rootTagValueMatch[1] || '').trim();
    const url = req.nextUrl.clone();
    url.pathname = '/search';
    url.search = '';
    if (tag) url.searchParams.set('tags', tag);
    return NextResponse.redirect(url, 308);
  }

  const enTagsMatch = pathname.match(/^\/en\/tags\/?$/i);
  if (enTagsMatch) {
    const url = req.nextUrl.clone();
    url.pathname = '/en/search';
    url.search = '';
    return NextResponse.redirect(url, 308);
  }

  const enTagValueMatch = pathname.match(/^\/en\/tags\/([^/]+)\/?$/i);
  if (enTagValueMatch) {
    const tag = decodeURIComponent(enTagValueMatch[1] || '').trim();
    const url = req.nextUrl.clone();
    url.pathname = '/en/search';
    url.search = '';
    if (tag) url.searchParams.set('tags', tag);
    return NextResponse.redirect(url, 308);
  }

  // /en → header x-lang=en para SSR (sin cookie para evitar Cache-Control: private)
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-lang', 'en');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // /es → redirige a la ruta base sin /es
  if (pathname === '/es' || pathname.startsWith('/es/')) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.replace(/^\/es/, '') || '/';
    return NextResponse.redirect(url, 308);
  }

  // Resto de rutas (base) → por defecto ES
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-lang', 'es');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};