import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const IGNORE = /^\/(_next|api|favicon\.ico|.*\.[a-z0-9]+)$/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (IGNORE.test(pathname)) return NextResponse.next();

  // /en → cookie en y seguimos (la rewrite la hace next.config.js)
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const res = NextResponse.next();
    res.cookies.set('lang', 'en', { path: '/' });
    return res;
  }

  // /es → cookie es y (opcional) redirige a la ruta base sin /es
  if (pathname === '/es' || pathname.startsWith('/es/')) {
    const res = NextResponse.redirect(new URL(pathname.replace(/^\/es/, '') || '/', req.url));
    res.cookies.set('lang', 'es', { path: '/' });
    return res;
  }

  // Resto de rutas (base) → por defecto ES
  const res = NextResponse.next();
  if (!req.cookies.get('lang')) res.cookies.set('lang', 'es', { path: '/' });
  return res;
}

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)'],
};