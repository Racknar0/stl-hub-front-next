'use client';

import React from 'react';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';
import './Hero.scss';

const Hero = ({ lang }) => {
  const resolvedLang = useResolvedLanguage(lang);
  const isEn = resolvedLang === 'en';

  const desktopImg = isEn ? '/hero/hero-desktop-en.png' : '/hero/hero-desktop-es.png';
  const mobileImg = isEn ? '/hero/hero-mobile-en.png' : '/hero/hero-mobile-es.png';
  const altText = isEn
    ? '+1,000,000 Premium 3D & STL Files - STLHUB'
    : '+1.000.000 de Archivos STL y Modelos 3D - STLHUB';

  return (
    <section className="hero-static-section">
      <div className="hero-banner-container">
        <picture className="hero-banner-picture">
          <source media="(max-width: 767px)" srcSet={mobileImg} />
          <source media="(min-width: 768px)" srcSet={desktopImg} />
          <img
            src={desktopImg}
            alt={altText}
            className="hero-banner-img"
            loading="eager"
            decoding="async"
          />
        </picture>
      </div>
    </section>
  );
};

export default Hero;
