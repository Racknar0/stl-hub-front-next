const ATTR_FIRST_COOKIE = 'mkt_attr_first';
const ATTR_LAST_COOKIE = 'mkt_attr_last';
const ANON_COOKIE = 'mkt_anon_id';
const SESSION_COOKIE = 'mkt_session_id';

const parseCookies = () => {
  try {
    if (typeof document === 'undefined') return {};
    const raw = String(document.cookie || '');
    if (!raw) return {};

    return raw.split(';').reduce((acc, part) => {
      const i = part.indexOf('=');
      if (i <= 0) return acc;
      const key = part.slice(0, i).trim();
      const value = part.slice(i + 1).trim();
      if (key) acc[key] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const decodeTrackingCookie = (raw) => {
  try {
    const value = String(raw || '').trim();
    if (!value) return null;
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

export const getTrackingFromMiddlewareCookie = (prefer = 'first') => {
  const cookies = parseCookies();
  const first = decodeTrackingCookie(cookies[ATTR_FIRST_COOKIE]);
  const last = decodeTrackingCookie(cookies[ATTR_LAST_COOKIE]);

  if (prefer === 'last') return last || first || null;
  return first || last || null;
};

export const getVisitIdentityFromMiddlewareCookie = () => {
  const cookies = parseCookies();
  const anonId = String(cookies[ANON_COOKIE] || '').trim() || null;
  const sessionId = String(cookies[SESSION_COOKIE] || '').trim() || null;
  return { anonId, sessionId };
};
