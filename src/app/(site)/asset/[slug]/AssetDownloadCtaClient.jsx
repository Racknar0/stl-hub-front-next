"use client";

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useStore from '../../../../store/useStore';
import HttpService from '../../../../services/HttpService';
import styles from './AssetSeoBackground.module.css';
import { sendGTMEvent } from '@next/third-parties/google';
import { usePromo } from '../../../../hooks/usePromo';
import DownloadLimitModal from '../../../../components/common/DownloadLimitModal/DownloadLimitModal';

export default function AssetDownloadCtaClient({ assetId, isPremium = false, isEn = false }) {
  const token = useStore((s) => s.token);
  const router = useRouter();
  const pathname = usePathname();
  const [downloading, setDownloading] = useState(false);
  const promo = usePromo();

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState('limit-free');
  const [modalNextReset, setModalNextReset] = useState(null);
  const [modalLimit, setModalLimit] = useState(50);

  const http = useMemo(() => new HttpService(), []);

  const label = downloading
    ? (isEn ? 'Preparing...' : 'Preparando...')
    : (isPremium 
        ? (promo.active ? (isEn ? 'Download (Free Pass) 🎉' : 'Descargar (Free Pass) 🎉') : (isEn ? 'Download (Premium)' : 'Descargar (Premium)')) 
        : (isEn ? 'Download' : 'Descargar'));

  const hint = isPremium
    ? (promo.active 
        ? (isEn ? 'Free Pass is active! Enjoy premium downloads.' : '¡Free Pass activo! Disfruta descargas premium.')
        : (isEn ? 'Premium content requires login and an active plan.' : 'El contenido premium requiere login y plan activo.'))
    : (isEn ? 'Free download available now.' : 'Descarga gratuita disponible ahora.');

  const openWindowSafely = () => {
    const win = window.open('about:blank', '_blank');
    return win || null;
  };

  const handleDownload = async () => {
    if (!assetId || downloading) return;

    sendGTMEvent({ event: 'download_started',
      asset_id: assetId,
      is_premium: isPremium
    });

    if (!token) {
      setModalKind('not-auth');
      setModalNextReset(null);
      setModalOpen(true);
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
      setModalKind('error');
      setModalOpen(true);
    } catch (err) {
      if (tmpWin) {
        try { tmpWin.close(); } catch {}
      }

      const status = err?.response?.status;
      const code = err?.response?.data?.code;

      if (status === 401 || code === 'ANONYMOUS_BLOCKED') {
        setModalKind('not-auth');
        setModalNextReset(null);
        setModalOpen(true);
        return;
      }

      if (status === 403 && (code === 'NO_SUB' || code === 'EXPIRED')) {
        setModalKind(code === 'NO_SUB' ? 'no-sub' : 'expired');
        setModalNextReset(null);
        setModalOpen(true);
        return;
      }

      if (status === 403 && code === 'DAILY_LIMIT_REACHED') {
        const nextReset = err?.response?.data?.nextReset;
        const isSubscribed = err?.response?.data?.isSubscribed;
        const limitVal = err?.response?.data?.limit || (isSubscribed ? 500 : 50);

        setModalKind(isSubscribed ? 'limit-premium' : 'limit-free');
        setModalNextReset(nextReset);
        setModalLimit(limitVal);
        setModalOpen(true);
        return;
      }

      setModalKind('error');
      setModalOpen(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
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

      <DownloadLimitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        kind={modalKind}
        nextReset={modalNextReset}
        limit={modalLimit}
        isEn={isEn}
      />
    </>
  );
}
