'use client';

import React from 'react';
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
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';
import { isAssetNSFW } from '../../../helpers/nsfwHelper';

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
        const list = items; // ya viene con título según idioma
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
    return (
        <section className={`feature-section ${variantClass}`.trim()}>
            <div className="container-narrow" style={{
                maxWidth: "97%"
            }}>
                <div className="panel">
                    <div className="panel-inner">
                        <div className="intro">
                            <h2 className="intro-title">{finalTitle}</h2>
                            <p className="intro-subtitle">{finalSubtitle}</p>
                            <Button variant="purple" styles={{
                                width: '200px',
                                height: '50px'
                            }}
                            href={isEn ? '/en/search' : '/search'}
                            >
                                {finalCta}
                            </Button>
                        </div>

                                                {/* Slider de cards o loader mientras carga */}
                                                {showLoader ? (
                                                    <div className="cards-skeleton-row" style={{ display: 'flex', gap: 12, overflow: 'hidden', width: '100%' }}>
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
                                              <div className="finfo">
                                                  {/* it.title ya está en el idioma activo */}
                                                  <div className="ftitle">{it.title || '-'}</div>
                                                  <div className="fbottom">
                                                      <div className="chips">
                                                          {it.chips?.map((c, idx) => (
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
                                                      {(uploadDate || it.slug) && (
                                                          <div className="fmeta" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                              {it.slug ? (
                                                                  <Link
                                                                      href={it.detailUrl || (isEn ? `/en/asset/${it.slug}` : `/asset/${it.slug}`)}
                                                                      onClick={(e)=>{ e.stopPropagation(); }}
                                                                      aria-label={`Ver detalle del modelo STL ${it.title || ''} para descargar`}
                                                                      style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 6 }}
                                                                  >
                                                                      {uploadDate && <span>upload · {uploadDate} · detail</span>}
                                                                      <span className="sr-only">{`Modelo 3D ${it.title || ''} STL gratis`}</span>
                                                                  </Link>
                                                              ) : (
                                                                  uploadDate && <span>upload: {uploadDate}</span>
                                                              )}
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                              <span className="badge" aria-hidden="true">
                                                  ✓
                                              </span>
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
