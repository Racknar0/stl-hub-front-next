// Next.js App Router sitemap dynamic generation
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
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
    const res = await fetch(`${apiBase}/api/assets/slugs`, { next: { revalidate: 3600 } });
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
    const res = await fetch(`${apiBase}/api/metrics/top-search-queries?limit=300&minCount=2`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const queries = Array.isArray(data?.queries) ? data.queries : [];
      for (const row of queries) {
        const q = String(row?.query || '').trim();
        if (!q || q.length < 2) continue;
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