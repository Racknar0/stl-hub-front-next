'use client';

import React, { useTransition } from 'react';
import './SectionRow.scss';
import Button from '../../layout/Buttons/Button';
import CardImageSlider from '../../common/CardImageSlider/CardImageSlider';
import CardSkeleton from '../../common/CardSkeleton/CardSkeleton';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { useI18n } from '../../../i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../common/GlobalLoader/GlobalLoader.scss';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';
import { isAssetNSFW } from '../../../helpers/nsfwHelper';
import useStore from '../../../store/useStore';

const SectionRow = ({ title, subtitle, linkLabel, linkHref, items = [], onItemClick, loading = false, variantClass = '', priority = false, isEn: isEnProp }) => {
  const resolvedLanguage = useResolvedLanguage();
  const isEn = isEnProp !== undefined ? isEnProp : resolvedLanguage === 'en';
  const { t } = useI18n(isEn ? 'en' : 'es');
  const finalLinkLabel = linkLabel || t('sliders.row.more');
  // Anónimos: ocultar completamente cards NSFW (no solo blur) para proteger cuentas de anuncios
  const token = useStore((s) => s.token);
  const visibleItems = token ? items : items.filter((it) => !isAssetNSFW(it));
  const Spinner = ({ size = 36 }) => (
    <div className="sk-circle" style={{ width: size, height: size }}>
      <div className="sk-circle1 sk-child" />
      <div className="sk-circle2 sk-child" />
      <div className="sk-circle3 sk-child" />
      <div className="sk-circle4 sk-child" />
      <div className="sk-circle5 sk-child" />
      <div className="sk-circle6 sk-child" />
      <div className="sk-circle7 sk-child" />
      <div className="sk-circle8 sk-child" />
      <div className="sk-circle9 sk-child" />
      <div className="sk-circle10 sk-child" />
      <div className="sk-circle11 sk-child" />
      <div className="sk-circle12 sk-child" />
    </div>
  );
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLinkClick = (e) => {
    e.preventDefault();
    startTransition(() => {
      router.push(linkHref);
    });
  };

  const showLoader = loading || !Array.isArray(visibleItems) || visibleItems.length === 0;
  return (
    <section className={`section-row ${variantClass}`.trim()}>
      <div className="container-narrow" style={{
                maxWidth: "98%"
            }}>
        <div className="header">
          <div className="title-wrapper">
            <h3>{title}</h3>
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          </div>
          {/* Botón Ver más opcional */}
          {linkHref ? (
            <Link 
              href={linkHref} 
              onClick={handleLinkClick}
              className="view-all-link"
              style={isPending ? { pointerEvents: 'none', opacity: 0.8 } : undefined}
            >
              <span>{isPending ? (isEn ? 'Loading...' : 'Cargando...') : finalLinkLabel}</span>
              {isPending ? (
                <svg className="button-spinner" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ display: 'inline-block' }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" style={{ opacity: 0.25 }} />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="arrow-icon">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              )}
            </Link>
          ) : null}
        </div>
        {showLoader ? (
          <div className="cards-skeleton-row">
            {Array.from({ length: 4 }).map((_, idx) => (
              <CardSkeleton key={idx} />
            ))}
          </div>
        ) : (
          <Swiper
            className="row-slider"
            modules={[Navigation]}
            navigation
            slidesPerView="auto"
            spaceBetween={12}
            watchOverflow
            observer
            observeParents
            touchStartPreventDefault={false}
            touchReleaseOnEdges={true}
          >
            {visibleItems.map((it, index) => {
              const formatUploadDate = (raw) => {
                if (!raw) return null;
                const d = new Date(raw);
                if (isNaN(d.getTime())) return null;
                const dd = String(d.getDate()).padStart(2, '0');
                const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
                const mmm = months[d.getMonth()];
                const yyyy = d.getFullYear();
                return `${dd}-${mmm}-${yyyy}`;
              };
              const uploadDate = formatUploadDate(it.createdAt);
              const cardHref = it.detailUrl || (isEn ? `/en/asset/${it.slug}` : `/asset/${it.slug}`);
              return (
                <SwiperSlide key={it.id}>
                  {/* SEO: Link nativo envuelve toda la card para que Googlebot pueda rastrear /asset/[slug].
                      onClick intercepta el click del usuario para abrir el modal sin navegar. */}
                  <Link
                    href={cardHref}
                    className="card-item"
                    onClick={(e) => {
                      if (!it.slug) return;
                      e.preventDefault();
                      onItemClick?.(it);
                    }}
                    aria-label={`${it.title || 'Modelo STL'} — ver detalle`}
                  >
                    <div className="thumb">
                      <CardImageSlider
                        images={it.images}
                        fallback={it.thumb}
                        alt={it.title || 'asset'}
                        sizes="(max-width: 992px) 88vw, 240px"
                        className="thumb-img"
                        isAdult={isAssetNSFW(it)}
                        priority={index < 4 && priority}
                      />
                    </div>
                    {it.chips && it.chips.length > 0 && (
                      <div className="chips">
                        {it.chips.map((c, idx) => (
                          <span
                            className="chip chip--link"
                            key={idx}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.location.href = isEn
                                ? `/en/search?tags=${encodeURIComponent((it.tagSlugs||[])[idx] ?? c)}`
                                : `/search?tags=${encodeURIComponent((it.tagSlugs||[])[idx] ?? c)}`;
                            }}
                          >
                            #{c}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="info">
                      <div className="title">
                        {(() => {
                          if (!it.title) return '-';
                          const match = it.title.match(/^(\s*STL\s*-\s*)(.*)$/i);
                          if (match) {
                            const rest = match[2];
                            const capitalized = rest.charAt(0).toUpperCase() + rest.slice(1);
                            return (
                              <>
                                <span className="sr-only">{match[1]}</span>
                                <span>{capitalized}</span>
                              </>
                            );
                          }
                          return it.title.charAt(0).toUpperCase() + it.title.slice(1);
                        })()}
                      </div>
                      <div className="fbottom">
                        {(uploadDate || it.slug) && (
                          <div className="fmeta" aria-hidden="true" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
                            {uploadDate && <span>upload · {uploadDate}</span>}
                            {it.slug && (
                              <span
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  router.push(cardHref);
                                }}
                                className="detail-link-btn"
                                style={{ cursor: 'pointer' }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Ver detalle de ${it.title || ''}`}
                              >
                                {isEn ? 'detail' : 'detalle'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}
      </div>
    </section>
  );
};

export default SectionRow;
