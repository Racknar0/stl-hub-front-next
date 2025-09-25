import React, { useState } from 'react';
import {
    Drawer,
    Box,
    Typography,
    Divider,
    Stack,
    TextField,
    CircularProgress,
} from '@mui/material';
import StatusChip from './StatusChip';
import AppButton from '@/components/layout/Buttons/Button';
import accountService from '@/services/AccountService';

function formatMB(bytes) {
    const n = Number(bytes);
    if (!n || n <= 0) return '0 MB';
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AccountDrawer({
    open,
    onClose,
    selected,
    assets,
    assetsLoading,
    assetsSearch,
    setAssetsSearch,
    backupCandidates,
    loadingBackups,
    selectedBackupCandidate,
    setSelectedBackupCandidate,
    addBackup,
    addingBackup,
    removeBackup,
}) {
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const [restoreResult, setRestoreResult] = useState(null);

    console.log('backupCandidates', backupCandidates);

    async function handleSyncMainBackups() {
        if (!selected) return;
        setSyncLoading(true);
        setSyncResult(null);
        console.log('[FRONT][SYNC] Click main->backups account', selected.id);
        try {
            const data = await accountService.syncMainToBackups(selected.id);
            setSyncResult(data);
        } catch (e) {
            // error ya mostrado por handler
        } finally {
            setSyncLoading(false);
        }
    }

    async function handleRestoreBackupsToMain() {
        if (!selected) return;
        setRestoreLoading(true);
        setRestoreResult(null);
        console.log('[FRONT][RESTORE] Click backups->main account', selected.id);
        try {
            const data = await accountService.syncBackupsToMain(selected.id);
            setRestoreResult(data);
        } catch (e) {
            /* error ya mostrado */
        } finally {
            setRestoreLoading(false);
        }
    }

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            sx={{ '& .MuiDrawer-paper': { width: 520 } }}
        >
            <Box sx={{ p: 2 }}>
                {selected && (
                    <>
                        <Typography
                            className="fw-bold"
                            variant="h6"
                            sx={{ mb: 1 }}
                        >
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
                        <Typography className="fw-bold" variant="subtitle2">
                            Carpeta base
                        </Typography>
                        <Typography variant="body2">
                            <code>{selected.baseFolder}</code>
                        </Typography>
                        <Divider sx={{ my: 2 }} />
                        <Typography className="fw-bold" variant="subtitle2">
                            Tipo
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            {selected.type}
                        </Typography>
                        {selected.type === 'main' && (
                            <Box sx={{ mb: 2 }}>
                                <Typography
                                    className="fw-bold"
                                    variant="subtitle2"
                                    sx={{ mb: 1 }}
                                >
                                    Backups asignados:
                                </Typography>
                                <Stack spacing={1} sx={{ mb: 1 }}>
                                    {(selected.backups || []).length === 0 && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            Sin backups asignados
                                        </Typography>
                                    )}
                                    {(selected.backups || []).map((b) => (
                                        <Stack
                                            key={b.id}
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            sx={{
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                p: 0.5,
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Typography variant="body2">
                                                {b.alias}
                                            </Typography>
                                            <TextField
                                                type="button"
                                                value="Quitar"
                                                onClick={() =>
                                                    removeBackup(b.id)
                                                }
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    width: 80,
                                                    cursor: 'pointer',
                                                }}
                                            />
                                        </Stack>
                                    ))}
                                </Stack>
                                <Divider sx={{ my: 1 }} />
                                <Typography
                                    variant="subtitle2"
                                    sx={{ mb: 0.5 }}
                                    className="fw-bold"
                                >
                                    Agregar backup
                                </Typography>
                                {loadingBackups ? (
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        Cargando candidatos…
                                    </Typography>
                                ) : (
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{ mt: 1 }}
                                    >
                                        <TextField
                                            select
                                            size="small"
                                            label="Cuenta backup"
                                            value={selectedBackupCandidate}
                                            onChange={(e) =>
                                                setSelectedBackupCandidate(
                                                    e.target.value
                                                )
                                            }
                                            SelectProps={{ native: true }}
                                            InputLabelProps={{ shrink: true }}
                                            sx={{ flex: 1 }}
                                        >
                                            <option value="">
                                                -- seleccionar --
                                            </option>
                                            {backupCandidates
                                                .filter((c) => !c.mains || c.mains.length === 0)
                                                .map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.alias}
                                                    </option>
                                                ))}
                                        </TextField>
                                        <TextField
                                            type="button"
                                            value={
                                                addingBackup
                                                    ? 'Agregando…'
                                                    : 'Agregar'
                                            }
                                            onClick={addBackup}
                                            disabled={
                                                !selectedBackupCandidate ||
                                                addingBackup
                                            }
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                width: 100,
                                                cursor: 'pointer',
                                            }}
                                        />
                                    </Stack>
                                )}
                            </Box>
                        )}
                        {selected.type === 'backup' && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                    Es backup de
                                </Typography>
                                <Stack spacing={1}>
                                    {(selected.mains || []).length === 0 && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            No asignada como backup
                                        </Typography>
                                    )}
                                    {(selected.mains || []).map((m) => (
                                        <Stack
                                            key={m.id}
                                            direction="row"
                                            alignItems="center"
                                            justifyContent="space-between"
                                            sx={{
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                p: 0.5,
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Typography variant="body2">
                                                {m.alias}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                        <Divider sx={{ my: 2 }} />
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="subtitle2" className="fw-bold">
                                    Estado
                                </Typography>
                                <StatusChip status={selected.status} />
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <AppButton
                                    variant="cyan"
                                    width="140px"
                                    styles={{ height: 34, fontWeight: 600, fontSize: '.72rem', position:'relative' }}
                                    onClick={handleRestoreBackupsToMain}
                                    disabled={restoreLoading || selected.type !== 'main'}
                                >
                                    {restoreLoading ? 'Restaurando…' : 'backups -> main'}
                                    {restoreLoading && (
                                        <CircularProgress size={16} color="inherit" sx={{ position: 'absolute', right: 8 }} />
                                    )}
                                </AppButton>
                                <AppButton
                                    variant="purple"
                                    width="160px"
                                    styles={{ height: 34, fontWeight: 600, fontSize: '.72rem', position: 'relative' }}
                                    onClick={handleSyncMainBackups}
                                    disabled={syncLoading || selected.type !== 'main'}
                                >
                                    {syncLoading ? 'Sincronizando…' : 'main -> backups'}
                                    {syncLoading && (
                                        <CircularProgress size={16} color="inherit" sx={{ position: 'absolute', right: 8 }} />
                                    )}
                                </AppButton>
                            </Stack>
                        </Stack>
                        {(syncResult || restoreResult) && (
                            <Box sx={{ mb: 1, mt: -1 }}>
                                {syncResult && (
                                    <>
                                        <Typography variant="caption" color="text.secondary">
                                            {`Sync main->backups: subidas ${(syncResult.performed ?? (syncResult.actions?.length || 0))} / necesarias ${(syncResult.totalUploads ?? 'n/d')}`}
                                        </Typography>
                                        {Array.isArray(syncResult.actions) && syncResult.actions.length > 0 && (
                                            <Box sx={{ mt: 0.5, maxHeight: 120, overflow: 'auto', border: '1px solid rgba(255,255,255,0.12)', p: 0.5, borderRadius: 1 }}>
                                                {syncResult.actions.slice(0,50).map((a, idx) => (
                                                    <Typography key={idx} variant="caption" sx={{ display: 'block' }}>
                                                        {`backup ${a.backupId} <- asset ${a.assetId} (${a.status})`}
                                                    </Typography>
                                                ))}
                                                {syncResult.actions.length > 50 && (
                                                    <Typography variant="caption" color="text.secondary">… {syncResult.actions.length - 50} más</Typography>
                                                )}
                                            </Box>
                                        )}
                                    </>
                                )}
                                {restoreResult && (
                                    <Box sx={{ mt: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {`Restore backups->main: restaurados ${restoreResult.restored} / total candidatos ${restoreResult.total} (existían ${restoreResult.skippedExisting}, no encontrados ${restoreResult.notFoundInBackups})`}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                        <Divider sx={{ my: 2 }} />
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 1 }}
                        >
                            <Typography variant="subtitle2" className='fw-bold'>
                                Assets ({assets.length})
                            </Typography>
                            <TextField
                                size="small"
                                placeholder="Buscar"
                                value={assetsSearch}
                                onChange={(e) =>
                                    setAssetsSearch(e.target.value)
                                }
                                sx={{ width: 220 }}
                            />
                        </Stack>
                        <Box sx={{ maxHeight: 320, overflow: 'auto', pr: 1 }}>
                            {assetsLoading ? (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    Cargando…
                                </Typography>
                            ) : (
                                assets
                                    .filter((it) => {
                                        const q = assetsSearch
                                            .trim()
                                            .toLowerCase();
                                        if (!q) return true;
                                        return (
                                            it.title
                                                ?.toLowerCase()
                                                .includes(q) ||
                                            it.slug?.toLowerCase().includes(q)
                                        );
                                    })
                                    .map((it) => (
                                        <Stack
                                            key={it.id}
                                            direction="row"
                                            justifyContent="space-between"
                                            alignItems="center"
                                            sx={{
                                                py: 0.5,
                                                borderBottom:
                                                    '1px solid rgba(255,255,255,0.08)',
                                            }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    mr: 2,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {it.title}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                {formatMB(
                                                    it.fileSizeB ??
                                                        it.archiveSizeB
                                                )}
                                            </Typography>
                                        </Stack>
                                    ))
                            )}
                        </Box>
                    </>
                )}
            </Box>
        </Drawer>
    );
}
