// Server Component — exporta generateMetadata para indexación correcta.
// El contenido visual está en TermsContent.jsx ('use client').
import { headers } from 'next/headers';
import TermsContent from './TermsContent';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stlgratis.com').replace(/\/$/, '');

export async function generateMetadata() {
  let isEn = false;
  try {
    const h = await headers();
    isEn = h.get('x-lang') === 'en';
  } catch {}

  const titleEs = 'Términos y Condiciones | STL Gratis';
  const titleEn = 'Terms and Conditions | STL Gratis';
  const descEs = 'Términos y condiciones de uso de STL Gratis: naturaleza del servicio, propiedad intelectual, retiro de contenido y uso de los Servicios de la API de YouTube.';
  const descEn = 'STL Gratis Terms and Conditions: nature of the service, intellectual property, takedown policy and use of YouTube API Services.';
  const canonicalPath = isEn ? `${SITE_URL}/en/terms` : `${SITE_URL}/terms`;

  return {
    title: isEn ? titleEn : titleEs,
    description: isEn ? descEn : descEs,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
    alternates: {
      canonical: canonicalPath,
      languages: {
        'es-ES': `${SITE_URL}/terms`,
        'en-US': `${SITE_URL}/en/terms`,
        'x-default': `${SITE_URL}/terms`,
      },
    },
  };
}

export default function Page() {
  return <TermsContent />;
}
