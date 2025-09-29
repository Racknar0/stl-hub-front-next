import { cookies } from "next/headers";
import Suscripcion from "./Suscripcion";


export async function generateMetadata() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "es").toLowerCase();
  const isEn = lang === "en";

  const title = isEn
    ? "Plans & pricing for premium STL | MEGA downloads – STL HUB"
    : "Planes y precios STL premium | Descargas vía MEGA – STL HUB";

  const description = isEn
    ? "Choose a plan to download premium STL via MEGA. Secure checkout, support, and files optimized for FDM and resin. Upgrade or cancel anytime."
    : "Elige tu plan para descargar STL premium por MEGA. Pago seguro, soporte y archivos optimizados para FDM y resina. Cambia o cancela cuando quieras.";

  // Nota: mantengo el mismo slug /suscripcion también en EN
  return {
    title,
    description,
    alternates: {
      canonical: "/suscripcion",
      languages: {
        "es-ES": "/suscripcion",
        "en-US": "/en/suscripcion",
        "x-default": "/suscripcion",    // 👈 añade esto
      },
    },
    openGraph: {
      title,
      description,
      url: isEn ? "/en/suscripcion" : "/suscripcion",
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
