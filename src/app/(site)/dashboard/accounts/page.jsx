'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, LinearProgress, Stack } from '@mui/material';
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

    const validateAll = async () => {
        try {
            setLoading(true);
            setValidatingAll(true);
            cancelValidationRef.current = false;
            const res = await http.getData(`${API_BASE}`);
            const list = res.data || [];
            setPendingIds(new Set(list.map((a) => a.id)));
            let completed = 0;
            let skipped = 0;
            for (const acc of list) {
                if (cancelValidationRef.current) {
                    // Limpiar los pendientes restantes
                    setPendingIds(new Set());
                    skipped = list.length - completed;
                    break;
                }
                try {
                    await http.postData(`${API_BASE}/${acc.id}/test`, {});
                } catch (e) {
                    console.error('Fallo validación cuenta', acc.id, e);
                } finally {
                    endPending(acc.id);
                    completed++;
                }
            }
            await fetchAccounts();
            if (cancelValidationRef.current) {
                await timerAlert('Detenido', `Validación detenida. ${completed} validadas, ${skipped} omitidas.`, 1500);
            } else {
                await timerAlert('OK', 'Validación completada', 1000);
            }
        } catch (e) {
            console.error(e);
            await errorAlert('Error', 'No se pudieron validar las cuentas');
        } finally {
            setLoading(false);
            setValidatingAll(false);
            cancelValidationRef.current = false;
        }
    };

    const stopValidation = () => {
        cancelValidationRef.current = true;
    };

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
    const shownAccounts = tab === 'main' ? mainAccounts : backupAccounts;

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
