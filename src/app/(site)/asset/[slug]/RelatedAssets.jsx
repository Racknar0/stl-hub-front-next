import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './AssetSeoBackground.module.css';

export default async function RelatedAssets({ currentSlug, categories = [], tags = [], isEn = false }) {
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
    const uploadsBase = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'https://stl-hub.com/uploads';
    
    // Construir query para buscar similares (por categoría o tag)
    const catSlug = categories[0]?.slug || '';

    // Sin categoría no podemos encontrar relacionados significativos;
    // evitamos hacer una llamada sin filtro que siempre devolvería los mismos 4 primeros.
    if (!catSlug) return null;

    const queryParams = new URLSearchParams();
    queryParams.append('limit', '4'); // Traeremos 4 para la grilla
    queryParams.append('status', 'PUBLISHED');
    queryParams.append('category', catSlug);
    
    let related = [];
    try {
        const url = `${base}/api/assets?${queryParams.toString()}`;
        const res = await fetch(url, { next: { revalidate: false } });
        if (res.ok) {
            const data = await res.json();
            // Filtrar el actual
            related = (data.data || data).filter(a => a.slug !== currentSlug).slice(0, 4);
        }
    } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.error('[RelatedAssets] fetch err', e);
    }

    if (!related || related.length === 0) return null;


    return (
        <section className={styles.relatedSection} style={{ marginTop: '3rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#fff' }}>
                {isEn ? 'Related 3D Models' : 'Modelos 3D Relacionados'}
            </h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '1.5rem'
            }}>
                {related.map(asset => {
                    const img = asset.images?.[0] 
                        ? (asset.images[0].startsWith('http') ? asset.images[0] : `${uploadsBase}/${asset.images[0]}`)
                        : '/logo_horizontal.png';
                    
                    const title = isEn ? (asset.titleEn || asset.title) : asset.title;
                    const href = isEn ? `/en/asset/${asset.slug}` : `/asset/${asset.slug}`;

                    return (
                        <Link key={asset.id} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <article style={{
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.05)',
                                transition: 'transform 0.2s',
                                cursor: 'pointer'
                            }}>
                                <div style={{ position: 'relative', aspectRatio: '4/3', width: '100%', backgroundColor: '#000' }}>
                                    <Image 
                                        src={img}
                                        alt={title}
                                        fill
                                        sizes="250px"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>
                                <div style={{ padding: '1rem' }}>
                                    <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {title}
                                    </h3>
                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                                        <span style={{ color: asset.isPremium ? '#ffd700' : '#00e7ff' }}>
                                            {asset.isPremium ? '★ Premium' : '✓ Gratis'}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
