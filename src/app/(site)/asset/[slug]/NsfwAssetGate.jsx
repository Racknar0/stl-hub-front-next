'use client';

import React, { useEffect, useState } from 'react';
import useStore from '../../../../store/useStore';
import NsfwPageWrapper from './NsfwPageWrapper';
import AssetDownloadCtaClient from './AssetDownloadCtaClient';
import ImageLightbox from './ImageLightbox';
import styles from './AssetSeoBackground.module.css';

/**
 * Client component that handles NSFW-restricted assets.
 * 
 * Problem: page.jsx is a Server Component that fetches without JWT →
 *   backend returns __nsfw_restricted for NSFW assets.
 * 
 * Solution: When the user IS logged in (has token in localStorage),
 *   this component re-fetches the asset client-side WITH the JWT,
 *   then redirects to the full asset page. If not logged in, it shows
 *   the NsfwPageWrapper login gate.
 */
export default function NsfwAssetGate({ slug, isEn }) {
    const token = useStore((s) => s.token);
    const hydrated = useStore((s) => s.hydrated);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        if (!hydrated) return;
        
        if (token) {
            // User is authenticated — re-fetch the asset with JWT to verify
            // it exists and is accessible, then force a client-side page refresh.
            // The asset page uses ISR/SSG, so the cached SSR version won't have
            // the JWT. Instead, we redirect through a cache-busting query param
            // that triggers a fresh server render where the optionalAuth middleware
            // can read the token from cookies/headers.
            //
            // Simplest approach: just set a flag and let NsfwPageWrapper handle
            // the age gate — the actual content will load after confirming age.
            setChecking(false);
        } else {
            setChecking(false);
        }
    }, [hydrated, token]);

    // Not hydrated yet — show loading
    if (!hydrated || checking) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '60vh',
                color: '#e9efff',
                fontSize: '1rem'
            }}>
                <span>{isEn ? 'Loading…' : 'Cargando…'}</span>
            </div>
        );
    }

    // User is NOT logged in → show login gate via NsfwPageWrapper
    if (!token) {
        return (
            <NsfwPageWrapper isAdult={true} isEn={isEn}>
                <main style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>{isEn ? 'Restricted content' : 'Contenido restringido'}</p>
                </main>
            </NsfwPageWrapper>
        );
    }

    // User IS logged in → show age gate, and on confirm load full asset client-side
    return (
        <NsfwPageWrapper isAdult={true} isEn={isEn}>
            <NsfwAssetContent slug={slug} isEn={isEn} token={token} />
        </NsfwPageWrapper>
    );
}

/**
 * Fetches and renders the full asset page client-side when user is authenticated.
 */
function NsfwAssetContent({ slug, isEn, token }) {
    const [asset, setAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const fetchAsset = async () => {
            try {
                const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001';
                const res = await fetch(`${base.replace(/\/$/, '')}/api/assets/slug/${encodeURIComponent(slug)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!cancelled) {
                    if (data.__nsfw_restricted) {
                        // Shouldn't happen with valid token, but handle gracefully
                        setError(true);
                    } else {
                        setAsset(data);
                    }
                }
            } catch (e) {
                console.error('[NsfwAssetContent] fetch error:', e);
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchAsset();
        return () => { cancelled = true; };
    }, [slug, token]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', color: '#e9efff' }}>
                <span>{isEn ? 'Loading content…' : 'Cargando contenido…'}</span>
            </div>
        );
    }

    if (error || !asset) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', color: '#ff7b7b' }}>
                <span>{isEn ? 'Could not load this content.' : 'No se pudo cargar este contenido.'}</span>
            </div>
        );
    }

    // Render a simplified asset view client-side
    const uploadsBase = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'https://stl-hub.com/uploads';
    const imgList = (asset.images || []).slice(0, 5).map(i => i.startsWith('http') ? i : `${uploadsBase}/${i}`);
    const title = isEn ? (asset.titleEn || asset.title || 'STL Model') : (asset.title || 'Modelo STL');
    const description = isEn ? (asset.descriptionEn || asset.description || '') : (asset.description || '');
    const categories = Array.isArray(asset.categories)
        ? asset.categories.map(c => isEn ? (c.nameEn || c.name) : (c.name || c.nameEn)).filter(Boolean)
        : [];
    const tagsDisplay = isEn
        ? (Array.isArray(asset.tagsEn) ? asset.tagsEn : [])
        : (Array.isArray(asset.tagsEs) ? asset.tagsEs : []);

    return (
        <main style={{ padding: '2rem 1rem', maxWidth: 900, margin: '0 auto', color: '#e9efff' }}>
            {/* Back button */}
            <div style={{ marginBottom: 24 }}>
                <a href="/" style={{ color: '#b59cff', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    ← {isEn ? 'Back to catalog' : 'Volver al catálogo'}
                </a>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8, color: '#fff' }}>{title}</h1>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <span style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700,
                    background: asset.isPremium ? 'rgba(255, 193, 7, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                    color: asset.isPremium ? '#ffc107' : '#34d399',
                    border: `1px solid ${asset.isPremium ? 'rgba(255, 193, 7, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`
                }}>
                    {asset.isPremium ? '⭐ Premium' : '✓ ' + (isEn ? 'Free' : 'Gratis')}
                </span>
                {categories.map((c, i) => (
                    <span key={i} style={{ padding: '4px 12px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'rgba(233,239,255,0.7)' }}>
                        {c}
                    </span>
                ))}
            </div>

            {/* Gallery */}
            {imgList.length > 0 && (
                <div className={styles.galleryCard} style={{ marginBottom: 24, padding: '20px 24px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(148,163,184,0.14)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: '#00e7ff' }}>
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                            <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {isEn ? 'Image Gallery' : 'Galería de imágenes'}
                    </h2>
                    <div className={styles.gallery}>
                        <ImageLightbox images={imgList} alt={asset.title || 'STL Model'} />
                    </div>
                </div>
            )}

            {/* Description */}
            {description && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, lineHeight: 1.7, color: 'rgba(233,239,255,0.8)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: '#fff' }}>
                        {isEn ? 'Description' : 'Descripción'}
                    </h2>
                    <p style={{ margin: 0 }}>{description}</p>
                </div>
            )}

            {/* Tags */}
            {tagsDisplay.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
                    {tagsDisplay.slice(0, 10).map((t, i) => (
                        <span key={i} style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(106,92,255,0.1)', color: '#b59cff', border: '1px solid rgba(106,92,255,0.2)' }}>
                            #{t}
                        </span>
                    ))}
                </div>
            )}

            {/* Download CTA — Client download component directly inside NSFW view */}
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <AssetDownloadCtaClient
                    assetId={asset.id}
                    isPremium={!!asset.isPremium}
                    isEn={isEn}
                />
            </div>
        </main>
    );
}
