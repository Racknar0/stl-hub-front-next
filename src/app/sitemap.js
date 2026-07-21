// Next.js App Router sitemap dynamic generation
// ESTRATEGIA DRIP-FEED: Empezamos con muy pocas URLs de alta calidad para que
// Google las indexe rápidamente. Una vez indexadas, iremos subiendo SITEMAP_ASSET_LIMIT
// progresivamente (40 → 100 → 500 → 1000 → todas).
const SITEMAP_REVALIDATE_SECONDS = 3600;

// ┌─────────────────────────────────────────────────────────────────┐
// │  AJUSTA ESTE NÚMERO para ir subiendo las URLs progresivamente  │
// │  Fase 1: 40  │  Fase 2: 100  │  Fase 3: 500  │  Fase 4: ALL  │
// └─────────────────────────────────────────────────────────────────┘
const SITEMAP_ASSET_LIMIT = 50;

export default async function sitemap() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stl-hub.com').replace(/\/$/, '');
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://stl-hub.com')
    .replace(/\/$/, '');
  const now = new Date();
  
  const entries = [];

  // ── Páginas estáticas principales ──
  entries.push(
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
      url: `${base}/modelos-3d-gratis`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: { languages: { 'es-ES': `${base}/modelos-3d-gratis`, 'en-US': `${base}/en/free-3d-models`, 'x-default': `${base}/modelos-3d-gratis` } },
    },
    {
      url: `${base}/en/free-3d-models`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
      alternates: { languages: { 'es-ES': `${base}/modelos-3d-gratis`, 'en-US': `${base}/en/free-3d-models`, 'x-default': `${base}/modelos-3d-gratis` } },
    },
    {
      url: `${base}/suscripcion`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
      alternates: { languages: { 'es-ES': `${base}/suscripcion`, 'en-US': `${base}/en/suscripcion`, 'x-default': `${base}/suscripcion` } },
    }
  );

  // ── Assets iniciales fijos por ID asc (drip-feed) ──
  try {
    const res = await fetch(
      `${apiBase}/api/assets/slugs?limit=${SITEMAP_ASSET_LIMIT}&sortBy=id&order=asc`,
      { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } }
    );
    if (res.ok) {
      const rows = await res.json();

      for (const r of rows) {
        if (!r?.slug) continue;
        const url = `${base}/asset/${r.slug}`;
        const urlEn = `${base}/en/asset/${r.slug}`;
        
        // Entrada en español
        entries.push({
          url,
          lastModified: r.updatedAt ? new Date(r.updatedAt) : now,
          changeFrequency: 'weekly',
          priority: 0.9,
          alternates: { languages: { 'es-ES': url, 'en-US': urlEn, 'x-default': url } },
        });

        // Entrada en inglés
        entries.push({
          url: urlEn,
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

  return entries;
}