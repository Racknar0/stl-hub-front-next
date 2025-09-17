'use client';
import React from 'react';
import './Home.scss';
import Hero from '../../../components/home/Hero/Hero';
import SectionRow from '../../../components/home/SectionRow/SectionRow';
import FeatureSection from '../../../components/home/FeatureSection/FeatureSection';
import Testimonials from '../../../components/home/Testimonials/Testimonials';
import PricingInline from '../../../components/home/PricingInline/PricingInline';

// Categorías quemadas (de la imagen)
const CATEGORIES = [
  '3DXM Art',
  'Adults',
  'Animals',
  'Anime',
  'Articulated Figures',
  'Ashtrays',
  'B3Dserk Studios Art',
  'Buildings',
  'Cake Toppers',
  'Cartoons',
  'CFD Art',
  'CGTrader Models',
];

const pickChips = (k = 3) => {
  const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, k);
};

const mockRow = (seed, n = 10) =>
  Array.from({ length: n }).map((_, i) => ({
    id: `${seed}-${i}`,
    title: `Item ${i + 1}`,
    chips: pickChips(3),
    thumb: `https://picsum.photos/seed/${seed}-${i}/600/400`,
  }));

const Home = () => {
  return (
    <div>
      <Hero />

      <FeatureSection
        title="Últimas novedades"
        subtitle="Descubre los últimos enlaces"
        ctaLabel="Ver más"
        items={mockRow('feature', 28)}
      />

      <SectionRow
        title="Lo más descargado"
        items={mockRow('latest', 19)}
      />
      <SectionRow title="Figuras" items={mockRow('figuras', 12)} />
      <SectionRow
        title="Mugs"
        items={mockRow('cosplay', 12)}
      />
      <SectionRow
        title="Religion"
        items={mockRow('terrain', 12)}
      />

      <Testimonials />

      {/* Sección de planes como en /suscripcion */}
      <PricingInline />

      
    </div>
  );
};

export default Home;
