'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import axios from '../../../services/AxiosInterceptor';
import AssetModal from '../../../components/common/AssetModal/AssetModal';
import Button from '../../../components/layout/Buttons/Button';
import './search.scss';

function normalizeItem(a) {
  const chips = Array.isArray(a.tags) ? a.tags : [];
  const images = Array.isArray(a.images) ? a.images : [];
  const first = images[0] || '/vite.svg';
  const base = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
  const makeUrl = (rel) => (rel?.startsWith('http') ? rel : `${base}/${rel}`);
  return {
    id: a.id,
    title: a.title,
    chips,
    thumb: makeUrl(first),
    images: images.map(makeUrl),
    downloadUrl: a.megaLink || '#',
    category: a.category || 'general',
    isPremium: !!a.isPremium,
  };
}

export default function SearchClient({ initialParams }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState(initialParams?.q || '');
  const [categories, setCategories] = useState(initialParams?.categories || '');
  const [tags, setTags] = useState(initialParams?.tags || '');

  // sincronizar con cambios de la URL
  useEffect(() => {
    setQ(initialParams?.q || '');
    setCategories(initialParams?.categories || '');
    setTags(initialParams?.tags || '');
  }, [initialParams?.q, initialParams?.categories, initialParams?.tags]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);
  const [subscribed, setSubscribed] = useState(false);

  const params = useMemo(() => ({ q, categories, tags }), [q, categories, tags]);
  const catList = useMemo(() => String(categories || '').split(',').map(s=>s.trim()).filter(Boolean), [categories]);
  const tagList = useMemo(() => String(tags || '').split(',').map(s=>s.trim()).filter(Boolean), [tags]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/assets/search', { params, signal: controller.signal });
        const items = (res.data?.items || []).map(normalizeItem);
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
  }, [params.q, params.categories, params.tags]);

  return (
    <section className="search-page">
      <div className="container-narrow">
        {/* Breadcrumb + filtros activos */}
        <div className="search-breadcrumb">
          <Button as="a" href="/" variant="purple" styles={{ width: 'auto', padding: '0 .9rem' }}>Inicio</Button>
          <span className="sep">/</span>
          <h1 className="title">Búsqueda</h1>
          <div className="filters">
            {q ? (<span className="chip">#{q}</span>) : null}
            {catList.map((c,i)=> (<span key={`c-${i}`} className="chip">#{c}</span>))}
            {tagList.map((t,i)=> (<span key={`t-${i}`} className="chip">#{t}</span>))}
          </div>
          <div style={{flex:1}} />
          <label className="subs-toggle">
            <input type="checkbox" checked={subscribed} onChange={e=>setSubscribed(e.target.checked)} />
            <span>Simular usuario suscrito</span>
          </label>
        </div>

        {loading ? <p>Cargando...</p> : null}
        {!loading && items.length === 0 ? <p>Sin resultados.</p> : null}

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
                    <a key={i} className="chip chip--link" href={`/search?tags=${encodeURIComponent(c)}`}>#{c}</a>
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
