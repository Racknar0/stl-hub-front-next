// Server Component — exporta generateMetadata para indexación correcta.
// El contenido visual está en PrivacyPolicyContent.jsx ('use client').
import { headers } from 'next/headers';
import PrivacyPolicyContent from './PrivacyPolicyContent';

const SITE_URL = 'https://stl-hub.com';

export async function generateMetadata() {
  let isEn = false;
  try {
    const h = await headers();
    isEn = h.get('x-lang') === 'en';
  } catch {}

  const titleEs = 'Política de Privacidad | STL HUB';
  const titleEn = 'Privacy Policy | STL HUB';
  const descEs = 'Política de privacidad de STL HUB. Conoce cómo recopilamos, usamos y protegemos tus datos personales en nuestra plataforma de descarga de modelos STL 3D.';
  const descEn = 'STL HUB Privacy Policy. Learn how we collect, use, and protect your personal data on our 3D STL model download platform.';
  const canonicalPath = isEn ? `${SITE_URL}/en/privacy-policy` : `${SITE_URL}/privacy-policy`;

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
        'es-ES': `${SITE_URL}/privacy-policy`,
        'en-US': `${SITE_URL}/en/privacy-policy`,
        'x-default': `${SITE_URL}/privacy-policy`,
      },
    },
    openGraph: {
      title: isEn ? titleEn : titleEs,
      description: isEn ? descEn : descEs,
      url: canonicalPath,
      type: 'website',
      images: [{ url: `${SITE_URL}/logo_horizontal.png` }],
    },
  };
}

export default function Page() {
  return <PrivacyPolicyContent />;
}
