import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
// Importar directamente el componente cliente (puede usarse dentro de un Server Component)
import AssetModalPageClient from './AssetModalPageClient';
import styles from './AssetSeoBackground.module.css';

export const revalidate = 3600; // ISR 1h

function toSafeDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
    const d = toSafeDate(value);
    if (!d) return 'N/A';
    try {
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }).format(d);
    } catch {
        return d.toISOString().slice(0, 10);
    }
}

function formatBytes(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n <= 0) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = n;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i += 1;
    }
    return `${size.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function buildGenericDescriptionEs(title, isPremium) {
    const name = String(title || 'este modelo').trim();
    return isPremium
        ? `Descarga STL premium de "${name}" vía MEGA con acceso rápido y seguro.`
        : `Descarga gratis STL de "${name}" vía MEGA y prepáralo para impresión 3D.`;
}

function buildGenericDescriptionEn(title, isPremium) {
    const name = String(title || 'this model').trim();
    return isPremium
        ? `Premium STL download of "${name}" via MEGA with fast and secure access.`
        : `Free STL download of "${name}" via MEGA, ready for 3D printing.`;
}

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
    if (!asset || (asset.__error && asset.status === 404)) {
        return { title: 'Modelo no encontrado', robots: { index: false, follow: false } };
    }
    // No indexar contenido no publicado aunque exista en la BD.
    if (asset?.unpublished) {
        return { title: 'Modelo no disponible', robots: { index: false, follow: false } };
    }

    const site = 'https://stl-hub.com';

    // Para errores transitorios (500/red), evitar noindex para no desindexar por fallos puntuales.
    if (asset?.__error) {
        return {
            title: 'STL HUB',
            description: 'Catálogo de modelos STL para impresión 3D.',
            alternates: { canonical: `${site}/asset/${params.slug}` },
        };
    }

    // Detectar idioma desde header inyectado por middleware
    let isEn = false;
    try {
        const { headers } = await import('next/headers');
        const h = await headers();
        isEn = h.get('x-lang') === 'en';
    } catch {}

    const isPremium = !!asset.isPremium;
    const titleEs =
        (isPremium ? 'Descargar STL premium ' : 'Descargar STL gratis ') +
        (asset.title || 'modelo 3D') +
        ' por MEGA';
    const titleEn =
        (isPremium ? 'Download premium STL ' : 'Download free STL ') +
        (asset.titleEn || asset.title || '3D model') +
        ' via MEGA';
    const descEs =
        (asset.description?.slice(0, 180) ||
            asset.title + ' STL para impresión 3D.') +
        (asset.tagsEs?.length
            ? ` Tags: ${asset.tagsEs.slice(0, 6).join(', ')}`
            : '');
    const descEn =
        (asset.descriptionEn?.slice(0, 180) ||
            (asset.titleEn || asset.title) + ' STL for 3D printing.') +
        (asset.tagsEn?.length
            ? ` Tags: ${asset.tagsEn.slice(0, 6).join(', ')}`
            : '');

    const baseTitle = isEn ? titleEn : titleEs;
    const desc = isEn ? descEn : descEs;
    const canonicalPath = isEn
        ? `${site}/en/asset/${asset.slug}`
        : `${site}/asset/${asset.slug}`;

    return {
        title: baseTitle,
        description: desc,
        alternates: {
            canonical: canonicalPath,
            languages: {
                'es-ES': `${site}/asset/${asset.slug}`,
                'en-US': `${site}/en/asset/${asset.slug}`,
            },
        },
        openGraph: {
            title: baseTitle,
            description: desc,
            type: 'article',
            locale: isEn ? 'en_US' : 'es_ES',
            url: canonicalPath,
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
        if (asset?.unpublished) {
            notFound();
        }
    const site = 'https://stl-hub.com';
    const uploadsBase = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'https://stl-hub.com/uploads';
    const imgList = (asset.images || []).slice(0, 5).map(i => i.startsWith('http') ? i : `${uploadsBase}/${i}`);
    const heroImage = imgList[0] || '/logo_horizontal.png';
    const categories = Array.isArray(asset.categories)
        ? asset.categories.map((c) => ({
              es: c?.name || c?.slug || '',
              en: c?.nameEn || c?.slugEn || c?.name || c?.slug || '',
              slug: c?.slug || c?.slugEn || '',
          })).filter((c) => c.es)
        : [];
    const tagsEs = Array.isArray(asset.tagsEs) ? asset.tagsEs.filter(Boolean) : [];
    const tagsEn = Array.isArray(asset.tagsEn) ? asset.tagsEn.filter(Boolean) : [];
    const mergedTags = Array.isArray(asset.tags)
        ? asset.tags
              .map((t) => ({
                  slug: String(t?.slug || t?.slugEn || '').trim(),
                  label: String(t?.name || t?.nameEn || t?.slug || t?.slugEn || '').trim(),
              }))
              .filter((t) => t.slug && t.label)
              .slice(0, 20)
        : [];
    const descriptionEsRaw = String(asset.description || '').trim();
    const descriptionEnRaw = String(asset.descriptionEn || '').trim();
    const descriptionEs = descriptionEsRaw || buildGenericDescriptionEs(asset.title, !!asset.isPremium);
    const descriptionEn = descriptionEnRaw || buildGenericDescriptionEn(asset.titleEn || asset.title, !!asset.isPremium);
    const priceValidUntil = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 365);
        return d.toISOString().slice(0, 10);
    })();
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
                    priceValidUntil,
                    availability: 'https://schema.org/InStock',
                    url: `${site}/asset/${asset.slug}`,
                    itemCondition: 'https://schema.org/NewCondition',
                },
            },
        ],
    };

    return (
        <>
            {/* JSON-LD enriquecido */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />

            <main className={styles.page}>
                <section className={styles.hero}>
                    <div
                        className={styles.heroBackground}
                        style={{ backgroundImage: `linear-gradient(120deg, rgba(9, 14, 29, 0.88), rgba(11, 16, 32, 0.62)), url('${heroImage}')` }}
                        aria-hidden="true"
                    />
                    <div className={styles.heroInner}>
                        <p className={styles.kicker}>STL HUB · Ficha de modelo 3D</p>
                        <h1 className={styles.title}>{asset.title || 'Modelo STL'}</h1>
                        <p className={styles.subtitle}>
                            {descriptionEs}
                        </p>
                        <div className={styles.badges}>
                            <span className={`${styles.badge} ${asset.isPremium ? styles.badgePremium : styles.badgeFree}`}>
                                {asset.isPremium ? 'Premium' : 'Gratis'}
                            </span>
                            {categories.slice(0, 3).map((cat, i) => (
                                <span key={`${cat.slug || cat.es}-${i}`} className={styles.badgeMuted}>
                                    {cat.es}
                                </span>
                            ))}
                            {asset.slug ? <span className={styles.badgeMuted}>Slug: {asset.slug}</span> : null}
                        </div>
                    </div>
                </section>

                <section className={styles.grid}>
                    <article className={styles.card}>
                        <h2>Descripcion en espanol</h2>
                        <p>{descriptionEs}</p>
                    </article>

                    <article className={styles.card}>
                        <h2>Description in English</h2>
                        <p>{descriptionEn}</p>
                    </article>

                    <article className={styles.card}>
                        <h2>Ficha tecnica</h2>
                        <dl className={styles.metaList}>
                            <div><dt>ID</dt><dd>{asset.id || 'N/A'}</dd></div>
                            <div><dt>Slug</dt><dd>{asset.slug || 'N/A'}</dd></div>
                            <div><dt>Estado</dt><dd>{asset.isPremium ? 'Contenido premium' : 'Contenido gratuito'}</dd></div>
                            <div><dt>Publicado</dt><dd>{formatDate(asset.createdAt)}</dd></div>
                            <div><dt>Actualizado</dt><dd>{formatDate(asset.updatedAt)}</dd></div>
                            <div><dt>Tamano archivo</dt><dd>{formatBytes(asset.archiveSizeB || asset.fileSizeB)}</dd></div>
                            <div><dt>Categoria principal</dt><dd>{categories[0]?.es || 'N/A'}</dd></div>
                        </dl>
                    </article>

                    <article className={styles.card}>
                        <h2>Categorias y tags</h2>
                        <p className={styles.metaHint}>Etiquetas tematicas para navegacion e indexacion:</p>
                        <div className={styles.tagWrap}>
                            {mergedTags.length === 0 ? <span className={styles.badgeMuted}>Sin tags</span> : null}
                            {mergedTags.map((t, i) => (
                                <Link key={`${t.slug}-${i}`} href={`/tags/${encodeURIComponent(t.slug)}`} className={styles.tagLink}>
                                    {t.label}
                                </Link>
                            ))}
                        </div>
                        <div className={styles.categoryWrap}>
                            {categories.map((cat, i) => (
                                <span key={`${cat.slug || cat.es}-${i}`} className={styles.categoryChip}>
                                    {cat.es}{cat.en && cat.en !== cat.es ? ` / ${cat.en}` : ''}
                                </span>
                            ))}
                        </div>
                    </article>
                </section>

                {imgList.length > 0 ? (
                    <section className={styles.galleryCard}>
                        <h2>Galeria de imagenes del modelo STL</h2>
                        <div className={styles.gallery}>
                            {imgList.map((img, i) => (
                                <figure key={`${img}-${i}`} className={styles.figure}>
                                    <img loading={i === 0 ? 'eager' : 'lazy'} src={img} alt={`${asset.title} render ${i + 1}`} />
                                    <figcaption>Vista {i + 1}</figcaption>
                                </figure>
                            ))}
                        </div>
                    </section>
                ) : null}
            </main>

            {/* Modal visual interactivo */}
            <AssetModalPageClient asset={asset} />
        </>
    );
}
