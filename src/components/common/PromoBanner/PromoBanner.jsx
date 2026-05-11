'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePromo } from '@/hooks/usePromo';
import useStore from '@/store/useStore';
import { useI18n } from '@/i18n';
import './PromoBanner.scss';

export default function PromoBanner() {
  const promo = usePromo();
  const token = useStore((s) => s.token);
  const { t } = useI18n();
  const language = useStore((s) => s.language);
  const isEn = String(language || 'es').toLowerCase() === 'en';
  const [dismissed, setDismissed] = useState(false);

  if (!promo.active || dismissed) return null;

  // If user is already logged in, show a different message
  const isLoggedIn = !!token;

  return (
    <div className="promo-banner">
      <div className="promo-banner__content">
        <span className="promo-banner__icon">🎉</span>
        <span className="promo-banner__text">
          {isLoggedIn
            ? (isEn
              ? '🚀 Launch Promo active! Download ALL models for free while it lasts.'
              : '🚀 ¡Promo de Lanzamiento activa! Descarga TODOS los modelos gratis mientras dure.')
            : (isEn
              ? '🚀 Launch Promo! Sign up free and download ALL premium models at no cost.'
              : '🚀 ¡Promo de Lanzamiento! Regístrate gratis y descarga TODOS los modelos premium sin costo.')
          }
          {promo.daysLeft && (
            <span className="promo-banner__days">
              {isEn ? ` (${promo.daysLeft} days left)` : ` (${promo.daysLeft} días restantes)`}
            </span>
          )}
        </span>
        {!isLoggedIn && (
          <Link href="/register" className="promo-banner__cta">
            {isEn ? 'Create account' : 'Crear cuenta'}
          </Link>
        )}
      </div>
      <button className="promo-banner__close" onClick={() => setDismissed(true)} aria-label="Close">
        ✕
      </button>
    </div>
  );
}
