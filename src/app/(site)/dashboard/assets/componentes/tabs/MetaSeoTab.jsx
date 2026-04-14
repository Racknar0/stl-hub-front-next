'use client';

import {
    Box,
    Checkbox,
    Chip,
    IconButton,
    LinearProgress,
    MenuItem,
    Paper,
    Stack,
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
    metaBusy,
    loading,
    handleGenerateAllDescriptions,
    setSyncVectorsOpen,
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
    paddingBottom,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    metaPageOptions,
    metaTotalPages,
    syncVectorsOpen,
    metaProfilesOpen,
    setMetaProfilesOpen,
    setMetaProfileAssetId,
    selectedMetaRowForProfiles,
    applyMetaProfile,
    metaImagePreview,
    setMetaImagePreview,
}) {
    return (
        <Stack spacing={2}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
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
                        sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}
                    >
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

                        <Tooltip title="Sincronizar Vectores (Qdrant)">
                            <span>
                                <IconButton
                                    onClick={() => setSyncVectorsOpen(true)}
                                    disabled={metaBusy || loading}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                    }}
                                >
                                    <CachedIcon
                                        color="secondary"
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

            {(metaBusy || loading) && <LinearProgress />}

            <TableContainer
                component={Paper}
                ref={metaScrollRef}
                sx={{
                    borderRadius: 2,
                    maxHeight: 'calc(100vh - 260px)',
                    overflowY: 'scroll',
                    overflowAnchor: 'none',
                    '& .MuiTableCell-head': {
                        backgroundColor: '#0f172a',
                        backdropFilter: 'blur(8px)',
                        zIndex: 10,
                        color: '#f8fbff',
                        fontWeight: 800,
                        borderBottom: '1px solid rgba(191,219,254,0.45)',
                    },
                }}
            >
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell
                                padding="checkbox"
                                sx={{ width: 50, minWidth: 50 }}
                            >
                                <Checkbox
                                    checked={allVisibleMetaSelected}
                                    onChange={toggleMetaSelectAllVisible}
                                    disabled={
                                        metaBusy ||
                                        loading ||
                                        !allVisibleMetaIds.length
                                    }
                                />
                            </TableCell>
                            <TableCell sx={{ width: 60, minWidth: 60 }}>
                                ID
                            </TableCell>
                            <TableCell sx={{ minWidth: 270, width: 270 }}>
                                Imagenes
                            </TableCell>
                            <TableCell sx={{ minWidth: 280, width: 280 }}>
                                Asset / Name (ES/EN)
                            </TableCell>
                            <TableCell sx={{ minWidth: 400, width: 400 }}>
                                SEO Description (ES/EN)
                            </TableCell>
                            <TableCell sx={{ minWidth: 300, width: 300 }}>
                                Categorias
                            </TableCell>
                            <TableCell sx={{ minWidth: 400, width: 400 }}>
                                Tags
                            </TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paddingTop > 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={10}
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
                                : rowImages.slice(0, 3);
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
                                    virtualRow={virtualRow}
                                    metaVirtualizer={metaVirtualizer}
                                    id={id}
                                    rowImages={rowImages}
                                    metaExpanded={metaExpanded}
                                    visibleImages={visibleImages}
                                    draft={draft}
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
                                />
                            );
                        })}

                        {paddingBottom > 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={10}
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
                                <TableCell colSpan={10}>
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

            <Paper sx={{ borderRadius: 2 }}>
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

            <MetaSeoDialogs
                syncVectorsOpen={syncVectorsOpen}
                setSyncVectorsOpen={setSyncVectorsOpen}
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
}
