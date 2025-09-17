'use client';

import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import './Hero.scss';

const slides = [
    {
        id: 1,
        title: 'LOS MEJORES MODELOS 3D',
        subtitle: 'DISEÑA TU REALIDAD',
        cta: 'Explorar',
        image: 'https://picsum.photos/seed/hero1/1600/600',
    },
    {
        id: 2,
        title: 'IMPRIMELO!',
        subtitle: 'NO BUSQUES MÁS',
        cta: 'Ver colección',
        image: 'https://picsum.photos/seed/hero2/1600/600',
    },
    {
        id: 3,
        title: 'MODELOS PREMIUM',
        subtitle: 'VISTA PREVIA INTEGRADA',
        cta: 'Explorar',
        image: 'https://picsum.photos/seed/hero3/1600/600',
    },
];

const Hero = () => {
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
                                <h2 className="hero-title">{s.title}</h2>
                                <p className="hero-subtitle">{s.subtitle}</p>
                                <button className="btn-pill fill hero-cta">
                                    {s.cta}
                                </button>
                            </div>
                        </article>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
};

export default Hero;
