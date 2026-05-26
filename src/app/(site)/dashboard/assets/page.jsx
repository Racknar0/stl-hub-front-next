'use client';

import React, {
    useMemo,
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    Chip,
    Stack,
    Typography,
    Link as MUILink,
    Box,
    TextField,
    IconButton,
    Switch,
    Tabs,
    Tab,
    Paper,
    Dialog,
    ThemeProvider,
    createTheme,
    ScopedCssBaseline,
} from '@mui/material';
import {
    useMaterialReactTable,
} from 'material-react-table';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import CachedIcon from '@mui/icons-material/Cached';
import LinkIcon from '@mui/icons-material/Link';
import HttpService from '@/services/HttpService';
import { successAlert, errorAlert, confirmAlert, fireAlert } from '@/helpers/alerts';


// Nuevos componentes
import ToolbarBusqueda from './componentes/ToolbarBusqueda';
import AssetsListTab from './componentes/tabs/AssetsListTab';
// ImageSimilarTab y NameSimilarTab eliminados Ã¢â‚¬â€ reemplazados por VisualSimilarTab (Qdrant)
import VisualSimilarTab from './componentes/tabs/VisualSimilarTab';
import MetaSeoTab from './componentes/tabs/MetaSeoTab';

// Helper para normalizar a slug
const slugify = (s) =>
    String(s || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-\s_]+/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#0f172a',
            paper: '#1e293b',
        },
        primary: { main: '#a855f7' },
        secondary: { main: '#eab308' },
    },
});

export default function AssetsAdminPage() {
    // Servicios
    const http = new HttpService();

    // Estado: tabla y filtros
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    // Nuevos filtros: por cuenta y por ID
    const [accountQ, setAccountQ] = useState('');
    const [assetIdQ, setAssetIdQ] = useState('');
    // Filtros por categoría y tag
    const [categoryFilter, setCategoryFilter] = useState(null);
    const [tagFilter, setTagFilter] = useState(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [metaPageIndex, setMetaPageIndex] = useState(0);
    const [metaPageSize, setMetaPageSize] = useState(50);
    const [metaReviewMode, setMetaReviewMode] = useState(false);
    const [rowCount, setRowCount] = useState(0);
    const [refreshTick, setRefreshTick] = useState(0);
    // filtro plan
    const [showFreeOnly, setShowFreeOnly] = useState(false);
    // filtro estado
    const [statusFilter, setStatusFilter] = useState('');
    // filtro SEO (noDescription, noDescriptionEn, noTags, noCategories, noImages)
    const [seoFilter, setSeoFilter] = useState('');

    // Estado: modal unificado
    const [assetModalOpen, setAssetModalOpen] = useState(false);
    const [assetModalIndex, setAssetModalIndex] = useState(-1);
    const [syncMultimodalVectorsOpen, setSyncMultimodalVectorsOpen] = useState(false);
    // Para dirty-check al navegar
    const [initialEditForm, setInitialEditForm] = useState(null);

    // Estado: selecciÃƒÂ³n actual y formularios
    const [selected, setSelected] = useState(null);
    // Edit form sin categorÃƒÂ­a legacy
    const [editForm, setEditForm] = useState({
        title: '',
        titleEn: '',
        categories: [],
        tags: [],
        isPremium: false,
    });
    // Detalle bilingÃƒÂ¼e
    const [detail, setDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // CatÃƒÂ¡logo meta
    const [categories, setCategories] = useState([]);
    const [allTags, setAllTags] = useState([]);

    // Estado: imÃƒÂ¡genes del editor
    const [tab, setTab] = useState(0);
    const [metaDraftMap, setMetaDraftMap] = useState({});
    const [metaSelectedMap, setMetaSelectedMap] = useState({});
    const [metaBusy, setMetaBusy] = useState(false);
    const [metaImagePreview, setMetaImagePreview] = useState(null);
    const [metaExpandedImagesMap, setMetaExpandedImagesMap] = useState({});
    const [metaProfilesOpen, setMetaProfilesOpen] = useState(false);
    const [metaProfileAssetId, setMetaProfileAssetId] = useState(null);

    // VirtualizaciÃƒÂ³n nativa para META-SEO
    const metaScrollRef = useRef(null);
    const [metaScrollTop, setMetaScrollTop] = useState(0);

    // Estado compartido: pares ignorados (usado por visual-similar)
    const [similarIgnoredPairMap, setSimilarIgnoredPairMap] = useState({});
    const [visualSimilarThreshold, setVisualSimilarThreshold] = useState(90);
    const [visualSimilarLoading, setVisualSimilarLoading] = useState(false);
    const [visualSimilarError, setVisualSimilarError] = useState('');
    const [visualSimilarProgress, setVisualSimilarProgress] = useState({
        done: 0,
        total: 0,
    });
    const [visualSimilarGroups, setVisualSimilarGroups] = useState([]);
    const [visualSimilarSelectedMap, setVisualSimilarSelectedMap] = useState({});
    const [visualSimilarPrimaryMap, setVisualSimilarPrimaryMap] = useState({});
    const [visualSimilarDeleteProgress, setVisualSimilarDeleteProgress] = useState({
        running: false,
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        currentAssetId: null,
    });
    const [similarViewer, setSimilarViewer] = useState({
        open: false,
        image: '',
        assetTitle: '',
        assetId: null,
    });
    const [editImageFiles, setEditImageFiles] = useState([]);
    const [editPreviewIndex, setEditPreviewIndex] = useState(0);
    const fileInputRef = useRef(null);
    const assetsRef = useRef([]);
    const metaImageSaveQueueRef = useRef(new Map());

    // (Randomizar freebies se moviÃƒÂ³ a otra pantalla del dashboard)

    // Cargar catÃƒÂ¡logos (categorÃƒÂ­as y tags)
    const loadMeta = async () => {
        try {
            const [cats, tgs] = await Promise.all([
                http.getData('/categories'),
                http.getData('/tags'),
            ]);
            setCategories(
                (cats.data?.items || []).map((c) => ({
                    id: c.id,
                    name: c.name,
                    slug: c.slug,
                })),
            );
            setAllTags(
                (tgs.data?.items || []).map((t) => ({
                    name: t.name,
                    slug: t.slug,
                })),
            );
        } catch (e) {
            console.error('meta load error', e);
        }
    };

    // Utilidades
    const resetObjectUrls = () => {
        try {
            editImageFiles.forEach((it) => {
                if (it.url && it.revoke) URL.revokeObjectURL(it.url);
            });
        } catch {}
    };
    const resetEdit = () => {
        resetObjectUrls();
        setEditForm({
            title: '',
            titleEn: '',
            categories: [],
            tags: [],
            isPremium: false,
        });
        setEditImageFiles([]);
        setEditPreviewIndex(0);
        setSelected(null);
    };



    const UPLOAD_BASE =
        process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads';
    const imgUrl = (rel) => {
        if (!rel) return '';
        const clean = String(rel).replace(/^\\+|^\/+/, '');
        return `${UPLOAD_BASE}/${clean}`;
    };
    const formatMBfromB = (bytes) => {
        const n = Number(bytes);
        if (!n || n <= 0) return '0 MB';
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    };


    const buildPairKey = (a, b) => {
        const x = Number(a);
        const y = Number(b);
        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            x <= 0 ||
            y <= 0 ||
            x === y
        )
            return '';
        return x < y ? `${x}:${y}` : `${y}:${x}`;
    };

    const ignoredPairsCount = useMemo(() => {
        return Object.values(similarIgnoredPairMap || {}).filter(Boolean)
            .length;
    }, [similarIgnoredPairMap]);


    // ==========================================
    // LÃƒâ€œGICA SIMILAR-VISUAL
    // ==========================================

    const analyzeVisualSimilarAssets = async () => {
        setVisualSimilarLoading(true);
        setVisualSimilarError('');
        setVisualSimilarGroups([]);
        setVisualSimilarSelectedMap({});
        setVisualSimilarPrimaryMap({});
        setVisualSimilarProgress({ done: 0, total: 0 });

        try {
            let pageIndexScan = 0;
            const pageSize = 500;
            const allGroups = [];
            const seenAssetIds = new Set();

            while (true) {
                const res = await http.getData(
                    `/ai/similar-visual-batch?pageIndex=${pageIndexScan}&pageSize=${pageSize}&threshold=${visualSimilarThreshold}`,
                );
                
                const { groups, totalProcessed, totalAssets } = res.data;

                if (!totalProcessed || totalProcessed === 0) {
                    break;
                }

                if (groups && groups.length > 0) {
                    const uniqueGroups = groups.filter(g => {
                        // Si el principal ya fue procesado, saltar el grupo entero
                        const primaryId = Number(g.id.replace('group-vis-', ''));
                        if (seenAssetIds.has(primaryId)) return false;

                        // Marcar todos los elementos de este grupo como vistos
                        g.items.forEach(i => seenAssetIds.add(Number(i.asset.id)));
                        return true;
                    });

                    if (uniqueGroups.length > 0) {
                        allGroups.push(...uniqueGroups);
                        setVisualSimilarGroups([...allGroups]);
                    }
                }

                setVisualSimilarProgress(prev => ({
                    done: (pageIndexScan + 1) * pageSize,
                    total: totalAssets || '...' 
                }));

                pageIndexScan += 1;
                
                if (totalProcessed < pageSize || pageIndexScan > 500) {
                    setVisualSimilarProgress(prev => ({
                        done: prev.done,
                        total: prev.done 
                    }));
                    break;
                }
            }
        } catch (error) {
            console.error('Visual similarity error:', error);
            setVisualSimilarError(error?.response?.data?.message || error?.message || 'Error analizando similitud visual');
        } finally {
            setVisualSimilarLoading(false);
        }
    };

    const toggleVisualSimilarSelection = (id) => {
        setVisualSimilarSelectedMap((prev) => {
            const next = { ...prev };
            if (next[id]) delete next[id];
            else next[id] = true;
            return next;
        });
    };

    const setVisualPrimaryInGroup = (groupId, primaryId) => {
        setVisualSimilarPrimaryMap((prev) => ({
            ...prev,
            [groupId]: primaryId,
        }));
        setVisualSimilarSelectedMap((prev) => {
            const next = { ...prev };
            delete next[primaryId];
            return next;
        });
    };

    const selectVisualGroupDuplicates = (group) => {
        const primaryId = Number(
            visualSimilarPrimaryMap[group.id] || group.items?.[0]?.asset?.id,
        );
        if (!primaryId) return;

        setVisualSimilarSelectedMap((prev) => {
            const next = { ...prev };
            group.items.forEach((entry) => {
                const id = Number(entry?.asset?.id);
                if (!Number.isFinite(id)) return;
                if (id === primaryId) delete next[id];
                else next[id] = true;
            });
            return next;
        });
    };

    const clearVisualSimilarSelection = () => setVisualSimilarSelectedMap({});

    const dismissVisualSimilarGroup = async (group) => {
        if (!group?.id) return;

        const assetIds = Array.isArray(group?.items)
            ? group.items
                  .map((entry) => Number(entry?.asset?.id))
                  .filter((n) => Number.isFinite(n) && n > 0)
            : [];

        const pairs = [];
        for (let i = 0; i < assetIds.length; i += 1) {
            for (let j = i + 1; j < assetIds.length; j += 1) {
                const a = assetIds[i];
                const b = assetIds[j];
                if (Number.isFinite(a) && Number.isFinite(b) && a !== b) {
                    const key = buildPairKey(a, b);
                    if (key)
                        pairs.push({
                            assetAId: Math.min(a, b),
                            assetBId: Math.max(a, b),
                            key,
                        });
                }
            }
        }
        if (!pairs.length) return;

        setSimilarIgnoredPairMap((prev) => {
            const next = { ...prev };
            pairs.forEach((p) => {
                next[p.key] = true;
            });
            return next;
        });

        setVisualSimilarGroups((prev) => prev.filter((g) => g.id !== group.id));
        setVisualSimilarPrimaryMap((prev) => {
            const next = { ...prev };
            delete next[group.id];
            return next;
        });
        setVisualSimilarSelectedMap((prev) => {
            const next = { ...prev };
            (group?.items || []).forEach((entry) => {
                const id = Number(entry?.asset?.id);
                if (Number.isFinite(id)) delete next[id];
            });
            return next;
        });

        try {
            await http.postData('/assets/similar/ignored-pairs', {
                pairs: pairs.map((p) => ({
                    assetAId: p.assetAId,
                    assetBId: p.assetBId,
                })),
            });
        } catch (e) {
            await errorAlert(
                'Error',
                e?.response?.data?.message ||
                    'No se pudo guardar el descarte en base de datos',
            );
        }
    };

    const reactivateVisualDismissedGroups = async () => {
        try {
            await http.deleteRaw('/assets/similar/ignored-pairs');
        } catch (e) {
            await errorAlert(
                'Error',
                e?.response?.data?.message ||
                    'No se pudieron reactivar los descartes',
            );
            return;
        }
        setSimilarIgnoredPairMap({});
        await analyzeVisualSimilarAssets();
    };

    const handleDeleteSelectedVisualSimilar = async () => {
        const idsToDelete = Object.keys(visualSimilarSelectedMap)
            .map(Number)
            .filter((n) => Number.isFinite(n) && n > 0);
            
        if (!idsToDelete.length) return;

        const ok = await confirmAlert(
            'Eliminar seleccionados',
            `Se eliminarÃƒÂ¡n ${idsToDelete.length} assets seleccionados del resultado multimodal.`,
            'SÃƒÂ­, eliminar',
            'Cancelar',
            'warning',
        );
        if (!ok) return;

        let successCount = 0;
        let failedCount = 0;
        setVisualSimilarLoading(true);
        setVisualSimilarDeleteProgress({
            running: true,
            total: idsToDelete.length,
            processed: 0,
            success: 0,
            failed: 0,
            currentAssetId: null,
        });

        for (const id of idsToDelete) {
            setVisualSimilarDeleteProgress((prev) => ({
                ...prev,
                currentAssetId: id,
            }));
            try {
                await http.deleteData('/assets', id);
                successCount += 1;
                setVisualSimilarDeleteProgress((prev) => ({
                    ...prev,
                    processed: prev.processed + 1,
                    success: prev.success + 1,
                }));
            } catch (e) {
                failedCount += 1;
                setVisualSimilarDeleteProgress((prev) => ({
                    ...prev,
                    processed: prev.processed + 1,
                    failed: prev.failed + 1,
                }));
            }
        }

        const deletedSet = new Set(idsToDelete);
        setVisualSimilarGroups((prev) => {
            return prev
                .map((group) => ({
                    ...group,
                    items: group.items.filter(
                        (entry) => !deletedSet.has(Number(entry?.asset?.id)),
                    ),
                }))
                .filter((group) => group.items.length > 1);
        });
        setVisualSimilarSelectedMap({});
        setRefreshTick((n) => n + 1);
        setVisualSimilarLoading(false);
        setVisualSimilarDeleteProgress((prev) => ({
            ...prev,
            running: false,
            currentAssetId: null,
        }));

        if (successCount > 0) {
            await successAlert(
                'Eliminados',
                `Se eliminaron ${successCount} assets correctamente.`,
            );
        }
        if (failedCount > 0) {
            await errorAlert(
                'Parcial',
                `No se pudieron eliminar ${failedCount} assets.`,
            );
        }
    };



    const openSimilarViewer = (asset, imageIndex = 0) => {
        const images = Array.isArray(asset?.images) ? asset.images : [];
        if (!images.length) return;
        const safeIndex = Math.max(
            0,
            Math.min(Number(imageIndex) || 0, images.length - 1),
        );
        setSimilarViewer({
            open: true,
            image: images[safeIndex] || '',
            assetTitle: asset?.title || asset?.archiveName || 'Asset',
            assetId: asset?.id ?? null,
        });
    };

    const closeSimilarViewer = () => {
        setSimilarViewer((prev) => ({ ...prev, open: false }));
    };



    // Cargar datos de la tabla (paginación servidor)
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const activePageIndex = tab === 2 ? metaPageIndex : pageIndex;
                const activePageSize = tab === 2 ? metaPageSize : pageSize;
                const params = new URLSearchParams({
                    q: String(searchTerm || ''),
                    pageIndex: String(activePageIndex),
                    pageSize: String(activePageSize),
                });
                if (showFreeOnly) params.set('plan', 'free');
                if (statusFilter) params.set('status', statusFilter);
                // Filtro SEO
                if (seoFilter) params.set(seoFilter, 'true');
                // Añadir filtros por cuenta
                const accTrim = String(accountQ || '').trim();
                if (accTrim) {
                    const asNum = Number(accTrim);
                    if (Number.isFinite(asNum) && asNum > 0)
                        params.set('accountId', String(asNum));
                    else params.set('accountAlias', accTrim);
                }
                // Filtros por categoría y tag
                if (categoryFilter?.slug) params.set('categorySlug', categoryFilter.slug);
                if (tagFilter?.slug) params.set('tagSlug', tagFilter.slug);
                const res = await http.getData(`/assets?${params.toString()}`);
                const payload = res.data;
                if (payload && Array.isArray(payload.items)) {
                    setAssets(payload.items);
                    setRowCount(Number(payload.total) || 0);
                } else if (Array.isArray(payload)) {
                    setAssets(payload);
                    setRowCount(payload.length);
                } else {
                    setAssets([]);
                    setRowCount(0);
                }
            } catch (e) {
                console.error('No se pudieron cargar assets', e);
                setAssets([]);
                setRowCount(0);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [searchTerm, pageIndex, pageSize, metaPageIndex, metaPageSize, tab, refreshTick, showFreeOnly, categoryFilter, tagFilter, statusFilter, seoFilter]);

    // Tabla: datos filtrados (sin filtrado local extra)
    const filtered = assets;

    useEffect(() => {
        assetsRef.current = Array.isArray(assets) ? assets : [];
    }, [assets]);

    // Detalle: ahora se carga en openAssetModal / loadAssetByIndex

    // Tabla: definiciÃƒÂ³n de columnas (ES)
    const StatusDot = ({ status }) => {
        const s = String(status || '').toUpperCase();
        const map = {
            DRAFT: '#9e9e9e',
            PROCESSING: '#29b6f6',
            PUBLISHED: '#66bb6a',
            FAILED: '#ef5350',
        };
        const color = map[s] || '#9e9e9e';
        return (
            <Box
                sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: color,
                    display: 'inline-block',
                }}
            />
        );
    };
    const columns = useMemo(
        () => [
            // ID
            {
                header: 'ID',
                accessorKey: 'id',
                size: 60,
                Cell: ({ cell }) => (
                    <Typography
                        variant="body2"
                        sx={{ width: 50, textAlign: 'right' }}
                    >
                        {cell.getValue()}
                    </Typography>
                ),
            },
            {
                header: ' ',
                accessorKey: 'thumbnail',
                size: 0,
                enableSorting: false,
                Cell: ({ row }) => {
                    const imgs = Array.isArray(row.original.images)
                        ? row.original.images
                        : [];
                    const first = imgs[0];
                    return first ? (
                        <img
                            src={imgUrl(first)}
                            alt="thumb"
                            style={{
                                width: 64,
                                height: 64,
                                objectFit: 'cover',
                                borderRadius: 6,
                                cursor: 'pointer',
                            }}
                            onClick={() => {
                                setSelected(row.original);
                                setPreviewOpen(true);
                            }}
                            title="Ver imÃƒÂ¡genes"
                        />
                    ) : (
                        <Box
                            sx={{
                                width: 64,
                                height: 40,
                                borderRadius: 6,
                                bgcolor: 'rgba(255,255,255,0.06)',
                            }}
                        />
                    );
                },
            },
            {
                header: 'Nombre',
                accessorKey: 'title',
                Cell: ({ row, cell }) => {
                    const titleEs = cell.getValue();
                    const titleEn = row?.original?.titleEn || '';
                    const archiveName = row?.original?.archiveName || '';
                    return (
                        <Box
                            sx={{
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 600 }} >
                                <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }} >
                                    es:
                                </Typography>
                                {titleEs}
                            </Typography>
                            {titleEn ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }} >
                                    <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }} >
                                        en:
                                    </Typography>
                                    {titleEn}
                                </Typography>
                            ) : null}
                            {archiveName ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }} >
                                    <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }} >
                                        file:
                                    </Typography>
                                    {archiveName}
                                </Typography>
                            ) : null}
                        </Box>
                    );
                },
                size: 300,
            },
            // {
            //   id: 'categoriesEs',
            //   header: 'CategorÃƒÂ­as',
            //   accessorFn: (row) => {
            //     const cats = Array.isArray(row.categories) ? row.categories : []
            //     const names = cats.map(c => c?.name).filter(Boolean)
            //     return names.length ? names.join(', ') : ''
            //   },
            //   Cell: ({ row }) => {
            //     const cats = Array.isArray(row.original.categories) ? row.original.categories : []
            //     const names = cats.map(c => c?.name).filter(Boolean)
            //     const toShow = names
            //     return (
            //       <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            //         {toShow.length ? toShow.map((n, i) => <Chip key={`${n}-${i}`} size="small" label={n} variant="outlined" />) : <Typography variant="body2" color="text.secondary">-</Typography>}
            //       </Stack>
            //     )
            //   },
            //   size: 200,
            // },
            // {
            //   id: 'tags',
            //   header: 'Tags',
            //   accessorFn: (row) => Array.isArray(row.tags) ? row.tags.map(t=>t?.name||t?.slug).join(',') : '',
            //   Cell: ({ row }) => {
            //     const tags = Array.isArray(row.original.tags) ? row.original.tags : []
            //     return (
            //       <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            //         {tags.map((t, i) => <Chip key={`${t?.slug||t}-${i}`} size="small" label={t?.name || t?.slug || t} variant="outlined" />)}
            //       </Stack>
            //     )
            //   },
            // },
            {
                header: 'Plan',
                accessorKey: 'isPremium',
                size: 40,
                Cell: ({ cell }) => {
                    const isPrem = !!cell.getValue();
                    const bg = isPrem ? '#ffeb3b33' : '#4caf5033'; // amarillo suave para P, verde suave para F
                    const fg = isPrem ? '#fbc02d' : '#43a047';
                    return (
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 22, px: 0.5, borderRadius: 8, bgcolor: bg, }} >
                            <Typography variant="body2" sx={{ fontWeight: 700, color: fg }} >
                                {isPrem ? 'P' : 'F'}
                            </Typography>
                        </Box>
                    );
                },
            },
            {
                header: 'Estado',
                accessorKey: 'status',
                size: 60,
                Cell: ({ cell }) => <StatusDot status={cell.getValue()} />,
            },
            {
                id: 'sizeB',
                header: 'TamaÃƒÂ±o',
                accessorFn: (row) => row.fileSizeB ?? row.archiveSizeB ?? 0,
                Cell: ({ cell }) => ( <Typography variant="body2"> {formatMBfromB(cell.getValue())} </Typography> ),
                size: 100,
            },
            {
                header: 'Cuenta',
                accessorFn: (row) => row.account?.alias || row.accountId,
                size: 140,
                Cell: ({ row }) => ( <Typography variant="body2" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', }} > {row.original.account?.alias || row.original.accountId} </Typography> ),
            },
            {
                header: 'Subido',
                accessorKey: 'createdAt',
                size: 150,
                Cell: ({ cell }) => {
                    let v = cell.getValue();
                    if (!v) return ( <Typography variant="body2" color="text.secondary"> - </Typography> );
                    // Handle object / BigInt-serialized values
                    if (typeof v === 'object' && v !== null) v = v?.toISOString?.() || JSON.stringify(v);
                    const d = new Date(v);
                    const text = Number.isNaN(d.getTime())
                        ? String(v)
                        : d.toLocaleString('es-ES');
                    return <Typography variant="body2">{text}</Typography>;
                },
            },
            {
                header: 'MEGA',
                accessorKey: 'megaLink',
                size: 160,
                Cell: ({ cell }) =>
                    cell.getValue() ? (
                        <Typography variant="body2">
                            <LinkIcon fontSize="small" style={{ verticalAlign: 'middle' }} />{' '}
                            <MUILink href={cell.getValue()} target="_blank" rel="noreferrer" underline="hover" >
                                Abrir
                            </MUILink>
                        </Typography>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            -
                        </Typography>
                    ),
            },
        ],
        [],
    );

    // Instancia de la tabla
    const table = useMaterialReactTable({
        columns,
        data: filtered,
        initialState: { density: 'compact' },
        enableStickyHeader: true,
        enablePagination: true,
        manualPagination: true,
        enableRowVirtualization: true, // Habilitar virtualización de filas para STL-LIST
        rowCount,
        onPaginationChange: (updater) => {
            if (typeof updater === 'function') {
                const next = updater({ pageIndex, pageSize });
                setPageIndex(next.pageIndex);
                setPageSize(next.pageSize);
            } else if (updater && typeof updater === 'object') {
                setPageIndex(updater.pageIndex ?? 0);
                setPageSize(updater.pageSize ?? 50);
            }
        },
        state: { isLoading: loading, pagination: { pageIndex, pageSize } },
        muiPaginationProps: { rowsPerPageOptions: [10, 25, 50, 100, 200, 300, 400, 500, 1000], },
        muiTableContainerProps: {
            sx: { height: { xs: 'calc(100vh - 220px)', md: 'calc(100vh - 240px)', }, overflowX: 'auto', },
        },
        muiTopToolbarProps: { sx: { position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.default', }, },
        muiBottomToolbarProps: { sx: { position: 'sticky', bottom: 0, zIndex: 2, bgcolor: 'background.default', }, },
        muiTablePaperProps: { sx: { width: '100%' } },
        enableColumnFilters: false,
        enableGlobalFilter: false,
        enableRowActions: true,
        positionActionsColumn: 'first',
        displayColumnDefOptions: { 'mrt-row-actions': { size: 80 } },
        enableTopToolbar: false,
        renderRowActions: ({ row }) => (
            <Box sx={{ display: 'flex', gap: 0 }}>
                <IconButton
                    aria-label="Editar"
                    size="small"
                    onClick={() => openAssetModal(row.original)}
                    sx={{ p: 0.2 }}
                    title="Ver / Editar STL"
                >
                    <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                    aria-label="Borrar"
                    size="small"
                    color="error"
                    onClick={() => handleDelete(row.original)}
                    sx={{ p: 0.2 }}
                    title="Eliminar STL"
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
                <IconButton
                    aria-label="Refrescar link"
                    size="small"
                    onClick={() => handleRestoreLink(row.original)}
                    sx={{ p: 0.2 }}
                    title="Verificar y restaurar link MEGA"
                >
                    <CachedIcon fontSize="small" />
                </IconButton>
            </Box>
        ),
        muiTableBodyRowProps: ({ row }) => {
            // Cambia el color de fondo si el link estÃƒÂ¡ caÃƒÂ­do
            return row.original.megaLinkAlive === false
                ? { sx: { backgroundColor: '#fc8282' } } // rojo claro, puedes ajustar el color
                : {};
        },
    });

    // Abrir modal unificado
    const buildEditFormFromAsset = (asset) => ({
        title: asset.title || '',
        titleEn: asset.titleEn || '',
        categories: Array.isArray(asset.categories) ? asset.categories.map((c) => ({ ...c })) : [],
        tags: Array.isArray(asset.tags) ? asset.tags.map((t) => String(t.slug || t.name || '').toLowerCase()).filter(Boolean) : [],
        isPremium: !!asset.isPremium,
    });

    const openAssetModal = async (asset) => {
        const idx = filtered.findIndex((a) => a.id === asset.id);
        setSelected(asset);
        const form = buildEditFormFromAsset(asset);
        setEditForm(form);
        setInitialEditForm(JSON.stringify(form));
        setEditImageFiles([]);
        setEditPreviewIndex(0);
        setAssetModalIndex(idx >= 0 ? idx : 0);
        setAssetModalOpen(true);
        await loadMeta();
        // Cargar detalle completo
        try {
            setLoadingDetail(true);
            const res = await http.getData(`/assets/${asset.id}`);
            if (res.data) {
                setDetail(res.data);
                const freshForm = buildEditFormFromAsset(res.data);
                setEditForm(freshForm);
                setInitialEditForm(JSON.stringify(freshForm));
            }
        } catch {} finally { setLoadingDetail(false); }
    };

    const loadAssetByIndex = async (idx) => {
        const asset = filtered[idx];
        if (!asset) return;
        setSelected(asset);
        setAssetModalIndex(idx);
        const form = buildEditFormFromAsset(asset);
        setEditForm(form);
        setInitialEditForm(JSON.stringify(form));
        setEditImageFiles([]);
        setEditPreviewIndex(0);
        try {
            setLoadingDetail(true);
            const res = await http.getData(`/assets/${asset.id}`);
            if (res.data) {
                setDetail(res.data);
                const freshForm = buildEditFormFromAsset(res.data);
                setEditForm(freshForm);
                setInitialEditForm(JSON.stringify(freshForm));
            }
        } catch {} finally { setLoadingDetail(false); }
    };

    const isDirty = () => {
        if (editImageFiles.length > 0) return true;
        if (!initialEditForm) return false;
        return JSON.stringify(editForm) !== initialEditForm;
    };

    const onNavigateWithDirtyCheck = async (dir) => {
        const nextIdx = dir === 'prev' ? assetModalIndex - 1 : assetModalIndex + 1;
        if (nextIdx < 0 || nextIdx >= filtered.length) return;
        if (isDirty()) {
            const answer = await confirmAlert(
                'Cambios sin guardar',
                '¿Qué deseas hacer con los cambios actuales?',
                'Guardar y continuar',
                'Descartar y continuar',
                'warning',
            );
            if (answer) {
                await handleSaveEdit();
            }
        }
        await loadAssetByIndex(nextIdx);
    };

    const closeAssetModal = () => {
        setAssetModalOpen(false);
        setSelected(null);
        setDetail(null);
        resetEdit();
    };

    // Helpers de imÃƒÂ¡genes para editor
    const buildItemsFromFiles = (files) => {
        const list = [];
        Array.from(files || []).forEach((f, idx) => {
            const url = URL.createObjectURL(f);
            list.push({
                id: `${Date.now()}_${idx}`,
                url,
                name: f.name,
                file: f,
                revoke: true,
            });
        });
        return list;
    };
    const onSelectFiles = (e) => {
        const files = e.target.files;
        const items = buildItemsFromFiles(files);
        setEditImageFiles((prev) => [...prev, ...items]);
        if (editImageFiles.length === 0 && items.length > 0)
            setEditPreviewIndex(0);
    };
    const onDrop = (e) => {
        e.preventDefault();
        const files = e.dataTransfer?.files;
        if (files && files.length) {
            const items = buildItemsFromFiles(files);
            setEditImageFiles((prev) => [...prev, ...items]);
            if (editImageFiles.length === 0 && items.length > 0)
                setEditPreviewIndex(0);
        }
    };
    const onDragOver = (e) => e.preventDefault();
    const onOpenFilePicker = () => fileInputRef.current?.click();
    const onPrev = () =>
        setEditPreviewIndex(
            (i) =>
                (i - 1 + editImageFiles.length) %
                Math.max(1, editImageFiles.length),
        );
    const onNext = () =>
        setEditPreviewIndex(
            (i) => (i + 1) % Math.max(1, editImageFiles.length),
        );
    const onRemove = (id) => {
        setEditImageFiles((prev) => {
            const idx = prev.findIndex((p) => p.id === id);
            if (idx >= 0) {
                try {
                    prev[idx].url &&
                        prev[idx].revoke &&
                        URL.revokeObjectURL(prev[idx].url);
                } catch {}
            }
            const arr = prev.filter((p) => p.id !== id);
            if (editPreviewIndex >= arr.length)
                setEditPreviewIndex(Math.max(0, arr.length - 1));
            return arr;
        });
    };
    const onSelectPreview = (idx) => setEditPreviewIndex(idx);

    // Guardar ediciÃƒÂ³n (sin categorÃƒÂ­a legacy)
    const handleSaveEdit = async () => {
        if (!selected) return;
        const ok = await confirmAlert(
            'Confirmar cambios',
            '¿Deseas aplicar las modificaciones a este STL?',
            'Sí, guardar',
            'Cancelar',
            'question',
        );
        if (!ok) return;
        try {
            setLoading(true);
            await http.putData('/assets', selected.id, {
                title: editForm.title,
                titleEn: editForm.titleEn,
                categories: editForm.categories?.length
                    ? editForm.categories.map((c) =>
                          String(c.slug).toLowerCase(),
                      )
                    : [],
                tags: (editForm.tags || []).map((t) =>
                    String(t).trim().toLowerCase(),
                ),
                isPremium: editForm.isPremium,
            });
            if (editImageFiles && editImageFiles.length > 0) {
                const fd = new FormData();
                editImageFiles.forEach((it) => fd.append('images', it.file));
                await http.postFormData(
                    `/assets/${selected.id}/images?replace=true`,
                    fd,
                );
            }
            setAssetModalOpen(false);
            setSelected(null);
            setDetail(null);
            resetEdit();
            setInitialEditForm(null);
            setRefreshTick((n) => n + 1);
            await successAlert(
                'Actualizado',
                'El STL fue actualizado correctamente',
            );
        } catch (e) {
            console.error('Error guardando cambios', e);
            await errorAlert('Error', 'No se pudieron guardar los cambios');
        } finally {
            setLoading(false);
        }
    };

    // Eliminar asset
    const handleDelete = async (asset) => {
        const ok = await confirmAlert(
            'Eliminar STL',
            `¿Deseas eliminar "${asset.title}"? Se borrará de la base de datos y se intentará borrar de MEGA.`,
            'Sí, eliminar',
            'Cancelar',
            'warning',
        );
        if (!ok) return;
        try {
            setLoading(true);
            const res = await http.deleteData('/assets', asset.id);
            const { dbDeleted, megaDeleted } = res.data || {};
            if (dbDeleted && megaDeleted) {
                await successAlert(
                    'Eliminado',
                    'Archivos borrados exitosamente de MEGA y de la base de datos',
                );
            } else if (dbDeleted && !megaDeleted) {
                await successAlert(
                    'Parcial',
                    'Archivos borrados solamente de la base de datos',
                );
            } else {
                await errorAlert('Error', 'No se pudo eliminar el STL');
            }
            setRefreshTick((n) => n + 1);
        } catch (e) {
            await errorAlert(
                'Error',
                e?.response?.data?.message || 'Fallo al eliminar',
            );
        } finally {
            setLoading(false);
        }
    };

    // Recuperar link MEGA desde BACKUP
    const handleRestoreLink = async (asset) => {
        const ok = await confirmAlert(
            'Restaurar link MEGA',
            `¿Deseas restaurar el link MEGA para "${asset.title}"?`,
            'Sí, restaurar',
            'Cancelar',
            'warning',
        );
        if (!ok) return;
        try {
            setLoading(true);
            await http.postData(`/assets/${asset.id}/restore-link`);
            await successAlert(
                'Restaurado',
                'El link MEGA fue restaurado correctamente',
            );
        } catch (e) {
            console.error('Error restaurando link MEGA', e);
            await errorAlert('Error', 'No se pudo restaurar el link MEGA');
        } finally {
            // refresh de la tabla para ver cambios
            setRefreshTick((n) => n + 1);

            setLoading(false);
        }
    };

    const normalizeMetaCategory = useCallback((item) => {
        if (!item || typeof item !== 'object') return null;
        const slug = String(item.slug || item.slugEn || '')
            .trim()
            .toLowerCase();
        const name = String(item.name || item.nameEn || slug || '').trim();
        if (!slug && !name) return null;
        return {
            id: Number(item.id || 0) || undefined,
            slug: slug || slugify(name),
            name: name || slug,
        };
    }, []);

    const normalizeMetaTag = useCallback((item) => {
        if (typeof item === 'string') {
            const value = String(item || '')
                .trim()
                .toLowerCase();
            if (!value) return null;
            return { slug: slugify(value), name: value };
        }
        if (!item || typeof item !== 'object') return null;
        const slug = String(item.slug || item.slugEn || '')
            .trim()
            .toLowerCase();
        const name = String(
            item.name || item.nameEn || item.es || item.en || slug || '',
        )
            .trim()
            .toLowerCase();
        if (!slug && !name) return null;
        return {
            id: Number(item.id || 0) || undefined,
            slug: slug || slugify(name),
            name: name || slug,
        };
    }, []);

    const normalizeMetaTagList = useCallback(
        (items) => {
            const seen = new Set();
            const out = [];
            (Array.isArray(items) ? items : []).forEach((item) => {
                const normalized = normalizeMetaTag(item);
                if (!normalized) return;
                const key = String(normalized.slug || normalized.name || '')
                    .trim()
                    .toLowerCase();
                if (!key || seen.has(key)) return;
                seen.add(key);
                out.push(normalized);
            });
            return out;
        },
        [normalizeMetaTag],
    );

    const normalizeMetaCategoryList = useCallback(
        (items) => {
            const seen = new Set();
            const out = [];
            (Array.isArray(items) ? items : []).forEach((item) => {
                const normalized = normalizeMetaCategory(item);
                if (!normalized) return;
                const key = String(normalized.slug || normalized.name || '')
                    .trim()
                    .toLowerCase();
                if (!key || seen.has(key)) return;
                seen.add(key);
                out.push(normalized);
            });
            return out;
        },
        [normalizeMetaCategory],
    );

    useEffect(() => {
        if (!categories.length || !allTags.length) {
            void loadMeta();
        }
    }, []);

    useEffect(() => {
        if (tab !== 2) return;
        setMetaDraftMap((prev) => {
            const next = { ...prev };
            (Array.isArray(assets) ? assets : []).forEach((asset) => {
                const id = Number(asset?.id || 0);
                if (!Number.isFinite(id) || id <= 0) return;
                if (!next[id]) {
                    next[id] = {
                        id,
                        title: String(asset?.title || ''),
                        titleEn: String(asset?.titleEn || ''),
                        description: String(asset?.description || ''),
                        descriptionEn: String(asset?.descriptionEn || ''),
                        categories: normalizeMetaCategoryList(asset?.categories),
                        tags: normalizeMetaTagList(asset?.tags),
                    };
                }
            });
            return next;
        });
    }, [tab, assets, normalizeMetaCategoryList, normalizeMetaTagList]);

    const metaRows = filtered;

    const metaVirtualizer = useVirtualizer({
        count: metaRows.length,
        getScrollElement: () => metaScrollRef.current,
        estimateSize: () => 490,
        overscan: 5,
    });

    const virtualItems = metaVirtualizer.getVirtualItems();
    const totalSize = metaVirtualizer.getTotalSize();
    const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
    const paddingBottom =
        virtualItems.length > 0
            ? totalSize - virtualItems[virtualItems.length - 1].end
            : 0;
    const metaTotalPages = useMemo(() => {
        const total = Number(rowCount) || 0;
        const size = Math.max(1, Number(metaPageSize) || 1);
        return Math.max(1, Math.ceil(total / size));
    }, [rowCount, metaPageSize]);
    const metaPageOptions = useMemo(
        () => Array.from({ length: metaTotalPages }, (_, idx) => idx),
        [metaTotalPages],
    );

    useEffect(() => {
        const lastPage = Math.max(0, metaTotalPages - 1);
        if (metaPageIndex > lastPage) setMetaPageIndex(lastPage);
    }, [metaPageIndex, metaTotalPages]);

    const metaSelectedIds = useMemo(() => {
        return Object.entries(metaSelectedMap)
            .filter(([, checked]) => !!checked)
            .map(([id]) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0);
    }, [metaSelectedMap]);

    const allVisibleMetaIds = useMemo(() => {
        return (Array.isArray(metaRows) ? metaRows : [])
            .map((row) => Number(row?.id || 0))
            .filter((id) => Number.isFinite(id) && id > 0);
    }, [metaRows]);

    const allVisibleMetaSelected = useMemo(() => {
        if (!allVisibleMetaIds.length) return false;
        return allVisibleMetaIds.every((id) => !!metaSelectedMap[id]);
    }, [allVisibleMetaIds, metaSelectedMap]);

    const toggleMetaSelect = (assetId) => {
        const id = Number(assetId);
        if (!Number.isFinite(id) || id <= 0) return;
        setMetaSelectedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleMetaSelectAllVisible = () => {
        setMetaSelectedMap((prev) => {
            const next = { ...prev };
            const setTo = !allVisibleMetaSelected;
            allVisibleMetaIds.forEach((id) => {
                next[id] = setTo;
            });
            return next;
        });
    };

    const applyMetaImagesInRow = useCallback((assetId, nextImages) => {
        const id = Number(assetId);
        if (!Number.isFinite(id) || id <= 0) return;
        const safeImages = Array.isArray(nextImages)
            ? nextImages.map((it) => String(it || '').trim()).filter(Boolean)
            : [];

        setAssets((prev) =>
            (Array.isArray(prev) ? prev : []).map((row) =>
                Number(row?.id || 0) === id ? { ...row, images: safeImages } : row,
            ),
        );
        
        const updateGroups = (prevGroups) =>
            (Array.isArray(prevGroups) ? prevGroups : []).map((group) => ({
                ...group,
                items: group.items.map((item) =>
                    Number(item?.asset?.id || 0) === id
                        ? { ...item, asset: { ...item.asset, images: safeImages } }
                        : item
                ),
            }));

        setVisualSimilarGroups(updateGroups);
    }, []);

    const toggleMetaExpandedImages = useCallback((assetId) => {
        const id = Number(assetId);
        if (!Number.isFinite(id) || id <= 0) return;
        setMetaExpandedImagesMap((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }, []);

    const queueMetaImagesSave = useCallback(
        (assetId, imagesSnapshot = null) => {
            const id = Number(assetId);
            if (!Number.isFinite(id) || id <= 0) return;

            const previousTask =
                metaImageSaveQueueRef.current.get(id) || Promise.resolve();

            const currentTask = previousTask
                .catch(() => {})
                .then(async () => {
                    const row = (Array.isArray(assetsRef.current)
                        ? assetsRef.current
                        : []
                    ).find((it) => Number(it?.id || 0) === id);

                    const sourceImages = Array.isArray(imagesSnapshot)
                        ? imagesSnapshot
                        : row?.images;

                    const safeImages = Array.isArray(sourceImages)
                        ? sourceImages
                              .map((it) => String(it || '').trim())
                              .filter(Boolean)
                        : [];

                    await http.putData('/assets', id, { images: safeImages });
                });

            metaImageSaveQueueRef.current.set(id, currentTask);

            void currentTask
                .catch(async (e) => {
                    await errorAlert(
                        'Error',
                        e?.response?.data?.message ||
                            `No se pudo guardar cambios de imagenes en #${id}`,
                    );
                })
                .finally(() => {
                    if (metaImageSaveQueueRef.current.get(id) === currentTask) {
                        metaImageSaveQueueRef.current.delete(id);
                    }
                });
        },
        [errorAlert],
    );

    const saveMetaImagesNow = useCallback(
        async (assetId, nextImages) => {
            const id = Number(assetId);
            if (!Number.isFinite(id) || id <= 0) return false;

            const safeImages = Array.isArray(nextImages)
                ? nextImages.map((it) => String(it || '').trim()).filter(Boolean)
                : [];

            await http.putData('/assets', id, { images: safeImages });
            applyMetaImagesInRow(id, safeImages);
            return true;
        },
        [applyMetaImagesInRow],
    );

    const findAssetInAllSources = useCallback((assetId) => {
        const id = Number(assetId);
        // 1) assetsRef (tabla principal)
        const fromAssets = (Array.isArray(assetsRef.current) ? assetsRef.current : []).find(
            (it) => Number(it?.id || 0) === id,
        );
        if (fromAssets) return fromAssets;
        // 2) metaRows
        const fromMeta = (Array.isArray(metaRows) ? metaRows : []).find(
            (it) => Number(it?.id || 0) === id,
        );
        if (fromMeta) return fromMeta;
        // 3) similarity groups (visual)
        for (const groups of [visualSimilarGroups]) {
            for (const g of (Array.isArray(groups) ? groups : [])) {
                const entry = (g.items || []).find((i) => Number(i?.asset?.id || 0) === id);
                if (entry?.asset) return entry.asset;
            }
        }
        return null;
    }, [metaRows, visualSimilarGroups]);

    const updateMetaDraft = useCallback((assetId, patch) => {
        const id = Number(assetId);
        if (!Number.isFinite(id) || id <= 0) return;
        setMetaDraftMap((prev) => {
            let current = prev[id];
            if (!current) {
                const asset = findAssetInAllSources(id);
                current = {
                    id,
                    title: String(asset?.title || ''),
                    titleEn: String(asset?.titleEn || ''),
                    description: String(asset?.description || ''),
                    descriptionEn: String(asset?.descriptionEn || ''),
                    categories: normalizeMetaCategoryList(asset?.categories || []),
                    tags: normalizeMetaTagList(asset?.tags || []),
                };
            }
            return {
                ...prev,
                [id]: {
                    ...current,
                    ...patch,
                },
            };
        });
    }, [findAssetInAllSources, normalizeMetaCategoryList, normalizeMetaTagList]);

    const handleMetaSetFirstImage = useCallback(
        async (assetId, imgIndex) => {
            const id = Number(assetId);
            const from = Number(imgIndex);
            if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(from) || from < 0)
                return;

            const row = findAssetInAllSources(id);
            const currentImages = Array.isArray(row?.images) ? row.images : [];
            if (!currentImages.length || from >= currentImages.length || from === 0) return;

            const reordered = [...currentImages];
            const [picked] = reordered.splice(from, 1);
            reordered.unshift(picked);

            try {
                setMetaBusy(true);
                await saveMetaImagesNow(id, reordered);
                applyMetaImagesInRow(id, reordered);
                await fireAlert({
                    toast: true,
                    position: 'top',
                    icon: 'success',
                    title: `Imagen principal actualizada en #${id}`,
                    showConfirmButton: false,
                    timer: 1400,
                    timerProgressBar: true,
                    zIndex: 2000,
                    width: '400px',
                });
            } catch (e) {
                await errorAlert(
                    'Error',
                    e?.response?.data?.message || 'No se pudo actualizar el orden de imÃƒÂ¡genes',
                );
            } finally {
                setMetaBusy(false);
            }
        },
        [fireAlert, findAssetInAllSources, saveMetaImagesNow, applyMetaImagesInRow],
    );

    const handleMetaDeleteImage = useCallback(
        (assetId, imgIndex) => {
            const id = Number(assetId);
            const idx = Number(imgIndex);
            if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(idx) || idx < 0)
                return;

            const row = findAssetInAllSources(id);
            const currentImages = Array.isArray(row?.images) ? row.images : [];
            if (!currentImages.length || idx >= currentImages.length) return;

            const nextImages = currentImages.filter((_, imagePos) => imagePos !== idx);

            // Borrado optimista: se actualiza UI primero y se persiste en segundo plano.
            applyMetaImagesInRow(id, nextImages);
            queueMetaImagesSave(id, nextImages);
        },
        [applyMetaImagesInRow, findAssetInAllSources, queueMetaImagesSave],
    );


    const saveMetaRow = async (assetId, patch = {}, { silent = false } = {}) => {
        const id = Number(assetId);
        let draft = metaDraftMap[id];
        if (!draft) {
            const asset = findAssetInAllSources(id);
            draft = {
                id,
                title: String(asset?.title || ''),
                titleEn: String(asset?.titleEn || ''),
                description: String(asset?.description || ''),
                descriptionEn: String(asset?.descriptionEn || ''),
                categories: normalizeMetaCategoryList(asset?.categories || []),
                tags: normalizeMetaTagList(asset?.tags || []),
            };
        }
        const mergedDraft = {
            ...draft,
            ...patch,
        };

        const categoriesPayload = normalizeMetaCategoryList(mergedDraft.categories)
            .map((c) =>
                String(c.slug || c.name || '')
                    .trim()
                    .toLowerCase(),
            )
            .filter(Boolean);
        const tagsPayload = normalizeMetaTagList(mergedDraft.tags)
            .map((t) =>
                String(t.slug || t.name || '')
                    .trim()
                    .toLowerCase(),
            )
            .filter(Boolean);

        setMetaDraftMap((prev) => ({
            ...prev,
            [id]: mergedDraft,
        }));

        await http.putData('/assets', id, {
            title: String(mergedDraft.title || '').trim(),
            titleEn: String(mergedDraft.titleEn || '').trim(),
            description: String(mergedDraft.description || '').trim(),
            descriptionEn: String(mergedDraft.descriptionEn || '').trim(),
            categories: categoriesPayload,
            tags: tagsPayload,
        });

        if (!silent) {
            await fireAlert({
                toast: true,
                position: 'top',
                icon: 'success',
                title: `Metadata guardada para asset #${id}`,
                showConfirmButton: false,
                timer: 1700,
                timerProgressBar: true,
                zIndex: 2000,
                width: '400px',
            });
        }
        return true;
    };

    const saveMetaSelected = async () => {
        if (!metaSelectedIds.length) return;
        setMetaBusy(true);
        try {
            const items = metaSelectedIds
                .map((assetId) => {
                    const id = Number(assetId);
                    const draft = metaDraftMap[id];
                    if (!Number.isFinite(id) || id <= 0 || !draft) return null;

                    const categoriesPayload = normalizeMetaCategoryList(
                        draft.categories,
                    )
                        .map((c) =>
                            String(c.slug || c.name || '')
                                .trim()
                                .toLowerCase(),
                        )
                        .filter(Boolean);

                    const tagsPayload = normalizeMetaTagList(draft.tags)
                        .map((t) =>
                            String(t.slug || t.name || '')
                                .trim()
                                .toLowerCase(),
                        )
                        .filter(Boolean);

                    return {
                        id,
                        title: String(draft.title || '').trim(),
                        titleEn: String(draft.titleEn || '').trim(),
                        description: String(draft.description || '').trim(),
                        descriptionEn: String(draft.descriptionEn || '').trim(),
                        categories: categoriesPayload,
                        tags: tagsPayload,
                    };
                })
                .filter(Boolean);

            if (!items.length) {
                await errorAlert(
                    'Sin cambios',
                    'No hay borradores vÃƒÂ¡lidos para guardar en selecciÃƒÂ³n.',
                );
                return;
            }

            const res = await http.postData('/assets/meta/save-selected', {
                items,
            });

            const okCount = Number(res?.data?.updated || 0);
            const failCount = Number(res?.data?.failed || 0);

            setRefreshTick((n) => n + 1);
            if (okCount > 0) {
                await successAlert(
                    'Guardado',
                    `Se actualizaron ${okCount} assets`,
                );
            }
            if (failCount > 0) {
                await errorAlert(
                    'Parcial',
                    `Fallaron ${failCount} assets al guardar`,
                );
            }
        } catch (e) {
            await errorAlert(
                'Error',
                e?.response?.data?.message ||
                    'No se pudo guardar la selecciÃƒÂ³n',
            );
        } finally {
            setMetaBusy(false);
        }
    };

    const handleSaveMetaRow = async (assetId, patch = {}) => {
        try {
            // Guardado en segundo plano sin bloquear (sin setMetaBusy)
            saveMetaRow(assetId, patch).catch(async (e) => {
                await fireAlert({
                    toast: true,
                    position: 'top',
                    icon: 'error',
                    title: e?.response?.data?.message || 'No se pudo guardar el asset',
                    showConfirmButton: false,
                    timer: 2200,
                    timerProgressBar: true,
                    zIndex: 2000,
                    width: '400px',
                });
            });
            // NOTA: Eliminamos setRefreshTick para evitar que la tabla se recargue y pierdas el foco
        } catch (e) {
            console.error('Error in handleSaveMetaRow dispatch:', e);
        }
    };

    const runMetaDescriptionGeneration = async (mode, ids = []) => {
        setMetaBusy(true);
        try {
            const payload = { mode };
            if (Array.isArray(ids) && ids.length > 0) payload.assetIds = ids;
            const res = await http.postData(
                '/assets/meta/generate-descriptions',
                payload,
            );
            const updated = Number(res?.data?.updated || 0);
            const generatedItems = Array.isArray(res?.data?.items)
                ? res.data.items
                : [];

            if (generatedItems.length) {
                setMetaDraftMap((prev) => {
                    const next = { ...prev };
                    generatedItems.forEach((item) => {
                        if (!item?.updated) return;
                        const id = Number(item?.id || 0);
                        if (!Number.isFinite(id) || id <= 0) return;
                        const current = next[id] || {
                            id,
                            title: '',
                            titleEn: '',
                            description: '',
                            descriptionEn: '',
                            categories: [],
                            tags: [],
                        };
                        next[id] = {
                            ...current,
                            description: String(
                                item?.description || current.description || '',
                            ),
                            descriptionEn: String(
                                item?.descriptionEn ||
                                    current.descriptionEn ||
                                    '',
                            ),
                        };
                    });
                    return next;
                });

                setAssets((prev) => {
                    const patchById = new Map();
                    generatedItems.forEach((item) => {
                        if (!item?.updated) return;
                        const id = Number(item?.id || 0);
                        if (!Number.isFinite(id) || id <= 0) return;
                        patchById.set(id, {
                            description: String(item?.description || ''),
                            descriptionEn: String(item?.descriptionEn || ''),
                        });
                    });
                    return (Array.isArray(prev) ? prev : []).map((row) => {
                        const patch = patchById.get(Number(row?.id || 0));
                        return patch ? { ...row, ...patch } : row;
                    });
                });
            }

            await successAlert(
                'Descripciones generadas',
                `Se actualizaron ${updated} descripciones.`,
            );
            setRefreshTick((n) => n + 1);
        } catch (e) {
            await errorAlert(
                'Error',
                e?.response?.data?.message ||
                    'No se pudieron generar descripciones',
            );
        } finally {
            setMetaBusy(false);
        }
    };

    const runMetaTagsGenerationForSelected = async () => {
        if (!metaSelectedIds.length) return;
        setMetaBusy(true);
        try {
            const res = await http.postData('/assets/meta/generate-tags', {
                assetIds: metaSelectedIds,
            });
            const updated = Number(res?.data?.updated || 0);
            await successAlert(
                'Tags generados',
                `Se actualizaron tags en ${updated} assets.`,
            );
            await loadMeta();
            setRefreshTick((n) => n + 1);
        } catch (e) {
            await errorAlert(
                'Error',
                e?.response?.data?.message || 'No se pudieron generar tags',
            );
        } finally {
            setMetaBusy(false);
        }
    };

    const handleGenerateSelectedDescriptions = async () => {
        if (!metaSelectedIds.length) return;
        await runMetaDescriptionGeneration('selected', metaSelectedIds);
    };

    const handleGenerateAllDescriptions = async () => {
        const ok = await confirmAlert(
            'Generar descripciones (todos)',
            'Esto intentarÃƒÂ¡ generar descripciones IA para todos los assets segÃƒÂºn el lÃƒÂ­mite configurado. Ã‚Â¿Deseas continuar?',
            'SÃƒÂ­, generar',
            'Cancelar',
            'warning',
        );
        if (!ok) return;
        await runMetaDescriptionGeneration('all');
    };

    const handleGenerateMissingDescriptions = async () => {
        const ok = await confirmAlert(
            'Generar descripciones (faltantes)',
            'Esto generarÃƒÂ¡ descripciones IA solo para assets con descripciÃƒÂ³n faltante. Ã‚Â¿Deseas continuar?',
            'SÃƒÂ­, generar',
            'Cancelar',
            'question',
        );
        if (!ok) return;
        await runMetaDescriptionGeneration('missing');
    };

    const handleGenerateSingleDescription = async (assetId) => {
        await runMetaDescriptionGeneration('selected', [Number(assetId)]);
    };

    const handleQuickAdultos = async (assetId) => {
        const id = Number(assetId);
        if (!Number.isFinite(id) || id <= 0) return;
        setMetaBusy(true);
        try {
            const row = findAssetInAllSources(id);
            const currentCategories = Array.isArray(row?.categories) ? row.categories : [];
            const currentTags = Array.isArray(row?.tags) ? row.tags : [];

            // Categorías a guardar (añadir 'adultos' si no existe)
            const nextCategories = [...currentCategories];
            if (!nextCategories.some(c => String(c.slug || c.name || '').toLowerCase() === 'adultos')) {
                nextCategories.push({ slug: 'adultos', name: 'adultos' });
            }
            const categoriesPayload = normalizeMetaCategoryList(nextCategories)
                .map((c) => String(c.slug || c.name || '').trim().toLowerCase())
                .filter(Boolean);

            // Tags a guardar (añadir 'adultos' si no existe)
            const nextTags = [...currentTags];
            if (!nextTags.some(t => String(t.slug || t.name || '').toLowerCase() === 'adultos')) {
                nextTags.push({ slug: 'adultos', name: 'adultos' });
            }
            const tagsPayload = normalizeMetaTagList(nextTags)
                .map((t) => String(t.slug || t.name || '').trim().toLowerCase())
                .filter(Boolean);

            // Guardar en base de datos
            const res = await http.putData('/assets', id, {
                categories: categoriesPayload,
                tags: tagsPayload,
            });

            const updatedAsset = res.data;
            if (updatedAsset) {
                // Actualizar draft
                setMetaDraftMap((prev) => {
                    const next = { ...prev };
                    const current = next[id] || {
                        id,
                        title: String(row?.title || ''),
                        titleEn: String(row?.titleEn || ''),
                        description: String(row?.description || ''),
                        descriptionEn: String(row?.descriptionEn || ''),
                        categories: normalizeMetaCategoryList(row?.categories),
                        tags: normalizeMetaTagList(row?.tags),
                    };
                    next[id] = {
                        ...current,
                        categories: normalizeMetaCategoryList(updatedAsset.categories),
                        tags: normalizeMetaTagList(updatedAsset.tags),
                    };
                    return next;
                });

                // Actualizar assets
                setAssets((prev) =>
                    (Array.isArray(prev) ? prev : []).map((item) =>
                        Number(item?.id || 0) === id
                            ? {
                                  ...item,
                                  categories: updatedAsset.categories,
                                  tags: updatedAsset.tags,
                              }
                            : item
                    )
                );
            }

            await fireAlert({
                toast: true,
                position: 'top',
                icon: 'success',
                title: `Asset #${id} marcado como adultos`,
                showConfirmButton: false,
                timer: 1700,
                timerProgressBar: true,
                zIndex: 2000,
                width: '400px',
            });
        } catch (e) {
            console.error('Error al marcar adultos:', e);
            await errorAlert('Error', e?.response?.data?.message || 'No se pudo marcar como adultos');
        } finally {
            setMetaBusy(false);
        }
    };

    const handleGenerateMetaAll = async (assetId) => {
        const id = Number(assetId);
        if (!Number.isFinite(id) || id <= 0) return;
        setMetaBusy(true);
        try {
            const res = await http.postData('/assets/meta/generate-all', { assetId: id });
            const { success, asset: updatedAsset } = res.data || {};
            if (success && updatedAsset) {
                // Actualizar draft
                setMetaDraftMap((prev) => {
                    const next = { ...prev };
                    next[id] = {
                        id,
                        title: String(updatedAsset.title || ''),
                        titleEn: String(updatedAsset.titleEn || ''),
                        description: String(updatedAsset.description || ''),
                        descriptionEn: String(updatedAsset.descriptionEn || ''),
                        categories: normalizeMetaCategoryList(updatedAsset.categories),
                        tags: normalizeMetaTagList(updatedAsset.tags),
                    };
                    return next;
                });

                // Actualizar listado de assets
                setAssets((prev) =>
                    (Array.isArray(prev) ? prev : []).map((item) =>
                        Number(item?.id || 0) === id
                            ? {
                                  ...item,
                                  title: updatedAsset.title,
                                  titleEn: updatedAsset.titleEn,
                                  description: updatedAsset.description,
                                  descriptionEn: updatedAsset.descriptionEn,
                                  categories: updatedAsset.categories,
                                  tags: updatedAsset.tags,
                              }
                            : item
                    )
                );

                await fireAlert({
                    toast: true,
                    position: 'top',
                    icon: 'success',
                    title: `Metadata autogenerada y guardada para #${id}`,
                    showConfirmButton: false,
                    timer: 1700,
                    timerProgressBar: true,
                    zIndex: 2000,
                    width: '400px',
                });
            } else {
                await errorAlert('Error', 'No se pudo autogenerar la metadata');
            }
        } catch (e) {
            console.error('Error al autogenerar metadata:', e);
            await errorAlert('Error', e?.response?.data?.message || 'No se pudo autogenerar la metadata');
        } finally {
            setMetaBusy(false);
        }
    };

    const openMetaProfiles = (assetId) => {
        const id = Number(assetId);
        if (!Number.isFinite(id) || id <= 0) return;
        setMetaProfileAssetId(id);
        setMetaProfilesOpen(true);
    };

    const selectedMetaRowForProfiles = useMemo(() => {
        const id = Number(metaProfileAssetId || 0);
        if (!Number.isFinite(id) || id <= 0) return null;
        const draft = metaDraftMap[id];
        if (!draft) return null;
        return {
            categorias: normalizeMetaCategoryList(draft.categories).map(
                (c) => ({
                    slug: c.slug,
                    name: c.name,
                }),
            ),
            tags: normalizeMetaTagList(draft.tags).map((t) => ({
                slug: t.slug,
                name: t.name,
            })),
        };
    }, [
        metaProfileAssetId,
        metaDraftMap,
        normalizeMetaCategoryList,
        normalizeMetaTagList,
    ]);

    const applyMetaProfile = (profile) => {
        const id = Number(metaProfileAssetId || 0);
        if (!Number.isFinite(id) || id <= 0) return;

        const profileCategorySlugs = Array.isArray(profile?.categories)
            ? profile.categories
                  .map((s) =>
                      String(s || '')
                          .trim()
                          .toLowerCase(),
                  )
                  .filter(Boolean)
            : [];
        const profileTagSlugs = Array.isArray(profile?.tags)
            ? profile.tags
                  .map((s) =>
                      String(s || '')
                          .trim()
                          .toLowerCase(),
                  )
                  .filter(Boolean)
            : [];

        const nextCategories = profileCategorySlugs.map((slug) => {
            const found = categories.find(
                (c) => String(c?.slug || '').toLowerCase() === slug,
            );
            if (found)
                return { id: found.id, slug: found.slug, name: found.name };
            return { slug, name: slug };
        });

        const nextTags = profileTagSlugs.map((slug) => {
            const found = allTags.find(
                (t) => String(t?.slug || '').toLowerCase() === slug,
            );
            if (found)
                return { id: found.id, slug: found.slug, name: found.name };
            return { slug, name: slug };
        });

        updateMetaDraft(id, {
            categories: normalizeMetaCategoryList(nextCategories),
            tags: normalizeMetaTagList(nextTags),
        });
        setMetaSelectedMap((prev) => ({ ...prev, [id]: true }));
        setMetaProfilesOpen(false);
        setMetaProfileAssetId(null);
    };

    // Handler: limpiar todos los filtros
    const handleClearAllFilters = () => {
        setQ('');
        setSearchTerm('');
        setAccountQ('');
        setAssetIdQ('');
        setCategoryFilter(null);
        setTagFilter(null);
        setStatusFilter('');
        setSeoFilter('');
        setShowFreeOnly(false);
        setPageIndex(0);
        setRefreshTick((n) => n + 1);
    };

    // Handler: buscar por ID (movido fuera de MRT)
    const handleBuscarId = async () => {
        const idNum = Number(assetIdQ);
        if (!Number.isFinite(idNum) || idNum <= 0) return;
        try {
            setLoading(true);
            const res = await http.getData(`/assets/${idNum}`);
            const item = res.data;
            setAssets(item ? [item] : []);
            setRowCount(item ? 1 : 0);
            setPageIndex(0);
        } catch (e) {
            setAssets([]);
            setRowCount(0);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <div className="p-3 mb-5">
                <h1 className="dashboard-title mb-3">Assets & AI Tools</h1>

                {/* Toolbar global compartido entre STL-LIST y META-SEO */}
                <Box sx={{ mb: 2 }}>
                    <ToolbarBusqueda
                        q={q}
                        setQ={setQ}
                        onBuscar={() => {
                            setSearchTerm(q);
                            setPageIndex(0);
                            setShowFreeOnly(false);
                        }}
                        accountQ={accountQ}
                        setAccountQ={setAccountQ}
                        onBuscarCuenta={() => {
                            setSearchTerm('');
                            setPageIndex(0);
                            setShowFreeOnly(false);
                            setRefreshTick((n) => n + 1);
                        }}
                        assetIdQ={assetIdQ}
                        setAssetIdQ={setAssetIdQ}
                        showFreeOnly={showFreeOnly}
                        onToggleFreeOnly={() => {
                            setShowFreeOnly((v) => !v);
                            setPageIndex(0);
                        }}
                        onBuscarId={handleBuscarId}
                        categories={categories}
                        allTags={allTags}
                        categoryFilter={categoryFilter}
                        setCategoryFilter={(v) => { setCategoryFilter(v); setPageIndex(0); }}
                        tagFilter={tagFilter}
                        setTagFilter={(v) => { setTagFilter(v); setPageIndex(0); }}
                        statusFilter={statusFilter}
                        setStatusFilter={(v) => { setStatusFilter(v); setPageIndex(0); }}
                        seoFilter={seoFilter}
                        setSeoFilter={(v) => { setSeoFilter(v); setPageIndex(0); }}
                        onClearAll={handleClearAllFilters}
                    />
                </Box>

                <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                    mb: 2,
                    bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'rgba(30,30,30,0.95)'
                            : 'background.paper',
                    borderRadius: 2,
                    boxShadow: (theme) =>
                        theme.palette.mode === 'dark'
                            ? '0 2px 8px #0008'
                            : '0 2px 8px #8882',
                }}
                TabIndicatorProps={{
                    style: { background: '#7c4dff' },
                }}
            >
                <Tab
                    label={`STL-LIST (${rowCount})`}
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === 'dark' ? '#fff' : undefined,
                    }}
                />
                <Tab
                    label="SIMILAR-VISUAL"
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === 'dark' ? '#fff' : undefined,
                    }}
                />
                <Tab
                    label={`META-SEO (${rowCount})`}
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === 'dark' ? '#fff' : undefined,
                    }}
                />
            </Tabs>
            {tab === 0 && (
                <AssetsListTab
                    loading={loading}
                    table={table}
                    // unified modal
                    assetModalOpen={assetModalOpen}
                    onCloseAssetModal={closeAssetModal}
                    detail={detail}
                    selected={selected}
                    imgUrl={imgUrl}
                    formatMBfromB={formatMBfromB}
                    loadingDetail={loadingDetail}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    categories={categories}
                    allTags={allTags}
                    editImageFiles={editImageFiles}
                    setEditImageFiles={setEditImageFiles}
                    editPreviewIndex={editPreviewIndex}
                    setEditPreviewIndex={setEditPreviewIndex}
                    fileInputRef={fileInputRef}
                    onSelectFiles={onSelectFiles}
                    onOpenFilePicker={onOpenFilePicker}
                    onPrev={onPrev}
                    onNext={onNext}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onRemove={onRemove}
                    onSelectPreview={onSelectPreview}
                    handleSaveEdit={handleSaveEdit}
                    // navigation
                    onPrevAsset={() => onNavigateWithDirtyCheck('prev')}
                    onNextAsset={() => onNavigateWithDirtyCheck('next')}
                    assetModalIndex={assetModalIndex}
                    totalAssets={filtered.length}
                    onNavigateWithDirtyCheck={onNavigateWithDirtyCheck}
                />
            )}
            {tab === 1 && (
                <VisualSimilarTab
                    analyzeVisualSimilarAssets={analyzeVisualSimilarAssets}
                    visualSimilarLoading={visualSimilarLoading}
                    visualSimilarThreshold={visualSimilarThreshold}
                    setVisualSimilarThreshold={setVisualSimilarThreshold}
                    visualSimilarGroups={visualSimilarGroups}
                    ignoredPairsCount={Object.keys(similarIgnoredPairMap).length}
                    selectedVisualSimilarIds={Object.keys(visualSimilarSelectedMap)}
                    formatMBfromB={formatMBfromB}
                    selectedVisualSimilarBytes={Object.keys(visualSimilarSelectedMap).reduce(
                        (acc, id) => {
                            const group = visualSimilarGroups.find((g) =>
                                g.items.some(
                                    (i) => String(i?.asset?.id) === String(id),
                                ),
                            );
                            const size = Number(
                                group?.items?.find(
                                    (i) => String(i?.asset?.id) === String(id),
                                )?.asset?.archiveSize,
                            );
                            return acc + (Number.isFinite(size) ? size : 0);
                        },
                        0,
                    )}
                    reactivateVisualDismissedGroups={reactivateVisualDismissedGroups}
                    visualSimilarProgress={visualSimilarProgress}
                    visualSimilarError={visualSimilarError}
                    visualSimilarPrimaryMap={visualSimilarPrimaryMap}
                    selectVisualGroupDuplicates={selectVisualGroupDuplicates}
                    dismissVisualSimilarGroup={dismissVisualSimilarGroup}
                    visualSimilarSelectedMap={visualSimilarSelectedMap}
                    imgUrl={imgUrl}
                    openSimilarViewer={openSimilarViewer}
                    setVisualPrimaryInGroup={setVisualPrimaryInGroup}
                    toggleVisualSimilarSelection={toggleVisualSimilarSelection}
                    selectedVisualSimilarAssets={Object.keys(visualSimilarSelectedMap)
                        .map((id) => {
                            const group = visualSimilarGroups.find((g) =>
                                g.items.some(
                                    (i) => String(i?.asset?.id) === String(id),
                                ),
                            );
                            return group?.items?.find(
                                (i) => String(i?.asset?.id) === String(id),
                            )?.asset;
                        })
                        .filter(Boolean)}
                    visualSimilarDeleteProgress={visualSimilarDeleteProgress}
                    handleDeleteSelectedVisualSimilar={handleDeleteSelectedVisualSimilar}
                    clearVisualSimilarSelection={clearVisualSimilarSelection}
                    onSetFirstImage={handleMetaSetFirstImage}
                    onDeleteImage={handleMetaDeleteImage}
                    metaBusy={metaBusy}
                    loading={loading}
                />
            )}
            {tab === 2 && (
                <MetaSeoTab
                    metaReviewMode={metaReviewMode}
                    setMetaReviewMode={setMetaReviewMode}
                    metaBusy={metaBusy}
                    loading={loading}
                    handleGenerateAllDescriptions={
                        handleGenerateAllDescriptions
                    }
                    handleGenerateMissingDescriptions={
                        handleGenerateMissingDescriptions
                    }
                    handleGenerateSelectedDescriptions={
                        handleGenerateSelectedDescriptions
                    }
                    runMetaTagsGenerationForSelected={
                        runMetaTagsGenerationForSelected
                    }
                    saveMetaSelected={saveMetaSelected}
                    metaSelectedIds={metaSelectedIds}
                    metaRows={metaRows}
                    rowCount={rowCount}
                    allVisibleMetaSelected={allVisibleMetaSelected}
                    toggleMetaSelectAllVisible={toggleMetaSelectAllVisible}
                    allVisibleMetaIds={allVisibleMetaIds}
                    metaScrollRef={metaScrollRef}
                    paddingTop={paddingTop}
                    virtualItems={virtualItems}
                    metaExpandedImagesMap={metaExpandedImagesMap}
                    metaDraftMap={metaDraftMap}
                    normalizeMetaCategoryList={normalizeMetaCategoryList}
                    normalizeMetaTagList={normalizeMetaTagList}
                    metaSelectedMap={metaSelectedMap}
                    metaVirtualizer={metaVirtualizer}
                    categories={categories}
                    allTags={allTags}
                    toggleMetaSelect={toggleMetaSelect}
                    setMetaImagePreview={setMetaImagePreview}
                    imgUrl={imgUrl}
                    handleMetaSetFirstImage={handleMetaSetFirstImage}
                    handleMetaDeleteImage={handleMetaDeleteImage}
                    toggleMetaExpandedImages={toggleMetaExpandedImages}
                    updateMetaDraft={updateMetaDraft}
                    openMetaProfiles={openMetaProfiles}
                    handleGenerateSingleDescription={
                        handleGenerateSingleDescription
                    }
                    onQuickAdultos={handleQuickAdultos}
                    handleGenerateMetaAll={handleGenerateMetaAll}
                    handleSaveMetaRow={handleSaveMetaRow}
                    onDeleteAsset={handleDelete}
                    paddingBottom={paddingBottom}
                    pageIndex={metaPageIndex}
                    setPageIndex={setMetaPageIndex}
                    pageSize={metaPageSize}
                    setPageSize={setMetaPageSize}
                    metaPageOptions={metaPageOptions}
                    metaTotalPages={metaTotalPages}
                    syncMultimodalVectorsOpen={syncMultimodalVectorsOpen}
                    setSyncMultimodalVectorsOpen={setSyncMultimodalVectorsOpen}
                    metaProfilesOpen={metaProfilesOpen}
                    setMetaProfilesOpen={setMetaProfilesOpen}
                    setMetaProfileAssetId={setMetaProfileAssetId}
                    selectedMetaRowForProfiles={selectedMetaRowForProfiles}
                    applyMetaProfile={applyMetaProfile}
                    metaImagePreview={metaImagePreview}
                />
            )}

            <Dialog
                open={similarViewer.open}
                onClose={closeSimilarViewer}
                maxWidth="lg"
                disableScrollLock={true}
                PaperProps={{
                    sx: {
                        background: 'transparent',
                        boxShadow: 'none',
                        m: 0,
                    },
                }}
            >
                {similarViewer.image && (
                    <Box
                        onClick={closeSimilarViewer}
                        sx={{
                            cursor: 'zoom-out',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            component="img"
                            src={imgUrl(similarViewer.image)}
                            alt="Preview"
                            sx={{
                                maxWidth: '100%',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: 2,
                            }}
                        />
                    </Box>
                )}
            </Dialog>
            </div>
        </ThemeProvider>
    );
}
