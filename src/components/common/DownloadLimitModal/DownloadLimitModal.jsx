'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Button from '../../layout/Buttons/Button';
import './DownloadLimitModal.scss';

export default function DownloadLimitModal({
  isOpen,
  onClose,
  kind = 'limit-free',
  nextReset = null,
  limit = 50,
  isEn = false
}) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState('00:00:00');

  // Countdown timer logic
  useEffect(() => {
    if (!isOpen || !nextReset) return;

    const tick = () => {
      const diff = new Date(nextReset).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        onClose?.(); // Close or trigger reload on expiration
        return;
      }

      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isOpen, nextReset, onClose]);

  // Escape key close listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape' && kind !== 'not-auth') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, kind, onClose]);

  const handleAction = (url) => {
    onClose?.();
    const targetUrl = isEn ? `/en${url}` : url;
    router.push(targetUrl);
  };

  if (!isOpen) return null;

  // Bilingual content matrix
  const content = {
    'not-auth': {
      title: isEn ? 'Join the Creator Community!' : '¡Únete a la comunidad de creadores!',
      description: isEn
        ? 'You are one step away from downloading this model. Create a free account in 10 seconds to access daily downloads, save your favorites, and manage your collection.'
        : 'Estás a un paso de descargar este modelo. Crea una cuenta gratuita en 10 segundos para acceder a descargas diarias, guardar tus favoritos y gestionar tu colección.',
      icon: (
        <svg className="modal-icon neon-cyan" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      primaryBtnText: isEn ? 'Create Free Account' : 'Crear Cuenta Gratis',
      primaryBtnUrl: '/register',
      secondaryBtnText: isEn ? 'I have an account, Log In' : 'Ya tengo cuenta, Iniciar Sesión',
      secondaryBtnUrl: '/login'
    },
    'limit-free': {
      title: isEn ? 'Daily Download Limit Reached!' : '¡Límite de descargas alcanzado por hoy!',
      description: isEn
        ? `You have used your ${limit} free downloads for today. Your limit will automatically reset in:`
        : `Has utilizado tus ${limit} descargas gratuitas del día. Tu límite se reiniciará automáticamente en:`,
      upsell: isEn
        ? 'Don\'t want to wait? Become a Premium member today to get up to 500 daily downloads, high-speed priority downloads, and exclusive support.'
        : '¿No quieres esperar? Conviértete en miembro Premium hoy mismo para obtener hasta 500 descargas diarias, descargas prioritarias de alta velocidad y soporte exclusivo.',
      icon: (
        <svg className="modal-icon neon-purple" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      primaryBtnText: isEn ? '👑 View Premium Plans' : '👑 Ver Planes Premium',
      primaryBtnUrl: '/suscripcion',
      secondaryBtnText: isEn ? 'Understood, I\'ll wait' : 'Entendido, esperaré'
    },
    'limit-premium': {
      title: isEn ? 'Security Limit Reached' : 'Límite diario de seguridad alcanzado',
      description: isEn
        ? `You have completed your ${limit} downloads for today. This security limit protects server bandwidth and prevents unauthorized account sharing. Your quota will reset in:`
        : `Has completado tus ${limit} descargas del día de hoy. Este límite de seguridad protege el ancho de banda del servidor y previene el uso compartido no autorizado de cuentas. Tu cuota diaria se reiniciará en:`,
      upsell: isEn
        ? 'If you believe this is an error or need a higher limit for production, please contact support.'
        : 'Si consideras que esto es un error o necesitas un límite mayor para producción, por favor contacta con soporte.',
      icon: (
        <svg className="modal-icon neon-blue" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      primaryBtnText: isEn ? 'Understood' : 'Entendido',
      action: onClose
    },
    'no-sub': {
      title: isEn ? 'Premium Access Required' : 'Acceso Premium Requerido',
      description: isEn
        ? 'To download models limitlessly, join our premium club. Get unlimited downloads and access the highest quality STL files on the market.'
        : 'Para descargar modelos ilimitadamente, únete a nuestro club premium. Consigue descargas sin límites y accede a los archivos STL de mejor calidad del mercado.',
      icon: (
        <svg className="modal-icon neon-purple" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          <path d="M3 20h18v2H3z" />
        </svg>
      ),
      primaryBtnText: isEn ? '👑 View Premium Plans' : '👑 Ver Planes Premium',
      primaryBtnUrl: '/suscripcion',
      secondaryBtnText: isEn ? '🎁 Claim Daily Gifts' : '🎁 Reclamar Regalos del Día',
      secondaryBtnUrl: '/freebies'
    },
    'expired': {
      title: isEn ? 'Subscription Expired' : 'Suscripción Vencida',
      description: isEn
        ? 'Your premium period has ended. Renew your plan to restore full access to high-speed downloads and the entire catalog.'
        : 'Tu periodo premium ha finalizado. Renueva tu plan para recuperar acceso completo a descargas de alta velocidad y a todo el catálogo.',
      icon: (
        <svg className="modal-icon neon-gold" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
      primaryBtnText: isEn ? '⚡ Renew Now' : '⚡ Renovar Ahora',
      primaryBtnUrl: '/suscripcion',
      secondaryBtnText: isEn ? 'Close' : 'Cerrar'
    },
    'error': {
      title: isEn ? 'Download Error' : 'Error de descarga',
      description: isEn
        ? 'An unexpected error occurred while requesting the download. Please try again or contact support.'
        : 'Ocurrió un error inesperado al solicitar la descarga. Por favor intenta de nuevo o contacta con soporte.',
      icon: (
        <svg className="modal-icon neon-red" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
      primaryBtnText: isEn ? 'Close' : 'Cerrar',
      action: onClose
    }
  };

  const activeContent = content[kind] || content['error'];

  return (
    <>
      <div
        className="dl-limit-modal modal fade show"
        style={{ display: 'block' }}
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && kind !== 'not-auth') onClose?.();
        }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content dl-limit-modal__content">
            <div className="topbar">
              <span className="brand">STL Hub</span>
              {kind !== 'not-auth' && (
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Cerrar"
                  onClick={onClose}
                />
              )}
            </div>

            <div className="simple-body">
              <div className="icon-container">
                {activeContent.icon}
              </div>

              <h2 className="title">{activeContent.title}</h2>
              <p className="description">{activeContent.description}</p>

              {/* Countdown display for limits */}
              {nextReset && (kind === 'limit-free' || kind === 'limit-premium') && (
                <div className="countdown-box">
                  <span className="countdown-label">{isEn ? 'Reset in:' : 'Reinicio en:'}</span>
                  <span className="countdown-time">{timeLeft}</span>
                </div>
              )}

              {activeContent.upsell && (
                <p className="upsell-text">{activeContent.upsell}</p>
              )}

              <div className="modal-actions">
                {activeContent.primaryBtnText && (
                  <Button
                    onClick={() => {
                      if (activeContent.action) {
                        activeContent.action();
                      } else if (activeContent.primaryBtnUrl) {
                        handleAction(activeContent.primaryBtnUrl);
                      }
                    }}
                    variant={kind.startsWith('limit') || kind === 'no-sub' || kind === 'expired' ? 'purple' : 'cyan'}
                    width="100%"
                    height="48px"
                  >
                    {activeContent.primaryBtnText}
                  </Button>
                )}

                {activeContent.secondaryBtnText && (
                  <button
                    type="button"
                    className="btn-sec"
                    onClick={() => {
                      if (activeContent.secondaryBtnUrl) {
                        handleAction(activeContent.secondaryBtnUrl);
                      } else {
                        onClose?.();
                      }
                    }}
                  >
                    {activeContent.secondaryBtnText}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
