import React from 'react';
import AssetPageContent, { generateAssetMetadata } from '../../../asset/[slug]/AssetPageContent';

export const revalidate = 86400; // Revalidación cada 24 horas (ISR)
export const dynamicParams = true; // Acepta y cachea slugs no pre-generados on-demand

// Pre-genera los 500 modelos más recientes en cada build (para la ruta en inglés).
export async function generateStaticParams() {
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
    try {
        const res = await fetch(`${base}/api/assets/slugs?limit=500`, { cache: 'no-store' });
        if (!res.ok) return [];
        const rows = await res.json();
        return rows.map(r => ({ slug: r.slug }));
    } catch {
        return [];
    }
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    return generateAssetMetadata(slug, true); // isEn = true (inglés)
}

export default async function AssetPage({ params }) {
    const { slug } = await params;
    return <AssetPageContent slug={slug} isEn={true} />; // isEn = true (inglés)
}
