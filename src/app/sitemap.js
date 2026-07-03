// Next.js App Router sitemap dynamic generation
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
// NOTA SEO: Las URLs de búsqueda (/search?q=...) fueron eliminadas del sitemap intencionalmente.
// Las páginas de resultados de búsqueda con parámetros no son páginas canónicas de contenido único.
// Incluirlas en el sitemap desperdicia crawl budget que Google debería gastar en las páginas /asset/[slug].
const SITEMAP_REVALIDATE_SECONDS = 3600;
const ITEMS_PER_SITEMAP = 15000; // 15,000 assets por archivo (30,000 URLs total incluyendo ES y EN, manteniéndose seguro bajo el límite de 50,000 de Google)

export async function generateSitemaps() {
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://stl-hub.com')
    .replace(/\/$/, '');
  try {
    const res = await fetch(`${apiBase}/api/assets/slugs`, { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } });
    if (res.ok) {
      const rows = await res.json();
      const count = rows.length;
      const numSitemaps = Math.ceil(count / ITEMS_PER_SITEMAP);
      // Retorna array de ids: [{ id: 0 }, { id: 1 }, ...]
      return Array.from({ length: Math.max(1, numSitemaps) }, (_, i) => ({ id: i }));
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[sitemap] falló generateSitemaps ids', e);
  }
  return [{ id: 0 }];
}

export default async function sitemap({ id }) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stl-hub.com').replace(/\/$/, '');
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://stl-hub.com')
    .replace(/\/$/, '');
  const now = new Date();
  
  const sitemapId = Number(id || 0);
  const entries = [];

  // Rutas estáticas principales solo en el sitemap de índice 0
  if (sitemapId === 0) {
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
        url: `${base}/suscripcion`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
        alternates: { languages: { 'es-ES': `${base}/suscripcion`, 'en-US': `${base}/en/suscripcion`, 'x-default': `${base}/suscripcion` } },
      },
      {
        url: `${base}/en/suscripcion`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.4,
        alternates: { languages: { 'es-ES': `${base}/suscripcion`, 'en-US': `${base}/en/suscripcion`, 'x-default': `${base}/suscripcion` } },
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
      }
    );
  }

  // Obtener y segmentar los slugs
  try {
    const res = await fetch(`${apiBase}/api/assets/slugs`, { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } });
    if (res.ok) {
      const rows = await res.json();
      
      const start = sitemapId * ITEMS_PER_SITEMAP;
      const end = start + ITEMS_PER_SITEMAP;
      const chunk = rows.slice(start, end);

      for (const r of chunk) {
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
    if (process.env.NODE_ENV !== 'production') console.warn(`[sitemap] falló fetch slugs para id ${sitemapId}`, e);
  }

  return entries;
}