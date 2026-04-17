const STORAGE_KEY = 'stlhub:attribution:v1';
const ANON_ID_KEY = 'stlhub:anon-id:v1';
const SESSION_ID_KEY = 'stlhub:session-id:v1';
const SENT_KEY_PREFIX = 'stlhub:visit-sent:v1:';
const DEBUG_KEY = 'stlhub:utm-debug';
const MAX_TEXT = 191;
const MAX_URL = 512;
const TTL_MS = 1000 * 60 * 60 * 24 * 120;

const safeText = (value, max = MAX_TEXT) => {
  const v = String(value || '').trim();
  if (!v) return null;
  return v.slice(0, max);
};

const safeUrl = (value) => safeText(value, MAX_URL);

const makeId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto?.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // noop
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

const getApiBase = () => {
  const envBase = String(process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();
  if (envBase) return `${envBase.replace(/\/$/, '')}/api`;
  if (typeof window !== 'undefined') return `${window.location.origin}/api`;
  return '/api';
};

const getOrCreateLocalId = (key, { session = false } = {}) => {
  try {
    if (typeof window === 'undefined') return null;
    const storage = session ? window.sessionStorage : window.localStorage;
    let v = String(storage.getItem(key) || '').trim();
    if (!v) {
      v = makeId();
      storage.setItem(key, v);
    }
    return v;
  } catch {
    return null;
  }
};

const getVisitStateInSession = (signature) => {
  try {
    if (typeof window === 'undefined') return null;
    const key = `${SENT_KEY_PREFIX}${signature}`;
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const setVisitStateInSession = (signature, value) => {
  try {
    if (typeof window === 'undefined') return;
    const key = `${SENT_KEY_PREFIX}${signature}`;
    if (!value) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(key, String(value));
  } catch {
    // noop
  }
};

const isDebugEnabled = () => {
  try {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('utm_debug') === '1') return true;
    return window.localStorage.getItem(DEBUG_KEY) === '1';
  } catch {
    return false;
  }
};

const postCampaignVisit = async (payload, signature, debug = false) => {
  try {
    const url = `${getApiBase()}/metrics/campaign-visit`;
    const body = JSON.stringify(payload);

    const currentState = getVisitStateInSession(signature);
    if (currentState === 'sent' || currentState === 'pending') {
      if (debug) console.info('[ATTRIBUTION] skip visit send (state):', currentState);
      return;
    }

    setVisitStateInSession(signature, 'pending');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });

    if (response.ok) {
      setVisitStateInSession(signature, 'sent');
      if (debug) console.info('[ATTRIBUTION] visit sent:', { status: response.status, url, signature });
      return;
    }

    setVisitStateInSession(signature, null);
    if (debug) console.warn('[ATTRIBUTION] visit send failed (non-ok):', { status: response.status, url, signature });
  } catch {
    setVisitStateInSession(signature, null);
    if (debug) console.warn('[ATTRIBUTION] visit send failed (exception)');
  }
};

const extractFromParams = (params) => {
  if (!params) return null;

  const out = {
    utmSource: safeText(params.get('utm_source')),
    utmMedium: safeText(params.get('utm_medium')),
    utmCampaign: safeText(params.get('utm_campaign')),
    utmContent: safeText(params.get('utm_content')),
    utmTerm: safeText(params.get('utm_term')),
    clickGclid: safeText(params.get('gclid')),
    clickFbclid: safeText(params.get('fbclid')),
    clickTtclid: safeText(params.get('ttclid')),
    clickMsclkid: safeText(params.get('msclkid')),
  };

  const has = Object.values(out).some(Boolean);
  return has ? out : null;
};

const readStorage = () => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const firstSeenAtMs = Date.parse(String(parsed?.firstSeenAt || ''));
    if (!Number.isFinite(firstSeenAtMs)) return null;

    if (Date.now() - firstSeenAtMs > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const writeStorage = (payload) => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // noop
  }
};

export const bootstrapAttributionFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const debug = isDebugEnabled();

  const params = new URLSearchParams(window.location.search || '');
  const incoming = extractFromParams(params);
  const current = readStorage();

  if (!incoming && !current) return null;

  const nowIso = new Date().toISOString();
  const firstTouch = current?.firstTouch || incoming || null;
  const lastTouch = incoming || current?.lastTouch || current?.firstTouch || null;

  const next = {
    firstTouch,
    lastTouch,
    firstSeenAt: current?.firstSeenAt || nowIso,
    lastSeenAt: nowIso,
    landingUrl: current?.landingUrl || safeUrl(window.location.href),
    referrer: current?.referrer || safeUrl(document?.referrer || null),
  };

  writeStorage(next);
  if (debug) {
    console.info('[ATTRIBUTION] bootstrap:', {
      incoming,
      hasStored: !!current,
      firstTouch: next.firstTouch,
      lastTouch: next.lastTouch,
    });
  }

  if (incoming) {
    const campaignKey = safeText(incoming.utmCampaign || 'no-campaign', 120);
    const signature = `${campaignKey}|${safeText(window.location.pathname || '/', 160)}|${safeText(window.location.search || '', 220)}`;
    const anonId = getOrCreateLocalId(ANON_ID_KEY);
    const sessionId = getOrCreateLocalId(SESSION_ID_KEY, { session: true });
    void postCampaignVisit({
      tracking: {
        ...incoming,
        landingUrl: safeUrl(window.location.href),
        referrer: safeUrl(document?.referrer || null),
      },
      anonId,
      sessionId,
      pagePath: safeText(window.location.pathname || '/', 255),
    }, signature, debug);
  }

  return next;
};

export const getAttributionPayload = (prefer = 'first') => {
  const state = readStorage();
  if (!state) return null;

  const touch = prefer === 'last'
    ? state.lastTouch || state.firstTouch
    : state.firstTouch || state.lastTouch;

  if (!touch) return null;

  return {
    ...touch,
    landingUrl: safeUrl(state.landingUrl),
    referrer: safeUrl(state.referrer),
    firstSeenAt: state.firstSeenAt || null,
    lastSeenAt: state.lastSeenAt || null,
  };
};
