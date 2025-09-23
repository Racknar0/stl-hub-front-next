'use client';
import React, { useEffect, useState, useMemo, useLayoutEffect } from 'react';
import './Home.scss';
import Hero from '../../../components/home/Hero/Hero';
import SectionRow from '../../../components/home/SectionRow/SectionRow';
import FeatureSection from '../../../components/home/FeatureSection/FeatureSection';
import Testimonials from '../../../components/home/Testimonials/Testimonials';
import PricingInline from '../../../components/home/PricingInline/PricingInline';
import AssetModal from '../../../components/common/AssetModal/AssetModal';
import HttpService from '../../../services/HttpService';
import useStore from '../../../store/useStore';
import { useI18n } from '../../../i18n';
import Button from '../../../components/layout/Buttons/Button';

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
  const language = useStore((s)=>s.language);
  const globalLoading = useStore((s)=>s.globalLoading);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);
  const [subscribed, setSubscribed] = useState(false); // toggle para ver estados
  // Guardar respuesta cruda
  const [latestRaw, setLatestRaw] = useState([]);
  const [topRaw, setTopRaw] = useState([]);
  // Nuevo: lista Free
  const [freeRaw, setFreeRaw] = useState([]);
  // Listas listas para mostrar (posible enriquecimiento en EN)
  const [latestData, setLatestData] = useState([]);
  const [topData, setTopData] = useState([]);
  const [freeData, setFreeData] = useState([]);
  // Categorías y sliders
  const [cats, setCats] = useState([]); // [{ id, name, nameEn, slug, slugEn }]
  const [catPage, setCatPage] = useState(0);
  const BATCH_SIZE = 6;
  const [catMap, setCatMap] = useState({}); // slug -> raw items
  const [catOrder, setCatOrder] = useState([]); // slugs con resultados en orden de carga
  const [loadingMoreCats, setLoadingMoreCats] = useState(false);
  const [catsLoadedAll, setCatsLoadedAll] = useState(false);
  const { t } = useI18n();

  // Activar loader antes del primer pintado para evitar flash del fondo
  useLayoutEffect(() => {
    setGlobalLoading(true);
  }, [setGlobalLoading]);

  const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
  const imgUrl = (rel) => {
    if (!rel) return ''
    const clean = String(rel)
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
    return `${UPLOAD_BASE}/${clean}`
  }

  // Helper para construir href de categoría correcto según idioma
  const catHref = (c) => {
    if (!c) return '#'
    const s = typeof c === 'string' ? c : (language === 'en' ? c.slugEn || c.slug : c.slug || c.slugEn)
    return `/search?categories=${encodeURIComponent(s || '')}`
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
      title,
      chips: (chips || []).slice(0,3),
      thumb,
      images: images.slice(0,3).map(imgUrl),
      downloadUrl: a.megaLink || '#',
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
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await http.getData('/assets/latest?limit=20');
        const latestArr = Array.isArray(res.data) ? res.data : [];
        setLatestRaw(latestArr);

        const resTop = await http.getData('/assets/top?limit=19');
        const topArr = Array.isArray(resTop.data) ? resTop.data : [];
        setTopRaw(topArr);

        // Nuevo: FREE actuales (público vía /assets/search)
        const resFree = await http.getData('/assets/search?plan=free&order=downloads');
        const freeArr = Array.isArray(resFree.data?.items) ? resFree.data.items : [];
        setFreeRaw(freeArr);

        // Cargar categorías disponibles
        const resCats = await http.getData('/categories');
        const catItems = (resCats.data?.items || []).map(c => ({ id: c.id, name: c.name, nameEn: c.nameEn || c.name, slug: c.slug, slugEn: c.slugEn || c.slug }));
        setCats(catItems);
      } catch (e) {
        setLatestRaw([]);
        setTopRaw([]);
        setFreeRaw([]);
        setCats([]);
      } finally {
        setGlobalLoading(false);
      }
    };
    load();
  }, []);

  // Cargar primer lote de categorías cuando ya tengamos listado
  useEffect(() => {
    if (cats.length && catPage === 0 && catOrder.length === 0 && !loadingMoreCats) {
      // cargar lote inicial
      loadCategoryBatch(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats.length]);

  const loadCategoryBatch = async (pageToLoad) => {
    if (!cats.length) return;
    const start = pageToLoad * BATCH_SIZE;
    if (start >= cats.length) { setCatsLoadedAll(true); return; }
    const slice = cats.slice(start, start + BATCH_SIZE);
    setLoadingMoreCats(true);
    try {
      // peticiones en paralelo por categoría
      const results = await Promise.allSettled(slice.map(cat => http.getData(`/assets/search?categories=${encodeURIComponent(cat.slug)}&order=downloads`)));
      const nextMap = { ...catMap };
      const nextOrder = [...catOrder];
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          const items = Array.isArray(res.value?.data?.items) ? res.value.data.items : [];
          if (items.length > 0) {
            const slug = slice[idx].slug;
            nextMap[slug] = items;
            nextOrder.push(slug);
          }
        }
      });
      setCatMap(nextMap);
      setCatOrder(nextOrder);
      setCatPage(pageToLoad + 1);
      if ((pageToLoad + 1) * BATCH_SIZE >= cats.length) setCatsLoadedAll(true);
    } catch (e) {
      // noop
    } finally {
      setLoadingMoreCats(false);
    }
  };

  // Enriquecer cuando el idioma es EN y falten campos EN
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (String(language).toLowerCase() === 'en') {
        setLatestData(latestRaw);
        setTopData(topRaw);
        setFreeData(freeRaw);
      } else {
        setLatestData(latestRaw);
        setTopData(topRaw);
        setFreeData(freeRaw);
      }
    };
    run();
    return () => { cancelled = true };
  }, [language, latestRaw, topRaw, freeRaw]);

  // Derivar listas según idioma
  const latest = useMemo(() => latestData.map(a => toCardItem(a, language)), [latestData, language]);
  const top = useMemo(() => topData.map(a => toCardItem(a, language)), [topData, language]);
  const free = useMemo(() => freeData.map(a => toCardItem(a, language)), [freeData, language]);

  const catSliders = useMemo(() => (
    catOrder.map(slug => {
      const cat = cats.find(c => c.slug === slug);
      const items = (catMap[slug] || []).map(a => toCardItem(a, language));
      return {
        slug,
        title: language === 'en' ? (cat?.nameEn || cat?.name || slug) : (cat?.name || cat?.nameEn || slug),
        items,
      };
    })
  ), [catOrder, catMap, cats, language]);

  const handleOpen = (asset) => { setModalAsset(asset); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setModalAsset(null); };

  return (
    <div>
      {/* <GlobalLoader /> */}
      <Hero />

      <FeatureSection
        title={t('home.latest.title')}
        subtitle={t('home.latest.subtitle')}
        ctaLabel={t('home.latest.cta')}
        items={latest}
        onItemClick={handleOpen}
      />

      {/* Nuevo slider: Gratis (se actualiza diario) */}
      <SectionRow
        title={t('home.free.title')}
        items={free}
        onItemClick={handleOpen}
        linkHref="/search?plan=free"
        linkLabel={t('home.free.more')}
      />

      <SectionRow
        title={t('home.top.title')}
        items={top}
        onItemClick={handleOpen}
        linkHref="/search?order=downloads"
        linkLabel={t('home.top.more')}
      />

      {/* Sliders por categoría (6 por lote) */}
      {catSliders.map(cs => (
        <SectionRow
          key={cs.slug}
          title={cs.title}
          items={cs.items}
          onItemClick={handleOpen}
          linkHref={`/search?categories=${encodeURIComponent(cs.slug)}`}
          linkLabel={t('sliders.row.more')}
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
}

export default Home;
