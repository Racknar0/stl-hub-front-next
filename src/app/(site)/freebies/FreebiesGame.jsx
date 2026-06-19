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
  const [maxRolls, setMaxRolls] = useState(3);
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

  // Fetch de los 100 freebies deterministas y de las tiradas del usuario
  const loadFreebies = async () => {
    setLoading(true);
    setError(false);
    try {
      const http = new HttpService();
      
      // Consultar freebies
      const res = await http.getData('/assets/search?plan=free&pageIndex=0&pageSize=100');
      const dataItems = Array.isArray(res.data?.items) ? res.data.items : [];
      setItems(dataItems);

      // Consultar tiradas usadas hoy
      const rollsRes = await http.getData('/me/freebie-rolls');
      const rollsData = rollsRes?.data;
      if (rollsData) {
        if (typeof rollsData.rollsUsed === 'number') {
          setRollsUsed(rollsData.rollsUsed);
        }
        if (typeof rollsData.maxRolls === 'number') {
          setMaxRolls(rollsData.maxRolls);
        }
      }
    } catch (err) {
      console.error('Error fetching freebies game state:', err);
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

  // Dividir freebies en maxRolls lotes estables
  const chunkFreebies = (all, numChunks) => {
    const n = all.length;
    if (n === 0) {
      return Array.from({ length: numChunks }, () => []);
    }
    const size = Math.floor(n / numChunks);
    const chunks = [];
    for (let i = 0; i < numChunks; i++) {
      if (i === numChunks - 1) {
        chunks.push(all.slice(i * size));
      } else {
        chunks.push(all.slice(i * size, (i + 1) * size));
      }
    }
    return chunks;
  };

  const layers = useMemo(() => {
    const chunks = chunkFreebies(items, maxRolls);
    return chunks.map(chunk => chunk.map(a => toCardItem(a, lang)));
  }, [items, lang, maxRolls]);

  // Lista de todos los assets revelados para el Modal
  const allVisibleAssets = useMemo(() => {
    const revealed = [];
    for (let i = 0; i < rollsUsed; i++) {
      if (layers[i]) {
        revealed.push(...layers[i]);
      }
    }
    return revealed;
  }, [layers, rollsUsed]);

  // Manejar lanzamiento de dado
  const handleRoll = async () => {
    if (rollsUsed >= maxRolls || rolling) return;

    setRolling(true);
    const startTime = Date.now();

    try {
      const http = new HttpService();
      const res = await http.postData('/me/freebie-rolls/roll', {});

      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 1200 - elapsed);

      setTimeout(() => {
        setRolling(false);
        const rollsData = res?.data;
        if (rollsData) {
          if (typeof rollsData.rollsUsed === 'number') setRollsUsed(rollsData.rollsUsed);
          if (typeof rollsData.maxRolls === 'number') setMaxRolls(rollsData.maxRolls);
        } else {
          setRollsUsed((prev) => Math.min(maxRolls, prev + 1));
        }
      }, remainingDelay);
    } catch (err) {
      console.error('Error rolling dice:', err);
      setRolling(false);
    }
  };

  // Obtener la rotación 3D estática del cubo según la tirada actual
  const getCubeTransform = () => {
    if (rolling) return '';
    const face = rollsUsed > 0 ? ((rollsUsed - 1) % 6) + 1 : 0;
    switch (face) {
      case 1:
        return 'rotateY(0deg) rotateX(0deg)';
      case 2:
        return 'rotateY(180deg) rotateX(0deg)';
      case 3:
        return 'rotateY(0deg) rotateX(90deg)';
      case 4:
        return 'rotateY(90deg) rotateX(0deg)';
      case 5:
        return 'rotateY(-90deg) rotateX(0deg)';
      case 6:
        return 'rotateY(0deg) rotateX(-90deg)';
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
                {rollsUsed < maxRolls ? t('rollsRemaining', maxRolls - rollsUsed) : t('noRollsRemaining')}
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
              disabled={rollsUsed >= maxRolls || rolling}
            >
              {rolling ? t('rolling') : t('rollDice')}
            </button>

            <p className="game-game-info">
              {t('sameForAll')}
            </p>
          </div>

          {/* Tablero del Juego (Capas Acumulativas de arriba hacia abajo) */}
          <div className="freebies-game-board">
            {Array.from({ length: maxRolls }, (_, index) => {
              const layerNum = maxRolls - index; // De maxRolls a 1
              const layerIndex = layerNum - 1;
              const hasBeenRolled = rollsUsed >= layerNum;
              const layerData = layers[layerIndex];

              if (!hasBeenRolled || !layerData || layerData.length === 0) return null;

              return (
                <div className={`game-layer layer-${layerNum}`} key={layerNum}>
                  <div className="layer-header">
                    <h2>{t('layerTitle', layerNum)}</h2>
                    <span className="layer-badge">{layerData.length} assets</span>
                  </div>
                  <div className="freebies-grid">
                    {layerData.map((it) => (
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
                        {it.chips && it.chips.length > 0 && (
                          <div className="chips">
                            {it.chips.slice(0, 3).map((c, idx) => (
                              <span className="chip" key={idx}>#{c}</span>
                            ))}
                          </div>
                        )}
                        <div className="info">
                          <div className="title">
                            {(() => {
                              if (!it.title) return '-';
                              const match = it.title.match(/^(\s*STL\s*-\s*)(.*)$/i);
                              if (match) {
                                const rest = match[2];
                                const capitalized = rest.charAt(0).toUpperCase() + rest.slice(1);
                                return (
                                  <>
                                    <span className="sr-only">{match[1]}</span>
                                    <span>{capitalized}</span>
                                  </>
                                );
                              }
                              return it.title.charAt(0).toUpperCase() + it.title.slice(1);
                            })()}
                          </div>
                          <div className="fbottom">
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
              );
            })}
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
