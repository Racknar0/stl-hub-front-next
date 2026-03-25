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
    LinearProgress,
    Link as MUILink,
    Box,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Button,
    Autocomplete,
    FormControlLabel,
    Switch,
    Tabs,
    Tab,
    Paper,
    Slider,
    Checkbox,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Tooltip,
    MenuItem,
} from '@mui/material';
import {
    MaterialReactTable,
    useMaterialReactTable,
} from 'material-react-table';
import LinkIcon from '@mui/icons-material/Link';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import SellIcon from '@mui/icons-material/Sell';
import SaveIcon from '@mui/icons-material/Save';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ImagesSection from './uploader/ImagesSection';
import HttpService from '@/services/HttpService';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { successAlert, errorAlert, confirmAlert, fireAlert } from '@/helpers/alerts';
import CachedIcon from '@mui/icons-material/Cached';

// Nuevos componentes
import ToolbarBusqueda from './componentes/ToolbarBusqueda';
import ModalDetalle from './componentes/ModalDetalle';
import ModalEditar from './componentes/ModalEditar';
import ModalResultadosDrop from './componentes/ModalResultadosDrop';
import ProfilesModal from '../upload-batch/ProfilesModal';

// Mapea estado a color de chip
const statusColor = (s) =>
    ({
        DRAFT: 'default',
        PROCESSING: 'info',
        PUBLISHED: 'success',
        FAILED: 'error',
    })[s] || 'default';

// Helper para normalizar a slug
const slugify = (s) =>
    String(s || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-\s_]+/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);

export default function AssetsAdminPage() {
    const SIMILAR_GROUPS_PAGE_SIZE = 20;

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
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [rowCount, setRowCount] = useState(0);
    const [refreshTick, setRefreshTick] = useState(0);
    // filtro plan (se mantiene en backend, pero aquí no exponemos UI adicional salvo búsqueda normal)
    const [showFreeOnly, setShowFreeOnly] = useState(false);

    // Estado: modales
    const [previewOpen, setPreviewOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [dropResultsOpen, setDropResultsOpen] = useState(false);
    const [dropFound, setDropFound] = useState([]);
    const [dropNotFound, setDropNotFound] = useState([]);

    // Estado: selección actual y formularios
    const [selected, setSelected] = useState(null);
    // Edit form sin categoría legacy
    const [editForm, setEditForm] = useState({
        title: '',
        titleEn: '',
        categories: [],
        tags: [],
        isPremium: false,
    });
    // Detalle bilingüe
    const [detail, setDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Catálogo meta
    const [categories, setCategories] = useState([]);
    const [allTags, setAllTags] = useState([]);

    // Estado: imágenes del editor
    const [tab, setTab] = useState(0);
    const [metaDraftMap, setMetaDraftMap] = useState({});
    const [metaSelectedMap, setMetaSelectedMap] = useState({});
    const [metaBusy, setMetaBusy] = useState(false);
    const [metaImagePreview, setMetaImagePreview] = useState(null);
    const [metaProfilesOpen, setMetaProfilesOpen] = useState(false);
    const [metaProfileAssetId, setMetaProfileAssetId] = useState(null);

    // Virtualización nativa para META-SEO
    const metaScrollRef = useRef(null);
    const [metaScrollTop, setMetaScrollTop] = useState(0);

    const [similarThreshold, setSimilarThreshold] = useState(88);
    const [similarLoading, setSimilarLoading] = useState(false);
    const [similarError, setSimilarError] = useState('');
    const [similarProgress, setSimilarProgress] = useState({
        done: 0,
        total: 0,
    });
    const [similarGroups, setSimilarGroups] = useState([]);
    const [similarVisibleCount, setSimilarVisibleCount] = useState(
        SIMILAR_GROUPS_PAGE_SIZE,
    );
    const [similarSelectedMap, setSimilarSelectedMap] = useState({});
    const [similarPrimaryMap, setSimilarPrimaryMap] = useState({});
    const [similarIgnoredPairMap, setSimilarIgnoredPairMap] = useState({});
    const [similarBackfill, setSimilarBackfill] = useState({
        running: false,
        startedAt: null,
        finishedAt: null,
        totalAssets: 0,
        processedAssets: 0,
        totalImages: 0,
        processedImages: 0,
        hashedRows: 0,
        failedImages: 0,
        currentAssetId: null,
        lastError: null,
    });
    const [similarHashStats, setSimilarHashStats] = useState({
        assetsTotal: 0,
        hashRows: 0,
    });
    const [similarDeleteProgress, setSimilarDeleteProgress] = useState({
        running: false,
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        currentAssetId: null,
    });
    const [nameSimilarThreshold, setNameSimilarThreshold] = useState(86);
    const [nameSimilarLoading, setNameSimilarLoading] = useState(false);
    const [nameSimilarError, setNameSimilarError] = useState('');
    const [nameSimilarProgress, setNameSimilarProgress] = useState({
        done: 0,
        total: 0,
    });
    const [nameSimilarGroups, setNameSimilarGroups] = useState([]);
    const [nameSimilarVisibleCount, setNameSimilarVisibleCount] = useState(
        SIMILAR_GROUPS_PAGE_SIZE,
    );
    const [nameSimilarSelectedMap, setNameSimilarSelectedMap] = useState({});
    const [nameSimilarPrimaryMap, setNameSimilarPrimaryMap] = useState({});
    const [nameSimilarDeleteProgress, setNameSimilarDeleteProgress] = useState({
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
    const hashBackfillPollRef = useRef(null);
    const similarLoadMoreRef = useRef(null);
    const nameSimilarLoadMoreRef = useRef(null);

    // (Randomizar freebies se movió a otra pantalla del dashboard)

    // Cargar catálogos (categorías y tags)
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

    useEffect(() => {
        return () => {
            if (hashBackfillPollRef.current) {
                clearInterval(hashBackfillPollRef.current);
                hashBackfillPollRef.current = null;
            }
        };
    }, []);

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

    const normalizeBase = (name) =>
        String(name || '')
            .replace(/^.*[\\/]/, '')
            .replace(/\.[^/.]+$/, '')
            .trim()
            .toLowerCase();

    const titleSimilarity = (left, right) => {
        const a = slugify(left || '');
        const b = slugify(right || '');
        if (!a || !b) return 0;
        if (a === b) return 1;

        const toBigrams = (value) => {
            const arr = [];
            for (let i = 0; i < value.length - 1; i += 1)
                arr.push(value.slice(i, i + 2));
            return arr;
        };

        const ag = toBigrams(a);
        const bg = toBigrams(b);
        if (!ag.length || !bg.length) return 0;

        const freq = new Map();
        ag.forEach((g) => freq.set(g, (freq.get(g) || 0) + 1));

        let inter = 0;
        bg.forEach((g) => {
            const count = freq.get(g) || 0;
            if (count > 0) {
                inter += 1;
                freq.set(g, count - 1);
            }
        });

        return (2 * inter) / (ag.length + bg.length);
    };

    const buildSimilarGroups = (items, threshold) => {
        const candidates = Array.from(items || []).filter(
            (item) => Array.isArray(item?.images) && item.images.length > 0,
        );
        const buckets = new Map();

        candidates.forEach((item) => {
            const raw = item?.title || item?.archiveName || '';
            const normalized = slugify(raw).replace(/-\d+$/, '');
            const tokenKey = normalized
                .split('-')
                .filter(Boolean)
                .slice(0, 3)
                .join('-');
            const key = tokenKey || normalized;
            if (!key) return;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(item);
        });

        const groups = [];
        let idx = 1;

        buckets.forEach((bucket, key) => {
            if (!Array.isArray(bucket) || bucket.length < 2) return;
            const reference = bucket[0];
            const scored = bucket.map((asset) => {
                const similarity =
                    asset.id === reference.id
                        ? 100
                        : Number(
                              (
                                  titleSimilarity(
                                      reference?.title ||
                                          reference?.archiveName,
                                      asset?.title || asset?.archiveName,
                                  ) * 100
                              ).toFixed(2),
                          );
                const distance = Math.max(
                    0,
                    Math.round(((100 - similarity) / 100) * 64),
                );
                return { asset, similarity, distance };
            });

            const filtered = scored.filter(
                (entry) =>
                    entry.asset?.id === reference.id ||
                    entry.similarity >= threshold,
            );
            if (filtered.length < 2) return;

            const confidence = Number(
                (
                    filtered.reduce(
                        (acc, entry) => acc + Number(entry.similarity || 0),
                        0,
                    ) / filtered.length
                ).toFixed(2),
            );
            groups.push({
                id: `similar-${idx}`,
                signature: key,
                confidence,
                items: filtered.sort(
                    (a, b) =>
                        Number(b.similarity || 0) - Number(a.similarity || 0),
                ),
            });
            idx += 1;
        });

        return groups.sort(
            (a, b) => Number(b.confidence || 0) - Number(a.confidence || 0),
        );
    };

    const buildNameSimilarGroups = (items, threshold) => {
        const getNameText = (item) =>
            String(item?.title || item?.archiveName || item?.slug || '').trim();
        const candidates = Array.from(items || []).filter(
            (item) => getNameText(item).length >= 3,
        );
        const buckets = new Map();

        candidates.forEach((item) => {
            const raw = getNameText(item);
            const normalized = slugify(raw);
            if (!normalized) return;

            const tokens = normalized.split('-').filter(Boolean);
            const head = tokens.slice(0, 3).join('-');
            const compact = normalized.replace(/\d+/g, '');
            const key = (head || compact || normalized).slice(0, 36);
            if (!key) return;

            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(item);
        });

        const groups = [];
        let idx = 1;

        buckets.forEach((bucket, key) => {
            if (!Array.isArray(bucket) || bucket.length < 2) return;

            const limited = bucket
                .slice()
                .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))
                .slice(0, 220);

            const byId = new Map();
            limited.forEach((item) => {
                const id = Number(item?.id);
                if (Number.isFinite(id) && id > 0) byId.set(id, item);
            });

            const adjacency = new Map();
            byId.forEach((_, id) => adjacency.set(id, new Set()));
            const similarityCache = new Map();
            const pairKey = (a, b) => {
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

            const entries = Array.from(byId.entries());
            for (let i = 0; i < entries.length; i += 1) {
                for (let j = i + 1; j < entries.length; j += 1) {
                    const [idA, assetA] = entries[i];
                    const [idB, assetB] = entries[j];
                    const similarity = Number(
                        (
                            titleSimilarity(
                                getNameText(assetA),
                                getNameText(assetB),
                            ) * 100
                        ).toFixed(2),
                    );
                    if (similarity < threshold) continue;

                    const keyPair = pairKey(idA, idB);
                    if (keyPair) similarityCache.set(keyPair, similarity);
                    adjacency.get(idA)?.add(idB);
                    adjacency.get(idB)?.add(idA);
                }
            }

            const visited = new Set();
            const ids = Array.from(byId.keys());
            ids.forEach((seedId) => {
                if (visited.has(seedId)) return;

                const stack = [seedId];
                const componentIds = [];
                while (stack.length) {
                    const current = stack.pop();
                    if (!Number.isFinite(current) || visited.has(current))
                        continue;
                    visited.add(current);
                    componentIds.push(current);
                    const nexts = adjacency.get(current) || new Set();
                    nexts.forEach((nextId) => {
                        if (!visited.has(nextId)) stack.push(nextId);
                    });
                }

                if (componentIds.length < 2) return;
                const componentAssets = componentIds
                    .map((id) => byId.get(id))
                    .filter(Boolean)
                    .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
                if (componentAssets.length < 2) return;

                const primary = componentAssets[0];
                const primaryId = Number(primary?.id);
                const groupItems = componentAssets.map((asset) => {
                    const id = Number(asset?.id);
                    let similarity = 100;
                    if (id !== primaryId) {
                        const k = pairKey(id, primaryId);
                        similarity = Number(similarityCache.get(k));
                        if (!Number.isFinite(similarity)) {
                            similarity = Number(
                                (
                                    titleSimilarity(
                                        getNameText(primary),
                                        getNameText(asset),
                                    ) * 100
                                ).toFixed(2),
                            );
                        }
                    }
                    const distance = Math.max(
                        0,
                        Math.round(((100 - similarity) / 100) * 64),
                    );
                    return { asset, similarity, distance };
                });

                const confidence = Number(
                    (
                        groupItems.reduce(
                            (acc, entry) => acc + Number(entry.similarity || 0),
                            0,
                        ) / groupItems.length
                    ).toFixed(2),
                );
                groups.push({
                    id: `name-similar-${idx}`,
                    signature: `${key}-${primaryId}-${groupItems.length}`,
                    confidence,
                    items: groupItems.sort(
                        (a, b) =>
                            Number(b.similarity || 0) -
                            Number(a.similarity || 0),
                    ),
                });
                idx += 1;
            });
        });

        return groups.sort((a, b) => {
            if (Number(b.confidence || 0) !== Number(a.confidence || 0))
                return Number(b.confidence || 0) - Number(a.confidence || 0);
            return Number(b.items?.length || 0) - Number(a.items?.length || 0);
        });
    };

    const similarAssetIndex = useMemo(() => {
        const map = new Map();
        similarGroups.forEach((group) => {
            group.items.forEach((entry) => {
                if (entry?.asset?.id)
                    map.set(Number(entry.asset.id), entry.asset);
            });
        });
        return map;
    }, [similarGroups]);

    const visibleSimilarGroups = useMemo(() => {
        return similarGroups.slice(
            0,
            Math.max(0, Number(similarVisibleCount) || 0),
        );
    }, [similarGroups, similarVisibleCount]);

    const hasMoreSimilarGroups = useMemo(() => {
        return visibleSimilarGroups.length < similarGroups.length;
    }, [visibleSimilarGroups.length, similarGroups.length]);

    const loadMoreSimilarGroups = useCallback(() => {
        setSimilarVisibleCount((prev) => {
            const next = Number(prev || 0) + SIMILAR_GROUPS_PAGE_SIZE;
            return Math.min(next, similarGroups.length);
        });
    }, [similarGroups.length]);

    const selectedSimilarIds = useMemo(() => {
        return Object.entries(similarSelectedMap)
            .filter(([, value]) => !!value)
            .map(([id]) => Number(id))
            .filter((id) => Number.isFinite(id));
    }, [similarSelectedMap]);

    const selectedSimilarAssets = useMemo(() => {
        return selectedSimilarIds
            .map((id) => similarAssetIndex.get(id))
            .filter(Boolean);
    }, [selectedSimilarIds, similarAssetIndex]);

    const selectedSimilarBytes = useMemo(() => {
        return selectedSimilarAssets.reduce(
            (acc, item) =>
                acc + Number(item?.fileSizeB ?? item?.archiveSizeB ?? 0),
            0,
        );
    }, [selectedSimilarAssets]);

    const nameSimilarAssetIndex = useMemo(() => {
        const map = new Map();
        nameSimilarGroups.forEach((group) => {
            group.items.forEach((entry) => {
                if (entry?.asset?.id)
                    map.set(Number(entry.asset.id), entry.asset);
            });
        });
        return map;
    }, [nameSimilarGroups]);

    const visibleNameSimilarGroups = useMemo(() => {
        return nameSimilarGroups.slice(
            0,
            Math.max(0, Number(nameSimilarVisibleCount) || 0),
        );
    }, [nameSimilarGroups, nameSimilarVisibleCount]);

    const hasMoreNameSimilarGroups = useMemo(() => {
        return visibleNameSimilarGroups.length < nameSimilarGroups.length;
    }, [visibleNameSimilarGroups.length, nameSimilarGroups.length]);

    const loadMoreNameSimilarGroups = useCallback(() => {
        setNameSimilarVisibleCount((prev) => {
            const next = Number(prev || 0) + SIMILAR_GROUPS_PAGE_SIZE;
            return Math.min(next, nameSimilarGroups.length);
        });
    }, [nameSimilarGroups.length]);

    const selectedNameSimilarIds = useMemo(() => {
        return Object.entries(nameSimilarSelectedMap)
            .filter(([, value]) => !!value)
            .map(([id]) => Number(id))
            .filter((id) => Number.isFinite(id));
    }, [nameSimilarSelectedMap]);

    const selectedNameSimilarAssets = useMemo(() => {
        return selectedNameSimilarIds
            .map((id) => nameSimilarAssetIndex.get(id))
            .filter(Boolean);
    }, [selectedNameSimilarIds, nameSimilarAssetIndex]);

    const selectedNameSimilarBytes = useMemo(() => {
        return selectedNameSimilarAssets.reduce(
            (acc, item) =>
                acc + Number(item?.fileSizeB ?? item?.archiveSizeB ?? 0),
            0,
        );
    }, [selectedNameSimilarAssets]);

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

    const loadIgnoredPairs = async () => {
        try {
            const res = await http.getData('/assets/similar/ignored-pairs');
            const items = Array.isArray(res?.data?.items) ? res.data.items : [];
            const map = {};
            items.forEach((item) => {
                const key = buildPairKey(item?.assetAId, item?.assetBId);
                if (key) map[key] = true;
            });
            setSimilarIgnoredPairMap(map);
            return map;
        } catch (e) {
            return { ...(similarIgnoredPairMap || {}) };
        }
    };

    const loadHashStats = async () => {
        try {
            const res = await http.getData('/assets/similar/hash/stats');
            const data = res?.data || {};
            setSimilarHashStats({
                assetsTotal: Number(data?.assetsTotal || 0),
                hashRows: Number(data?.hashRows || 0),
            });
            if (data?.backfill && typeof data.backfill === 'object') {
                setSimilarBackfill((prev) => ({ ...prev, ...data.backfill }));
            }
        } catch {}
    };

    const loadBackfillStatus = async () => {
        try {
            const res = await http.getData(
                '/assets/similar/hash/backfill-status',
            );
            const data = res?.data || {};
            setSimilarBackfill((prev) => ({ ...prev, ...data }));
            return data;
        } catch {
            return null;
        }
    };

    const stopBackfillPolling = () => {
        if (hashBackfillPollRef.current) {
            clearInterval(hashBackfillPollRef.current);
            hashBackfillPollRef.current = null;
        }
    };

    const startBackfillPolling = () => {
        stopBackfillPolling();
        hashBackfillPollRef.current = setInterval(async () => {
            const state = await loadBackfillStatus();
            if (state && !state.running) {
                stopBackfillPolling();
                await loadHashStats();
            }
        }, 3000);
    };

    const startHashBackfill = async () => {
        try {
            await http.postData('/assets/similar/hash/backfill', {});
            await loadBackfillStatus();
            startBackfillPolling();
        } catch (e) {
            await errorAlert(
                'Error',
                e?.response?.data?.message ||
                    'No se pudo iniciar el backfill de hashes',
            );
        }
    };

    const analyzeSimilarAssets = async (options = {}) => {
        const ignoreDismissed = !!options?.ignoreDismissed;
        try {
            setSimilarLoading(true);
            setSimilarError('');
            setSimilarGroups([]);
            setSimilarVisibleCount(SIMILAR_GROUPS_PAGE_SIZE);
            setSimilarSelectedMap({});
            setSimilarPrimaryMap({});
            setSimilarProgress({ done: 0, total: 0 });

            const pageSize = 1000;
            const allItems = [];
            let pageIndexScan = 0;
            let totalScan = 0;

            while (true) {
                const res = await http.getData(
                    `/assets?pageIndex=${pageIndexScan}&pageSize=${pageSize}`,
                );
                const payload = res.data;

                if (payload && Array.isArray(payload.items)) {
                    const chunk = payload.items;
                    if (!Number(totalScan)) {
                        totalScan = Number(payload.total) || chunk.length;
                    }

                    allItems.push(...chunk);
                    setSimilarProgress({
                        done: allItems.length,
                        total: totalScan || allItems.length,
                    });

                    if (!chunk.length || allItems.length >= totalScan) break;
                    pageIndexScan += 1;
                    if (pageIndexScan > 500) break;
                    continue;
                }

                if (Array.isArray(payload)) {
                    allItems.push(...payload);
                    setSimilarProgress({
                        done: allItems.length,
                        total: allItems.length,
                    });
                }
                break;
            }

            const allGroups = buildSimilarGroups(allItems, similarThreshold);
            const ignoredMap = ignoreDismissed ? {} : await loadIgnoredPairs();
            const groups = allGroups.filter((group) => {
                const ids = Array.isArray(group?.items)
                    ? group.items
                          .map((entry) => Number(entry?.asset?.id))
                          .filter((n) => Number.isFinite(n) && n > 0)
                    : [];
                if (ids.length < 2) return false;

                let hasVisiblePair = false;
                for (let i = 0; i < ids.length; i += 1) {
                    for (let j = i + 1; j < ids.length; j += 1) {
                        const key = buildPairKey(ids[i], ids[j]);
                        if (key && !ignoredMap[key]) {
                            hasVisiblePair = true;
                            break;
                        }
                    }
                    if (hasVisiblePair) break;
                }
                return hasVisiblePair;
            });
            setSimilarGroups(groups);
            setSimilarVisibleCount(
                Math.min(SIMILAR_GROUPS_PAGE_SIZE, groups.length || 0),
            );

            const primaries = {};
            groups.forEach((group) => {
                if (group?.items?.[0]?.asset?.id)
                    primaries[group.id] = Number(group.items[0].asset.id);
            });
            setSimilarPrimaryMap(primaries);
        } catch (e) {
            console.error('Error analizando similares', e);
            setSimilarError(
                e?.response?.data?.message ||
                    'No se pudieron analizar los assets para similitud.',
            );
        } finally {
            setSimilarLoading(false);
        }
    };

    const toggleSimilarSelection = (assetId) => {
        const id = Number(assetId);
        if (!Number.isFinite(id)) return;
        setSimilarSelectedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const setPrimaryInGroup = (groupId, assetId) => {
        const id = Number(assetId);
        if (!groupId || !Number.isFinite(id)) return;
        setSimilarPrimaryMap((prev) => ({ ...prev, [groupId]: id }));
        setSimilarSelectedMap((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const selectGroupDuplicates = (group) => {
        if (!group?.id || !Array.isArray(group?.items)) return;
        const primaryId = Number(
            similarPrimaryMap[group.id] || group.items?.[0]?.asset?.id,
        );
        setSimilarSelectedMap((prev) => {
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

    const clearSimilarSelection = () => setSimilarSelectedMap({});

    const dismissSimilarGroup = async (group) => {
        if (!group?.signature) return;

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
        setSimilarGroups((prev) =>
            prev.filter((g) => g.signature !== group.signature),
        );
        setSimilarPrimaryMap((prev) => {
            const next = { ...prev };
            if (group?.id) delete next[group.id];
            return next;
        });
        setSimilarSelectedMap((prev) => {
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

    const reactivateDismissedGroups = async () => {
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
        await analyzeSimilarAssets({ ignoreDismissed: true });
    };

    const analyzeNameSimilarAssets = async (options = {}) => {
        const ignoreDismissed = !!options?.ignoreDismissed;
        try {
            setNameSimilarLoading(true);
            setNameSimilarError('');
            setNameSimilarGroups([]);
            setNameSimilarVisibleCount(SIMILAR_GROUPS_PAGE_SIZE);
            setNameSimilarSelectedMap({});
            setNameSimilarPrimaryMap({});
            setNameSimilarProgress({ done: 0, total: 0 });

            const pageSize = 1000;
            const allItems = [];
            let pageIndexScan = 0;
            let totalScan = 0;

            while (true) {
                const res = await http.getData(
                    `/assets?pageIndex=${pageIndexScan}&pageSize=${pageSize}`,
                );
                const payload = res.data;

                if (payload && Array.isArray(payload.items)) {
                    const chunk = payload.items;
                    if (!Number(totalScan)) {
                        totalScan = Number(payload.total) || chunk.length;
                    }

                    allItems.push(...chunk);
                    setNameSimilarProgress({
                        done: allItems.length,
                        total: totalScan || allItems.length,
                    });

                    if (!chunk.length || allItems.length >= totalScan) break;
                    pageIndexScan += 1;
                    if (pageIndexScan > 500) break;
                    continue;
                }

                if (Array.isArray(payload)) {
                    allItems.push(...payload);
                    setNameSimilarProgress({
                        done: allItems.length,
                        total: allItems.length,
                    });
                }
                break;
            }

            const allGroups = buildNameSimilarGroups(
                allItems,
                nameSimilarThreshold,
            );
            const ignoredMap = ignoreDismissed ? {} : await loadIgnoredPairs();

            const groups = allGroups.filter((group) => {
                const ids = Array.isArray(group?.items)
                    ? group.items
                          .map((entry) => Number(entry?.asset?.id))
                          .filter((n) => Number.isFinite(n) && n > 0)
                    : [];
                if (ids.length < 2) return false;

                let hasVisiblePair = false;
                for (let i = 0; i < ids.length; i += 1) {
                    for (let j = i + 1; j < ids.length; j += 1) {
                        const key = buildPairKey(ids[i], ids[j]);
                        if (key && !ignoredMap[key]) {
                            hasVisiblePair = true;
                            break;
                        }
                    }
                    if (hasVisiblePair) break;
                }
                return hasVisiblePair;
            });

            setNameSimilarGroups(groups);
            setNameSimilarVisibleCount(
                Math.min(SIMILAR_GROUPS_PAGE_SIZE, groups.length || 0),
            );

            const primaries = {};
            groups.forEach((group) => {
                if (group?.items?.[0]?.asset?.id)
                    primaries[group.id] = Number(group.items[0].asset.id);
            });
            setNameSimilarPrimaryMap(primaries);
        } catch (e) {
            console.error('Error analizando nombres similares', e);
            setNameSimilarError(
                e?.response?.data?.message ||
                    'No se pudieron analizar los assets por nombre.',
            );
        } finally {
            setNameSimilarLoading(false);
        }
    };

    const toggleNameSimilarSelection = (assetId) => {
        const id = Number(assetId);
        if (!Number.isFinite(id)) return;
        setNameSimilarSelectedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const setNamePrimaryInGroup = (groupId, assetId) => {
        const id = Number(assetId);
        if (!groupId || !Number.isFinite(id)) return;
        setNameSimilarPrimaryMap((prev) => ({ ...prev, [groupId]: id }));
        setNameSimilarSelectedMap((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const selectNameGroupDuplicates = (group) => {
        if (!group?.id || !Array.isArray(group?.items)) return;
        const primaryId = Number(
            nameSimilarPrimaryMap[group.id] || group.items?.[0]?.asset?.id,
        );
        setNameSimilarSelectedMap((prev) => {
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

    const clearNameSimilarSelection = () => setNameSimilarSelectedMap({});

    const dismissNameSimilarGroup = async (group) => {
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

        setNameSimilarGroups((prev) => prev.filter((g) => g.id !== group.id));
        setNameSimilarPrimaryMap((prev) => {
            const next = { ...prev };
            delete next[group.id];
            return next;
        });
        setNameSimilarSelectedMap((prev) => {
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

    const reactivateNameDismissedGroups = async () => {
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
        await analyzeNameSimilarAssets({ ignoreDismissed: true });
    };

    const handleDeleteSelectedNameSimilar = async () => {
        if (!selectedNameSimilarIds.length) return;

        const ok = await confirmAlert(
            'Eliminar seleccionados',
            `Se eliminarán ${selectedNameSimilarIds.length} assets seleccionados del resultado por nombre.`,
            'Sí, eliminar',
            'Cancelar',
            'warning',
        );
        if (!ok) return;

        let successCount = 0;
        let failedCount = 0;
        const idsToDelete = [...selectedNameSimilarIds];
        setNameSimilarLoading(true);
        setNameSimilarDeleteProgress({
            running: true,
            total: idsToDelete.length,
            processed: 0,
            success: 0,
            failed: 0,
            currentAssetId: null,
        });

        for (const id of idsToDelete) {
            setNameSimilarDeleteProgress((prev) => ({
                ...prev,
                currentAssetId: id,
            }));
            try {
                await http.deleteData('/assets', id);
                successCount += 1;
                setNameSimilarDeleteProgress((prev) => ({
                    ...prev,
                    processed: prev.processed + 1,
                    success: prev.success + 1,
                }));
            } catch (e) {
                failedCount += 1;
                setNameSimilarDeleteProgress((prev) => ({
                    ...prev,
                    processed: prev.processed + 1,
                    failed: prev.failed + 1,
                }));
            }
        }

        const deletedSet = new Set(idsToDelete);
        setNameSimilarGroups((prev) => {
            return prev
                .map((group) => ({
                    ...group,
                    items: group.items.filter(
                        (entry) => !deletedSet.has(Number(entry?.asset?.id)),
                    ),
                }))
                .filter((group) => group.items.length > 1);
        });
        setNameSimilarSelectedMap({});
        setRefreshTick((n) => n + 1);
        setNameSimilarLoading(false);
        setNameSimilarDeleteProgress((prev) => ({
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

    useEffect(() => {
        if (tab !== 1) return;
        if (!hasMoreSimilarGroups) return;
        const target = similarLoadMoreRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    loadMoreSimilarGroups();
                }
            },
            { root: null, rootMargin: '300px 0px' },
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [
        tab,
        hasMoreSimilarGroups,
        loadMoreSimilarGroups,
        visibleSimilarGroups.length,
    ]);

    useEffect(() => {
        if (tab !== 2) return;
        if (!hasMoreNameSimilarGroups) return;
        const target = nameSimilarLoadMoreRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    loadMoreNameSimilarGroups();
                }
            },
            { root: null, rootMargin: '300px 0px' },
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [
        tab,
        hasMoreNameSimilarGroups,
        loadMoreNameSimilarGroups,
        visibleNameSimilarGroups.length,
    ]);

    useEffect(() => {
        if (tab !== 1) return;
        (async () => {
            await Promise.all([loadIgnoredPairs(), loadHashStats()]);
            const state = await loadBackfillStatus();
            if (state?.running) startBackfillPolling();
        })();
    }, [tab]);

    useEffect(() => {
        if (tab !== 2) return;
        (async () => {
            await loadIgnoredPairs();
        })();
    }, [tab]);

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

    const handleDeleteSelectedSimilar = async () => {
        if (!selectedSimilarIds.length) return;

        const ok = await confirmAlert(
            'Eliminar seleccionados',
            `Se eliminarán ${selectedSimilarIds.length} assets seleccionados del resultado de similitud.`,
            'Sí, eliminar',
            'Cancelar',
            'warning',
        );
        if (!ok) return;

        let successCount = 0;
        let failedCount = 0;
        const idsToDelete = [...selectedSimilarIds];
        setSimilarLoading(true);
        setSimilarDeleteProgress({
            running: true,
            total: idsToDelete.length,
            processed: 0,
            success: 0,
            failed: 0,
            currentAssetId: null,
        });

        for (const id of idsToDelete) {
            setSimilarDeleteProgress((prev) => ({
                ...prev,
                currentAssetId: id,
            }));
            try {
                await http.deleteData('/assets', id);
                successCount += 1;
                setSimilarDeleteProgress((prev) => ({
                    ...prev,
                    processed: prev.processed + 1,
                    success: prev.success + 1,
                }));
            } catch (e) {
                failedCount += 1;
                setSimilarDeleteProgress((prev) => ({
                    ...prev,
                    processed: prev.processed + 1,
                    failed: prev.failed + 1,
                }));
            }
        }

        const deletedSet = new Set(idsToDelete);
        setSimilarGroups((prev) => {
            return prev
                .map((group) => ({
                    ...group,
                    items: group.items.filter(
                        (entry) => !deletedSet.has(Number(entry?.asset?.id)),
                    ),
                }))
                .filter((group) => group.items.length > 1);
        });
        setSimilarSelectedMap({});
        setRefreshTick((n) => n + 1);
        setSimilarLoading(false);
        setSimilarDeleteProgress((prev) => ({
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

    // Drop múltiple: busca assets por archiveName (exacto) y por nombre base como fallback.
    const handleDropManyFiles = async (fileNames) => {
        const names = Array.from(fileNames || [])
            .map((n) => String(n || '').trim())
            .filter(Boolean);
        if (!names.length) return;

        try {
            setLoading(true);

            // 1) Traer una ventana grande (pero limitada) de assets para poder matchear localmente.
            // Si necesitas más de 1000, más adelante podemos iterar por páginas.
            const res = await http.getData(`/assets?pageIndex=0&pageSize=1000`); // admin route
            const payload = res.data;
            const items = Array.isArray(payload?.items)
                ? payload.items
                : Array.isArray(payload)
                  ? payload
                  : [];

            const byArchiveLower = new Map();
            const byBaseLower = new Map();
            items.forEach((a) => {
                const an = String(a?.archiveName || '').trim();
                if (an) byArchiveLower.set(an.toLowerCase(), a);
                const bn = normalizeBase(an);
                if (bn) byBaseLower.set(bn, a);
            });

            const found = [];
            const notFound = [];
            const seenAssetIds = new Set();

            names.forEach((n) => {
                const key = n.toLowerCase();
                const base = normalizeBase(n);
                const asset =
                    byArchiveLower.get(key) ||
                    (base ? byBaseLower.get(base) : null);
                if (asset?.id) {
                    found.push({
                        name: n,
                        match: asset.archiveName || '',
                        assetId: asset.id,
                    });
                    seenAssetIds.add(asset.id);
                } else {
                    notFound.push(n);
                }
            });

            // 2) Mostrar en tabla los assets encontrados (sin duplicados)
            const foundAssets = items.filter((a) => seenAssetIds.has(a.id));
            setAssets(foundAssets);
            setRowCount(foundAssets.length);
            setPageIndex(0);

            // 3) Mostrar modal con resumen
            setDropFound(found);
            setDropNotFound(notFound);
            setDropResultsOpen(true);
        } catch (e) {
            console.error('drop many search error', e);
            setDropFound([]);
            setDropNotFound(Array.from(fileNames || []));
            setDropResultsOpen(true);
        } finally {
            setLoading(false);
        }
    };

    // Cargar datos de la tabla (paginación servidor)
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams({
                    q: String(searchTerm || ''),
                    pageIndex: String(pageIndex),
                    pageSize: String(pageSize),
                });
                if (showFreeOnly) params.set('plan', 'free');
                // Añadir filtros nuevos si están presentes
                const accTrim = String(accountQ || '').trim();
                if (accTrim) {
                    // si es número, tomar como accountId; si no, alias
                    const asNum = Number(accTrim);
                    if (Number.isFinite(asNum) && asNum > 0)
                        params.set('accountId', String(asNum));
                    else params.set('accountAlias', accTrim);
                }
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
    }, [searchTerm, pageIndex, pageSize, refreshTick, showFreeOnly]);

    // Tabla: datos filtrados (sin filtrado local extra)
    const filtered = assets;

    // Detalle: cargar bilingüe al abrir modal de vista
    useEffect(() => {
        if (previewOpen && selected?.id) {
            setLoadingDetail(true);
            http.getData(`/assets/${selected.id}`)
                .then((res) => setDetail(res.data))
                .catch((e) => {
                    console.error('load detail error', e);
                    setDetail(selected);
                })
                .finally(() => setLoadingDetail(false));
        } else {
            setDetail(null);
        }
    }, [previewOpen, selected?.id]);

    // Tabla: definición de columnas (ES)
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
                            title="Ver imágenes"
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
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 600 }}
                            >
                                <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mr: 0.5 }}
                                >
                                    es:
                                </Typography>
                                {titleEs}
                            </Typography>
                            {titleEn ? (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mt: 0.3 }}
                                >
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ mr: 0.5 }}
                                    >
                                        en:
                                    </Typography>
                                    {titleEn}
                                </Typography>
                            ) : null}
                            {archiveName ? (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mt: 0.3 }}
                                >
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ mr: 0.5 }}
                                    >
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
            //   header: 'Categorías',
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
                        <Box
                            sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 26,
                                height: 22,
                                px: 0.5,
                                borderRadius: 8,
                                bgcolor: bg,
                            }}
                        >
                            <Typography
                                variant="body2"
                                sx={{ fontWeight: 700, color: fg }}
                            >
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
                header: 'Tamaño',
                accessorFn: (row) => row.fileSizeB ?? row.archiveSizeB ?? 0,
                Cell: ({ cell }) => (
                    <Typography variant="body2">
                        {formatMBfromB(cell.getValue())}
                    </Typography>
                ),
                size: 100,
            },
            {
                header: 'Cuenta',
                accessorFn: (row) => row.account?.alias || row.accountId,
                size: 140,
                Cell: ({ row }) => (
                    <Typography
                        variant="body2"
                        sx={{
                            maxWidth: 120,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {row.original.account?.alias || row.original.accountId}
                    </Typography>
                ),
            },
            {
                header: 'Subido',
                accessorKey: 'createdAt',
                size: 150,
                Cell: ({ cell }) => {
                    const v = cell.getValue();
                    if (!v)
                        return (
                            <Typography variant="body2" color="text.secondary">
                                -
                            </Typography>
                        );
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
                            <LinkIcon
                                fontSize="small"
                                style={{ verticalAlign: 'middle' }}
                            />{' '}
                            <MUILink
                                href={cell.getValue()}
                                target="_blank"
                                rel="noreferrer"
                                underline="hover"
                            >
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
        muiPaginationProps: {
            rowsPerPageOptions: [10, 25, 50, 100, 200, 300, 400, 500, 1000],
        },
        muiTableContainerProps: {
            sx: {
                height: {
                    xs: 'calc(100vh - 220px)',
                    md: 'calc(100vh - 240px)',
                },
                overflowX: 'auto',
            },
        },
        muiTopToolbarProps: {
            sx: {
                position: 'sticky',
                top: 0,
                zIndex: 2,
                bgcolor: 'background.default',
            },
        },
        muiBottomToolbarProps: {
            sx: {
                position: 'sticky',
                bottom: 0,
                zIndex: 2,
                bgcolor: 'background.default',
            },
        },
        muiTablePaperProps: { sx: { width: '100%' } },
        enableColumnFilters: false,
        enableGlobalFilter: false,
        enableRowActions: true,
        positionActionsColumn: 'first',
        displayColumnDefOptions: { 'mrt-row-actions': { size: 80 } },
        renderTopToolbarCustomActions: ({ table }) => (
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
                onBuscarId={async () => {
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
                }}
                onDropManyFiles={handleDropManyFiles}
            />
        ),
        renderRowActions: ({ row }) => (
            <Box sx={{ display: 'flex', gap: 0 }}>
                <IconButton
                    aria-label="Ver"
                    size="small"
                    onClick={() => {
                        setSelected(row.original);
                        setPreviewOpen(true);
                    }}
                    sx={{ p: 0.2 }}
                    title="Ver detalle del STL"
                >
                    <VisibilityIcon fontSize="small" />
                </IconButton>
                <IconButton
                    aria-label="Editar"
                    size="small"
                    onClick={() => openEdit(row.original)}
                    sx={{ p: 0.2 }}
                    title="Editar STL"
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
            // Cambia el color de fondo si el link está caído
            return row.original.megaLinkAlive === false
                ? { sx: { backgroundColor: '#fc8282' } } // rojo claro, puedes ajustar el color
                : {};
        },
    });

    // Abrir editor con datos del asset (sin categoría legacy)
    const openEdit = async (asset) => {
        setSelected(asset);
        setEditForm({
            title: asset.title || '',
            titleEn: asset.titleEn || '',
            categories: Array.isArray(asset.categories)
                ? asset.categories.map((c) => ({ ...c }))
                : [],
            tags: Array.isArray(asset.tags)
                ? asset.tags
                      .map((t) => String(t.slug || t.name || '').toLowerCase())
                      .filter(Boolean)
                : [],
            isPremium: !!asset.isPremium,
        });
        setEditImageFiles([]);
        setEditPreviewIndex(0);
        setEditOpen(true);
        await loadMeta();
    };

    // Helpers de imágenes para editor
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

    // Guardar edición (sin categoría legacy)
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
            setEditOpen(false);
            resetEdit();
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
        if (tab !== 3) return;
        if (!categories.length || !allTags.length) {
            void loadMeta();
        }
    }, [tab, categories.length, allTags.length]);

    useEffect(() => {
        if (tab !== 3) return;
        setMetaDraftMap((prev) => {
            const next = { ...prev };
            (Array.isArray(assets) ? assets : []).forEach((asset) => {
                const id = Number(asset?.id || 0);
                if (!Number.isFinite(id) || id <= 0) return;
                next[id] = {
                    id,
                    title: String(asset?.title || ''),
                    titleEn: String(asset?.titleEn || ''),
                    description: String(asset?.description || ''),
                    descriptionEn: String(asset?.descriptionEn || ''),
                    categories: normalizeMetaCategoryList(asset?.categories),
                    tags: normalizeMetaTagList(asset?.tags),
                };
            });
            return next;
        });
    }, [tab, assets, normalizeMetaCategoryList, normalizeMetaTagList]);

    const metaRows = filtered;

    const metaVirtualizer = useVirtualizer({
        count: metaRows.length,
        getScrollElement: () => metaScrollRef.current,
        estimateSize: () => 140, // Altura estimada con TextField multiline
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
        const size = Math.max(1, Number(pageSize) || 1);
        return Math.max(1, Math.ceil(total / size));
    }, [rowCount, pageSize]);
    const metaPageOptions = useMemo(
        () => Array.from({ length: metaTotalPages }, (_, idx) => idx),
        [metaTotalPages],
    );

    useEffect(() => {
        const lastPage = Math.max(0, metaTotalPages - 1);
        if (pageIndex > lastPage) setPageIndex(lastPage);
    }, [pageIndex, metaTotalPages]);

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

    const updateMetaDraft = (assetId, patch) => {
        const id = Number(assetId);
        if (!Number.isFinite(id) || id <= 0) return;
        setMetaDraftMap((prev) => {
            const current = prev[id] || {
                id,
                title: '',
                titleEn: '',
                description: '',
                descriptionEn: '',
                categories: [],
                tags: [],
            };
            return {
                ...prev,
                [id]: {
                    ...current,
                    ...patch,
                },
            };
        });
    };

    const saveMetaRow = async (assetId, { silent = false } = {}) => {
        const id = Number(assetId);
        const draft = metaDraftMap[id];
        if (!Number.isFinite(id) || id <= 0 || !draft) return false;

        const categoriesPayload = normalizeMetaCategoryList(draft.categories)
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

        await http.putData('/assets', id, {
            title: String(draft.title || '').trim(),
            titleEn: String(draft.titleEn || '').trim(),
            description: String(draft.description || '').trim(),
            descriptionEn: String(draft.descriptionEn || '').trim(),
            categories: categoriesPayload,
            tags: tagsPayload,
        });

        if (!silent) {
            await fireAlert({
                toast: true,
                position: 'bottom',
                icon: 'success',
                title: `Metadata guardada para asset #${id}`,
                showConfirmButton: false,
                timer: 1700,
                timerProgressBar: true,
                zIndex: 2000,
            });
        }
        return true;
    };

    const saveMetaSelected = async () => {
        if (!metaSelectedIds.length) return;
        let okCount = 0;
        let failCount = 0;
        setMetaBusy(true);
        for (const id of metaSelectedIds) {
            try {
                // eslint-disable-next-line no-await-in-loop
                await saveMetaRow(id, { silent: true });
                okCount += 1;
            } catch {
                failCount += 1;
            }
        }
        setMetaBusy(false);
        setRefreshTick((n) => n + 1);
        if (okCount > 0) {
            await successAlert('Guardado', `Se actualizaron ${okCount} assets`);
        }
        if (failCount > 0) {
            await errorAlert(
                'Parcial',
                `Fallaron ${failCount} assets al guardar`,
            );
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
            'Esto intentará generar descripciones IA para todos los assets según el límite configurado. ¿Deseas continuar?',
            'Sí, generar',
            'Cancelar',
            'warning',
        );
        if (!ok) return;
        await runMetaDescriptionGeneration('all');
    };

    const handleGenerateMissingDescriptions = async () => {
        const ok = await confirmAlert(
            'Generar descripciones (faltantes)',
            'Esto generará descripciones IA solo para assets con descripción faltante. ¿Deseas continuar?',
            'Sí, generar',
            'Cancelar',
            'question',
        );
        if (!ok) return;
        await runMetaDescriptionGeneration('missing');
    };

    const handleGenerateSingleDescription = async (assetId) => {
        await runMetaDescriptionGeneration('selected', [Number(assetId)]);
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

    return (
        <div className="p-3 mb-5">
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
                    label="STL-LIST"
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === 'dark' ? '#fff' : undefined,
                    }}
                />
                <Tab
                    label="SIMILAR-IMAGES"
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === 'dark' ? '#fff' : undefined,
                    }}
                />
                <Tab
                    label="SIMILAR-NAMES"
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === 'dark' ? '#fff' : undefined,
                    }}
                />
                <Tab
                    label="META-SEO"
                    sx={{
                        color: (theme) =>
                            theme.palette.mode === 'dark' ? '#fff' : undefined,
                    }}
                />
            </Tabs>
            {tab === 0 && (
                <>
                    {/* Barra de carga superior */}
                    {loading && <LinearProgress sx={{ mb: 2 }} />}

                    {/* Tabla */}
                    <Box sx={{ width: '100%', overflowX: 'auto' }}>
                        <MaterialReactTable table={table} />
                    </Box>

                    {/* Modal: Detalle ES/EN */}
                    <ModalDetalle
                        open={previewOpen}
                        onClose={() => setPreviewOpen(false)}
                        detail={detail}
                        selected={selected}
                        imgUrl={imgUrl}
                        formatMBfromB={formatMBfromB}
                        loadingDetail={loadingDetail}
                    />

                    {/* Modal: encontrados / no encontrados por drag&drop */}
                    <ModalResultadosDrop
                        open={dropResultsOpen}
                        onClose={() => setDropResultsOpen(false)}
                        found={dropFound}
                        notFound={dropNotFound}
                    />

                    {/* Modal: Edición (sin categoría legacy) */}
                    <ModalEditar
                        open={editOpen}
                        onClose={() => {
                            setEditOpen(false);
                            resetEdit();
                        }}
                        selected={selected}
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
                        loading={loading}
                        onSave={handleSaveEdit}
                        imgUrl={imgUrl}
                    />
                </>
            )}
            {tab === 1 && (
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
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 800 }}
                                >
                                    SIMILAR-IMAGES
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Vista preliminar por bloques para detectar
                                    posibles duplicados y decidir qué eliminar.
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
                                        similarLoading ||
                                        similarBackfill.running
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
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
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
                                <Chip
                                    label={`Grupos: ${similarGroups.length}`}
                                />
                                <Chip
                                    label={`Mostrando: ${visibleSimilarGroups.length}/${similarGroups.length}`}
                                />
                                <Chip
                                    label={`Pares descartados: ${ignoredPairsCount}`}
                                    color={
                                        ignoredPairsCount
                                            ? 'default'
                                            : 'default'
                                    }
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
                                <Chip
                                    label={`Assets: ${similarHashStats.assetsTotal}`}
                                />
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
                                Procesados: {similarProgress.done} /{' '}
                                {similarProgress.total}
                            </Typography>
                        )}
                        {(similarBackfill.running ||
                            similarBackfill.processedAssets > 0 ||
                            similarBackfill.lastError) && (
                            <Typography
                                variant="caption"
                                color={
                                    similarBackfill.lastError
                                        ? 'error'
                                        : 'text.secondary'
                                }
                                sx={{ mt: 1, display: 'block' }}
                            >
                                Hash backfill: assets{' '}
                                {similarBackfill.processedAssets}/
                                {similarBackfill.totalAssets || '...'} ·
                                imágenes {similarBackfill.processedImages}/
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
                                        No hay grupos para mostrar todavía
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Ejecuta Analizar todos los assets para
                                        construir los bloques de similitud.
                                    </Typography>
                                </Paper>
                            )}

                            {visibleSimilarGroups.map((group, groupIndex) => {
                                const primaryId = Number(
                                    similarPrimaryMap[group.id] ||
                                        group.items?.[0]?.asset?.id,
                                );
                                return (
                                    <Paper
                                        key={group.id}
                                        sx={{ p: 2, borderRadius: 2 }}
                                    >
                                        <Stack
                                            direction={{
                                                xs: 'column',
                                                sm: 'row',
                                            }}
                                            spacing={1.5}
                                            justifyContent="space-between"
                                            alignItems={{
                                                xs: 'flex-start',
                                                sm: 'center',
                                            }}
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
                                                        selectGroupDuplicates(
                                                            group,
                                                        )
                                                    }
                                                >
                                                    Sugerir duplicados
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="inherit"
                                                    onClick={() =>
                                                        dismissSimilarGroup(
                                                            group,
                                                        )
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
                                                const isPrimary =
                                                    id === primaryId;
                                                const isSelected =
                                                    !!similarSelectedMap[id];
                                                const assetImages =
                                                    Array.isArray(asset.images)
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
                                                                    display:
                                                                        'grid',
                                                                    gridTemplateColumns:
                                                                        'repeat(auto-fill, minmax(100px, 1fr))',
                                                                    gap: 0.6,
                                                                    mb: 1,
                                                                }}
                                                            >
                                                                {assetImages.map(
                                                                    (
                                                                        img,
                                                                        imgIdx,
                                                                    ) => {
                                                                        const thumbSrc =
                                                                            imgUrl(
                                                                                img,
                                                                            );
                                                                        return (
                                                                            <Box
                                                                                key={`${group.id}-${id}-img-${imgIdx}`}
                                                                                component="img"
                                                                                src={
                                                                                    thumbSrc
                                                                                }
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
                                                                                    '&:hover':
                                                                                        {
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
                                                                    display:
                                                                        'grid',
                                                                    placeItems:
                                                                        'center',
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
                                                            sx={{
                                                                fontWeight: 700,
                                                            }}
                                                            noWrap
                                                        >
                                                            {asset.title ||
                                                                asset.archiveName ||
                                                                `Asset #${id}`}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                display:
                                                                    'block',
                                                            }}
                                                        >
                                                            ID: {id} •
                                                            Similitud:{' '}
                                                            {entry.similarity}%
                                                            • Dist:{' '}
                                                            {entry.distance}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                display:
                                                                    'block',
                                                                mb: 0.8,
                                                            }}
                                                        >
                                                            Cuenta:{' '}
                                                            {asset.account
                                                                ?.alias ||
                                                                asset.accountId ||
                                                                '-'}
                                                        </Typography>
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                display:
                                                                    'block',
                                                                mb: 0.8,
                                                            }}
                                                        >
                                                            Imágenes:{' '}
                                                            {assetImages.length}
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
                                                                        checked={
                                                                            isSelected
                                                                        }
                                                                        onChange={() =>
                                                                            toggleSimilarSelection(
                                                                                id,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            isPrimary
                                                                        }
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
                                        Cargando más grupos...
                                    </Typography>
                                </Box>
                            )}

                            {hasMoreSimilarGroups && (
                                <Button
                                    variant="text"
                                    onClick={loadMoreSimilarGroups}
                                    sx={{ alignSelf: 'center' }}
                                >
                                    Cargar más
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
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 800 }}
                            >
                                Seleccionados para eliminar
                            </Typography>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 900,
                                    lineHeight: 1.1,
                                    mt: 0.5,
                                }}
                            >
                                {selectedSimilarIds.length}
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 1.5 }}
                            >
                                Espacio estimado:{' '}
                                {formatMBfromB(selectedSimilarBytes)}
                            </Typography>

                            {(similarDeleteProgress.running ||
                                similarDeleteProgress.total > 0) && (
                                <Box sx={{ mb: 1.5 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 700 }}
                                    >
                                        {similarDeleteProgress.running
                                            ? `Eliminando ${similarDeleteProgress.processed}/${similarDeleteProgress.total}`
                                            : `Proceso finalizado ${similarDeleteProgress.processed}/${similarDeleteProgress.total}`}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: 'block', mb: 0.8 }}
                                    >
                                        OK: {similarDeleteProgress.success} ·
                                        Fallidos: {similarDeleteProgress.failed}
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
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Aún no seleccionas assets.
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
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {asset.account?.alias ||
                                                asset.accountId ||
                                                '-'}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>

                            <Stack spacing={1}>
                                <Button
                                    variant="contained"
                                    color="error"
                                    disabled={
                                        !selectedSimilarIds.length ||
                                        similarLoading
                                    }
                                    onClick={handleDeleteSelectedSimilar}
                                >
                                    Eliminar seleccionados
                                </Button>
                                <Button
                                    variant="outlined"
                                    disabled={
                                        !selectedSimilarIds.length ||
                                        similarLoading
                                    }
                                    onClick={clearSimilarSelection}
                                >
                                    Limpiar selección
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
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
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
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Sin imagen
                                    </Typography>
                                )}
                            </Box>
                        </DialogContent>
                    </Dialog>
                </Stack>
            )}
            {tab === 2 && (
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
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 800 }}
                                >
                                    SIMILAR-NAMES
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Agrupa assets por similitud de nombre para
                                    detectar repetidos y depurar duplicados con
                                    más facilidad.
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
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Umbral de similitud de nombre:{' '}
                                    {nameSimilarThreshold}%
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
                                <Chip
                                    label={`Grupos: ${nameSimilarGroups.length}`}
                                />
                                <Chip
                                    label={`Mostrando: ${visibleNameSimilarGroups.length}/${nameSimilarGroups.length}`}
                                />
                                <Chip
                                    label={`Pares descartados: ${ignoredPairsCount}`}
                                    color={
                                        ignoredPairsCount
                                            ? 'default'
                                            : 'default'
                                    }
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

                        {nameSimilarLoading && (
                            <LinearProgress sx={{ mt: 2 }} />
                        )}
                        {!!nameSimilarProgress.total && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 1, display: 'block' }}
                            >
                                Procesados: {nameSimilarProgress.done} /{' '}
                                {nameSimilarProgress.total}
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
                            {!nameSimilarGroups.length &&
                                !nameSimilarLoading && (
                                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                                        <Typography
                                            variant="body1"
                                            sx={{ fontWeight: 600, mb: 0.5 }}
                                        >
                                            No hay grupos para mostrar todavía
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            Ejecuta Analizar por nombre para
                                            construir grupos de similitud
                                            textual.
                                        </Typography>
                                    </Paper>
                                )}

                            {visibleNameSimilarGroups.map(
                                (group, groupIndex) => {
                                    const primaryId = Number(
                                        nameSimilarPrimaryMap[group.id] ||
                                            group.items?.[0]?.asset?.id,
                                    );
                                    return (
                                        <Paper
                                            key={group.id}
                                            sx={{ p: 2, borderRadius: 2 }}
                                        >
                                            <Stack
                                                direction={{
                                                    xs: 'column',
                                                    sm: 'row',
                                                }}
                                                spacing={1.5}
                                                justifyContent="space-between"
                                                alignItems={{
                                                    xs: 'flex-start',
                                                    sm: 'center',
                                                }}
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
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                >
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
                                                            selectNameGroupDuplicates(
                                                                group,
                                                            )
                                                        }
                                                    >
                                                        Sugerir duplicados
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="inherit"
                                                        onClick={() =>
                                                            dismissNameSimilarGroup(
                                                                group,
                                                            )
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
                                                    const asset =
                                                        entry.asset || {};
                                                    const id = Number(asset.id);
                                                    const isPrimary =
                                                        id === primaryId;
                                                    const isSelected =
                                                        !!nameSimilarSelectedMap[
                                                            id
                                                        ];
                                                    const assetImages =
                                                        Array.isArray(
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
                                                                bgcolor:
                                                                    isPrimary
                                                                        ? 'rgba(102, 187, 106, 0.12)'
                                                                        : 'transparent',
                                                            }}
                                                        >
                                                            {assetImages.length ? (
                                                                <Box
                                                                    sx={{
                                                                        width: '100%',
                                                                        display:
                                                                            'grid',
                                                                        gridTemplateColumns:
                                                                            'repeat(auto-fill, minmax(100px, 1fr))',
                                                                        gap: 0.6,
                                                                        mb: 1,
                                                                    }}
                                                                >
                                                                    {assetImages
                                                                        .slice(
                                                                            0,
                                                                            8,
                                                                        )
                                                                        .map(
                                                                            (
                                                                                img,
                                                                                imgIdx,
                                                                            ) => {
                                                                                const thumbSrc =
                                                                                    imgUrl(
                                                                                        img,
                                                                                    );
                                                                                return (
                                                                                    <Box
                                                                                        key={`${group.id}-${id}-name-img-${imgIdx}`}
                                                                                        component="img"
                                                                                        src={
                                                                                            thumbSrc
                                                                                        }
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
                                                                                            '&:hover':
                                                                                                {
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
                                                                        display:
                                                                            'grid',
                                                                        placeItems:
                                                                            'center',
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                    >
                                                                        Sin
                                                                        imagen
                                                                    </Typography>
                                                                </Box>
                                                            )}

                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 700,
                                                                }}
                                                                noWrap
                                                            >
                                                                {asset.title ||
                                                                    asset.archiveName ||
                                                                    `Asset #${id}`}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{
                                                                    display:
                                                                        'block',
                                                                }}
                                                            >
                                                                Archivo:{' '}
                                                                {asset.archiveName ||
                                                                    '-'}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{
                                                                    display:
                                                                        'block',
                                                                }}
                                                            >
                                                                ID: {id} •
                                                                Similitud:{' '}
                                                                {
                                                                    entry.similarity
                                                                }
                                                                % • Dist:{' '}
                                                                {entry.distance}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{
                                                                    display:
                                                                        'block',
                                                                    mb: 0.8,
                                                                }}
                                                            >
                                                                Cuenta:{' '}
                                                                {asset.account
                                                                    ?.alias ||
                                                                    asset.accountId ||
                                                                    '-'}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{
                                                                    display:
                                                                        'block',
                                                                    mb: 0.8,
                                                                }}
                                                            >
                                                                Imágenes:{' '}
                                                                {
                                                                    assetImages.length
                                                                }
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
                                                                    sx={{
                                                                        mr: 0,
                                                                    }}
                                                                    control={
                                                                        <Checkbox
                                                                            checked={
                                                                                isSelected
                                                                            }
                                                                            onChange={() =>
                                                                                toggleNameSimilarSelection(
                                                                                    id,
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                isPrimary
                                                                            }
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
                                },
                            )}

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
                                        Cargando más grupos...
                                    </Typography>
                                </Box>
                            )}

                            {hasMoreNameSimilarGroups && (
                                <Button
                                    variant="text"
                                    onClick={loadMoreNameSimilarGroups}
                                    sx={{ alignSelf: 'center' }}
                                >
                                    Cargar más
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
                            <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 800 }}
                            >
                                Seleccionados para eliminar
                            </Typography>
                            <Typography
                                variant="h4"
                                sx={{
                                    fontWeight: 900,
                                    lineHeight: 1.1,
                                    mt: 0.5,
                                }}
                            >
                                {selectedNameSimilarIds.length}
                            </Typography>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 1.5 }}
                            >
                                Espacio estimado:{' '}
                                {formatMBfromB(selectedNameSimilarBytes)}
                            </Typography>

                            {(nameSimilarDeleteProgress.running ||
                                nameSimilarDeleteProgress.total > 0) && (
                                <Box sx={{ mb: 1.5 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 700 }}
                                    >
                                        {nameSimilarDeleteProgress.running
                                            ? `Eliminando ${nameSimilarDeleteProgress.processed}/${nameSimilarDeleteProgress.total}`
                                            : `Proceso finalizado ${nameSimilarDeleteProgress.processed}/${nameSimilarDeleteProgress.total}`}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: 'block', mb: 0.8 }}
                                    >
                                        OK: {nameSimilarDeleteProgress.success}{' '}
                                        · Fallidos:{' '}
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
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        Aún no seleccionas assets.
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
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {asset.account?.alias ||
                                                asset.accountId ||
                                                '-'}
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
                                    Limpiar selección
                                </Button>
                            </Stack>
                        </Paper>
                    </Box>
                </Stack>
            )}
            {tab === 3 && (
                <Stack spacing={2}>
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Stack
                            direction={{ xs: 'column', lg: 'row' }}
                            spacing={1.2}
                            justifyContent="space-between"
                            alignItems={{ xs: 'stretch', lg: 'center' }}
                        >
                            <Box>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 800 }}
                                >
                                    META-SEO
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Edita nombre, tags, categorías y
                                    descripción. También puedes generar
                                    descripciones/tags en lote con IA.
                                </Typography>
                            </Box>

                            <Stack
                                direction="row"
                                spacing={0.7}
                                sx={{
                                    justifyContent: 'flex-end',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <Tooltip title="Generar descripciones IA (todos)">
                                    <span>
                                        <IconButton
                                            onClick={
                                                handleGenerateAllDescriptions
                                            }
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

                                <Tooltip title="Generar descripciones IA faltantes">
                                    <span>
                                        <IconButton
                                            onClick={
                                                handleGenerateMissingDescriptions
                                            }
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
                                            onClick={
                                                handleGenerateSelectedDescriptions
                                            }
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
                                            onClick={
                                                runMetaTagsGenerationForSelected
                                            }
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
                                color={
                                    metaSelectedIds.length
                                        ? 'warning'
                                        : 'default'
                                }
                            />
                            <Chip
                                label={`Filas actuales: ${metaRows.length}`}
                            />
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
                                borderBottom:
                                    '1px solid rgba(191,219,254,0.45)',
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
                                            onChange={
                                                toggleMetaSelectAllVisible
                                            }
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
                                    <TableCell
                                        sx={{ minWidth: 270, width: 270 }}
                                    >
                                        Imágenes
                                    </TableCell>
                                    <TableCell
                                        sx={{ minWidth: 280, width: 280 }}
                                    >
                                        Asset / Name (ES/EN)
                                    </TableCell>
                                    <TableCell
                                        sx={{ minWidth: 400, width: 400 }}
                                    >
                                        SEO Description (ES/EN)
                                    </TableCell>
                                    <TableCell
                                        sx={{ minWidth: 300, width: 300 }}
                                    >
                                        Categorías
                                    </TableCell>
                                    <TableCell
                                        sx={{ minWidth: 400, width: 400 }}
                                    >
                                        Tags
                                    </TableCell>
                                    <TableCell align="right">
                                        Acciones
                                    </TableCell>
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
                                    const draft = metaDraftMap[id] || {
                                        id,
                                        title: String(row?.title || ''),
                                        titleEn: String(row?.titleEn || ''),
                                        description: String(
                                            row?.description || '',
                                        ),
                                        descriptionEn: String(
                                            row?.descriptionEn || '',
                                        ),
                                        categories: normalizeMetaCategoryList(
                                            row?.categories,
                                        ),
                                        tags: normalizeMetaTagList(row?.tags),
                                    };
                                    const isSelected = !!metaSelectedMap[id];

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
                                                    onChange={() =>
                                                        toggleMetaSelect(id)
                                                    }
                                                    disabled={
                                                        metaBusy || loading
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>{id}</TableCell>
                                            <TableCell>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {(Array.isArray(row?.images)
                                                        ? row.images
                                                        : []
                                                    )
                                                        .slice(0, 3)
                                                        .map((img, idx) => (
                                                            <Box
                                                                key={`meta-img-${id}-${idx}`}
                                                                component="img"
                                                                src={imgUrl(
                                                                    img,
                                                                )}
                                                                alt={`asset-${id}-${idx + 1}`}
                                                                onClick={() =>
                                                                    setMetaImagePreview(
                                                                        imgUrl(
                                                                            img,
                                                                        ),
                                                                    )
                                                                }
                                                                sx={{
                                                                    width: 250,
                                                                    height: 250,
                                                                    objectFit:
                                                                        'cover',
                                                                    borderRadius: 1.5,
                                                                    border: '2px solid #1e293b',
                                                                    cursor: 'pointer',
                                                                    ml:
                                                                        idx > 0
                                                                            ? -20
                                                                            : 0,
                                                                    transition:
                                                                        'transform 0.2s, z-index 0.2s',
                                                                    zIndex: 1,
                                                                    '&:hover': {
                                                                        transform:
                                                                            'scale(1.15)',
                                                                        zIndex: 10,
                                                                    },
                                                                }}
                                                            />
                                                        ))}
                                                    {(!Array.isArray(
                                                        row?.images,
                                                    ) ||
                                                        row.images.length ===
                                                            0) && (
                                                        <Box
                                                            sx={{
                                                                width: 250,
                                                                height: 250,
                                                                borderRadius: 1.5,
                                                                display: 'grid',
                                                                placeItems:
                                                                    'center',
                                                                bgcolor:
                                                                    'rgba(120,120,120,0.15)',
                                                                border: '1px dashed rgba(120,120,120,0.3)',
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
                                                                N/A
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Stack
                                                    spacing={1}
                                                    sx={{ width: '100%' }}
                                                >
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        value={draft.title}
                                                        placeholder="Nombre ES"
                                                        onChange={(e) =>
                                                            updateMetaDraft(
                                                                id,
                                                                {
                                                                    title: e
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        disabled={
                                                            metaBusy || loading
                                                        }
                                                    />
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        value={draft.titleEn}
                                                        placeholder="Name EN"
                                                        onChange={(e) =>
                                                            updateMetaDraft(
                                                                id,
                                                                {
                                                                    titleEn:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        disabled={
                                                            metaBusy || loading
                                                        }
                                                    />
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Stack
                                                    spacing={1}
                                                    sx={{ width: '100%' }}
                                                >
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        multiline
                                                        rows={2}
                                                        value={String(
                                                            draft.description ||
                                                                '',
                                                        )}
                                                        placeholder="No hay descripción SEO (ES)."
                                                        onChange={(e) =>
                                                            updateMetaDraft(
                                                                id,
                                                                {
                                                                    description:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        disabled={
                                                            metaBusy || loading
                                                        }
                                                    />
                                                    <TextField
                                                        size="small"
                                                        fullWidth
                                                        multiline
                                                        rows={2}
                                                        value={String(
                                                            draft.descriptionEn ||
                                                                '',
                                                        )}
                                                        placeholder="No SEO description available (EN)."
                                                        onChange={(e) =>
                                                            updateMetaDraft(
                                                                id,
                                                                {
                                                                    descriptionEn:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                        disabled={
                                                            metaBusy || loading
                                                        }
                                                    />
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Autocomplete
                                                    multiple
                                                    limitTags={4}
                                                    options={categories}
                                                    getOptionLabel={(option) =>
                                                        option?.name ||
                                                        option?.slug ||
                                                        ''
                                                    }
                                                    value={normalizeMetaCategoryList(
                                                        draft.categories,
                                                    )}
                                                    isOptionEqualToValue={(
                                                        a,
                                                        b,
                                                    ) =>
                                                        String(
                                                            a?.slug || '',
                                                        ) ===
                                                        String(b?.slug || '')
                                                    }
                                                    onChange={(_, value) =>
                                                        updateMetaDraft(id, {
                                                            categories:
                                                                normalizeMetaCategoryList(
                                                                    value,
                                                                ),
                                                        })
                                                    }
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            size="small"
                                                            placeholder="Categorías"
                                                        />
                                                    )}
                                                    disabled={
                                                        metaBusy || loading
                                                    }
                                                    renderTags={(
                                                        value,
                                                        getTagProps,
                                                    ) =>
                                                        value.map(
                                                            (option, index) => {
                                                                const {
                                                                    key,
                                                                    ...tagProps
                                                                } = getTagProps({
                                                                    index,
                                                                });
                                                                return (
                                                                    <Chip
                                                                        key={key}
                                                                        label={
                                                                            option.name ||
                                                                            option.slug
                                                                        }
                                                                        size="small"
                                                                        {...tagProps}
                                                                        sx={{
                                                                            m: '2px',
                                                                        }}
                                                                    />
                                                                );
                                                            },
                                                        )
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
                                                    getOptionLabel={(
                                                        option,
                                                    ) => {
                                                        if (
                                                            typeof option ===
                                                            'string'
                                                        )
                                                            return option;
                                                        return (
                                                            option?.name ||
                                                            option?.slug ||
                                                            ''
                                                        );
                                                    }}
                                                    value={normalizeMetaTagList(
                                                        draft.tags,
                                                    )}
                                                    isOptionEqualToValue={(
                                                        a,
                                                        b,
                                                    ) => {
                                                        const aSlug = String(
                                                            a?.slug ||
                                                                a?.name ||
                                                                '',
                                                        )
                                                            .trim()
                                                            .toLowerCase();
                                                        const bSlug = String(
                                                            b?.slug ||
                                                                b?.name ||
                                                                '',
                                                        )
                                                            .trim()
                                                            .toLowerCase();
                                                        return (
                                                            !!aSlug &&
                                                            !!bSlug &&
                                                            aSlug === bSlug
                                                        );
                                                    }}
                                                    onChange={(_, value) =>
                                                        updateMetaDraft(id, {
                                                            tags: normalizeMetaTagList(
                                                                value,
                                                            ),
                                                        })
                                                    }
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            size="small"
                                                            placeholder="Tags"
                                                        />
                                                    )}
                                                    disabled={
                                                        metaBusy || loading
                                                    }
                                                    renderTags={(
                                                        value,
                                                        getTagProps,
                                                    ) =>
                                                        value.map(
                                                            (option, index) => {
                                                                const {
                                                                    key,
                                                                    ...tagProps
                                                                } = getTagProps({
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
                                                                            m: '2px',
                                                                        }}
                                                                    />
                                                                );
                                                            },
                                                        )
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
                                                <Stack
                                                    direction="row"
                                                    spacing={0.5}
                                                    justifyContent="flex-end"
                                                >
                                                    <Tooltip title="Perfiles rápidos">
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() =>
                                                                    openMetaProfiles(
                                                                        id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    metaBusy ||
                                                                    loading
                                                                }
                                                                sx={{
                                                                    border: '1px solid',
                                                                    borderColor:
                                                                        'divider',
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
                                                                onClick={() =>
                                                                    handleGenerateSingleDescription(
                                                                        id,
                                                                    )
                                                                }
                                                                disabled={
                                                                    metaBusy ||
                                                                    loading
                                                                }
                                                                sx={{
                                                                    border: '1px solid',
                                                                    borderColor:
                                                                        'divider',
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
                                                                onClick={async () => {
                                                                    try {
                                                                        setMetaBusy(
                                                                            true,
                                                                        );
                                                                        await saveMetaRow(
                                                                            id,
                                                                        );
                                                                        setRefreshTick(
                                                                            (
                                                                                n,
                                                                            ) =>
                                                                                n +
                                                                                1,
                                                                        );
                                                                    } catch (e) {
                                                                        await fireAlert(
                                                                            {
                                                                                toast: true,
                                                                                position: 'bottom',
                                                                                icon: 'error',
                                                                                title:
                                                                                    e
                                                                                        ?.response
                                                                                        ?.data
                                                                                        ?.message ||
                                                                                    'No se pudo guardar el asset',
                                                                                showConfirmButton:
                                                                                    false,
                                                                                timer: 2200,
                                                                                timerProgressBar:
                                                                                    true,
                                                                                zIndex: 2000,
                                                                            },
                                                                        );
                                                                    } finally {
                                                                        setMetaBusy(
                                                                            false,
                                                                        );
                                                                    }
                                                                }}
                                                                disabled={
                                                                    metaBusy ||
                                                                    loading
                                                                }
                                                                sx={{
                                                                    border: '1px solid',
                                                                    borderColor:
                                                                        'divider',
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
                                                No hay assets en esta
                                                página/filtro.
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
                                onPageChange={(_, nextPage) =>
                                    setPageIndex(nextPage)
                                }
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
                                label="Ir a página"
                                value={pageIndex}
                                onChange={(e) =>
                                    setPageIndex(Number(e.target.value) || 0)
                                }
                                disabled={
                                    metaBusy ||
                                    loading ||
                                    Number(rowCount || 0) <= 0
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
                                        {`Página ${pageOption + 1} de ${metaTotalPages}`}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Stack>
                    </Paper>

                    <ProfilesModal
                        open={metaProfilesOpen}
                        onClose={() => {
                            setMetaProfilesOpen(false);
                            setMetaProfileAssetId(null);
                        }}
                        selectedRow={selectedMetaRowForProfiles}
                        onApply={applyMetaProfile}
                    />

                    <Dialog
                        open={!!metaImagePreview}
                        onClose={() => setMetaImagePreview(null)}
                        maxWidth="lg"
                        PaperProps={{
                            sx: {
                                background: 'transparent',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        {metaImagePreview && (
                            <Box
                                onClick={() => setMetaImagePreview(null)}
                                sx={{
                                    cursor: 'zoom-out',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    overflow: 'hidden',
                                }}
                            >
                                <img
                                    src={metaImagePreview}
                                    alt="Preview"
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '90vh',
                                        objectFit: 'contain',
                                        borderRadius: '8px',
                                    }}
                                />
                            </Box>
                        )}
                    </Dialog>
                </Stack>
            )}
        </div>
    );
}
