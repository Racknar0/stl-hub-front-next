'use client';

import { useState } from 'react';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import {
    Box,
    Checkbox,
    Chip,
    Dialog,
    FormControlLabel,
    IconButton,
    LinearProgress,
    MenuItem,
    Paper,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CachedIcon from '@mui/icons-material/Cached';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import SellIcon from '@mui/icons-material/Sell';
import SaveIcon from '@mui/icons-material/Save';
import MetaSeoRow from '../meta-seo/MetaSeoRow';
import MetaSeoDialogs from '../meta-seo/MetaSeoDialogs';

export default function MetaSeoTab({
    metaReviewMode,
    setMetaReviewMode,
    metaBusy,
    loading,
    handleGenerateAllDescriptions,
    handleGenerateMissingDescriptions,
    handleGenerateSelectedDescriptions,
    runMetaTagsGenerationForSelected,
    saveMetaSelected,
    metaSelectedIds,
    metaRows,
    rowCount,
    allVisibleMetaSelected,
    toggleMetaSelectAllVisible,
    allVisibleMetaIds,
    metaScrollRef,
    paddingTop,
    virtualItems,
    metaExpandedImagesMap,
    metaDraftMap,
    normalizeMetaCategoryList,
    normalizeMetaTagList,
    metaSelectedMap,
    metaVirtualizer,
    categories,
    allTags,
    toggleMetaSelect,
    imgUrl,
    handleMetaSetFirstImage,
    handleMetaDeleteImage,
    toggleMetaExpandedImages,
    updateMetaDraft,
    openMetaProfiles,
    handleGenerateSingleDescription,
    handleSaveMetaRow,
    onDeleteAsset,
    paddingBottom,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    metaPageOptions,
    metaTotalPages,
    syncMultimodalVectorsOpen,
    setSyncMultimodalVectorsOpen,
    metaProfilesOpen,
    setMetaProfilesOpen,
    setMetaProfileAssetId,
    selectedMetaRowForProfiles,
    applyMetaProfile,
    metaImagePreview,
    setMetaImagePreview,
    onQuickAdultos,
    handleGenerateMetaAll,
    markingAdultIds = new Set(),
}) {
    const [showReviewControls, setShowReviewControls] = useState(false);
    const content = (
        <Stack
            spacing={1.5}
            sx={
                metaReviewMode
                    ? {
                          p: 1,
                          height: '100vh',
                          overflowY: 'auto',
                          bgcolor: '#090d16',
                      }
                    : {}
            }
        >
            {(!metaReviewMode || showReviewControls) && (
                <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(0, 0, 0, 0)', border: '1px solid rgba(148, 163, 184, 0.3)', boxShadow: 'none' }}>
                <Stack
                    direction={{ xs: 'column', lg: 'row' }}
                    spacing={1.2}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', lg: 'center' }}
                >
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            META-SEO
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Edita nombre, tags, categorias y descripcion.
                            Tambien puedes generar descripciones/tags en lote con IA.
                        </Typography>
                    </Box>

                    <Stack
                        direction="row"
                        spacing={0.7}
                        sx={{ justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}
                    >
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={metaReviewMode}
                                    onChange={(e) => setMetaReviewMode(Boolean(e?.target?.checked))}
                                    color="info"
                                    size="small"
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                    Modo Revisión
                                </Typography>
                            }
                            sx={{ mr: 1.5 }}
                        />

                        <Tooltip title="Generar descripciones IA (todos)">
                            <span>
                                <IconButton
                                    onClick={handleGenerateAllDescriptions}
                                    disabled={metaBusy || loading}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                    }}
                                >
                                    <AutoAwesomeIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Sincronizar Vectores Multimodal (IA)">
                            <span>
                                <IconButton
                                    onClick={() => setSyncMultimodalVectorsOpen(true)}
                                    disabled={metaBusy || loading}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                    }}
                                >
                                    <CachedIcon
                                        color="primary"
                                        fontSize="small"
                                    />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Generar descripciones IA faltantes">
                            <span>
                                <IconButton
                                    onClick={handleGenerateMissingDescriptions}
                                    disabled={metaBusy || loading}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                    }}
                                >
                                    <FilterAltIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Generar descripciones IA de seleccionados">
                            <span>
                                <IconButton
                                    onClick={handleGenerateSelectedDescriptions}
                                    disabled={
                                        metaBusy ||
                                        loading ||
                                        !metaSelectedIds.length
                                    }
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                    }}
                                >
                                    <PlaylistAddCheckIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Generar tags IA de seleccionados">
                            <span>
                                <IconButton
                                    onClick={runMetaTagsGenerationForSelected}
                                    disabled={
                                        metaBusy ||
                                        loading ||
                                        !metaSelectedIds.length
                                    }
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                    }}
                                >
                                    <SellIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Guardar seleccionados">
                            <span>
                                <IconButton
                                    onClick={saveMetaSelected}
                                    disabled={
                                        metaBusy ||
                                        loading ||
                                        !metaSelectedIds.length
                                    }
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                        color: '#16a34a',
                                    }}
                                >
                                    <SaveIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>

                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    sx={{ mt: 1.5 }}
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                >
                    <Chip
                        label={`Seleccionados: ${metaSelectedIds.length}`}
                        color={metaSelectedIds.length ? 'warning' : 'default'}
                    />
                    <Chip label={`Filas actuales: ${metaRows.length}`} />
                    <Chip label={`Total: ${rowCount}`} />

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: { md: 'auto' } }}
                    >
                            Usa el paginador inferior igual que en STL-LIST.
                        </Typography>
                    </Stack>
                </Paper>
            )}

            {(metaBusy || loading) && <LinearProgress />}

            <TableContainer
                component={Paper}
                ref={metaScrollRef}
                sx={{
                    borderRadius: 2,
                    bgcolor: 'rgba(0, 0, 0, 0)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    boxShadow: 'none',
                    maxHeight: metaReviewMode
                        ? (showReviewControls ? 'calc(100vh - 180px)' : 'calc(100vh - 16px)')
                        : 'calc(100vh - 260px)',
                    overflowY: 'scroll',
                    overflowAnchor: 'none',
                    '& .MuiTableCell-head': {
                        backgroundColor: 'rgba(2, 6, 23, 0.7)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 10,
                        color: '#f8fbff',
                        fontWeight: 800,
                        borderBottom: '1px solid rgba(191,219,254,0.25)',
                    },
                }}
            >
                <Table size="small" stickyHeader key={metaReviewMode ? 'review' : 'normal'}>
                    <TableHead>
                        <TableRow>
                            <TableCell
                                sx={{ width: 90, minWidth: 90 }}
                            >
                                <Checkbox
                                    checked={allVisibleMetaSelected}
                                    onChange={toggleMetaSelectAllVisible}
                                    disabled={
                                        metaBusy ||
                                        loading ||
                                        !allVisibleMetaIds.length
                                    }
                                    sx={{ p: 0.5 }}
                                />
                            </TableCell>

                            <TableCell
                                sx={{
                                    minWidth: metaReviewMode ? 640 : 480,
                                    width: '100%',
                                }}
                            >
                                Imagenes / Categorías / Tags
                            </TableCell>
                            {!metaReviewMode && (
                                <TableCell sx={{ minWidth: 240, width: 240, maxWidth: 240 }}>
                                    Asset / Name (ES/EN)
                                </TableCell>
                            )}
                             <TableCell sx={{ minWidth: 400, width: 400, maxWidth: 400 }}>
                                SEO Description (ES/EN)
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paddingTop > 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={metaReviewMode ? 3 : 4}
                                    sx={{
                                        p: 0,
                                        borderBottom: 'none',
                                        height: `${paddingTop}px`,
                                    }}
                                />
                            </TableRow>
                        )}

                        {virtualItems.map((virtualRow) => {
                            const row = metaRows[virtualRow.index];
                            const id = Number(row?.id || 0);
                            const rowImages = Array.isArray(row?.images)
                                ? row.images
                                : [];
                            const metaExpanded = !!metaExpandedImagesMap[id];
                            const visibleImages = metaExpanded
                                ? rowImages
                                : rowImages.slice(0, 6);
                            const draft = metaDraftMap[id] || {
                                id,
                                title: String(row?.title || ''),
                                titleEn: String(row?.titleEn || ''),
                                description: String(row?.description || ''),
                                descriptionEn: String(row?.descriptionEn || ''),
                                categories: normalizeMetaCategoryList(
                                    row?.categories,
                                ),
                                tags: normalizeMetaTagList(row?.tags),
                            };

                            return (
                                <MetaSeoRow
                                    key={`meta-row-${id}`}
                                    metaReviewMode={metaReviewMode}
                                    virtualRow={virtualRow}
                                    metaVirtualizer={metaVirtualizer}
                                    id={id}
                                    rowImages={rowImages}
                                    metaExpanded={metaExpanded}
                                    visibleImages={visibleImages}
                                    draft={draft}
                                    row={row}
                                    isSelected={!!metaSelectedMap[id]}
                                    metaBusy={metaBusy}
                                    loading={loading}
                                    categories={categories}
                                    allTags={allTags}
                                    normalizeMetaCategoryList={
                                        normalizeMetaCategoryList
                                    }
                                    normalizeMetaTagList={normalizeMetaTagList}
                                    onToggleSelect={toggleMetaSelect}
                                    onOpenImagePreview={setMetaImagePreview}
                                    imgUrl={imgUrl}
                                    onSetFirstImage={handleMetaSetFirstImage}
                                    onDeleteImage={handleMetaDeleteImage}
                                    onToggleExpandedImages={
                                        toggleMetaExpandedImages
                                    }
                                    onUpdateDraft={updateMetaDraft}
                                    onOpenProfiles={openMetaProfiles}
                                    onGenerateSingleDescription={
                                        handleGenerateSingleDescription
                                    }
                                    onSaveRow={handleSaveMetaRow}
                                    onDeleteAsset={onDeleteAsset}
                                    onQuickAdultos={onQuickAdultos}
                                    markingAdultIds={markingAdultIds}
                                    onGenerateMetaAll={handleGenerateMetaAll}
                                />
                            );
                        })}
                         {paddingBottom > 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={metaReviewMode ? 3 : 4}
                                    sx={{
                                        p: 0,
                                        borderBottom: 'none',
                                        height: `${paddingBottom}px`,
                                    }}
                                />
                            </TableRow>
                        )}

                        {!metaRows.length && (
                            <TableRow>
                                <TableCell colSpan={metaReviewMode ? 3 : 4}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        No hay assets en esta pagina/filtro.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {(!metaReviewMode || showReviewControls) && (
                <Paper sx={{ borderRadius: 2, bgcolor: 'rgba(0, 0, 0, 0)', border: '1px solid rgba(148, 163, 184, 0.3)', p: 1, mt: 1, boxShadow: 'none' }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', md: 'center' }}
                >
                    <TablePagination
                        component="div"
                        count={rowCount}
                        page={pageIndex}
                        onPageChange={(_, nextPage) => setPageIndex(nextPage)}
                        rowsPerPage={pageSize}
                        onRowsPerPageChange={(e) => {
                            setPageSize(Number(e.target.value) || 50);
                            setPageIndex(0);
                        }}
                        rowsPerPageOptions={[
                            10, 25, 50, 100, 200, 300, 400, 500, 1000,
                        ]}
                        showFirstButton
                        showLastButton
                        disabled={metaBusy || loading}
                    />

                    <TextField
                        select
                        size="small"
                        label="Ir a pagina"
                        value={pageIndex}
                        onChange={(e) =>
                            setPageIndex(Number(e.target.value) || 0)
                        }
                        disabled={
                            metaBusy || loading || Number(rowCount || 0) <= 0
                        }
                        sx={{
                            minWidth: { xs: '100%', md: 240 },
                            mr: { md: 2 },
                            mb: { xs: 2, md: 0 },
                        }}
                    >
                        {metaPageOptions.map((pageOption) => (
                            <MenuItem
                                key={`meta-page-${pageOption}`}
                                value={pageOption}
                            >
                                {`Pagina ${pageOption + 1} de ${metaTotalPages}`}
                            </MenuItem>
                        ))}
                        </TextField>
                    </Stack>
                </Paper>
            )}

            <MetaSeoDialogs
                syncMultimodalVectorsOpen={syncMultimodalVectorsOpen}
                setSyncMultimodalVectorsOpen={setSyncMultimodalVectorsOpen}
                metaProfilesOpen={metaProfilesOpen}
                setMetaProfilesOpen={setMetaProfilesOpen}
                setMetaProfileAssetId={setMetaProfileAssetId}
                selectedMetaRowForProfiles={selectedMetaRowForProfiles}
                applyMetaProfile={applyMetaProfile}
                metaImagePreview={metaImagePreview}
                setMetaImagePreview={setMetaImagePreview}
            />
        </Stack>
    );

    if (metaReviewMode) {
        return (
            <Dialog
                open={metaReviewMode}
                onClose={() => setMetaReviewMode(false)}
                fullScreen
                disableScrollLock={true}
                PaperProps={{
                    sx: {
                        bgcolor: '#090d16',
                        backgroundImage: 'none',
                    },
                }}
            >
                {/* Floating controls */}
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                        position: 'fixed',
                        top: 16,
                        right: 16,
                        zIndex: 1400,
                    }}
                >
                    <Tooltip title={showReviewControls ? "Ocultar Controles" : "Mostrar Controles"}>
                        <IconButton
                            onClick={() => setShowReviewControls(!showReviewControls)}
                            sx={{
                                bgcolor: 'rgba(15, 23, 42, 0.85)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                '&:hover': { bgcolor: 'rgba(30, 41, 59, 0.95)' },
                            }}
                        >
                            {showReviewControls ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Salir de Modo Revisión">
                        <IconButton
                            onClick={() => setMetaReviewMode(false)}
                            sx={{
                                bgcolor: 'rgba(239, 68, 68, 0.85)',
                                color: '#fff',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.95)' },
                            }}
                        >
                            <FullscreenExitIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
                {content}
            </Dialog>
        );
    }

    return content;
}
