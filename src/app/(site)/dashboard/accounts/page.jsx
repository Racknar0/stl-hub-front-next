'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, LinearProgress, Stack } from '@mui/material';
import AppButton from '@/components/layout/Buttons/Button';
import HttpService from '@/services/HttpService';
import { timerAlert, errorAlert } from '@/helpers/alerts';
import AddAccountForm from './components/AddAccountForm';
import StorageSummaryCard from './components/StorageSummaryCard';
import AccountsTabs from './components/AccountsTabs';
import AccountCard from './components/AccountCard';
import AccountDrawer from './components/AccountDrawer';
import StatusChip from './components/StatusChip';

const http = new HttpService();
const API_BASE = '/accounts';
// Cuota gratuita MEGA en MB para el front (fallback). Puede sobreescribirse en build con NEXT_PUBLIC_MEGA_FREE_QUOTA_MB
const FREE_QUOTA_MB = Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480;

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
        try {
            setTesting(true);
            startPending(id);
            await http.postData(`${API_BASE}/${id}/test`, {});
            await timerAlert('OK', 'Conexión verificada', 1200);
            await fetchAccounts();
        } catch (e) {
            console.error(e);
            await fetchAccounts();
            await errorAlert('Error', 'Falló la verificación');
        } finally {
            endPending(id);
            setTesting(false);
        }
    };

    const addAccount = async () => {
        const { alias, email, baseFolder, type, username, password } = form;
        if (!alias || !email || !baseFolder || !username || !password) {
            await errorAlert(
                'Faltan datos',
                'Alias, correo, carpeta, usuario y contraseña son obligatorios'
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
                        'Cuenta creada pero falló la validación'
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
        setSelected({ ...acc, backups: acc.backups || [], mains: acc.mains || [] });
        setOpen(true);
        try {
            await Promise.all([
                fetchAccountAssets(acc.id),
                loadBackupCandidates(acc.id, acc.type),
            ]);
        } catch (e) { console.error('openDetail error', e); }
    };

    const refreshSelectedDetail = async () => {
        if (!selected) return;
        try {
            const res = await http.getData(`${API_BASE}`);
            const arr = res.data || [];
            const found = arr.find(a => a.id === selected.id);
            if (found) setSelected(prev => ({ ...prev, ...found }));
        } catch (e) { console.error('refreshSelectedDetail', e); }
    };

    const loadBackupCandidates = async (id, type) => {
        if (type !== 'main') { setBackupCandidates([]); return; }
        try {
            setLoadingBackups(true);
            const res = await http.getData(`${API_BASE}/${id}/backup-candidates`);
            // Filtrar: solo mostrar cuentas que no tengan mains asociadas
            const filtered = (res.data?.items || []).filter(c => !c.mains || c.mains.length === 0);
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
            await http.postData(`${API_BASE}/${selected.id}/backups`, { backupAccountId: Number(selectedBackupCandidate) });
            await Promise.all([refreshSelectedDetail(), loadBackupCandidates(selected.id, selected.type)]);
            setSelectedBackupCandidate('');
        } catch (e) {
            console.error('addBackup error', e);
        } finally { setAddingBackup(false); }
    };

    const removeBackup = async (backupId) => {
        if (!selected) return;
        try {
            await http.deleteRaw(`${API_BASE}/${selected.id}/backups/${backupId}`);
            await Promise.all([refreshSelectedDetail(), loadBackupCandidates(selected.id, selected.type)]);
        } catch (e) { console.error('removeBackup error', e); }
    };
    const refresh = async () => {
        await fetchAccounts();
    };

    const patchAccount = async (id, data) => {
        const resp = await http.patchData(`${API_BASE}`, id, data);
        const updated = resp.data;
        // Actualizar lista
        setAccounts((prev) => (prev || []).map((a) => (a.id === id ? { ...a, ...updated } : a)));
        // Actualizar seleccionado si corresponde
        setSelected((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
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
            const res = await http.getData(`${API_BASE}`);
            const list = res.data || [];
            // Marcar todos como pendientes mientras se validan secuencialmente
            setPendingIds(new Set(list.map((a) => a.id)));
            for (const acc of list) {
                try {
                    await http.postData(`${API_BASE}/${acc.id}/test`, {});
                } catch (e) {
                    console.error('Fallo validación cuenta', acc.id, e);
                } finally {
                    endPending(acc.id);
                }
            }
            await timerAlert('OK', 'Validación completada', 1000);
            await fetchAccounts();
        } catch (e) {
            console.error(e);
            await errorAlert('Error', 'No se pudieron validar las cuentas');
        } finally {
            setLoading(false);
        }
    };

    // Totales de almacenamiento de cuentas OK (CONNECTED)
    const totalStorage = useMemo(() => {
        // Solo cuentas MAIN en estado CONNECTED
        const ok = (accounts || []).filter((a) => a.status === 'CONNECTED' && a.type === 'main');
        let used = 0;
        let total = 0;
        for (const a of ok) {
            const t = a.storageTotalMB && a.storageTotalMB > 0 ? a.storageTotalMB : FREE_QUOTA_MB;
            const u = Math.max(0, a.storageUsedMB || 0);
            used += u;
            total += t;
        }
        const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
        return { used, total, pct, okCount: ok.length };
    }, [accounts]);

    const mainAccounts = useMemo(() => accounts.filter(a => a.type === 'main'), [accounts]);
    const backupAccounts = useMemo(() => accounts.filter(a => a.type === 'backup'), [accounts]);
    const shownAccounts = tab === 'main' ? mainAccounts : backupAccounts;

    return (
        <div className="dashboard-content p-3">
            <AddAccountForm form={form} setForm={setForm} onSubmit={addAccount} disabled={testing} />

            {loading && <LinearProgress />}

            <StorageSummaryCard totalStorage={totalStorage} />

            {/* Botón Refrescar Todas oculto por ahora para evitar validar en masa */}
            {false && (
              <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                  <AppButton
                      variant="purple"
                      onClick={validateAll}
                      disabled={loading || testing}
                      styles={{ fontWeight: 400, marginBottom: '20px' }}
                      width={'250px'}
                  >
                      Refrescar Todas
                  </AppButton>
              </Stack>
            )}

            {/* Tabs para separar cuentas main y backup */}
            <AccountsTabs tab={tab} onChange={setTab} mainCount={mainAccounts.length} backupCount={backupAccounts.length} />

            <Grid container spacing={2}>
              {shownAccounts.map(acc => (
                <Grid item xs={12} md={4} key={acc.id}>
                  <AccountCard
                    acc={acc}
                    onClick={openDetail}
                    isPending={pendingIds.has(acc.id)}
                    onTest={testConnection}
                    loadingAny={loading}
                    testing={testing}
                  />
                </Grid>
              ))}
              {shownAccounts.length === 0 && (
                <Grid item xs={12}>
                  <Box className="glass" sx={{ p:2 }}>
                    {tab === 'main' ? 'No hay cuentas main' : 'No hay cuentas backup'}
                  </Box>
                </Grid>
              )}
            </Grid>

            <AccountDrawer
              open={open}
              onClose={()=>setOpen(false)}
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
        </div>
    );
}
