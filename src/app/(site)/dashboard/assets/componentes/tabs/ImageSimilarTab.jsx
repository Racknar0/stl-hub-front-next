'use client';

import {
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    LinearProgress,
    Paper,
    Slider,
    Stack,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function ImageSimilarTab({
    analyzeSimilarAssets,
    similarLoading,
    startHashBackfill,
    similarBackfill,
    similarThreshold,
    setSimilarThreshold,
    similarGroups,
    visibleSimilarGroups,
    ignoredPairsCount,
    selectedSimilarIds,
    formatMBfromB,
    selectedSimilarBytes,
    similarHashStats,
    reactivateDismissedGroups,
    similarProgress,
    similarError,
    similarPrimaryMap,
    selectGroupDuplicates,
    dismissSimilarGroup,
    similarSelectedMap,
    imgUrl,
    openSimilarViewer,
    setPrimaryInGroup,
    toggleSimilarSelection,
    hasMoreSimilarGroups,
    similarLoadMoreRef,
    loadMoreSimilarGroups,
    selectedSimilarAssets,
    similarDeleteProgress,
    handleDeleteSelectedSimilar,
    clearSimilarSelection,
    similarViewer,
    closeSimilarViewer,
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
                            SIMILAR-IMAGES
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Vista preliminar por bloques para detectar posibles
                            duplicados y decidir que eliminar.
                        </Typography>
                    </Box>

                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                    >
                        <Button
                            variant="contained"
                            onClick={analyzeSimilarAssets}
                            disabled={similarLoading}
                        >
                            Analizar todos los assets
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={analyzeSimilarAssets}
                            disabled={similarLoading}
                        >
                            Reanalizar
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            onClick={startHashBackfill}
                            disabled={
                                similarLoading || similarBackfill.running
                            }
                        >
                            Generar hash faltantes
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
                            Umbral de similitud: {similarThreshold}%
                        </Typography>
                        <Slider
                            value={similarThreshold}
                            onChange={(_, value) =>
                                setSimilarThreshold(Number(value))
                            }
                            min={70}
                            max={100}
                            step={1}
                            valueLabelDisplay="auto"
                            disabled={similarLoading}
                        />
                    </Box>

                    <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                    >
                        <Chip label={`Grupos: ${similarGroups.length}`} />
                        <Chip
                            label={`Mostrando: ${visibleSimilarGroups.length}/${similarGroups.length}`}
                        />
                        <Chip
                            label={`Pares descartados: ${ignoredPairsCount}`}
                        />
                        <Chip
                            label={`Seleccionados: ${selectedSimilarIds.length}`}
                            color={
                                selectedSimilarIds.length
                                    ? 'warning'
                                    : 'default'
                            }
                        />
                        <Chip
                            label={`Espacio estimado: ${formatMBfromB(selectedSimilarBytes)}`}
                            color="info"
                        />
                        <Chip label={`Assets: ${similarHashStats.assetsTotal}`} />
                        <Chip
                            label={`Hashes: ${similarHashStats.hashRows}`}
                            color="secondary"
                        />
                        <Chip
                            label={`Backfill: ${similarBackfill.running ? 'ejecutando' : 'idle'}`}
                            color={
                                similarBackfill.running
                                    ? 'warning'
                                    : 'default'
                            }
                        />
                    </Stack>

                    {ignoredPairsCount > 0 && (
                        <Button
                            variant="text"
                            size="small"
                            onClick={reactivateDismissedGroups}
                            disabled={similarLoading}
                        >
                            Reactivar descartes
                        </Button>
                    )}
                </Stack>

                {similarLoading && <LinearProgress sx={{ mt: 2 }} />}
                {!!similarProgress.total && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: 'block' }}
                    >
                        Procesados: {similarProgress.done} / {similarProgress.total}
                    </Typography>
                )}
                {(similarBackfill.running ||
                    similarBackfill.processedAssets > 0 ||
                    similarBackfill.lastError) && (
                    <Typography
                        variant="caption"
                        color={
                            similarBackfill.lastError ? 'error' : 'text.secondary'
                        }
                        sx={{ mt: 1, display: 'block' }}
                    >
                        Hash backfill: assets {similarBackfill.processedAssets}/
                        {similarBackfill.totalAssets || '...'} · imagenes{' '}
                        {similarBackfill.processedImages}/
                        {similarBackfill.totalImages || '...'} · hashes{' '}
                        {similarBackfill.hashedRows} · fallos{' '}
                        {similarBackfill.failedImages}
                        {similarBackfill.currentAssetId
                            ? ` · asset actual #${similarBackfill.currentAssetId}`
                            : ''}
                        {similarBackfill.lastError
                            ? ` · error: ${similarBackfill.lastError}`
                            : ''}
                    </Typography>
                )}
                {similarError && (
                    <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1, display: 'block' }}
                    >
                        {similarError}
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
                    {!similarGroups.length && !similarLoading && (
                        <Paper sx={{ p: 3, borderRadius: 2 }}>
                            <Typography
                                variant="body1"
                                sx={{ fontWeight: 600, mb: 0.5 }}
                            >
                                No hay grupos para mostrar todavia
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Ejecuta Analizar todos los assets para construir
                                los bloques de similitud.
                            </Typography>
                        </Paper>
                    )}

                    {visibleSimilarGroups.map((group, groupIndex) => {
                        const primaryId = Number(
                            similarPrimaryMap[group.id] ||
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
                                            onClick={() => selectGroupDuplicates(group)}
                                        >
                                            Sugerir duplicados
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="inherit"
                                            onClick={() => dismissSimilarGroup(group)}
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
                                            !!similarSelectedMap[id];
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
                                                        {assetImages.map(
                                                            (img, imgIdx) => {
                                                                const thumbSrc =
                                                                    imgUrl(img);
                                                                return (
                                                                    <Box
                                                                        key={`${group.id}-${id}-img-${imgIdx}`}
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
                                                            setPrimaryInGroup(
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
                                                                    toggleSimilarSelection(
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

                    {hasMoreSimilarGroups && (
                        <Box
                            ref={similarLoadMoreRef}
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

                    {hasMoreSimilarGroups && (
                        <Button
                            variant="text"
                            onClick={loadMoreSimilarGroups}
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
                        {selectedSimilarIds.length}
                    </Typography>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 1.5 }}
                    >
                        Espacio estimado: {formatMBfromB(selectedSimilarBytes)}
                    </Typography>

                    {(similarDeleteProgress.running ||
                        similarDeleteProgress.total > 0) && (
                        <Box sx={{ mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {similarDeleteProgress.running
                                    ? `Eliminando ${similarDeleteProgress.processed}/${similarDeleteProgress.total}`
                                    : `Proceso finalizado ${similarDeleteProgress.processed}/${similarDeleteProgress.total}`}
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 0.8 }}
                            >
                                OK: {similarDeleteProgress.success} · Fallidos:{' '}
                                {similarDeleteProgress.failed}
                                {similarDeleteProgress.currentAssetId
                                    ? ` · Asset #${similarDeleteProgress.currentAssetId}`
                                    : ''}
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={
                                    similarDeleteProgress.total
                                        ? Math.min(
                                              100,
                                              Math.round(
                                                  (similarDeleteProgress.processed /
                                                      similarDeleteProgress.total) *
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
                        {selectedSimilarAssets.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                Aun no seleccionas assets.
                            </Typography>
                        )}
                        {selectedSimilarAssets.map((asset) => (
                            <Box
                                key={`selected-${asset.id}`}
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
                                !selectedSimilarIds.length || similarLoading
                            }
                            onClick={handleDeleteSelectedSimilar}
                        >
                            Eliminar seleccionados
                        </Button>
                        <Button
                            variant="outlined"
                            disabled={
                                !selectedSimilarIds.length || similarLoading
                            }
                            onClick={clearSimilarSelection}
                        >
                            Limpiar seleccion
                        </Button>
                    </Stack>
                </Paper>
            </Box>

            <Dialog
                open={similarViewer.open}
                onClose={closeSimilarViewer}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700 }}
                            noWrap
                        >
                            {similarViewer.assetTitle}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {similarViewer.assetId
                                ? `#${similarViewer.assetId}`
                                : ''}
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={closeSimilarViewer}
                        size="small"
                        aria-label="Cerrar visor"
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    <Box
                        sx={{
                            width: '100%',
                            minHeight: { xs: 260, md: 420 },
                            borderRadius: 1.5,
                            bgcolor: 'rgba(0,0,0,0.72)',
                            display: 'grid',
                            placeItems: 'center',
                            mb: 1.5,
                            overflow: 'hidden',
                        }}
                    >
                        {similarViewer.image ? (
                            <Box
                                component="img"
                                src={imgUrl(similarViewer.image)}
                                alt={similarViewer.assetTitle}
                                sx={{
                                    maxWidth: '100%',
                                    maxHeight: { xs: 260, md: 420 },
                                    objectFit: 'contain',
                                }}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Sin imagen
                            </Typography>
                        )}
                    </Box>
                </DialogContent>
            </Dialog>
        </Stack>
    );
}
