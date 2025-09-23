'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import axios from '../../../services/AxiosInterceptor';
import AssetModal from '../../../components/common/AssetModal/AssetModal';
import Button from '../../../components/layout/Buttons/Button';
import { useI18n } from '../../../i18n';
import useStore from '../../../store/useStore';
import './search.scss';

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
    downloadUrl: a.megaLink || '#',
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
  };
}

export default function SearchClient({ initialParams }) {
  const { t } = useI18n();
  const language = useStore((s)=>s.language);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(initialParams?.q || '');
  const [categories, setCategories] = useState(initialParams?.categories || '');
  const [tags, setTags] = useState(initialParams?.tags || '');
  const [order, setOrder] = useState(initialParams?.order || '');
  // Nuevo: plan (free|premium)
  const [plan, setPlan] = useState(initialParams?.plan || '');

  // sincronizar con cambios de la URL
  useEffect(() => {
    setQ(initialParams?.q || '');
    setCategories(initialParams?.categories || '');
    setTags(initialParams?.tags || '');
    setOrder(initialParams?.order || '');
    setPlan(initialParams?.plan || '');
  }, [initialParams?.q, initialParams?.categories, initialParams?.tags, initialParams?.order, initialParams?.plan]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);
  const [subscribed, setSubscribed] = useState(false);

  const params = useMemo(() => ({ q, categories, tags, order, plan }), [q, categories, tags, order, plan]);
  const catList = useMemo(() => String(categories || '').split(',').map(s=>s.trim()).filter(Boolean), [categories]);
  const tagList = useMemo(() => String(tags || '').split(',').map(s=>s.trim()).filter(Boolean), [tags]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/assets/search', { params, signal: controller.signal });
        const items = (res.data?.items || []).map(a => toDisplayItem(a, language));
        setItems(items);
      } catch (e) {
        if (e.name !== 'CanceledError') console.error(e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [params.q, params.categories, params.tags, params.order, params.plan, language]);

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
          <Button as="a" href="/" variant="purple" styles={{ width: 'auto', padding: '0 .9rem' }}>Inicio</Button>
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
            <Button as="a" href="/search?order=downloads" variant="cyan" styles={{ width: 'auto', padding: '0 .7rem', color:'#fff' }}>
              {t('search.mostDownloaded')}
            </Button>
          </div>
          <label className="subs-toggle">
            <input type="checkbox" checked={subscribed} onChange={e=>setSubscribed(e.target.checked)} />
            <span>Simular usuario suscrito</span>
          </label>
        </div>

        {loading ? <p>{t('search.loading')}</p> : null}
        {!loading && items.length === 0 ? <p>{t('search.empty')}</p> : null}

        <div className="results-grid">
          {items.map((it) => (
            <article key={it.id} className="fcard" onClick={() => { setModalAsset(it); setModalOpen(true); }}>
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
                <div className="chips">
                  {it.chips.map((c,i)=> (
                    <a key={i} className="chip chip--link" href={`/search?tags=${encodeURIComponent((it.tagSlugs||[])[i] ?? c)}`}>#{c}</a>
                  ))}
                </div>
              </div>
              <span className="badge" aria-hidden="true">✓</span>
            </article>
          ))}
        </div>
      </div>

      <AssetModal open={modalOpen} onClose={() => setModalOpen(false)} asset={modalAsset} subscribed={subscribed} />
    </section>
  );
}
