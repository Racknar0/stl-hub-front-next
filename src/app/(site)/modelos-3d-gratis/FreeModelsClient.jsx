'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import CardImageSlider from '../../../components/common/CardImageSlider/CardImageSlider';
import AssetModal from '../../../components/common/AssetModal/AssetModal';
import { isAssetNSFW } from '../../../helpers/nsfwHelper';
import useStore from '../../../store/useStore';
import '../search/search.scss'; // Reutilizar .results-grid y .fcard
import './FreeModels.scss';

const TEXTS = {
  es: {
    home: 'Inicio',
    freeModels: 'Modelos Gratis',
    pageTitle: 'Modelos 3D STL Gratis — Regalos del Día',
    pageDesc: 'Cada 24 horas seleccionamos 100 modelos de nuestro catálogo premium y los liberamos completamente gratis. Aquí tienes los primeros 33 modelos de hoy. ¡Consíguelos antes de que roten a la medianoche!',
    bannerBadge: 'Minijuego Diario',
    bannerTitle: '¡Desbloquea 67 regalos más hoy!',
    bannerDesc: 'Lanza el dado gratis hasta 3 veces al día en nuestro minijuego de regalos diarios para desbloquear dos capas adicionales de modelos premium.',
    bannerBtn: 'Lanzar Dado Ahora',
    bannerCaption: 'Los regalos rotan cada 24 horas a la medianoche.',
    viewDetail: 'Ver detalle',
  },
  en: {
    home: 'Home',
    freeModels: 'Free Models',
    pageTitle: 'Free 3D STL Models — Daily Gifts',
    pageDesc: 'Every 24 hours we select 100 models from our premium catalog and release them completely free. Here are the first 33 models for today. Get them before they rotate at midnight!',
    bannerBadge: 'Daily Minigame',
    bannerTitle: 'Unlock 67 more gifts today!',
    bannerDesc: 'Roll the dice for free up to 3 times a day in our daily gifts minigame to unlock two additional layers of free premium models.',
    bannerBtn: 'Roll Dice Now',
    bannerCaption: 'Gifts rotate every 24 hours at midnight.',
    viewDetail: 'View details',
  }
};

export default function FreeModelsClient({ initialItems = [], lang = 'es' }) {
  const token = useStore((s) => s.token);
  const currentLang = lang === 'en' ? 'en' : 'es';
  const t = TEXTS[currentLang];

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);

  const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
  
  const imgUrl = (rel) => {
    if (!rel) return '';
    const clean = String(rel).trim().replace(/\\/g, '/').replace(/^\/+/, '');
    return `${UPLOAD_BASE}/${clean}`;
  };

  // Mapeamos los modelos al formato del Card y Modal
  const items = useMemo(() => {
    return initialItems.map((a) => {
      const isEn = currentLang === 'en';
      const title = isEn ? (a.titleEn || a.title) : (a.title || a.titleEn);
      const tagsEs = Array.isArray(a.tagsEs) ? a.tagsEs : (Array.isArray(a.tags) ? a.tags : []);
      const tagsEn = Array.isArray(a.tagsEn) ? a.tagsEn : tagsEs;
      const chips = isEn ? tagsEn : tagsEs;
      const images = Array.isArray(a.images) ? a.images : [];
      const thumb = images[0] ? imgUrl(images[0]) : '/vite.svg';
      return {
        id: a.id,
        slug: a.slug,
        isEn,
        detailUrl: isEn ? `/en/asset/${a.slug}` : `/asset/${a.slug}`,
        title,
        description: a.description,
        descriptionEn: a.descriptionEn,
        chips: chips || [],
        thumb,
        images: images.map(imgUrl),
        category: a.category,
        isPremium: !!a.isPremium,
        titleEn: a.titleEn,
        titleEs: a.title,
        chipsEs: tagsEs,
        chipsEn: tagsEn,
        tagSlugs: tagsEs,
        categoryEn: a.categoryEn,
        categories: Array.isArray(a.categories) ? a.categories : [],
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        archiveSizeB: a.archiveSizeB,
        fileSizeB: a.fileSizeB,
      };
    });
  }, [initialItems, currentLang]);

  // Manejadores del modal
  const handleOpenAsset = (asset) => {
    setModalAsset(asset);
    setModalOpen(true);
  };

  const handleCloseAsset = () => {
    setModalOpen(false);
    setModalAsset(null);
  };

  const handlePrevAsset = () => {
    if (!items.length || !modalAsset) return;
    const idx = items.findIndex((a) => a.id === modalAsset.id);
    const prevIdx = (idx - 1 + items.length) % items.length;
    setModalAsset(items[prevIdx]);
  };

  const handleNextAsset = () => {
    if (!items.length || !modalAsset) return;
    const idx = items.findIndex((a) => a.id === modalAsset.id);
    const nextIdx = (idx + 1) % items.length;
    setModalAsset(items[nextIdx]);
  };

  const gamePath = currentLang === 'en' ? '/en/freebies' : '/freebies';
  const loginPath = currentLang === 'en'
    ? `/en/login?returnTo=${encodeURIComponent(gamePath)}`
    : `/login?returnTo=${encodeURIComponent(gamePath)}`;

  const minigameLink = token ? gamePath : loginPath;

  return (
    <main className="free-models-page">
      {/* Breadcrumb */}
      <div className="search-breadcrumb" style={{ maxWidth: '1200px', margin: '0 auto 24px' }}>
        <Link href={currentLang === 'en' ? '/en' : '/'} className="btn btn--purple" style={{ textDecoration: 'none', padding: '0.4rem 0.9rem', fontSize: '0.88rem', borderRadius: '8px' }}>
          {t.home}
        </Link>
        <span className="sep">/</span>
        <h2 className="title" style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
          {t.freeModels}
        </h2>
      </div>

      {/* Header */}
      <section className="free-models-header">
        <h1>{t.pageTitle}</h1>
        <p>{t.pageDesc}</p>
      </section>

      {/* Grid de 33 modelos */}
      <section className="grid-container">
        <div className="results-grid">
          {items.map((it) => (
            <article
              key={it.id}
              className="fcard"
              onClick={() => handleOpenAsset(it)}
            >
              <div className="thumb">
                <CardImageSlider
                  images={it.images}
                  fallback={it.thumb}
                  alt={it.title || 'asset'}
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 240px"
                  className="thumb-img"
                  isAdult={isAssetNSFW(it)}
                  priority={false}
                />
              </div>
              <div className="finfo">
                <div className="ftitle" style={{ fontSize: '0.9rem', height: '2.5rem', overflow: 'hidden' }}>{it.title}</div>
                <div className="fbottom">
                  <div className="chips">
                    {(it.chips || []).slice(0, 3).map((c, i) => (
                      <span key={i} className="chip">
                        #{c}
                      </span>
                    ))}
                  </div>
                  <div className="fmeta" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                    <Link
                      href={it.detailUrl}
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: '600' }}
                    >
                      {t.viewDetail}
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Banner de Llamado a la Acción al Minijuego */}
      <section className="minigame-cta-banner">
        <div className="banner-content">
          <span className="badge">{t.bannerBadge}</span>
          <h2>{t.bannerTitle}</h2>
          <p>{t.bannerDesc}</p>
        </div>
        <div className="banner-actions">
          <Link href={minigameLink} className="play-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Dado SVG icon */}
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2"/>
              <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
              <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
              <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
              <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
              <circle cx="16" cy="8" r="1.5" fill="currentColor"/>
            </svg>
            <span>{t.bannerBtn}</span>
          </Link>
          <p className="btn-caption">{t.bannerCaption}</p>
        </div>
      </section>

      {/* Modal del Asset */}
      {modalAsset && (
        <AssetModal
          open={modalOpen}
          onClose={handleCloseAsset}
          asset={modalAsset}
          descriptionLimit={250}
          onPrev={items.length > 1 ? handlePrevAsset : undefined}
          onNext={items.length > 1 ? handleNextAsset : undefined}
          isEn={currentLang === 'en'}
        />
      )}
    </main>
  );
}
