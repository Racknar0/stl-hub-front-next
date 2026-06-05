'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useStore from '@/store/useStore';
import HttpService from '@/services/HttpService';
import CardImageSlider from '@/components/common/CardImageSlider/CardImageSlider';
import AssetModal from '@/components/common/AssetModal/AssetModal';
import { isAssetNSFW } from '@/helpers/nsfwHelper';
import useResolvedLanguage from '@/hooks/useResolvedLanguage';
import './FreebiesGame.scss';

const TRANSLATIONS = {
  es: {
    title: "Minijuego de Regalos del Día",
    subtitle: "Lanza el dado hasta 3 veces al día para revelar modelos premium gratuitos.",
    rollsRemaining: "Tiradas restantes hoy: {count}",
    noRollsRemaining: "Ya has completado tus 3 tiradas de hoy. ¡Vuelve mañana!",
    rollDice: "Lanzar Dado",
    rolling: "Lanzando...",
    viewAsset: "Ver detalle",
    layerTitle: "Capa {num} (Tirada {num})",
    sameForAll: "Nota: Los regalos son idénticos para todos los usuarios y rotan cada 24 horas a la medianoche.",
    backToHome: "Volver al Inicio",
    loadingFreebies: "Cargando regalos...",
    premiumOnly: "Premium",
    free: "Gratis",
    errorLoading: "Error al cargar los regalos del día. Por favor, intenta de nuevo.",
    tryAgain: "Reintentar"
  },
  en: {
    title: "Daily Gifts Minigame",
    subtitle: "Roll the dice up to 3 times a day to reveal free premium models.",
    rollsRemaining: "Rolls remaining today: {count}",
    noRollsRemaining: "You have completed your 3 rolls for today. Come back tomorrow!",
    rollDice: "Roll Dice",
    rolling: "Rolling...",
    viewAsset: "View Details",
    layerTitle: "Layer {num} (Roll {num})",
    sameForAll: "Note: Gifts are identical for all users and rotate every 24 hours at midnight.",
    backToHome: "Back to Home",
    loadingFreebies: "Loading gifts...",
    premiumOnly: "Premium",
    free: "Free",
    errorLoading: "Error loading daily gifts. Please try again.",
    tryAgain: "Retry"
  }
};

const FreebiesGame = () => {
  const router = useRouter();
  const token = useStore((s) => s.token);
  const hydrated = useStore((s) => s.hydrated);
  const resolvedLang = useResolvedLanguage();
  const lang = resolvedLang === 'en' ? 'en' : 'es';
  const t = (key, val = '') => {
    let str = TRANSLATIONS[lang][key] || key;
    if (val !== '') {
      str = str.replace(/\{count\}/g, String(val)).replace(/\{num\}/g, String(val));
    }
    return str;
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rollsUsed, setRollsUsed] = useState(0);
  const [rolling, setRolling] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);

  // Redirección si no está autenticado
  useEffect(() => {
    if (hydrated && !token) {
      const targetPath = lang === 'en' ? '/en/freebies' : '/freebies';
      const loginPath = lang === 'en'
        ? `/en/login?returnTo=${encodeURIComponent(targetPath)}`
        : `/login?returnTo=${encodeURIComponent(targetPath)}`;
      router.replace(loginPath);
    }
  }, [hydrated, token, router, lang]);

  // Cargar rollsUsed desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0];
      const key = `stlhub_free_rolls_${today}`;
      const val = localStorage.getItem(key);
      if (val) {
        setRollsUsed(parseInt(val, 10) || 0);
      } else {
        setRollsUsed(0);
      }
    }
  }, []);

  // Fetch de los 100 freebies deterministas
  const loadFreebies = async () => {
    setLoading(true);
    setError(false);
    try {
      const http = new HttpService();
      const res = await http.getData('/assets/search?plan=free&pageIndex=0&pageSize=100');
      const dataItems = Array.isArray(res.data?.items) ? res.data.items : [];
      setItems(dataItems);
    } catch (err) {
      console.error('Error fetching freebies game items:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadFreebies();
    }
  }, [token]);

  // Conversión de formato para CardImageSlider y AssetModal
  const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
  const imgUrl = (rel) => {
    if (!rel) return '';
    const clean = String(rel).trim().replace(/\\/g, '/').replace(/^\/+/, '');
    return `${UPLOAD_BASE}/${clean}`;
  };

  const toCardItem = (a, langCode) => {
    const isEn = langCode === 'en';
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
      chips: (chips || []),
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
  };

  // Dividir freebies en 3 lotes estables
  const chunkFreebies = (all) => {
    const n = all.length;
    if (n === 0) return [[], [], []];
    const size1 = Math.floor(n / 3);
    const size2 = Math.floor(n / 3);
    const chunk1 = all.slice(0, size1);
    const chunk2 = all.slice(size1, size1 + size2);
    const chunk3 = all.slice(size1 + size2);
    return [chunk1, chunk2, chunk3];
  };

  const layers = useMemo(() => {
    const chunks = chunkFreebies(items);
    return chunks.map(chunk => chunk.map(a => toCardItem(a, lang)));
  }, [items, lang]);

  // Lista de todos los assets revelados para el Modal
  const allVisibleAssets = useMemo(() => {
    const revealed = [];
    if (rollsUsed >= 1 && layers[0]) revealed.push(...layers[0].slice(0, 8));
    if (rollsUsed >= 2 && layers[1]) revealed.push(...layers[1].slice(0, 8));
    if (rollsUsed >= 3 && layers[2]) revealed.push(...layers[2].slice(0, 8));
    return revealed;
  }, [layers, rollsUsed]);

  // Manejar lanzamiento de dado
  const handleRoll = () => {
    if (rollsUsed >= 3 || rolling) return;

    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      const nextRoll = rollsUsed + 1;
      setRollsUsed(nextRoll);
      if (typeof window !== 'undefined') {
        const today = new Date().toISOString().split('T')[0];
        const key = `stlhub_free_rolls_${today}`;
        localStorage.setItem(key, String(nextRoll));
      }
    }, 1200);
  };

  // Obtener la rotación 3D estática del cubo según la tirada actual
  const getCubeTransform = () => {
    if (rolling) return '';
    switch (rollsUsed) {
      case 1:
        return 'rotateY(0deg) rotateX(0deg)';
      case 2:
        return 'rotateY(180deg) rotateX(0deg)';
      case 3:
        return 'rotateY(0deg) rotateX(90deg)';
      default:
        // Estado inicial sin tirar: un poco inclinado
        return 'rotateX(-25deg) rotateY(35deg)';
    }
  };

  // Manejadores del Modal
  const handleOpenAsset = (asset) => {
    setModalAsset(asset);
    setModalOpen(true);
  };

  const handleCloseAsset = () => {
    setModalOpen(false);
    setModalAsset(null);
  };

  const handlePrevAsset = () => {
    if (!allVisibleAssets.length || !modalAsset) return;
    const idx = allVisibleAssets.findIndex(a => a.id === modalAsset.id);
    const prevIdx = (idx - 1 + allVisibleAssets.length) % allVisibleAssets.length;
    setModalAsset(allVisibleAssets[prevIdx]);
  };

  const handleNextAsset = () => {
    if (!allVisibleAssets.length || !modalAsset) return;
    const idx = allVisibleAssets.findIndex(a => a.id === modalAsset.id);
    const nextIdx = (idx + 1) % allVisibleAssets.length;
    setModalAsset(allVisibleAssets[nextIdx]);
  };

  if (!hydrated || !token) {
    return (
      <div className="freebies-game-container">
        <div className="loading-container">
          <div className="spinner-bar" />
        </div>
      </div>
    );
  }

  return (
    <div className="freebies-game-container">
      <div className="game-header">
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner-bar" />
          <p>{t('loadingFreebies')}</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <h3>{t('errorLoading')}</h3>
          <button type="button" className="retry-btn" onClick={loadFreebies}>
            {t('tryAgain')}
          </button>
        </div>
      ) : (
        <>
          {/* Panel de Controles y Dado */}
          <div className="game-control-panel">
            <div className="rolls-counter">
              <span className="counter-label">
                {rollsUsed < 3 ? t('rollsRemaining', 3 - rollsUsed) : t('noRollsRemaining')}
              </span>
            </div>

            {/* Escena 3D del Dado */}
            <div className="scene">
              <div
                className={`cube ${rolling ? 'rolling' : ''}`}
                style={{ transform: getCubeTransform() }}
              >
                <div className="cube-face face-1"><span className="dot" /></div>
                <div className="cube-face face-2"><span className="dot" /><span className="dot" /></div>
                <div className="cube-face face-3"><span className="dot" /><span className="dot" /><span className="dot" /></div>
                <div className="cube-face face-4"><span className="dot" /><span className="dot" /><span className="dot" /><span className="dot" /></div>
                <div className="cube-face face-5"><span className="dot" /><span className="dot" /><span className="dot" /><span className="dot" /><span className="dot" /></div>
                <div className="cube-face face-6"><span className="dot" /><span className="dot" /><span className="dot" /><span className="dot" /><span className="dot" /><span className="dot" /></div>
              </div>
            </div>

            <button
              type="button"
              className="game-roll-button"
              onClick={handleRoll}
              disabled={rollsUsed >= 3 || rolling}
            >
              {rolling ? t('rolling') : t('rollDice')}
            </button>

            <p className="game-game-info">
              {t('sameForAll')}
            </p>
          </div>

          {/* Tablero del Juego (Capas Acumulativas) */}
          <div className="freebies-game-board">
            {/* Capa 3: Último lanzamiento */}
            {rollsUsed >= 3 && layers[2] && layers[2].length > 0 && (
              <div className="game-layer layer-3">
                <div className="layer-header">
                  <h2>{t('layerTitle', 3)}</h2>
                  <span className="layer-badge">{Math.min(8, layers[2].length)} assets</span>
                </div>
                <div className="freebies-grid">
                  {layers[2].slice(0, 8).map((it) => (
                    <article className="card-item" key={it.id} onClick={() => handleOpenAsset(it)}>
                      <div className="thumb">
                        <CardImageSlider
                          images={it.images}
                          fallback={it.thumb}
                          alt={it.title || 'asset'}
                          sizes="(max-width: 992px) 88vw, 240px"
                          className="thumb-img"
                          isAdult={isAssetNSFW(it)}
                        />
                      </div>
                      <div className="info">
                        <div className="title">{it.title || '-'}</div>
                        <div className="fbottom">
                          <div className="chips">
                            {(it.chips || []).slice(0, 3).map((c, idx) => (
                              <span className="chip" key={idx}>#{c}</span>
                            ))}
                          </div>
                          <div className="fmeta">
                            <Link href={it.detailUrl} onClick={(e) => e.stopPropagation()}>
                              {t('viewAsset')}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Capa 2: Segundo lanzamiento */}
            {rollsUsed >= 2 && layers[1] && layers[1].length > 0 && (
              <div className="game-layer layer-2">
                <div className="layer-header">
                  <h2>{t('layerTitle', 2)}</h2>
                  <span className="layer-badge">{Math.min(8, layers[1].length)} assets</span>
                </div>
                <div className="freebies-grid">
                  {layers[1].slice(0, 8).map((it) => (
                    <article className="card-item" key={it.id} onClick={() => handleOpenAsset(it)}>
                      <div className="thumb">
                        <CardImageSlider
                          images={it.images}
                          fallback={it.thumb}
                          alt={it.title || 'asset'}
                          sizes="(max-width: 992px) 88vw, 240px"
                          className="thumb-img"
                          isAdult={isAssetNSFW(it)}
                        />
                      </div>
                      <div className="info">
                        <div className="title">{it.title || '-'}</div>
                        <div className="fbottom">
                          <div className="chips">
                            {(it.chips || []).slice(0, 3).map((c, idx) => (
                              <span className="chip" key={idx}>#{c}</span>
                            ))}
                          </div>
                          <div className="fmeta">
                            <Link href={it.detailUrl} onClick={(e) => e.stopPropagation()}>
                              {t('viewAsset')}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Capa 1: Primer lanzamiento */}
            {rollsUsed >= 1 && layers[0] && layers[0].length > 0 && (
              <div className="game-layer layer-1">
                <div className="layer-header">
                  <h2>{t('layerTitle', 1)}</h2>
                  <span className="layer-badge">{Math.min(8, layers[0].length)} assets</span>
                </div>
                <div className="freebies-grid">
                  {layers[0].slice(0, 8).map((it) => (
                    <article className="card-item" key={it.id} onClick={() => handleOpenAsset(it)}>
                      <div className="thumb">
                        <CardImageSlider
                          images={it.images}
                          fallback={it.thumb}
                          alt={it.title || 'asset'}
                          sizes="(max-width: 992px) 88vw, 240px"
                          className="thumb-img"
                          isAdult={isAssetNSFW(it)}
                        />
                      </div>
                      <div className="info">
                        <div className="title">{it.title || '-'}</div>
                        <div className="fbottom">
                          <div className="chips">
                            {(it.chips || []).slice(0, 3).map((c, idx) => (
                              <span className="chip" key={idx}>#{c}</span>
                            ))}
                          </div>
                          <div className="fmeta">
                            <Link href={it.detailUrl} onClick={(e) => e.stopPropagation()}>
                              {t('viewAsset')}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal del Asset */}
      <AssetModal
        open={modalOpen}
        onClose={handleCloseAsset}
        asset={modalAsset}
        descriptionLimit={200}
        onPrev={allVisibleAssets.length > 1 ? handlePrevAsset : undefined}
        onNext={allVisibleAssets.length > 1 ? handleNextAsset : undefined}
      />
    </div>
  );
};

export default FreebiesGame;
