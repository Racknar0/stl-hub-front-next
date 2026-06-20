'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import CardImageSlider from '../../../components/common/CardImageSlider/CardImageSlider';
import { isAssetNSFW } from '../../../helpers/nsfwHelper';
import { useVirtualizer } from '@tanstack/react-virtual';
import axios from '../../../services/AxiosInterceptor';
import AssetModal from '../../../components/common/AssetModal/AssetModal';
import Button from '../../../components/layout/Buttons/Button';
import { useI18n } from '../../../i18n';
import useStore from '../../../store/useStore';
import useResolvedLanguage from '../../../hooks/useResolvedLanguage';
const token_selector = (s) => s.token;
// Importamos el estilo del loader global para reutilizar el mismo spinner inline
import '../../../components/common/GlobalLoader/GlobalLoader.scss';
import './search.scss';

const SEARCH_EVENT_DEDUPE_MS = 8000;
const PAGE_SIZE = 48;

const GRID_GAP_PX = 10;
const GRID_MIN_CARD_WIDTH_PX = 340;
const GRID_CARD_HEIGHT_DESKTOP = 450;
const GRID_CARD_HEIGHT_TABLET = 450;
const GRID_CARD_HEIGHT_MOBILE_PHONE = 450;

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
    description: a.description,
    descriptionEn: a.descriptionEn,
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
    updatedAt: a.updatedAt,
    archiveSizeB: a.archiveSizeB,
    fileSizeB: a.fileSizeB,
    slug: a.slug,
  };
}

export default function SearchClient({ initialParams, initialItems, initialTotal, initialHasMore, initialAiFallback, initialSuggestions, initialLang = 'es' }) {
  const resolvedLanguage = useResolvedLanguage(initialLang);
  const { t } = useI18n(resolvedLanguage);
  const token = useStore(token_selector);
  const imageSearchResults = useStore((s) => s.imageSearchResults);
  const clearImageSearchResults = useStore((s) => s.clearImageSearchResults);
  const normalizedInitialLang = String(initialLang || 'es').toLowerCase() === 'en' ? 'en' : 'es';

  // Pre-process SSR items into display format
  const ssrItemsRef = useRef(null);
  if (ssrItemsRef.current === null && Array.isArray(initialItems) && initialItems.length > 0) {
    ssrItemsRef.current = initialItems.map(a => toDisplayItem(a, normalizedInitialLang));
  }
  const hasSSRData = ssrItemsRef.current !== null && ssrItemsRef.current.length > 0;
  const ssrConsumedRef = useRef(false);  const [items, setItems] = useState(hasSSRData ? ssrItemsRef.current : []);
  const [loading, setLoading] = useState(!hasSSRData);
  const isEn = resolvedLanguage === 'en';
  const [q, setQ] = useState(initialParams?.q || '');
  const [categories, setCategories] = useState(initialParams?.categories || '');
  const [tags, setTags] = useState(initialParams?.tags || '');
  const [order, setOrder] = useState(initialParams?.order || '');
  // Nuevo: plan (free|premium)
  const [plan, setPlan] = useState(initialParams?.plan || '');
  const [isAiSearch, setIsAiSearch] = useState(initialParams?.q ? (initialParams?.is_ai_search !== 'false') : false);
  const [aiFallback, setAiFallback] = useState(!!initialAiFallback);
  const initPageIndex = Number(initialParams?.pageIndex || 0);
  const [page, setPage] = useState(initPageIndex); // zero-based pageIndex tracker
  const [total, setTotal] = useState(initialTotal || 0);
  const [hasMore, setHasMore] = useState(hasSSRData ? !!initialHasMore : true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const virtualRootRef = useRef(null);
  const [scrollElement, setScrollElement] = useState(null);
  const [virtualMetrics, setVirtualMetrics] = useState({ width: 0, top: 0, windowW: 0 });
  const searchEventIdRef = useRef(null);
  const ssrSugRef = useRef(null);
  if (ssrSugRef.current === null && Array.isArray(initialSuggestions) && initialSuggestions.length > 0) {
    ssrSugRef.current = initialSuggestions.map(a => toDisplayItem(a, normalizedInitialLang));
  }
  const [suggestions, setSuggestions] = useState(ssrSugRef.current || []);
  
  // Refs para evitar condiciones de carrera y loops
  const pageRef = useRef(initPageIndex);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(hasSSRData ? !!initialHasMore : true);
  const cacheRef = useRef({});
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const findScrollParent = (node) => {
      // Ignoramos el window y document para que useVirtualizer interactúe con el body como fallback seguro para ResizeObserver
      if (!node || node === document.documentElement) return document.body;
      
      const style = window.getComputedStyle(node);
      const isScrollY = style.overflowY === 'auto' || style.overflowY === 'scroll';
      const isTailwindScroll = typeof node.className === 'string' && (node.className.includes('overflow-y-auto') || node.className.includes('overflow-auto'));
      
      if (isScrollY || isTailwindScroll) {
        return node;
      }
      return findScrollParent(node.parentNode);
    };
    
    // Le damos un parpadeo de vida al DOM
    const t = setTimeout(() => {
      const el = findScrollParent(virtualRootRef.current);
      setScrollElement(el);
    }, 200);
    return () => clearTimeout(t);
  }, []);

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
    setIsAiSearch(initialParams?.q ? (initialParams?.is_ai_search !== 'false') : false);
  }, [initialParams?.q, initialParams?.categories, initialParams?.tags, initialParams?.order, initialParams?.plan, initialParams?.is_ai_search]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);

  const params = useMemo(() => ({
    q: stripLeadingHashes(q),
    categories: normalizeCsvList(categories),
    tags: normalizeCsvList(tags),
    order,
    plan,
    is_ai_search: isAiSearch ? 'true' : 'false',
  }), [q, categories, tags, order, plan, isAiSearch]);

  const catList = useMemo(() => normalizeCsvList(categories).split(',').map(s => s.trim()).filter(Boolean), [categories]);
  const tagList = useMemo(() => normalizeCsvList(tags).split(',').map(s => s.trim()).filter(Boolean), [tags]);

  const searchEventKey = useMemo(() => buildSearchEventKey(params), [params]);
  // Reset y carga inicial cuando cambian filtros o resultados de imagen
  useEffect(() => {
    cacheRef.current = {};
    const initPage = Number(initialParams?.pageIndex || 0);
    // Si hay datos SSR sin consumir, restaurarlos en vez de limpiar
    if (hasSSRData && !ssrConsumedRef.current) {
      setItems(ssrItemsRef.current);
      setLoading(false);
      setAiFallback(!!initialAiFallback);
      setPage(initPage);
      pageRef.current = initPage;
      setHasMore(!!initialHasMore);
      hasMoreRef.current = !!initialHasMore;
      setSuggestions(ssrSugRef.current || []);
      setTotal(initialTotal || 0);
    } else {
      setItems([]);
      setPage(0);
      setHasMore(true);
      setLoading(true);
      setAiFallback(false);
      pageRef.current = 0;
      hasMoreRef.current = true;
      setSuggestions([]);
      setTotal(0);
    }
    setIsTransitioning(false);
    isLoadingRef.current = false;
    searchEventIdRef.current = null;
  }, [params.q, params.categories, params.tags, params.order, params.plan, params.is_ai_search, imageSearchResults]);

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

      const res = await axios.post('/metrics/search', { query, resultCount, isAiSearch: !!isAiSearch });
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

  const buildPageUrl = useCallback((targetPageIndex) => {
    if (typeof window === 'undefined') return '#';
    const sp = new URLSearchParams(window.location.search);
    sp.set('pageIndex', String(targetPageIndex));
    return `${window.location.pathname}?${sp.toString()}`;
  }, []);

  const fetchPageData = useCallback((targetPage) => {
    if (cacheRef.current[targetPage]) {
      return cacheRef.current[targetPage];
    }

    const promise = (async () => {
      // Check for image search results in Zustand store
      const isImageSearch = typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).get('image_search') === 'true';

      if (isImageSearch) {
        if (targetPage === 0 && imageSearchResults && Array.isArray(imageSearchResults?.items)) {
          const list = imageSearchResults.items.map(a => toDisplayItem(a, resolvedLanguage));
          return {
            items: list,
            total: list.length,
            hasMore: false,
            suggestions: [],
            aiFallback: false,
          };
        }
        return {
          items: [],
          total: 0,
          hasMore: false,
          suggestions: [],
          aiFallback: false,
        };
      }

      const res = await axios.get('/assets/search', {
        params: { ...params, pageIndex: targetPage, pageSize: PAGE_SIZE },
      });
      const list = (res.data?.items || []).map(a => toDisplayItem(a, resolvedLanguage));
      const sugList = (res.data?.suggestions || []).map(a => toDisplayItem(a, resolvedLanguage));
      const computedTotal = Number(res.data?.total ?? 0);
      const pageSize = Number(res.data?.pageSize ?? PAGE_SIZE);
      const computedHasMore = typeof res.data?.hasMore === 'boolean'
        ? !!res.data.hasMore
        : ((targetPage + 1) * pageSize < computedTotal);

      return {
        items: list,
        total: computedTotal,
        hasMore: computedHasMore,
        suggestions: sugList,
        aiFallback: !!res.data?.aiFallback,
      };
    })();

    cacheRef.current[targetPage] = promise;

    promise.then((data) => {
      cacheRef.current[targetPage] = data;
    }).catch((err) => {
      delete cacheRef.current[targetPage];
    });

    return promise;
  }, [params, resolvedLanguage, imageSearchResults]);

  const loadPageReal = useCallback(async (nextPage) => {
    if (isLoadingRef.current) return;

    const initPageIndex = Number(initialParams?.pageIndex || 0);

    // Si tenemos datos SSR y es la primera carga, no hacer fetch
    if (nextPage === initPageIndex && hasSSRData && !ssrConsumedRef.current) {
      ssrConsumedRef.current = true;
      setItems(ssrItemsRef.current);
      setLoading(false);
      setAiFallback(!!initialAiFallback);
      setHasMore(!!initialHasMore);
      hasMoreRef.current = !!initialHasMore;
      pageRef.current = initPageIndex;
      setPage(initPageIndex);
      setTotal(initialTotal || 0);

      // Seed SSR initial data to cache
      cacheRef.current[initPageIndex] = {
        items: ssrItemsRef.current,
        total: initialTotal || 0,
        hasMore: !!initialHasMore,
        suggestions: ssrSugRef.current || [],
        aiFallback: !!initialAiFallback,
      };

      if (initialTotal > 0) void trackSearchIfNeeded(initialTotal);
      return;
    }

    isLoadingRef.current = true;
    setIsTransitioning(true);
    try {
      await sleep(0);

      const dataOrPromise = fetchPageData(nextPage);
      const data = dataOrPromise instanceof Promise ? await dataOrPromise : dataOrPromise;

      setItems(data.items);
      setAiFallback(data.aiFallback);
      setSuggestions(data.suggestions);
      setTotal(data.total);
      setHasMore(data.hasMore);
      pageRef.current = nextPage;
      setPage(nextPage);
      hasMoreRef.current = data.hasMore;

      void trackSearchIfNeeded(data.total);
    } catch (e) {
      console.error(e);
      setItems([]);
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      setIsTransitioning(false);
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [trackSearchIfNeeded, initialParams?.pageIndex, hasSSRData, initialAiFallback, initialHasMore, initialTotal, fetchPageData]);

  const handlePageClick = useCallback(async (e, targetPage) => {
    if (e) e.preventDefault();
    if (isTransitioning) return;
    if (targetPage === page) return;

    setIsTransitioning(true);
    try {
      const dataOrPromise = fetchPageData(targetPage);
      const data = dataOrPromise instanceof Promise ? await dataOrPromise : dataOrPromise;

      setItems(data.items);
      setAiFallback(data.aiFallback);
      setSuggestions(data.suggestions);
      setTotal(data.total);
      setHasMore(data.hasMore);
      pageRef.current = targetPage;
      setPage(targetPage);
      hasMoreRef.current = data.hasMore;

      // Sync browser URL bar
      const newUrl = buildPageUrl(targetPage);
      window.history.pushState(null, '', newUrl);

      void trackSearchIfNeeded(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTransitioning(false);
    }
  }, [page, isTransitioning, fetchPageData, buildPageUrl, trackSearchIfNeeded]);

  const handlePageHover = useCallback((targetPage) => {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (targetPage >= 0 && targetPage < totalPages) {
      fetchPageData(targetPage);
    }
  }, [total, fetchPageData]);

  // Carga inicial
  useEffect(() => {
    const initPage = Number(initialParams?.pageIndex || 0);
    loadPageReal(initPage);
  }, [params.q, params.categories, params.tags, params.order, params.plan, params.is_ai_search, resolvedLanguage, imageSearchResults, initialParams?.pageIndex, loadPageReal]);

  // Auto-precargar la siguiente página (+1) en segundo plano con un pequeño retardo
  useEffect(() => {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const nextPage = page + 1;
    if (nextPage < totalPages) {
      const timer = setTimeout(() => {
        fetchPageData(nextPage);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [page, total, fetchPageData]);

  // Escuchar el evento popstate para retroceder/avanzar en el historial del navegador
  useEffect(() => {
    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const newPage = Number(sp.get('pageIndex') || 0);
      if (newPage !== pageRef.current) {
        loadPageReal(newPage);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [loadPageReal]);

  // Central scroll-to-top handler on page change
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    const triggerScroll = () => {
      if (typeof window === 'undefined') return;

      // Scroll window, documentElement and body instantly to cover all browsers/layouts
      window.scrollTo({ top: 0, behavior: 'auto' });
      document.documentElement.scrollTo({ top: 0, behavior: 'auto' });
      document.body.scrollTo({ top: 0, behavior: 'auto' });

      // Scroll virtualizer container if it is a custom div
      if (scrollElement && scrollElement !== document.body) {
        scrollElement.scrollTo({ top: 0, behavior: 'auto' });
      }
    };

    // Trigger instantly
    triggerScroll();

    // Trigger again after 60ms to override any dynamic rendering layout shifts
    const timer = setTimeout(triggerScroll, 60);

    return () => clearTimeout(timer);
  }, [page, scrollElement]);

  const getPageNumbers = () => {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const pages = [];
    
    pages.push(0);
    
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages - 2, page + 2);
    
    if (page <= 2) {
      end = Math.min(totalPages - 2, 4);
    } else if (page >= totalPages - 3) {
      start = Math.max(1, totalPages - 5);
    }
    
    if (start > 1) {
      pages.push('ellipsis-start');
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (end < totalPages - 2) {
      pages.push('ellipsis-end');
    }
    
    if (totalPages > 1) {
      pages.push(totalPages - 1);
    }
    
    return pages;
  };

  const renderPaginator = () => {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) return null;
    
    const pageNumbers = getPageNumbers();

    const PagSpinner = () => (
      <svg className="pag-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <circle cx="12" cy="12" r="10" style={{ opacity: 0.2 }} />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
    );
    
    return (
      <nav className={`custom-paginator${isTransitioning ? ' is-loading' : ''}`} aria-label="Pagination Navigation">
        {page > 0 ? (
          <Link
            href={buildPageUrl(page - 1)}
            className={`pag-btn pag-btn--nav${isTransitioning ? ' pag-btn--loading' : ''}`}
            aria-label="Previous Page"
            onClick={(e) => handlePageClick(e, page - 1)}
            onMouseEnter={() => handlePageHover(page - 1)}
          >
            {isTransitioning ? <PagSpinner /> : <span className="arrow">←</span>}
            <span className="text">{isEn ? 'Prev' : 'Ant'}</span>
          </Link>
        ) : (
          <span className="pag-btn pag-btn--nav pag-btn--disabled">
            <span className="arrow">←</span>
            <span className="text">{isEn ? 'Prev' : 'Ant'}</span>
          </span>
        )}
        
        <div className="pag-numbers">
          {pageNumbers.map((p, index) => {
            if (p === 'ellipsis-start' || p === 'ellipsis-end') {
              return (
                <span key={`ellipsis-${index}`} className="pag-ellipsis">
                  ...
                </span>
              );
            }
            
            const isCurrent = p === page;
            return (
              <Link
                key={p}
                href={buildPageUrl(p)}
                className={`pag-btn pag-btn--number ${isCurrent ? 'pag-btn--active' : ''}`}
                aria-label={`Go to page ${p + 1}`}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={(e) => handlePageClick(e, p)}
                onMouseEnter={() => handlePageHover(p)}
              >
                {p + 1}
              </Link>
            );
          })}
        </div>
        
        {page < totalPages - 1 ? (
          <Link
            href={buildPageUrl(page + 1)}
            className={`pag-btn pag-btn--nav${isTransitioning ? ' pag-btn--loading' : ''}`}
            aria-label="Next Page"
            onClick={(e) => handlePageClick(e, page + 1)}
            onMouseEnter={() => handlePageHover(page + 1)}
          >
            <span className="text">{isEn ? 'Next' : 'Sig'}</span>
            {isTransitioning ? <PagSpinner /> : <span className="arrow">→</span>}
          </Link>
        ) : (
          <span className="pag-btn pag-btn--nav pag-btn--disabled">
            <span className="text">{isEn ? 'Next' : 'Sig'}</span>
            <span className="arrow">→</span>
          </span>
        )}
      </nav>
    );
  };
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateMetrics = () => {
      const node = virtualRootRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const next = {
        width: Math.max(1, Math.round(rect.width || 1)),
        // Use offsetTop for a stable position that doesn't change with scroll
        top: Math.max(0, node.offsetTop || 0),
        windowW: Math.max(1, Math.round(window.innerWidth || 1)),
      };
      setVirtualMetrics((prev) => {
        if (prev.width === next.width && prev.windowW === next.windowW) return prev;
        return next;
      });
    };

    // Give it a tiny delay to ensure DOM is settled (images, texts, above grid)
    const tId = setTimeout(updateMetrics, 100);

    window.addEventListener('resize', updateMetrics);

    const node = virtualRootRef.current;
    const ro = (typeof ResizeObserver !== 'undefined' && node)
      ? new ResizeObserver(() => updateMetrics())
      : null;
    if (ro && node) ro.observe(node);

    return () => {
      clearTimeout(tId);
      window.removeEventListener('resize', updateMetrics);
      if (ro) ro.disconnect();
    };
  }, [items.length]);

  const columns = useMemo(() => {
    const width = Math.max(1, Number(virtualMetrics.width || 1));
    return Math.max(1, Math.floor((width + GRID_GAP_PX) / (GRID_MIN_CARD_WIDTH_PX + GRID_GAP_PX)));
  }, [virtualMetrics.width]);

  const rowHeight = useMemo(() => {
    return 450 + GRID_GAP_PX;
  }, []);

  const rowCount = useMemo(() => Math.ceil(items.length / columns), [items.length, columns]);

  const rowVirtualizer = useVirtualizer({
    count: Math.max(0, rowCount),
    getScrollElement: () => scrollElement,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualHeight = Math.max(0, Number(rowVirtualizer.getTotalSize() || 0));
  
  // Detenemos virtualización si no hemos encontrado la caja real de scroll
  const hasRenderableVirtualRows = virtualRows.some((row) => (row.index * columns) < items.length);
  const canVirtualize = !!scrollElement && hasRenderableVirtualRows && totalVirtualHeight > 0;

  const renderResultCard = (it) => (
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
      {it.chips && it.chips.length > 0 && (
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
      )}
      <div className="finfo">
        <div className="ftitle">
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
              <div className="fmeta" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' }}>
                {dateStr && <span>upload · {dateStr}</span>}
                {it.slug && (
                  <Link
                    href={isEn ? `/en/asset/${it.slug}` : `/asset/${it.slug}`}
                    onClick={(e)=>{ e.stopPropagation(); void trackClick(it.id); }}
                    aria-label={`Ver detalle del modelo STL ${it.title || ''} para descargar`}
                    className="detail-link-btn"
                  >
                    {isEn ? 'detail' : 'detalle'}
                    <span className="sr-only">{`Modelo 3D ${it.title || ''} STL gratis`}</span>
                  </Link>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </article>
  );

  const handlePrev = () => {
    if (!items.length || !modalAsset) return;
    const idx = items.findIndex(a => a.id === modalAsset.id);
    const prevIdx = (idx - 1 + items.length) % items.length;
    setModalAsset(items[prevIdx]);
  };
  const handleNext = () => {
    if (!items.length || !modalAsset) return;
    const idx = items.findIndex(a => a.id === modalAsset.id);
    const nextIdx = (idx + 1) % items.length;
    setModalAsset(items[nextIdx]);
  };

  return (
    <section className="search-page">
      <div className="container-narrow" style={{ maxWidth: '100%' }}>
        {/* Breadcrumb + filtros activos */}
        <div className="search-breadcrumb" style={{ maxWidth: '1200px', margin: '0 auto 24px' }}>
          <Button href={isEn ? '/en' : '/'} variant="purple" styles={{ width: 'auto', padding: '0 .9rem' }}>
            {isEn ? 'Home' : 'Inicio'}
          </Button>
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
            <Button href={isEn ? '/en/search?order=downloads' : '/search?order=downloads'} variant="cyan" styles={{ width: 'auto', padding: '0 .7rem', color:'#fff' }}>
              {t('search.mostDownloaded')}
            </Button>
          </div>
        </div>

        {/* NSFW catalog notice for anonymous users */}
        {!token && (
          <div className="nsfw-search-notice" style={{ maxWidth: '1200px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: 'rgba(255, 75, 75, 0.08)', border: '1px solid rgba(255, 75, 75, 0.22)', fontSize: '0.8rem', fontWeight: 600, color: '#ff7b7b', lineHeight: 1.4 }}>
            <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>🛡️</span>
            <span>{isEn ? 'For user protection, some content requires authentication. ' : 'Por políticas de protección al usuario, parte del contenido requiere autenticación. '}
              <a href={isEn ? '/en/login' : '/login'} style={{ color: '#b59cff', textDecoration: 'underline' }}>{isEn ? 'Log in' : 'Inicia sesión'}</a>
            </span>
          </div>
        )}

  {/* Loader inline con el mismo estilo que el global */}
  {loading && items.length === 0 ? (
    <div style={{display:'flex',justifyContent:'center',padding:'14px 0'}}>
      <Spinner />
    </div>
  ) : null}
  {!loading && items.length === 0 ? (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <p>{t('search.empty')}</p>
      {!token && (
        <p style={{ fontSize: '0.85rem', color: '#ff7b7b', marginTop: 8 }}>
          🔒 {isEn ? 'Some content requires login to be displayed.' : 'Algunos contenidos requieren inicio de sesión para mostrarse.'}{' '}
          <a href={isEn ? '/en/login' : '/login'} style={{ color: '#b59cff', textDecoration: 'underline' }}>{isEn ? 'Log in' : 'Inicia sesión'}</a>
        </p>
      )}
    </div>
  ) : null}

        {aiFallback && !loading && items.length > 0 && (
          <div className="ai-fallback-notice">
            <span className="ai-fallback-icon">✨</span>
            <span>{isEn ? 'No exact results found. Showing similar suggestions powered by AI.' : 'No encontramos resultados exactos. Mostrando sugerencias similares con IA.'}</span>
          </div>
        )}
        <div className="results-virtual-shell" ref={virtualRootRef} style={{ opacity: isTransitioning ? 0.65 : 1, transition: 'opacity 0.25s ease' }}>
          {canVirtualize ? (
            <div
              style={{
                width: '100%',
                paddingTop: `${virtualRows.length > 0 ? virtualRows[0].start : 0}px`,
                paddingBottom: `${virtualRows.length > 0 ? totalVirtualHeight - virtualRows[virtualRows.length - 1].end : totalVirtualHeight}px`,
              }}
            >
              {virtualRows.map((virtualRow) => {
                const rowStart = virtualRow.index * columns;
                const rowEnd = Math.min(items.length, rowStart + columns);
                const rowItems = items.slice(rowStart, rowEnd);

                if (!rowItems.length) return null;

                return (
                  <div
                    key={virtualRow.key}
                    className="results-grid"
                    style={{
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      marginBottom: `${GRID_GAP_PX}px`
                    }}
                  >
                    {rowItems.map((it) => renderResultCard(it))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="results-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {items.map((it) => renderResultCard(it))}
            </div>
          )}
        </div>

        {/* Paginador principal */}
        {!loading && items.length > 0 && renderPaginator()}

        {/* AI Suggestions */}
        {suggestions.length > 0 && !loading && (
          <div className="suggestions-section">
            <div className="suggestions-divider" />
            <h2 className="suggestions-title">
              <span className="suggestions-icon">🤖</span>
              {isEn ? 'AI-Powered Suggestions' : 'Sugerencias con IA'}
            </h2>
            <p className="suggestions-subtitle">
              {isEn
                ? 'Our AI found these related models you might love'
                : 'Nuestra IA encontró estos modelos relacionados que te pueden gustar'}
            </p>
            <div className="results-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {suggestions.map((it) => renderResultCard(it))}
            </div>
          </div>
        )}

        {/* Paginación Híbrida SEO: Googlebot lee estos enlaces para rastrear todo tu catálogo sin scroll */}
        {(() => {
          const totalPages = Math.ceil((initialTotal || 0) / PAGE_SIZE);
          if (totalPages <= 1) return null;
          return (
            <nav className="seo-only-pagination" aria-label="SEO Pagination" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', margin: '40px 0 20px', opacity: 0.08, height: '1px', overflow: 'hidden' }}>
              {Array.from({ length: Math.min(100, totalPages) }).map((_, i) => {
                const p = i;
                const qParams = new URLSearchParams();
                if (q) qParams.set('q', q);
                if (categories) qParams.set('categories', categories);
                if (tags) qParams.set('tags', tags);
                if (order) qParams.set('order', order);
                if (plan) qParams.set('plan', plan);
                qParams.set('is_ai_search', isAiSearch ? 'true' : 'false');
                qParams.set('pageIndex', String(p));
                return (
                  <Link key={p} href={isEn ? `/en/search?${qParams.toString()}` : `/search?${qParams.toString()}`} prefetch={false} style={{ color: '#b59cff', textDecoration: 'underline', padding: '0 4px' }}>
                    {p + 1}
                  </Link>
                );
              })}
            </nav>
          );
        })()}
      </div>

      <AssetModal open={modalOpen} onClose={() => setModalOpen(false)} asset={modalAsset} onPrev={items.length > 1 ? handlePrev : undefined} onNext={items.length > 1 ? handleNext : undefined} />
    </section>
  );
}
