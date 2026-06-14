'use client';

/**
 * ClientTracker.jsx
 *
 * Componente client-side que maneja:
 * 1. Cookie "lang" (antes estaba en el middleware, pero eso forzaba Cache-Control: private)
 * 2. Cookies de marketing/tracking (mkt_attr_first, mkt_attr_last, etc.)
 * 3. Envío del campaign-visit al backend
 *
 * Al mover esto del middleware al cliente, el servidor NUNCA envía Set-Cookie,
 * lo que permite que Next.js mantenga Cache-Control: s-maxage=86400 (cacheable)
 * y que Google pueda indexar todas las páginas.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const TRACK_API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.stl-hub.com').replace(/\/$/, '')
  : '';

const ATTR_MAX_TEXT = 191;
const ATTR_MAX_URL = 512;
const ATTR_TTL_DAYS = 120;
const SESSION_TTL_HOURS = 2;
const ANON_TTL_DAYS = 365;

// ---------- Cookie helpers ----------
function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name, value, maxAgeSec, domain) {
  if (typeof document === 'undefined') return;
  let cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=lax`;
  if (domain) cookie += `; domain=${domain}`;
  if (window.location.protocol === 'https:') cookie += '; Secure';
  document.cookie = cookie;
}

function getDomain() {
  if (typeof window === 'undefined') return undefined;
  const h = window.location.hostname;
  if (h === 'stl-hub.com' || h.endsWith('.stl-hub.com')) return 'stl-hub.com';
  return undefined;
}

function makeId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

function safeText(value, max = ATTR_MAX_TEXT) {
  const v = String(value || '').trim();
  return v ? v.slice(0, max) : null;
}

function safeUrl(value, max = ATTR_MAX_URL) {
  return safeText(value, max);
}

// ---------- Referrer helpers ----------
function getReferrerHostname(referrer) {
  if (!referrer) return null;
  try { return new URL(referrer).hostname.toLowerCase(); } catch { return null; }
}

function classifyReferrer(refHost) {
  if (!refHost) return { source: 'direct', medium: 'direct' };
  if (refHost.includes('pinterest.')) return { source: 'pinterest', medium: 'organic' };
  if (refHost.includes('facebook.com') || refHost === 'fb.com') return { source: 'facebook', medium: 'organic' };
  if (refHost === 't.me' || refHost.includes('telegram.')) return { source: 'telegram', medium: 'organic' };
  if (refHost.includes('instagram.com')) return { source: 'instagram', medium: 'organic' };
  if (refHost.includes('youtube.com') || refHost === 'youtu.be') return { source: 'youtube', medium: 'organic' };
  if (refHost.includes('google.')) return { source: 'google', medium: 'organic' };
  if (refHost.includes('twitter.com') || refHost === 'x.com') return { source: 'twitter', medium: 'organic' };
  return { source: refHost, medium: 'referral' };
}

function isExternalReferrer(referrer) {
  const refHost = getReferrerHostname(referrer);
  if (!refHost) return false;
  if (refHost === 'localhost' || refHost === '127.0.0.1') return false;
  if (refHost === 'stl-hub.com' || refHost.endsWith('.stl-hub.com')) return false;
  return true;
}

// ---------- Main tracking logic ----------
function runTracking() {
  const domain = getDomain();
  const params = new URLSearchParams(window.location.search);

  // 1. Cookie de idioma
  const isEn = window.location.pathname.startsWith('/en');
  setCookie('lang', isEn ? 'en' : 'es', 60 * 60 * 24 * 365, domain);

  // 2. Tracking de campaña / atribución
  const queryTracking = {
    utm_source: safeText(params.get('utm_source')),
    utm_medium: safeText(params.get('utm_medium')),
    utm_campaign: safeText(params.get('utm_campaign')),
    utm_content: safeText(params.get('utm_content')),
    utm_term: safeText(params.get('utm_term')),
    gclid: safeText(params.get('gclid')),
    fbclid: safeText(params.get('fbclid')),
    ttclid: safeText(params.get('ttclid')),
    msclkid: safeText(params.get('msclkid')),
  };
  const hasQueryTracking = Object.values(queryTracking).some(Boolean);

  const existingSession = getCookie('mkt_session_id');

  // Si no hay parámetros de tracking y la sesión ya existe, no hacemos nada
  if (!hasQueryTracking && existingSession) return;

  let trackingPayload = null;
  const referrer = document.referrer || null;

  if (hasQueryTracking) {
    trackingPayload = {
      ...queryTracking,
      landingUrl: safeUrl(window.location.href),
      referrer: safeUrl(referrer),
    };
  } else if (!existingSession) {
    // Nueva sesión sin parámetros de tracking
    if (isExternalReferrer(referrer)) {
      const refHost = getReferrerHostname(referrer);
      const { source, medium } = classifyReferrer(refHost);
      trackingPayload = {
        utm_source: source, utm_medium: medium, utm_campaign: 'organic',
        utm_content: null, utm_term: null, gclid: null, fbclid: null,
        ttclid: null, msclkid: null,
        landingUrl: safeUrl(window.location.href),
        referrer: safeUrl(referrer),
      };
    } else {
      trackingPayload = {
        utm_source: 'direct', utm_medium: 'direct', utm_campaign: 'direct',
        utm_content: null, utm_term: null, gclid: null, fbclid: null,
        ttclid: null, msclkid: null,
        landingUrl: safeUrl(window.location.href),
        referrer: null,
      };
    }
  }

  if (!trackingPayload) return;

  // First-touch attribution
  const existingFirst = getCookie('mkt_attr_first');
  if (!existingFirst) {
    setCookie('mkt_attr_first', JSON.stringify(trackingPayload), 60 * 60 * 24 * ATTR_TTL_DAYS, domain);
  }
  // Last-touch attribution (siempre se actualiza)
  setCookie('mkt_attr_last', JSON.stringify(trackingPayload), 60 * 60 * 24 * ATTR_TTL_DAYS, domain);

  // Visit queued flag
  setCookie('mkt_visit_queued', '1', 60 * 10, domain);

  // Anon ID
  let anonId = getCookie('mkt_anon_id');
  if (!anonId) {
    anonId = makeId();
  }
  setCookie('mkt_anon_id', anonId, 60 * 60 * 24 * ANON_TTL_DAYS, domain);

  // Session ID
  let sessionId = getCookie('mkt_session_id');
  if (!sessionId) {
    sessionId = makeId();
  }
  setCookie('mkt_session_id', sessionId, 60 * 60 * SESSION_TTL_HOURS, domain);

  // 3. Envío al backend (fire-and-forget)
  const payload = {
    tracking: trackingPayload,
    anonId: safeText(anonId, 120),
    sessionId: safeText(sessionId, 120),
    pagePath: safeText(window.location.pathname, 255),
  };

  fetch(`${TRACK_API_BASE}/api/track/campaign-visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export default function ClientTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Pequeño delay para no bloquear el render inicial
    const timer = setTimeout(runTracking, 50);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null; // Este componente no renderiza nada
}
