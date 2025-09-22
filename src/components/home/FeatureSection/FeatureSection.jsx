'use client';

import React from 'react';
import Image from 'next/image';
import Button from '../../layout/Buttons/Button';
import './FeatureSection.scss';
// Slider
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

const FeatureSection = ({
    title = 'LANZAMIENTOS EXCLUSIVOS',
    subtitle = 'Diseña tu realidad',
    ctaLabel = 'Ver más',
    items = [],
    onItemClick,
}) => {
    const list = items; // mostrar todos los elementos recibidos
    return (
        <section className="feature-section">
            <div className="container-narrow">
                <div className="panel">
                    <div className="panel-inner">
                        <div className="intro">
                            <h2 className="intro-title">{title}</h2>
                            <p className="intro-subtitle">{subtitle}</p>
                            <Button variant="purple" styles={{
                                width: '200px',
                                height: '50px'
                            }}
                            as="a" href="/search"
                            >
                                {ctaLabel}
                            </Button>
                        </div>

                        {/* Slider de cards */}
                        {list && list.length > 0 ? (
                          <Swiper
                              className="cards"
                              modules={[Navigation]}
                              navigation={{ enabled: true }}
                              key={`len-${list.length}`}
                              slidesPerView="auto"
                              spaceBetween={16}
                              grabCursor
                              loop={list.length > 1}
                              autoplay
                              loopAdditionalSlides={Math.min(4, list.length)}
                          >
                              {list.map((it) => {
                                  const safeThumb = typeof it.thumb === 'string' && it.thumb ? encodeURI(it.thumb) : '/vite.svg';
                                  return (
                                      <SwiperSlide key={it.id}>
                                          <article className="fcard" onClick={() => onItemClick?.(it)}>
                                              <div className="thumb">
                                                  <Image
                                                      src={safeThumb}
                                                      alt={it.title}
                                                      fill
                                                      sizes="(max-width: 992px) 88vw, 240px"
                                                      className="thumb-img"
                                                      priority={false}
                                                  />
                                              </div>
                                              <div className="finfo">
                                                  <div className="ftitle">{it.title}</div>
                                                  <div className="chips">
                                                      {it.chips?.map((c, idx) => (
                                                          <a
                                                            className="chip chip--link"
                                                            key={idx}
                                                            href={`/search?tags=${encodeURIComponent(c)}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                          >
                                                            #{c}
                                                          </a>
                                                      ))}
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
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeatureSection;
