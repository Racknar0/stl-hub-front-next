import React from 'react';
import AssetDetailCore from '../../../../components/asset/AssetDetailCore';
import { notFound } from 'next/navigation';

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
    return {
        title: baseTitle,
        description: desc,
        alternates: { canonical: `/asset/${asset.slug}` },
        openGraph: {
            title: baseTitle,
            description: desc,
            type: 'article',
            url: `/asset/${asset.slug}`,
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
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: asset.title,
        description: asset.description || undefined,
        datePublished: asset.createdAt,
        inLanguage: 'es',
        keywords: (asset.tagsEs || []).join(', '),
        url: `${
            process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        }/asset/${asset.slug}`,
        image: (asset.images || [])
            .slice(0, 3)
            .map((i) =>
                i.startsWith('http')
                    ? i
                    : `${
                          process.env.NEXT_PUBLIC_UPLOADS_BASE ||
                          'http://localhost:3001/uploads'
                      }/${i}`
            ),
    };
    return (
        <main className="asset-page-standalone" style={{ padding: '1rem 0' }}>
            <div className="container-narrow">
                <AssetDetailCore asset={asset} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            </div>
        </main>
    );
}
