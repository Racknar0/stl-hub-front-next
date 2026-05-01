'use client';
import React, { useState, useRef } from 'react';
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
import RestoreIcon from '@mui/icons-material/Restore';
import CancelIcon from '@mui/icons-material/Cancel';
import AppButton from '@/components/layout/Buttons/Button';
import accountService from '@/services/AccountService';

export default function AlignmentModal({ open, onClose, account }) {
    const [phase, setPhase] = useState('idle');
    const [auditData, setAuditData] = useState(null);
    const [error, setError] = useState(null);

    const [selectedMissing, setSelectedMissing] = useState(new Set());
    const [selectedMissingInMain, setSelectedMissingInMain] = useState(new Set());
    const [selectedGhosts, setSelectedGhosts] = useState(new Set());
    const [selectedOrphansMain, setSelectedOrphansMain] = useState(new Set());
    const [selectedOrphansBackup, setSelectedOrphansBackup] = useState(new Set());

    const [actionResult, setActionResult] = useState(null);
    const abortRef = useRef(null);

    function resetSelections() {
        setSelectedMissing(new Set());
        setSelectedMissingInMain(new Set());
        setSelectedGhosts(new Set());
        setSelectedOrphansMain(new Set());
        setSelectedOrphansBackup(new Set());
    }

    function handleCancel() {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setPhase('results');
        setError('Operación cancelada por el usuario.');
    }

    async function handleAudit() {
        if (!account?.id) return;
        setPhase('auditing');
        setError(null);
        setAuditData(null);
        resetSelections();
        setActionResult(null);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const data = await accountService.auditAlignment(account.id, { signal: controller.signal });
            setAuditData(data);
            setPhase('results');
        } catch (e) {
            if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
            setError(e?.response?.data?.message || e?.message || 'Error desconocido');
            setPhase('idle');
        } finally {
            abortRef.current = null;
        }
    }

    async function handleSync() {
        if (!selectedMissing.size || !account?.id) return;
        setPhase('syncing');
        setActionResult(null);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const slugs = Array.from(selectedMissing);
            const data = await accountService.syncAlignment(account.id, slugs, { signal: controller.signal });
            setActionResult({ type: 'sync', ...data });
            await handleAudit();
        } catch (e) {
            if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
            setError(e?.response?.data?.message || e?.message || 'Error sincronizando');
            setPhase('results');
        } finally {
            abortRef.current = null;
        }
    }

    async function handleRestore() {
        if (!selectedMissingInMain.size || !account?.id) return;
        setPhase('restoring');
        setActionResult(null);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const slugs = Array.from(selectedMissingInMain);
            const data = await accountService.restoreAlignment(account.id, slugs, { signal: controller.signal });
            setActionResult({ type: 'restore', ...data });
            await handleAudit();
        } catch (e) {
            if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
            setError(e?.response?.data?.message || e?.message || 'Error restaurando');
            setPhase('results');
        } finally {
            abortRef.current = null;
        }
    }

    async function handleGhostCleanup() {
        if (!selectedGhosts.size || !account?.id) return;
        setPhase('cleaning');
        setActionResult(null);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const assetIds = Array.from(selectedGhosts);
            const data = await accountService.ghostCleanupAlignment(account.id, assetIds, { signal: controller.signal });
            setActionResult({ type: 'ghost', ...data });
            await handleAudit();
        } catch (e) {
            if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
            setError(e?.response?.data?.message || e?.message || 'Error eliminando fantasmas');
            setPhase('results');
        } finally {
            abortRef.current = null;
        }
    }

    async function handleCleanup(target) {
        const selected = target === 'main' ? selectedOrphansMain : selectedOrphansBackup;
        if (!selected.size || !account?.id) return;
        setPhase('cleaning');
        setActionResult(null);
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const folders = Array.from(selected);
            const data = await accountService.cleanupAlignment(account.id, folders, target, { signal: controller.signal });
            setActionResult({ type: 'cleanup', target, ...data });
            await handleAudit();
        } catch (e) {
            if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
            setError(e?.response?.data?.message || e?.message || 'Error eliminando');
            setPhase('results');
        } finally {
            abortRef.current = null;
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

    const isLoading = ['auditing', 'syncing', 'restoring', 'cleaning'].includes(phase);

    const loadingMessages = {
        auditing: 'Escaneando Main MEGA y Backup MEGA...',
        syncing: 'Sincronizando (descarga de Main → subida a Backup)...',
        restoring: 'Restaurando (descarga de Backup → subida a Main)...',
        cleaning: 'Procesando limpieza...',
    };

    const totalOrphans = (auditData?.orphansInMain?.length || 0) + (auditData?.orphansInBackup?.length || 0);

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
                            {loadingMessages[phase] || 'Procesando...'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Revisa la consola del servidor para ver el progreso detallado.
                        </Typography>
                        <AppButton
                            variant="cyan"
                            width="160px"
                            styles={{ height: 34, mt: 2, fontWeight: 600, background: '#b91c1c' }}
                            onClick={handleCancel}
                        >
                            <CancelIcon sx={{ fontSize: 15, mr: 0.5 }} />
                            Cancelar
                        </AppButton>
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
                            {actionResult.type === 'restore' && `Restauración completada: ${actionResult.okCount} OK, ${actionResult.failCount} fallidos`}
                            {actionResult.type === 'ghost' && `Limpieza BD completada: ${actionResult.deleted} registros eliminados`}
                            {actionResult.type === 'cleanup' && `Limpieza ${actionResult.target?.toUpperCase()}: ${actionResult.deleted} eliminados, ${actionResult.failed || 0} fallidos`}
                        </Typography>
                    </Box>
                )}

                {/* Results */}
                {phase === 'results' && auditData && (
                    <>
                        {/* Summary Cards */}
                        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                            <SummaryCard icon={<CheckCircleIcon />} color="#4ade80" bgColor="34,197,94" value={auditData.synced?.length || 0} label="Sincronizados" />
                            <SummaryCard icon={<WarningAmberIcon />} color="#fbbf24" bgColor="245,158,11" value={auditData.missingInBackup?.length || 0} label="Faltan Backup" />
                            <SummaryCard icon={<ReportProblemIcon />} color="#fb923c" bgColor="249,115,22" value={auditData.missingInMain?.length || 0} label="Faltan Main" />
                            <SummaryCard icon={<ErrorIcon />} color="#f87171" bgColor="239,68,68" value={auditData.ghostsInDB?.length || 0} label="Fantasmas BD" />
                            <SummaryCard icon={<DeleteSweepIcon />} color="#818cf8" bgColor="99,102,241" value={totalOrphans} label="Huérfanos" />
                        </Stack>

                        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
                            <AppButton variant="purple" width="140px" styles={{ height: 30, fontSize: '.72rem' }} onClick={handleAudit}>
                                Re-escanear
                            </AppButton>
                        </Stack>

                        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />

                        {/* Missing in Backup (sync Main → Backup) */}
                        {auditData.missingInBackup?.length > 0 && (
                            <AlignmentSection
                                title={`Faltan en Backup (${auditData.missingInBackup.length})`}
                                subtitle="En BD + Main pero NO en Backup. Sincronizar Main → Backup."
                                color="#fbbf24"
                                borderColor="rgba(245,158,11,0.2)"
                                bgColor="rgba(245,158,11,0.04)"
                                items={auditData.missingInBackup}
                                selected={selectedMissing}
                                setSelected={setSelectedMissing}
                                keyFn={i => i.slug}
                                labelFn={i => i.title || i.slug}
                                extraFn={i => `${i.sizeMB} MB`}
                                actionLabel="Sincronizar"
                                actionIcon={<SyncIcon sx={{ fontSize: 13, mr: 0.5 }} />}
                                actionColor="#8b5cf6"
                                onAction={handleSync}
                            />
                        )}

                        {/* Missing in Main (restore Backup → Main) */}
                        {auditData.missingInMain?.length > 0 && (
                            <AlignmentSection
                                title={`Faltan en Main (${auditData.missingInMain.length})`}
                                subtitle="En BD + Backup pero NO en Main. Restaurar Backup → Main."
                                color="#fb923c"
                                borderColor="rgba(249,115,22,0.2)"
                                bgColor="rgba(249,115,22,0.04)"
                                items={auditData.missingInMain}
                                selected={selectedMissingInMain}
                                setSelected={setSelectedMissingInMain}
                                keyFn={i => i.slug}
                                labelFn={i => i.title || i.slug}
                                extraFn={i => `${i.sizeMB} MB`}
                                actionLabel="Restaurar"
                                actionIcon={<RestoreIcon sx={{ fontSize: 13, mr: 0.5 }} />}
                                actionColor="#ea580c"
                                onAction={handleRestore}
                            />
                        )}

                        {/* Ghosts in DB */}
                        {auditData.ghostsInDB?.length > 0 && (
                            <AlignmentSection
                                title={`Fantasmas en BD (${auditData.ghostsInDB.length})`}
                                subtitle="Existen en BD pero NO en Main NI en Backup. Registros sin archivo."
                                color="#f87171"
                                borderColor="rgba(239,68,68,0.2)"
                                bgColor="rgba(239,68,68,0.04)"
                                items={auditData.ghostsInDB}
                                selected={selectedGhosts}
                                setSelected={setSelectedGhosts}
                                keyFn={i => i.assetId}
                                labelFn={i => i.title || i.slug}
                                extraFn={i => <Typography component="span" sx={{ color: '#64748b', fontSize: '.65rem', fontStyle: 'italic' }}>{i.status}</Typography>}
                                actionLabel="Limpiar BD"
                                actionIcon={<DeleteSweepIcon sx={{ fontSize: 13, mr: 0.5 }} />}
                                actionColor="#dc2626"
                                onAction={handleGhostCleanup}
                            />
                        )}

                        {/* Orphans in Main */}
                        {auditData.orphansInMain?.length > 0 && (
                            <AlignmentSection
                                title={`Huérfanos en Main (${auditData.orphansInMain.length})`}
                                subtitle="Carpetas en Main MEGA sin asset en BD. Se pueden eliminar."
                                color="#818cf8"
                                borderColor="rgba(99,102,241,0.2)"
                                bgColor="rgba(99,102,241,0.04)"
                                items={auditData.orphansInMain}
                                selected={selectedOrphansMain}
                                setSelected={setSelectedOrphansMain}
                                keyFn={i => i.folder}
                                labelFn={i => i.folder}
                                mono
                                actionLabel="Eliminar"
                                actionIcon={<DeleteSweepIcon sx={{ fontSize: 13, mr: 0.5 }} />}
                                actionColor="#4338ca"
                                onAction={() => handleCleanup('main')}
                            />
                        )}

                        {/* Orphans in Backup */}
                        {auditData.orphansInBackup?.length > 0 && (
                            <AlignmentSection
                                title={`Huérfanos en Backup (${auditData.orphansInBackup.length})`}
                                subtitle="Carpetas en Backup MEGA sin asset en BD. Se pueden eliminar."
                                color="#f87171"
                                borderColor="rgba(239,68,68,0.2)"
                                bgColor="rgba(239,68,68,0.04)"
                                items={auditData.orphansInBackup}
                                selected={selectedOrphansBackup}
                                setSelected={setSelectedOrphansBackup}
                                keyFn={i => i.folder}
                                labelFn={i => i.folder}
                                mono
                                actionLabel="Eliminar"
                                actionIcon={<DeleteSweepIcon sx={{ fontSize: 13, mr: 0.5 }} />}
                                actionColor="#b71c1c"
                                onAction={() => handleCleanup('backup')}
                            />
                        )}

                        {/* All good */}
                        {(auditData.missingInMain?.length === 0 && auditData.missingInBackup?.length === 0 &&
                          auditData.ghostsInDB?.length === 0 && auditData.orphansInMain?.length === 0 && auditData.orphansInBackup?.length === 0) && (
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

/* ─── Reusable summary card ─── */
function SummaryCard({ icon, color, bgColor, value, label }) {
    return (
        <Box sx={{ flex: 1, minWidth: 80, p: 1, borderRadius: '8px', bgcolor: `rgba(${bgColor},0.08)`, border: `1px solid rgba(${bgColor},0.2)`, textAlign: 'center' }}>
            {React.cloneElement(icon, { sx: { fontSize: 18, color, mb: 0.2 } })}
            <Typography variant="h6" sx={{ fontWeight: 700, color, fontSize: '1.1rem' }}>
                {value}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '.6rem' }}>{label}</Typography>
        </Box>
    );
}

/* ─── Reusable section with select-all, list, and action button ─── */
function AlignmentSection({ title, subtitle, color, borderColor, bgColor, items, selected, setSelected, keyFn, labelFn, extraFn, actionLabel, actionIcon, actionColor, onAction, mono }) {

    function toggleSet(key) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function toggleAll() {
        if (!items?.length) return;
        const keys = items.map(keyFn);
        setSelected(selected.size === items.length ? new Set() : new Set(keys));
    }

    return (
        <Box sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Checkbox
                        size="small"
                        checked={selected.size === items.length}
                        indeterminate={selected.size > 0 && selected.size < items.length}
                        onChange={toggleAll}
                        sx={{ color, '&.Mui-checked': { color }, '&.MuiCheckbox-indeterminate': { color } }}
                    />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color }}>
                        {title}
                    </Typography>
                </Stack>
                <AppButton
                    variant="cyan"
                    width="200px"
                    styles={{ height: 30, fontSize: '.7rem', fontWeight: 600, background: actionColor }}
                    onClick={onAction}
                    disabled={!selected.size}
                >
                    {actionIcon}
                    {actionLabel} ({selected.size})
                </AppButton>
            </Stack>
            {subtitle && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, ml: 4.5 }}>
                    {subtitle}
                </Typography>
            )}
            <Box sx={{ maxHeight: 160, overflow: 'auto', border: `1px solid ${borderColor}`, borderRadius: '6px', bgcolor: bgColor }}>
                {items.map(item => {
                    const key = keyFn(item);
                    return (
                        <Stack key={key} direction="row" alignItems="center" sx={{ px: 1, py: 0.3, borderBottom: '1px solid rgba(255,255,255,0.04)', '&:hover': { bgcolor: 'rgba(139,92,246,0.05)' } }}>
                            <Checkbox size="small" checked={selected.has(key)} onChange={() => toggleSet(key)} sx={{ p: 0.3, color: '#64748b', '&.Mui-checked': { color } }} />
                            <Typography variant="body2" sx={{ flex: 1, ml: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#cbd5e1', ...(mono ? { fontFamily: 'monospace', fontSize: '.8rem' } : {}) }}>
                                {labelFn(item)}
                            </Typography>
                            {extraFn && (
                                <Typography variant="caption" sx={{ color: '#64748b', flexShrink: 0, ml: 1 }}>{extraFn(item)}</Typography>
                            )}
                        </Stack>
                    );
                })}
            </Box>
        </Box>
    );
}
