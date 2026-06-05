import React from 'react';
import Home from '../home/Home';

const SITE_URL = 'https://stl-hub.com';
const PAGE_SIZE = 20;

export const metadata = {
  title: 'Download free & premium STL files via MEGA | 3D models & cosplay – STL HUB',
  description:
    'Download free & premium STL files: printable 3D models, cosplay props and more. Direct MEGA links, fast downloads, previews and files optimized for FDM & resin printers.',
  keywords: [
    'stl files','free stl download','3d models','mega stl','cosplay stl',
    'resin printable','fdm printable','3d printing files','free 3d models',
    'download stl mega',
  ],
  alternates: {
    canonical: `${SITE_URL}/en`,
    languages: {
      'es-ES': `${SITE_URL}/`,
      'en-US': `${SITE_URL}/en`,
      'x-default': `${SITE_URL}/`,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'STL HUB — Premium 3D Models & STL Downloads (Mega)',
    description:
      'Download free & premium STL files: printable 3D models, cosplay props and more. Direct MEGA links, fast downloads.',
    siteName: 'STL HUB',
    type: 'website',
    locale: 'en_US',
    url: `${SITE_URL}/en`,
    images: ['/logo_horizontal.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STL HUB — Download Premium STL via Mega',
    description:
      'Download free & premium STL files: printable 3D models, cosplay props and more. Direct MEGA links.',
  },
};

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
}

async function fetchHomeSSR(urlPath) {
  const apiBase = getApiBase();
  const url = `${apiBase}${urlPath}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[home SSR en] fetch error:', url, e?.message);
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

export default async function EnglishHomePage() {
  // 1. Peticiones en paralelo directas en servidor (SSR en inglés)
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

  // Cargar las primeras 4 categorías para SSR
  const initialCatMap = {};
  const initialCatOrder = [];

  if (categories.length > 0) {
    const slice = categories.slice(0, 4);
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
      lang="en"
      initialLatest={latest}
      initialTop={top}
      initialFree={free}
      initialCategories={categories}
      initialCatMap={initialCatMap}
      initialCatOrder={initialCatOrder}
    />
  );
}
