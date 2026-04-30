'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, LinearProgress, Stack, TextField, ToggleButton, ToggleButtonGroup, InputAdornment, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import AppButton from '@/components/layout/Buttons/Button';
import HttpService from '@/services/HttpService';
import { timerAlert, errorAlert, confirmAlert } from '@/helpers/alerts';
import AddAccountForm from './components/AddAccountForm';
import StorageSummaryCard from './components/StorageSummaryCard';
import AccountsTabs from './components/AccountsTabs';
import AccountCard from './components/AccountCard';
import AccountDrawer from './components/AccountDrawer';
import StatusChip from './components/StatusChip';
import BulkAddAccountsModal from './components/BulkAddAccountsModal';

const http = new HttpService();
const API_BASE = '/accounts';
// Cuota gratuita MEGA en MB para el front (fallback). Puede sobreescribirse en build con NEXT_PUBLIC_MEGA_FREE_QUOTA_MB
const FREE_QUOTA_MB =
    Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480;

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
    const [bulkOpen, setBulkOpen] = useState(false);

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

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const res = await http.getData(`${API_BASE}`);
            setAccounts(res.data || []);
        } catch (e) {
            console.error(e);
            await errorAlert('Error', 'No se pudieron cargar las cuentas');
        } finally {
            setLoading(false);
        }
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

    // Formatear bytes a MB con 1 decimal
    const formatMB = (bytes) => {
        const n = Number(bytes);
        if (!n || n <= 0) return '0 MB';
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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
    const refresh = async () => {
        await fetchAccounts();
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
    const disconnect = async () => {
        try {
            await http.postData(`${API_BASE}/logout`, {});
            await timerAlert('OK', 'Sesión cerrada', 900);
            await fetchAccounts();
        } catch (e) {
            console.error(e);
            await errorAlert('Error', 'No se pudo cerrar sesión');
        }
    };

    // === Filtros y orden ===
    const [filterSearch, setFilterSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterUsage, setFilterUsage] = useState('all');
    const [sortBy, setSortBy] = useState('alias-desc');

    // Totales de almacenamiento de cuentas OK (CONNECTED)
    const totalStorage = useMemo(() => {
        // Solo cuentas MAIN en estado CONNECTED
        const ok = (accounts || []).filter(
            (a) => a.status === 'CONNECTED' && a.type === 'main',
        );
        let used = 0;
        let total = 0;
        for (const a of ok) {
            const t =
                a.storageTotalMB && a.storageTotalMB > 0
                    ? a.storageTotalMB
                    : FREE_QUOTA_MB;
            const u = Math.max(0, a.storageUsedMB || 0);
            used += u;
            total += t;
        }
        const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
        return { used, total, pct, okCount: ok.length };
    }, [accounts]);

    const mainAccounts = useMemo(
        () => accounts.filter((a) => a.type === 'main'),
        [accounts],
    );
    const backupAccounts = useMemo(
        () => accounts.filter((a) => a.type === 'backup'),
        [accounts],
    );
    const tabAccounts = tab === 'main' ? mainAccounts : backupAccounts;

    const shownAccounts = useMemo(() => {
        let list = [...tabAccounts];

        // Filtro búsqueda
        if (filterSearch.trim()) {
            const q = filterSearch.trim().toLowerCase();
            list = list.filter((a) =>
                (a.alias || '').toLowerCase().includes(q) ||
                (a.email || '').toLowerCase().includes(q)
            );
        }

        // Filtro estado
        if (filterStatus !== 'all') {
            list = list.filter((a) => a.status === filterStatus);
        }

        // Filtro uso
        if (filterUsage !== 'all') {
            list = list.filter((a) => {
                const total = (a.storageTotalMB && a.storageTotalMB > 0) ? a.storageTotalMB : FREE_QUOTA_MB;
                const pct = total > 0 ? (Math.max(0, a.storageUsedMB || 0) / total) * 100 : 0;
                if (filterUsage === 'low') return pct < 50;
                if (filterUsage === 'mid') return pct >= 50 && pct < 80;
                if (filterUsage === 'high') return pct >= 80;
                return true;
            });
        }

        // Ordenar
        list.sort((a, b) => {
            if (sortBy === 'alias-desc') return (b.alias || '').localeCompare(a.alias || '');
            if (sortBy === 'alias-asc') return (a.alias || '').localeCompare(b.alias || '');
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
    }, [tabAccounts, filterSearch, filterStatus, filterUsage, sortBy]);

    function getPct(a) {
        const total = (a.storageTotalMB && a.storageTotalMB > 0) ? a.storageTotalMB : FREE_QUOTA_MB;
        return total > 0 ? (Math.max(0, a.storageUsedMB || 0) / total) * 100 : 0;
    }

    return (
        <div className="dashboard-content p-3">
            <AddAccountForm
                form={form}
                setForm={setForm}
                onSubmit={addAccount}
                disabled={testing}
                onBulkOpen={() => setBulkOpen(true)}
            />

            {loading && <LinearProgress />}

            <StorageSummaryCard totalStorage={totalStorage} />

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
                    placeholder="Buscar alias o email…"
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
                            '&:hover fieldset': { borderColor: 'rgba(139,92,246,0.3)' },
                            '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                        },
                    }}
                />

                {/* Estado */}
                <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={filterStatus}
                    onChange={(_, v) => v && setFilterStatus(v)}
                    sx={{ '& .MuiToggleButton-root': { fontSize: '.7rem', px: 1, py: 0.4, color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', '&.Mui-selected': { bgcolor: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.3)' } } }}
                >
                    <ToggleButton value="all">Todas</ToggleButton>
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
                    sx={{ '& .MuiToggleButton-root': { fontSize: '.7rem', px: 1, py: 0.4, color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', '&.Mui-selected': { bgcolor: 'rgba(139,92,246,0.15)', color: '#a78bfa', borderColor: 'rgba(139,92,246,0.3)' } } }}
                >
                    <ToggleButton value="all">Uso: Todo</ToggleButton>
                    <ToggleButton value="low" sx={{ '&.Mui-selected': { color: '#4ade80 !important' } }}>&lt;50%</ToggleButton>
                    <ToggleButton value="mid" sx={{ '&.Mui-selected': { color: '#fbbf24 !important' } }}>50-80%</ToggleButton>
                    <ToggleButton value="high" sx={{ '&.Mui-selected': { color: '#f87171 !important' } }}>&gt;80%</ToggleButton>
                </ToggleButtonGroup>

                {/* Orden */}
                <Box sx={{ ml: { md: 'auto' }, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SortIcon sx={{ fontSize: 16, color: '#64748b' }} />
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={sortBy}
                        onChange={(_, v) => v && setSortBy(v)}
                        sx={{ '& .MuiToggleButton-root': { fontSize: '.65rem', px: 0.8, py: 0.3, color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', '&.Mui-selected': { bgcolor: 'rgba(139,92,246,0.15)', color: '#c4b5fd', borderColor: 'rgba(139,92,246,0.3)' } } }}
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

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        md: 'repeat(5, 1fr)',
                        lg: 'repeat(7, 1fr)',
                    },
                    gap: 1,
                }}
            >
                {shownAccounts.map((acc) => (
                    <AccountCard
                        key={acc.id}
                        acc={acc}
                        onClick={openDetail}
                        isPending={pendingIds.has(acc.id)}
                        onTest={testConnection}
                        onCancelTest={cancelTest}
                        loadingAny={loading}
                        testing={testing}
                    />
                ))}
                {shownAccounts.length === 0 && (
                    <Box className="glass" sx={{ p: 2, gridColumn: '1 / -1' }}>
                        {tab === 'main'
                            ? 'No hay cuentas main'
                            : 'No hay cuentas backup'}
                    </Box>
                )}
            </Box>

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
