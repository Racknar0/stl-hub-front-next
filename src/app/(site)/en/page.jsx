import React from 'react';
import Home from '../home/Home';

const SITE_URL = 'https://stl-hub.com';

export const metadata = {
  title: 'Download free & premium STL files via MEGA | 3D models & cosplay – STL HUB',
  description:
    'Download free & premium STL files: printable 3D models, cosplay props and more. Direct MEGA links, fast downloads, previews and files optimized for FDM & resin printers.',
  keywords: [
    'stl files','free stl download','3d models','mega stl','cosplay stl',
    'resin printable','fdm printable','3d printing files','free 3d models',
    'download stl mega',
  ],
  // Canonical apunta a ES (idioma primario): así Google no crea duplicado
  alternates: {
    canonical: `${SITE_URL}/`,
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

export default function EnglishHomePage() {
  return <Home />;
}
