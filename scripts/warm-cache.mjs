#!/usr/bin/env node
/**
 * ALERTA NO BORRAR ESTE ARCHIVO ES EL QUE CALIENTA LA CACHE DE NEXT.JS
 * warm-cache.mjs
 * Calienta la cache de Next.js visitando las N URLs más recientes.
 * Ejecutar después de cada deploy: node scripts/warm-cache.mjs
 *
 * Uso:
 *   node scripts/warm-cache.mjs              → 2,000 páginas (default)
 *   node scripts/warm-cache.mjs --limit=500  → 500 páginas
 */

const SITE        = process.env.WARM_SITE_URL     || 'https://stl-hub.com';
// IMPORTANTE: la API de slugs debe consultarse al backend directamente (puerto interno).
// Si se usa el dominio público (stl-hub.com/api/...), Cloudflare lo enruta al frontend Next.js
// que NO tiene ese endpoint y devuelve 403. En el VPS siempre usar localhost:3001.
const API         = process.env.WARM_API_URL      || 'http://localhost:3001';
const LIMIT       = Number(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || 2000);
const CONCURRENCY = 10;   // peticiones simultáneas
const DELAY_MS    = 100;  // pausa entre batches (ms) para no saturar el server
const TIMEOUT_MS  = 8000; // timeout por página


async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function warmCache() {
  console.log(`\n🔥 STL HUB — Calentamiento de cache`);
  console.log(`   Sitio:       ${SITE}`);
  console.log(`   API:         ${API}`);
  console.log(`   Límite:      ${LIMIT} páginas`);
  console.log(`   Concurrencia: ${CONCURRENCY} simultáneas\n`);

  // 1. Obtener slugs del backend (más recientes primero)
  let slugs = [];
  try {
    const res = await fetch(`${API}/api/assets/slugs?limit=${LIMIT}`);
    if (!res.ok) throw new Error(`API respondió ${res.status}`);
    const rows = await res.json();
    slugs = rows.map(r => r.slug).filter(Boolean);
    console.log(`📋 ${slugs.length} slugs obtenidos del backend`);
  } catch (err) {
    console.error(`❌ No se pudieron obtener los slugs: ${err.message}`);
    process.exit(1);
  }

  // 2. Visitar páginas en batches
  let done = 0;
  let errors = 0;
  const total = slugs.length;
  const startTime = Date.now();

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = slugs.slice(i, i + CONCURRENCY);

    await Promise.allSettled(
      batch.map(async slug => {
        try {
          const url = `${SITE}/asset/${slug}`;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
          await fetch(url, { signal: controller.signal });
          clearTimeout(timer);
          done++;
        } catch {
          errors++;
        }
      })
    );

    // Log de progreso cada 200 páginas
    if ((i + CONCURRENCY) % 200 === 0 || i + CONCURRENCY >= total) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const pct = Math.min(100, Math.round(((i + CONCURRENCY) / total) * 100));
      console.log(`  ✓ ${Math.min(done + errors, total)}/${total} procesadas (${pct}%) — ${elapsed}s`);
    }

    if (i + CONCURRENCY < total) await sleep(DELAY_MS);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Calentamiento completado en ${elapsed}s`);
  console.log(`   Páginas cacheadas: ${done}`);
  if (errors > 0) console.log(`   Errores/timeouts: ${errors} (ignorados)`);
  console.log(`   Googlebot encontrará estas páginas instantáneas.\n`);
}

warmCache().catch(err => {
  console.error('❌ Error fatal en warm-cache:', err);
  process.exit(1);
});
