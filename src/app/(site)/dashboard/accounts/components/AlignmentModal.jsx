'use client';
import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    Checkbox,
    CircularProgress,
    IconButton,
    Stack,
    Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import AppButton from '@/components/layout/Buttons/Button';
import accountService from '@/services/AccountService';

export default function AlignmentModal({ open, onClose, account }) {
    const [phase, setPhase] = useState('idle');
    const [auditData, setAuditData] = useState(null);
    const [error, setError] = useState(null);

    const [selectedMissing, setSelectedMissing] = useState(new Set());
    const [selectedOrphansMain, setSelectedOrphansMain] = useState(new Set());
    const [selectedOrphansBackup, setSelectedOrphansBackup] = useState(new Set());

    const [actionResult, setActionResult] = useState(null);

    async function handleAudit() {
        if (!account?.id) return;
        setPhase('auditing');
        setError(null);
        setAuditData(null);
        setSelectedMissing(new Set());
        setSelectedOrphansMain(new Set());
        setSelectedOrphansBackup(new Set());
        setActionResult(null);
        try {
            const data = await accountService.auditAlignment(account.id);
            setAuditData(data);
            setPhase('results');
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Error desconocido');
            setPhase('idle');
        }
    }

    async function handleSync() {
        if (!selectedMissing.size || !account?.id) return;
        setPhase('syncing');
        setActionResult(null);
        try {
            const slugs = Array.from(selectedMissing);
            const data = await accountService.syncAlignment(account.id, slugs);
            setActionResult({ type: 'sync', ...data });
            await handleAudit();
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Error sincronizando');
            setPhase('results');
        }
    }

    async function handleCleanup(target) {
        const selected = target === 'main' ? selectedOrphansMain : selectedOrphansBackup;
        if (!selected.size || !account?.id) return;
        setPhase('cleaning');
        setActionResult(null);
        try {
            const folders = Array.from(selected);
            const data = await accountService.cleanupAlignment(account.id, folders, target);
            setActionResult({ type: 'cleanup', target, ...data });
            await handleAudit();
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Error eliminando');
            setPhase('results');
        }
    }

    function toggleSet(setter, key) {
        setter(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function toggleAllSet(setter, items, currentSet) {
        if (!items?.length) return;
        setter(currentSet.size === items.length ? new Set() : new Set(items));
    }

    const isLoading = phase === 'auditing' || phase === 'syncing' || phase === 'cleaning';

    return (
        <Dialog
            open={open}
            onClose={isLoading ? undefined : onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: '#0f172a',
                    backgroundImage: 'none',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    borderRadius: '12px',
                    maxHeight: '85vh',
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#e2e8f0' }}>
                    Verificar Alineación
                </Typography>
                <IconButton onClick={onClose} disabled={isLoading} sx={{ color: '#94a3b8' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pt: 0 }}>
                {/* Account info */}
                <Box sx={{ mb: 2, p: 1.5, borderRadius: '8px', bgcolor: 'rgba(30,41,59,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Typography variant="body2" color="text.secondary">
                        Main: <strong style={{ color: '#e2e8f0' }}>{account?.alias}</strong>
                        {auditData?.backupAlias && (
                            <> &nbsp;→&nbsp; Backup: <strong style={{ color: '#a78bfa' }}>{auditData.backupAlias}</strong></>
                        )}
                    </Typography>
                    {auditData && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            BD: {auditData.totalAssetsInBD} assets &nbsp;|&nbsp;
                            Main MEGA: {auditData.totalFoldersInMain} carpetas &nbsp;|&nbsp;
                            Backup MEGA: {auditData.totalFoldersInBackup} carpetas
                        </Typography>
                    )}
                </Box>

                {/* Idle */}
                {phase === 'idle' && !error && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <AppButton variant="purple" width="220px" styles={{ height: 42, fontWeight: 600 }} onClick={handleAudit}>
                            Verificar Alineación
                        </AppButton>
                    </Box>
                )}

                {/* Loading */}
                {isLoading && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress size={40} sx={{ color: '#8b5cf6', mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                            {phase === 'auditing' && 'Escaneando Main MEGA y Backup MEGA...'}
                            {phase === 'syncing' && 'Sincronizando (descarga de Main → subida a Backup)...'}
                            {phase === 'cleaning' && 'Eliminando carpetas huérfanas...'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Revisa la consola del servidor para ver el progreso detallado.
                        </Typography>
                    </Box>
                )}

                {/* Error */}
                {error && (
                    <Box sx={{ p: 2, borderRadius: '8px', bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', mb: 2 }}>
                        <Typography variant="body2" sx={{ color: '#f87171' }}>{error}</Typography>
                        <AppButton variant="purple" width="180px" styles={{ height: 34, mt: 1 }} onClick={handleAudit}>
                            Reintentar
                        </AppButton>
                    </Box>
                )}

                {/* Action Result Banner */}
                {actionResult && (
                    <Box sx={{
                        p: 1.5, mb: 2, borderRadius: '8px',
                        bgcolor: (actionResult.failCount > 0 || actionResult.failed > 0) ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                        border: `1px solid ${(actionResult.failCount > 0 || actionResult.failed > 0) ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    }}>
                        <Typography variant="body2" sx={{ color: (actionResult.failCount > 0 || actionResult.failed > 0) ? '#fbbf24' : '#4ade80' }}>
                            {actionResult.type === 'sync' && `Sincronización completada: ${actionResult.okCount} OK, ${actionResult.failCount} fallidos`}
                            {actionResult.type === 'cleanup' && `Limpieza ${actionResult.target?.toUpperCase()}: ${actionResult.deleted} eliminados, ${actionResult.failed || 0} fallidos`}
                        </Typography>
                    </Box>
                )}

                {/* Results */}
                {phase === 'results' && auditData && (
                    <>
                        {/* Summary Cards */}
                        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: 1, minWidth: 90, p: 1, borderRadius: '8px', bgcolor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center' }}>
                                <CheckCircleIcon sx={{ fontSize: 18, color: '#4ade80', mb: 0.2 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#4ade80', fontSize: '1.1rem' }}>
                                    {auditData.synced?.length || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '.65rem' }}>Sincronizados</Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 90, p: 1, borderRadius: '8px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                                <ReportProblemIcon sx={{ fontSize: 18, color: '#f87171', mb: 0.2 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#f87171', fontSize: '1.1rem' }}>
                                    {auditData.missingInMain?.length || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '.65rem' }}>Faltan en Main</Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 90, p: 1, borderRadius: '8px', bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
                                <WarningAmberIcon sx={{ fontSize: 18, color: '#fbbf24', mb: 0.2 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fbbf24', fontSize: '1.1rem' }}>
                                    {auditData.missingInBackup?.length || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '.65rem' }}>Faltan en Backup</Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 90, p: 1, borderRadius: '8px', bgcolor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
                                <ErrorIcon sx={{ fontSize: 18, color: '#818cf8', mb: 0.2 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#818cf8', fontSize: '1.1rem' }}>
                                    {(auditData.orphansInMain?.length || 0) + (auditData.orphansInBackup?.length || 0)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '.65rem' }}>Huérfanos</Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                            <AppButton variant="purple" width="140px" styles={{ height: 30, fontSize: '.72rem' }} onClick={handleAudit}>
                                Re-escanear
                            </AppButton>
                        </Stack>

                        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />

                        {/* Missing in Main (CRITICAL) */}
                        {auditData.missingInMain?.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f87171', mb: 0.5 }}>
                                    ⚠️ Faltan en Main ({auditData.missingInMain.length}) — En BD pero NO en MEGA Main
                                </Typography>
                                <Box sx={{ maxHeight: 150, overflow: 'auto', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', bgcolor: 'rgba(239,68,68,0.04)' }}>
                                    {auditData.missingInMain.map(item => (
                                        <Stack key={item.slug} direction="row" alignItems="center" sx={{ px: 1, py: 0.4, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fca5a5' }}>
                                                {item.title || item.slug}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#64748b', flexShrink: 0, ml: 1 }}>
                                                {item.sizeMB} MB
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    Estos assets están en la BD pero no se encontraron en Main MEGA. Posible DMCA o eliminación manual.
                                </Typography>
                            </Box>
                        )}

                        {/* Missing in Backup (actionable - sync) */}
                        {auditData.missingInBackup?.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <Checkbox
                                            size="small"
                                            checked={selectedMissing.size === auditData.missingInBackup.length}
                                            indeterminate={selectedMissing.size > 0 && selectedMissing.size < auditData.missingInBackup.length}
                                            onChange={() => toggleAllSet(setSelectedMissing, auditData.missingInBackup.map(i => i.slug), selectedMissing)}
                                            sx={{ color: '#fbbf24', '&.Mui-checked': { color: '#fbbf24' }, '&.MuiCheckbox-indeterminate': { color: '#fbbf24' } }}
                                        />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fbbf24' }}>
                                            Faltan en Backup ({auditData.missingInBackup.length})
                                        </Typography>
                                    </Stack>
                                    <AppButton
                                        variant="purple"
                                        width="200px"
                                        styles={{ height: 30, fontSize: '.7rem', fontWeight: 600 }}
                                        onClick={handleSync}
                                        disabled={!selectedMissing.size}
                                    >
                                        <SyncIcon sx={{ fontSize: 13, mr: 0.5 }} />
                                        Sincronizar ({selectedMissing.size})
                                    </AppButton>
                                </Stack>
                                <Box sx={{ maxHeight: 180, overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px' }}>
                                    {auditData.missingInBackup.map(item => (
                                        <Stack key={item.slug} direction="row" alignItems="center" sx={{ px: 1, py: 0.3, borderBottom: '1px solid rgba(255,255,255,0.04)', '&:hover': { bgcolor: 'rgba(139,92,246,0.05)' } }}>
                                            <Checkbox size="small" checked={selectedMissing.has(item.slug)} onChange={() => toggleSet(setSelectedMissing, item.slug)} sx={{ p: 0.3, color: '#64748b', '&.Mui-checked': { color: '#8b5cf6' } }} />
                                            <Typography variant="body2" sx={{ flex: 1, ml: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#cbd5e1' }}>
                                                {item.title || item.slug}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#64748b', flexShrink: 0 }}>{item.sizeMB} MB</Typography>
                                        </Stack>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Orphans in Main (actionable - delete) */}
                        {auditData.orphansInMain?.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <Checkbox
                                            size="small"
                                            checked={selectedOrphansMain.size === auditData.orphansInMain.length}
                                            indeterminate={selectedOrphansMain.size > 0 && selectedOrphansMain.size < auditData.orphansInMain.length}
                                            onChange={() => toggleAllSet(setSelectedOrphansMain, auditData.orphansInMain.map(i => i.folder), selectedOrphansMain)}
                                            sx={{ color: '#818cf8', '&.Mui-checked': { color: '#818cf8' }, '&.MuiCheckbox-indeterminate': { color: '#818cf8' } }}
                                        />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#818cf8' }}>
                                            Huérfanos en Main ({auditData.orphansInMain.length})
                                        </Typography>
                                    </Stack>
                                    <AppButton
                                        variant="cyan"
                                        width="180px"
                                        styles={{ height: 30, fontSize: '.7rem', fontWeight: 600, background: '#4338ca' }}
                                        onClick={() => handleCleanup('main')}
                                        disabled={!selectedOrphansMain.size}
                                    >
                                        <DeleteSweepIcon sx={{ fontSize: 13, mr: 0.5 }} />
                                        Eliminar ({selectedOrphansMain.size})
                                    </AppButton>
                                </Stack>
                                <Box sx={{ maxHeight: 150, overflow: 'auto', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', bgcolor: 'rgba(99,102,241,0.04)' }}>
                                    {auditData.orphansInMain.map(item => (
                                        <Stack key={item.folder} direction="row" alignItems="center" sx={{ px: 1, py: 0.3, borderBottom: '1px solid rgba(255,255,255,0.04)', '&:hover': { bgcolor: 'rgba(99,102,241,0.05)' } }}>
                                            <Checkbox size="small" checked={selectedOrphansMain.has(item.folder)} onChange={() => toggleSet(setSelectedOrphansMain, item.folder)} sx={{ p: 0.3, color: '#64748b', '&.Mui-checked': { color: '#818cf8' } }} />
                                            <Typography variant="body2" sx={{ flex: 1, ml: 0.5, color: '#c7d2fe', fontFamily: 'monospace', fontSize: '.8rem' }}>
                                                {item.folder}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Orphans in Backup (actionable - delete) */}
                        {auditData.orphansInBackup?.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <Checkbox
                                            size="small"
                                            checked={selectedOrphansBackup.size === auditData.orphansInBackup.length}
                                            indeterminate={selectedOrphansBackup.size > 0 && selectedOrphansBackup.size < auditData.orphansInBackup.length}
                                            onChange={() => toggleAllSet(setSelectedOrphansBackup, auditData.orphansInBackup.map(i => i.folder), selectedOrphansBackup)}
                                            sx={{ color: '#f87171', '&.Mui-checked': { color: '#f87171' }, '&.MuiCheckbox-indeterminate': { color: '#f87171' } }}
                                        />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f87171' }}>
                                            Huérfanos en Backup ({auditData.orphansInBackup.length})
                                        </Typography>
                                    </Stack>
                                    <AppButton
                                        variant="cyan"
                                        width="180px"
                                        styles={{ height: 30, fontSize: '.7rem', fontWeight: 600, background: '#b71c1c' }}
                                        onClick={() => handleCleanup('backup')}
                                        disabled={!selectedOrphansBackup.size}
                                    >
                                        <DeleteSweepIcon sx={{ fontSize: 13, mr: 0.5 }} />
                                        Eliminar ({selectedOrphansBackup.size})
                                    </AppButton>
                                </Stack>
                                <Box sx={{ maxHeight: 180, overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px' }}>
                                    {auditData.orphansInBackup.map(item => (
                                        <Stack key={item.folder} direction="row" alignItems="center" sx={{ px: 1, py: 0.3, borderBottom: '1px solid rgba(255,255,255,0.04)', '&:hover': { bgcolor: 'rgba(239,68,68,0.05)' } }}>
                                            <Checkbox size="small" checked={selectedOrphansBackup.has(item.folder)} onChange={() => toggleSet(setSelectedOrphansBackup, item.folder)} sx={{ p: 0.3, color: '#64748b', '&.Mui-checked': { color: '#ef4444' } }} />
                                            <Typography variant="body2" sx={{ flex: 1, ml: 0.5, color: '#cbd5e1', fontFamily: 'monospace', fontSize: '.8rem' }}>
                                                {item.folder}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* All good */}
                        {(auditData.missingInMain?.length === 0 && auditData.missingInBackup?.length === 0 &&
                          auditData.orphansInMain?.length === 0 && auditData.orphansInBackup?.length === 0) && (
                            <Box sx={{ textAlign: 'center', py: 3 }}>
                                <CheckCircleIcon sx={{ fontSize: 48, color: '#4ade80', mb: 1 }} />
                                <Typography variant="h6" sx={{ color: '#4ade80', fontWeight: 700 }}>
                                    Cuentas 100% alineadas
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Todos los {auditData.synced?.length || 0} assets están sincronizados en Main y Backup.
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
