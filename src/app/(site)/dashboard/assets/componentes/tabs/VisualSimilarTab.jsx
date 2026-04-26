'use client';

import React, { useRef, useState } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
    IconButton,
    LinearProgress,
    Paper,
    Slider,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function VisualSimilarTab({
    analyzeVisualSimilarAssets,
    visualSimilarLoading,
    visualSimilarThreshold,
    setVisualSimilarThreshold,
    visualSimilarGroups,
    ignoredPairsCount,
    selectedVisualSimilarIds,
    formatMBfromB,
    selectedVisualSimilarBytes,
    reactivateVisualDismissedGroups,
    visualSimilarProgress,
    visualSimilarError,
    visualSimilarPrimaryMap,
    selectVisualGroupDuplicates,
    dismissVisualSimilarGroup,
    visualSimilarSelectedMap,
    imgUrl,
    openSimilarViewer,
    setVisualPrimaryInGroup,
    toggleVisualSimilarSelection,
    selectedVisualSimilarAssets,
    visualSimilarDeleteProgress,
    handleDeleteSelectedVisualSimilar,
    clearVisualSimilarSelection,
    onSetFirstImage,
    onDeleteImage,
    metaBusy,
    loading,
}) {
    const parentRef = useRef(null);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);

    const rowVirtualizer = useVirtualizer({
        count: visualSimilarGroups.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 200, // Estimate row height
        overscan: 5,
    });

    return (
        <Stack spacing={2}>
            <Paper
                sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'rgba(22,22,22,0.9)'
                            : 'background.paper',
                }}
            >
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    justifyContent="space-between"
                >
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            SIMILAR-VISUAL
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Agrupa assets por similitud de imagen (IA Multimodal) para detectar
                            repetidos y depurar duplicados con alta precision.
                        </Typography>
                    </Box>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                    >
                        <Button
                            variant="outlined"
                            color="info"
                            onClick={() => setIsReviewMode(!isReviewMode)}
                            startIcon={isReviewMode ? <FullscreenExitIcon /> : <FullscreenIcon />}
                        >
                            Modo Revisión
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={analyzeVisualSimilarAssets}
                            disabled={visualSimilarLoading}
                        >
                            {visualSimilarLoading ? 'Analizando...' : 'Analizar por imagen (IA)'}
                        </Button>
                    </Stack>
                </Stack>

                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', md: 'center' }}
                    sx={{ mt: 2 }}
                >
                    <Box sx={{ minWidth: { xs: '100%', md: 280 } }}>
                        <Typography variant="caption" color="text.secondary">
                            Umbral de similitud visual: {visualSimilarThreshold}%
                        </Typography>
                        <Slider
                            value={visualSimilarThreshold}
                            onChange={(_, value) =>
                                setVisualSimilarThreshold(Number(value))
                            }
                            min={70}
                            max={100}
                            step={1}
                            valueLabelDisplay="auto"
                            disabled={visualSimilarLoading}
                            color="secondary"
                        />
                    </Box>

                    <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                    >
                        <Chip label={`Grupos: ${visualSimilarGroups.length}`} />
                        <Chip
                            label={`Pares descartados: ${ignoredPairsCount}`}
                        />
                        <Chip
                            label={`Seleccionados: ${selectedVisualSimilarIds.length}`}
                            color={
                                selectedVisualSimilarIds.length
                                    ? 'warning'
                                    : 'default'
                            }
                        />
                        <Chip
                            label={`Espacio estimado: ${formatMBfromB(selectedVisualSimilarBytes)}`}
                            color="info"
                        />
                    </Stack>

                    {ignoredPairsCount > 0 && (
                        <Button
                            variant="text"
                            size="small"
                            onClick={reactivateVisualDismissedGroups}
                            disabled={visualSimilarLoading}
                        >
                            Reactivar descartes
                        </Button>
                    )}
                </Stack>

                {visualSimilarLoading && <LinearProgress color="secondary" sx={{ mt: 2 }} />}
                {!!visualSimilarProgress.total && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: 'block' }}
                    >
                        Procesados: {visualSimilarProgress.done} / {visualSimilarProgress.total} assets
                    </Typography>
                )}
                {visualSimilarError && (
                    <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1, display: 'block' }}
                    >
                        {visualSimilarError}
                    </Typography>
                )}
            </Paper>

            <Box
                sx={isReviewMode ? {
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1300,
                    bgcolor: (theme) => theme.palette.background.default,
                    p: 2,
                    pt: 8, // padding top for the floating header
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        lg: isSidebarExpanded ? 'minmax(0, 1fr) 320px' : 'minmax(0, 1fr) auto',
                    },
                    gap: 2,
                    alignItems: 'start',
                    overflow: 'hidden',
                } : {
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        lg: isSidebarExpanded ? 'minmax(0, 1fr) 320px' : 'minmax(0, 1fr) auto',
                    },
                    transition: 'all 0.3s ease',
                    gap: 2,
                    alignItems: 'start',
                }}
            >
                {isReviewMode && (
                    <Paper 
                        elevation={4}
                        sx={{ 
                            position: 'fixed', 
                            top: 16, 
                            left: '50%', 
                            transform: 'translateX(-50%)', 
                            zIndex: 1301, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 3, 
                            px: 3, 
                            py: 1, 
                            borderRadius: 8,
                            border: '1px solid rgba(127,127,127,0.2)'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                Grupos: {visualSimilarGroups.length} | Pares descartados: {ignoredPairsCount || 0} | Seleccionados: {selectedVisualSimilarIds.length}
                            </Typography>
                        </Box>
                        <Button 
                            size="small" 
                            variant="contained" 
                            color="inherit" 
                            onClick={() => setIsReviewMode(false)}
                            startIcon={<FullscreenExitIcon />}
                        >
                            Salir
                        </Button>
                    </Paper>
                )}
                <Stack spacing={2} sx={{ height: isReviewMode ? 'calc(100vh - 40px)' : { xs: 'calc(100vh - 200px)', lg: 'calc(100vh - 120px)' } }}>
                    {!visualSimilarGroups.length && !visualSimilarLoading && (
                        <Paper sx={{ p: 3, borderRadius: 2 }}>
                            <Typography
                                variant="body1"
                                sx={{ fontWeight: 600, mb: 0.5 }}
                            >
                                No hay grupos visuales para mostrar todavia
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Ejecuta Analizar por imagen para encontrar
                                duplicados utilizando los vectores de IA.
                            </Typography>
                        </Paper>
                    )}

                    {visualSimilarGroups.length > 0 && (
                        <Box 
                            ref={parentRef} 
                            sx={{ 
                                height: '100%', 
                                overflow: 'auto',
                                '&::-webkit-scrollbar': { width: '8px' },
                                '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }
                            }}
                        >
                            <Box
                                sx={{
                                    height: `${rowVirtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const group = visualSimilarGroups[virtualRow.index];
                                    const primaryId = Number(
                                        visualSimilarPrimaryMap[group.id] ||
                                        group.items?.[0]?.asset?.id,
                                    );
                                    return (
                                        <Box
                                            key={virtualRow.key}
                                            data-index={virtualRow.index}
                                            ref={rowVirtualizer.measureElement}
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                transform: `translateY(${virtualRow.start}px)`,
                                                pb: 2, // Equivalent to spacing(2) gap
                                            }}
                                        >
                                            <Paper sx={{ 
                                                p: 2, 
                                                borderRadius: 3,
                                                border: '1px solid rgba(148, 163, 184, 0.4)',
                                                bgcolor: virtualRow.index % 2 === 0 ? 'rgba(15, 23, 42, 0.95)' : 'rgba(30, 41, 59, 0.95)',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                            }}>
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    alignItems="center"
                                                    justifyContent="space-between"
                                                    sx={{ flexWrap: 'wrap', gap: 1 }}
                                                >
                                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                                            Grupo #{virtualRow.index + 1}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {group.signature}
                                                        </Typography>
                                                        <Chip size="small" label={`${group.items.length} assets`} sx={{ height: 20, fontSize: 10 }} />
                                                        <Chip 
                                                            size="small" 
                                                            label={`Similitud > ${group.confidence}%`} 
                                                            sx={{ 
                                                                height: 20, 
                                                                fontSize: 10, 
                                                                fontWeight: 800,
                                                                bgcolor: group.confidence >= 98 ? 'rgba(34,197,94,0.25)' : group.confidence >= 94 ? 'rgba(249,115,22,0.25)' : 'rgba(239,68,68,0.25)',
                                                                color: group.confidence >= 98 ? '#4ade80' : group.confidence >= 94 ? '#fb923c' : '#f87171',
                                                                border: `1px solid ${group.confidence >= 98 ? 'rgba(34,197,94,0.5)' : group.confidence >= 94 ? 'rgba(249,115,22,0.5)' : 'rgba(239,68,68,0.5)'}`,
                                                            }} 
                                                        />
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Button size="small" variant="outlined" color="inherit" onClick={() => dismissVisualSimilarGroup(group)} sx={{ py: 0, fontSize: 10 }}>
                                                            No son duplicados
                                                        </Button>
                                                    </Box>
                                                </Stack>

                                                <Divider sx={{ my: 1 }} />

                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        alignItems: 'stretch',
                                                        gap: 1.5,
                                                    }}
                                                >
                                                    {group.items.map((entry) => {
                                                        const asset = entry.asset || {};
                                                        const id = Number(asset.id);
                                                        const isPrimary = id === primaryId;
                                                        const isSelected =
                                                            !!visualSimilarSelectedMap[id];
                                                        const assetImages = Array.isArray(
                                                            asset.images,
                                                        )
                                                            ? asset.images
                                                            : [];

                                                        return (
                                                            <Paper
                                                                key={`${group.id}-${id}`}
                                                                sx={{
                                                                    p: 1.25,
                                                                    borderRadius: 2,
                                                                    border: isPrimary
                                                                        ? '2px solid #fbbf24'
                                                                        : isSelected
                                                                          ? '3px solid #ff1744'
                                                                          : '1px solid rgba(255, 255, 255, 0.35)',
                                                                    boxShadow: isSelected
                                                                        ? '0 0 16px rgba(255, 23, 68, 0.7), 0 0 32px rgba(255, 23, 68, 0.35), inset 0 0 8px rgba(255, 23, 68, 0.15)'
                                                                        : isPrimary
                                                                          ? '0 0 8px rgba(251, 191, 36, 0.3)'
                                                                          : '0 4px 6px rgba(0, 0, 0, 0.3)',
                                                                    bgcolor: isPrimary
                                                                        ? 'rgba(251, 191, 36, 0.12)'
                                                                        : isSelected
                                                                          ? 'rgba(255, 23, 68, 0.15)'
                                                                          : 'rgba(15, 23, 42, 0.85)',
                                                                    width: 'fit-content',
                                                                    maxWidth: '100%',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                                                                }}
                                                            >
                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap', mr: 2, mb: 0.5 }}>
                                                                        <Chip size="small" label={`ID: ${id}`} sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(127,127,127,0.15)' }} />
                                                                        <Chip 
                                                                            size="small" 
                                                                            label={`${entry.similarity}%`} 
                                                                            color={entry.similarity >= 98 ? 'success' : entry.similarity >= 94 ? 'warning' : 'default'}
                                                                            sx={{ height: 18, fontSize: 10, fontWeight: 800 }} 
                                                                        />
                                                                        <Typography variant="caption" sx={{ fontSize: 10, ml: 0.5, color: 'text.secondary' }} noWrap>
                                                                            {asset.account?.alias || asset.accountId || '-'}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                        <Tooltip title={isPrimary ? 'Principal' : 'Marcar principal'}>
                                                                            <IconButton size="small" sx={{ p: 0 }} onClick={() => setVisualPrimaryInGroup(group.id, id)}>
                                                                                {isPrimary ? <StarIcon sx={{ fontSize: 18, color: '#fbbf24' }} /> : <StarBorderIcon sx={{ fontSize: 18, color: 'rgba(251,191,36,0.5)' }} />}
                                                                            </IconButton>
                                                                        </Tooltip>
                                                                        <Tooltip title="Eliminar asset">
                                                                            <Checkbox
                                                                                color="warning"
                                                                                checked={isSelected}
                                                                                onChange={() => toggleVisualSimilarSelection(id)}
                                                                                disabled={isPrimary}
                                                                                sx={{ p: 0, '& .MuiSvgIcon-root': { fontSize: 18 } }}
                                                                            />
                                                                        </Tooltip>
                                                                    </Box>
                                                                </Box>

                                                                {assetImages.length ? (
                                                                    <Box
                                                                        sx={{
                                                                            display: 'flex',
                                                                            flexWrap: 'wrap',
                                                                            gap: 0.6,
                                                                            mb: 1,
                                                                            maxWidth: 850,
                                                                        }}
                                                                    >
                                                                        {assetImages
                                                                            .slice(0, 8)
                                                                            .map(
                                                                                (img, imgIdx) => {
                                                                                    const thumbSrc =
                                                                                        imgUrl(
                                                                                            img,
                                                                                        );
                                                                                    return (
                                                                                        <Box
                                                                                            key={`${group.id}-${id}-vis-img-${imgIdx}`}
                                                                                            sx={{
                                                                                                position: 'relative',
                                                                                                width: 200,
                                                                                                height: 200,
                                                                                                flexShrink: 0,
                                                                                                borderRadius: 1,
                                                                                                overflow: 'hidden',
                                                                                                border: '1px solid rgba(127,127,127,0.35)',
                                                                                                '&:hover .img-overlay': {
                                                                                                    opacity: 1,
                                                                                                },
                                                                                            }}
                                                                                        >
                                                                                            <Box
                                                                                                component="img"
                                                                                                src={thumbSrc}
                                                                                                alt={`${asset.title || `asset-${id}`} - ${imgIdx + 1}`}
                                                                                                onClick={() =>
                                                                                                    openSimilarViewer(
                                                                                                        asset,
                                                                                                        imgIdx,
                                                                                                    )
                                                                                                }
                                                                                                sx={{
                                                                                                    width: '100%',
                                                                                                    aspectRatio: '1 / 1',
                                                                                                    objectFit: 'cover',
                                                                                                    display: 'block',
                                                                                                    cursor: 'pointer',
                                                                                                }}
                                                                                            />
                                                                                            {/* ── Overlay con controles ── */}
                                                                                            <Box
                                                                                                className="img-overlay"
                                                                                                onClick={() => openSimilarViewer(asset, imgIdx)}
                                                                                                sx={{
                                                                                                    position: 'absolute',
                                                                                                    inset: 0,
                                                                                                    display: 'flex',
                                                                                                    flexDirection: 'column',
                                                                                                    justifyContent: 'space-between',
                                                                                                    p: 0.5,
                                                                                                    opacity: 0,
                                                                                                    transition: 'opacity 0.18s ease',
                                                                                                    background: 'transparent',
                                                                                                    cursor: 'pointer',
                                                                                                }}
                                                                                            >
                                                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                                    <Chip
                                                                                                        size="small"
                                                                                                        label={imgIdx === 0 ? 'Primera' : `#${imgIdx + 1}`}
                                                                                                        color={imgIdx === 0 ? 'success' : 'default'}
                                                                                                        sx={{ height: 20, '& .MuiChip-label': { px: 0.6, fontSize: 10 } }}
                                                                                                    />
                                                                                                    <Tooltip title="Poner de primera">
                                                                                                        <span>
                                                                                                            <IconButton
                                                                                                                size="small"
                                                                                                                onClick={(e) => { e.stopPropagation(); void onSetFirstImage(id, imgIdx); }}
                                                                                                                disabled={metaBusy || loading || imgIdx === 0}
                                                                                                                sx={{ bgcolor: 'rgba(2,6,23,0.68)', color: '#fff', '&:hover': { bgcolor: 'rgba(15,23,42,0.9)' } }}
                                                                                                            >
                                                                                                                <VerticalAlignTopIcon sx={{ fontSize: 16 }} />
                                                                                                            </IconButton>
                                                                                                        </span>
                                                                                                    </Tooltip>
                                                                                                </Box>
                                                                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                                                    <Tooltip title="Eliminar imagen">
                                                                                                        <span>
                                                                                                            <IconButton
                                                                                                                size="small"
                                                                                                                onClick={(e) => { e.stopPropagation(); void onDeleteImage(id, imgIdx); }}
                                                                                                                disabled={loading}
                                                                                                                sx={{ bgcolor: 'rgba(127,29,29,0.78)', color: '#fff', '&:hover': { bgcolor: 'rgba(153,27,27,0.95)' } }}
                                                                                                            >
                                                                                                                <DeleteIcon sx={{ fontSize: 16 }} />
                                                                                                            </IconButton>
                                                                                                        </span>
                                                                                                    </Tooltip>
                                                                                                </Box>
                                                                                            </Box>
                                                                                        </Box>
                                                                                    );
                                                                                },
                                                                            )}
                                                                    </Box>
                                                                ) : (
                                                                    <Box
                                                                        sx={{
                                                                            width: '100%',
                                                                            height: 96,
                                                                            borderRadius: 1,
                                                                            mb: 1,
                                                                            bgcolor:
                                                                                'rgba(120,120,120,0.2)',
                                                                            display: 'grid',
                                                                            placeItems: 'center',
                                                                        }}
                                                                    >
                                                                        <Typography
                                                                            variant="caption"
                                                                            color="text.secondary"
                                                                        >
                                                                            Sin imagen
                                                                        </Typography>
                                                                    </Box>
                                                                )}

                                                                <Typography
                                                                    variant="caption"
                                                                    sx={{ fontWeight: 600, display: 'block', mt: 0.5, lineHeight: 1.2 }}
                                                                >
                                                                    {asset.title || asset.archiveName || `Asset #${id}`}
                                                                </Typography>
                                                            </Paper>
                                                        );
                                                    })}
                                                </Box>
                                            </Paper>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    )}
                </Stack>

                {isSidebarExpanded ? (
                    <Paper
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            position: { xs: 'static', lg: 'sticky' },
                            top: { lg: 16 },
                            maxHeight: { lg: 'calc(100vh - 120px)' },
                            overflow: 'auto',
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                    Seleccionados para eliminar
                                </Typography>
                                <Typography
                                    variant="h4"
                                    sx={{ fontWeight: 900, lineHeight: 1.1, mt: 0.5 }}
                                >
                                    {selectedVisualSimilarIds.length}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mb: 1.5 }}
                                >
                                    Espacio estimado: {formatMBfromB(selectedVisualSimilarBytes)}
                                </Typography>
                            </Box>
                            <IconButton size="small" onClick={() => setIsSidebarExpanded(false)}>
                                <ChevronRightIcon />
                            </IconButton>
                        </Box>

                        {(visualSimilarDeleteProgress.running ||
                            visualSimilarDeleteProgress.total > 0) && (
                            <Box sx={{ mb: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {visualSimilarDeleteProgress.running
                                        ? `Eliminando ${visualSimilarDeleteProgress.processed}/${visualSimilarDeleteProgress.total}`
                                        : `Proceso finalizado ${visualSimilarDeleteProgress.processed}/${visualSimilarDeleteProgress.total}`}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mb: 0.8 }}
                                >
                                    OK: {visualSimilarDeleteProgress.success} · Fallidos:{' '}
                                    {visualSimilarDeleteProgress.failed}
                                    {visualSimilarDeleteProgress.currentAssetId
                                        ? ` · Asset #${visualSimilarDeleteProgress.currentAssetId}`
                                        : ''}
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    color="error"
                                    value={
                                        visualSimilarDeleteProgress.total
                                            ? Math.min(
                                                  100,
                                                  Math.round(
                                                      (visualSimilarDeleteProgress.processed /
                                                          visualSimilarDeleteProgress.total) *
                                                          100,
                                                  ),
                                              )
                                            : 0
                                    }
                                />
                            </Box>
                        )}

                        <Divider sx={{ mb: 1.5 }} />

                        <Stack spacing={0.7} sx={{ mb: 1.5 }}>
                            {selectedVisualSimilarAssets.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    Aun no seleccionas assets.
                                </Typography>
                            )}
                            {selectedVisualSimilarAssets.map((asset) => (
                                <Box
                                    key={`vis-selected-${asset.id}`}
                                    sx={{
                                        p: 1,
                                        borderRadius: 1,
                                        bgcolor: 'rgba(127,127,127,0.12)',
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600 }}
                                        noWrap
                                    >
                                        #{asset.id}{' '}
                                        {asset.title ||
                                            asset.archiveName ||
                                            'Sin nombre'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {asset.account?.alias || asset.accountId || '-'}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>

                        <Stack spacing={1}>
                            <Button
                                variant="contained"
                                color="error"
                                disabled={
                                    !selectedVisualSimilarIds.length ||
                                    visualSimilarLoading
                                }
                                onClick={handleDeleteSelectedVisualSimilar}
                            >
                                Eliminar seleccionados
                            </Button>
                            <Button
                                variant="outlined"
                                disabled={
                                    !selectedVisualSimilarIds.length ||
                                    visualSimilarLoading
                                }
                                onClick={clearVisualSimilarSelection}
                            >
                                Limpiar seleccion
                            </Button>
                        </Stack>
                    </Paper>
                ) : (
                    <Paper
                        sx={{
                            p: 1,
                            borderRadius: 2,
                            position: { xs: 'static', lg: 'sticky' },
                            top: { lg: 16 },
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            minHeight: 200,
                        }}
                    >
                        <IconButton size="small" onClick={() => setIsSidebarExpanded(true)}>
                            <ChevronLeftIcon />
                        </IconButton>
                        <Box sx={{ flexGrow: 1 }} />
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)',
                                py: 2,
                                cursor: 'pointer',
                            }}
                            onClick={() => setIsSidebarExpanded(true)}
                        >
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                Seleccionados
                            </Typography>
                            <Chip size="small" color={selectedVisualSimilarIds.length > 0 ? "error" : "default"} label={selectedVisualSimilarIds.length} sx={{ transform: 'rotate(90deg)' }} />
                        </Box>
                        <Box sx={{ flexGrow: 1 }} />
                    </Paper>
                )}
            </Box>
        </Stack>
    );
}
