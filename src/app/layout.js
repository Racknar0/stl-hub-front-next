// src/app/layout.jsx
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/bundle.scss";
import "./globals.css";
import LangSetter from "./LangSetter";
import { GoogleTagManager } from '@next/third-parties/google';
import { DM_Sans, Syne, Outfit, Montserrat, Poppins } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-outfit',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

const SITE_URL = 'https://stl-hub.com';

export async function generateMetadata() {
  // Metadata estática en español (Google no envía cookies,
  // siempre verá la versión ES — que es la principal para SEO)
  const title = "Modelos 3D y STL Gratis y Premium para Impresión | Descargar por MEGA – STL HUB";
  const description = "Descarga STL gratis y premium listos para imprimir: modelos 3D, props y piezas de cosplay. Enlaces directos por MEGA gratis, descargas rápidas, previews y archivos optimizados para FDM y resina.";
  const keywords = [
    'descargar stl gratis','descargar stl por mega gratis','descarga stl','modelos 3d imprimir','stl mega','stl free','archivos stl gratis','modelos 3d cosplay','stl premium','stl resin','stl fdm'
  ];

  const pathname = "/";

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/`,
      languages: {
        "es-ES": `${SITE_URL}/`,
        "en-US": `${SITE_URL}/en/`,
        "x-default": `${SITE_URL}/`,
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
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title: "Modelos 3D y STL Gratis y Premium — STL HUB",
      description,
      siteName: "STL HUB",
      type: "website",
      locale: "es_ES",
      url: `${SITE_URL}/`,
      images: ["/logo_horizontal.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Modelos 3D y STL Gratis y Premium — STL HUB",
      description,
    },
    keywords,
  };
}

export default function RootLayout({ children }) {
  // NO llamar headers() aquí — convierte TODAS las páginas en dinámicas
  // con Cache-Control: private,no-store, bloqueando la indexación de Google.
  // LangSetter (client component) ya actualiza el lang del <html> dinámicamente.
  const htmlLang = 'es';

  return (
    <html lang={htmlLang} className={`${dmSans.variable} ${syne.variable} ${outfit.variable} ${montserrat.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <LangSetter />
        {/* Meta keywords fallback for some crawlers */}
        <meta name="keywords" content="descargar stl gratis, descargar stl por mega gratis, stl mega, free stl download, 3d models" />
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'STL HUB',
              url: SITE_URL,
              potentialAction: {
                '@type': 'SearchAction',
                target: SITE_URL + '/search?q={search_term_string}',
                'query-input': 'required name=search_term_string'
              },
              description: 'Descargar STL gratis y premium por MEGA. Modelos 3D listos para imprimir (FDM y resina).'
            })
          }}
        />
      </head>
      <body>
        {children}
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
      </body>
    </html>
  );
}
