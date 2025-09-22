'use client';
import React, { useEffect } from 'react';
import './AssetModal.scss';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Button from '../../layout/Buttons/Button';
import HttpService from '../../../services/HttpService';
import useStore from '../../../store/useStore';

export default function AssetModal({ open, onClose, asset, subscribed = false }) {
  const http = new HttpService();
  const token = useStore((s)=>s.token);
  const [downloading, setDownloading] = React.useState(false);

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

  if (!asset) return null;

  const handleBackdropClick = (e) => {
    // cerrar cuando se hace click fuera del diálogo
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleDownload = async () => {
    try {
      if (!asset) return;
      // Si es premium y no hay token, mandar a suscripción/login
      if (asset.isPremium && !token) {
        window.location.href = '/suscripcion';
        return;
      }
      setDownloading(true);
      const res = await http.postData(`/assets/${asset.id}/request-download`, {});
      const link = res.data?.link;
      if (link) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        window.location.href = '/suscripcion';
      }
    } finally {
      setDownloading(false);
    }
  }

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
              <button type="button" className="btn-close btn-close-white close-btn" aria-label="Cerrar" onClick={onClose} />
            </div>

            <div className="modal-body dialog-body">
              <div className="gallery">
                <Swiper modules={[Navigation, Pagination]} navigation pagination loop>
                  {(asset.images || []).slice(0,3).map((src, idx) => (
                    <SwiperSlide key={idx}>
                      <img src={src} alt={`${asset.title} ${idx+1}`} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>

              <div className="meta">
                <div className="meta-content">
                  <img className="brand-logo" src="/nuevo_horizontal.png" alt="STL Hub" />

                  <div className="meta-details">
                    <h3 id="asset-modal-title" className="title">{asset.title}</h3>
                    <p className="category"><span>Categoría:</span> {asset.category || asset.categoryName || (asset.chips?.[0] ?? 'General')}</p>

                    {asset.chips?.length ? (
                      <div className="chips center">
                        {asset.chips.map((c, i) => (
                          <a
                            key={i}
                            className="chip chip--link"
                            href={`/search?tags=${encodeURIComponent(c)}`}
                          >
                            #{c}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="actions center">
                    <Button onClick={handleDownload} disabled={downloading} variant={asset.isPremium ? 'purple' : 'cyan'} className="btn-big">
                      {downloading && <span className="btn-spinner" aria-hidden />}
                      {downloading ? ' Procesando…' : (asset.isPremium ? 'Descargar (Premium)' : 'Descargar ahora')}
                    </Button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {open && <div className="modal-backdrop fade show" />}
    </>
  );
}
