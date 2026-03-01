'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from '../../../services/AxiosInterceptor';
import AssetModal from '../../../components/common/AssetModal/AssetModal';
import Button from '../../../components/layout/Buttons/Button';
import { useI18n } from '../../../i18n';
import useStore from '../../../store/useStore';
// Importamos el estilo del loader global para reutilizar el mismo spinner inline
import '../../../components/common/GlobalLoader/GlobalLoader.scss';
import './search.scss';

const SEARCH_EVENT_DEDUPE_MS = 8000;

function stripLeadingHashes(value) {
  return String(value || '').replace(/^#+/, '');
}

function collapseSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function removeAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeKeyPart(value) {
  return removeAccents(collapseSpaces(stripLeadingHashes(value)).toLowerCase());
}

function normalizeCsvList(value) {
  const raw = collapseSpaces(value);
  if (!raw) return '';
  return raw
    .split(',')
    .map((s) => stripLeadingHashes(String(s || '').trim()))
    .filter(Boolean)
    .join(',');
}

function buildSearchEventKey({ q, categories, tags, order, plan }) {
  const qn = normalizeKeyPart(q);
  if (!qn) return null;

  const cats = normalizeCsvList(categories)
    .split(',')
    .map((s) => normalizeKeyPart(s))
    .filter(Boolean)
    .sort()
    .join(',');

  const tgs = normalizeCsvList(tags)
    .split(',')
    .map((s) => normalizeKeyPart(s))
    .filter(Boolean)
    .sort()
    .join(',');

  const ord = normalizeKeyPart(order);
  const pl = normalizeKeyPart(plan);

  return `stlhub:searchEvent:v1:q=${qn}|c=${cats}|t=${tgs}|o=${ord}|p=${pl}`;
}

function readRecentSearchEventId(key) {
  if (typeof window === 'undefined' || !key) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = Number(parsed?.id);
    const ts = Number(parsed?.ts);
    if (!Number.isFinite(id) || id <= 0) return null;
    if (!Number.isFinite(ts) || ts <= 0) return null;
    if (Date.now() - ts > SEARCH_EVENT_DEDUPE_MS) return null;
    return id;
  } catch {
    return null;
  }
}

function writeRecentSearchEventId(key, id) {
  if (typeof window === 'undefined' || !key) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ id, ts: Date.now() }));
  } catch {
    // ignore
  }
}

function toDisplayItem(a, lang) {
  const isEn = String(lang || 'es').toLowerCase() === 'en';
  const tagsEs = Array.isArray(a.tagsEs) ? a.tagsEs : (Array.isArray(a.tags) ? a.tags : []);
  const tagsEn = Array.isArray(a.tagsEn) ? a.tagsEn : tagsEs;
  const chips = isEn ? tagsEn : tagsEs;
  const images = Array.isArray(a.images) ? a.images : [];
  const first = images[0] || '/vite.svg';
  const base = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
  const makeUrl = (rel) => (rel?.startsWith('http') ? rel : `${base}/${String(rel).replace(/\\/g,'/').replace(/^\/+/, '')}`);
  const title = isEn ? (a.titleEn || a.title) : (a.title || a.titleEn);

  // categoria puede venir plural y con name/nameEn
  let category = '';
  if (Array.isArray(a.categories) && a.categories.length) {
    category = a.categories.map(c => isEn ? (c?.nameEn || c?.name || c?.slug) : (c?.name || c?.nameEn || c?.slug)).filter(Boolean).join(', ');
  } else {
    const raw = isEn ? (a.categoryEn || a.categoryNameEn || a.category) : (a.category || a.categoryName || a.categoryEn);
    const v = String(raw || '').trim().toLowerCase();
    category = !v || ['uncategorized','unclassified','general','none','null','undefined'].includes(v) ? '' : raw;
  }

  return {
    id: a.id,
    title,
    chips,
    thumb: makeUrl(first),
    images: images.map(makeUrl),
    // downloadUrl eliminado en vistas públicas
    category,
    isPremium: !!a.isPremium,
    // campos extra para modal
    titleEn: a.titleEn,
    titleEs: a.title,
    chipsEs: tagsEs,
    chipsEn: tagsEn,
    tagSlugs: tagsEs,
    categoryEn: a.categoryEn,
    categories: Array.isArray(a.categories) ? a.categories : [],
    createdAt: a.createdAt,
    slug: a.slug,
  };
}

export default function SearchClient({ initialParams }) {
  const { t } = useI18n();
  const language = useStore((s)=>s.language);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const isEn = String(language || 'es').toLowerCase() === 'en';
  // paginación real
  const PAGE_SIZE = 24;
  const [q, setQ] = useState(initialParams?.q || '');
  const [categories, setCategories] = useState(initialParams?.categories || '');
  const [tags, setTags] = useState(initialParams?.tags || '');
  const [order, setOrder] = useState(initialParams?.order || '');
  // Nuevo: plan (free|premium)
  const [plan, setPlan] = useState(initialParams?.plan || '');
  const [page, setPage] = useState(0); // zero-based
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const searchEventIdRef = useRef(null);
  // Refs para evitar condiciones de carrera y loops
  const pageRef = useRef(0);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const Spinner = () => (
    <div className="sk-circle" aria-hidden="true">
      <div className="sk-circle1 sk-child"></div>
      <div className="sk-circle2 sk-child"></div>
      <div className="sk-circle3 sk-child"></div>
      <div className="sk-circle4 sk-child"></div>
      <div className="sk-circle5 sk-child"></div>
      <div className="sk-circle6 sk-child"></div>
      <div className="sk-circle7 sk-child"></div>
      <div className="sk-circle8 sk-child"></div>
      <div className="sk-circle9 sk-child"></div>
      <div className="sk-circle10 sk-child"></div>
      <div className="sk-circle11 sk-child"></div>
      <div className="sk-circle12 sk-child"></div>
    </div>
  );

  // sincronizar con cambios de la URL
  useEffect(() => {
    setQ(stripLeadingHashes(initialParams?.q || ''));
    setCategories(normalizeCsvList(initialParams?.categories || ''));
    setTags(normalizeCsvList(initialParams?.tags || ''));
    setOrder(initialParams?.order || '');
    setPlan(initialParams?.plan || '');
  }, [initialParams?.q, initialParams?.categories, initialParams?.tags, initialParams?.order, initialParams?.plan]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);

  const params = useMemo(() => ({
    q: stripLeadingHashes(q),
    categories: normalizeCsvList(categories),
    tags: normalizeCsvList(tags),
    order,
    plan,
  }), [q, categories, tags, order, plan]);

  const catList = useMemo(() => normalizeCsvList(categories).split(',').map(s => s.trim()).filter(Boolean), [categories]);
  const tagList = useMemo(() => normalizeCsvList(tags).split(',').map(s => s.trim()).filter(Boolean), [tags]);

  const searchEventKey = useMemo(() => buildSearchEventKey(params), [params]);

  // Reset y carga inicial cuando cambian filtros
  useEffect(() => {
    setItems([]);
    setPage(0);
    setHasMore(true);
    setIsLoadingMore(false);
    setLoading(true);
    pageRef.current = 0;
    hasMoreRef.current = true;
    isLoadingRef.current = false;
    searchEventIdRef.current = null;
  }, [params.q, params.categories, params.tags, params.order, params.plan]);

  const trackSearchIfNeeded = useCallback(async (resultCount) => {
    try {
      const query = String(params?.q || '').trim();
      if (!query) return;

      // En Next dev con React StrictMode el componente puede montarse 2 veces;
      // dedupe temporal para no registrar 2 eventos idénticos.
      const cached = readRecentSearchEventId(searchEventKey);
      if (cached) {
        searchEventIdRef.current = cached;
        return;
      }

      const res = await axios.post('/metrics/search', { query, resultCount });
      const id = Number(res?.data?.id);
      if (Number.isFinite(id) && id > 0) {
        searchEventIdRef.current = id;
        writeRecentSearchEventId(searchEventKey, id);
      }
    } catch {
      // best-effort
    }
  }, [params?.q, searchEventKey]);

  const trackClick = useCallback(async (assetId) => {
    try {
      const id = Number(searchEventIdRef.current);
      const aId = Number(assetId);
      if (!Number.isFinite(id) || id <= 0) return;
      if (!Number.isFinite(aId) || aId <= 0) return;
      await axios.post(`/metrics/search/${id}/click`, { assetId: aId });
    } catch {
      // best-effort
    }
  }, []);

  const loadPageReal = useCallback(async (nextPage) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    if (nextPage > 0) setIsLoadingMore(true);
    try {
      // Delay artificial para visualizar el loader
      await sleep(0);
      const res = await axios.get('/assets/search', {
        params: { ...params, pageIndex: nextPage, pageSize: PAGE_SIZE },
      });
      const list = (res.data?.items || []).map(a => toDisplayItem(a, language));
      setItems(prev => nextPage === 0 ? list : [...prev, ...list]);
      const total = Number(res.data?.total ?? 0);
      const pageSize = Number(res.data?.pageSize ?? PAGE_SIZE);
      const computedHasMore = typeof res.data?.hasMore === 'boolean'
        ? !!res.data.hasMore
        : ((nextPage + 1) * pageSize < total);
      setHasMore(computedHasMore);
      pageRef.current = nextPage + 1;
      setPage(pageRef.current);
      hasMoreRef.current = computedHasMore;

      if (nextPage === 0) {
        void trackSearchIfNeeded(total);
      }
    } catch (e) {
      console.error(e);
      if (nextPage === 0) setItems([]);
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      if (nextPage > 0) setIsLoadingMore(false);
      if (nextPage === 0) setLoading(false);
      isLoadingRef.current = false;
    }
  }, [params, language, trackSearchIfNeeded]);

  // Carga inicial
  useEffect(() => {
    loadPageReal(0);
  }, [params.q, params.categories, params.tags, params.order, params.plan, language]);

  // Cargar más
  const loadMoreReal = useCallback(() => {
    // Evitar disparar la primera carga; esa la hace el efecto inicial
    if (pageRef.current === 0 && items.length === 0) return;
    if (!hasMoreRef.current || isLoadingRef.current) return;
    loadPageReal(pageRef.current);
  }, [loadPageReal, items.length]);

  // IntersectionObserver para scroll infinito
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry.isIntersecting) return;
      loadMoreReal();
    }, { root: null, rootMargin: '200px', threshold: 0 });
    obs.observe(el);
    return () => {
      try { obs.unobserve(el); } catch {}
      obs.disconnect();
    };
  }, [loadMoreReal, page, hasMore, isLoadingMore]);

  const catHref = (c) => {
    if (!c) return '#'
    const s = typeof c === 'string' ? c : (language === 'en' ? c.slugEn || c.slug : c.slug || c.slugEn)
    return `/search?categories=${encodeURIComponent(s || '')}`
  }

  return (
    <section className="search-page">
      <div className="container-narrow">
        {/* Breadcrumb + filtros activos */}
        <div className="search-breadcrumb">
          <Button href="/" variant="purple" styles={{ width: 'auto', padding: '0 .9rem' }}>Inicio</Button>
          <span className="sep">/</span>
          <h1 className="title">{t('search.title')}</h1>
          <div className="filters">
            {q ? (<span className="chip">#{q}</span>) : null}
            {catList.map((c,i)=> (<span key={`c-${i}`} className="chip">#{c}</span>))}
            {tagList.map((t_,i)=> (<span key={`t-${i}`} className="chip">#{t_}</span>))}
            {order === 'downloads' ? (<span className="chip">{t('search.chips.mostDownloaded')}</span>) : null}
            {plan === 'free' ? (<span className="chip">{t('search.chips.free')}</span>) : null}
          </div>
          <div style={{flex:1}} />
          <div className="order-actions">
            <Button href="/search?order=downloads" variant="cyan" styles={{ width: 'auto', padding: '0 .7rem', color:'#fff' }}>
              {t('search.mostDownloaded')}
            </Button>
          </div>
        </div>

  {/* Loader inline con el mismo estilo que el global */}
  {loading && items.length === 0 ? (
    <div style={{display:'flex',justifyContent:'center',padding:'14px 0'}}>
      <Spinner />
    </div>
  ) : null}
  {!loading && items.length === 0 ? <p>{t('search.empty')}</p> : null}

        <div className="results-grid">
          {items.map((it) => (
            <article
              key={it.id}
              className="fcard"
              onClick={() => {
                void trackClick(it.id);
                setModalAsset(it);
                setModalOpen(true);
              }}
            >
              <div className="thumb">
                <Image
                  src={it.thumb}
                  alt={it.title}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 240px"
                  className="thumb-img"
                  priority={false}
                />
              </div>
              <div className="finfo">
                <div className="ftitle">{it.title}</div>
                <div className="fbottom">
                  <div className="chips">
                    {(it.chips || []).slice(0, 3).map((c, i) => (
                      <Link
                        key={i}
                        className="chip chip--link"
                        href={`/search?tags=${encodeURIComponent((it.tagSlugs||[])[i] ?? c)}`}
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        #{c}
                      </Link>
                    ))}
                    {(it.chips || []).length > 3 && (
                      <span className="chip">+{(it.chips || []).length - 3}</span>
                    )}
                  </div>
                  {(() => {
                    if (!it.createdAt && !it.slug) return null;
                    let dateStr = '';
                    if (it.createdAt) {
                      const d = new Date(it.createdAt);
                      if (!isNaN(d.getTime())) {
                        const dd = String(d.getDate()).padStart(2, '0');
                        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
                        const mmm = months[d.getMonth()];
                        const yyyy = d.getFullYear();
                        dateStr = `${dd}-${mmm}-${yyyy}`;
                      }
                    }
                    return (
                      <div className="fmeta" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {it.slug ? (
                          <Link
                            href={`/asset/${it.slug}`}
                            onClick={(e)=>{ e.stopPropagation(); void trackClick(it.id); }}
                            aria-label={`Ver detalle del modelo STL ${it.title || ''} para descargar`}
                            style={{ color: 'inherit', textDecoration: 'none', display: 'flex', gap: 6 }}
                          >
                            {dateStr && <span>upload · {dateStr} · detail</span>}
                            <span className="sr-only">{`Modelo 3D ${it.title || ''} STL gratis`}</span>
                          </Link>
                        ) : (
                          dateStr && <span>upload: {dateStr}</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <span className="badge" aria-hidden="true">✓</span>
            </article>
          ))}
          {items.length > 0 && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            {hasMore ? (
              <div ref={sentinelRef} style={{ color: '#9aa4c7', fontSize: '.9rem', display:'flex', alignItems:'center', gap:'10px' }}>
                {isLoadingMore ? <Spinner /> : 'Cargar más…'}
              </div>
            ) : (
              <div style={{ color: '#9aa4c7', fontSize: '.9rem' }}>
                {
                  isEn ? 'No more results' : 'No hay más resultados'
                }
              </div>
            )}
          </div>
          )}
        </div>
      </div>

  <AssetModal open={modalOpen} onClose={() => setModalOpen(false)} asset={modalAsset} />
    </section>
  );
}
