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
    ? '+1,000,000 Free 3D Models & STL Files Ready to Print - STLGratis'
    : '+1.000.000 de Modelos 3D y Archivos STL Gratis para Imprimir - STLGratis';

  const kicker = isEn
    ? 'THE LARGEST AND MOST COMPLETE STL 3D LIBRARY IN THE WORLD'
    : 'LA BIBLIOTECA DE MODELOS 3D Y STL MÁS GRANDE Y COMPLETA';

  const subtitle = isEn
    ? 'Direct download of thousands of free STL files ready for FDM and Resin 3D printing. Find Anime figures, Funkos, Cosplay, Articulated models, and Decor with fast MEGA downloads.'
    : 'Descarga directa de miles de archivos STL gratis y listos para imprimir en impresoras 3D FDM y Resina. Encuentra figuras de Anime, Funkos, Cosplay, Articulados y Decoración con descargas rápidas por MEGA.';

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
