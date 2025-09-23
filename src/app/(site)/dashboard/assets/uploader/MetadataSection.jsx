import React, { useEffect, useState } from 'react';
import {
    Card,
    CardHeader,
    CardContent,
    Stack,
    TextField,
    FormControlLabel,
    Autocomplete,
    Chip,
    Switch,
    IconButton,
    Tooltip,
    Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HttpService from '@/services/HttpService';
import { successAlert, errorAlert, confirmAlert } from '@/helpers/alerts';

const http = new HttpService();

export default function MetadataSection({
    title,
    setTitle,
    titleEn,
    setTitleEn,
    selectedCategories,
    setSelectedCategories,
    tags,
    setTags,
    isPremium,
    setIsPremium,
    disabled = false,
    errors = {},
}) {
    const [categories, setCategories] = useState([]);
    const [allTags, setAllTags] = useState([]);
    const [newCat, setNewCat] = useState('');
    const [newCatEn, setNewCatEn] = useState('');
    const [newTag, setNewTag] = useState('');
    const [newTagEn, setNewTagEn] = useState('');
    const [loading, setLoading] = useState(false);

    const slugify = (s) =>
        String(s || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9-\s_]+/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80);

    const fetchMeta = async () => {
        try {
            setLoading(true);
            const [cats, tgs] = await Promise.all([
                http.getData('/categories'),
                http.getData('/tags'),
            ]);
            setCategories(
                (cats.data?.items || []).map((c) => ({
                    id: c.id,
                    name: c.name,
                    slug: c.slug,
                    nameEn: c.nameEn,
                    slugEn: c.slugEn,
                }))
            );
            // catálogo de tags: mostrar por name, pero conservamos también el slug
            setAllTags(
                (tgs.data?.items || []).map((t) => ({
                    name: t.name,
                    slug: t.slug,
                }))
            );
        } catch (e) {
            console.error('fetch meta error', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMeta();
    }, []);

    const quickCreateCategory = async () => {
        const name = newCat.trim();
        const nameEn = newCatEn.trim();
        if (!name || !nameEn) return; // EN obligatorio
        const ok = await confirmAlert(
            'Crear categoría',
            `¿Crear la categoría "${name}" / "${nameEn}"?`,
            'Sí, crear',
            'Cancelar',
            'question'
        );
        if (!ok) return;
        try {
            const nameLc = name.toLowerCase();
            const nameEnLc = nameEn.toLowerCase();
            const body = {
                name: nameLc,
                slug: slugify(nameLc),
                nameEn: nameEnLc,
                slugEn: slugify(nameEnLc),
            };
            const res = await http.postData('/categories', body);
            const c = res.data;
            const normalized = {
                id: c.id,
                name: String(c.name || nameLc).toLowerCase(),
                slug: String(c.slug || body.slug).toLowerCase(),
                nameEn: String(c.nameEn || nameEnLc).toLowerCase(),
                slugEn: String(c.slugEn || body.slugEn).toLowerCase(),
            };
            const list = [...categories, normalized].sort((a, b) =>
                a.name.localeCompare(b.name)
            );
            setCategories(list);
            setSelectedCategories([...(selectedCategories || []), normalized]);
            setNewCat('');
            setNewCatEn('');
            await successAlert('Creada', 'La categoría fue creada');
        } catch (e) {
            console.error('create category failed', e);
            await errorAlert('Error', 'No se pudo crear la categoría');
        }
    };

    const quickCreateTag = async () => {
        const name = newTag.trim();
        const nameEn = newTagEn.trim();
        if (!name || !nameEn) return; // EN obligatorio
        const ok = await confirmAlert(
            'Crear tag',
            `¿Crear el tag "${name}" / "${nameEn}"?`,
            'Sí, crear',
            'Cancelar',
            'question'
        );
        if (!ok) return;
        try {
            const nameLc = name.toLowerCase();
            const nameEnLc = nameEn.toLowerCase();
            const body = {
                name: nameLc,
                slug: slugify(nameLc),
                nameEn: nameEnLc,
                slugEn: slugify(nameEnLc),
            };
            const res = await http.postData('/tags', body);
            const t = res.data;
            const newOpt = {
                name: String(t.name || nameLc).toLowerCase(),
                slug: String(t.slug || body.slug).toLowerCase(),
            };
            const list = [...allTags, newOpt].sort((a, b) =>
                (a.name || a.slug).localeCompare(b.name || b.slug)
            );
            setAllTags(list);
            // añadir el slug al form
            setTags((prev) =>
                Array.from(new Set([...(prev || []), newOpt.slug]))
            );
            setNewTag('');
            setNewTagEn('');
            await successAlert('Creado', 'El tag fue creado');
        } catch (e) {
            console.error('create tag failed', e);
            await errorAlert('Error', 'No se pudo crear el tag');
        }
    };

    // Estilo base: permitir que crezca con chips y un poco más alto
    const inputSx = {
        '& .MuiOutlinedInput-root': {
            minHeight: 48,
            alignItems: 'flex-start',
            pt: 0.5,
            pb: 0.5,
        },
        '& .MuiInputBase-input': { py: 1, px: 1.5 },
    };

    return (
        <Card className="glass" sx={{ opacity: disabled ? 0.6 : 1 }}>
            <CardHeader title="Metadatos" />
            <CardContent>
                <Stack spacing={2}>
                    <TextField
                        label="Nombre del stl (ES)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                        disabled={disabled}
                        required
                        size="small"
                        sx={inputSx}
                        error={!!errors?.title}
                    />
                    <TextField
                        label="Nombre del stl (EN)"
                        value={titleEn}
                        onChange={(e) => setTitleEn(e.target.value)}
                        fullWidth
                        disabled={disabled}
                        required
                        size="small"
                        sx={inputSx}
                        error={!!errors?.titleEn}
                    />

                    {/* Categorías: selector 100% + creador rápido 25%/25% */}
                    <Stack spacing={1}>
                        <Autocomplete
                            multiple
                            disableCloseOnSelect
                            fullWidth
                            options={categories}
                            loading={loading}
                            getOptionLabel={(o) => o?.name || ''}
                            isOptionEqualToValue={(o, v) => o.id === v.id}
                            value={selectedCategories || []}
                            onChange={(_, v) => setSelectedCategories(v)}
                            disabled={disabled}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        variant="outlined"
                                        label={option.name}
                                        {...getTagProps({ index })}
                                        key={`${option.slug}-${index}`}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    size="small"
                                    label="Categorías"
                                    placeholder="Selecciona categorías"
                                    disabled={disabled}
                                    required
                                    sx={inputSx}
                                    error={!!errors?.categories}
                                />
                            )}
                        />

                        {/* Crear rápida (ES / EN obligatorio) */}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1,
                                alignItems: 'stretch',
                                flexWrap: 'wrap',
                            }}
                        >
                            <TextField
                                size="small"
                                placeholder="Nueva categoría (ES)"
                                value={newCat}
                                onChange={(e) => setNewCat(e.target.value)}
                                disabled={disabled}
                                sx={{
                                    ...inputSx,
                                    flex: '0 0 25%',
                                    minWidth: 220,
                                }}
                                required
                            />
                            <TextField
                                size="small"
                                placeholder="Nombre (EN)"
                                value={newCatEn}
                                onChange={(e) => setNewCatEn(e.target.value)}
                                disabled={disabled}
                                sx={{
                                    ...inputSx,
                                    flex: '0 0 25%',
                                    minWidth: 220,
                                }}
                                required
                            />
                            <Tooltip title="Crear categoría">
                                <span>
                                    <IconButton
                                        color="primary"
                                        size="small"
                                        onClick={quickCreateCategory}
                                        disabled={
                                            disabled ||
                                            !newCat.trim() ||
                                            !newCatEn.trim()
                                        }
                                        sx={{ height: 40, width: 40 }}
                                    >
                                        <AddIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    </Stack>

                    {/* Tags: selector 100% + creador rápido 25%/25% */}
                    <Stack spacing={1}>
                        <Autocomplete
                            multiple
                            freeSolo
                            disableCloseOnSelect
                            fullWidth
                            disabled={disabled}
                            options={allTags}
                            getOptionLabel={(o) =>
                                typeof o === 'string'
                                    ? o
                                    : o?.name || o?.slug || ''
                            }
                            filterSelectedOptions
                            value={tags || []}
                            onChange={(_, v) => {
                                // Normalizamos a slugs en minúscula
                                const normalized = Array.from(
                                    new Set(
                                        (v || [])
                                            .map((item) => {
                                                if (typeof item === 'string')
                                                    return slugify(item);
                                                return slugify(
                                                    item.slug || item.name
                                                );
                                            })
                                            .filter(Boolean)
                                    )
                                );
                                setTags(normalized);
                            }}
                            isOptionEqualToValue={(o, v) =>
                                typeof v === 'string'
                                    ? o.slug === v || o.name === v
                                    : o.slug === v.slug
                            }
                            slotProps={{
                                popper: { sx: { zIndex: 2000 } },
                                paper: { sx: { zIndex: 2000 } },
                            }}
                            renderTags={(value, getTagProps) =>
                                (value || []).map((option, index) => (
                                    <Chip
                                        variant="outlined"
                                        label={
                                            typeof option === 'string'
                                                ? option
                                                : option?.name || option?.slug
                                        }
                                        {...getTagProps({ index })}
                                        key={
                                            (typeof option === 'string'
                                                ? option
                                                : option.slug) + index
                                        }
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    size="small"
                                    label="Tags"
                                    placeholder="Añadir tag"
                                    disabled={disabled}
                                    sx={inputSx}
                                    error={!!errors?.tags}
                                />
                            )}
                        />

                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1,
                                alignItems: 'stretch',
                                flexWrap: 'wrap',
                            }}
                        >
                            <TextField
                                size="small"
                                placeholder="Nuevo tag (ES)"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                disabled={disabled}
                                sx={{
                                    ...inputSx,
                                    flex: '0 0 25%',
                                    minWidth: 200,
                                }}
                                required
                            />
                            <TextField
                                size="small"
                                placeholder="Nombre (EN)"
                                value={newTagEn}
                                onChange={(e) => setNewTagEn(e.target.value)}
                                disabled={disabled}
                                sx={{
                                    ...inputSx,
                                    flex: '0 0 25%',
                                    minWidth: 200,
                                }}
                                required
                            />
                            <Tooltip title="Crear tag">
                                <span>
                                    <IconButton
                                        color="primary"
                                        size="small"
                                        onClick={quickCreateTag}
                                        disabled={
                                            disabled ||
                                            !newTag.trim() ||
                                            !newTagEn.trim()
                                        }
                                        sx={{ height: 40, width: 40 }}
                                    >
                                        <AddIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                    </Stack>

                    <FormControlLabel
                        control={
                            <Switch
                                checked={isPremium}
                                onChange={(e) => setIsPremium(e.target.checked)}
                                disabled={disabled}
                            />
                        }
                        label={isPremium ? 'Premium' : 'Free'}
                    />
                </Stack>
            </CardContent>
        </Card>
    );
}
