export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://stl-hub.com";
  const now = new Date();
  return [
    {
      url: `${base}/`,
      lastModified: now,
      alternates: {
        languages: {
          "es-ES": `${base}/`,
          "en-US": `${base}/en`,
          "x-default": `${base}/`,
        },
      },
    },
    {
      url: `${base}/en`,
      lastModified: now,
      alternates: {
        languages: {
          "es-ES": `${base}/`,
          "en-US": `${base}/en`,
          "x-default": `${base}/`,
        },
      },
    },
    // si /suscripcion es indexable:
    {
      url: `${base}/suscripcion`,
      lastModified: now,
      alternates: {
        languages: {
          "es-ES": `${base}/suscripcion`,
          "en-US": `${base}/en/suscripcion`,
          "x-default": `${base}/suscripcion`,
        },
      },
    },
  ];
}