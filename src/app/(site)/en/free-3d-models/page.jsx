import React from 'react';
import FreeModelsClient from '../../modelos-3d-gratis/FreeModelsClient';

export const revalidate = 3600; // ISR cada 1 hora para sincronizar con la rotación diaria de medianoche

const SITE = 'https://stl-hub.com';

function getApiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
}

async function fetchFreeModels() {
  const apiBase = getApiBase();
  const url = `${apiBase}/api/assets/search?plan=free&pageIndex=0&pageSize=33`;
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[free-3d-models] fetch status error:', res.status);
      }
      return [];
    }
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[free-3d-models] fetch exception:', e?.message);
    }
    return [];
  }
}

export async function generateMetadata() {
  const title = 'Free 3D STL Models — Daily Gifts | STLHUB';
  const description = 'Download premium quality free STL files for FDM and Resin 3D printing. 100 new free models every 24 hours. Explore today\'s free daily gifts!';
  const canonicalUrl = `${SITE}/en/free-3d-models`;

  return {
    title,
    description,
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
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'es-ES': `${SITE}/modelos-3d-gratis`,
        'en-US': `${SITE}/en/free-3d-models`,
        'x-default': `${SITE}/modelos-3d-gratis`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
      siteName: 'STLHUB',
      images: [{ url: `${SITE}/logo_horizontal.png`, width: 1200, height: 630 }],
    },
  };
}

export default async function Page() {
  const items = await fetchFreeModels();

  return <FreeModelsClient initialItems={items} lang="en" />;
}
