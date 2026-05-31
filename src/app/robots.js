export default function robots() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://stl-hub.com").replace(/\/$/, "");
  const disallow = [
    '/admin',
    '/admin/',
    '/dashboard',
    '/dashboard/',
    '/account',
    '/account/',
    '/cuenta',
    '/cuenta/',
    '/login',
    '/register',
    '/forgot-password',
    '/payment-success',
    '/payment/mercadopago/callback',
    '/en/login',
    '/en/register',
    '/en/forgot-password',
    '/en/payment-success',
    '/en/payment/mercadopago/callback',
    '/api/',
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}