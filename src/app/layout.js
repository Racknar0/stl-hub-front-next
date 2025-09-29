import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import "../styles/bundle.scss";

export const metadata = {
  title: "STL HUB — Descarga STL premium por Mega | Modelos 3D, Props y Cosplay",
  description:
    "Descarga STL premium por Mega: modelos 3D, props y piezas de cosplay listos para imprimir. Enlaces Mega directos, previews 3D, archivos .stl optimizados para FDM y resina, compra segura y soporte. Busca STL premium, descarga Mega, modelos 3D imprimibles, cosplay 3D y props para impresión.",
  keywords: [
    'STL premium',
    'descargar STL',
    'Mega.nz',
    'modelos 3D',
    'cosplay 3D',
    'props 3D',
    'archivos .stl',
    'impresión 3D',
    'FDM',
    'resina',
  ],
  authors: [{ name: 'STL HUB' }],
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  openGraph: {
    title: 'STL HUB — Modelos 3D y STL premium (descarga por Mega)',
    description:
      'Descarga STL premium por Mega: modelos 3D, props y piezas de cosplay listos para imprimir. Enlaces directos Mega, previews, compra segura y archivos optimizados para FDM y resina.',
    siteName: 'STL HUB',
    type: 'website',
    locale: 'es_ES',
    // relative path - replace with absolute URL in production if you have one
    images: ['/logo_horizontal.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STL HUB — Descarga STL premium por Mega',
    description:
      'Modelos 3D, props y cosplay listos para imprimir. Enlaces Mega directos y archivos optimizados para impresoras FDM/Resin.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
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
