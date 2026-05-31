// Next.js App Router sitemap dynamic generation
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
const SITEMAP_REVALIDATE_SECONDS = 3600;
const QUERY_SOURCE_LIMIT = 300;
const QUERY_VALIDATION_CANDIDATE_LIMIT = 120;
const QUERY_VALIDATION_BATCH_SIZE = 12;
const QUERY_INDEXABLE_LIMIT = 100;

async function isQueryIndexableNow(apiBase, q) {
  const url = new URL(`${apiBase}/api/assets/search`);
  url.searchParams.set('q', q);
  url.searchParams.set('pageIndex', '0');
  url.searchParams.set('pageSize', '1');

  try {
    const res = await fetch(url.toString(), { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } });
    if (!res.ok) return false;
    const data = await res.json();
    const pageItemsCount = Array.isArray(data?.items) ? data.items.length : 0;
    const isAiFallback = data?.aiFallback === true;
    return pageItemsCount > 0 && !isAiFallback;
  } catch {
    return false;
  }
}

async function collectIndexableSearchQueries(apiBase, rawQueries) {
  const uniqueQueries = [];
  const seen = new Set();

  for (const row of rawQueries || []) {
    const q = String(row?.query || '').trim();
    if (q.length < 2) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueQueries.push(q);
    if (uniqueQueries.length >= QUERY_VALIDATION_CANDIDATE_LIMIT) break;
  }

  const accepted = [];
  for (let i = 0; i < uniqueQueries.length; i += QUERY_VALIDATION_BATCH_SIZE) {
    const batch = uniqueQueries.slice(i, i + QUERY_VALIDATION_BATCH_SIZE);
    const results = await Promise.all(batch.map(async (q) => ({ q, ok: await isQueryIndexableNow(apiBase, q) })));

    for (const row of results) {
      if (!row.ok) continue;
      accepted.push(row.q);
      if (accepted.length >= QUERY_INDEXABLE_LIMIT) return accepted;
    }
  }

  return accepted;
}

export default async function sitemap() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stl-hub.com').replace(/\/$/, '');
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://stl-hub.com')
    .replace(/\/$/, '');
  const now = new Date();

  // Core static routes — ES + EN (el middleware inyecta x-lang: en para rutas /en/*)
  const entries = [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
      alternates: { languages: { 'es-ES': `${base}/`, 'en-US': `${base}/en`, 'x-default': `${base}/` } },
    },
    {
      url: `${base}/en`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: { languages: { 'es-ES': `${base}/`, 'en-US': `${base}/en`, 'x-default': `${base}/` } },
    },
    {
      url: `${base}/suscripcion`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
      alternates: { languages: { 'es-ES': `${base}/suscripcion`, 'x-default': `${base}/suscripcion` } },
    },
  ];

  // Fetch published slugs (server-side; this runs at build or on-demand)
  try {
    const res = await fetch(`${apiBase}/api/assets/slugs`, { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } });
    if (res.ok) {
      const rows = await res.json();
      for (const r of rows) {
        if (!r?.slug) continue;
        const url = `${base}/asset/${r.slug}`;
        const urlEn = `${base}/en/asset/${r.slug}`;
        entries.push({
          url,
          lastModified: r.updatedAt ? new Date(r.updatedAt) : now,
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: { languages: { 'es-ES': url, 'en-US': urlEn, 'x-default': url } },
        });
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[sitemap] falló fetch slugs', e);
  }

  // Popular search queries — Programmatic SEO pages
  try {
    const res = await fetch(
      `${apiBase}/api/metrics/top-search-queries?limit=${QUERY_SOURCE_LIMIT}&minCount=2`,
      { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } }
    );

    if (res.ok) {
      const data = await res.json();
      const queries = Array.isArray(data?.queries) ? data.queries : [];
      const indexableQueries = await collectIndexableSearchQueries(apiBase, queries);

      for (const q of indexableQueries) {
        const encoded = encodeURIComponent(q);
        const url = `${base}/search?q=${encoded}`;
        const urlEn = `${base}/en/search?q=${encoded}`;
        entries.push({
          url,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: { languages: { 'es-ES': url, 'en-US': urlEn, 'x-default': url } },
        });
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[sitemap] falló fetch top-search-queries', e);
  }

  return entries;
}