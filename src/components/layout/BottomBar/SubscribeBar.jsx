'use client'

import React from 'react'
import Link from 'next/link'
import Button from '../Buttons/Button'
import './SubscribeBar.scss'
import useStore from '@/store/useStore'
import axiosInstance from '@/services/AxiosInterceptor'


const SubscribeBar = () => {

    const language = useStore((s) => s.language);
    const token = useStore((s) => s.token);
    const isEn = String(language || 'es').toLowerCase() === 'en';

    const [daysRemaining, setDaysRemaining] = React.useState(null);
    const [checkedSubscription, setCheckedSubscription] = React.useState(false);

    React.useEffect(() => {
      let mounted = true;

      const readProfile = async () => {
        if (!token) {
          if (!mounted) return;
          setDaysRemaining(null);
          setCheckedSubscription(true);
          return;
        }

        setCheckedSubscription(false);
        try {
          const res = await axiosInstance.get('/me/profile');
          const rawDays = Number(res?.data?.subscription?.daysRemaining ?? 0);
          if (!mounted) return;
          setDaysRemaining(Number.isFinite(rawDays) ? rawDays : 0);
        } catch {
          if (!mounted) return;
          // Si falla la consulta, mostramos la barra para no perder el CTA.
          setDaysRemaining(0);
        } finally {
          if (!mounted) return;
          setCheckedSubscription(true);
        }
      };

      readProfile();
      return () => {
        mounted = false;
      };
    }, [token]);

    const showForGuest = !token;
    const showForNoDays = !!token && checkedSubscription && Number(daysRemaining || 0) <= 0;
    const showBar = showForGuest || showForNoDays;

    if (!showBar) return null;

    const subscribeMessage = isEn ? 'Subscribe to download without limits!' : '¡Suscríbete para descargar sin límites!';
    const subscribeHref = isEn ? '/en/suscripcion' : '/suscripcion';
    const subscribeCta = isEn ? 'Subscribe' : 'Suscríbete';

    const freeMessage = isEn ? "Don't worry, download our free models" : 'No te preocupes, descarga nuestros modelos gratis';
    const freeHref = isEn ? '/en/search?plan=free' : '/search?plan=free';
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
