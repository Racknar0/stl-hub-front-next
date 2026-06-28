'use client'

import React from 'react'
import Link from 'next/link'
import Button from '../Buttons/Button'
import './SubscribeBar.scss'
import useStore from '@/store/useStore'
import axiosInstance from '@/services/AxiosInterceptor'
import { usePromo } from '@/hooks/usePromo'
import useResolvedLanguage from '@/hooks/useResolvedLanguage'


const SubscribeBar = () => {

  const resolvedLanguage = useResolvedLanguage();
    const token = useStore((s) => s.token);
  const isEn = resolvedLanguage === 'en';
    const promo = usePromo();

    const [daysRemaining, setDaysRemaining] = React.useState(null);
    const [checkedSubscription, setCheckedSubscription] = React.useState(false);
    const [clientReady, setClientReady] = React.useState(false);

    React.useEffect(() => { setClientReady(true); }, []);

    React.useEffect(() => {
      let cancelled = false;

      const readProfile = async () => {
        if (!token) {
          if (cancelled) return;
          setDaysRemaining(null);
          setCheckedSubscription(true);
          return;
        }

        setCheckedSubscription(false);
        try {
          const res = await axiosInstance.get('/me/profile');
          const rawDays = Number(res?.data?.subscription?.daysRemaining ?? 0);
          if (cancelled) return;
          setDaysRemaining(Number.isFinite(rawDays) ? rawDays : 0);
        } catch {
          if (cancelled) return;
          setDaysRemaining(0);
        } finally {
          if (cancelled) return;
          setCheckedSubscription(true);
        }
      };

      readProfile();
      return () => { cancelled = true; };
    }, [token]);

    const showForGuest = !token;
    const showForNoDays = !!token && checkedSubscription && Number(daysRemaining || 0) <= 0;
    const showBar = showForGuest || showForNoDays;

    // 🛑 Evitar SSR mismatch e hidratación inconsistente 🛑
    if (!clientReady) return null;
    if (promo.loading) return null;

    // 🚀 Premium Free Pass: always show when promo is active
    if (promo.active) {
      const promoMsg = isEn
        ? '🎉 Premium Free Pass — Sign up and download ALL models for free!'
        : '🎉 Premium Free Pass — ¡Regístrate y descarga TODOS los modelos gratis!';
      const promoMsgLogged = isEn
        ? '🎉 Premium Free Pass active! Download ALL premium models at no cost.'
        : '🎉 ¡Premium Free Pass activo! Descarga TODOS los modelos premium sin costo.';
      
      const hasDays = !!promo.daysLeft;
      const daysText = isEn ? ` (${promo.daysLeft} days left)` : ` (${promo.daysLeft} días restantes)`;
      const limitedText = isEn ? ` (Valid for a limited time)` : ` (Válido por tiempo limitado)`;

      return (
        <div className="subscribe-bar promo-mode" role="region" aria-label="Premium Free Pass">
          <div className="container-narrow subscribe-shell">
            <div className="promo-bar-content">
              <p className="promo-msg">
                {token ? promoMsgLogged : promoMsg}
                {hasDays ? (
                  <span className="promo-days">{daysText}</span>
                ) : (
                  <span className="promo-limited" style={{ color: '#ff6b6b', fontWeight: '800', whiteSpace: 'nowrap' }}>
                    {limitedText}
                  </span>
                )}
              </p>
              {!token && (
                <Button
                  as={Link}
                  href="/register"
                  variant="cyan"
                  className="bar-btn promo-cta-btn"
                  aria-label={isEn ? 'Create account' : 'Crear cuenta'}
                  icon={(
                    <span style={{ marginRight: '2px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center' }}>✨</span>
                  )}
                >
                  {isEn ? 'Create free account' : 'Crear cuenta gratis'}
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // If no promo, use normal subscribe bar visibility rules
    if (!showBar) return null;

    // Normal subscribe mode
    const subscribeMessage = isEn ? 'Subscribe to download without limits!' : '¡Suscríbete para descargar sin límites!';
    const subscribeHref = isEn ? '/en/suscripcion' : '/suscripcion';
    const subscribeCta = isEn ? 'Subscribe' : 'Suscríbete';

    const freeMessage = isEn ? "Don't worry, download our free models" : 'No te preocupes, descarga nuestros modelos gratis';
    const freeHref = isEn ? '/en/free-3d-models' : '/modelos-3d-gratis';
    const freeCta = isEn ? 'See free' : 'Ver gratis';

  return (
    <div className="subscribe-bar" role="region" aria-label={isEn ? 'Subscription and free models' : 'Suscripción y modelos gratis'}>
      <div className="container-narrow subscribe-shell">
        <div className="subscribe-sections">
          <div className="section section-subscribe">
            <p className="msg">{subscribeMessage}</p>
            <Button
              as={Link}
              href={subscribeHref}
              variant="purple"
              className="bar-btn subscribe-btn"
              aria-label={subscribeCta}
              icon={(
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 17.27 18.18 21 16.54 13.97 22 9.24 14.81 8.63 12 2 9.19 8.63 2 9.24 7.46 13.97 5.82 21 12 17.27Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              )}
            >
              {subscribeCta}
            </Button>
          </div>

          <span className="divider" aria-hidden="true" />

          <div className="section section-free">
            <p className="msg">{freeMessage}</p>
            <Button
              as={Link}
              href={freeHref}
              variant="cyan"
              className="bar-btn free-btn"
              aria-label={freeCta}
              icon={(
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            >
              {freeCta}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubscribeBar
