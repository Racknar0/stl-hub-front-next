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
    ? "Premium STL downloads via MEGA | 3D models & cosplay – STL HUB"
    : "Descargar STL premium vía MEGA | Modelos 3D y cosplay – STL HUB";

  const description = isEn
    ? "Download premium STL files ready to print: 3D models, cosplay props and more. Direct MEGA links, previews, and files optimized for FDM and resin printers."
    : "Descarga archivos STL premium listos para imprimir: modelos 3D, props y piezas de cosplay. Enlaces directos por MEGA, previews y archivos optimizados para FDM y resina.";

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
      </head>
      <body>{children}</body>
    </html>
  );
}
