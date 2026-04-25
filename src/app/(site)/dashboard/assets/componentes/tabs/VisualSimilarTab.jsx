'use client';

import React, { useRef } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
    LinearProgress,
    Paper,
    Slider,
    Stack,
    Typography,
} from '@mui/material';
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
}) {
    const parentRef = useRef(null);

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
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        lg: 'minmax(0, 1fr) 320px',
                    },
                    gap: 2,
                    alignItems: 'start',
                }}
            >
                <Stack spacing={2} sx={{ height: 'calc(100vh - 200px)' }}>
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
                                            <Paper sx={{ p: 2, borderRadius: 2 }}>
                                                <Stack
                                                    direction={{ xs: 'column', sm: 'row' }}
                                                    spacing={1.5}
                                                    justifyContent="space-between"
                                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                                >
                                                    <Box>
                                                        <Typography
                                                            variant="subtitle1"
                                                            sx={{ fontWeight: 700 }}
                                                        >
                                                            Grupo #{virtualRow.index + 1}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            Firma: {group.signature}
                                                        </Typography>
                                                    </Box>
                                                    <Stack direction="row" spacing={1}>
                                                        <Chip
                                                            size="small"
                                                            label={`${group.items.length} assets`}
                                                        />
                                                        <Chip
                                                            size="small"
                                                            color="secondary"
                                                            label={`Similitud Visual > ${group.confidence}%`}
                                                        />
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="secondary"
                                                            onClick={() =>
                                                                selectVisualGroupDuplicates(group)
                                                            }
                                                        >
                                                            Sugerir duplicados
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="inherit"
                                                            onClick={() =>
                                                                dismissVisualSimilarGroup(group)
                                                            }
                                                        >
                                                            No son duplicados
                                                        </Button>
                                                    </Stack>
                                                </Stack>

                                                <Divider sx={{ my: 1.5 }} />

                                                <Box
                                                    sx={{
                                                        display: 'grid',
                                                        gridTemplateColumns: {
                                                            xs: '1fr',
                                                            sm: 'repeat(2, minmax(0, 1fr))',
                                                            xl: 'repeat(3, minmax(0, 1fr))',
                                                        },
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
                                                                        ? '2px solid #ce93d8' // secondary light
                                                                        : isSelected
                                                                          ? '2px solid #ff9800'
                                                                          : '1px solid rgba(127,127,127,0.25)',
                                                                    bgcolor: isPrimary
                                                                        ? 'rgba(156, 39, 176, 0.12)' // secondary main alpha
                                                                        : 'transparent',
                                                                }}
                                                            >
                                                                {assetImages.length ? (
                                                                    <Box
                                                                        sx={{
                                                                            width: '100%',
                                                                            display: 'grid',
                                                                            gridTemplateColumns:
                                                                                'repeat(auto-fill, minmax(100px, 1fr))',
                                                                            gap: 0.6,
                                                                            mb: 1,
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
                                                                                                aspectRatio:
                                                                                                    '1 / 1',
                                                                                                objectFit:
                                                                                                    'cover',
                                                                                                borderRadius: 1,
                                                                                                cursor: 'zoom-in',
                                                                                                border: '1px solid rgba(127,127,127,0.35)',
                                                                                                transition:
                                                                                                    'transform 120ms ease',
                                                                                                '&:hover': {
                                                                                                    transform:
                                                                                                        'scale(1.03)',
                                                                                                },
                                                                                            }}
                                                                                        />
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
                                                                    variant="body2"
                                                                    sx={{ fontWeight: 700 }}
                                                                    noWrap
                                                                >
                                                                    {asset.title ||
                                                                        asset.archiveName ||
                                                                        `Asset #${id}`}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    sx={{ display: 'block' }}
                                                                >
                                                                    Archivo: {asset.archiveName || '-'}
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    sx={{ display: 'block' }}
                                                                >
                                                                    ID: {id} • Similitud:{' '}
                                                                    {entry.similarity}%
                                                                </Typography>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                    sx={{ display: 'block', mb: 0.8 }}
                                                                >
                                                                    Cuenta:{' '}
                                                                    {asset.account?.alias ||
                                                                        asset.accountId ||
                                                                        '-'}
                                                                </Typography>

                                                                <Stack
                                                                    direction="row"
                                                                    spacing={1}
                                                                    justifyContent="space-between"
                                                                    alignItems="center"
                                                                >
                                                                    <Button
                                                                        size="small"
                                                                        color="secondary"
                                                                        variant={
                                                                            isPrimary
                                                                                ? 'contained'
                                                                                : 'outlined'
                                                                        }
                                                                        onClick={() =>
                                                                            setVisualPrimaryInGroup(
                                                                                group.id,
                                                                                id,
                                                                            )
                                                                        }
                                                                    >
                                                                        {isPrimary
                                                                            ? 'Principal'
                                                                            : 'Marcar principal'}
                                                                    </Button>

                                                                    <FormControlLabel
                                                                        sx={{ mr: 0 }}
                                                                        control={
                                                                            <Checkbox
                                                                                color="warning"
                                                                                checked={isSelected}
                                                                                onChange={() =>
                                                                                    toggleVisualSimilarSelection(
                                                                                        id,
                                                                                    )
                                                                                }
                                                                                disabled={isPrimary}
                                                                            />
                                                                        }
                                                                        label="Eliminar"
                                                                    />
                                                                </Stack>
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
            </Box>
        </Stack>
    );
}
