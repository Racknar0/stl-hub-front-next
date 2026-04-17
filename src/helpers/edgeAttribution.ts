import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

const TRACK_ANON_COOKIE = 'mkt_anon_id';
const TRACK_SESSION_COOKIE = 'mkt_session_id';
const TRACK_QUEUED_COOKIE = 'mkt_visit_queued';
const TRACK_ATTR_FIRST_COOKIE = 'mkt_attr_first';
const TRACK_ATTR_LAST_COOKIE = 'mkt_attr_last';
const TRACK_API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.stl-hub.com').replace(/\/$/, '');

const ATTR_MAX_TEXT = 191;
const ATTR_MAX_URL = 512;
const ATTR_TTL_SECONDS = 60 * 60 * 24 * 120;

type TrackingPayload = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  ttclid: string | null;
  msclkid: string | null;
  landingUrl?: string | null;
  referrer?: string | null;
};

function safeText(value: string | null | undefined, max = ATTR_MAX_TEXT) {
  const v = String(value || '').trim();
  if (!v) return null;
  return v.slice(0, max);
}

function safeUrl(value: string | null | undefined, max = ATTR_MAX_URL) {
  return safeText(value, max);
}

function makeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function getTrackingFromSearch(searchParams: URLSearchParams): TrackingPayload | null {
  const tracking: TrackingPayload = {
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

function getCookieDomain(req: NextRequest) {
  const host = String(req.headers.get('host') || req.nextUrl.host || '')
    .toLowerCase()
    .replace(/:\d+$/, '');

  if (host === 'stl-hub.com' || host.endsWith('.stl-hub.com')) return 'stl-hub.com';
  return undefined;
}

function isLocalHost(req: NextRequest) {
  const host = String(req.headers.get('host') || req.nextUrl.host || '')
    .toLowerCase()
    .replace(/:\d+$/, '');
  return host === 'localhost' || host === '127.0.0.1';
}

function setCookie(
  req: NextRequest,
  res: NextResponse,
  name: string,
  value: string,
  maxAge: number
) {
  const domain = getCookieDomain(req);
  const secure = !isLocalHost(req);
  res.cookies.set(name, value, {
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge,
    ...(domain ? { domain } : {}),
  });
}

function getOrSetSlidingCookieId(req: NextRequest, res: NextResponse, name: string, maxAge: number) {
  const current = String(req.cookies.get(name)?.value || '').trim();
  const value = current || makeId();
  setCookie(req, res, name, value, maxAge);
  return value;
}

function encodeTrackingCookie(payload: TrackingPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeTrackingCookie(raw: string | null | undefined): TrackingPayload | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') return null;
    const normalized: TrackingPayload = {
      utm_source: safeText((parsed as TrackingPayload).utm_source),
      utm_medium: safeText((parsed as TrackingPayload).utm_medium),
      utm_campaign: safeText((parsed as TrackingPayload).utm_campaign),
      utm_content: safeText((parsed as TrackingPayload).utm_content),
      utm_term: safeText((parsed as TrackingPayload).utm_term),
      gclid: safeText((parsed as TrackingPayload).gclid),
      fbclid: safeText((parsed as TrackingPayload).fbclid),
      ttclid: safeText((parsed as TrackingPayload).ttclid),
      msclkid: safeText((parsed as TrackingPayload).msclkid),
      landingUrl: safeUrl((parsed as TrackingPayload).landingUrl || null),
      referrer: safeUrl((parsed as TrackingPayload).referrer || null),
    };
    return Object.values(normalized).some(Boolean) ? normalized : null;
  } catch {
    return null;
  }
}

export function queueCampaignTracking(req: NextRequest, event: NextFetchEvent, res: NextResponse) {
  const queryTracking = getTrackingFromSearch(req.nextUrl.searchParams);
  if (!queryTracking) return;

  const trackingPayload: TrackingPayload = {
    ...queryTracking,
    landingUrl: safeUrl(req.url),
    referrer: safeUrl(req.headers.get('referer')),
  };

  const firstTouch = decodeTrackingCookie(req.cookies.get(TRACK_ATTR_FIRST_COOKIE)?.value);
  if (!firstTouch) {
    setCookie(req, res, TRACK_ATTR_FIRST_COOKIE, encodeTrackingCookie(trackingPayload), ATTR_TTL_SECONDS);
  }
  setCookie(req, res, TRACK_ATTR_LAST_COOKIE, encodeTrackingCookie(trackingPayload), ATTR_TTL_SECONDS);

  setCookie(req, res, TRACK_QUEUED_COOKIE, '1', 60 * 10);

  const anonId = getOrSetSlidingCookieId(req, res, TRACK_ANON_COOKIE, 60 * 60 * 24 * 365);
  const sessionId = getOrSetSlidingCookieId(req, res, TRACK_SESSION_COOKIE, 60 * 60 * 2);

  const payload = {
    tracking: trackingPayload,
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

  if (req.nextUrl.searchParams.get('utm_debug') === '1') {
    res.headers.set('x-attribution-queued', '1');
    res.headers.set('x-attribution-endpoint', '/api/track/campaign-visit');
    res.headers.set('x-attribution-source', 'middleware');
  }
}
