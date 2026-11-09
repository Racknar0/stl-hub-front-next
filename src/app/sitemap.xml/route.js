// Índice de sitemaps: /sitemap.xml
// Lista el archivo de páginas fijas y tantos archivos de assets como hagan
// falta según el total publicado (se recalcula solo, cada hora).
import {
  buildSitemapIndexXml,
  fetchPublishedAssetCount,
  siteBase,
  sitemapFileCount,
  unavailableResponse,
  xmlResponse,
} from '@/lib/sitemapData';

export const dynamic = 'force-dynamic';

export async function GET() {
  let count;
  try {
    count = await fetchPublishedAssetCount();
  } catch (e) {
    console.error('[sitemap] no se pudo obtener el total de assets:', e?.message || e);
    return unavailableResponse();
  }

  const base = siteBase();
  const urls = [`${base}/sitemaps/pages.xml`];
  const files = sitemapFileCount(count);
  for (let i = 0; i < files; i++) urls.push(`${base}/sitemaps/assets-${i}.xml`);

  return xmlResponse(buildSitemapIndexXml(urls));
}
