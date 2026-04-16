"use client";

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useStore from '../../../../store/useStore';
import HttpService from '../../../../services/HttpService';
import { errorAlert, warningAlert } from '../../../../helpers/alerts';
import styles from './AssetSeoBackground.module.css';

export default function AssetDownloadCtaClient({ assetId, isPremium = false, isEn = false }) {
  const token = useStore((s) => s.token);
  const router = useRouter();
  const pathname = usePathname();
  const [downloading, setDownloading] = useState(false);

  const http = useMemo(() => new HttpService(), []);

  const label = downloading
    ? (isEn ? 'Preparing...' : 'Preparando...')
    : (isPremium ? (isEn ? 'Download (Premium)' : 'Descargar (Premium)') : (isEn ? 'Download' : 'Descargar'));

  const hint = isPremium
    ? (isEn ? 'Premium content requires login and an active plan.' : 'El contenido premium requiere login y plan activo.')
    : (isEn ? 'Free download available now.' : 'Descarga gratuita disponible ahora.');

  const openWindowSafely = () => {
    const win = window.open('about:blank', '_blank');
    return win || null;
  };

  const goToLogin = () => {
    const redirect = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
    router.push(`/login${redirect}`);
  };

  const handleDownload = async () => {
    if (!assetId || downloading) return;

    if (isPremium && !token) {
      await warningAlert(
        isEn ? 'Login required' : 'Login requerido',
        isEn
          ? 'You need to log in to download premium assets.'
          : 'Debes iniciar sesión para descargar assets premium.'
      );
      goToLogin();
      return;
    }

    setDownloading(true);
    const tmpWin = openWindowSafely();

    try {
      const r = await http.postData(`/assets/${assetId}/request-download`, {});
      const link = r?.data?.link;

      if (link) {
        if (tmpWin) {
          tmpWin.location = link;
        } else {
          window.open(link, '_blank');
        }
        return;
      }

      if (tmpWin) {
        try { tmpWin.close(); } catch {}
      }
      await errorAlert(
        isEn ? 'Download unavailable' : 'Descarga no disponible',
        isEn ? 'Could not generate the download link.' : 'No se pudo generar el enlace de descarga.'
      );
    } catch (err) {
      if (tmpWin) {
        try { tmpWin.close(); } catch {}
      }

      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      if (status === 401 || (isPremium && !token)) {
        await warningAlert(
          isEn ? 'Login required' : 'Login requerido',
          isEn
            ? 'You need to log in to continue.'
            : 'Debes iniciar sesión para continuar.'
        );
        goToLogin();
        return;
      }

      if (status === 403 && (code === 'NO_SUB' || code === 'EXPIRED')) {
        await warningAlert(
          isEn ? 'Premium access required' : 'Acceso premium requerido',
          isEn
            ? 'You need an active subscription to download this premium asset.'
            : 'Necesitas una suscripción activa para descargar este asset premium.'
        );
        return;
      }

      await errorAlert(
        isEn ? 'Download error' : 'Error de descarga',
        isEn
          ? 'An unexpected error occurred while requesting the download.'
          : 'Ocurrió un error inesperado al solicitar la descarga.'
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={styles.heroActions}>
      <button
        type="button"
        className={`${styles.downloadCta} ${isPremium ? styles.downloadCtaPremium : styles.downloadCtaFree}`}
        onClick={handleDownload}
        disabled={downloading}
        aria-label={label}
        title={label}
      >
        <span className={styles.downloadIcon} aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span>{label}</span>
      </button>
      <p className={styles.downloadHint}>{hint}</p>
    </div>
  );
}
