'use client';

import React from 'react';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';
import './Hero.scss';

const Hero = ({ lang }) => {
  const resolvedLang = useResolvedLanguage(lang);
  const isEn = resolvedLang === 'en';

  const desktopImg = isEn ? '/hero/hero-desktop-en.png' : '/hero/hero-desktop-es.png';
  const mobileImg = isEn ? '/hero/hero-mobile-en.png' : '/hero/hero-mobile-es.png';

  const h1Title = isEn
    ? '+1,000,000 Premium 3D & STL Files Ready to Print - STLHUB'
    : '+1.000.000 de Archivos STL y Modelos 3D Listos para Imprimir - STLHUB';

  const kicker = isEn
    ? 'THE LARGEST AND MOST AFFORDABLE PREMIUM STL LIBRARY IN THE WORLD'
    : 'LA BIBLIOTECA STL PREMIUM MÁS GRANDE Y BARATA DEL MUNDO';

  const subtitle = isEn
    ? 'Scale your 3D printing business. Explore Anime collectibles, Funkos, Cosplay, Articulated figures, Mounts, and more categories. Find any design instantly with our AI Text and AI Image Search.'
    : 'Multiplica las ventas de tu negocio 3D. Explora coleccionables de Anime, Funkos, Cosplay, Articulados, Soportes y muchas más categorías. Encuentra cualquier diseño al instante con nuestra Búsqueda por IA texto e IA Foto.';

  const badges = isEn
    ? [
        {
          title: 'Guaranteed Weekly Updates',
          desc: 'New verified models added every 7 days',
        },
        {
          title: 'Unique Multimodal AI',
          desc: 'Found a photo you like? Drag it in and our AI will locate it',
        },
        {
          title: 'Smart Search',
          desc: 'Find any STL by describing what you imagine',
        },
        {
          title: '+1,000,000 Files',
          desc: 'Categorized and ready to print for FDM & Resin',
        },
        {
          title: '100% Virus & Scam Free',
          desc: 'Direct, secure downloads via MEGA with no malicious links',
        },
        {
          title: 'Daily Free Gifts',
          desc: 'Free premium 3D models unlocked every 24 hours',
        },
      ]
    : [
        {
          title: 'Actualización Semanal Garantizada',
          desc: 'Nuevos modelos probados cada 7 días',
        },
        {
          title: 'IA Multimodal Única',
          desc: '¿Viste una foto que te gustó? Arrástrala y nuestra IA la localiza para ti',
        },
        {
          title: 'Búsqueda Inteligente',
          desc: 'Encuentra cualquier STL escribiendo lo que imaginas',
        },
        {
          title: '+1.000.000 de Archivos',
          desc: 'Categorizados y listos para imprimir en FDM y Resina',
        },
        {
          title: '100% Libre de Virus y Estafas',
          desc: 'Descargas directas y seguras vía MEGA sin enlaces maliciosos',
        },
        {
          title: 'Regalos Diarios',
          desc: 'Modelos premium liberados 100% gratis cada 24 horas',
        },
      ];

  return (
    <section className="hero-static-section">
      {/* Structural Semantic SEO Headings & Badges (accessible to search crawlers & screen readers, visually hidden) */}
      <div className="sr-only">
        <p>{kicker}</p>
        <h1>{h1Title}</h1>
        <h2>{subtitle}</h2>
        <ul>
          {badges.map((b, idx) => (
            <li key={idx}>
              <strong>{b.title}:</strong> {b.desc}
            </li>
          ))}
        </ul>
      </div>

      {/* Hero Graphical Banner (visible on screen) */}
      <div className="hero-banner-container">
        <picture className="hero-banner-picture">
          <source media="(max-width: 767px)" srcSet={mobileImg} />
          <source media="(min-width: 768px)" srcSet={desktopImg} />
          <img
            src={desktopImg}
            alt={h1Title}
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
