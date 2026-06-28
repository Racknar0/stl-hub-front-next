import React from 'react';
import FreeModelsClient from './FreeModelsClient';

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
        console.warn('[modelos-3d-gratis] fetch status error:', res.status);
      }
      return { items: [], total: 100 };
    }
    const data = await res.json();
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number.isFinite(data?.total) ? data.total : 100
    };
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[modelos-3d-gratis] fetch exception:', e?.message);
    }
    return { items: [], total: 100 };
  }
}

export async function generateMetadata() {
  const { total } = await fetchFreeModels();
  const title = 'Modelos 3D STL Gratis — Regalos del Día | STLHUB';
  const description = `Descarga archivos STL gratis de calidad premium para impresión 3D FDM y Resina. ${total} modelos nuevos gratis cada 24 horas. ¡Explora los regalos de hoy!`;
  const canonicalUrl = `${SITE}/modelos-3d-gratis`;

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
  const { items, total } = await fetchFreeModels();

  return <FreeModelsClient initialItems={items} totalCount={total} lang="es" />;
}
