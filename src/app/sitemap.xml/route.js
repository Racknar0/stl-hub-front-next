export const revalidate = 3600; // Revalidar el índice cada 1 hora

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stl-hub.com').replace(/\/$/, '');
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://stl-hub.com')
    .replace(/\/$/, '');

  let numSitemaps = 1;
  const ITEMS_PER_SITEMAP = 15000;

  try {
    const res = await fetch(`${apiBase}/api/assets/slugs`, { next: { revalidate } });
    if (res.ok) {
      const rows = await res.json();
      numSitemaps = Math.max(1, Math.ceil(rows.length / ITEMS_PER_SITEMAP));
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[sitemap-index] falló fetch count', e);
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (let i = 0; i < numSitemaps; i++) {
    xml += `  <sitemap>\n`;
    xml += `    <loc>${base}/sitemap/${i}.xml</loc>\n`;
    xml += `  </sitemap>\n`;
  }
  xml += '</sitemapindex>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
