'use client';
import React, { useEffect, useState, useMemo, useLayoutEffect } from 'react';
import './Home.scss';
import Hero from '../../../components/home/Hero/Hero';
import SectionRow from '../../../components/home/SectionRow/SectionRow';
import FeatureSection from '../../../components/home/FeatureSection/FeatureSection';
import Testimonials from '../../../components/home/Testimonials/Testimonials';
import PricingSection from '../../../components/home/PricingSection/PricingSection';
import AssetModal from '../../../components/common/AssetModal/AssetModal';
import HttpService from '../../../services/HttpService';
import useStore from '../../../store/useStore';
import { useI18n } from '../../../i18n';
import Button from '../../../components/layout/Buttons/Button';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';

// Categorías fijas
const CATEGORIES = [
  '3DXM Art',
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

const shuffleArray = (arr) => {
  const a = Array.isArray(arr) ? [...arr] : []
  if (a.length <= 1) return a

  // Fisher–Yates; usa crypto si está disponible
  const getRand = (max) => {
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const buf = new Uint32Array(1)
        crypto.getRandomValues(buf)
        return buf[0] % max
      }
    } catch {}
    return Math.floor(Math.random() * max)
  }

  for (let i = a.length - 1; i > 0; i--) {
    const j = getRand(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const pickRandomItems = (arr, n = 20) => shuffleArray(arr).slice(0, n)

const rotateListBy = (arr, steps = 0) => {
  const list = Array.isArray(arr) ? arr : []
  const len = list.length
  if (len <= 1) return list
  const offset = ((steps % len) + len) % len
  if (offset === 0) return list
  return list.slice(offset).concat(list.slice(0, offset))
}

const Home = ({ lang, initialLatest, initialTop, initialFree, initialCategories, initialCatMap, initialCatOrder }) => {
  const http = new HttpService();
  const setGlobalLoading = useStore((s)=>s.setGlobalLoading);
  const resolvedLanguage = useResolvedLanguage(lang);
  const globalLoading = useStore((s)=>s.globalLoading);
  const currentLang = resolvedLanguage;
  const isEn = String(currentLang).toLowerCase() === 'en';
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);
  const [modalList, setModalList] = useState([]); // lista de assets de donde vino el asset actual
  // Guardar respuesta cruda
  const [latestRaw, setLatestRaw] = useState(initialLatest || []);
  const [topRaw, setTopRaw] = useState(initialTop || []);
  // Nuevo: lista Free
  const [freeRaw, setFreeRaw] = useState(initialFree || []);

  const [topRotationStep, setTopRotationStep] = useState(0);
  // Categorías y sliders
  const [cats, setCats] = useState(initialCategories || []); // [{ id, name, nameEn, slug, slugEn }]
  const [catsLoadOrder, setCatsLoadOrder] = useState(() => initialCategories || []); // mismo shape, pero barajado para carga
  const [catPage, setCatPage] = useState(initialCatOrder && initialCatOrder.length > 0 ? 1 : 0);
  const BATCH_SIZE = 4;
  const CAT_SLIDER_LIMIT = 20;
  const [catMap, setCatMap] = useState(initialCatMap || {}); // slug -> raw items
  const [catOrder, setCatOrder] = useState(initialCatOrder || []); // slugs con resultados en orden de carga
  const [loadingMoreCats, setLoadingMoreCats] = useState(false);
  const [catsLoadedAll, setCatsLoadedAll] = useState(initialCategories && initialCategories.length > 0 && (initialCatOrder || []).length >= initialCategories.length);
  const { t } = useI18n(currentLang);

  // Activar loader antes del primer pintado para evitar flash del fondo
  useLayoutEffect(() => {
    if (!initialLatest || initialLatest.length === 0) {
      setGlobalLoading(true);
    }
  }, [setGlobalLoading, initialLatest]);

  const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
  const imgUrl = (rel) => {
    if (!rel) return ''
    const clean = String(rel)
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
    return `${UPLOAD_BASE}/${clean}`
  }

  // Adaptar item según idioma actual
  const toCardItem = (a, lang) => {
    const isEn = String(lang || 'es').toLowerCase() === 'en'
    const title = isEn ? (a.titleEn || a.title) : (a.title || a.titleEn)
    const tagsEs = Array.isArray(a.tagsEs) ? a.tagsEs : (Array.isArray(a.tags) ? a.tags : [])
    const tagsEn = Array.isArray(a.tagsEn) ? a.tagsEn : tagsEs
    const chips = isEn ? tagsEn : tagsEs
    const images = Array.isArray(a.images) ? a.images : []
    const thumb = images[0] ? imgUrl(images[0]) : '/vite.svg'
    return {
      id: a.id,
      slug: a.slug, // necesario para enlace "ver detalle"
      isEn,
      detailUrl: isEn ? `/en/asset/${a.slug}` : `/asset/${a.slug}`,
      title,
      description: a.description,
      descriptionEn: a.descriptionEn,
      chips: (chips || []),
      thumb,
      images: images.map(imgUrl),
      // downloadUrl eliminado en vistas públicas
      category: a.category,
      isPremium: !!a.isPremium,
      // campos para modal
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
    }
  }

  useEffect(() => {
    if (initialLatest && initialLatest.length > 0) {
      setGlobalLoading(false);
      // Mantener las 4 primeras estables (para evitar layout shift con SSR), 
      // y barajar el resto para mantener la aleatoriedad en "Cargar más"
      const preloadedCats = (initialCategories || []).slice(0, 4);
      const remainingCats = (initialCategories || []).slice(4);
      setCatsLoadOrder([...preloadedCats, ...shuffleArray(remainingCats)]);
      return;
    }

    const load = async () => {
      try {
        const [res, resTopRandomPool, resFree, resCats] = await Promise.all([
          http.getData('/assets/latest?limit=20'),
          http.getData('/assets/top?limit=20'),
          http.getData('/assets/search?plan=free&pageIndex=0&pageSize=20'),
          http.getData('/categories')
        ]);

        const latestArr = Array.isArray(res.data) ? res.data : [];
        setLatestRaw(latestArr);

        // "Lo más descargado" real
        const topArr = Array.isArray(resTopRandomPool.data) ? resTopRandomPool.data : [];
        setTopRaw(topArr.length ? topArr : latestArr);
        setTopRotationStep(0);

        // Nuevo: FREE actuales (público vía /assets/search)
        const freeArr = Array.isArray(resFree.data?.items) ? resFree.data.items : [];
        setFreeRaw(freeArr);

        // Cargar categorías disponibles
        const catItems = (resCats.data?.items || []).map(c => ({ id: c.id, name: c.name, nameEn: c.nameEn || c.name, slug: c.slug, slugEn: c.slugEn || c.slug }));
        setCats(catItems);
        // Barajar el orden para que cada visita muestre categorías distintas primero
        setCatsLoadOrder(shuffleArray(catItems));
        // Reiniciar estado de sliders/carga
        setCatPage(0);
        setCatMap({});
        setCatOrder([]);
        setCatsLoadedAll(false);
      } catch (e) {
        setLatestRaw([]);
        setTopRaw([]);
        setTopRotationStep(0);
        setFreeRaw([]);
        setCats([]);
        setCatsLoadOrder([]);
        setCatPage(0);
        setCatMap({});
        setCatOrder([]);
        setCatsLoadedAll(false);
      } finally {
        setGlobalLoading(false);
      }
    };
    load();
  }, [initialLatest, initialCategories, initialTop, initialFree, initialCatMap, initialCatOrder]);

  // El auto-rotate de "Lo más descargado" ha sido removido para evitar que el slider
  // se reinicie mientras el usuario interactúa con él o navega hacia la derecha.

  // Cargar primer lote de categorías cuando ya tengamos listado
  useEffect(() => {
    if (catsLoadOrder.length && catPage === 0 && catOrder.length === 0 && !loadingMoreCats) {
      // cargar lote inicial
      loadCategoryBatch(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catsLoadOrder.length]);

  const loadCategoryBatch = async (pageToLoad) => {
    if (!catsLoadOrder.length) return;
    const start = pageToLoad * BATCH_SIZE;
    if (start >= catsLoadOrder.length) { setCatsLoadedAll(true); return; }
    const slice = catsLoadOrder.slice(start, start + BATCH_SIZE);
    setLoadingMoreCats(true);
    try {
      // peticiones en paralelo por categoría
      // Categorías: últimos primero (id desc) y límite por slider
      const results = await Promise.allSettled(
        slice.map(cat => http.getData(`/assets/search?categories=${encodeURIComponent(cat.slug)}&pageIndex=0&pageSize=${CAT_SLIDER_LIMIT}`))
      );
      const nextMap = { ...catMap };
      const nextOrder = [...catOrder];
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          const items = Array.isArray(res.value?.data?.items) ? res.value.data.items : [];
          if (items.length >= 15) {
            const slug = slice[idx].slug;
            nextMap[slug] = items;
            nextOrder.push(slug);
          }
        }
      });
      setCatMap(nextMap);
      setCatOrder(nextOrder);
      setCatPage(pageToLoad + 1);
      if ((pageToLoad + 1) * BATCH_SIZE >= catsLoadOrder.length) setCatsLoadedAll(true);
    } catch (e) {
      // noop
    } finally {
      setLoadingMoreCats(false);
    }
  };

  // Derivar listas según idioma
  // Limitar sliders a 20 elementos por seguridad adicional
  const latest = useMemo(() => latestRaw.slice(0,20).map(a => toCardItem(a, currentLang)), [latestRaw, currentLang]);
  const top = useMemo(() => {
    const rotated = rotateListBy(topRaw, topRotationStep);
    return rotated.slice(0,20).map(a => toCardItem(a, currentLang));
  }, [topRaw, topRotationStep, currentLang]);
  const free = useMemo(() => freeRaw.slice(0,20).map(a => toCardItem(a, currentLang)), [freeRaw, currentLang]);

  const catSliders = useMemo(() => (
    catOrder.map(slug => {
      const cat = cats.find(c => c.slug === slug);
      const items = (catMap[slug] || []).slice(0, CAT_SLIDER_LIMIT).map(a => toCardItem(a, currentLang));
      return {
        slug,
        title: currentLang === 'en' ? (cat?.nameEn || cat?.name || slug) : (cat?.name || cat?.nameEn || slug),
        items,
      };
    })
  ), [catOrder, catMap, cats, currentLang, CAT_SLIDER_LIMIT]);

  // Build a flat list of all visible assets for modal navigation
  const allVisibleAssets = useMemo(() => {
    const all = [...latest, ...free, ...top];
    catSliders.forEach(cs => all.push(...cs.items));
    // Deduplicate by id
    const seen = new Set();
    return all.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
  }, [latest, free, top, catSliders]);

  const handleOpen = (asset) => {
    setModalAsset(asset);
    setModalList(allVisibleAssets);
    setModalOpen(true);
  };
  const handleClose = () => { setModalOpen(false); setModalAsset(null); setModalList([]); };

  const handlePrev = () => {
    if (!modalList.length || !modalAsset) return;
    const idx = modalList.findIndex(a => a.id === modalAsset.id);
    const prevIdx = (idx - 1 + modalList.length) % modalList.length;
    setModalAsset(modalList[prevIdx]);
  };
  const handleNext = () => {
    if (!modalList.length || !modalAsset) return;
    const idx = modalList.findIndex(a => a.id === modalAsset.id);
    const nextIdx = (idx + 1) % modalList.length;
    setModalAsset(modalList[nextIdx]);
  };

  return (
    <div>
      {/* <GlobalLoader /> */}
      <Hero />

      <FeatureSection
        variantClass="feature-section--latest-glow"
        title={t('home.latest.title')}
        subtitle={t('home.latest.subtitle')}
        ctaLabel={t('home.latest.cta')}
        items={latest}
        onItemClick={handleOpen}
        isEn={isEn}
      />

      {/* Nuevo slider: Gratis (se actualiza diario) */}
      <SectionRow
        variantClass="section-row--freebies-glow"
        title={t('home.free.title')}
        subtitle={t('home.free.subtitle')}
        items={free}
        onItemClick={handleOpen}
        linkHref={isEn ? "/en/search?plan=free" : "/search?plan=free"}
        linkLabel={t('home.free.more')}
        priority={true}
        isEn={isEn}
      />

      <SectionRow
        title={t('home.top.title')}
        items={top}
        onItemClick={handleOpen}
        linkHref={isEn ? "/en/search?order=downloads" : "/search?order=downloads"}
        linkLabel={t('home.top.more')}
        isEn={isEn}
      />

      {/* Sliders por categoría (6 por lote) */}
      {catSliders.map(cs => (
        <SectionRow
          key={cs.slug}
          title={cs.title}
          items={cs.items}
          onItemClick={handleOpen}
          linkHref={isEn ? `/en/search?categories=${encodeURIComponent(cs.slug)}` : `/search?categories=${encodeURIComponent(cs.slug)}`}
          linkLabel={t('sliders.row.more')}
          isEn={isEn}
        />
      ))}

      {/* Botón Ver más categorías */}
      {cats.length > 0 && !catsLoadedAll && (
        <div className="container-narrow" style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0 2rem', marginLeft: 'auto', marginRight: 'auto' }}>
          <Button
            variant="purple"
            styles={{ width: 'auto', padding: '0 .9rem' }}
            onClick={() => loadCategoryBatch(catPage)}
            disabled={loadingMoreCats}
          >
            {loadingMoreCats ? t('home.categories.loading') : t('home.categories.loadMore')}
          </Button>
        </div>
      )}

            {/* Sección de planes como en /suscripcion */}
      <PricingSection showHeader={true} showFinePrint={false} />

      <Testimonials />



      {/* Modal */}
      <AssetModal open={modalOpen} onClose={handleClose} asset={modalAsset} descriptionLimit={200} onPrev={modalList.length > 1 ? handlePrev : undefined} onNext={modalList.length > 1 ? handleNext : undefined} />
    </div>
  );
}

export default Home;
