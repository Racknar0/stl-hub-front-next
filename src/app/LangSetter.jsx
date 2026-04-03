'use client';
import { useEffect } from 'react';
import useStore from '../store/useStore';

/**
 * Lee la cookie `lang` inyectada por el middleware (para rutas /en/*)
 * y sincroniza el idioma en Zustand + document.lang.
 * Esto garantiza que todos los componentes cliente (Home, Header, etc.)
 * rendericen en el idioma correcto sin necesidad de reload.
 */
export default function LangSetter() {
  const setLanguage = useStore((s) => s.setLanguage);
  const hydrateLanguage = useStore((s) => s.hydrateLanguage);

  useEffect(() => {
    // Leer cookie lang puesta por el middleware
    const cookieMatch = document.cookie.match(/(?:^|;\s*)lang=(en|es)/);
    const cookieLang = cookieMatch ? cookieMatch[1] : null;

    if (cookieLang) {
      // El middleware declaró el idioma explícitamente (ej: /en/* → lang=en)
      document.documentElement.lang = cookieLang;
      setLanguage(cookieLang);
    } else {
      // Sin cookie de middleware: hidratar desde localStorage (preferencia del usuario)
      hydrateLanguage();
      const stored = localStorage.getItem('lang');
      if (stored) document.documentElement.lang = stored;
    }
  }, [setLanguage, hydrateLanguage]);

  return null;
}
