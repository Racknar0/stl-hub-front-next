'use client';

import {
    Autocomplete,
    Box,
    Checkbox,
    Chip,
    IconButton,
    Stack,
    TableCell,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';

export default function MetaSeoRow({
    virtualRow,
    metaVirtualizer,
    id,
    rowImages,
    metaExpanded,
    visibleImages,
    draft,
    isSelected,
    metaBusy,
    loading,
    categories,
    allTags,
    normalizeMetaCategoryList,
    normalizeMetaTagList,
    onToggleSelect,
    onOpenImagePreview,
    imgUrl,
    onSetFirstImage,
    onDeleteImage,
    onToggleExpandedImages,
    onUpdateDraft,
    onOpenProfiles,
    onGenerateSingleDescription,
    onSaveRow,
}) {
    return (
        <TableRow
            key={`meta-${id}`}
            hover
            ref={metaVirtualizer.measureElement}
            data-index={virtualRow.index}
        >
            <TableCell padding="checkbox">
                <Checkbox
                    checked={isSelected}
                    onChange={() => onToggleSelect(id)}
                    disabled={metaBusy || loading}
                />
            </TableCell>
            <TableCell>{id}</TableCell>
            <TableCell>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: metaExpanded ? 1 : 0,
                        overflowX: metaExpanded ? 'auto' : 'visible',
                        py: metaExpanded ? 0.5 : 0,
                    }}
                >
                    {visibleImages.map((img, idx) => {
                        const originalIndex = idx;
                        return (
                            <Box
                                key={`meta-img-${id}-${originalIndex}`}
                                sx={{
                                    width: metaExpanded ? 180 : 250,
                                    height: metaExpanded ? 180 : 250,
                                    position: 'relative',
                                    borderRadius: 1.5,
                                    border: '2px solid #1e293b',
                                    cursor: 'pointer',
                                    ml: metaExpanded ? 0 : idx > 0 ? -20 : 0,
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    zIndex: Math.max(1, 30 - idx),
                                    transition: 'transform 0.2s, z-index 0.2s',
                                    '&:hover': {
                                        transform: 'scale(1.12)',
                                        zIndex: 80,
                                    },
                                    '&:hover .meta-image-actions': {
                                        opacity: 1,
                                    },
                                }}
                            >
                                <Box
                                    component="img"
                                    src={imgUrl(img)}
                                    alt={`asset-${id}-${originalIndex + 1}`}
                                    onClick={() => onOpenImagePreview(imgUrl(img))}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block',
                                    }}
                                />

                                <Box
                                    className="meta-image-actions"
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        p: 0.5,
                                        opacity: 0,
                                        transition: 'opacity 0.18s ease',
                                        background:
                                            'linear-gradient(to bottom, rgba(2,6,23,0.45), rgba(2,6,23,0.08) 45%, rgba(2,6,23,0.45))',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Chip
                                            size="small"
                                            label={
                                                originalIndex === 0
                                                    ? 'Primera'
                                                    : `#${originalIndex + 1}`
                                            }
                                            color={
                                                originalIndex === 0
                                                    ? 'success'
                                                    : 'default'
                                            }
                                            sx={{
                                                height: 22,
                                                '& .MuiChip-label': {
                                                    px: 0.8,
                                                    fontSize: 11,
                                                },
                                            }}
                                        />

                                        <Tooltip title="Poner de primera">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void onSetFirstImage(
                                                            id,
                                                            originalIndex,
                                                        );
                                                    }}
                                                    disabled={
                                                        metaBusy ||
                                                        loading ||
                                                        originalIndex === 0
                                                    }
                                                    sx={{
                                                        bgcolor:
                                                            'rgba(2,6,23,0.68)',
                                                        color: '#fff',
                                                        '&:hover': {
                                                            bgcolor:
                                                                'rgba(15,23,42,0.9)',
                                                        },
                                                    }}
                                                >
                                                    <VerticalAlignTopIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>

                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                        }}
                                    >
                                        <Tooltip title="Eliminar imagen">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        void onDeleteImage(
                                                            id,
                                                            originalIndex,
                                                        );
                                                    }}
                                                    disabled={loading}
                                                    sx={{
                                                        bgcolor:
                                                            'rgba(127,29,29,0.78)',
                                                        color: '#fff',
                                                        '&:hover': {
                                                            bgcolor:
                                                                'rgba(153,27,27,0.95)',
                                                        },
                                                    }}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}

                    {rowImages.length > 3 && (
                        <Stack
                            spacing={0.5}
                            alignItems="center"
                            sx={{ ml: 1, flexShrink: 0 }}
                        >
                            <Tooltip
                                title={
                                    metaExpanded
                                        ? 'Mostrar solo 3'
                                        : `Mostrar todas (${rowImages.length})`
                                }
                            >
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={() =>
                                            onToggleExpandedImages(id)
                                        }
                                        disabled={loading}
                                        sx={{
                                            bgcolor: 'rgba(15,23,42,0.72)',
                                            color: '#fff',
                                            '&:hover': {
                                                bgcolor:
                                                    'rgba(30,41,59,0.95)',
                                            },
                                        }}
                                    >
                                        {metaExpanded ? (
                                            <UnfoldLessIcon fontSize="small" />
                                        ) : (
                                            <UnfoldMoreIcon fontSize="small" />
                                        )}
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                {metaExpanded
                                    ? `${rowImages.length}`
                                    : `+${rowImages.length - 3}`}
                            </Typography>
                        </Stack>
                    )}

                    {!rowImages.length && (
                        <Box
                            sx={{
                                width: 250,
                                height: 250,
                                borderRadius: 1.5,
                                display: 'grid',
                                placeItems: 'center',
                                bgcolor: 'rgba(120,120,120,0.15)',
                                border: '1px dashed rgba(120,120,120,0.3)',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                N/A
                            </Typography>
                        </Box>
                    )}
                </Box>
            </TableCell>
            <TableCell>
                <Stack spacing={1} sx={{ width: '100%' }}>
                    <TextField
                        size="small"
                        fullWidth
                        value={draft.title}
                        placeholder="Nombre ES"
                        onChange={(e) =>
                            onUpdateDraft(id, {
                                title: e.target.value,
                            })
                        }
                        disabled={metaBusy || loading}
                    />
                    <TextField
                        size="small"
                        fullWidth
                        value={draft.titleEn}
                        placeholder="Name EN"
                        onChange={(e) =>
                            onUpdateDraft(id, {
                                titleEn: e.target.value,
                            })
                        }
                        disabled={metaBusy || loading}
                    />
                </Stack>
            </TableCell>
            <TableCell>
                <Stack
                    spacing={1}
                    sx={{
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={6}
                        value={String(draft.description || '')}
                        placeholder="No hay descripción SEO (ES)."
                        onChange={(e) =>
                            onUpdateDraft(id, {
                                description: e.target.value,
                            })
                        }
                        disabled={metaBusy || loading}
                        sx={{
                            '& .MuiInputBase-root': {
                                alignItems: 'stretch',
                            },
                            '& .MuiInputBase-inputMultiline': {
                                overflow: 'auto !important',
                                resize: 'vertical',
                                minHeight: '40px',
                            },
                        }}
                    />
                    <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={6}
                        value={String(draft.descriptionEn || '')}
                        placeholder="No SEO description available (EN)."
                        onChange={(e) =>
                            onUpdateDraft(id, {
                                descriptionEn: e.target.value,
                            })
                        }
                        disabled={metaBusy || loading}
                        sx={{
                            '& .MuiInputBase-root': {
                                alignItems: 'stretch',
                            },
                            '& .MuiInputBase-inputMultiline': {
                                overflow: 'auto !important',
                                resize: 'vertical',
                                minHeight: '40px',
                            },
                        }}
                    />
                </Stack>
            </TableCell>
            <TableCell>
                <Autocomplete
                    multiple
                    limitTags={4}
                    options={categories}
                    getOptionLabel={(option) => option?.name || option?.slug || ''}
                    value={normalizeMetaCategoryList(draft.categories)}
                    isOptionEqualToValue={(a, b) =>
                        String(a?.slug || '') === String(b?.slug || '')
                    }
                    onChange={(_, value) =>
                        onUpdateDraft(id, {
                            categories: normalizeMetaCategoryList(value),
                        })
                    }
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            size="small"
                            placeholder="Categorías"
                        />
                    )}
                    disabled={metaBusy || loading}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                            const { key, ...tagProps } = getTagProps({ index });
                            return (
                                <Chip
                                    key={key}
                                    label={option.name || option.slug}
                                    size="small"
                                    {...tagProps}
                                    sx={{ m: '2px' }}
                                />
                            );
                        })
                    }
                    sx={{
                        '& .MuiInputBase-root': {
                            maxHeight: 110,
                            minHeight: 110,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'flex-start',
                            alignContent: 'flex-start',
                            p: '4px 34px 4px 4px !important',
                        },
                    }}
                />
            </TableCell>
            <TableCell>
                <Autocomplete
                    multiple
                    freeSolo
                    limitTags={9}
                    options={allTags}
                    getOptionLabel={(option) => {
                        if (typeof option === 'string') return option;
                        return option?.name || option?.slug || '';
                    }}
                    value={normalizeMetaTagList(draft.tags)}
                    isOptionEqualToValue={(a, b) => {
                        const aSlug = String(a?.slug || a?.name || '')
                            .trim()
                            .toLowerCase();
                        const bSlug = String(b?.slug || b?.name || '')
                            .trim()
                            .toLowerCase();
                        return !!aSlug && !!bSlug && aSlug === bSlug;
                    }}
                    onChange={(_, value) =>
                        onUpdateDraft(id, {
                            tags: normalizeMetaTagList(value),
                        })
                    }
                    renderInput={(params) => (
                        <TextField {...params} size="small" placeholder="Tags" />
                    )}
                    disabled={metaBusy || loading}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => {
                            const { key, ...tagProps } = getTagProps({ index });
                            return (
                                <Chip
                                    key={key}
                                    size="small"
                                    label={
                                        option.name ||
                                        option.es ||
                                        option.nameEn ||
                                        option.en ||
                                        option.slug ||
                                        option
                                    }
                                    {...tagProps}
                                    sx={{ m: '2px' }}
                                />
                            );
                        })
                    }
                    sx={{
                        '& .MuiInputBase-root': {
                            maxHeight: 110,
                            minHeight: 110,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'flex-start',
                            alignContent: 'flex-start',
                            p: '4px 34px 4px 4px !important',
                        },
                    }}
                />
            </TableCell>
            <TableCell align="right">
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Perfiles rápidos">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => onOpenProfiles(id)}
                                disabled={metaBusy || loading}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                }}
                            >
                                <AccountTreeIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Generar descripción IA">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => onGenerateSingleDescription(id)}
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

                    <Tooltip title="Guardar fila">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => {
                                    void onSaveRow(id);
                                }}
                                disabled={metaBusy || loading}
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
            </TableCell>
        </TableRow>
    );
}
