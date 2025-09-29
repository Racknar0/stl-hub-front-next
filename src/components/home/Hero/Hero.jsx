'use client';

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import './Hero.scss';
import { useI18n } from '../../../i18n';

const Hero = () => {
    const { get } = useI18n();
    const slides = get('hero.slides', []);
    return (
        <section className="hero-iron">
            <Swiper
                modules={[Autoplay, Pagination, Navigation]}
                autoplay={{
                    delay: 3500,
                    pauseOnMouseEnter: true,
                    disableOnInteraction: false,
                }}
                pagination={{ clickable: true }}
                navigation
                loop
            >
                {slides.map((s) => (
                    <SwiperSlide key={s.id}>
                        <article
                            className="slide"
                            style={{ backgroundImage: `url(${s.image})` }}
                        >
                            <div className="overlay" />
                            <div className="content container-narrow">
                                <h1 className="hero-title">{s.title}</h1>
                                <p className="hero-subtitle">{s.subtitle}</p>
                                {s.cta ? (
                                    <button className="btn-pill fill hero-cta">
                                        {s.cta}
                                    </button>
                                ) : null}
                            </div>
                        </article>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
};

export default Hero;
