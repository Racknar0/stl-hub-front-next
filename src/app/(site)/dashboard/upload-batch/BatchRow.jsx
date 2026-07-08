'use client';

import React, { useState } from 'react';
import {
    TableRow,
    TableCell,
    TextField,
    Box,
    Autocomplete,
    Chip,
    IconButton,
    Avatar,
    Stack,
    Select,
    MenuItem,
    Typography,
    Tooltip,
    CircularProgress,
    Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExplicitIcon from '@mui/icons-material/Explicit';

const BatchRow = React.memo(function BatchRow({
    row,
    idx,
    sequenceLabel = '',
    reviewMode = false,
    isSimilarityFocused = false,
    categoriesCatalog = [],
    tagsCatalog = [],
    cuentas = [],
    distributionAccountIds = [],
    onNombreChange = () => {},
    onNombreEnChange = () => {},
    onDescriptionChange = () => {},
    onDescriptionEnChange = () => {},
    onCategoriasChange = () => {},
    onTagsChange = () => {},
    onCuentaChange = () => {},
    onSaveRow = () => {},
    onQuickAdultos = () => {},
    onGenerateSingleDescription = () => {},
    onOpenCreateModal = () => {},
    onOpenProfiles = () => {},
    onOpenImagePreview = () => {},
    onSetPrimaryImage = () => {},
    onDeleteImage = () => {},
    onOpenSimilar = () => {},
    onRemoverFila = () => {},
    measureElement = null,
    virtualIndex = undefined,
}) {
    const [reviewExpanded, setReviewExpanded] = useState(false);

    const hasAdultos = React.useMemo(() => {
        const isAdultos = (val) => {
            if (!val) return false;
            if (typeof val === 'string') {
                return val.trim().toLowerCase() === 'adultos';
            }
            const fields = [val.slug, val.name, val.es, val.en, val.nameEn];
            return fields.some(f => typeof f === 'string' && f.trim().toLowerCase() === 'adultos');
        };

        const catsList = Array.isArray(row.categorias) ? row.categorias : [];
        const tagsList = Array.isArray(row.tags) ? row.tags : [];

        return catsList.some(isAdultos) || tagsList.some(isAdultos);
    }, [row.categorias, row.tags]);

    const isProcesso = row.estado === 'procesando';
    const isOk = row.estado === 'completado';
    const isError = row.estado === 'error';
    const mainStatus = String(row.mainStatus || 'PENDING').toUpperCase();
    const backupStatus = String(row.backupStatus || 'PENDING').toUpperCase();
    const rowInFlight =
        isProcesso || (isOk && ['PENDING', 'UPLOADING'].includes(backupStatus));

    const activeCuentas = React.useMemo(() => {
        const selectedIds = Array.isArray(distributionAccountIds) ? distributionAccountIds.map(Number) : [];
        let filtered = cuentas;
        if (selectedIds.length > 0) {
            filtered = cuentas.filter(c => selectedIds.includes(Number(c.id)));
        }
        // Asegurar que la cuenta asignada actualmente a la fila esté en las opciones
        const rowAccId = Number(row.cuenta || 0);
        if (rowAccId > 0 && !filtered.some(c => Number(c.id) === rowAccId)) {
            const currentAcc = cuentas.find(c => Number(c.id) === rowAccId);
            if (currentAcc) {
                filtered = [...filtered, currentAcc];
            }
        }
        return filtered;
    }, [cuentas, distributionAccountIds, row.cuenta]);
    const primaryText = '#eef4ff';
    const secondaryText = 'rgba(220,232,255,0.82)';
    const cellBorder = '1px solid rgba(148,163,184,0.24)';
    const reviewThumbSize = 250;
    const hasNoCategories = !Array.isArray(row.categorias) || row.categorias.length === 0;
    const hasNoTags = !Array.isArray(row.tags) || row.tags.length === 0;
    const hasNoDescriptionEs = !row.description || !String(row.description).trim();
    const hasNoDescriptionEn = !row.descriptionEn || !String(row.descriptionEn).trim();
    const hasNoDescription = hasNoDescriptionEs || hasNoDescriptionEn;
    const isMissingMetadata = hasNoCategories || hasNoTags || hasNoDescription;

    const descLengthEs = String(row.description || '').trim().length;
    const descLengthEn = String(row.descriptionEn || '').trim().length;
    const isShortDescription = descLengthEs < 130 || descLengthEn < 130;

    const baseRowBg = isError
        ? 'rgba(239, 68, 68, 0.35)'
        : isOk
          ? 'rgba(22, 163, 74, 0.30)'
          : isMissingMetadata
            ? 'rgba(239, 68, 68, 0.22)'
            : isShortDescription
              ? 'rgba(234, 179, 8, 0.22)'
              : 'rgba(15, 23, 42, 0.38)';
    const focusedBg = 'rgba(8, 145, 178, 0.26)';

    if (reviewMode) {
        return (
            <TableRow
                key={idx}
                ref={measureElement}
                data-index={virtualIndex}
                sx={{
                    backgroundColor: isSimilarityFocused
                        ? `${focusedBg} !important`
                        : `${baseRowBg} !important`,
                    boxShadow: isSimilarityFocused
                        ? 'inset 4px 0 0 rgba(34, 211, 238, 0.95), inset 0 0 0 1px rgba(34, 211, 238, 0.45)'
                        : 'none',
                    transition:
                        'background-color 160ms ease, box-shadow 160ms ease',
                    '&:hover': {
                        backgroundColor: isSimilarityFocused
                            ? `${focusedBg} !important`
                            : `${baseRowBg} !important`,
                    },
                }}
            >
                <TableCell
                    sx={{
                        width: 100,
                        minWidth: 100,
                        borderBottom: cellBorder,
                        color: primaryText,
                        borderLeft: hasAdultos ? '6px solid #ff0000' : '6px solid transparent',
                    }}
                >
                    <Stack direction="column" spacing={1} alignItems="center">
                        <Chip
                            size="small"
                            label={sequenceLabel || '--/--'}
                            sx={{
                                height: 22,
                                fontSize: 15,
                                fontWeight: 800,
                                color: '#082f49',
                                backgroundColor: 'rgba(186,230,253,0.96)',
                                border: '1px solid rgba(56,189,248,0.65)',
                            }}
                        />
                        {Array.isArray(row.imagenes) && row.imagenes.length > 6 && (
                            <Stack alignItems="center" spacing={0.2} sx={{ my: 0.25 }}>
                                <Tooltip title={reviewExpanded ? 'Mostrar solo 6' : `Mostrar todas (${row.imagenes.length})`}>
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={() => setReviewExpanded(!reviewExpanded)}
                                            sx={{
                                                bgcolor: reviewExpanded ? 'rgba(15,23,42,0.72)' : '#ea580c',
                                                color: '#fff',
                                                border: reviewExpanded ? '1px solid rgba(255,255,255,0.15)' : '2px solid #f97316',
                                                borderRadius: 1.5,
                                                boxShadow: reviewExpanded ? 'none' : '0 0 10px #f97316',
                                                animation: reviewExpanded ? 'none' : 'incandescentGlowBatch 1.2s infinite alternate ease-in-out',
                                                '@keyframes incandescentGlowBatch': {
                                                    '0%': {
                                                        boxShadow: '0 0 4px #ea580c, 0 0 8px #f97316, inset 0 0 4px #ea580c',
                                                        borderColor: '#f97316',
                                                        bgcolor: '#c2410c',
                                                    },
                                                    '50%': {
                                                        boxShadow: '0 0 16px #ef4444, 0 0 28px #f59e0b, inset 0 0 8px #ef4444',
                                                        borderColor: '#fbbf24',
                                                        bgcolor: '#ea580c',
                                                    },
                                                    '100%': {
                                                        boxShadow: '0 0 4px #ea580c, 0 0 8px #f97316, inset 0 0 4px #ea580c',
                                                        borderColor: '#f97316',
                                                        bgcolor: '#c2410c',
                                                    }
                                                },
                                                '&:hover': {
                                                    bgcolor: '#ef4444',
                                                    boxShadow: '0 0 20px #ef4444',
                                                    animation: 'none',
                                                },
                                            }}
                                        >
                                            {reviewExpanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        fontSize: '10px',
                                        color: reviewExpanded ? '#7dd3fc' : '#f97316',
                                        fontWeight: 800,
                                        textShadow: reviewExpanded ? 'none' : '0 0 4px rgba(249, 115, 22, 0.4)',
                                        animation: reviewExpanded ? 'none' : 'textPulseBatch 1.2s infinite alternate ease-in-out',
                                        '@keyframes textPulseBatch': {
                                            '0%': { opacity: 0.75 },
                                            '100%': { opacity: 1 }
                                        }
                                    }}
                                >
                                    {reviewExpanded ? `${row.imagenes.length}` : `+${row.imagenes.length - 6}`}
                                </Typography>
                            </Stack>
                        )}
                        <Button
                            size="small"
                            variant="contained"
                            onClick={() => onOpenSimilar?.(row)}
                            sx={{
                                minWidth: 70,
                                px: 1.5,
                                py: 0.4,
                                fontSize: 12,
                                lineHeight: 1.2,
                                whiteSpace: 'nowrap',
                                borderRadius: 6,
                                textTransform: 'none',
                                fontWeight: 600,
                                background:
                                    'linear-gradient(135deg, #00b4d8, #0077b6)',
                                color: '#fff',
                                boxShadow: '0 1px 6px rgba(0,180,216,0.35)',
                                '&:hover': {
                                    background:
                                        'linear-gradient(135deg, #0096c7, #005f8a)',
                                    boxShadow: '0 2px 10px rgba(0,180,216,0.5)',
                                },
                            }}
                        >
                            Similares
                        </Button>

                        <Tooltip title="Guardar fila" placement="right">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => onSaveRow(row.id, true)}
                                    disabled={isOk || isProcesso}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                        color: '#16a34a',
                                        my: 0.1,
                                    }}
                                >
                                    <SaveIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Autogenerar todo con IA" placement="right">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => onGenerateSingleDescription(row.id)}
                                    disabled={isOk || isProcesso}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                        color: '#00b4d8',
                                        my: 0.1,
                                    }}
                                >
                                    <AutoAwesomeIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title={hasAdultos ? "Ya marcado como Adultos" : "Marcar como Adultos"} placement="right">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => onQuickAdultos(row.id)}
                                    disabled={isOk || isProcesso || hasAdultos}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1.5,
                                        color: hasAdultos ? 'text.disabled' : '#eab308',
                                        my: 0.1,
                                    }}
                                >
                                    <ExplicitIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>

                        <Tooltip title="Eliminar borrador">
                            <IconButton
                                color="error"
                                onClick={() => onRemoverFila(row.id)}
                                size="small"
                                sx={{ p: 0.4 }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </TableCell>

                <TableCell
                    sx={{
                        minWidth: 640,
                        width: '100%',
                        borderBottom: cellBorder,
                        color: primaryText,
                        verticalAlign: 'top',
                        py: 0.75,
                    }}
                >
                    <Stack spacing={0.5} sx={{ width: '100%', mt: 0 }}>
                        {/* Name fields */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                width: '100%',
                                bgcolor: 'rgba(15, 23, 42, 0.45)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: 2,
                                p: 0.75,
                                backdropFilter: 'blur(4px)',
                                mb: 0.5,
                            }}
                        >
                            <TextField
                                size="small"
                                fullWidth
                                value={row.nombre}
                                placeholder="Nombre ES"
                                onChange={(e) => onNombreChange(row.id, e.target.value)}
                                onBlur={() => onSaveRow(row.id)}
                                disabled={isOk || isProcesso}
                                sx={{
                                    bgcolor: 'rgba(30, 41, 59, 0.3)',
                                    borderRadius: 1.2,
                                    '& .MuiInputBase-root': {
                                        fontSize: '12px',
                                        color: '#f8fafc',
                                    },
                                }}
                            />
                            <TextField
                                size="small"
                                fullWidth
                                value={row.nombreEn || ''}
                                placeholder="Name EN"
                                onChange={(e) => onNombreEnChange(row.id, e.target.value)}
                                onBlur={() => onSaveRow(row.id)}
                                disabled={isOk || isProcesso}
                                sx={{
                                    bgcolor: 'rgba(30, 41, 59, 0.3)',
                                    borderRadius: 1.2,
                                    '& .MuiInputBase-root': {
                                        fontSize: '12px',
                                        color: '#f8fafc',
                                    },
                                }}
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    fontWeight: 800,
                                    whiteSpace: 'nowrap',
                                    px: 1.2,
                                    py: 0.6,
                                    borderRadius: 1,
                                    bgcolor: 'rgba(30, 41, 59, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    fontSize: '11px',
                                }}
                            >
                                Peso: {(row.pesoMB / 1024).toFixed(2)} GB
                            </Typography>
                        </Box>

                        {/* Images */}
                        <Box
                            sx={{
                                display: reviewExpanded ? 'grid' : 'flex',
                                gridTemplateColumns: reviewExpanded ? 'repeat(auto-fill, minmax(340px, 1fr))' : 'none',
                                alignItems: reviewExpanded ? 'start' : 'center',
                                gap: reviewExpanded ? 1.5 : 0.5,
                                flexWrap: reviewExpanded ? 'wrap' : 'nowrap',
                                overflowX: reviewExpanded ? 'hidden' : 'auto',
                                overflowY: reviewExpanded ? 'auto' : 'hidden',
                                maxHeight: reviewExpanded ? 680 : 'none',
                                pt: 0,
                                pb: 0,
                                position: 'relative',
                                width: '100%',
                            }}
                        >
                            {Array.isArray(row.imagenes) && row.imagenes.length > 0 ? (
                                <>
                                    {(reviewExpanded ? row.imagenes : row.imagenes.slice(0, 6)).map((img, i) => {
                                        const srcUrl = img.startsWith('http')
                                            ? img
                                            : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/uploads/${img.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
                                        const isPrimary = i === 0;
                                        return (
                                            <Box key={i} sx={{
                                                width: reviewExpanded ? 340 : 320,
                                                height: reviewExpanded ? 340 : 320,
                                                position: 'relative',
                                                borderRadius: 1.5,
                                                border: isPrimary ? '3px solid #facc15' : '2px solid rgba(255,255,255,0.15)',
                                                boxShadow: isPrimary ? '0 0 0 2px rgba(250,204,21,0.25)' : 'none',
                                                cursor: 'pointer',
                                                ml: 0,
                                                overflow: 'hidden',
                                                flexShrink: 0,
                                                zIndex: Math.max(1, 30 - i),
                                                transition: 'transform 0.2s, z-index 0.2s',
                                                '&:hover': { transform: 'scale(1.05)', zIndex: 80 },
                                                '&:hover .batch-image-actions': { opacity: 1 },
                                            }}>
                                                <Box component="img" src={srcUrl} alt={`asset-${idx}-${i + 1}`}
                                                    onClick={() => onOpenImagePreview?.(srcUrl)}
                                                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                                />
                                                <Box className="batch-image-actions" onClick={() => onOpenImagePreview?.(srcUrl)} sx={{
                                                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                                                    justifyContent: 'space-between', p: 0.5, opacity: 0, transition: 'opacity 0.18s ease',
                                                    background: 'linear-gradient(to bottom, rgba(2,6,23,0.45), rgba(2,6,23,0.08) 45%, rgba(2,6,23,0.45))',
                                                }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Chip size="small" label={isPrimary ? 'Primera' : `#${i + 1}`}
                                                            color={isPrimary ? 'success' : 'default'}
                                                            sx={{ height: 22, '& .MuiChip-label': { px: 0.8, fontSize: 11 } }}
                                                        />
                                                        <Tooltip title="Poner de primera">
                                                            <span>
                                                                <IconButton size="small"
                                                                    onClick={(e) => { e.stopPropagation(); onSetPrimaryImage?.(row.id, i); }}
                                                                    disabled={isOk || isProcesso || isPrimary}
                                                                    sx={{ bgcolor: 'rgba(2,6,23,0.68)', color: '#fff', '&:hover': { bgcolor: 'rgba(15,23,42,0.9)' } }}
                                                                >
                                                                    <VerticalAlignTopIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <Tooltip title="Eliminar imagen">
                                                            <span>
                                                                <IconButton size="small"
                                                                    onClick={(e) => { e.stopPropagation(); onDeleteImage?.(row.id, i); }}
                                                                    disabled={isOk || isProcesso}
                                                                    sx={{ bgcolor: 'rgba(127,29,29,0.78)', color: '#fff', '&:hover': { bgcolor: 'rgba(153,27,27,0.95)' } }}
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

                                </>
                            ) : (
                                <Box sx={{ width: 320, height: 320, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(120,120,120,0.15)', border: '1px dashed rgba(120,120,120,0.3)' }}>
                                    <Typography variant="caption" color="text.secondary">N/A</Typography>
                                </Box>
                            )}
                        </Box>

                        {/* Categories & Tags stack */}
                        <Stack direction="row" spacing={1} sx={{ width: '100%', mt: 0.75 }}>
                            {/* Categories */}
                            <Box sx={{ flex: 1, minWidth: 0, bgcolor: 'rgba(234, 179, 8, 0.04)', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: 3, p: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Autocomplete
                                        multiple
                                        options={categoriesCatalog}
                                        getOptionLabel={(o) => o.name || o.slug || ''}
                                        value={
                                            Array.isArray(row.categorias)
                                                ? row.categorias
                                                : []
                                        }
                                        disabled={isOk || isProcesso}
                                        onChange={(_, v) => onCategoriasChange(row.id, v)}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => {
                                                const { key, ...tagProps } = getTagProps({
                                                    index,
                                                });
                                                return (
                                                    <Chip
                                                        key={key}
                                                        label={option.name || option.slug}
                                                        size="small"
                                                        {...tagProps}
                                                        sx={{
                                                            color: '#111827',
                                                            backgroundColor: '#d8bb00',
                                                            border: '1px solid rgba(148,163,184,0.52)',
                                                            fontWeight: 400,
                                                            m: '2px',
                                                            '& .MuiChip-label': {
                                                                px: 0.75,
                                                            },
                                                            '& .MuiChip-deleteIcon': {
                                                                color: '#111827',
                                                            },
                                                            '&.Mui-disabled': {
                                                                opacity: 1,
                                                                color: '#111827',
                                                            },
                                                        }}
                                                    />
                                                );
                                            })
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                size="small"
                                                placeholder={
                                                    (Array.isArray(row.categorias)
                                                        ? row.categorias.length
                                                        : 0) === 0
                                                        ? 'Categorías...'
                                                        : ''
                                                }
                                                variant="standard"
                                                InputProps={{ ...params.InputProps, disableUnderline: true }}
                                                sx={{
                                                    '& input': { color: primaryText },
                                                    '& input::placeholder': {
                                                        color: secondaryText,
                                                        opacity: 1,
                                                    },
                                                }}
                                            />
                                        )}
                                        sx={{
                                            flex: 1,
                                            '& .MuiInputBase-root': {
                                                maxHeight: 90,
                                                minHeight: 36,
                                                overflowY: 'auto',
                                                overflowX: 'hidden',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                alignItems: 'flex-start',
                                                alignContent: 'flex-start',
                                                p: '4px 34px 4px 4px !important',
                                            },
                                            '& .MuiSvgIcon-root': { color: primaryText },
                                            '& .MuiChip-root': { opacity: 1 },
                                            '&.Mui-disabled': { opacity: 1 },
                                            '& .MuiInputBase-input.Mui-disabled': {
                                                color: '#e6f4ff',
                                                WebkitTextFillColor: '#e6f4ff',
                                                opacity: 1,
                                            },
                                        }}
                                    />
                                    {!isOk && !isProcesso && (
                                        <IconButton
                                            size="small"
                                            sx={{ ml: 0.5, color: '#4fc3f7' }}
                                            onClick={() => onOpenCreateModal('cat', row.id)}
                                        >
                                            <AddIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>

                            {/* Tags */}
                            <Box sx={{ flex: 1, minWidth: 0, bgcolor: 'rgba(20, 184, 166, 0.04)', border: '1px solid rgba(20, 184, 166, 0.15)', borderRadius: 3, p: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Autocomplete
                                        multiple
                                        freeSolo
                                        options={tagsCatalog}
                                        getOptionLabel={(o) =>
                                            o.name ||
                                            o.es ||
                                            o.nameEn ||
                                            o.en ||
                                            o.slug ||
                                            ''
                                        }
                                        value={Array.isArray(row.tags) ? row.tags : []}
                                        disabled={isOk || isProcesso}
                                        onChange={(_, v) => onTagsChange(row.id, v)}
                                        renderTags={(value, getTagProps) =>
                                            value.map((option, index) => {
                                                const { key, ...tagProps } = getTagProps({
                                                    index,
                                                });
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
                                                        sx={{
                                                            color: '#111827',
                                                            backgroundColor:
                                                                option.iaSuggested
                                                                    ? 'rgba(187,247,208,0.95)'
                                                                    : 'rgba(220,252,231,0.95)',
                                                            border: '1px solid rgba(134,239,172,0.9)',
                                                            fontWeight: 400,
                                                            m: '2px',
                                                            '& .MuiChip-label': {
                                                                px: 0.75,
                                                            },
                                                            '& .MuiChip-deleteIcon': {
                                                                color: '#111827',
                                                            },
                                                            '&.Mui-disabled': {
                                                                opacity: 1,
                                                                color: '#111827',
                                                            },
                                                        }}
                                                    />
                                                );
                                            })
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                size="small"
                                                placeholder={
                                                    (Array.isArray(row.tags)
                                                        ? row.tags.length
                                                        : 0) === 0
                                                        ? '+ IA Tags...'
                                                        : ''
                                                }
                                                variant="standard"
                                                InputProps={{ ...params.InputProps, disableUnderline: true }}
                                                sx={{
                                                    '& input': { color: primaryText },
                                                    '& input::placeholder': {
                                                        color: secondaryText,
                                                        opacity: 1,
                                                    },
                                                }}
                                            />
                                        )}
                                        sx={{
                                            flex: 1,
                                            '& .MuiInputBase-root': {
                                                maxHeight: 90,
                                                minHeight: 36,
                                                overflowY: 'auto',
                                                overflowX: 'hidden',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                alignItems: 'flex-start',
                                                alignContent: 'flex-start',
                                                p: '4px 34px 4px 4px !important',
                                            },
                                            '& .MuiSvgIcon-root': { color: primaryText },
                                            '& .MuiChip-root': { opacity: 1 },
                                            '&.Mui-disabled': { opacity: 1 },
                                            '& .MuiInputBase-input.Mui-disabled': {
                                                color: '#f8e8ff',
                                                WebkitTextFillColor: '#f8e8ff',
                                                opacity: 1,
                                            },
                                        }}
                                    />
                                    {!isOk && !isProcesso && (
                                        <IconButton
                                            size="small"
                                            sx={{ ml: 0.5, color: '#4fc3f7' }}
                                            onClick={() => onOpenCreateModal('tag', row.id)}
                                        >
                                            <AddIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </Box>
                            </Box>
                        </Stack>
                    </Stack>
                </TableCell>

                <TableCell
                    sx={{
                        minWidth: 400,
                        width: 400,
                        maxWidth: 400,
                        borderBottom: cellBorder,
                        color: primaryText,
                        verticalAlign: 'top',
                        py: 0.75,
                    }}
                >
                    <Typography
                        variant="caption"
                        sx={{ display: 'block', color: secondaryText, mb: 0.25 }}
                    >
                        Descripción ES
                    </Typography>
                    <TextField
                        value={row.description || ''}
                        size="small"
                        fullWidth
                        multiline
                        rows={6}
                        onChange={(e) => onDescriptionChange(row.id, e.target.value)}
                        onBlur={() => onSaveRow(row.id)}
                        variant="outlined"
                        disabled={isOk || isProcesso}
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: '12px',
                                color: '#f8fafc',
                                bgcolor: 'rgba(30, 41, 59, 0.3)',
                                borderRadius: 1.2,
                                alignItems: 'stretch',
                            },
                            '& .MuiInputBase-inputMultiline': {
                                overflow: 'auto !important',
                                resize: 'vertical',
                                minHeight: '25px',
                            },
                        }}
                    />

                    <Typography
                        variant="caption"
                        sx={{
                            display: 'block',
                            color: secondaryText,
                            mt: 0.9,
                            mb: 0.25,
                        }}
                    >
                        Description EN
                    </Typography>
                    <TextField
                        value={row.descriptionEn || ''}
                        size="small"
                        fullWidth
                        multiline
                        rows={6}
                        onChange={(e) => onDescriptionEnChange(row.id, e.target.value)}
                        onBlur={() => onSaveRow(row.id)}
                        variant="outlined"
                        disabled={isOk || isProcesso}
                        sx={{
                            '& .MuiInputBase-root': {
                                fontSize: '12px',
                                color: '#f8fafc',
                                bgcolor: 'rgba(30, 41, 59, 0.3)',
                                borderRadius: 1.2,
                                alignItems: 'stretch',
                            },
                            '& .MuiInputBase-inputMultiline': {
                                overflow: 'auto !important',
                                resize: 'vertical',
                                minHeight: '25px',
                            },
                        }}
                    />
                </TableCell>
            </TableRow>
        );
    }

    return (
        <TableRow
            key={idx}
            ref={measureElement}
            data-index={virtualIndex}
            sx={{
                backgroundColor: isSimilarityFocused ? `${focusedBg} !important` : `${baseRowBg} !important`,
                boxShadow: isSimilarityFocused
                    ? 'inset 4px 0 0 rgba(34, 211, 238, 0.95), inset 0 0 0 1px rgba(34, 211, 238, 0.45)'
                    : 'none',
                transition:
                    'background-color 160ms ease, box-shadow 160ms ease',
                '&:hover': {
                    backgroundColor: isSimilarityFocused
                        ? `${focusedBg} !important`
                        : `${baseRowBg} !important`,
                },
            }}
        >
            <TableCell
                sx={{
                    width: 100,
                    minWidth: 100,
                    borderBottom: cellBorder,
                    color: primaryText,
                    borderLeft: hasAdultos ? '6px solid #ff0000' : '6px solid transparent',
                }}
            >
                <Stack direction="column" spacing={1} alignItems="center">
                    <Chip
                        size="medium"
                        label={sequenceLabel || '--/--'}
                        sx={{
                            height: 22,
                            fontSize: 15,
                            fontWeight: 800,
                            color: '#082f49',
                            backgroundColor: 'rgba(186,230,253,0.96)',
                            border: '1px solid rgba(56,189,248,0.65)',
                        }}
                    />
                    <Button
                        size="small"
                        variant="contained"
                        onClick={() => onOpenSimilar?.(row)}
                        sx={{
                            minWidth: 70,
                            px: 1.5,
                            py: 0.4,
                            fontSize: 12,
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            borderRadius: 6,
                            textTransform: 'none',
                            fontWeight: 600,
                            background:
                                'linear-gradient(135deg, #00b4d8, #0077b6)',
                            color: '#fff',
                            boxShadow: '0 1px 6px rgba(0,180,216,0.35)',
                            '&:hover': {
                                background:
                                    'linear-gradient(135deg, #0096c7, #005f8a)',
                                boxShadow: '0 2px 10px rgba(0,180,216,0.5)',
                            },
                        }}
                    >
                        Similares
                    </Button>
                    {isSimilarityFocused && (
                        <Chip
                            size="small"
                            label="✦ En foco"
                            sx={{
                                height: 18,
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#083344',
                                backgroundColor: 'rgba(165,243,252,0.95)',
                                border: '1px solid rgba(34,211,238,0.9)',
                            }}
                        />
                    )}

                    <Tooltip title="Guardar fila" placement="right">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => onSaveRow(row.id, true)}
                                disabled={isOk || isProcesso}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    color: '#16a34a',
                                    my: 0.1,
                                }}
                            >
                                <SaveIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Autogenerar todo con IA" placement="right">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => onGenerateSingleDescription(row.id)}
                                disabled={isOk || isProcesso}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    color: '#00b4d8',
                                    my: 0.1,
                                }}
                            >
                                <AutoAwesomeIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title={hasAdultos ? "Ya marcado como Adultos" : "Marcar como Adultos"} placement="right">
                        <span>
                            <IconButton
                                size="small"
                                onClick={() => onQuickAdultos(row.id)}
                                disabled={isOk || isProcesso || hasAdultos}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    color: hasAdultos ? 'text.disabled' : '#eab308',
                                    my: 0.1,
                                }}
                            >
                                <ExplicitIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    <Tooltip title="Eliminar borrador">
                        <IconButton
                            color="error"
                            onClick={() => onRemoverFila(row.id)}
                            size="small"
                            sx={{ p: 0.4 }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </TableCell>

            {/* Asset */}
            <TableCell
                sx={{
                    minWidth: 450,
                    borderBottom: cellBorder,
                    color: primaryText,
                }}
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    <Stack
                        direction="row"
                        spacing={-10}
                        sx={{ mr: 1, '&:hover .MuiAvatar-root': { zIndex: 1 } }}
                    >
                        {Array.isArray(row.imagenes) &&
                        row.imagenes.length > 0 ? (
                            row.imagenes.slice(0, 3).map((img, i) => {
                                const srcUrl = img.startsWith('http')
                                    ? img
                                    : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/uploads/${img.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
                                return (
                                    <Avatar
                                        key={i}
                                        src={srcUrl}
                                        variant="rounded"
                                        imgProps={{ loading: 'lazy' }}
                                        sx={{
                                            width: 200,
                                            height: 200,
                                            border: '2px solid rgba(255,255,255,0.15)',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s',
                                            '&:hover': {
                                                transform: 'scale(1.12)',
                                                zIndex: 10,
                                            },
                                            '& .MuiAvatar-img': {
                                                objectFit: 'cover',
                                            },
                                        }}
                                        onClick={() =>
                                            onOpenImagePreview?.(srcUrl)
                                        }
                                    />
                                );
                            })
                        ) : (
                            <Avatar
                                sx={{
                                    width: 200,
                                    height: 200,
                                    border: '2px solid rgba(255,255,255,0.1)',
                                }}
                                variant="rounded"
                            />
                        )}
                    </Stack>
                    <Box flex={1}>
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                color: secondaryText,
                                mb: 0.25,
                            }}
                        >
                            Nombre ES
                        </Typography>
                        <TextField
                            value={row.nombre}
                            size="small"
                            onChange={(e) =>
                                onNombreChange(row.id, e.target.value)
                            }
                            onBlur={() => onSaveRow(row.id)}
                            variant="standard"
                            fullWidth
                            InputProps={{
                                disableUnderline: isOk || isProcesso,
                                sx: { color: '#fff' },
                            }}
                            sx={{
                                '& input': {
                                    color: primaryText,
                                    fontWeight: 500,
                                },
                                '& input::placeholder': {
                                    color: secondaryText,
                                    opacity: 1,
                                },
                                '& .MuiInputBase-input.Mui-disabled': {
                                    color: '#f8fbff',
                                    WebkitTextFillColor: '#f8fbff',
                                    opacity: 1,
                                },
                            }}
                            disabled={isOk || isProcesso}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                color: secondaryText,
                                mt: 0.6,
                                mb: 0.25,
                            }}
                        >
                            Name EN
                        </Typography>
                        <TextField
                            value={row.nombreEn || ''}
                            size="small"
                            onChange={(e) =>
                                onNombreEnChange(row.id, e.target.value)
                            }
                            onBlur={() => onSaveRow(row.id)}
                            variant="standard"
                            fullWidth
                            InputProps={{
                                disableUnderline: isOk || isProcesso,
                                sx: { color: '#fff' },
                            }}
                            sx={{
                                '& input': {
                                    color: primaryText,
                                    fontWeight: 500,
                                },
                                '& input::placeholder': {
                                    color: secondaryText,
                                    opacity: 1,
                                },
                                '& .MuiInputBase-input.Mui-disabled': {
                                    color: '#f8fbff',
                                    WebkitTextFillColor: '#f8fbff',
                                    opacity: 1,
                                },
                            }}
                            disabled={isOk || isProcesso}
                        />
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                color: secondaryText,
                                mt: 0.6,
                                mb: 0.25,
                            }}
                        >
                            Categorías
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Autocomplete
                                multiple
                                options={categoriesCatalog}
                                getOptionLabel={(o) => o.name || o.slug || ''}
                                value={row.categorias}
                                disabled={isOk || isProcesso}
                                onChange={(_, v) => onCategoriasChange(row.id, v)}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const { key, ...tagProps } =
                                            getTagProps({ index });
                                        return (
                                            <Chip
                                                key={key}
                                                label={
                                                    option.name || option.slug
                                                }
                                                size="small"
                                                {...tagProps}
                                                sx={{
                                                    height: 22,
                                                    bgcolor: 'rgba(234, 179, 8, 0.16)',
                                                    border: '1px solid rgba(234, 179, 8, 0.35)',
                                                    color: '#fef08a',
                                                    '& .MuiChip-label': {
                                                        fontSize: 11,
                                                        px: 0.8,
                                                    },
                                                    '& .MuiChip-deleteIcon': {
                                                        color: '#facc15',
                                                        fontSize: 14,
                                                        '&:hover': {
                                                            color: '#f43f5e',
                                                        },
                                                    },
                                                }}
                                            />
                                        );
                                    })
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        placeholder="Categorías (Escribe para buscar)"
                                        size="small"
                                        variant="standard"
                                        sx={{
                                            '& .MuiInput-underline:before': {
                                                display: 'none',
                                            },
                                            '& .MuiInput-underline:after': {
                                                display: 'none',
                                            },
                                            '& .MuiInputBase-input': {
                                                fontSize: '11px',
                                                color: secondaryText,
                                                opacity: 1,
                                            },
                                        }}
                                    />
                                )}
                                sx={{
                                    flex: 1,
                                    '& .MuiInputBase-root': {
                                        maxHeight: 90,
                                        minHeight: 36,
                                        overflowY: 'auto',
                                        overflowX: 'hidden',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'flex-start',
                                        alignContent: 'flex-start',
                                        p: '4px 34px 4px 4px !important',
                                    },
                                    '& .MuiSvgIcon-root': {
                                        color: primaryText,
                                    },
                                    '& .MuiChip-root': { opacity: 1 },
                                    '&.Mui-disabled': { opacity: 1 },
                                    '& .MuiInputBase-input.Mui-disabled': {
                                        color: '#e6f4ff',
                                        WebkitTextFillColor: '#e6f4ff',
                                        opacity: 1,
                                    },
                                }}
                            />
                            {!isOk && !isProcesso && (
                                <IconButton
                                    size="small"
                                    sx={{ ml: 0.5, color: '#4fc3f7' }}
                                    onClick={() =>
                                        onOpenCreateModal('cat', row.id)
                                    }
                                >
                                    <AddIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                color: secondaryText,
                                mt: 0.6,
                                mb: 0.25,
                            }}
                        >
                            Tags
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Autocomplete
                                multiple
                                freeSolo
                                options={tagsCatalog}
                                getOptionLabel={(o) =>
                                    o.name ||
                                    o.es ||
                                    o.nameEn ||
                                    o.en ||
                                    o.slug ||
                                    ''
                                }
                                value={row.tags}
                                disabled={isOk || isProcesso}
                                onChange={(_, v) => onTagsChange(row.id, v)}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => {
                                        const { key, ...tagProps } =
                                            getTagProps({ index });
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
                                                sx={{
                                                    color: '#111827',
                                                    backgroundColor:
                                                        option.iaSuggested
                                                            ? 'rgba(187,247,208,0.95)'
                                                            : 'rgba(220,252,231,0.95)',
                                                    border: '1px solid rgba(134,239,172,0.9)',
                                                    fontWeight: 400,
                                                    '& .MuiChip-label': {
                                                        px: 0.75,
                                                    },
                                                    '& .MuiChip-deleteIcon': {
                                                        color: '#111827',
                                                    },
                                                    '&.Mui-disabled': {
                                                        opacity: 1,
                                                        color: '#111827',
                                                    },
                                                }}
                                            />
                                        );
                                    })
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        size="small"
                                        placeholder={
                                            row.tags.length === 0
                                                ? '+ Inteligencia Artificial (Tags)'
                                                : ''
                                        }
                                        variant="standard"
                                        sx={{
                                            '& input': { color: primaryText },
                                            '& input::placeholder': {
                                                color: secondaryText,
                                                opacity: 1,
                                            },
                                        }}
                                    />
                                )}
                                sx={{
                                    flex: 1,
                                    '& .MuiInputBase-root': {
                                        maxHeight: 60,
                                        minHeight: 60,
                                        overflowY: 'auto',
                                        overflowX: 'hidden',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'flex-start',
                                        alignContent: 'flex-start',
                                        p: '4px 34px 4px 4px !important',
                                    },
                                    '& .MuiSvgIcon-root': {
                                        color: primaryText,
                                    },
                                    '& .MuiChip-root': { opacity: 1 },
                                    '&.Mui-disabled': { opacity: 1 },
                                    '& .MuiInputBase-input.Mui-disabled': {
                                        color: '#f8e8ff',
                                        WebkitTextFillColor: '#f8e8ff',
                                        opacity: 1,
                                    },
                                }}
                            />
                            {!isOk && !isProcesso && (
                                <IconButton
                                    size="small"
                                    sx={{ ml: 0.5, color: '#4fc3f7' }}
                                    onClick={() =>
                                        onOpenCreateModal('tag', row.id)
                                    }
                                >
                                    <AddIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                mt: 1,
                                color: secondaryText,
                            }}
                        >
                            Peso: {(row.pesoMB / 1024).toFixed(2)} GB
                        </Typography>
                    </Box>
                </Stack>
            </TableCell>
            <TableCell
                sx={{
                    minWidth: 320,
                    borderBottom: cellBorder,
                    color: primaryText,
                }}
            >
                <Typography
                    variant="caption"
                    sx={{ display: 'block', color: secondaryText, mb: 0.25 }}
                >
                    Descripción ES
                </Typography>
                <TextField
                    value={row.description || ''}
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={4}
                    onChange={(e) => onDescriptionChange(row.id, e.target.value)}
                    onBlur={() => onSaveRow(row.id)}
                    variant="standard"
                    InputProps={{
                        disableUnderline: isOk || isProcesso,
                        sx: { color: '#fff' },
                    }}
                    sx={{
                        '& textarea': {
                            color: primaryText,
                            lineHeight: 1.3,
                            maxHeight: '5.2em',
                            overflowY: 'auto !important',
                        },
                        '& textarea::placeholder': {
                            color: secondaryText,
                            opacity: 1,
                        },
                        '& .MuiInputBase-input.Mui-disabled': {
                            color: '#f8fbff',
                            WebkitTextFillColor: '#f8fbff',
                            opacity: 1,
                        },
                    }}
                    disabled={isOk || isProcesso}
                />

                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        color: secondaryText,
                        mt: 0.9,
                        mb: 0.25,
                    }}
                >
                    Description EN
                </Typography>
                <TextField
                    value={row.descriptionEn || ''}
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    maxRows={4}
                    onChange={(e) => onDescriptionEnChange(row.id, e.target.value)}
                    onBlur={() => onSaveRow(row.id)}
                    variant="standard"
                    InputProps={{
                        disableUnderline: isOk || isProcesso,
                        sx: { color: '#fff' },
                    }}
                    sx={{
                        '& textarea': {
                            color: primaryText,
                            lineHeight: 1.3,
                            maxHeight: '5.2em',
                            overflowY: 'auto !important',
                        },
                        '& textarea::placeholder': {
                            color: secondaryText,
                            opacity: 1,
                        },
                        '& .MuiInputBase-input.Mui-disabled': {
                            color: '#f8fbff',
                            WebkitTextFillColor: '#f8fbff',
                            opacity: 1,
                        },
                    }}
                    disabled={isOk || isProcesso}
                />
            </TableCell>
            <TableCell sx={{ borderBottom: cellBorder, color: primaryText }}>
                <Stack spacing={1} alignItems="flex-start">
                    <Select
                        value={row.cuenta || ''}
                        displayEmpty
                        renderValue={(value) => {
                            if (!value) {
                                return <span style={{ color: '#94a3b8' }}>Sin asignar</span>;
                            }
                            const selectedAcc = cuentas.find(c => String(c.id) === String(value));
                            return selectedAcc ? selectedAcc.alias : 'Cuenta...';
                        }}
                        onChange={(e) => onCuentaChange(row.id, e.target.value)}
                        size="small"
                        variant="outlined"
                        fullWidth
                        sx={{
                            minWidth: 120,
                            bgcolor: 'rgba(51, 65, 85, 0.65)',
                            color: primaryText,
                            borderRadius: 1,
                            '& .MuiSelect-icon': { color: primaryText },
                            '& .MuiSelect-select': {
                                color: '#f8fbff',
                                fontWeight: 700,
                            },
                            '& .MuiSelect-select.Mui-disabled': {
                                color: '#f8fbff',
                                WebkitTextFillColor: '#f8fbff',
                                opacity: 1,
                            },
                        }}
                        disabled={isOk || isProcesso}
                    >
                        <MenuItem value="" sx={{ color: '#94a3b8' }}>
                            <em>Desasignar cuenta</em>
                        </MenuItem>
                        {activeCuentas.map((c) => (
                            <MenuItem
                                key={c.id}
                                value={c.id}
                                sx={{
                                    color: '#e2e8f0',
                                    bgcolor: '#0f172a',
                                    fontWeight: 700,
                                }}
                            >
                                {c.alias}
                            </MenuItem>
                        ))}
                    </Select>
                    <Button
                        variant="outlined"
                        size="small"
                        color="secondary"
                        onClick={() => onOpenProfiles(row.id)}
                        disabled={isOk || isProcesso}
                        fullWidth
                        sx={{
                            textTransform: 'none',
                            borderRadius: 1,
                            minWidth: 90,
                            color: '#f5e8ff',
                            borderColor: 'rgba(221, 214, 254, 0.7)',
                            backgroundColor: 'rgba(109, 40, 217, 0.28)',
                            fontWeight: 700,
                        }}
                    >
                        {row.perfiles || 'Perfiles'}
                    </Button>
                </Stack>
            </TableCell>

            {/* ─── Main & Backup Status ─── */}
            <TableCell
                align="center"
                sx={{ borderBottom: cellBorder, color: primaryText }}
            >
                <Stack spacing={0.5} alignItems="center">
                    {/* Main */}
                    {(() => {
                        const s = mainStatus;
                        if (s === 'OK')
                            return (
                                <Chip
                                    label="M: ✅ OK"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(22,163,74,0.35)',
                                        color: '#dcfce7',
                                        border: '1px solid rgba(134,239,172,0.7)',
                                        fontWeight: 700,
                                        fontSize: 10,
                                        height: 20,
                                    }}
                                />
                            );
                        if (s === 'UPLOADING')
                            return (
                                <Chip
                                    label={`M: ⬆️ ${row.mainProgress || 0}%`}
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(14,165,233,0.35)',
                                        color: '#e0f2fe',
                                        border: '1px solid rgba(125,211,252,0.72)',
                                        fontWeight: 700,
                                        fontSize: 10,
                                        height: 20,
                                    }}
                                />
                            );
                        if (s === 'EXTRACTING')
                            return (
                                <Chip
                                    label="M: 🔓 Extray"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(245,158,11,0.33)',
                                        color: '#fff7ed',
                                        border: '1px solid rgba(253,186,116,0.75)',
                                        fontWeight: 700,
                                        fontSize: 10,
                                        height: 20,
                                    }}
                                />
                            );
                        if (s === 'COMPRESSING')
                            return (
                                <Chip
                                    label="M: 📦 Compri"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(249,115,22,0.33)',
                                        color: '#fff7ed',
                                        border: '1px solid rgba(251,146,60,0.75)',
                                        fontWeight: 700,
                                        fontSize: 10,
                                        height: 20,
                                    }}
                                />
                            );
                        if (s === 'ERROR')
                            return (
                                <Chip
                                    label="M: ❌ Error"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(239,68,68,0.35)',
                                        color: '#fee2e2',
                                        border: '1px solid rgba(252,165,165,0.72)',
                                        fontWeight: 700,
                                        fontSize: 10,
                                        height: 20,
                                    }}
                                />
                            );
                        return (
                            <Chip
                                label="M: ⏳"
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(100,116,139,0.32)',
                                    color: '#e2e8f0',
                                    border: '1px solid rgba(148,163,184,0.68)',
                                    fontSize: 10,
                                    height: 20,
                                }}
                            />
                        );
                    })()}

                    {/* Backup */}
                    {(() => {
                        const s = backupStatus;
                        if (s === 'OK')
                            return (
                                <Chip
                                    label="B: ✅ OK"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(22,163,74,0.35)',
                                        color: '#dcfce7',
                                        border: '1px solid rgba(134,239,172,0.7)',
                                        fontWeight: 700,
                                        fontSize: 10,
                                        height: 20,
                                    }}
                                />
                            );
                        if (s === 'UPLOADING')
                            return (
                                <Chip
                                    label="B: ⬆️ Sub"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(14,165,233,0.35)',
                                        color: '#e0f2fe',
                                        border: '1px solid rgba(125,211,252,0.72)',
                                        fontWeight: 700,
                                        fontSize: 10,
                                        height: 20,
                                    }}
                                />
                            );
                        if (s === 'N/A')
                            return (
                                <Chip
                                    label="B: — N/A"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(100,116,139,0.32)',
                                        color: '#e2e8f0',
                                        border: '1px solid rgba(148,163,184,0.68)',
                                        fontSize: 10,
                                        height: 20,
                                    }}
                                />
                            );
                        if (s === 'ERROR')
                            return (
                                <Chip
                                    label="B: ❌ Error"
                                    size="small"
                                    sx={{
                                        bgcolor: 'rgba(239,68,68,0.35)',
                                        color: '#fee2e2',
                                        border: '1px solid rgba(252,165,165,0.72)',
                                        fontWeight: 700,
                                        fontSize: 10,
                                        height: 20,
                                    }}
                                />
                            );
                        return (
                            <Chip
                                label="B: ⏳"
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(100,116,139,0.32)',
                                    color: '#e2e8f0',
                                    border: '1px solid rgba(148,163,184,0.68)',
                                    fontSize: 10,
                                    height: 20,
                                }}
                            />
                        );
                    })()}
                </Stack>
            </TableCell>
            <TableCell
                align="center"
                sx={{ borderBottom: cellBorder, color: primaryText }}
            >
                {rowInFlight && (
                    <Box component="span" sx={{ fontSize: 18 }}>
                        ⏳
                    </Box>
                )}
                {isOk && <CheckCircleOutlineIcon color="success" />}
                {isError && (
                    <Tooltip title="Fallo al subir a MEGA">
                        <ErrorOutlineIcon color="error" />
                    </Tooltip>
                )}
                {row.estado === 'borrador' && (
                    <Typography variant="caption" sx={{ color: secondaryText }}>
                        Borrador
                    </Typography>
                )}
            </TableCell>
        </TableRow>
    );
});

export default BatchRow;

