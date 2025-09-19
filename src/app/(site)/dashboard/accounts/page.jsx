'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Grid,
    LinearProgress,
    Stack,
    Typography,
    Chip,
    Button as MUIButton,
    Divider,
    Drawer,
    TextField,
    CircularProgress,
} from '@mui/material';
import AppButton from '@/components/layout/Buttons/Button';
import HttpService from '@/services/HttpService';
import { timerAlert, errorAlert } from '@/helpers/alerts';

const http = new HttpService();
const API_BASE = '/accounts';
// Cuota gratuita MEGA en MB para el front (fallback). Puede sobreescribirse en build con NEXT_PUBLIC_MEGA_FREE_QUOTA_MB
const FREE_QUOTA_MB = Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480;

// Reponer chip de estado (sin puntito)
const StatusChip = ({ status }) => {
    const map = {
        CONNECTED: { label: 'OK', color: 'success' },
        EXPIRED: { label: 'Expirada', color: 'warning' },
        ERROR: { label: 'ERROR', color: 'error' },
        SUSPENDED: { label: 'Suspendida', color: 'default' },
    };
    const { label, color } = map[status] || { label: status, color: 'default' };
    return <Chip label={label} color={color} size="small" />;
};

export default function AccountsOverviewPage() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    // Estado del listado de assets en el modal derecho
    const [assets, setAssets] = useState([]);
    const [assetsLoading, setAssetsLoading] = useState(false);
    const [assetsSearch, setAssetsSearch] = useState('');

    const [form, setForm] = useState({
        alias: '',
        email: '',
        baseFolder: '/STLHUB',
        priority: 1,
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
        const { alias, email, baseFolder, priority, username, password } = form;
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
                priority: Number(priority) || 1,
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
                priority: 1,
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
        setSelected(acc);
        setOpen(true);
        try {
            await fetchAccountAssets(acc.id);
        } catch {}
    };
    const refresh = async () => {
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
        const ok = (accounts || []).filter((a) => a.status === 'CONNECTED');
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

    const isToday = (d) => {
      if (!d) return false;
      const dt = new Date(d);
      if (isNaN(dt)) return false;
      const now = new Date();
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
    };

    return (
        <div className="dashboard-content p-3">
            <Card className="glass" sx={{ mb: 2 }}>
                <CardHeader title="Añadir cuenta MEGA" />
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={2}>
                            <TextField
                                label="Alias"
                                fullWidth
                                value={form.alias}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        alias: e.target.value,
                                    }))
                                }
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                type="email"
                                label="Correo"
                                fullWidth
                                value={form.email}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        email: e.target.value,
                                    }))
                                }
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                label="Carpeta base"
                                fullWidth
                                value={form.baseFolder}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        baseFolder: e.target.value,
                                    }))
                                }
                            />
                        </Grid>
                        <Grid item xs={6} md={1}>
                            <TextField
                                type="number"
                                label="Prioridad"
                                fullWidth
                                value={form.priority}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        priority: e.target.value,
                                    }))
                                }
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                label="Usuario (MEGA email)"
                                fullWidth
                                value={form.username}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        username: e.target.value,
                                    }))
                                }
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <TextField
                                type="password"
                                label="Contraseña"
                                fullWidth
                                value={form.password}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        password: e.target.value,
                                    }))
                                }
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="flex-end"
                            >
                                <MUIButton
                                    variant="outlined"
                                    onClick={addAccount}
                                    disabled={testing}
                                >
                                    Crear
                                </MUIButton>
                            </Stack>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {loading && <LinearProgress />}

            {/* Barra total de almacenamiento para cuentas OK */}
            {totalStorage.okCount > 0 && (
                <Card className="glass" sx={{ mb: 2 }}>
                    <CardHeader
                        title="Almacenamiento total (cuentas OK)"
                        subheader={totalStorage.okCount === 1 ? '1 cuenta' : `${totalStorage.okCount} cuentas`}
                    />
                    <CardContent>
                        <Box sx={{ mb: 1 }}>
                            <LinearProgress
                                variant="determinate"
                                value={totalStorage.pct}
                                sx={{ height: 14, borderRadius: 2 }}
                            />
                        </Box>
                        <Typography variant="body2">
                            {Math.round(totalStorage.used).toLocaleString()} MB / {Math.round(totalStorage.total).toLocaleString()} MB
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {(totalStorage.used / 1024).toFixed(2)} GB / {(totalStorage.total / 1024).toFixed(2)} GB
                        </Typography>
                    </CardContent>
                </Card>
            )}

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

            <Grid container spacing={2}>
                {accounts.map((acc) => (
                    <Grid item xs={12} md={4} key={acc.id}>
                        <Card
                            className="glass"
                            onClick={() => openDetail(acc)}
                            sx={{
                                cursor: 'pointer',
                                position: 'relative',
                                border:
                                    acc.status === 'CONNECTED'
                                        ? '1px solid #2e7d32'
                                        : acc.status === 'ERROR'
                                        ? '1px solid #d32f2f'
                                        : '1px solid transparent',
                            }}
                        >
                            {/* Barra verde si se verificó hoy */}
                            {isToday(acc.lastCheckAt) && (
                              <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, bgcolor: 'success.main', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, zIndex: 1 }} />
                            )}
                            {/* Overlay de carga mientras está pendiente */}
                            {pendingIds.has(acc.id) && (
                                <Box
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        zIndex: 2,
                                        bgcolor: 'rgba(0,0,0,0.35)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 2,
                                    }}
                                >
                                    <CircularProgress
                                        size={36}
                                        sx={{ color: '#fff' }}
                                    />
                                </Box>
                            )}
                            <CardContent>
                                <Stack spacing={1}>
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center"
                                    >
                                        <Typography variant="h6">
                                            {acc.alias}
                                        </Typography>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                          <StatusChip status={acc.status} />
                                        </Stack>
                                    </Stack>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {acc.email}
                                    </Typography>
                                    <Box>
                                        <Typography variant="caption">
                                            Uso de almacenamiento
                                        </Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={(() => {
                                              const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : FREE_QUOTA_MB;
                                              const used = Math.max(0, acc.storageUsedMB || 0);
                                              return Math.min(100, (used / total) * 100);
                                            })()}
                                            sx={{ my: 0.5 }}
                                        />
                                        <Typography variant="caption">
                                            {acc.storageUsedMB} MB / {acc.storageTotalMB > 0 ? `${acc.storageTotalMB} MB` : `${FREE_QUOTA_MB} MB`}
                                        </Typography>
                                    </Box>
                                    <Grid container spacing={1}>
                                        <Grid item xs={6}>
                                            <Typography variant="caption">
                                                Archivos
                                            </Typography>
                                            <Typography variant="body2">
                                                {acc.fileCount ?? 0}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption">
                                                Carpetas
                                            </Typography>
                                            <Typography variant="body2">
                                                {acc.folderCount ?? 0}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption">
                                                Última verificación
                                            </Typography>
                                            <Typography variant="body2">
                                                {acc.lastCheckAt
                                                    ? new Date(
                                                          acc.lastCheckAt
                                                      ).toLocaleString()
                                                    : '-'}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                    {/* Botón para actualizar solo esta cuenta */}
                                    <Stack
                                        direction="row"
                                        justifyContent="flex-end"
                                    >
                                        <AppButton
                                            variant="purple"
                                            size="140px"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                testConnection(acc.id);
                                            }}
                                            disabled={
                                                pendingIds.has(acc.id) ||
                                                loading ||
                                                testing
                                            }
                                            styles={{ fontWeight: 400 }}
                                        >
                                            Actualizar
                                        </AppButton>
                                    </Stack>
                                    {/* Eliminado botón Conectar. Dejar solo Refrescar global arriba y Desconectar opcional */}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Drawer
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                sx={{ '& .MuiDrawer-paper': { width: 520 } }}
            >
                <Box sx={{ p: 2 }}>
                    {selected && (
                        <>
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                {selected.alias}
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 2 }}
                            >
                                {selected.email}
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Typography variant="subtitle2">
                                Carpeta base
                            </Typography>
                            <Typography variant="body2">
                                <code>{selected.baseFolder}</code>
                            </Typography>

                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2">
                                Prioridad
                            </Typography>
                            <Typography variant="body2">
                                {selected.priority}
                            </Typography>

                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle2">Estado</Typography>
                            {/* Mostrar puntito en el detalle si está pendiente */}
                            <StatusChip status={selected.status} />

                            {/* Listado de assets de la cuenta */}
                            <Divider sx={{ my: 2 }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle2">Assets ({assets.length})</Typography>
                                <TextField
                                    size="small"
                                    placeholder="Buscar"
                                    value={assetsSearch}
                                    onChange={(e) => setAssetsSearch(e.target.value)}
                                    sx={{ width: 220 }}
                                />
                            </Stack>
                            <Box sx={{ maxHeight: 320, overflow: 'auto', pr: 1 }}>
                                {assetsLoading ? (
                                    <Typography variant="body2" color="text.secondary">Cargando…</Typography>
                                ) : (
                                    assets
                                        .filter((it) => {
                                            const q = assetsSearch.trim().toLowerCase();
                                            if (!q) return true;
                                            return (
                                                it.title?.toLowerCase().includes(q) ||
                                                it.slug?.toLowerCase().includes(q)
                                            );
                                        })
                                        .map((it) => (
                                            <Stack key={it.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                                <Typography variant="body2" sx={{ mr: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</Typography>
                                                <Typography variant="caption" color="text.secondary">{formatMB(it.fileSizeB ?? it.archiveSizeB)}</Typography>
                                            </Stack>
                                        ))
                                )}
                            </Box>
                        </>
                    )}
                </Box>
            </Drawer>
        </div>
    );
}
