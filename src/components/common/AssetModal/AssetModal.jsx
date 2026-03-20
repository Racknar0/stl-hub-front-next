'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './AssetModal.scss';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Zoom } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';
import Button from '../../layout/Buttons/Button';
import HttpService from '../../../services/HttpService';
import useStore from '../../../store/useStore';
import { useI18n } from '../../../i18n';
import Link from 'next/link';
import SimplyModal from '../SimplyModal/SimplyModal';
import ReportBrokenModal from '../ReportBrokenModal/ReportBrokenModal';
import { Dialog, IconButton, Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

export default function AssetModal({ open, onClose, asset }) {
    const http = useMemo(() => new HttpService(), []);
    const token = useStore((s) => s.token);
    const language = useStore((s) => s.language);
    const { t } = useI18n();

    const isEn = String(language || 'es').toLowerCase() === 'en';
    const UPLOAD_BASE =
        process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
    const imgUrl = (rel) => {
        if (!rel) return '';
        const s = String(rel).trim();
        if (/^https?:\/\//i.test(s)) return s;
        const clean = s.replace(/\\/g, '/').replace(/^\/+/, '');
        return `${UPLOAD_BASE}/${clean}`;
    };

    const [downloading, setDownloading] = useState(false);
    const [reporting, setReporting] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [fullOpen, setFullOpen] = useState(false);

    const formatDateShort = (value) => {
        if (!value) return 'N/A';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return 'N/A';
        try {
            return new Intl.DateTimeFormat(isEn ? 'en-US' : 'es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }).format(d);
        } catch {
            return d.toISOString().slice(0, 10);
        }
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

    // Modal de acceso (dinámico según /me/profile)
    // kind: 'not-auth' | 'expired' | 'no-sub' | 'error' | null
    const [accessModal, setAccessModal] = useState({
        open: false,
        kind: null,
        expiredAt: null,
    });

    // Estado local para enriquecer datos (categorías, etc.)
    const [data, setData] = useState(asset);
    const loadedDetail = useRef(false);

    useEffect(() => {
        setData(asset);
        loadedDetail.current = false;
    }, [asset?.id]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        if (open) {
            document.addEventListener('keydown', onEsc);
            document.body.classList.add('modal-open');
        }
        return () => {
            document.removeEventListener('keydown', onEsc);
            document.body.classList.remove('modal-open');
        };
    }, [open, onClose]);

    // Enriquecer categorías si no vienen
    useEffect(() => {
        if (!open || !data?.id || loadedDetail.current) return;
        const needCategories =
            !Array.isArray(data?.categories) || data.categories.length === 0;
        const needDescription = !String(data?.description || '').trim();
        if (!needCategories && !needDescription) return;
        (async () => {
            try {
                const res = await http.getData(`/assets/${data.id}`);
                const d = res.data || {};
                setData((prev) => ({
                    ...prev,
                    description: String(d.description || prev?.description || '').trim(),
                    descriptionEn: String(d.descriptionEn || prev?.descriptionEn || '').trim(),
                    categories: Array.isArray(d.categories)
                        ? d.categories
                        : prev?.categories,
                    titleEn: d.titleEn ?? prev?.titleEn,
                    tagsEn: Array.isArray(d.tagsEn) ? d.tagsEn : prev?.tagsEn,
                    tagsEs: Array.isArray(d.tagsEs) ? d.tagsEs : prev?.tagsEs,
                }));
                loadedDetail.current = true;
            } catch {}
        })();
    }, [open, data?.id, http]);

    if (!data) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose?.();
    };


    // Helper para abrir ventana sin ser bloqueado (devuelve el handle)
    const openWindowSafely = () => {
      // No pasar 'noopener,noreferrer' aquí porque Chrome/Safari devolverán null
      const win = window.open('about:blank', '_blank');
      return win || null;
    };

    // --- Descargar con chequeo de acceso ---
    const handleDownload = async () => {
      if (!data) return;

      // Premium y NO logueado → pedir login
      if (data.isPremium && !token) {
        setAccessModal({ open: true, kind: 'not-auth', expiredAt: null });
        return;
      }

      // Premium y logueado → revisar suscripción y descargar
      if (data.isPremium && token) {
        try {
          setDownloading(true);

          // 1) Perfil (usa HttpService con Authorization header)
          const res = await http.getData('/me/profile');
          const user = res?.data || {};
          const sub = user?.subscription;

          if (sub?.status === 'ACTIVE' && (sub?.daysRemaining ?? 0) > 0) {
            // 2) Solicitar link (NO pasar token en body)
            const tmpWin = openWindowSafely();
            try {
              const r = await http.postData(`/assets/${data.id}/request-download`, {});
              const link = r.data?.link;
              if (link) {
                tmpWin.location = link; // usar ventana ya abierta para evitar bloqueos
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
                setAccessModal({
                  open: true,
                  kind: 'expired',
                  expiredAt: err?.response?.data?.expiredAt || sub?.currentPeriodEnd || null,
                });
              } else if (status === 403 && code === 'NO_SUB') {
                setAccessModal({ open: true, kind: 'no-sub', expiredAt: null });
              } else if (status === 409) {
                // asset no publicado o link no listo
                setAccessModal({ open: true, kind: 'error', expiredAt: null });
              } else {
                setAccessModal({ open: true, kind: 'error', expiredAt: null });
              }
            } finally {
              setDownloading(false);
            }
          } else if (sub?.status === 'EXPIRED') {
            setAccessModal({
              open: true,
              kind: 'expired',
              expiredAt: sub?.currentPeriodEnd || null,
            });
            setDownloading(false);
          } else {
            // sin suscripción o estado desconocido
            setAccessModal({ open: true, kind: 'no-sub', expiredAt: null });
            setDownloading(false);
          }
        } catch {
          // Error al consultar perfil
          setAccessModal({ open: true, kind: 'error', expiredAt: null });
          setDownloading(false);
        }
        return;
      }

      // Asset gratuito → descarga directa
      try {
        setDownloading(true);
        const tmpWin = openWindowSafely();
        try {
          const r = await http.postData(`/assets/${data.id}/request-download`, {}); // sin token en body
          const link = r.data?.link;
          if (link) {
            tmpWin.location = link;
          } else {
            try { tmpWin.close(); } catch {}
            setAccessModal({ open: true, kind: 'error', expiredAt: null });
          }
        } catch {
          try { tmpWin.close(); } catch {}
          // Para free normalmente no debería pedir auth, pero maneja por si acaso:
          setAccessModal({ open: true, kind: 'error', expiredAt: null });
        } finally {
          setDownloading(false);
        }
      } catch {
        setDownloading(false);
      }
    };


    // Derivar campos según idioma actual
    const displayTitle = isEn
        ? data.titleEn || data.title
        : data.title || data.titleEn;

    const isEmptyCategory = (val) => {
        const v = String(val || '')
            .trim()
            .toLowerCase();
        return (
            !v ||
            [
                'uncategorized',
                'unclassified',
                'general',
                'none',
                'null',
                'undefined',
            ].includes(v)
        );
    };

    const slugify = (txt) =>
        String(txt || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

    // Preparar categorías para vista con etiqueta y slug por idioma
    let displayCategories = [];
    if (Array.isArray(data?.categories) && data.categories.length) {
        displayCategories = data.categories
            .map((c) => ({
                id: c?.id,
                label: isEn
                    ? c?.nameEn || c?.name || c?.slugEn || c?.slug
                    : c?.name || c?.nameEn || c?.slug || c?.slugEn,
                slug: isEn ? c?.slugEn || c?.slug : c?.slug || c?.slugEn,
            }))
            .filter((c) => !!c.label);
    } else {
        const rawCat = isEn
            ? data.categoryEn ??
              data.categoryNameEn ??
              data.category ??
              data.categoryName
            : data.category ??
              data.categoryName ??
              data.categoryEn ??
              data.categoryNameEn;
        if (!isEmptyCategory(rawCat)) {
            displayCategories = [
                { id: 'legacy', label: rawCat, slug: slugify(rawCat) },
            ];
        }
    }

    const catHref = (c) => {
        if (!c) return '#';
        const s =
            typeof c === 'string'
                ? c
                : isEn
                ? c.slug || c.slugEn
                : c.slug || c.slugEn;
        const q = encodeURIComponent(
            s || (typeof c !== 'string' ? c.label : c) || ''
        );
        return `/search?categories=${q}`;
    };

    // --- TAGS / CHIPS NORMALIZATION ---
    // Listados (home/buscador) proveen: chipsEs, chipsEn, tagSlugs
    // Página detalle (/asset/[slug]) provee: tags (objetos) + tagsEs + tagsEn
    // Unificamos para que el modal siempre muestre tags correctamente.
    const derivedTagsEs = Array.isArray(data.tagsEs)
        ? data.tagsEs
        : Array.isArray(data.tags)
        ? data.tags.map((t) => t?.slug).filter(Boolean)
        : [];
    const derivedTagsEn = Array.isArray(data.tagsEn)
        ? data.tagsEn
        : Array.isArray(data.tags)
        ? data.tags
              .map((t) => t?.nameEn || t?.name || t?.slug)
              .filter(Boolean)
        : [];
    const chipsEs = Array.isArray(data.chipsEs)
        ? data.chipsEs
        : Array.isArray(data.chips)
        ? data.chips
        : derivedTagsEs;
    const chipsEn = Array.isArray(data.chipsEn)
        ? data.chipsEn
        : derivedTagsEn.length
        ? derivedTagsEn
        : chipsEs;
    const chips = isEn ? chipsEn : chipsEs;
    const tagSlugs = Array.isArray(data.tagSlugs)
        ? data.tagSlugs
        : Array.isArray(data.tags)
        ? data.tags.map((t) => t?.slug).filter(Boolean)
        : derivedTagsEs;

    const technicalFacts = [
        {
            key: 'id',
            label: isEn ? 'ID' : 'ID',
            value: data?.id || 'N/A',
        },
        {
            key: 'slug',
            label: 'Slug',
            value: data?.slug || 'N/A',
        },
        {
            key: 'type',
            label: isEn ? 'Type' : 'Tipo',
            value: data?.isPremium ? (isEn ? 'Premium' : 'Premium') : (isEn ? 'Free' : 'Gratis'),
        },
        {
            key: 'size',
            label: isEn ? 'Size' : 'Tamaño',
            value: formatSize(data?.archiveSizeB, data?.fileSizeB),
        },
        {
            key: 'created',
            label: isEn ? 'Published' : 'Publicado',
            value: formatDateShort(data?.createdAt),
        },
        {
            key: 'updated',
            label: isEn ? 'Updated' : 'Actualizado',
            value: formatDateShort(data?.updatedAt),
        },
    ];

    // Fallback de descripción (por si el asset viene de listados y aún no pasó por /slug)
    const buildAutoDescription = (lang) => {
        const isPremium = !!data?.isPremium;
        const titleEs = data?.title || '';
        const titleEn = data?.titleEn || data?.title || '';
        const titleNormEs = titleEs.replace(/^\s*STL\s*-/i, '').trim();
        const titleNormEn = titleEn.replace(/^\s*STL\s*-/i, '').trim();
        const catObj = Array.isArray(data?.categories) && data.categories.length ? data.categories[0] : null;
        const catEs = catObj ? (catObj.name || catObj.slug || '') : '';
        const catEn = catObj ? (catObj.nameEn || catObj.name || catObj.slugEn || catObj.slug || '') : '';
        const tagsListEs = derivedTagsEs.slice(0, 6).join(', ');
        const tagsListEn = derivedTagsEn.slice(0, 6).join(', ');
        if (lang === 'en') {
            let intro = isPremium
                ? `Premium STL download of "${titleNormEn || data?.slug}" via MEGA (fast & secure).`
                : `Free STL download of "${titleNormEn || data?.slug}" via MEGA instantly.`;
            if (catEn) intro += ` Category: ${catEn}.`;
            intro += isPremium
                ? ' Subscribe to unlock this and more exclusive models.'
                : ' Print it today at no cost.';
            if (tagsListEn) intro += ` Tags: ${tagsListEn}.`;
            return intro.length > 300 ? intro.slice(0, 297).replace(/[,.;:\s]+$/,'') + '…' : intro;
        } else {
            let intro = isPremium
                ? `Descarga STL premium de "${titleNormEs || data?.slug}" vía MEGA (acceso rápido y seguro).`
                : `Descarga gratuita STL de "${titleNormEs || data?.slug}" vía MEGA al instante.`;
            if (catEs) intro += ` Categoría: ${catEs}.`;
            intro += isPremium
                ? ' Suscríbete para desbloquear este y más modelos exclusivos.'
                : ' Imprime en 3D hoy mismo sin costo.';
            if (tagsListEs) intro += ` Tags: ${tagsListEs}.`;
            return intro.length > 300 ? intro.slice(0, 297).replace(/[,.;:\s]+$/,'') + '…' : intro;
        }
    };

    // Estado y handler para "Reportar link caído"
    const showReportButton = !data?.isPremium || !!token;
    const handleReportBroken = () => setShowReport(true);

    // ---- Render helpers del modal de acceso ----
    const accessTitle =
        accessModal.kind === 'not-auth'
            ? isEn
                ? 'Access restricted'
                : 'Acceso restringido'
            : accessModal.kind === 'expired'
            ? isEn
                ? 'Subscription expired'
                : 'Suscripción vencida'
            : accessModal.kind === 'no-sub'
            ? isEn
                ? 'Subscription required'
                : 'Requiere suscripción'
            : accessModal.kind === 'error'
            ? isEn
                ? 'We had a problem'
                : 'Tuvimos un problema'
            : '';

    const accessMessage = (() => {
        switch (accessModal.kind) {
            case 'not-auth':
                return isEn
                    ? 'You must be logged in and have an active subscription to download.'
                    : 'Debes iniciar sesión y tener una suscripción activa para descargar.';
            case 'expired': {
                const d = accessModal.expiredAt
                    ? new Date(accessModal.expiredAt)
                    : null;
                const dateStr = d ? d.toLocaleDateString() : null;
                return isEn
                    ? dateStr
                        ? `Your subscription expired on ${dateStr}. Please renew to continue.`
                        : 'Your subscription has expired. Please renew to continue.'
                    : dateStr
                    ? `Tu suscripción venció el ${dateStr}. Por favor renueva para continuar.`
                    : 'Tu suscripción ha vencido. Por favor renueva para continuar.';
            }
            case 'no-sub':
                return isEn
                    ? 'You need an active subscription to download premium assets.'
                    : 'Necesitas una suscripción activa para descargar assets premium.';
            case 'error':
                return isEn
                    ? 'We couldn’t verify your access right now. Please try again.'
                    : 'No pudimos verificar tu acceso. Intenta de nuevo.';
            default:
                return '';
        }
    })();

    const accessActions = (
        <div
            className="actions center"
            style={{ gap: 8, marginTop: 8, justifyContent: 'center' }}
        >
            {accessModal.kind === 'not-auth' && (
                <Button as="link" href="/login" variant="purple" width="160px">
                    {isEn ? 'Log in' : 'Iniciar sesión'}
                </Button>
            )}
            {accessModal.kind === 'no-sub' && (
                <Button
                    as="link"
                    href="/suscripcion"
                    variant="purple"
                    width="160px"
                >
                    {isEn ? 'Subscribe' : 'Suscribirse'}
                </Button>
            )}
            {accessModal.kind === 'expired' && (
                <Button
                    as="link"
                    href="/suscripcion"
                    variant="purple"
                    width="160px"
                >
                    {isEn ? 'Renew now' : 'Renovar ahora'}
                </Button>
            )}
            {accessModal.kind === 'error' && (
                <Button
                    onClick={() =>
                        setAccessModal({
                            open: false,
                            kind: null,
                            expiredAt: null,
                        })
                    }
                    variant="purple"
                    width="120px"
                >
                    {isEn ? 'Close' : 'Cerrar'}
                </Button>
            )}
        </div>
    );

    return (
        <>
            <div
                className={`asset-modal modal fade ${open ? 'show' : ''}`}
                style={{ display: open ? 'block' : 'none' }}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="asset-modal-title"
                onMouseDown={handleBackdropClick}
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content asset-modal__content">
                        <div className="topbar">
                            <Link href="/" className="brand" aria-label="Ir al inicio">
                                STL Hub
                            </Link>
                            {showReportButton && (
                                <button
                                    type="button"
                                    className="report-btn"
                                    onClick={handleReportBroken}
                                    disabled={reporting}
                                    aria-label={
                                        isEn
                                            ? 'Report broken link'
                                            : 'Reportar link caído'
                                    }
                                    title={
                                        isEn
                                            ? 'Report broken link'
                                            : 'Reportar link caído'
                                    }
                                >
                                    <span aria-hidden>🚩</span>
                                    <span>
                                        {isEn
                                            ? 'Report broken link'
                                            : 'Reportar link caído'}
                                    </span>
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn-close "
                                aria-label="Cerrar"
                                onClick={onClose}
                            />
                        </div>

                        <div className="modal-body dialog-body">
                            <div className="gallery">
                               
                                <div className="slider-container" style={{ position: 'relative' }}>

                                     {/* Botón pantalla completa */}
                                    <IconButton
                                        onClick={() => setFullOpen(true)}
                                        aria-label={isEn ? 'Fullscreen' : 'Pantalla completa'}
                                        size="small"
                                        sx={{ position: 'absolute', right: 8, bottom: 8, zIndex: 2, color: '#fff', backgroundColor: 'rgba(0,0,0,0.45)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.65)' } }}
                                        title={isEn ? 'Fullscreen' : 'Pantalla completa'}
                                    >
                                        <FullscreenIcon fontSize="large" />
                                    </IconButton>
                                    <Swiper
                                        modules={[Navigation, Pagination, Zoom]}
                                        navigation
                                        pagination
                                        loop
                                        zoom={{ maxRatio: 3 }}
                                    >
                                        {(data.images || [])
                                            .map((src, idx) => (
                                                <SwiperSlide key={idx}>
                                                    <div className="swiper-zoom-container">
                                                        <img
                                                            src={imgUrl(src)}
                                                            alt={`${displayTitle} ${idx + 1}`}
                                                        />
                                                    </div>
                                                </SwiperSlide>
                                            ))}
                                    </Swiper>
                                </div>
                            </div>

                            <div className="meta">
                                <div
                                    className="meta-content"
                                    style={{ position: 'relative' }}
                                >

                    {/* Dialog a pantalla completa con el mismo slider (sin AppBar) */}
                    <Dialog fullScreen open={fullOpen} onClose={() => setFullOpen(false)}>
                        <Box sx={{ position: 'relative', p: 0, bgcolor: 'black', width: '100vw', height: '100vh', overflow: 'hidden' }}>
                            {/* Botón cerrar flotante */}
                            <IconButton
                                onClick={() => setFullOpen(false)}
                                aria-label={isEn ? 'Close' : 'Cerrar'}
                                sx={{ position: 'absolute', right: 16, top: 16, zIndex: 3, color: '#fff', bgcolor: 'rgba(0,0,0,0.6)', width: 56, height: 56, '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
                                title={isEn ? 'Close' : 'Cerrar'}
                            >
                                <CloseIcon sx={{ fontSize: 30 }} />
                            </IconButton>
                            <Box sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                '& .swiper': {
                                    width: '100vw',
                                    height: '100vh',
                                    overflow: 'hidden'
                                },
                                '& .swiper-wrapper': {
                                    alignItems: 'center'
                                },
                                '& .swiper-slide': {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                },
                                '& img': {
                                    maxWidth: '100vw',
                                    maxHeight: '100vh',
                                    width: 'auto',
                                    height: 'auto',
                                    objectFit: 'contain',
                                    display: 'block',
                                    margin: '0 auto'
                                }
                            }}>
                                <Swiper
                                    modules={[Navigation, Pagination, Zoom]}
                                    navigation
                                    pagination
                                    loop
                                    zoom={{ maxRatio: 3 }}
                                >
                                    {(data.images || []).map((src, idx) => (
                                        <SwiperSlide key={`full-${idx}`}>
                                            <div className="swiper-zoom-container">
                                                <img src={imgUrl(src)} alt={`${displayTitle} ${idx + 1}`} />
                                            </div>
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            </Box>
                        </Box>
                    </Dialog>
                                    <div className="meta-header">
                                        <Link
                                            href="/"
                                            aria-label="Ir al inicio"
                                            onClick={(e) => e.stopPropagation()}
                                            className="brand-link"
                                        >
                                            <img
                                                className="brand-logo"
                                                src="/nuevo_horizontal.png"
                                                alt="STL Hub"
                                            />
                                        </Link>

                                        <div className="meta-headlines">
                                            <div className="title-row">
                                                <h3
                                                    id="asset-modal-title"
                                                    className="title"
                                                >
                                                    {displayTitle}
                                                </h3>
                                            </div>

                                            <div className="head-badges">
                                                <span className={`head-badge ${data?.isPremium ? 'is-premium' : 'is-free'}`}>
                                                    {data?.isPremium ? (isEn ? 'Premium' : 'Premium') : (isEn ? 'Free' : 'Gratis')}
                                                </span>
                                                {data?.slug && (
                                                    <Link
                                                        href={`/asset/${data.slug}`}
                                                        onClick={(e)=> e.stopPropagation()}
                                                        className="detail-link"
                                                    >
                                                        {isEn ? 'open page' : 'ver página'}
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="meta-details">
                                        {/* Descripción (autogenerada del backend si existe) */}
                                        {(() => {
                                            const rawDesc = isEn
                                                ? (data.descriptionEn || data.description)
                                                : (data.description || data.descriptionEn);
                                            const baseDesc = rawDesc && rawDesc.trim().length ? rawDesc : buildAutoDescription(isEn ? 'en' : 'es');
                                            if (!baseDesc) return null;
                                            return (
                                                <p className="asset-desc">{baseDesc}</p>
                                            );
                                        })()}

                                        <div className="meta-block compact">
                                            <div className="block-title">
                                                {isEn ? 'Technical details' : 'Ficha técnica'}
                                            </div>
                                            <div className="facts-grid">
                                                {technicalFacts.map((f) => (
                                                    <div className="fact" key={f.key}>
                                                        <span className="fact-label">{f.label}</span>
                                                        <span className="fact-value">{String(f.value || 'N/A')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Categorías */}
                                        <div className="meta-block">
                                            <div className="block-title">
                                                {isEn
                                                    ? 'Categories'
                                                    : 'Categorías'}
                                            </div>
                                            {displayCategories.length ? (
                                                <div className="chips center chips-compact">
                                                    {displayCategories.map(
                                                        (c) => (
                                                            <Link
                                                                key={
                                                                    c.id ||
                                                                    c.slug ||
                                                                    c.label
                                                                }
                                                                className="chip chip--link"
                                                                href={catHref(
                                                                    c
                                                                )}
                                                            >
                                                                #{c.label}
                                                            </Link>
                                                        )
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="chips center">
                                                    <span className="chip chip--disabled">
                                                        {isEn
                                                            ? 'Uncategorized'
                                                            : 'Sin categoría'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Tags */}
                                        <div
                                            className="meta-block"
                                            style={{ marginTop: '.75rem' }}
                                        >
                                            <div className="block-title">
                                                {isEn ? 'Tags' : 'Etiquetas'}
                                            </div>
                                            {chips?.length ? (
                                                <div className="chips center chips-compact">
                                                    {chips.map((c, i) => (
                                                        <Link
                                                            key={i}
                                                            className="chip chip--link"
                                                            href={`/search?tags=${encodeURIComponent(
                                                                tagSlugs[i] ?? c
                                                            )}`}
                                                        >
                                                            #{c}
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="chips center">
                                                    <span className="chip chip--disabled">
                                                        {isEn
                                                            ? 'No tags'
                                                            : 'Sin etiquetas'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="actions center">
                                        <Button
                                            onClick={handleDownload}
                                            disabled={downloading}
                                            variant={
                                                data.isPremium
                                                    ? 'purple'
                                                    : 'cyan'
                                            }
                                            className="btn-big"
                                        >
                                            {downloading && (
                                                <span
                                                    className="btn-spinner"
                                                    aria-hidden
                                                />
                                            )}
                                            {downloading
                                                ? t('asset.modal.processing')
                                                : data.isPremium
                                                ? t(
                                                      'asset.modal.downloadPremium'
                                                  )
                                                : t('asset.modal.downloadNow')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {open && <div className="modal-backdrop fade show" />}

            {/* Modal de reporte de link caído */}
            <ReportBrokenModal
                open={showReport}
                assetId={data?.id}
                assetTitle={displayTitle}
                onClose={() => setShowReport(false)}
                onSubmitted={() => {}}
            />

            {/* Modal dinámico de acceso */}
            <SimplyModal
                open={accessModal.open}
                onClose={() =>
                    setAccessModal({ open: false, kind: null, expiredAt: null })
                }
                title={accessTitle}
            >
                <p style={{ marginBottom: '1rem' }}>{accessMessage}</p>
                {accessActions}
            </SimplyModal>
        </>
    );
}
