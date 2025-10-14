import HttpService from '../../../../services/HttpService';
import AssetDetailCore from '../../../../components/asset/AssetDetailCore';
import React from 'react';

export const revalidate = 3600; // ISR 1h

async function fetchAsset(slug){
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
    const res = await fetch(`${base}/assets/slug/${encodeURIComponent(slug)}`, { next: { revalidate: 3600 } });
    if(!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }) {
  const asset = await fetchAsset(params.slug);
  if(!asset) return { title: 'Modelo no encontrado' };
  const isPremium = !!asset.isPremium;
  const baseTitle = (isPremium? 'Descargar STL premium ' : 'Descargar STL gratis ') + (asset.title || 'modelo 3D') + ' por MEGA';
  const desc = (asset.description?.slice(0,180) || (asset.title + ' STL para impresión 3D.')) + (asset.tagsEs?.length? ` Tags: ${asset.tagsEs.slice(0,6).join(', ')}`:'');
  return {
    title: baseTitle,
    description: desc,
    alternates: { canonical: `/asset/${asset.slug}` },
    openGraph: { title: baseTitle, description: desc, type: 'article', url: `/asset/${asset.slug}`, images: asset.images?.length? asset.images.slice(0,1).map(i=>({url:i})) : ['/logo_horizontal.png'] }
  };
}

export default async function AssetPage({ params }) {
  const asset = await fetchAsset(params.slug);
  if(!asset) return <div style={{padding:'2rem'}}><h1>404</h1><p>Asset no encontrado.</p></div>;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: asset.title,
    description: asset.description || undefined,
    datePublished: asset.createdAt,
    inLanguage: 'es',
    keywords: (asset.tagsEs||[]).join(', '),
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/asset/${asset.slug}`,
    image: (asset.images||[]).slice(0,3).map(i => i.startsWith('http')? i : `${process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads'}/${i}`)
  };
  return (
    <main className="asset-page-standalone" style={{padding:'1rem 0'}}>
      <div className="container-narrow">
        <AssetDetailCore asset={asset} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
      </div>
    </main>
  );
}
