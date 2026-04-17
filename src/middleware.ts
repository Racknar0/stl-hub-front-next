import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextFetchEvent } from 'next/server';

const IGNORE = /^\/(_next|api|favicon\.ico|.*\.[a-z0-9]+)$/i;
const CANONICAL_HOST = 'stl-hub.com';
const BLOCKED_IP_HOSTS = new Set(['77.237.239.254']);
const TRACK_ANON_COOKIE = 'mkt_anon_id';
const TRACK_SESSION_COOKIE = 'mkt_session_id';
const TRACK_QUEUED_COOKIE = 'mkt_visit_queued';
const TRACK_API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.stl-hub.com').replace(/\/$/, '');

function normalizeHost(host: string) {
  return String(host || '').trim().toLowerCase().replace(/:\d+$/, '');
}

function makeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function safeText(value: string | null | undefined, max = 191) {
  const v = String(value || '').trim();
  if (!v) return null;
  return v.slice(0, max);
}

function safeUrl(value: string | null | undefined, max = 512) {
  return safeText(value, max);
}

function getTrackingFromSearch(searchParams: URLSearchParams) {
  const tracking = {
    utm_source: safeText(searchParams.get('utm_source')),
    utm_medium: safeText(searchParams.get('utm_medium')),
    utm_campaign: safeText(searchParams.get('utm_campaign')),
    utm_content: safeText(searchParams.get('utm_content')),
    utm_term: safeText(searchParams.get('utm_term')),
    gclid: safeText(searchParams.get('gclid')),
    fbclid: safeText(searchParams.get('fbclid')),
    ttclid: safeText(searchParams.get('ttclid')),
    msclkid: safeText(searchParams.get('msclkid')),
  };

  const hasAny = Object.values(tracking).some(Boolean);
  return hasAny ? tracking : null;
}

function getOrSetCookieId(req: NextRequest, res: NextResponse, name: string, maxAgeSec?: number) {
  let value = req.cookies.get(name)?.value || '';
  if (!value) {
    value = makeId();
    res.cookies.set(name, value, {
      path: '/',
      sameSite: 'lax',
      secure: true,
      ...(maxAgeSec ? { maxAge: maxAgeSec } : {}),
    });
  }
  return value;
}

function queueCampaignVisit(req: NextRequest, event: NextFetchEvent, res: NextResponse) {
  const tracking = getTrackingFromSearch(req.nextUrl.searchParams);
  if (!tracking) return;

  res.cookies.set(TRACK_QUEUED_COOKIE, '1', {
    path: '/',
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 10,
  });

  const anonId = getOrSetCookieId(req, res, TRACK_ANON_COOKIE, 60 * 60 * 24 * 365);
  const sessionId = getOrSetCookieId(req, res, TRACK_SESSION_COOKIE, 60 * 60 * 2);
  const debug = req.nextUrl.searchParams.get('utm_debug') === '1';

  const payload = {
    tracking: {
      ...tracking,
      landingUrl: safeUrl(req.url),
      referrer: safeUrl(req.headers.get('referer')),
    },
    anonId: safeText(anonId, 120),
    sessionId: safeText(sessionId, 120),
    pagePath: safeText(req.nextUrl.pathname, 255),
  };

  const endpoint = `${TRACK_API_BASE}/api/track/campaign-visit`;
  event.waitUntil(
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => undefined)
  );

  if (debug) {
    res.headers.set('x-attribution-queued', '1');
    res.headers.set('x-attribution-endpoint', '/api/track/campaign-visit');
  }
}

export function middleware(req: NextRequest, event: NextFetchEvent) {
  const host = normalizeHost(req.headers.get('host') || req.nextUrl.host);

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
    const res = NextResponse.next();
    res.cookies.set('lang', 'en', { path: '/' });
    res.headers.set('x-lang', 'en');
    queueCampaignVisit(req, event, res);
    return res;
  }

  // /es → cookie es y (opcional) redirige a la ruta base sin /es
  if (pathname === '/es' || pathname.startsWith('/es/')) {
    const res = NextResponse.redirect(new URL(pathname.replace(/^\/es/, '') || '/', req.url));
    res.cookies.set('lang', 'es', { path: '/' });
    queueCampaignVisit(req, event, res);
    return res;
  }

  // Resto de rutas (base) → por defecto ES
  const res = NextResponse.next();
  res.cookies.set('lang', 'es', { path: '/' });
  res.headers.set('x-lang', 'es');
  queueCampaignVisit(req, event, res);
  return res;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};