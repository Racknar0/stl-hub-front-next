import React from 'react';
import Home from './home/Home';

const PAGE_SIZE = 20;

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
}

async function fetchHomeSSR(urlPath) {
  const apiBase = getApiBase();
  const url = `${apiBase}${urlPath}`;
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[home SSR] fetch error:', url, e?.message);
    }
    return null;
  }
}

const shuffleArray = (arr) => {
  const a = Array.isArray(arr) ? [...arr] : [];
  if (a.length <= 1) return a;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export default async function Page() {
  const lang = 'es';

  // 1. Peticiones en paralelo directas en servidor
  const [resLatest, resTopReal, resCats] = await Promise.all([
    fetchHomeSSR('/api/assets/latest?limit=20'),
    fetchHomeSSR('/api/assets/top?limit=20'),
    fetchHomeSSR('/api/categories'),
  ]);

  const latest = Array.isArray(resLatest) ? resLatest : [];
  
  // "Lo más descargado" ordenado de forma real y estable
  const topList = Array.isArray(resTopReal) ? resTopReal : [];
  const top = topList.length ? topList : latest;

  const free = [];

  // Categorías
  const catsRaw = resCats?.items || [];
  const categories = catsRaw.map(c => ({
    id: c.id,
    name: c.name,
    nameEn: c.nameEn || c.name,
    slug: c.slug,
    slugEn: c.slugEn || c.slug
  }));

  // Cargar las primeras 8 categorías para SSR
  const initialCatMap = {};
  const initialCatOrder = [];

  if (categories.length > 0) {
    const slice = categories.slice(0, 8);
    const results = await Promise.allSettled(
      slice.map(cat => fetchHomeSSR(`/api/assets/search?categories=${encodeURIComponent(cat.slug)}&pageIndex=0&pageSize=20`))
    );

    results.forEach((res, idx) => {
      if (res.status === 'fulfilled' && res.value) {
        const items = Array.isArray(res.value.items) ? res.value.items : [];
        if (items.length >= 15) {
          const slug = slice[idx].slug;
          initialCatMap[slug] = items;
          initialCatOrder.push(slug);
        }
      }
    });
  }

  return (
    <Home
      lang={lang}
      initialLatest={latest}
      initialTop={top}
      initialFree={free}
      initialCategories={categories}
      initialCatMap={initialCatMap}
      initialCatOrder={initialCatOrder}
    />
  );
}
