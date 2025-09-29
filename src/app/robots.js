export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://stl-hub.com";
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      // bloquea áreas no indexables
      { userAgent: "*", disallow: ["/account", "/search"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}