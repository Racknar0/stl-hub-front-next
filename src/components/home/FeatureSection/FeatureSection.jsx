'use client';

import React, { useTransition } from 'react';
import Button from '../../layout/Buttons/Button';
import './FeatureSection.scss';
// Reutilizamos el spinner del loader global (estilos)
import '../../common/GlobalLoader/GlobalLoader.scss';
import CardImageSlider from '../../common/CardImageSlider/CardImageSlider';
import CardSkeleton from '../../common/CardSkeleton/CardSkeleton';
// Slider
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { useI18n } from '../../../i18n';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';
import { isAssetNSFW } from '../../../helpers/nsfwHelper';
import useStore from '../../../store/useStore';

const FeatureSection = ({
    title,
    subtitle,
    ctaLabel,
    items = [],
    onItemClick,
    variantClass = '',
    isEn: isEnProp,
}) => {
    const resolvedLanguage = useResolvedLanguage();
    const isEn = isEnProp !== undefined ? isEnProp : resolvedLanguage === 'en';
    const { t } = useI18n(isEn ? 'en' : 'es');
    const finalTitle = title || t('sliders.feature.title');
    const finalSubtitle = subtitle || t('sliders.feature.subtitle');
    const finalCta = ctaLabel || t('sliders.feature.cta');
    // Anónimos: ocultar completamente cards NSFW (no solo blur) para proteger cuentas de anuncios
    const token = useStore((s) => s.token);
    const list = token ? items : items.filter((it) => !isAssetNSFW(it));
    const showLoader = !Array.isArray(list) || list.length === 0;
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

    const handleCtaClick = (e) => {
        e.preventDefault();
        startTransition(() => {
            router.push(isEn ? '/en/search' : '/search');
        });
    };

    return (
        <section className={`feature-section ${variantClass}`.trim()}>
            <div className="container-narrow" style={{
                maxWidth: "97%"
            }}>
                <div className="panel">
                    <div className="panel-inner">
                        <div className="intro">
                            <div className="intro-header">
                                <h2 className="intro-title">{finalTitle}</h2>
                                <Link
                                  href={isEn ? '/en/search' : '/search'}
                                  onClick={handleCtaClick}
                                  className="view-all-link view-all-link--latest"
                                  style={isPending ? { pointerEvents: 'none', opacity: 0.8 } : undefined}
                                >
                                  <span>{isPending ? (isEn ? 'Loading...' : 'Cargando...') : finalCta}</span>
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
                            </div>
                            <p className="intro-subtitle">{finalSubtitle}</p>
                        </div>

                                                {/* Slider de cards o loader mientras carga */}
                                                {showLoader ? (
                                                    <div className="cards-skeleton-row">
                                                        {Array.from({ length: 4 }).map((_, idx) => (
                                                            <CardSkeleton key={idx} />
                                                        ))}
                                                    </div>
                                                ) : (
                          <Swiper
                              className="cards"
                              modules={[Navigation]}
                              navigation
                              key={`len-${list.length}`}
                              slidesPerView="auto"
                              spaceBetween={12}
                              grabCursor
                              loop={list.length > 1}
                              loopAdditionalSlides={Math.min(4, list.length)}
                              touchStartPreventDefault={false}
                              touchReleaseOnEdges={true}
                          >
                              {list.map((it, index) => {
                                  const safeThumb = typeof it.thumb === 'string' && it.thumb ? encodeURI(it.thumb) : '/vite.svg';
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
                                  const rawDate = it.createdAt; // solo usamos createdAt del backend
                                  const uploadDate = formatUploadDate(rawDate);
                                  return (
                                      <SwiperSlide key={`${it.id}-${index}`}>
                                          <article className="fcard" onClick={() => onItemClick?.(it)}>
                                              <div className="thumb">
                                                   <CardImageSlider
                                                       images={it.images}
                                                       fallback={safeThumb}
                                                       alt={it.title || 'asset'}
                                                       sizes="(max-width: 992px) 88vw, 240px"
                                                       className="thumb-img"
                                                       isAdult={isAssetNSFW(it)}
                                                       priority={index < 4}
                                                   />
                                              </div>
                                              {it.chips && it.chips.length > 0 && (
                                                  <div className="chips">
                                                      {it.chips.map((c, idx) => (
                                                          <Link
                                                            className="chip chip--link"
                                                            key={idx}
                                                            href={isEn ? `/en/search?tags=${encodeURIComponent((it.tagSlugs||[])[idx] ?? c)}` : `/search?tags=${encodeURIComponent((it.tagSlugs||[])[idx] ?? c)}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                          >
                                                            #{c}
                                                          </Link>
                                                      ))}
                                                  </div>
                                              )}
                                              <div className="finfo">
                                                    <div className="ftitle">
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
                                                          <div className="fmeta" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
                                                              {uploadDate && <span>upload · {uploadDate}</span>}
                                                              {it.slug && (
                                                                  <Link
                                                                      href={it.detailUrl || (isEn ? `/en/asset/${it.slug}` : `/asset/${it.slug}`)}
                                                                      onClick={(e)=>{ e.stopPropagation(); }}
                                                                      className="detail-link-btn"
                                                                      aria-label={`Ver detalle del modelo STL ${it.title || ''} para descargar`}
                                                                  >
                                                                      {isEn ? 'detail' : 'detalle'}
                                                                      <span className="sr-only">{`Modelo 3D ${it.title || ''} STL gratis`}</span>
                                                                  </Link>
                                                              )}
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          </article>
                                      </SwiperSlide>
                                  );
                              })}
                                                    </Swiper>
                                                )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeatureSection;
