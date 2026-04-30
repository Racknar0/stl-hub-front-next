'use client';
import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    Checkbox,
    CircularProgress,
    LinearProgress,
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
import AppButton from '@/components/layout/Buttons/Button';
import accountService from '@/services/AccountService';

export default function AlignmentModal({ open, onClose, account }) {
    const [phase, setPhase] = useState('idle'); // idle | auditing | results | syncing | cleaning
    const [auditData, setAuditData] = useState(null);
    const [error, setError] = useState(null);

    // Selection states
    const [selectedMissing, setSelectedMissing] = useState(new Set());
    const [selectedOrphans, setSelectedOrphans] = useState(new Set());

    // Action results
    const [actionResult, setActionResult] = useState(null);

    async function handleAudit() {
        if (!account?.id) return;
        setPhase('auditing');
        setError(null);
        setAuditData(null);
        setSelectedMissing(new Set());
        setSelectedOrphans(new Set());
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
            // Re-audit after sync
            await handleAudit();
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Error sincronizando');
            setPhase('results');
        }
    }

    async function handleCleanup() {
        if (!selectedOrphans.size || !account?.id) return;
        setPhase('cleaning');
        setActionResult(null);
        try {
            const folders = Array.from(selectedOrphans);
            const data = await accountService.cleanupAlignment(account.id, folders);
            setActionResult({ type: 'cleanup', ...data });
            // Re-audit after cleanup
            await handleAudit();
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Error eliminando');
            setPhase('results');
        }
    }

    function toggleMissing(slug) {
        setSelectedMissing(prev => {
            const next = new Set(prev);
            if (next.has(slug)) next.delete(slug);
            else next.add(slug);
            return next;
        });
    }

    function toggleOrphan(folder) {
        setSelectedOrphans(prev => {
            const next = new Set(prev);
            if (next.has(folder)) next.delete(folder);
            else next.add(folder);
            return next;
        });
    }

    function toggleAllMissing() {
        if (!auditData?.missingInBackup?.length) return;
        if (selectedMissing.size === auditData.missingInBackup.length) {
            setSelectedMissing(new Set());
        } else {
            setSelectedMissing(new Set(auditData.missingInBackup.map(i => i.slug)));
        }
    }

    function toggleAllOrphans() {
        if (!auditData?.orphansInBackup?.length) return;
        if (selectedOrphans.size === auditData.orphansInBackup.length) {
            setSelectedOrphans(new Set());
        } else {
            setSelectedOrphans(new Set(auditData.orphansInBackup.map(i => i.folder)));
        }
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
                </Box>

                {/* Idle: show audit button */}
                {phase === 'idle' && !error && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <AppButton variant="purple" width="220px" styles={{ height: 42, fontWeight: 600 }} onClick={handleAudit}>
                            Verificar Alineación
                        </AppButton>
                    </Box>
                )}

                {/* Loading state */}
                {isLoading && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CircularProgress size={40} sx={{ color: '#8b5cf6', mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                            {phase === 'auditing' && 'Escaneando cuentas MEGA...'}
                            {phase === 'syncing' && 'Sincronizando assets (descarga de Main → subida a Backup)...'}
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
                        bgcolor: actionResult.failCount > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
                        border: `1px solid ${actionResult.failCount > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
                    }}>
                        <Typography variant="body2" sx={{ color: actionResult.failCount > 0 ? '#fbbf24' : '#4ade80' }}>
                            {actionResult.type === 'sync' && `Sincronización completada: ${actionResult.okCount} OK, ${actionResult.failCount} fallidos`}
                            {actionResult.type === 'cleanup' && `Limpieza completada: ${actionResult.deleted} eliminados, ${actionResult.failed || 0} fallidos`}
                        </Typography>
                    </Box>
                )}

                {/* Results */}
                {phase === 'results' && auditData && (
                    <>
                        {/* Summary Cards */}
                        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                            <Box sx={{ flex: 1, p: 1.5, borderRadius: '8px', bgcolor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center' }}>
                                <CheckCircleIcon sx={{ fontSize: 20, color: '#4ade80', mb: 0.3 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#4ade80' }}>
                                    {auditData.synced?.length || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Sincronizados</Typography>
                            </Box>
                            <Box sx={{ flex: 1, p: 1.5, borderRadius: '8px', bgcolor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
                                <WarningAmberIcon sx={{ fontSize: 20, color: '#fbbf24', mb: 0.3 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fbbf24' }}>
                                    {auditData.missingInBackup?.length || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Faltan en Backup</Typography>
                            </Box>
                            <Box sx={{ flex: 1, p: 1.5, borderRadius: '8px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                                <ErrorIcon sx={{ fontSize: 20, color: '#f87171', mb: 0.3 }} />
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#f87171' }}>
                                    {auditData.orphansInBackup?.length || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">Huérfanos</Typography>
                            </Box>
                        </Stack>

                        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                            <AppButton variant="purple" width="160px" styles={{ height: 32, fontSize: '.75rem' }} onClick={handleAudit}>
                                Re-escanear
                            </AppButton>
                        </Stack>

                        <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />

                        {/* Missing in Backup */}
                        {auditData.missingInBackup?.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <Checkbox
                                            size="small"
                                            checked={selectedMissing.size === auditData.missingInBackup.length}
                                            indeterminate={selectedMissing.size > 0 && selectedMissing.size < auditData.missingInBackup.length}
                                            onChange={toggleAllMissing}
                                            sx={{ color: '#fbbf24', '&.Mui-checked': { color: '#fbbf24' }, '&.MuiCheckbox-indeterminate': { color: '#fbbf24' } }}
                                        />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fbbf24' }}>
                                            Faltan en Backup ({auditData.missingInBackup.length})
                                        </Typography>
                                    </Stack>
                                    <AppButton
                                        variant="purple"
                                        width="200px"
                                        styles={{ height: 32, fontSize: '.72rem', fontWeight: 600 }}
                                        onClick={handleSync}
                                        disabled={!selectedMissing.size}
                                    >
                                        <SyncIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                        Sincronizar ({selectedMissing.size})
                                    </AppButton>
                                </Stack>
                                <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px' }}>
                                    {auditData.missingInBackup.map(item => (
                                        <Stack
                                            key={item.slug}
                                            direction="row"
                                            alignItems="center"
                                            sx={{
                                                px: 1, py: 0.4,
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                '&:hover': { bgcolor: 'rgba(139,92,246,0.05)' },
                                            }}
                                        >
                                            <Checkbox
                                                size="small"
                                                checked={selectedMissing.has(item.slug)}
                                                onChange={() => toggleMissing(item.slug)}
                                                sx={{ p: 0.3, color: '#64748b', '&.Mui-checked': { color: '#8b5cf6' } }}
                                            />
                                            <Typography variant="body2" sx={{ flex: 1, ml: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#cbd5e1' }}>
                                                {item.title || item.slug}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#64748b', flexShrink: 0 }}>
                                                {item.sizeMB} MB
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* Orphans in Backup */}
                        {auditData.orphansInBackup?.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <Checkbox
                                            size="small"
                                            checked={selectedOrphans.size === auditData.orphansInBackup.length}
                                            indeterminate={selectedOrphans.size > 0 && selectedOrphans.size < auditData.orphansInBackup.length}
                                            onChange={toggleAllOrphans}
                                            sx={{ color: '#f87171', '&.Mui-checked': { color: '#f87171' }, '&.MuiCheckbox-indeterminate': { color: '#f87171' } }}
                                        />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#f87171' }}>
                                            Huérfanos en Backup ({auditData.orphansInBackup.length})
                                        </Typography>
                                    </Stack>
                                    <AppButton
                                        variant="cyan"
                                        width="200px"
                                        styles={{ height: 32, fontSize: '.72rem', fontWeight: 600, background: '#b71c1c' }}
                                        onClick={handleCleanup}
                                        disabled={!selectedOrphans.size}
                                    >
                                        <DeleteSweepIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                        Eliminar ({selectedOrphans.size})
                                    </AppButton>
                                </Stack>
                                <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px' }}>
                                    {auditData.orphansInBackup.map(item => (
                                        <Stack
                                            key={item.folder}
                                            direction="row"
                                            alignItems="center"
                                            sx={{
                                                px: 1, py: 0.4,
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                '&:hover': { bgcolor: 'rgba(239,68,68,0.05)' },
                                            }}
                                        >
                                            <Checkbox
                                                size="small"
                                                checked={selectedOrphans.has(item.folder)}
                                                onChange={() => toggleOrphan(item.folder)}
                                                sx={{ p: 0.3, color: '#64748b', '&.Mui-checked': { color: '#ef4444' } }}
                                            />
                                            <Typography variant="body2" sx={{ flex: 1, ml: 0.5, color: '#cbd5e1', fontFamily: 'monospace', fontSize: '.8rem' }}>
                                                {item.folder}
                                            </Typography>
                                        </Stack>
                                    ))}
                                </Box>
                            </Box>
                        )}

                        {/* All good */}
                        {auditData.missingInBackup?.length === 0 && auditData.orphansInBackup?.length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 3 }}>
                                <CheckCircleIcon sx={{ fontSize: 48, color: '#4ade80', mb: 1 }} />
                                <Typography variant="h6" sx={{ color: '#4ade80', fontWeight: 700 }}>
                                    Cuentas 100% alineadas
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Todos los {auditData.synced?.length || 0} assets están sincronizados.
                                </Typography>
                            </Box>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
