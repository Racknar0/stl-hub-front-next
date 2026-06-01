import { headers } from "next/headers";
import Suscripcion from "./Suscripcion";


export async function generateMetadata() {
  let isEn = false;
  try {
    const h = await headers();
    isEn = h.get("x-lang") === "en";
  } catch {}

  const title = isEn
    ? "Plans & pricing for premium STL | MEGA downloads – STL HUB"
    : "Planes y precios STL premium | Descargas vía MEGA – STL HUB";

  const description = isEn
    ? "Choose a plan to download premium STL via MEGA. Secure checkout, support, and files optimized for FDM and resin. Upgrade or cancel anytime."
    : "Elige tu plan para descargar STL premium por MEGA. Pago seguro, soporte y archivos optimizados para FDM y resina. Cambia o cancela cuando quieras.";

  const canonicalPath = isEn ? "/en/suscripcion" : "/suscripcion";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "es-ES": "/suscripcion",
        "en-US": "/en/suscripcion",
        "x-default": "/suscripcion",
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "website",
      images: ["/logo_horizontal.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    // si fuera checkout/portal (no indexable), cambia a:
    // robots: { index: false, follow: false },
  };
}

export default function Page() {
  return <Suscripcion />; // Suscripcion.jsx será Client Component
}
