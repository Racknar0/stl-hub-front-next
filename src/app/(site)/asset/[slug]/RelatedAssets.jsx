import React from 'react';
import RelatedAssetsClient from './RelatedAssetsClient';
import styles from './AssetSeoBackground.module.css';

export default async function RelatedAssets({ currentSlug, categories = [], tags = [], isEn = false }) {
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001').replace(/\/$/, '');
    const uploadsBase = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'https://stl-hub.com/uploads';
    
    const catSlug = categories[0]?.slug || '';
    const tagSlugs = tags.map(t => t.slug).join(',');

    let relatedCats = [];
    let relatedTags = [];

    // Format item function to map data to SectionRow expectations
    const formatItem = (it) => {
        const tagsEs = Array.isArray(it.tagsEs) ? it.tagsEs : [];
        const tagsEn = Array.isArray(it.tagsEn) ? it.tagsEn : tagsEs;
        
        // Ensure all images have the absolute URL
        const absoluteImages = Array.isArray(it.images) 
            ? it.images.map(img => img.startsWith('http') ? img : `${uploadsBase}/${img.replace(/^[/]+/, '')}`)
            : [];

        return {
            ...it,
            title: isEn ? (it.titleEn || it.title) : it.title,
            chips: isEn ? tagsEn.slice(0,3) : tagsEs.slice(0,3),
            tagSlugs: tagsEs,
            images: absoluteImages
        };
    };

    try {
        const fetchCats = catSlug ? fetch(`${base}/api/assets/search?categories=${catSlug}&pageSize=6`, { next: { revalidate: 86400 } }) : Promise.resolve({ ok: false });
        const fetchTags = tagSlugs ? fetch(`${base}/api/assets/search?tags=${encodeURIComponent(tagSlugs)}&pageSize=6`, { next: { revalidate: 86400 } }) : Promise.resolve({ ok: false });
        
        const [resCats, resTags] = await Promise.all([fetchCats, fetchTags]);
        
        if (resCats.ok) {
            const dataCats = await resCats.json();
            relatedCats = (dataCats.items || []).filter(a => a.slug !== currentSlug).map(formatItem);
        }
        
        if (resTags.ok) {
            const dataTags = await resTags.json();
            relatedTags = (dataTags.items || []).filter(a => a.slug !== currentSlug).map(formatItem);
        }
    } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.error('[RelatedAssets] fetch err', e);
    }

    if (relatedCats.length === 0 && relatedTags.length === 0) return null;

    return (
        <div style={{ marginTop: '3rem' }}>
            <RelatedAssetsClient 
                relatedCats={relatedCats}
                relatedTags={relatedTags}
                isEn={isEn}
            />
        </div>
    );
}
