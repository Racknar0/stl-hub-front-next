'use client';
import React, { useEffect, useState, useRef } from 'react';
import './AssetModal.scss';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Button from '../../layout/Buttons/Button';
import HttpService from '../../../services/HttpService';
import useStore from '../../../store/useStore';
import { useI18n } from '../../../i18n';
import Link from 'next/link';
import SimplyModal from '../SimplyModal/SimplyModal';
import ReportBrokenModal from '../ReportBrokenModal/ReportBrokenModal';

export default function AssetModal({ open, onClose, asset }) {
  const http = new HttpService();
  const token = useStore((s)=>s.token);
  const language = useStore((s)=>s.language);
  const { t } = useI18n();
  const [downloading, setDownloading] = React.useState(false);
  const [showRenew, setShowRenew] = React.useState(false);
  const [expiredAt, setExpiredAt] = React.useState(null);
  const [reporting, setReporting] = React.useState(false);
  const [showReport, setShowReport] = React.useState(false);

  // Estado local para enriquecer datos (categorías, etc.)
  const [data, setData] = useState(asset);
  const loadedDetail = useRef(false);

  useEffect(() => {
    setData(asset);
    loadedDetail.current = false;
  }, [asset?.id]);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) {
      document.addEventListener('keydown', onEsc);
      document.body.classList.add('modal-open');
    }
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.classList.remove('modal-open');
    };
  }, [open, onClose]);

  // Enriquecer categorías si no vienen
  useEffect(() => {
    if (!open || !data?.id || loadedDetail.current) return;
    const needCategories = !Array.isArray(data?.categories) || data.categories.length === 0;
    if (!needCategories) return;
    (async () => {
      try {
        const res = await http.getData(`/assets/${data.id}`);
        const d = res.data || {};
        setData((prev) => ({
          ...prev,
          categories: Array.isArray(d.categories) ? d.categories : prev?.categories,
          // si vienen traducciones de tags o títulos, podemos incorporarlas
          titleEn: d.titleEn ?? prev?.titleEn,
          tagsEn: Array.isArray(d.tagsEn) ? d.tagsEn : prev?.tagsEn,
          tagsEs: Array.isArray(d.tagsEs) ? d.tagsEs : prev?.tagsEs,
        }));
        loadedDetail.current = true;
      } catch {}
    })();
  }, [open, data?.id]);

  if (!data) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleDownload = async () => {
    try {
      if (!data) return;
      if (data.isPremium && !token) {
        window.location.href = '/suscripcion';
        return;
      }
      setDownloading(true);
      const res = await http.postData(`/assets/${data.id}/request-download`, {});
      const link = res.data?.link;
      if (link) window.open(link, '_blank', 'noopener,noreferrer');
    } catch (e) {
      const status = e?.response?.status;
      const payload = e?.response?.data || {};
      if (status === 401) {
        window.location.href = '/suscripcion';
        return;
      }
      if (status === 403 && payload?.code === 'EXPIRED') {
        setExpiredAt(payload?.expiredAt || null);
        setShowRenew(true);
        return;
      }
      if (status === 403) {
        window.location.href = '/suscripcion';
        return;
      }
    } finally {
      setDownloading(false);
    }
  }

  // Derivar campos según idioma actual
  const isEn = String(language || 'es').toLowerCase() === 'en';
  const displayTitle = isEn ? (data.titleEn || data.title) : (data.title || data.titleEn);

  const isEmptyCategory = (val) => {
    const v = String(val || '').trim().toLowerCase();
    return !v || ['uncategorized','unclassified','general','none','null','undefined'].includes(v);
  };

  const slugify = (txt) => String(txt || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  // Preparar categorías para vista con etiqueta y slug por idioma
  let displayCategories = [];
  if (Array.isArray(data?.categories) && data.categories.length) {
    displayCategories = data.categories
      .map((c) => ({
        id: c?.id,
        label: isEn ? (c?.nameEn || c?.name || c?.slugEn || c?.slug) : (c?.name || c?.nameEn || c?.slug || c?.slugEn),
        slug: isEn ? (c?.slugEn || c?.slug) : (c?.slug || c?.slugEn),
      }))
      .filter((c) => !!c.label);
  } else {
    const rawCat = isEn
      ? (data.categoryEn ?? data.categoryNameEn ?? data.category ?? data.categoryName)
      : (data.category ?? data.categoryName ?? data.categoryEn ?? data.categoryNameEn);
    if (!isEmptyCategory(rawCat)) {
      displayCategories = [{ id: 'legacy', label: rawCat, slug: slugify(rawCat) }];
    }
  }

  const catHref = (c) => {
    if (!c) return '#';
    const s = typeof c === 'string' ? c : (isEn ? (c.slug || c.slugEn) : (c.slug || c.slugEn));
    const q = encodeURIComponent(s || (typeof c !== 'string' ? c.label : c) || '');
    return `/search?categories=${q}`;
  };

  const chipsEs = Array.isArray(data.chipsEs) ? data.chipsEs : (Array.isArray(data.chips) ? data.chips : []);
  const chipsEn = Array.isArray(data.chipsEn) ? data.chipsEn : chipsEs;
  const chips = isEn ? chipsEn : chipsEs;
  const tagSlugs = Array.isArray(data.tagSlugs) ? data.tagSlugs : chipsEs;

  // Estado y handler para "Reportar link caído"
  const showReportButton = (!data?.isPremium) || !!token;
  const handleReportBroken = () => setShowReport(true);

  return (
    <>
      <div
        className={`asset-modal modal fade ${open ? 'show' : ''}`}
        style={{ display: open ? 'block' : 'none' }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-modal-title"
        onMouseDown={handleBackdropClick}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content asset-modal__content">
            <div className="topbar">
              <span className="brand">STL Hub</span>
              {showReportButton && (
                <button
                  type="button"
                  className="report-btn"
                  onClick={handleReportBroken}
                  disabled={reporting}
                  aria-label={isEn ? 'Report broken link' : 'Reportar link caído'}
                  title={isEn ? 'Report broken link' : 'Reportar link caído'}
                >
                  <span aria-hidden>🚩</span>
                  <span>{isEn ? 'Report broken link' : 'Reportar link caído'}</span>
                </button>
              )}
              <button type="button" className="btn-close " aria-label="Cerrar" onClick={onClose} />
            </div>

            <div className="modal-body dialog-body">
              <div className="gallery">
                <Swiper modules={[Navigation, Pagination]} navigation pagination loop>
                  {(data.images || []).slice(0,3).map((src, idx) => (
                    <SwiperSlide key={idx}>
                      <img src={src} alt={`${displayTitle} ${idx+1}`} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>

              <div className="meta">
                <div className="meta-content" style={{ position: 'relative' }}>
                  <img className="brand-logo" src="/nuevo_horizontal.png" alt="STL Hub" />

                  <div className="meta-details">
                    <h3 id="asset-modal-title" className="title">{displayTitle}</h3>

                    {/* Bloque: Categorías */}
                    <div className="meta-block">
                      <div className="block-title">{isEn ? 'Categories' : 'Categorías'}</div>
                      {displayCategories.length ? (
                        <div className="chips center">
                          {displayCategories.map((c) => (
                            <Link
                              key={c.id || c.slug || c.label}
                              className="chip chip--link"
                              href={catHref(c)}
                            >
                              #{c.label}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="chips center">
                          <span className="chip chip--disabled">{isEn ? 'Uncategorized' : 'Sin categoría'}</span>
                        </div>
                      )}
                    </div>

                    {/* Bloque: Tags */}
                    <div className="meta-block" style={{ marginTop: '.75rem' }}>
                      <div className="block-title">{isEn ? 'Tags' : 'Etiquetas'}</div>
                      {chips?.length ? (
                        <div className="chips center">
                          {chips.map((c, i) => (
                            <Link
                              key={i}
                              className="chip chip--link"
                              href={`/search?tags=${encodeURIComponent(tagSlugs[i] ?? c)}`}
                            >
                              #{c}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="chips center">
                          <span className="chip chip--disabled">{isEn ? 'No tags' : 'Sin etiquetas'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="actions center">
                    <Button onClick={handleDownload} disabled={downloading} variant={data.isPremium ? 'purple' : 'cyan'} className="btn-big">
                      {downloading && <span className="btn-spinner" aria-hidden />}
                      {downloading
                        ? t('asset.modal.processing')
                        : (data.isPremium ? t('asset.modal.downloadPremium') : t('asset.modal.downloadNow'))}
                    </Button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {open && <div className="modal-backdrop fade show" />}

      {/* Modal de renovación */}
      {showRenew && (
        <SimplyModal
          open={showRenew}
          onClose={() => setShowRenew(false)}
          // quitamos title para controlar el layout dentro
        >
          <div aria-hidden className="lead-emoji" style={{ fontSize: '2.25rem', marginBottom: '.5rem' }}>😞</div>
          <h3 className="title" style={{ marginBottom: '.5rem' }}>
            {isEn ? 'Your subscription expired' : 'Tu suscripción venció'}
          </h3>
          <p style={{ marginBottom: '1rem' }}>
            {expiredAt
              ? (isEn ? `Expired on ${new Date(expiredAt).toLocaleDateString()}` : `Se venció el ${new Date(expiredAt).toLocaleDateString()}`)
              : (isEn ? 'Please renew to continue downloading.' : 'Por favor renueva para seguir descargando.')}
          </p>
          <div className="actions center" style={{ justifyContent: 'center' }}>
            <Button
              onClick={() => { window.location.href = '/suscripcion'; }}
              variant="purple"
              className="btn-big"
            >
              {isEn ? 'Renew now' : 'Renovar ahora'}
            </Button>
          </div>
        </SimplyModal>
      )}

      {/* Modal de reporte de link caído */}
      <ReportBrokenModal
        open={showReport}
        assetId={data?.id}
        assetTitle={displayTitle}
        onClose={() => setShowReport(false)}
        onSubmitted={() => {
          setShowReport(false);
          window.alert(isEn ? 'Thanks for your report!' : '¡Gracias por tu reporte!');
        }}
      />
    </>
  );
}
  