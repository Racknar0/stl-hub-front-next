import { NextResponse } from 'next/server';

// Enlaces cortos propios (stlgratis.com/v/<code>): pide el destino al backend, que cuenta el clic, y redirige.
// Redirección temporal (302) para que cada clic pase por aquí; noindex para que Google no indexe /v/.
export const dynamic = 'force-dynamic';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stlgratis.com').replace(/\/$/, '');

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'https://stlgratis.com').replace(/\/$/, '');
}

function redirectTo(url) {
  const res = NextResponse.redirect(url, 302);
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function GET(req, { params }) {
  const { code } = await params;
  try {
    const res = await fetch(`${apiBase()}/api/s/${encodeURIComponent(code)}`, {
      cache: 'no-store',
      headers: { 'x-visitor-user-agent': req.headers.get('user-agent') || '' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url && /^https?:\/\//i.test(data.url)) return redirectTo(data.url);
    }
  } catch (e) {
    console.error('[SHORT] No se pudo resolver el enlace corto:', e?.message);
  }
  // Código desconocido o backend caído: a la portada
  return redirectTo(`${SITE}/`);
}
