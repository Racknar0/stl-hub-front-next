// src/app/layout.jsx
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import "../styles/bundle.scss";
import LangSetter from "./LangSetter";

const SITE_URL = 'https://stl-hub.com';

export async function generateMetadata() {
  // Metadata estática en español (Google no envía cookies,
  // siempre verá la versión ES — que es la principal para SEO)
  const title = "Descargar STL gratis y premium por MEGA | Modelos 3D y cosplay – STL HUB";
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
      canonical: pathname,
      languages: {
        "es-ES": "/",
        "en-US": "/en",
        "x-default": "/", 
      },
    },
    openGraph: {
      title: "STL HUB — Modelos 3D y STL premium (Mega)",
      description,
      siteName: "STL HUB",
      type: "website",
      locale: "es_ES",
      url: pathname,
      images: ["/logo_horizontal.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "STL HUB — Descarga STL premium por Mega",
      description,
    },
    keywords,
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <LangSetter />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Poppins:wght@700;800&display=swap"
          rel="stylesheet"
        />
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
      <body>{children}</body>
    </html>
  );
}
