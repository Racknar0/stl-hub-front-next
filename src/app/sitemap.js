// Next.js App Router sitemap dynamic generation
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://stl-hub.com';
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://stl-hub.com')
    .replace(/\/$/, '');
  const now = new Date();

  // Core static routes
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
    },
    {
      url: `${base}/search`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.6,
    },
  ];

  // Fetch published slugs (server-side; this runs at build or on-demand)
  try {
    const res = await fetch(`${apiBase}/api/assets/slugs`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const rows = await res.json();
      for (const r of rows) {
        if (!r?.slug) continue;
        entries.push({
          url: `${base}/asset/${r.slug}`,
          lastModified: r.updatedAt ? new Date(r.updatedAt) : now,
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[sitemap] falló fetch slugs', e);
  }

  return entries;
}