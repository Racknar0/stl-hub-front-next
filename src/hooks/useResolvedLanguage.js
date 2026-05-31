'use client';

import { usePathname } from 'next/navigation';
import useStore from '../store/useStore';

function normalizeLanguage(value) {
  return String(value || '').toLowerCase() === 'en' ? 'en' : 'es';
}

export default function useResolvedLanguage(preferredLanguage) {
  const pathname = usePathname();
  const storeLanguage = useStore((s) => s.language);

  const preferred = normalizeLanguage(preferredLanguage);
  const routeLanguage = String(pathname || '').toLowerCase().startsWith('/en') ? 'en' : 'es';
  const store = normalizeLanguage(storeLanguage);

  if (store === 'en') return 'en';
  if (preferred === 'en') return 'en';
  if (routeLanguage === 'en') return 'en';
  return 'es';
}
