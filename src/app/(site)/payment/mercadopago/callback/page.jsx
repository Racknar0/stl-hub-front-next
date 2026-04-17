'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import HttpService from '@/services/HttpService';

const STATUS_TEXT = {
  success: {
    es: 'Pago aprobado. Estamos activando tu suscripción...',
    en: 'Payment approved. We are activating your subscription...',
  },
  pending: {
    es: 'Tu pago está pendiente. Te avisaremos cuando Mercado Pago lo confirme.',
    en: 'Your payment is pending. We will update your account once Mercado Pago confirms it.',
  },
  error: {
    es: 'No se pudo confirmar el pago. Intenta de nuevo o contacta soporte.',
    en: 'We could not confirm the payment. Please try again or contact support.',
  },
};

export default function MercadoPagoCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = React.useState('loading');
  const [message, setMessage] = React.useState('Procesando tu pago...');

  React.useEffect(() => {
    let cancelled = false;

    const locale = String(searchParams.get('lang') || 'es').toLowerCase();
    const isEn = locale.startsWith('en');

    const paymentId =
      searchParams.get('payment_id') ||
      searchParams.get('collection_id') ||
      searchParams.get('id');

    if (!paymentId) {
      setState('error');
      setMessage(isEn ? STATUS_TEXT.error.en : STATUS_TEXT.error.es);
      return () => {
        cancelled = true;
      };
    }

    const run = async () => {
      try {
        const httpService = new HttpService();
        const response = await httpService.postData('payments/mercadopago/capture', {
          paymentId,
        });

        if (cancelled) return;

        const status = String(response?.data?.status || '').toUpperCase();
        if (status === 'COMPLETED') {
          setState('success');
          setMessage(isEn ? STATUS_TEXT.success.en : STATUS_TEXT.success.es);
          setTimeout(() => {
            router.replace('/account');
          }, 2200);
          return;
        }

        if (status === 'PENDING') {
          setState('pending');
          setMessage(isEn ? STATUS_TEXT.pending.en : STATUS_TEXT.pending.es);
          setTimeout(() => {
            router.replace('/account');
          }, 3200);
          return;
        }

        setState('error');
        setMessage(isEn ? STATUS_TEXT.error.en : STATUS_TEXT.error.es);
      } catch (error) {
        if (cancelled) return;
        console.error('Error confirmando callback de MercadoPago:', error);
        setState('error');
        setMessage(isEn ? STATUS_TEXT.error.en : STATUS_TEXT.error.es);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  const accent =
    state === 'success' ? '#16a34a' : state === 'pending' ? '#f59e0b' : state === 'error' ? '#ef4444' : '#4f46e5';

  return (
    <section
      style={{
        minHeight: '70vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          borderRadius: 16,
          border: '1px solid rgba(148,163,184,0.25)',
          background: 'rgba(15,23,42,0.82)',
          color: '#f8fafc',
          padding: '28px 20px',
          textAlign: 'center',
          boxShadow: '0 18px 46px rgba(2,6,23,0.38)',
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            margin: '0 auto 14px',
            background: accent,
          }}
        />
        <h1 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 900 }}>Mercado Pago</h1>
        <p style={{ margin: 0, lineHeight: 1.45 }}>{message}</p>
      </div>
    </section>
  );
}
