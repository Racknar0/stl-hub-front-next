export const revalidate = 3600;

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stl-hub.com').replace(/\/$/, '');

  // Con el drip-feed, solo necesitamos 1 sitemap
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += `  <sitemap>\n`;
  xml += `    <loc>${base}/sitemap/0.xml</loc>\n`;
  xml += `  </sitemap>\n`;
  xml += '</sitemapindex>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
