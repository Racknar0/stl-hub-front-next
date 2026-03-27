'use client';
import { useEffect } from 'react';

/**
 * Reads the `lang` cookie client-side and sets
 * document.documentElement.lang accordingly.
 * This avoids calling cookies() in the root layout,
 * which would force ALL pages to be dynamic (killing ISR).
 */
export default function LangSetter() {
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)lang=(\w+)/);
    if (match) {
      document.documentElement.lang = match[1];
    }
  }, []);
  return null;
}
