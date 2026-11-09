// Datos y utilidades compartidas por el índice (/sitemap.xml) y los archivos
// de sitemap (/sitemaps/pages.xml, /sitemaps/assets-N.xml).
//
// Todo es dinámico: el número de archivos sale del total de assets publicados
// que devuelve el backend, así que no hay que tocar nada al publicar más.

// Assets por archivo. Cada asset aporta 2 URLs (ES + EN), así que un archivo
// lleva como mucho 10.000 URLs: muy por debajo del tope de 50.000 URLs / 50 MB.
// No cambiar a la ligera: cambia qué asset cae en qué archivo.
export const ASSETS_PER_SITEMAP = 5000;

// Cada cuánto se vuelve a preguntar al backend.
export const SITEMAP_REVALIDATE_SECONDS = 3600;

export function siteBase() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://stlgratis.com').replace(/\/$/, '');
}

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://stlgratis.com').replace(/\/$/, '');
}

/** Total de assets publicados e indexables. Lanza si el backend falla. */
export async function fetchPublishedAssetCount() {
  const res = await fetch(`${apiBase()}/api/assets/slugs/count`, {
    next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`slugs/count respondió ${res.status}`);
  const data = await res.json();
  const count = Number(data?.count);
  if (!Number.isFinite(count) || count < 0) throw new Error('slugs/count devolvió un valor inválido');
  return count;
}

/**
 * Tramo de assets de un archivo. Orden fijo por id ascendente para que un
 * asset no cambie de archivo cuando se publican otros. Lanza si el backend falla.
 */
export async function fetchAssetChunk(index) {
  const offset = index * ASSETS_PER_SITEMAP;
  const url = `${apiBase()}/api/assets/slugs?limit=${ASSETS_PER_SITEMAP}&offset=${offset}&sortBy=id&order=asc`;
  const res = await fetch(url, { next: { revalidate: SITEMAP_REVALIDATE_SECONDS } });
  if (!res.ok) throw new Error(`slugs respondió ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error('slugs devolvió un formato inesperado');
  return rows.filter((r) => r?.slug);
}

export function sitemapFileCount(assetCount) {
  return Math.ceil(assetCount / ASSETS_PER_SITEMAP);
}

/** Páginas fijas, con su pareja ES/EN. */
export function staticPageEntries() {
  const base = siteBase();
  const pair = (es, en) => [
    { loc: es, es, en },
    { loc: en, es, en },
  ];
  return [
    ...pair(`${base}/`, `${base}/en`),
    ...pair(`${base}/modelos-3d-gratis`, `${base}/en/free-3d-models`),
    { loc: `${base}/suscripcion`, es: `${base}/suscripcion`, en: `${base}/en/suscripcion` },
  ];
}

/** Las dos URLs (ES y EN) de cada asset, cada una declarando a la otra. */
export function assetEntries(rows) {
  const base = siteBase();
  const entries = [];
  for (const r of rows) {
    const slug = encodeURIComponent(r.slug);
    const es = `${base}/asset/${slug}`;
    const en = `${base}/en/asset/${slug}`;
    const lastmod = toLastmod(r.updatedAt);
    entries.push({ loc: es, es, en, lastmod }, { loc: en, es, en, lastmod });
  }
  return entries;
}

function toLastmod(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** <urlset> con hreflang; los mismos valores que declara el HTML de cada página. */
export function buildUrlsetXml(entries) {
  const parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  for (const e of entries) {
    const es = xmlEscape(e.es);
    const en = xmlEscape(e.en);
    parts.push(
      '<url>',
      `<loc>${xmlEscape(e.loc)}</loc>`,
      `<xhtml:link rel="alternate" hreflang="es-ES" href="${es}" />`,
      `<xhtml:link rel="alternate" hreflang="en-US" href="${en}" />`,
      `<xhtml:link rel="alternate" hreflang="x-default" href="${es}" />`,
    );
    if (e.lastmod) parts.push(`<lastmod>${e.lastmod}</lastmod>`);
    parts.push('</url>');
  }
  parts.push('</urlset>');
  return parts.join('\n');
}

export function buildSitemapIndexXml(urls) {
  const parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const u of urls) parts.push(`<sitemap><loc>${xmlEscape(u)}</loc></sitemap>`);
  parts.push('</sitemapindex>');
  return parts.join('\n');
}

export function xmlResponse(xml) {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': `public, max-age=0, s-maxage=${SITEMAP_REVALIDATE_SECONDS}`,
    },
  });
}

/**
 * Si el backend falla NO se devuelve un sitemap vacío con 200 (Google lo
 * tomaría como "ya no hay URLs"): se responde 503 para que reintente luego.
 */
export function unavailableResponse() {
  return new Response('Sitemap temporalmente no disponible', {
    status: 503,
    headers: { 'Retry-After': '600', 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

export function notFoundResponse() {
  return new Response('Not found', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
