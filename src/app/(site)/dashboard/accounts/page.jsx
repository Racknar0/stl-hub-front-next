'use client';

import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Box, LinearProgress, Stack, Tabs, Tab, TextField, ToggleButton, ToggleButtonGroup, InputAdornment, Tooltip, Button, Collapse, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import AddIcon from '@mui/icons-material/Add';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { isFailedAccount, summarizeAccountFailures, isAccountAtCapacity } from '@/helpers/accountHealth';
import AppButton from '@/components/layout/Buttons/Button';
import HttpService from '@/services/HttpService';
import axiosInstance from '@/services/AxiosInterceptor';
import { timerAlert, errorAlert, confirmAlert } from '@/helpers/alerts';
import AddAccountForm from './components/AddAccountForm';
import StorageSummaryCard from './components/StorageSummaryCard';
import AccountsTabs from './components/AccountsTabs';
import VirtualAccountsGrid from './components/VirtualAccountsGrid';
import ExcessCleanupModal from './components/ExcessCleanupModal';
import CleanupJobsStatus from './components/CleanupJobsStatus';
import AccountDrawer from './components/AccountDrawer';
import StatusChip from './components/StatusChip';
import BulkAddAccountsModal from './components/BulkAddAccountsModal';

const http = new HttpService();
const API_BASE = '/accounts';
const aliasCollator = new Intl.Collator(undefined, { numeric: true });
// Cuota gratuita MEGA en MB para el front (fallback). Puede sobreescribirse en build con NEXT_PUBLIC_MEGA_FREE_QUOTA_MB
const FREE_QUOTA_MB =
    Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480;

function getEmailGroup(email) {
    const normalized = (email || '').trim().toLowerCase();
    const at = normalized.lastIndexOf('@');
    if (at <= 0 || at === normalized.length - 1) return 'Sin correo válido';
    return `${normalized.slice(0, at).split('+')[0]}${normalized.slice(at)}`;
}

// Nota: StatusChip extraído a componente separado

export default function AccountsOverviewPage() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [backupCandidates, setBackupCandidates] = useState([]);
    const [loadingBackups, setLoadingBackups] = useState(false);
    const [addingBackup, setAddingBackup] = useState(false);
    const [selectedBackupCandidate, setSelectedBackupCandidate] = useState('');
    const [tab, setTab] = useState('main');
    const [emailGroup, setEmailGroup] = useState('all');
    const [bulkOpen, setBulkOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [cleanupAccount, setCleanupAccount] = useState(null);

    // Estado del listado de assets en el modal derecho
    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [assetsSearch, setAssetsSearch] = useState('');

    const [form, setForm] = useState({
        alias: '',
        email: '',
        baseFolder: '/STLHUB',
        type: 'main',
        username: '',
        password: '',
    });
    const [testing, setTesting] = useState(false);
    const abortRef = useRef(null);
    // Eliminar StatusIndicator y mantener pendingIds para overlay
    const [pendingIds, setPendingIds] = useState(new Set());
    const startPending = (id) =>
        setPendingIds((prev) => {
            const n = new Set(prev);
            n.add(id);
            return n;
        });
    const endPending = (id) =>
        setPendingIds((prev) => {
            const n = new Set(prev);
            n.delete(id);
            return n;
        });

    const fetchAccounts = async ({ quiet = false } = {}) => {
        try {
            setLoading(true);
            const res = quiet ? await axiosInstance.get(API_BASE, { timeout: 10000 }) : await http.getData(API_BASE);
            setAccounts(res.data || []);
            return true;
        } catch (e) {
            console.error(e);
            if (!quiet) await errorAlert('Error', 'No se pudieron cargar las cuentas');
            return false;
        } finally {
            setLoading(false);
        }
    };
    const refreshCleanupAccounts = async () => {
        if (!await fetchAccounts({ quiet: true })) throw new Error('No se pudieron actualizar las cuentas después de la depuración.');
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const testConnection = async (id) => {
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            setTesting(true);
            startPending(id);

            const first = await http.postData(`${API_BASE}/${id}/test`, {
                source: 'dashboard-accounts',
            }, { signal: controller.signal });

            if (first?.data?.busy) {
                const ok = await confirmAlert(
                    'Subidas activas',
                    'Hay subidas activas. Si fuerzas el test puede interferir con el proceso en curso. ¿Deseas forzar la actualización de esta cuenta?',
                    'Sí, forzar',
                    'Cancelar',
                    'warning',
                );
                if (!ok) return;

                await http.postData(
                    `${API_BASE}/${id}/test?force=1&source=dashboard-accounts`,
                    { force: true, source: 'dashboard-accounts' },
                    { signal: controller.signal },
                );
            }

            await timerAlert('OK', 'Conexión verificada', 1200);
            await fetchAccounts();
        } catch (e) {
            if (e?.name === 'AbortError' || e?.name === 'CanceledError' || controller.signal.aborted) {
                await fetchAccounts();
                return;
            }
            console.error(e);
            await fetchAccounts();
            await errorAlert('Error', 'Falló la verificación');
        } finally {
            abortRef.current = null;
            endPending(id);
            setTesting(false);
        }
    };

    const cancelTest = () => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
    };

    const addAccount = async () => {
        const { alias, email, baseFolder, type, username, password } = form;
        if (!alias || !email || !baseFolder || !username || !password) {
            await errorAlert(
                'Faltan datos',
                'Alias, correo, carpeta, usuario y contraseña son obligatorios',
            );
            return;
        }
        try {
            setTesting(true);
            const body = {
                alias,
                email,
                baseFolder,
                type: type === 'backup' ? 'backup' : 'main',
                credentials: { type: 'login', username, password },
            };
            const res = await http.postData(`${API_BASE}`, body);
            const id = res.data?.id;
            // Actualización optimista: mostrar la nueva cuenta inmediatamente con estado pendiente
            if (res?.data) {
                const optimistic = { ...res.data, status: 'PENDING' };
                setAccounts((prev) => [optimistic, ...prev]);
            }
            if (id) {
                try {
                    startPending(id);
                    await http.postData(`${API_BASE}/${id}/test`, {});
                    await fetchAccounts();
                    await timerAlert('OK', 'Cuenta creada y validada', 1200);
                } catch (e) {
                    console.error(e);
                    await fetchAccounts();
                    await errorAlert(
                        'Error',
                        'Cuenta creada pero falló la validación',
                    );
                } finally {
                    endPending(id);
                }
            } else {
                await errorAlert('Error', 'No se pudo crear la cuenta');
            }
            setForm({
                alias: '',
                email: '',
                baseFolder: '/STLHUB',
                type: 'main',
                username: '',
                password: '',
            });
        } catch (e) {
            console.error(e);
            await errorAlert('Error', 'No se pudo crear la cuenta');
        } finally {
            setTesting(false);
        }
    };

    // Cargar assets de la cuenta seleccionada
    const fetchAccountAssets = async (accountId) => {
        try {
            setAssetsLoading(true);
            const res = await http.getData(`${API_BASE}/${accountId}/assets`);
            const items = res.data?.items || [];
            setAssets(items);
        } catch (e) {
            console.error('No se pudieron cargar los assets', e);
            setAssets([]);
        } finally {
            setAssetsLoading(false);
        }
    };

    const openDetail = async (acc) => {
        setSelected({
            ...acc,
            backups: acc.backups || [],
            mains: acc.mains || [],
        });
        setOpen(true);
        try {
            await Promise.all([
                fetchAccountAssets(acc.id),
                loadBackupCandidates(acc.id, acc.type),
            ]);
        } catch (e) {
            console.error('openDetail error', e);
        }
    };

    const refreshSelectedDetail = async () => {
        if (!selected) return;
        try {
            const res = await http.getData(`${API_BASE}`);
            const arr = res.data || [];
            const found = arr.find((a) => a.id === selected.id);
            if (found) setSelected((prev) => ({ ...prev, ...found }));
        } catch (e) {
            console.error('refreshSelectedDetail', e);
        }
    };

    const loadBackupCandidates = async (id, type) => {
        if (type !== 'main') {
            setBackupCandidates([]);
            return;
        }
        try {
            setLoadingBackups(true);
            const res = await http.getData(
                `${API_BASE}/${id}/backup-candidates`,
            );
            // Filtrar: solo mostrar cuentas que no tengan mains asociadas
            const filtered = (res.data?.items || []).filter(
                (c) => !c.mains || c.mains.length === 0,
            );
            setBackupCandidates(filtered);
        } catch (e) {
            console.error('loadBackupCandidates error', e);
            setBackupCandidates([]);
        } finally {
            setLoadingBackups(false);
        }
    };

    const addBackup = async () => {
        if (!selected || !selectedBackupCandidate) return;
        try {
            setAddingBackup(true);
            await http.postData(`${API_BASE}/${selected.id}/backups`, {
                backupAccountId: Number(selectedBackupCandidate),
            });
            await Promise.all([
                refreshSelectedDetail(),
                loadBackupCandidates(selected.id, selected.type),
            ]);
            setSelectedBackupCandidate('');
        } catch (e) {
            console.error('addBackup error', e);
        } finally {
            setAddingBackup(false);
        }
    };

    const removeBackup = async (backupId) => {
        if (!selected) return;
        try {
            await http.deleteRaw(
                `${API_BASE}/${selected.id}/backups/${backupId}`,
            );
            await Promise.all([
                refreshSelectedDetail(),
                loadBackupCandidates(selected.id, selected.type),
            ]);
        } catch (e) {
            console.error('removeBackup error', e);
        }
    };

    const patchAccount = async (id, data) => {
        const resp = await http.patchData(`${API_BASE}`, id, data);
        const updated = resp.data;
        // Actualizar lista
        setAccounts((prev) =>
            (prev || []).map((a) => (a.id === id ? { ...a, ...updated } : a)),
        );
        // Actualizar seleccionado si corresponde
        setSelected((prev) =>
            prev && prev.id === id ? { ...prev, ...updated } : prev,
        );
        // Refrescar para traer includes (backups/mains) si cambiaron
        await fetchAccounts();
        return updated;
    };

    const deleteAccount = async (id) => {
        await http.deleteData(`${API_BASE}`, id);
        setAccounts((prev) => (prev || []).filter((a) => a.id !== id));
        setSelected((prev) => (prev && prev.id === id ? null : prev));
        setOpen((prev) => (selected && selected.id === id ? false : prev));
        await fetchAccounts();
    };

    // === Filtros y orden ===
    const [filterSearch, setFilterSearch] = useState('');
    const deferredSearch = useDeferredValue(filterSearch);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterUsage, setFilterUsage] = useState('all');
    const [sortBy, setSortBy] = useState('alias-desc');
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get('status') === 'failed') setFilterStatus('failed');
        if (query.get('usage') === 'over') setFilterUsage('over');
    }, []);

    const emailGroups = useMemo(() => {
        const counts = new Map();
        accounts.forEach((account) => {
            const group = getEmailGroup(account.email);
            counts.set(group, (counts.get(group) || 0) + 1);
        });
        return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [accounts]);
    // Si se elimina la última cuenta del grupo, volver a la vista global.
    const activeEmailGroup = emailGroups.some(([group]) => group === emailGroup)
        ? emailGroup : 'all';
    const groupedAccounts = useMemo(
        () => activeEmailGroup === 'all' ? accounts : accounts.filter(
            (account) => getEmailGroup(account.email) === activeEmailGroup,
        ),
        [accounts, activeEmailGroup],
    );

    // Capacidad física por tipo; las copias no se suman como catálogo único.
    const totalStorage = useMemo(() => {
        const summarize = (type) => {
            const typed = groupedAccounts.filter(account => account.type === type);
            const connected = typed.filter(account => account.status === 'CONNECTED');
            let used = 0;
            let total = 0;
            let estimatedCount = 0;
            for (const account of connected) {
                const quota = Number(account.storageTotalMB);
                if (!(quota > 0)) estimatedCount++;
                total += quota > 0 ? quota : FREE_QUOTA_MB;
                used += Math.max(0, Number(account.storageUsedMB) || 0);
            }
            return { used, total, pct: total > 0 ? used / total * 100 : 0,
                okCount: connected.length, excludedCount: typed.length - connected.length, estimatedCount };
        };
        return { main: summarize('main'), backup: summarize('backup') };
    }, [groupedAccounts]);

    const mainAccounts = useMemo(
        () => groupedAccounts.filter((a) => a.type === 'main'),
        [groupedAccounts],
    );
    const backupAccounts = useMemo(
        () => groupedAccounts.filter((a) => a.type === 'backup'),
        [groupedAccounts],
    );
    const tabAccounts = tab === 'main' ? mainAccounts : backupAccounts;
    const failures = summarizeAccountFailures(groupedAccounts);
    useEffect(() => {
        if (filterStatus !== 'failed' && filterUsage !== 'over') return;
        const matches = account => (filterStatus !== 'failed' || isFailedAccount(account)) &&
            (filterUsage !== 'over' || isAccountAtCapacity(account));
        const otherTab = tab === 'main' ? 'backup' : 'main';
        if (!groupedAccounts.some(account => account.type === tab && matches(account)) &&
            groupedAccounts.some(account => account.type === otherTab && matches(account))) setTab(otherTab);
    }, [filterStatus, filterUsage, tab, groupedAccounts]);

    const shownAccounts = useMemo(() => {
        let list = [...tabAccounts];

        // Filtro búsqueda
        if (deferredSearch.trim()) {
            const q = deferredSearch.trim().toLowerCase();
            list = list.filter((a) =>
                (a.alias || '').toLowerCase().includes(q) ||
                (a.email || '').toLowerCase().includes(q) ||
                String(a.id).includes(q)
            );
        }

        // Filtro estado
        if (filterStatus !== 'all') {
            list = list.filter((a) => filterStatus === 'failed' ? isFailedAccount(a) : a.status === filterStatus);
        }

        // Filtro uso
        if (filterUsage !== 'all') {
            list = list.filter((a) => {
                const total = (a.storageTotalMB && a.storageTotalMB > 0) ? a.storageTotalMB : FREE_QUOTA_MB;
                const pct = total > 0 ? (Math.max(0, a.storageUsedMB || 0) / total) * 100 : 0;
                if (filterUsage === 'low') return pct < 50;
                if (filterUsage === 'mid') return pct >= 50 && pct < 80;
                if (filterUsage === 'high') return pct >= 80;
                if (filterUsage === 'over') return isAccountAtCapacity(a);
                return true;
            });
        }

        // Ordenar
        list.sort((a, b) => {
            if (sortBy === 'alias-desc') return aliasCollator.compare(b.alias || '', a.alias || '');
            if (sortBy === 'alias-asc') return aliasCollator.compare(a.alias || '', b.alias || '');
            if (sortBy === 'usage-desc') {
                const pctA = getPct(a), pctB = getPct(b);
                return pctB - pctA;
            }
            if (sortBy === 'usage-asc') {
                const pctA = getPct(a), pctB = getPct(b);
                return pctA - pctB;
            }
            if (sortBy === 'date-desc') return new Date(b.lastCheckAt || 0) - new Date(a.lastCheckAt || 0);
            if (sortBy === 'date-asc') return new Date(a.lastCheckAt || 0) - new Date(b.lastCheckAt || 0);
            return 0;
        });

        return list;
    }, [tabAccounts, deferredSearch, filterStatus, filterUsage, sortBy]);

    function getPct(a) {
        const total = (a.storageTotalMB && a.storageTotalMB > 0) ? a.storageTotalMB : FREE_QUOTA_MB;
        return total > 0 ? (Math.max(0, a.storageUsedMB || 0) / total) * 100 : 0;
    }

    return (
        <div className="dashboard-content p-3">
            <Stack direction="row" alignItems="center" justifyContent="space-between" useFlexGap flexWrap="wrap" gap={1.5} sx={{ mb: 1.5 }}>
                <TextField select size="small" label="Grupo por correo base" value={activeEmailGroup}
                    onChange={event => setEmailGroup(event.target.value)} sx={{ minWidth: 240, maxWidth: '100%' }}>
                    <MenuItem value="all">Todas las cuentas ({accounts.length})</MenuItem>
                    {emailGroups.map(([group, count]) => <MenuItem key={group} value={group}>{group} ({count})</MenuItem>)}
                </TextField>
                <Button variant={addOpen ? 'outlined' : 'contained'} startIcon={addOpen ? <ExpandLessIcon /> : <AddIcon />}
                    aria-expanded={addOpen} aria-controls="add-account-panel" onClick={() => setAddOpen(value => !value)}
                    sx={{ textTransform: 'none', bgcolor: addOpen ? undefined : '#38bdf8', color: addOpen ? '#7dd3fc' : '#082f49', boxShadow: 'none' }}>
                    {addOpen ? 'Cerrar formulario' : 'Añadir cuentas'}
                </Button>
            </Stack>
            <Collapse in={addOpen} id="add-account-panel">
                <AddAccountForm form={form} setForm={setForm} onSubmit={addAccount}
                    disabled={testing} onBulkOpen={() => setBulkOpen(true)} />
            </Collapse>
            {loading && <LinearProgress />}
            <StorageSummaryCard totalStorage={totalStorage} groupLabel={activeEmailGroup === 'all' ? null : activeEmailGroup} />
            <CleanupJobsStatus accounts={accounts} onOpen={setCleanupAccount} onComplete={refreshCleanupAccounts} />

            {failures.total > 0 && (
                <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap', px: 1.5, py: .8, mb: 1.5, borderRadius: 2, border: '1px solid #f45b6b', bgcolor: 'rgba(244,63,94,.08)', color: '#fda4af' }}>
                    <WarningAmberOutlinedIcon fontSize="small" />
                    <Box component="strong" sx={{ fontSize: 13 }}>{failures.total} cuentas fallidas</Box>
                    <Box component="span" sx={{ fontSize: 12 }}>Main: {failures.main} · Backup: {failures.backup} · {failures.errors} con error / {failures.expired} vencidas</Box>
                    <Button size="small" onClick={() => { setFilterStatus('failed'); setFilterSearch(''); setFilterUsage('all'); }} sx={{ ml: 'auto', color: '#fda4af', textTransform: 'none' }}>Mostrar fallidas</Button>
                </Box>
            )}

            {/* Tabs para separar cuentas main y backup */}
            <AccountsTabs
                tab={tab}
                onChange={setTab}
                mainCount={mainAccounts.length}
                backupCount={backupAccounts.length}
            />

            {/* Barra de filtros + orden */}
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                alignItems={{ md: 'center' }}
                sx={{ mb: 1.5, flexWrap: 'wrap' }}
            >
                {/* Búsqueda */}
                <TextField
                    size="small"
                    placeholder="Buscar ID, alias o email…"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        minWidth: 180,
                        maxWidth: 240,
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(15,23,42,0.6)',
                            borderRadius: '8px',
                            fontSize: '.8rem',
                            color: '#e2e8f0',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                            '&:hover fieldset': { borderColor: 'rgba(56,189,248,0.3)' },
                            '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
                        },
                    }}
                />

                {/* Estado */}
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={filterStatus}
                    onChange={(_, v) => v && setFilterStatus(v)}
                    sx={{ '& .MuiToggleButton-root': { fontSize: '.7rem', px: 1, py: 0.4, color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', '&.Mui-selected': { bgcolor: 'rgba(56,189,248,0.15)', color: '#7dd3fc', borderColor: 'rgba(56,189,248,0.3)' } } }}
                >
                    <ToggleButton value="all">Todas</ToggleButton>
                    <ToggleButton value="failed" sx={{ color: '#fb7185', '&.Mui-selected': { color: '#fda4af !important', bgcolor: 'rgba(244,63,94,.15) !important' } }}>Fallidas</ToggleButton>
                    <ToggleButton value="CONNECTED" sx={{ '&.Mui-selected': { color: '#4ade80 !important', bgcolor: 'rgba(34,197,94,0.12) !important' } }}>OK</ToggleButton>
                    <ToggleButton value="ERROR" sx={{ '&.Mui-selected': { color: '#f87171 !important', bgcolor: 'rgba(239,68,68,0.12) !important' } }}>Error</ToggleButton>
                    <ToggleButton value="EXPIRED" sx={{ '&.Mui-selected': { color: '#fbbf24 !important', bgcolor: 'rgba(245,158,11,0.12) !important' } }}>Exp</ToggleButton>
                </ToggleButtonGroup>

                {/* Uso */}
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={filterUsage}
                    onChange={(_, v) => v && setFilterUsage(v)}
                    sx={{ '& .MuiToggleButton-root': { fontSize: '.7rem', px: 1, py: 0.4, color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', '&.Mui-selected': { bgcolor: 'rgba(56,189,248,0.15)', color: '#7dd3fc', borderColor: 'rgba(56,189,248,0.3)' } } }}
                >
                    <ToggleButton value="all">Uso: Todo</ToggleButton>
                    <ToggleButton value="low" sx={{ '&.Mui-selected': { color: '#4ade80 !important' } }}>&lt;50%</ToggleButton>
                    <ToggleButton value="mid" sx={{ '&.Mui-selected': { color: '#fbbf24 !important' } }}>50-80%</ToggleButton>
                    <ToggleButton value="high" sx={{ '&.Mui-selected': { color: '#f87171 !important' } }}>&gt;80%</ToggleButton>
                    <ToggleButton value="over" sx={{ color: '#fb7185', '&.Mui-selected': { color: '#ff455f !important', bgcolor: 'rgba(255,24,59,.12) !important' } }}>+100%</ToggleButton>
                </ToggleButtonGroup>

                {/* Orden */}
                <Box sx={{ ml: { md: 'auto' }, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SortIcon sx={{ fontSize: 16, color: '#64748b' }} />
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={sortBy}
                        onChange={(_, v) => v && setSortBy(v)}
                        sx={{ '& .MuiToggleButton-root': { fontSize: '.65rem', px: 0.8, py: 0.3, color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', '&.Mui-selected': { bgcolor: 'rgba(56,189,248,0.15)', color: '#c4b5fd', borderColor: 'rgba(56,189,248,0.3)' } } }}
                    >
                        <Tooltip title="Alias Z→A" arrow><ToggleButton value="alias-desc">Z→A</ToggleButton></Tooltip>
                        <Tooltip title="Alias A→Z" arrow><ToggleButton value="alias-asc">A→Z</ToggleButton></Tooltip>
                        <Tooltip title="Más llenas primero" arrow><ToggleButton value="usage-desc">%↓</ToggleButton></Tooltip>
                        <Tooltip title="Menos llenas primero" arrow><ToggleButton value="usage-asc">%↑</ToggleButton></Tooltip>
                        <Tooltip title="Más recientes" arrow><ToggleButton value="date-desc">📅↓</ToggleButton></Tooltip>
                    </ToggleButtonGroup>
                </Box>

                {/* Contador */}
                <Box sx={{ fontSize: '.75rem', color: '#64748b', ml: 1, whiteSpace: 'nowrap' }}>
                    {shownAccounts.length} / {tabAccounts.length}
                </Box>
            </Stack>

            <VirtualAccountsGrid
                accounts={shownAccounts}
                resetKey={`${activeEmailGroup}:${tab}:${deferredSearch}:${filterStatus}:${filterUsage}:${sortBy}`}
                pendingIds={pendingIds}
                onClick={openDetail}
                onCleanup={setCleanupAccount}
                onTest={testConnection}
                onCancelTest={cancelTest}
                loadingAny={loading}
                testing={testing}
            />
            {!loading && shownAccounts.length === 0 && (
                <Box sx={{ p: 2, color: '#94a3b8', fontSize: 13 }}>No hay cuentas que coincidan con estos filtros.</Box>
            )}

            {cleanupAccount && <ExcessCleanupModal account={cleanupAccount} onClose={() => setCleanupAccount(null)} onComplete={refreshCleanupAccounts} />}
            <AccountDrawer
                open={open}
                onClose={() => setOpen(false)}
                selected={selected}
                assets={assets}
                assetsLoading={assetsLoading}
                assetsSearch={assetsSearch}
                setAssetsSearch={setAssetsSearch}
                backupCandidates={backupCandidates}
                loadingBackups={loadingBackups}
                selectedBackupCandidate={selectedBackupCandidate}
                setSelectedBackupCandidate={setSelectedBackupCandidate}
                addBackup={addBackup}
                addingBackup={addingBackup}
                removeBackup={removeBackup}
                onUpdateAccount={patchAccount}
                onDeleteAccount={deleteAccount}
            />

            <BulkAddAccountsModal
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
                onComplete={() => fetchAccounts()}
            />
        </div>
    );
}
