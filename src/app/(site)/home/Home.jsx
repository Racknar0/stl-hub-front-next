'use client';
import React, { useEffect, useState } from 'react';
import './Home.scss';
import Hero from '../../../components/home/Hero/Hero';
import SectionRow from '../../../components/home/SectionRow/SectionRow';
import FeatureSection from '../../../components/home/FeatureSection/FeatureSection';
import Testimonials from '../../../components/home/Testimonials/Testimonials';
import PricingInline from '../../../components/home/PricingInline/PricingInline';
import AssetModal from '../../../components/common/AssetModal/AssetModal';
// import GlobalLoader from '../../../components/common/GlobalLoader/GlobalLoader'; // eliminado, ahora vive en Header
import HttpService from '../../../services/HttpService';
import useStore from '../../../store/useStore';

// Categorías fijas
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

// Selección determinista de chips para evitar diferencias SSR/CSR
const chipsForIndex = (i) => [
  CATEGORIES[i % CATEGORIES.length],
  CATEGORIES[(i + 3) % CATEGORIES.length],
  CATEGORIES[(i + 7) % CATEGORIES.length],
];

const mockRow = (seed, n = 10) =>
  Array.from({ length: n }).map((_, i) => ({
    id: `${seed}-${i}`,
    title: `Item ${i + 1}`,
    chips: chipsForIndex(i),
    thumb: `https://picsum.photos/seed/${seed}-${i}/600/400`,
    images: [
      `https://picsum.photos/seed/${seed}-${i}-a/1000/600`,
      `https://picsum.photos/seed/${seed}-${i}-b/1000/600`,
      `https://picsum.photos/seed/${seed}-${i}-c/1000/600`,
    ],
    downloadUrl: '#',
  }));

const Home = () => {
  const http = new HttpService();
  const setGlobalLoading = useStore((s)=>s.setGlobalLoading);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);
  const [subscribed, setSubscribed] = useState(false); // toggle para ver estados
  const [latest, setLatest] = useState([]);
  const [top, setTop] = useState([]);

  const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
  const imgUrl = (rel) => {
    if (!rel) return ''
    const clean = String(rel)
      .trim()
      .replace(/\\/g, '/') // backslashes -> slashes
      .replace(/^\/+/, '') // quitar slashes iniciales
    return `${UPLOAD_BASE}/${clean}`
  }

  useEffect(() => {
    const load = async () => {
      setGlobalLoading(true);
      // activar tiempo 2 segundos mínimo para ver loader
      await new Promise(r => setTimeout(r, 1000));
      try {
        const res = await http.getData('/assets/latest?limit=20');
        const items = (res.data || []).map(a => ({
          id: a.id,
          title: a.title,
          chips: Array.isArray(a.tags) ? a.tags.slice(0,3) : [],
          thumb: a.images?.[0] ? imgUrl(a.images[0]) : '/vite.svg',
          images: (a.images || []).slice(0,3).map(imgUrl),
          downloadUrl: a.megaLink || '#',
          category: a.category,
          isPremium: !!a.isPremium,
        }));
        setLatest(items);

        const resTop = await http.getData('/assets/top?limit=19');
        const topItems = (resTop.data || []).map(a => ({
          id: a.id,
          title: a.title,
          chips: Array.isArray(a.tags) ? a.tags.slice(0,3) : [],
          thumb: a.images?.[0] ? imgUrl(a.images[0]) : '/vite.svg',
          images: (a.images || []).slice(0,3).map(imgUrl),
          downloadUrl: a.megaLink || '#',
          category: a.category,
          isPremium: !!a.isPremium,
        }));
        setTop(topItems);
      } catch (e) {
        setLatest([]);
        setTop([]);
      } finally {
        setGlobalLoading(false);
      }
    };
    load();
  }, []);

  const handleOpen = (asset) => { setModalAsset(asset); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setModalAsset(null); };

  return (
    <div>
      {/* <GlobalLoader /> */}
      <Hero />

      <FeatureSection
        title="Últimas novedades"
        subtitle="Descubre los últimos enlaces"
        ctaLabel="Ver más"
        items={latest}
        onItemClick={handleOpen}
      />

      <SectionRow
        title="Lo más descargado"
        items={top}
        onItemClick={handleOpen}
      />
      <SectionRow title="Figuras" items={mockRow('figuras', 12)} onItemClick={handleOpen} />
      <SectionRow
        title="Mugs"
        items={mockRow('cosplay', 12)}
        onItemClick={handleOpen}
      />
      <SectionRow
        title="Religion"
        items={mockRow('terrain', 12)}
        onItemClick={handleOpen}
      />

      <Testimonials />

      {/* Sección de planes como en /suscripcion */}
      <PricingInline />

      {/* Toggle rápido para ver estilos suscriptor/no suscriptor */}
      <div className="container-narrow" style={{margin:'1rem 0'}}>
        <label style={{display:'inline-flex', alignItems:'center', gap:'.5rem'}}>
          <input type="checkbox" checked={subscribed} onChange={(e)=>setSubscribed(e.target.checked)} />
          Simular usuario suscrito
        </label>
      </div>

      {/* Modal */}
      <AssetModal open={modalOpen} onClose={handleClose} asset={modalAsset} subscribed={subscribed} />
    </div>
  );
};

export default Home;
