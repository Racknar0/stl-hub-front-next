import { Suspense } from 'react';
import SearchClient from './searchClient';
import { headers } from 'next/headers';
import styles from './searchLoading.module.scss';

export const dynamic = 'force-dynamic'; // Siempre SSR, nunca cache estático

const SITE = 'https://stl-hub.com';
const PAGE_SIZE = 48;

async function getRequestLanguage() {
  try {
    const h = await headers();
    return h.get('x-lang') === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
}

async function fetchSearchSSR(params) {
  const apiBase = getApiBase();
  const url = new URL(`${apiBase}/api/assets/search`);

  if (params.q) url.searchParams.set('q', params.q);
  if (params.categories) url.searchParams.set('categories', params.categories);
  if (params.tags) url.searchParams.set('tags', params.tags);
  if (params.order) url.searchParams.set('order', params.order);
  if (params.plan) url.searchParams.set('plan', params.plan);
  if (params.is_ai_search) url.searchParams.set('is_ai_search', params.is_ai_search);
  url.searchParams.set('pageIndex', String(params.pageIndex || '0'));
  url.searchParams.set('pageSize', String(PAGE_SIZE));

  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[search SSR] fetch error', e?.message);
    return null;
  }
}

function buildTitle(params, isEn) {
  const parts = [];
  if (params.q) parts.push(params.q);
  if (params.tags) parts.push(params.tags.split(',').slice(0, 3).join(', '));
  if (params.categories) parts.push(params.categories.split(',').slice(0, 2).join(', '));

  const label = parts.length > 0 ? parts.join(' — ') : (isEn ? 'Catalog' : 'Catálogo');

  if (params.plan === 'free') {
    return isEn
      ? `${label} — Free STL Files for 3D Printing | STLHUB`
      : `${label} — Archivos STL Gratis para Impresión 3D | STLHUB`;
  }

  return isEn
    ? `${label} — STL Models Free Download | STLHUB`
    : `${label} — Modelos STL Descarga Gratis | STLHUB`;
}

function buildDescription(params, total, isEn) {
  const q = params.q || '';
  const count = Number(total || 0);

  if (q && count > 0) {
    return isEn
      ? `Download ${count}+ free STL files for "${q}". Ready for FDM and resin 3D printers. Browse and download on STLHUB.`
      : `Descarga ${count}+ archivos STL gratis de "${q}". Listos para impresoras 3D FDM y resina. Navega y descarga en STLHUB.`;
  }

  if (q) {
    return isEn
      ? `Search results for "${q}" on STLHUB. Free STL files for 3D printing.`
      : `Resultados de búsqueda para "${q}" en STLHUB. Archivos STL gratis para impresión 3D.`;
  }

  return isEn
    ? `Browse thousands of free STL files for 3D printing on STLHUB. Download models for FDM and resin printers.`
    : `Explora miles de archivos STL gratis para impresión 3D en STLHUB. Descarga modelos para impresoras FDM y resina.`;
}

function SearchSuspenseFallback({ isEn }) {
  return (
    <section className={styles.loadingWrap} aria-busy="true" aria-live="polite" aria-label={isEn ? 'Loading search results' : 'Cargando resultados de busqueda'}>
      <div className={styles.loadingContainer}>
        <div className={styles.loadingTopBar} />

        <div className={styles.loadingHeader}>
          <div className={styles.loadingChip} />
          <div className={styles.loadingTitle} />
        </div>

        <div className={styles.loadingGrid}>
          {Array.from({ length: 8 }).map((_, index) => (
            <article className={styles.loadingCard} key={index} aria-hidden="true">
              <div className={styles.loadingThumb} />
              <div className={styles.loadingMeta}>
                <div className={`${styles.loadingLine} ${styles.loadingLineWide}`} />
                <div className={`${styles.loadingLine} ${styles.loadingLineShort}`} />
              </div>
            </article>
          ))}
        </div>

        <div className={styles.loadingStatus}>
          <span className={styles.loadingSpinner} aria-hidden="true" />
          <span>{isEn ? 'Preparing results...' : 'Preparando resultados...'}</span>
        </div>
      </div>
    </section>
  );
}

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const pageIndexNumber = Math.max(0, parseInt(String(sp?.pageIndex ?? '0'), 10) || 0);
  const params = {
    q: sp?.q || '',
    categories: sp?.categories || '',
    tags: sp?.tags || '',
    order: sp?.order || '',
    plan: sp?.plan || '',
    is_ai_search: sp?.is_ai_search || '',
    image_search: sp?.image_search || '',
    pageIndex: String(pageIndexNumber),
  };

  const requestLanguage = await getRequestLanguage();
  const isEn = requestLanguage === 'en';

  // Fetch para obtener el total de resultados (para la meta description)
  const data = await fetchSearchSSR(params);
  const total = Number(data?.total || 0);
  const pageItemsCount = Array.isArray(data?.items) ? data.items.length : 0;
  const isAiFallback = data?.aiFallback === true;
  const isAiSearch = params.is_ai_search === 'true';
  const isImageSearch = params.image_search === 'true';
  const isFirstPage = pageIndexNumber === 0;

  const title = buildTitle(params, isEn);
  const description = buildDescription(params, total, isEn);

  const baseSearchPath = isEn ? `${SITE}/en/search` : `${SITE}/search`;

  // Indexamos solo la raíz limpia del catálogo y la primera página de filtros con resultados reales.
  // Esto evita crawl traps (pageIndex profundo, búsquedas por imagen/IA y fallback de sugerencias).
  const isCatalogRoot = !params.q && !params.categories && !params.tags;
  const canIndexFilteredFirstPage =
    !isCatalogRoot &&
    isFirstPage &&
    pageItemsCount > 0 &&
    !isAiFallback;

  const shouldIndex =
    !isAiSearch &&
    !isImageSearch &&
    ((isCatalogRoot && isFirstPage) || canIndexFilteredFirstPage);

  const useBaseCanonicalOnly =
    isAiSearch ||
    isImageSearch ||
    isAiFallback ||
    (!isCatalogRoot && pageItemsCount === 0);

  const canonicalParams = new URLSearchParams();
  if (!useBaseCanonicalOnly) {
    if (params.q) canonicalParams.set('q', params.q);
    if (params.categories) canonicalParams.set('categories', params.categories);
    if (params.tags) canonicalParams.set('tags', params.tags);

    // No canonicalizamos páginas profundas no indexables.
    if (shouldIndex && pageIndexNumber > 0) {
      canonicalParams.set('pageIndex', String(pageIndexNumber));
    }
  }

  const canonicalQuery = canonicalParams.toString();
  const canonicalUrl = canonicalQuery
    ? `${baseSearchPath}?${canonicalQuery}`
    : baseSearchPath;

  return {
    title,
    description,
    robots: {
      index: shouldIndex,
      follow: true,
      googleBot: {
        index: shouldIndex,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
      siteName: 'STLHUB',
    },
  };
}

export default async function Page({ searchParams }) {
  const requestLanguage = await getRequestLanguage();

  const sp = await searchParams;
  const params = {
    q: sp?.q || '',
    categories: sp?.categories || '',
    tags: sp?.tags || '',
    order: sp?.order || '',
    plan: sp?.plan || '',
    is_ai_search: sp?.is_ai_search || '',
    image_search: sp?.image_search || '',
    pageIndex: sp?.pageIndex || '0',
  };

  // Skip SSR fetch for image searches (those rely on Zustand client state)
  let ssrData = null;
  if (params.image_search !== 'true') {
    ssrData = await fetchSearchSSR(params);
  }

  const initialItems = ssrData?.items || [];
  const initialTotal = ssrData?.total || 0;
  const initialHasMore = ssrData?.hasMore ?? false;
  const initialAiFallback = ssrData?.aiFallback ?? false;
  const initialSuggestions = ssrData?.suggestions || [];

  return (
    <Suspense fallback={<SearchSuspenseFallback isEn={requestLanguage === 'en'} />}>
      <SearchClient
        key={JSON.stringify(params)}
        initialLang={requestLanguage}
        initialParams={params}
        initialItems={initialItems}
        initialTotal={initialTotal}
        initialHasMore={initialHasMore}
        initialAiFallback={initialAiFallback}
        initialSuggestions={initialSuggestions}
      />
    </Suspense>
  );
}