import { headers } from "next/headers";
import FreebiesGame from "./FreebiesGame";
import { buildNoindexMetadata } from "../noindexRouteMetadata";

export async function generateMetadata() {
  let isEn = false;
  try {
    const h = await headers();
    isEn = h.get("x-lang") === "en";
  } catch {}

  const title = isEn
    ? "Daily Freebies Minigame | Roll the Dice – STL HUB"
    : "Minijuego de Regalos del Día | Lanza el Dado – STL HUB";

  return buildNoindexMetadata(isEn ? "/en/freebies" : "/freebies", title);
}

export default function Page() {
  return <FreebiesGame />;
}
