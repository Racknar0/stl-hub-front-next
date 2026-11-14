'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Dialog, DialogContent, Box, Stack, Typography, TextField, IconButton,
    Chip, Button, Autocomplete, FormControlLabel, Switch, Link as MUILink,
    CircularProgress, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import LinkIcon from '@mui/icons-material/Link';
import SaveIcon from '@mui/icons-material/Save';
import EditOutlined from '@mui/icons-material/EditOutlined';
import OpenInNew from '@mui/icons-material/OpenInNew';
import UndoOutlined from '@mui/icons-material/UndoOutlined';
import AssetDetailSections from './AssetDetailSections';

/* ───── helpers ───── */
const fmtDate = (raw) => {
    if (!raw) return '-';
    if (typeof raw === 'object' && raw !== null) raw = raw?.toISOString?.() || JSON.stringify(raw);
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString('es-ES');
};

const slugify = (s) =>
    String(s || '').toLowerCase().trim()
        .replace(/[^a-z0-9-\s_]+/g, '')
        .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);

/* ───── styles ───── */
const panelBg = 'rgba(15,23,42,0.96)';
const fieldSx = {
    '& .MuiOutlinedInput-root': {
        bgcolor: 'rgba(255,255,255,0.03)',
        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
        '&:hover fieldset': { borderColor: 'rgba(56,189,248,0.35)' },
        '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
    },
};
const labelSx = { fontSize: '0.7rem', color: 'rgba(200,210,230,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 };

/* ═══════════════════════════════════════════════════════════════ */
export default function ModalAsset({
    open, onClose, mode = 'edit', onStartEdit, onCancelEdit, detailError,
    detail, selected, loadingDetail,
    imgUrl, formatMBfromB,
    // edit
    editForm, setEditForm,
    categories, allTags,
    editImageFiles, setEditImageFiles,
    editPreviewIndex, setEditPreviewIndex,
    fileInputRef,
    onSelectFiles, onOpenFilePicker,
    onPrev, onNext, onDrop, onDragOver, onRemove, onSelectPreview,
    loading, onSave,
    // navigation
    onPrevAsset, onNextAsset,
    assetIndex, totalAssets,
    // dirty check
    onNavigateWithDirtyCheck,
}) {
    const dragFromRef = useRef(null);
    const asset = detail || selected;
    const editing = mode === 'edit';
    if (!open) return null;

    /* ── image gallery data ── */
    const hasNewImages = editing && editImageFiles && editImageFiles.length > 0;
    const serverImages = Array.isArray(asset?.images) ? asset.images : [];
    const galleryImages = hasNewImages ? editImageFiles : serverImages.map((rel, i) => ({ id: `srv-${i}`, url: imgUrl(rel), name: rel, server: true }));
    const activeIdx = hasNewImages ? editPreviewIndex : Math.min(editPreviewIndex, Math.max(0, galleryImages.length - 1));
    const activeImg = galleryImages[activeIdx];

    /* ── thumb drag reorder ── */
    const handleThumbDragStart = (idx) => (e) => { dragFromRef.current = idx; try { e.dataTransfer.effectAllowed = 'move'; } catch {} };
    const handleThumbDragOver = (e) => { e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch {} };
    const handleThumbDrop = (toIdx) => (e) => {
        e.preventDefault();
        const from = dragFromRef.current;
        dragFromRef.current = null;
        if (typeof from !== 'number' || from === toIdx) return;
        if (hasNewImages) {
            setEditImageFiles((prev) => {
                const arr = [...prev]; const [item] = arr.splice(from, 1); arr.splice(toIdx, 0, item); return arr;
            });
            setEditPreviewIndex(toIdx);
        }
    };

    /* ── gallery nav ── */
    const goPrev = () => setEditPreviewIndex((i) => (i - 1 + galleryImages.length) % Math.max(1, galleryImages.length));
    const goNext = () => setEditPreviewIndex((i) => (i + 1) % Math.max(1, galleryImages.length));

    /* ── nav arrows style ── */
    const navArrowSx = {
        position: 'fixed', top: '50%', transform: 'translateY(-50%)', zIndex: 9999,
        width: 48, height: 48,
        bgcolor: 'rgba(15,23,42,0.92)', border: '1px solid rgba(56,189,248,0.25)',
        color: '#e2e8f0', backdropFilter: 'blur(8px)',
        '&:hover': { bgcolor: 'rgba(56,189,248,0.18)', borderColor: '#38bdf8', color: '#fff' },
        transition: 'all 180ms ease',
    };

    return (
        <>
            {/* ── Asset navigation arrows ── */}
            {assetIndex > 0 && (
                <IconButton onClick={() => onNavigateWithDirtyCheck('prev')} sx={{ ...navArrowSx, left: 12 }} title="Asset anterior">
                    <ChevronLeftIcon sx={{ fontSize: 28 }} />
                </IconButton>
            )}
            {assetIndex < totalAssets - 1 && (
                <IconButton onClick={() => onNavigateWithDirtyCheck('next')} sx={{ ...navArrowSx, right: 12 }} title="Siguiente asset">
                    <ChevronRightIcon sx={{ fontSize: 28 }} />
                </IconButton>
            )}

            <Dialog
                open={open}
                onClose={onClose}
                maxWidth="xl"
                fullWidth
                slotProps={{
                    backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' } },
                    paper: { sx: {
                        bgcolor: panelBg, borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        maxHeight: '92vh', height: '92vh',
                        boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
                    }},
                }}
            >
                {/* ── Header ── */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 3, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(56,189,248,0.7)', fontWeight: 700, fontFamily: 'monospace' }}>
                            #{asset?.id || '—'}
                        </Typography>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#eef4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {asset?.title || 'Asset'}
                        </Typography>
                        {asset?.titleEn && (
                            <Typography sx={{ fontSize: '0.78rem', color: 'rgba(200,210,230,0.5)', fontStyle: 'italic' }}>
                                {asset.titleEn}
                            </Typography>
                        )}
                        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(56,189,248,0.5)', fontFamily: 'monospace' }}>
                            {assetIndex + 1}/{totalAssets}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: .5, flexShrink: 0 }}>
                        {!editing && <Tooltip title="Editar modelo"><span><IconButton disabled={loadingDetail || Boolean(detailError)} onClick={onStartEdit} aria-label="Editar modelo"><EditOutlined /></IconButton></span></Tooltip>}
                        <Tooltip title={asset?.slug ? 'Ficha pública' : 'Sin ficha pública'}><span><IconButton component="a" href={asset?.slug ? `/asset/${encodeURIComponent(asset.slug)}` : undefined} target="_blank" rel="noopener noreferrer" disabled={!asset?.slug || loadingDetail} aria-label="Abrir ficha pública"><OpenInNew /></IconButton></span></Tooltip>
                    <IconButton aria-label="Cerrar detalle" onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#ef4444' } }}>
                        <CloseIcon />
                    </IconButton>
                    </Box>
                </Box>

                {/* ── Body: 2 panels ── */}
                <DialogContent sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 0, p: 0, overflow: 'hidden', flex: 1, minHeight: 0 }}>
                    {loadingDetail && (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.4)', zIndex: 10 }}>
                            <CircularProgress sx={{ color: '#38bdf8' }} />
                        </Box>
                    )}

                    {/* ═══ LEFT: Gallery ═══ */}
                    <Box sx={{ width: { xs: '100%', md: '55%' }, minHeight: { xs: 240, md: 0 }, flex: { xs: '0 0 40%', md: 'initial' }, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        {/* Main preview */}
                        <Box sx={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.25)', minHeight: { xs: 130, md: 300 }, overflow: 'hidden' }}
                            onDrop={editing ? onDrop : (event) => event.preventDefault()} onDragOver={editing ? onDragOver : (event) => event.preventDefault()}
                        >
                            {activeImg ? (
                                <img src={activeImg.url || activeImg} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                            ) : (
                                <Stack alignItems="center" spacing={1} sx={{ opacity: 0.4 }}>
                                    <AddPhotoAlternateIcon sx={{ fontSize: 56 }} />
                                    <Typography variant="body2">Sin imágenes</Typography>
                                </Stack>
                            )}
                            {galleryImages.length > 1 && (
                                <>
                                    <IconButton onClick={goPrev} size="small" sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(56,189,248,0.4)' } }}>
                                        <ChevronLeftIcon />
                                    </IconButton>
                                    <IconButton onClick={goNext} size="small" sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(56,189,248,0.4)' } }}>
                                        <ChevronRightIcon />
                                    </IconButton>
                                    <Typography sx={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', bgcolor: 'rgba(0,0,0,0.5)', px: 1.5, py: 0.3, borderRadius: 8 }}>
                                        {activeIdx + 1} / {galleryImages.length}
                                    </Typography>
                                </>
                            )}
                        </Box>

                        {/* Thumbnails strip + add */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', bgcolor: 'rgba(0,0,0,0.15)', overflowX: 'auto' }}>
                            {galleryImages.map((img, idx) => (
                                <Box
                                    key={img.id || idx}
                                    draggable={editing && hasNewImages}
                                    onDragStart={editing ? handleThumbDragStart(idx) : undefined}
                                    onDragOver={editing ? handleThumbDragOver : undefined}
                                    onDrop={editing ? handleThumbDrop(idx) : undefined}
                                    onClick={() => onSelectPreview(idx)}
                                    sx={{
                                        width: 72, height: 54, flexShrink: 0, borderRadius: '6px', overflow: 'hidden', cursor: hasNewImages ? 'grab' : 'pointer', position: 'relative',
                                        border: activeIdx === idx ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                                        opacity: activeIdx === idx ? 1 : 0.7,
                                        transition: 'all 120ms ease',
                                        '&:hover': { opacity: 1, borderColor: 'rgba(56,189,248,0.5)' },
                                    }}
                                    title={hasNewImages ? 'Arrastra para reordenar' : ''}
                                >
                                    <img src={img.url || imgUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                                    {hasNewImages && (
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
                                            sx={{ position: 'absolute', top: 1, right: 1, p: 0.2, bgcolor: 'rgba(0,0,0,0.65)', color: '#ef4444', '&:hover': { bgcolor: '#ef4444', color: '#fff' } }}>
                                            <CloseIcon sx={{ fontSize: 13 }} />
                                        </IconButton>
                                    )}
                                </Box>
                            ))}
                            {editing && <IconButton onClick={onOpenFilePicker}
                                sx={{ width: 54, height: 54, flexShrink: 0, borderRadius: '6px', border: '1px dashed rgba(56,189,248,0.35)', color: 'rgba(56,189,248,0.6)', '&:hover': { borderColor: '#38bdf8', color: '#38bdf8', bgcolor: 'rgba(56,189,248,0.08)' } }}
                                title="Agregar imágenes"
                            >
                                <AddPhotoAlternateIcon sx={{ fontSize: 22 }} />
                            </IconButton>
                            }
                            {editing && <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onSelectFiles} />}
                        </Box>
                    </Box>

                    <Box sx={{ width: { xs: '100%', md: '45%' }, flex: { xs: 1, md: 'initial' }, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {detailError && <Typography role="alert" sx={{ p: 2, color: '#f0aaaa', fontSize: 12 }}>{detailError}</Typography>}
                        <Box component="fieldset" disabled={loadingDetail || Boolean(detailError) || loading} sx={{ display: 'flex', flexDirection: 'column', border: 0, p: 0, m: 0, minWidth: 0, minHeight: 0, flex: 1 }}>
                          <AssetDetailSections asset={asset} editing={editing} editForm={editForm} setEditForm={setEditForm} categories={categories} allTags={allTags} formatMBfromB={formatMBfromB} />
                        </Box>
                        {editing && <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 2.5, py: 1, borderTop: '1px solid #334155', flexShrink: 0 }}>
                            <Tooltip title="Cancelar cambios"><span><IconButton aria-label="Cancelar cambios" disabled={loading || loadingDetail} onClick={onCancelEdit || onClose}><UndoOutlined /></IconButton></span></Tooltip>
                            <Tooltip title="Guardar cambios"><span><IconButton aria-label="Guardar cambios" disabled={loading || loadingDetail || Boolean(detailError)} onClick={onSave} sx={{ color: '#7dd3fc' }}>{loading ? <CircularProgress size={20} /> : <SaveIcon />}</IconButton></span></Tooltip>
                        </Box>}
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
}
