// Archivos de sitemap:
//   /sitemaps/pages.xml      → páginas fijas
//   /sitemaps/assets-N.xml   → assets N*5000 … N*5000+4999 (ES + EN)
import {
  assetEntries,
  buildUrlsetXml,
  fetchAssetChunk,
  notFoundResponse,
  staticPageEntries,
  unavailableResponse,
  xmlResponse,
} from '@/lib/sitemapData';

export const dynamic = 'force-dynamic';

// Tope de seguridad para no aceptar índices absurdos (2000 archivos = 10 M de assets).
const MAX_FILE_INDEX = 2000;

export async function GET(_request, { params }) {
  const { file } = await params;

  if (file === 'pages.xml') {
    return xmlResponse(buildUrlsetXml(staticPageEntries()));
  }

  const match = /^assets-(\d{1,4})\.xml$/.exec(String(file || ''));
  if (!match) return notFoundResponse();
  const index = Number(match[1]);
  if (index > MAX_FILE_INDEX) return notFoundResponse();

  let rows;
  try {
    rows = await fetchAssetChunk(index);
  } catch (e) {
    console.error(`[sitemap] no se pudo cargar assets-${index}:`, e?.message || e);
    return unavailableResponse();
  }

  // Un índice más allá del último tramo no existe.
  if (rows.length === 0) return notFoundResponse();

  return xmlResponse(buildUrlsetXml(assetEntries(rows)));
}
