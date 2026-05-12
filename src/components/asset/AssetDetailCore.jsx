"use client";
import React from 'react';
import HttpService from '../../services/HttpService';
import Button from '../layout/Buttons/Button';
import { useI18n } from '../../i18n';
import useStore from '../../store/useStore';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Zoom } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';
import { usePromo } from '../../hooks/usePromo';
import SimplyModal from '../SimplyModal/SimplyModal';
import { useState, useEffect } from 'react';
import SectionRow from '../../home/SectionRow/SectionRow';
import { useRouter } from 'next/navigation';

// Componente reutilizable que representa el cuerpo del modal en vista standalone
export default function AssetDetailCore({ asset }) {
  const { t } = useI18n();
  const language = useStore(s => s.language);
  const token = useStore(s => s.token);
  const isEn = String(language||'es').toLowerCase() === 'en';
  const promo = usePromo();
  const http = new HttpService();
  const router = useRouter();

  const [downloading, setDownloading] = useState(false);
  const [accessModal, setAccessModal] = useState({ open: false, kind: null, expiredAt: null });
  const [relatedCats, setRelatedCats] = useState([]);
  const [relatedTags, setRelatedTags] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(true);

  useEffect(() => {
    if (!asset?.id) return;
    const fetchRelated = async () => {
      try {
        setLoadingRelated(true);
        // Construir slugs para consultar a la API de búsqueda
        const catSlugs = Array.isArray(asset.categories) ? asset.categories.map(c => c.slug).filter(Boolean).join(',') : '';
        const rawTags = Array.isArray(asset.tags) ? asset.tags.map(t => t.slug) : [];
        // Si no tiene array de objetos tags, intentar usar los raw slugs provistos en asset.tagsEs
        const finalTags = rawTags.length ? rawTags : (Array.isArray(asset.tagsEs) ? asset.tagsEs : []);
        const tagSlugs = finalTags.filter(Boolean).slice(0, 10).join(',');

        const pCats = catSlugs ? http.getData(`/assets/search?categories=${encodeURIComponent(catSlugs)}&pageSize=20`) : Promise.resolve({ data: { items: [] }});
        const pTags = tagSlugs ? http.getData(`/assets/search?tags=${encodeURIComponent(tagSlugs)}&pageSize=20`) : Promise.resolve({ data: { items: [] }});

        const [rCats, rTags] = await Promise.all([pCats, pTags]);
        console.log("RCATS", rCats?.data);
        console.log("RTAGS", rTags?.data);
        
        // Formatear items para el SectionRow y excluir el actual
        const formatItem = (it) => {
           const tagsEs = Array.isArray(it.tagsEs) ? it.tagsEs : [];
           const tagsEn = Array.isArray(it.tagsEn) ? it.tagsEn : tagsEs;
           return { ...it, chips: isEn ? tagsEn.slice(0,3) : tagsEs.slice(0,3), tagSlugs: tagsEs };
        };

        setRelatedCats((rCats?.data?.items || []).filter(i => i.id !== asset.id).map(formatItem));
        setRelatedTags((rTags?.data?.items || []).filter(i => i.id !== asset.id).map(formatItem));
      } catch (e) {
        console.error('Error fetching related', e);
      } finally {
        setLoadingRelated(false);
      }
    };
    fetchRelated();
  }, [asset?.id, isEn]);

  const openWindowSafely = () => {
    const win = window.open('about:blank', '_blank');
    return win || null;
  };

  const handleDownload = async () => {
    if (!asset) return;

    if (asset.isPremium && !token) {
      setAccessModal({ open: true, kind: 'not-auth', expiredAt: null });
      return;
    }

    if (asset.isPremium && token && promo.active) {
      try {
        setDownloading(true);
        const tmpWin = openWindowSafely();
        try {
          const r = await http.postData(`/assets/${asset.id}/request-download`, {});
          const link = r.data?.link;
          if (link) {
            tmpWin.location = link;
          } else {
            try { tmpWin.close(); } catch {}
            setAccessModal({ open: true, kind: 'error', expiredAt: null });
          }
        } catch (err) {
          try { tmpWin.close(); } catch {}
          const status = err?.response?.status;
          if (status === 401) {
            setAccessModal({ open: true, kind: 'not-auth', expiredAt: null });
          } else {
            setAccessModal({ open: true, kind: 'error', expiredAt: null });
          }
        } finally {
          setDownloading(false);
        }
      } catch {
        setDownloading(false);
      }
      return;
    }

    if (asset.isPremium && token) {
      try {
        setDownloading(true);
        const res = await http.getData('/me/profile');
        const user = res?.data || {};
        const sub = user?.subscription;

        if (sub?.status === 'ACTIVE' && (sub?.daysRemaining ?? 0) > 0) {
          const tmpWin = openWindowSafely();
          try {
            const r = await http.postData(`/assets/${asset.id}/request-download`, {});
            const link = r.data?.link;
            if (link) {
              tmpWin.location = link;
            } else {
              try { tmpWin.close(); } catch {}
              setAccessModal({ open: true, kind: 'error', expiredAt: null });
            }
          } catch (err) {
            try { tmpWin.close(); } catch {}
            const status = err?.response?.status;
            const code = err?.response?.data?.code;

            if (status === 401) {
              setAccessModal({ open: true, kind: 'not-auth', expiredAt: null });
            } else if (status === 403 && code === 'EXPIRED') {
              setAccessModal({ open: true, kind: 'expired', expiredAt: err?.response?.data?.expiredAt || sub?.currentPeriodEnd || null });
            } else if (status === 403 && code === 'NO_SUB') {
              setAccessModal({ open: true, kind: 'no-sub', expiredAt: null });
            } else {
              setAccessModal({ open: true, kind: 'error', expiredAt: null });
            }
          } finally {
            setDownloading(false);
          }
        } else if (sub?.status === 'EXPIRED') {
          setAccessModal({ open: true, kind: 'expired', expiredAt: sub?.currentPeriodEnd || null });
          setDownloading(false);
        } else {
          setAccessModal({ open: true, kind: 'no-sub', expiredAt: null });
          setDownloading(false);
        }
      } catch {
        setAccessModal({ open: true, kind: 'error', expiredAt: null });
        setDownloading(false);
      }
      return;
    }

    try {
      setDownloading(true);
      const tmpWin = openWindowSafely();
      try {
        const r = await http.postData(`/assets/${asset.id}/request-download`, {});
        const link = r.data?.link;
        if (link) {
          tmpWin.location = link;
        } else {
          try { tmpWin.close(); } catch {}
          setAccessModal({ open: true, kind: 'error', expiredAt: null });
        }
      } catch {
        try { tmpWin.close(); } catch {}
        setAccessModal({ open: true, kind: 'error', expiredAt: null });
      } finally {
        setDownloading(false);
      }
    } catch {
      setDownloading(false);
    }
  };

  if (!asset) return null;

  const title = isEn ? (asset.titleEn || asset.title) : (asset.title || asset.titleEn);
  const tags = isEn ? (asset.tagsEn || asset.tagsEs || []) : (asset.tagsEs || asset.tagsEn || []);
  const description = isEn
    ? (asset.descriptionEn || asset.description)
    : (asset.description || asset.descriptionEn);
  const images = Array.isArray(asset.images) ? asset.images : [];
  const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
  const imgUrl = (rel) => {
    if (!rel) return ''; const s = String(rel).trim();
    if (/^https?:\/\//i.test(s)) return s; return `${UPLOAD_BASE}/${s.replace(/\\/g,'/').replace(/^\/+/,'')}`;
  };

  const formatSize = (...values) => {
    const raw = values.find((v) => Number(v) > 0);
    const n = Number(raw || 0);
    if (!Number.isFinite(n) || n <= 0) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = n;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
        size /= 1024;
        i += 1;
    }
    return `${size.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  };

  const primaryCategory = Array.isArray(asset.categories) && asset.categories.length 
    ? (isEn ? (asset.categories[0].nameEn || asset.categories[0].name) : (asset.categories[0].name)) 
    : 'General';

  return (
    <div className="asset-detail-core" style={{ paddingBottom: '3rem' }}>
      <div className="asset-detail-core-inner" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
        <div className="gallery" style={{ flex: '1 1 500px' }}>
        <Swiper modules={[Navigation, Pagination, Zoom]} navigation pagination={{ clickable: true }} zoom className="asset-swiper">
          {(images.length?images:['/vite.svg']).map((src,i)=>(
            <SwiperSlide key={i}>
              <div className="img-wrapper" style={{position:'relative', width:'100%', aspectRatio:'4/3', overflow:'hidden'}}>
                <img src={imgUrl(src)} alt={title} style={{objectFit:'cover', width:'100%', height:'100%'}} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className="detail-body" style={{ flex: '1 1 400px' }}>
        <h1 className="asset-title" style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 700 }}>{title}</h1>
        <div className="meta-line" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', color: 'rgba(255,255,255,0.7)' }}>
          <span className="date">{asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('es-ES',{ day:'2-digit', month:'short', year:'numeric'}) : null}</span>
          {asset.downloads != null && <span className="downloads">{asset.downloads} descargas</span>}
          {asset.isPremium && (
            <span className={`premium-badge ${promo.active ? 'free-pass' : ''}`}>
              {promo.active ? 'Free Pass 🎉' : 'Premium'}
            </span>
          )}
        </div>
        {!!tags?.length && (
          <div className="tags" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {tags.slice(0,12).map((t,i)=>(
              <Link key={i} href={`/search?tags=${encodeURIComponent(t)}`} className="tag-link" style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '14px', fontSize: '0.85rem', color: '#fff', textDecoration: 'none' }}>#{t}</Link>
            ))}
          </div>
        )}
        {description && <p className="description" style={{marginBottom: '1.5rem', lineHeight: '1.6', fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)' }}>{description}</p>}

        <div className="technical-facts" style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', fontWeight: 600 }}>{isEn ? 'Technical Details' : 'Ficha Técnica'}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{isEn ? 'Size' : 'Tamaño'}</span>
                    <span style={{ fontWeight: 500 }}>{formatSize(asset.archiveSizeB, asset.fileSizeB)}</span>
                </div>
                <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{isEn ? 'Category' : 'Categoría'}</span>
                    <span style={{ fontWeight: 500 }}>{primaryCategory}</span>
                </div>
                <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{isEn ? 'Updated' : 'Actualizado'}</span>
                    <span style={{ fontWeight: 500 }}>{asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString(isEn ? 'en-US' : 'es-ES', { day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A'}</span>
                </div>
                <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>ID</span>
                    <span style={{ fontWeight: 500 }}>{asset.id}</span>
                </div>
            </div>
        </div>
        
        <div className="cta-block" style={{marginTop:'1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
          <Button 
            onClick={handleDownload}
            disabled={downloading}
            variant={asset.isPremium ? 'purple' : 'cyan'} 
            styles={{width:'240px',height:'56px', fontSize: '1.1rem'}}
          >
            {downloading && <span className="btn-spinner" aria-hidden style={{marginRight: '8px'}} />}
            {downloading
                ? t('asset.modal.processing')
                : asset.isPremium
                ? (promo.active
                  ? (isEn ? 'Download (Free Pass) 🎉' : 'Descargar (Free Pass) 🎉')
                  : t('asset.modal.downloadPremium'))
                : t('asset.modal.downloadNow')}
          </Button>

          <Button variant="outline" styles={{width:'220px',height:'56px'}} href={`/search?related=${asset.slug}`}>
            {isEn ? 'Search similar' : 'Buscar similares'}
          </Button>
        </div>
      </div>
      </div>

      {/* Secciones de Relacionados usando SectionRow de la Home */}
      {(!loadingRelated && relatedCats.length > 0) && (
        <div className="related-section" style={{ marginTop: '2rem' }}>
            <SectionRow
                title={isEn ? `More in ${primaryCategory}` : `Más en ${primaryCategory}`}
                items={relatedCats}
                onItemClick={(it) => router.push(isEn ? `/en/asset/${it.slug}` : `/asset/${it.slug}`)}
                variantClass="section-row--dark"
            />
        </div>
      )}

      {(!loadingRelated && relatedTags.length > 0) && (
        <div className="related-section" style={{ marginTop: '2rem' }}>
            <SectionRow
                title={isEn ? 'Related by tags' : 'Relacionados por etiquetas'}
                items={relatedTags}
                onItemClick={(it) => router.push(isEn ? `/en/asset/${it.slug}` : `/asset/${it.slug}`)}
                variantClass="section-row--dark"
            />
        </div>
      )}

      <SimplyModal
        open={accessModal.open}
        onClose={() => setAccessModal({ open: false, kind: null, expiredAt: null })}
        title={accessModal.kind === 'not-auth' ? (isEn ? 'Access restricted' : 'Acceso restringido') :
               accessModal.kind === 'expired' ? (isEn ? 'Subscription expired' : 'Suscripción vencida') :
               accessModal.kind === 'no-sub' ? (isEn ? 'Subscription required' : 'Requiere suscripción') :
               (isEn ? 'We had a problem' : 'Tuvimos un problema')}
      >
        <p style={{ marginBottom: '1rem' }}>
          {accessModal.kind === 'not-auth' ? (isEn ? 'You must be logged in and have an active subscription to download.' : 'Debes iniciar sesión y tener una suscripción activa para descargar.') :
           accessModal.kind === 'expired' ? (isEn ? 'Your subscription has expired. Please renew to continue.' : 'Tu suscripción ha vencido. Por favor renueva para continuar.') :
           accessModal.kind === 'no-sub' ? (isEn ? 'You need an active subscription to download premium assets.' : 'Necesitas una suscripción activa para descargar assets premium.') :
           (isEn ? 'We couldn’t verify your access right now. Please try again.' : 'No pudimos verificar tu acceso. Intenta de nuevo.')}
        </p>
        <div className="actions center" style={{ gap: 8, marginTop: 8, justifyContent: 'center', display: 'flex' }}>
          {accessModal.kind === 'not-auth' && <Button as="link" href="/login" variant="purple" width="160px">{isEn ? 'Log in' : 'Iniciar sesión'}</Button>}
          {accessModal.kind === 'no-sub' && <Button as="link" href="/suscripcion" variant="purple" width="160px">{isEn ? 'Subscribe' : 'Suscribirse'}</Button>}
          {accessModal.kind === 'expired' && <Button as="link" href="/suscripcion" variant="purple" width="160px">{isEn ? 'Renew now' : 'Renovar ahora'}</Button>}
          {accessModal.kind === 'error' && <Button onClick={() => setAccessModal({ open: false, kind: null, expiredAt: null })} variant="purple" width="120px">{isEn ? 'Close' : 'Cerrar'}</Button>}
        </div>
      </SimplyModal>
    </div>
  );
}
