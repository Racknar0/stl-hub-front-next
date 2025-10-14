import React from 'react';
import { notFound } from 'next/navigation';
// Importar directamente el componente cliente (puede usarse dentro de un Server Component)
import AssetModalPageClient from './AssetModalPageClient';

export const revalidate = 3600; // ISR 1h

async function fetchAsset(slug) {
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
    // IMPORTANTE: las rutas del backend están montadas bajo /api (app.use('/api', routes))
    // Por eso aquí debe ir /api/assets/slug/... y no /assets/slug/ directamente.
    const url = `${base}/api/assets/slug/${encodeURIComponent(slug)}`;
    try {
        if (process.env.NODE_ENV !== 'production') console.log('[asset/[slug]] fetch', url);
        const res = await fetch(url, { next: { revalidate } });
        if (!res.ok) {
            if (process.env.NODE_ENV !== 'production') console.warn('[asset/[slug]] fetch status', res.status, 'slug=', slug);
            return { __error: true, status: res.status };
        }
        return res.json();
    } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.error('[asset/[slug]] fetch err', e);
        return { __error: true, status: 0 };
    }
}

export async function generateMetadata({ params }) {
    const asset = await fetchAsset(params.slug);
    if (!asset || asset.__error) {
        return { title: 'Modelo no encontrado', robots: { index: false, follow: false } };
    }
    const isPremium = !!asset.isPremium;
    const baseTitle =
        (isPremium ? 'Descargar STL premium ' : 'Descargar STL gratis ') +
        (asset.title || 'modelo 3D') +
        ' por MEGA';
    const desc =
        (asset.description?.slice(0, 180) ||
            asset.title + ' STL para impresión 3D.') +
        (asset.tagsEs?.length
            ? ` Tags: ${asset.tagsEs.slice(0, 6).join(', ')}`
            : '');
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://stl-hub.com';
    return {
        title: baseTitle,
        description: desc,
        alternates: { canonical: `${site}/asset/${asset.slug}` },
        openGraph: {
            title: baseTitle,
            description: desc,
            type: 'article',
            url: `${site}/asset/${asset.slug}`,
            images: asset.images?.length
                ? asset.images.slice(0, 1).map((i) => ({ url: i }))
                : ['/logo_horizontal.png'],
        },
    };
}

export default async function AssetPage({ params }) {
    const asset = await fetchAsset(params.slug);
    if (!asset || asset.__error) {
      if (asset?.status === 404) notFound();
      // Para otros errores mostrar fallback simple (sin notFound para diferenciar 500)
      return <div style={{padding:'2rem'}}><h1>Error</h1><p>No pudimos cargar el asset.</p></div>;
    }
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://stl-hub.com';
    const uploadsBase = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'https://stl-hub.com/uploads';
    const imgList = (asset.images || []).slice(0, 5).map(i => i.startsWith('http') ? i : `${uploadsBase}/${i}`);
    // CreativeWork base + Product/Offer enriquecido para distinguir premium/free
    const productLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'CreativeWork',
                '@id': `${site}/asset/${asset.slug}#creative`,
                name: asset.title,
                description: asset.description || undefined,
                datePublished: asset.createdAt,
                inLanguage: 'es',
                keywords: (asset.tagsEs || []).join(', '),
                url: `${site}/asset/${asset.slug}`,
                image: imgList,
            },
            {
                '@type': 'Product',
                '@id': `${site}/asset/${asset.slug}#product`,
                name: asset.title,
                description: asset.description || undefined,
                url: `${site}/asset/${asset.slug}`,
                image: imgList,
                isAccessoryOrSparePart: false,
                offers: {
                    '@type': 'Offer',
                    price: asset.isPremium ? '4.99' : '0', // Ajusta precio real si existe
                    priceCurrency: 'USD',
                    availability: 'https://schema.org/InStock',
                    url: `${site}/asset/${asset.slug}`,
                    itemCondition: 'https://schema.org/NewCondition',
                },
            },
        ],
    };

    // Bloque SSR de contenido textual para crawlers (visualmente puede esconderse con CSS leve, NO display:none)
    const categoryNames = Array.isArray(asset.categories)
        ? asset.categories.map(c => c?.name || c?.nameEn || c?.slug).filter(Boolean)
        : [];
    const tagListEs = (asset.tagsEs || []).slice(0, 20);
    return (
        <>
            {/* JSON-LD enriquecido */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
            {/* Contenido indexable SSR */}
            <section style={{padding:'0.5rem 1rem'}} className="asset-ssr-indexable">
                <h1 style={{fontSize:'1.35rem',margin:'0 0 .5rem'}}>{asset.title}</h1>
                {asset.description && (
                    <p style={{margin:'0 0 .75rem',lineHeight:1.4}}>{asset.description}</p>
                )}
                {categoryNames.length > 0 && (
                    <p style={{margin:'0 0 .5rem'}}><strong>Categorías:</strong> {categoryNames.join(', ')}</p>
                )}
                {tagListEs.length > 0 && (
                    <p style={{margin:0}}><strong>Tags:</strong> {tagListEs.join(', ')}</p>
                )}
            </section>
            {/* Modal visual interactivo */}
            <AssetModalPageClient asset={asset} />
        </>
    );
}
