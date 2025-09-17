'use client';

import React from 'react';
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
                            >
                                {ctaLabel}
                            </Button>
                        </div>

                        {/* Slider de cards */}
                        <Swiper
                            className="cards"
                            modules={[Navigation]}
                            navigation
                            slidesPerView="auto"
                            spaceBetween={16}
                            grabCursor
                            watchOverflow
                            autoplay
                            loop
                        >
                            {list.map((it) => (
                                <SwiperSlide key={it.id}>
                                    <article className="fcard" onClick={() => onItemClick?.(it)}>
                                        <div
                                            className="thumb"
                                            style={{
                                                backgroundImage: `url(${it.thumb})`,
                                            }}
                                        />
                                        <div className="finfo">
                                            <div className="ftitle">{it.title}</div>
                                            <div className="chips">
                                                {it.chips?.map((c, idx) => (
                                                    <a className="chip chip--link" key={idx} href={`/tags/${encodeURIComponent(c)}`}>#{c}</a>
                                                ))}
                                            </div>
                                        </div>
                                        <span className="badge" aria-hidden="true">
                                            ✓
                                        </span>
                                    </article>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeatureSection;
