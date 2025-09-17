'use client';
import React, { useEffect } from 'react';
import './AssetModal.scss';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Button from '../../layout/Buttons/Button';

export default function AssetModal({ open, onClose, asset, subscribed = false }) {
  const [isSubscribed, setIsSubscribed] = React.useState(subscribed);
  React.useEffect(() => setIsSubscribed(subscribed), [subscribed]);

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
                  <img className="brand-logo" src="/logo_horizontal_final.png" alt="STL Hub" />

                  <div className="meta-details">
                    <h3 id="asset-modal-title" className="title">{asset.title}</h3>
                    <p className="category"><span>Categoría:</span> {asset.category || asset.categoryName || (asset.chips?.[0] ?? 'General')}</p>

                    {asset.chips?.length ? (
                      <div className="chips center">
                        {asset.chips.map((c, i) => (
                          <a
                            key={i}
                            className="chip chip--link"
                            href={`/tags/${encodeURIComponent(c)}`}
                          >
                            #{c}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="actions center">
                    {isSubscribed ? (
                      <Button as="a" href={asset.downloadUrl || '#'} target="_blank" rel="noreferrer" variant="cyan" className="btn-big">
                        Descargar ahora
                      </Button>
                    ) : (
                      <Button as="a" href="/suscripcion" variant="danger" className="btn-big">
                        Suscríbete para descargar
                      </Button>
                    )}
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
