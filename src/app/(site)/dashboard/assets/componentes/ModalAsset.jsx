'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Dialog, DialogContent, Box, Stack, Typography, TextField, IconButton,
    Chip, Button, Autocomplete, FormControlLabel, Switch, Link as MUILink,
    CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import LinkIcon from '@mui/icons-material/Link';
import SaveIcon from '@mui/icons-material/Save';

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
        '&:hover fieldset': { borderColor: 'rgba(139,92,246,0.35)' },
        '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
    },
};
const labelSx = { fontSize: '0.7rem', color: 'rgba(200,210,230,0.55)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 };

/* ═══════════════════════════════════════════════════════════════ */
export default function ModalAsset({
    open, onClose,
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
    if (!open) return null;

    /* ── image gallery data ── */
    const hasNewImages = editImageFiles && editImageFiles.length > 0;
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
        bgcolor: 'rgba(15,23,42,0.92)', border: '1px solid rgba(139,92,246,0.25)',
        color: '#e2e8f0', backdropFilter: 'blur(8px)',
        '&:hover': { bgcolor: 'rgba(139,92,246,0.18)', borderColor: '#8b5cf6', color: '#fff' },
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
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(139,92,246,0.7)', fontWeight: 700, fontFamily: 'monospace' }}>
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
                        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(139,92,246,0.5)', fontFamily: 'monospace' }}>
                            {assetIndex + 1}/{totalAssets}
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#ef4444' } }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {/* ── Body: 2 panels ── */}
                <DialogContent sx={{ display: 'flex', gap: 0, p: 0, overflow: 'hidden', flex: 1 }}>
                    {loadingDetail && (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.4)', zIndex: 10 }}>
                            <CircularProgress sx={{ color: '#8b5cf6' }} />
                        </Box>
                    )}

                    {/* ═══ LEFT: Gallery ═══ */}
                    <Box sx={{ width: '55%', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        {/* Main preview */}
                        <Box sx={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.25)', minHeight: 300, overflow: 'hidden' }}
                            onDrop={onDrop} onDragOver={onDragOver}
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
                                    <IconButton onClick={goPrev} size="small" sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(139,92,246,0.4)' } }}>
                                        <ChevronLeftIcon />
                                    </IconButton>
                                    <IconButton onClick={goNext} size="small" sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(139,92,246,0.4)' } }}>
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
                                    draggable={hasNewImages}
                                    onDragStart={handleThumbDragStart(idx)}
                                    onDragOver={handleThumbDragOver}
                                    onDrop={handleThumbDrop(idx)}
                                    onClick={() => onSelectPreview(idx)}
                                    sx={{
                                        width: 72, height: 54, flexShrink: 0, borderRadius: '6px', overflow: 'hidden', cursor: hasNewImages ? 'grab' : 'pointer', position: 'relative',
                                        border: activeIdx === idx ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.12)',
                                        opacity: activeIdx === idx ? 1 : 0.7,
                                        transition: 'all 120ms ease',
                                        '&:hover': { opacity: 1, borderColor: 'rgba(139,92,246,0.5)' },
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
                            <IconButton onClick={onOpenFilePicker}
                                sx={{ width: 54, height: 54, flexShrink: 0, borderRadius: '6px', border: '1px dashed rgba(139,92,246,0.35)', color: 'rgba(139,92,246,0.6)', '&:hover': { borderColor: '#8b5cf6', color: '#8b5cf6', bgcolor: 'rgba(139,92,246,0.08)' } }}
                                title="Agregar imágenes"
                            >
                                <AddPhotoAlternateIcon sx={{ fontSize: 22 }} />
                            </IconButton>
                            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onSelectFiles} />
                        </Box>
                    </Box>

                    {/* ═══ RIGHT: Info + Edit ═══ */}
                    <Box sx={{ width: '45%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
                            <Stack spacing={2.5}>

                                {/* ── Meta info ── */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    {[
                                        ['Slug', asset?.slug],
                                        ['Cuenta', asset?.account?.alias || asset?.accountId],
                                        ['Archivo', asset?.archiveName],
                                        ['Tamaño', formatMBfromB(asset?.fileSizeB ?? asset?.archiveSizeB)],
                                        ['Creado', fmtDate(asset?.createdAt)],
                                        ['Plan', asset?.isPremium ? 'Premium' : 'Free'],
                                    ].map(([label, val]) => (
                                        <Box key={label}>
                                            <Typography sx={labelSx}>{label}</Typography>
                                            <Typography sx={{ fontSize: '0.82rem', color: '#cbd5e1', wordBreak: 'break-all', mt: 0.2 }}>{val || '-'}</Typography>
                                        </Box>
                                    ))}
                                    {(asset?.megaLink) && (
                                        <Box sx={{ gridColumn: '1 / -1' }}>
                                            <Typography sx={labelSx}>MEGA Link</Typography>
                                            <Typography sx={{ fontSize: '0.82rem', mt: 0.2 }}>
                                                <LinkIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                                                <MUILink href={asset.megaLink} target="_blank" rel="noreferrer" underline="hover" sx={{ color: '#8b5cf6' }}>Abrir enlace</MUILink>
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>

                                {/* ── Editable fields ── */}
                                <Stack spacing={1.5}>
                                    <Typography sx={{ ...labelSx, fontSize: '0.72rem' }}>Títulos</Typography>
                                    <TextField size="small" label="Nombre (ES)" value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} fullWidth sx={fieldSx} />
                                    <TextField size="small" label="Name (EN)" value={editForm.titleEn} onChange={(e) => setEditForm(f => ({ ...f, titleEn: e.target.value }))} fullWidth sx={fieldSx} />
                                </Stack>

                                <Stack spacing={1.5}>
                                    <Typography sx={{ ...labelSx, fontSize: '0.72rem' }}>Clasificación</Typography>
                                    <Autocomplete
                                        multiple disableCloseOnSelect size="small"
                                        options={categories} getOptionLabel={(o) => o?.name || ''}
                                        isOptionEqualToValue={(o, v) => o.id === v.id}
                                        value={editForm.categories || []}
                                        onChange={(_, v) => setEditForm(f => ({ ...f, categories: v }))}
                                        renderTags={(value, getTagProps) => value.map((opt, i) => (
                                            <Chip variant="outlined" label={opt.name} {...getTagProps({ index: i })} key={`${opt.slug}-${i}`} size="small" sx={{ borderColor: 'rgba(139,92,246,0.3)', color: '#c4b5fd' }} />
                                        ))}
                                        renderInput={(p) => <TextField {...p} label="Categorías" placeholder="Selecciona…" sx={fieldSx} />}
                                    />
                                    <Autocomplete
                                        multiple freeSolo size="small"
                                        options={allTags} getOptionLabel={(o) => (typeof o === 'string' ? o : (o?.name || o?.slug || ''))}
                                        value={editForm.tags}
                                        onChange={(_, v) => {
                                            const normalized = [...new Set((v || []).map(item => typeof item === 'string' ? slugify(item) : slugify(item.slug || item.name)).filter(Boolean))];
                                            setEditForm(f => ({ ...f, tags: normalized }));
                                        }}
                                        slotProps={{ popper: { sx: { zIndex: 2000 } } }}
                                        renderTags={(value, getTagProps) => (value || []).map((opt, i) => (
                                            <Chip variant="outlined" label={opt} {...getTagProps({ index: i })} key={opt + i} size="small" sx={{ borderColor: 'rgba(34,211,238,0.3)', color: '#67e8f9' }} />
                                        ))}
                                        renderInput={(p) => <TextField {...p} label="Tags" placeholder="Añadir tag…" sx={fieldSx} />}
                                    />
                                </Stack>

                                <FormControlLabel
                                    control={<Switch checked={editForm.isPremium} onChange={(e) => setEditForm(f => ({ ...f, isPremium: e.target.checked }))} sx={{ '& .Mui-checked': { color: '#eab308' }, '& .Mui-checked + .MuiSwitch-track': { bgcolor: '#eab30866' } }} />}
                                    label={<Typography sx={{ fontSize: '0.82rem', color: editForm.isPremium ? '#eab308' : '#66bb6a', fontWeight: 600 }}>{editForm.isPremium ? '★ Premium' : 'Free'}</Typography>}
                                />

                                {/* ── Descriptions (read-only) ── */}
                                {(() => {
                                    const descEs = asset?.description;
                                    const descEn = asset?.descriptionEn;
                                    if (!descEs && !descEn) return null;
                                    return (
                                        <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Typography sx={{ ...labelSx, mb: 0.8 }}>Descripciones</Typography>
                                            {descEs && (
                                                <Box sx={{ mb: 1 }}>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(200,210,230,0.4)', mb: 0.3 }}>ES</Typography>
                                                    <Typography sx={{ fontSize: '0.78rem', color: 'rgba(200,210,230,0.65)', lineHeight: 1.5 }}>{descEs}</Typography>
                                                </Box>
                                            )}
                                            {descEn && (
                                                <Box>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(200,210,230,0.4)', mb: 0.3 }}>EN</Typography>
                                                    <Typography sx={{ fontSize: '0.78rem', color: 'rgba(200,210,230,0.65)', lineHeight: 1.5 }}>{descEn}</Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })()}

                                {/* ── Categories/Tags display (from detail, read-only context) ── */}
                                {(() => {
                                    const cats = Array.isArray(asset?.categories) ? asset.categories : [];
                                    const tags = Array.isArray(asset?.tags) ? asset.tags : [];
                                    if (!cats.length && !tags.length) return null;
                                    return (
                                        <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Typography sx={{ ...labelSx, mb: 0.8 }}>Clasificación actual</Typography>
                                            {cats.length > 0 && (
                                                <Box sx={{ mb: 1 }}>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(200,210,230,0.4)', mb: 0.5 }}>Categorías</Typography>
                                                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                                        {cats.map((c, i) => <Chip key={i} size="small" label={`${c.name}${c.nameEn ? ` / ${c.nameEn}` : ''}`} variant="outlined" sx={{ borderColor: 'rgba(139,92,246,0.2)', color: '#c4b5fd', fontSize: '0.72rem' }} />)}
                                                    </Stack>
                                                </Box>
                                            )}
                                            {tags.length > 0 && (
                                                <Box>
                                                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(200,210,230,0.4)', mb: 0.5 }}>Tags</Typography>
                                                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                                        {tags.map((t, i) => <Chip key={i} size="small" label={`${t.name || t.slug}${t.nameEn ? ` / ${t.nameEn}` : ''}`} variant="outlined" sx={{ borderColor: 'rgba(34,211,238,0.2)', color: '#67e8f9', fontSize: '0.72rem' }} />)}
                                                    </Stack>
                                                </Box>
                                            )}
                                        </Box>
                                    );
                                })()}
                            </Stack>
                        </Box>

                        {/* ── Footer ── */}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, px: 3, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <Button onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#fff' } }}>Cancelar</Button>
                            <Button variant="contained" onClick={onSave} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
                                sx={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', '&:hover': { background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', transform: 'translateY(-1px)' }, transition: 'all 150ms ease', textTransform: 'none', fontWeight: 600 }}>
                                {loading ? 'Guardando…' : 'Guardar'}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
}
