'use client';
import React, { useMemo, useState } from 'react';
import AssetModal from '../../../../components/common/AssetModal/AssetModal';
import Button from '../../../../components/layout/Buttons/Button';
import Link from 'next/link';

// util mock para generar items por tag
const makeItems = (tag, n = 20) =>
  Array.from({ length: n }).map((_, i) => ({
    id: `${tag}-${i}`,
    title: `Item ${i + 1}`,
    chips: [tag, 'Anime', 'Buildings'],
    thumb: `https://picsum.photos/seed/${tag}-${i}/600/600`,
    images: [
      `https://picsum.photos/seed/${tag}-${i}-a/1000/1000`,
      `https://picsum.photos/seed/${tag}-${i}-b/1000/1000`,
      `https://picsum.photos/seed/${tag}-${i}-c/1000/1000`,
    ],
    downloadUrl: '#',
    category: tag,
  }));

export default function TagClient({ tag }) {
  const items = useMemo(() => makeItems(tag, 20), [tag]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAsset, setModalAsset] = useState(null);

  const onItemClick = (it) => { setModalAsset(it); setModalOpen(true); };
  const onClose = () => { setModalOpen(false); setModalAsset(null); };

  return (
    <section className="tags-page">
      <div className="container-narrow">
        <div className="tags-header">
          <Button href="/" variant="purple" styles={{width:'auto', padding:'0 .9rem'}}>Inicio</Button>
          <h1 className="tags-title">#{tag}</h1>
          <div style={{flex:1}} />
        </div>

        <div className="tags-grid">
          {items.map((it) => (
            <article key={it.id} className="tcard" onClick={() => onItemClick(it)}>
              <div className="thumb" style={{backgroundImage:`url(${it.thumb})`}} />
              <div className="info">
                <div className="title">{it.title}</div>
                <div className="chips">
                  {it.chips.map((c,i)=> (<Link key={i} className="chip chip--link" href={`/tags/${encodeURIComponent(c)}`}>#{c}</Link>))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <AssetModal open={modalOpen} onClose={onClose} asset={modalAsset} />
    </section>
  );
}
