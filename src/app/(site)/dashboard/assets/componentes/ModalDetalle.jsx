'use client';
import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Stack,
    Box,
    Chip,
    Typography,
    Link as MUILink,
    Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LinkIcon from '@mui/icons-material/Link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

const statusColor = (s) =>
    ({
        DRAFT: 'default',
        PROCESSING: 'info',
        PUBLISHED: 'success',
        FAILED: 'error',
    }[s] || 'default');

export default function ModalDetalle({
    open,
    onClose,
    detail,
    selected,
    imgUrl,
    formatMBfromB,
    loadingDetail,
}) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle
                sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    pr: 1.5, py: 1.25
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                        {detail?.title || selected?.title || 'Detalle del asset'}
                    </Typography>
                    {(detail?.titleEn || selected?.titleEn) && (
                        <Typography variant="caption" color="text.secondary">
                            {detail?.titleEn || selected?.titleEn}
                        </Typography>
                    )}
                </Box>
                <IconButton onClick={onClose} aria-label="Cerrar">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 1.5 }}>
                {detail || selected ? (
                    <Stack spacing={1.5}>
                        {/* Multimedia compacta */}
                        <Box>
                            {Array.isArray(
                                detail?.images ?? selected?.images
                            ) &&
                            (detail?.images ?? selected?.images).length > 0 ? (
                                <Swiper
                                    modules={[Navigation]}
                                    navigation
                                    spaceBetween={8}
                                    slidesPerView={1}
                                    style={{ width: '100%', height: 280 }}
                                >
                                    {(detail?.images ?? selected.images).map(
                                        (rel, idx) => (
                                            <SwiperSlide key={idx}>
                                                <img
                                                    src={imgUrl(rel)}
                                                    alt={`img-${idx}`}
                                                    style={{
                                                        width: '100%',
                                                        height: 280,
                                                        objectFit: 'contain',
                                                        borderRadius: 8,
                                                    }}
                                                />
                                            </SwiperSlide>
                                        )
                                    )}
                                </Swiper>
                            ) : (
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: 200,
                                        borderRadius: 2,
                                        bgcolor: 'rgba(255,255,255,0.06)',
                                    }}
                                />
                            )}
                        </Box>
                        {/* Chips compactos */}
                        <Stack direction="row" spacing={1}>
                            {(detail?.isPremium ?? selected?.isPremium) && (
                                <Chip size="small" color="warning" label="Premium" />
                            )}
                            <Chip size="small" label={detail?.status ?? selected?.status} color={statusColor(detail?.status ?? selected?.status)} />
                        </Stack>

                        {/* Layout 2 columnas compactas */}
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <Stack spacing={1.2}>
                                    {(() => {
                                        const cats = Array.isArray(detail?.categories) ? detail.categories : [];
                                        const catsEs = cats.length ? cats.map(c => c?.name).filter(Boolean) : (detail?.category ?? selected?.category ? [detail?.category ?? selected?.category] : []);
                                        const catsEn = cats.length ? cats.map(c => c?.nameEn || c?.name).filter(Boolean) : catsEs;
                                        return (
                                            <Stack spacing={0.6}>
                                                <Typography variant="caption" color="text.secondary">Categorías (ES)</Typography>
                                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                                                    {catsEs.length ? catsEs.map((n,i)=>(<Chip key={`ces-${i}`} size="small" label={n} variant="outlined" />)) : <Typography variant="body2" color="text.secondary">-</Typography>}
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary">Categories (EN)</Typography>
                                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                                                    {catsEn.length ? catsEn.map((n,i)=>(<Chip key={`cen-${i}`} size="small" label={n} variant="outlined" />)) : <Typography variant="body2" color="text.secondary">-</Typography>}
                                                </Stack>
                                            </Stack>
                                        );
                                    })()}
                                    {(() => {
                                        const tagsEs = Array.isArray(detail?.tagsEs) ? detail.tagsEs : Array.isArray(selected?.tags) ? selected.tags.map(t => t?.slug || t) : [];
                                        const tagsEn = Array.isArray(detail?.tagsEn) ? detail.tagsEn : Array.isArray(selected?.tags) ? selected.tags.map(t => t?.nameEn || t?.name || t?.slug || t) : tagsEs;
                                        return (
                                            <Stack spacing={0.6}>
                                                <Typography variant="caption" color="text.secondary">Tags (ES)</Typography>
                                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                                                    {tagsEs.length ? tagsEs.map((t,i)=>(<Chip key={`tes-${i}`} size="small" label={t} variant="outlined" />)) : <Typography variant="body2" color="text.secondary">-</Typography>}
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary">Tags (EN)</Typography>
                                                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                                                    {tagsEn.length ? tagsEn.map((t,i)=>(<Chip key={`ten-${i}`} size="small" label={t} variant="outlined" />)) : <Typography variant="body2" color="text.secondary">-</Typography>}
                                                </Stack>
                                            </Stack>
                                        );
                                    })()}
                                </Stack>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Stack spacing={0.8}>
                                    <Typography variant="caption" color="text.secondary">Meta</Typography>
                                    <Grid container spacing={0.5}>
                                        <Grid item xs={5}><Typography variant="body2" color="text.secondary">Cuenta</Typography></Grid>
                                        <Grid item xs={7}><Typography variant="body2">{detail?.account?.alias || detail?.accountId || selected?.account?.alias || selected?.accountId}</Typography></Grid>
                                        <Grid item xs={5}><Typography variant="body2" color="text.secondary">Tamaño</Typography></Grid>
                                        <Grid item xs={7}><Typography variant="body2">{formatMBfromB(detail?.fileSizeB ?? detail?.archiveSizeB ?? selected?.fileSizeB ?? selected?.archiveSizeB)}</Typography></Grid>
                                        <Grid item xs={5}><Typography variant="body2" color="text.secondary">Creado</Typography></Grid>
                                        <Grid item xs={7}><Typography variant="body2">{ (detail?.createdAt ?? selected?.createdAt) ? new Date(detail?.createdAt ?? selected?.createdAt).toLocaleString() : '-' }</Typography></Grid>
                                        {(detail?.megaLink ?? selected?.megaLink) && (
                                            <Grid item xs={12}>
                                                <Typography variant="body2">
                                                    <LinkIcon fontSize="small" style={{ verticalAlign: 'middle' }} />{' '}
                                                    <MUILink href={detail?.megaLink ?? selected?.megaLink} target="_blank" rel="noreferrer" underline="hover">Enlace MEGA</MUILink>
                                                </Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                    {(detail?.description ?? selected?.description) && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{detail?.description ?? selected?.description}</Typography>
                                    )}
                                </Stack>
                            </Grid>
                        </Grid>

                        {loadingDetail && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Cargando detalle…
                            </Typography>
                        )}
                    </Stack>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
