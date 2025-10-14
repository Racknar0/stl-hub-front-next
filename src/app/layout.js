// src/app/layout.jsx
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import "../styles/bundle.scss";
import { cookies } from "next/headers";

// Fuerza dinámico para leer cookies por request
export const dynamic = "force-dynamic";

export async function generateMetadata() {
const cookieStore = await cookies();                 // 👈 await
  const lang = (cookieStore.get("lang")?.value || "es").toLowerCase();
  const isEn = lang === "en";

  const title = isEn
    ? "Premium STL downloads via MEGA | Free & paid 3D models – STL HUB"
    : "Descargar STL gratis y premium por MEGA | Modelos 3D y cosplay – STL HUB";

  const description = isEn
    ? "Download free & premium STL files: printable 3D models, cosplay props and more. Direct MEGA links, fast downloads, previews and files optimized for FDM & resin printers."
    : "Descarga STL gratis y premium listos para imprimir: modelos 3D, props y piezas de cosplay. Enlaces directos por MEGA gratis, descargas rápidas, previews y archivos optimizados para FDM y resina.";

  // Keywords / frases SEO (ES incluye 'descargar stl gratis', 'descargar stl por mega gratis')
  const keywords = isEn
    ? [
        'stl files','free stl download','3d models','mega stl','cosplay stl','resin printable','fdm printable','3d printing files'
      ]
    : [
        'descargar stl gratis','descargar stl por mega gratis','descarga stl','modelos 3d imprimir','stl mega','stl free','archivos stl gratis','modelos 3d cosplay','stl premium','stl resin','stl fdm'
      ];

  const pathname = isEn ? "/en" : "/";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
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
      title: isEn ? "STL HUB — Premium STL (Mega)" : "STL HUB — Modelos 3D y STL premium (Mega)",
      description,
      siteName: "STL HUB",
      type: "website",
      locale: isEn ? "en_US" : "es_ES",
      url: pathname,
      images: ["/logo_horizontal.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: isEn ? "STL HUB — Premium STL via Mega" : "STL HUB — Descarga STL premium por Mega",
      description,
    },
    keywords,
  };
}

export default async  function RootLayout({ children }) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "es").toLowerCase();

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
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
              url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
              potentialAction: {
                '@type': 'SearchAction',
                target: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + '/search?q={search_term_string}',
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
