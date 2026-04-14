'use client';

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

export default function NameSimilarTab({
    analyzeNameSimilarAssets,
    nameSimilarLoading,
    nameSimilarThreshold,
    setNameSimilarThreshold,
    nameSimilarGroups,
    visibleNameSimilarGroups,
    ignoredPairsCount,
    selectedNameSimilarIds,
    formatMBfromB,
    selectedNameSimilarBytes,
    reactivateNameDismissedGroups,
    nameSimilarProgress,
    nameSimilarError,
    nameSimilarPrimaryMap,
    selectNameGroupDuplicates,
    dismissNameSimilarGroup,
    nameSimilarSelectedMap,
    imgUrl,
    openSimilarViewer,
    setNamePrimaryInGroup,
    toggleNameSimilarSelection,
    hasMoreNameSimilarGroups,
    nameSimilarLoadMoreRef,
    loadMoreNameSimilarGroups,
    selectedNameSimilarAssets,
    nameSimilarDeleteProgress,
    handleDeleteSelectedNameSimilar,
    clearNameSimilarSelection,
}) {
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
                            SIMILAR-NAMES
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Agrupa assets por similitud de nombre para detectar
                            repetidos y depurar duplicados con mas facilidad.
                        </Typography>
                    </Box>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                    >
                        <Button
                            variant="contained"
                            onClick={analyzeNameSimilarAssets}
                            disabled={nameSimilarLoading}
                        >
                            Analizar por nombre
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={analyzeNameSimilarAssets}
                            disabled={nameSimilarLoading}
                        >
                            Reanalizar
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
                            Umbral de similitud de nombre: {nameSimilarThreshold}%
                        </Typography>
                        <Slider
                            value={nameSimilarThreshold}
                            onChange={(_, value) =>
                                setNameSimilarThreshold(Number(value))
                            }
                            min={70}
                            max={100}
                            step={1}
                            valueLabelDisplay="auto"
                            disabled={nameSimilarLoading}
                        />
                    </Box>

                    <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                    >
                        <Chip label={`Grupos: ${nameSimilarGroups.length}`} />
                        <Chip
                            label={`Mostrando: ${visibleNameSimilarGroups.length}/${nameSimilarGroups.length}`}
                        />
                        <Chip
                            label={`Pares descartados: ${ignoredPairsCount}`}
                        />
                        <Chip
                            label={`Seleccionados: ${selectedNameSimilarIds.length}`}
                            color={
                                selectedNameSimilarIds.length
                                    ? 'warning'
                                    : 'default'
                            }
                        />
                        <Chip
                            label={`Espacio estimado: ${formatMBfromB(selectedNameSimilarBytes)}`}
                            color="info"
                        />
                    </Stack>

                    {ignoredPairsCount > 0 && (
                        <Button
                            variant="text"
                            size="small"
                            onClick={reactivateNameDismissedGroups}
                            disabled={nameSimilarLoading}
                        >
                            Reactivar descartes
                        </Button>
                    )}
                </Stack>

                {nameSimilarLoading && <LinearProgress sx={{ mt: 2 }} />}
                {!!nameSimilarProgress.total && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: 'block' }}
                    >
                        Procesados: {nameSimilarProgress.done} / {nameSimilarProgress.total}
                    </Typography>
                )}
                {nameSimilarError && (
                    <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1, display: 'block' }}
                    >
                        {nameSimilarError}
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
                <Stack spacing={2}>
                    {!nameSimilarGroups.length && !nameSimilarLoading && (
                        <Paper sx={{ p: 3, borderRadius: 2 }}>
                            <Typography
                                variant="body1"
                                sx={{ fontWeight: 600, mb: 0.5 }}
                            >
                                No hay grupos para mostrar todavia
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Ejecuta Analizar por nombre para construir
                                grupos de similitud textual.
                            </Typography>
                        </Paper>
                    )}

                    {visibleNameSimilarGroups.map((group, groupIndex) => {
                        const primaryId = Number(
                            nameSimilarPrimaryMap[group.id] ||
                                group.items?.[0]?.asset?.id,
                        );
                        return (
                            <Paper key={group.id} sx={{ p: 2, borderRadius: 2 }}>
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
                                            Grupo #{groupIndex + 1}
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
                                            color="success"
                                            label={`Confianza ${group.confidence}%`}
                                        />
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                                selectNameGroupDuplicates(group)
                                            }
                                        >
                                            Sugerir duplicados
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="inherit"
                                            onClick={() =>
                                                dismissNameSimilarGroup(group)
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
                                            !!nameSimilarSelectedMap[id];
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
                                                        ? '2px solid #66bb6a'
                                                        : isSelected
                                                          ? '2px solid #ff9800'
                                                          : '1px solid rgba(127,127,127,0.25)',
                                                    bgcolor: isPrimary
                                                        ? 'rgba(102, 187, 106, 0.12)'
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
                                                                            key={`${group.id}-${id}-name-img-${imgIdx}`}
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
                                                    {entry.similarity}% • Dist:{' '}
                                                    {entry.distance}
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
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ display: 'block', mb: 0.8 }}
                                                >
                                                    Imagenes: {assetImages.length}
                                                </Typography>

                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    justifyContent="space-between"
                                                    alignItems="center"
                                                >
                                                    <Button
                                                        size="small"
                                                        variant={
                                                            isPrimary
                                                                ? 'contained'
                                                                : 'outlined'
                                                        }
                                                        onClick={() =>
                                                            setNamePrimaryInGroup(
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
                                                                checked={isSelected}
                                                                onChange={() =>
                                                                    toggleNameSimilarSelection(
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
                        );
                    })}

                    {hasMoreNameSimilarGroups && (
                        <Box
                            ref={nameSimilarLoadMoreRef}
                            sx={{
                                py: 2,
                                textAlign: 'center',
                                color: 'text.secondary',
                            }}
                        >
                            <Typography variant="caption">
                                Cargando mas grupos...
                            </Typography>
                        </Box>
                    )}

                    {hasMoreNameSimilarGroups && (
                        <Button
                            variant="text"
                            onClick={loadMoreNameSimilarGroups}
                            sx={{ alignSelf: 'center' }}
                        >
                            Cargar mas
                        </Button>
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
                        {selectedNameSimilarIds.length}
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1.5 }}
                    >
                        Espacio estimado: {formatMBfromB(selectedNameSimilarBytes)}
                    </Typography>

                    {(nameSimilarDeleteProgress.running ||
                        nameSimilarDeleteProgress.total > 0) && (
                        <Box sx={{ mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {nameSimilarDeleteProgress.running
                                    ? `Eliminando ${nameSimilarDeleteProgress.processed}/${nameSimilarDeleteProgress.total}`
                                    : `Proceso finalizado ${nameSimilarDeleteProgress.processed}/${nameSimilarDeleteProgress.total}`}
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 0.8 }}
                            >
                                OK: {nameSimilarDeleteProgress.success} · Fallidos:{' '}
                                {nameSimilarDeleteProgress.failed}
                                {nameSimilarDeleteProgress.currentAssetId
                                    ? ` · Asset #${nameSimilarDeleteProgress.currentAssetId}`
                                    : ''}
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={
                                    nameSimilarDeleteProgress.total
                                        ? Math.min(
                                              100,
                                              Math.round(
                                                  (nameSimilarDeleteProgress.processed /
                                                      nameSimilarDeleteProgress.total) *
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
                        {selectedNameSimilarAssets.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                Aun no seleccionas assets.
                            </Typography>
                        )}
                        {selectedNameSimilarAssets.map((asset) => (
                            <Box
                                key={`name-selected-${asset.id}`}
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
                                !selectedNameSimilarIds.length ||
                                nameSimilarLoading
                            }
                            onClick={handleDeleteSelectedNameSimilar}
                        >
                            Eliminar seleccionados
                        </Button>
                        <Button
                            variant="outlined"
                            disabled={
                                !selectedNameSimilarIds.length ||
                                nameSimilarLoading
                            }
                            onClick={clearNameSimilarSelection}
                        >
                            Limpiar seleccion
                        </Button>
                    </Stack>
                </Paper>
            </Box>
        </Stack>
    );
}
