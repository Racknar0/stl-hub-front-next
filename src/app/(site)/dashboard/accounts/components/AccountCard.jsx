import React from 'react';
import { keyframes } from '@emotion/react';
import { Box, LinearProgress, CircularProgress, Tooltip, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';
import { isFailedAccount, storageUsageColor } from '@/helpers/accountHealth';

const FREE_QUOTA_MB = Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480;
const quotaPulse = keyframes`
    0%, 100% { box-shadow: 0 0 0 1px rgba(255,24,59,.5), 0 0 7px rgba(255,24,59,.25); }
    50% { box-shadow: 0 0 0 1px rgba(255,24,59,.9), 0 0 18px rgba(255,24,59,.65), inset 0 0 12px rgba(255,24,59,.12); }
`;

export default function AccountCard({
    acc, onClick, isPending, onTest, onCancelTest, loadingAny, testing, onCleanup,
}) {
    const failed = isFailedAccount(acc);
    const isMainWithoutBackup = acc.type === 'main' && (!acc.backups || acc.backups.length === 0);
    const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : FREE_QUOTA_MB;
    const used = Math.max(0, acc.storageUsedMB || 0);
    const pct = total ? (used / total) * 100 : 0;
    const overQuota = pct > 100;
    const displayedPct = overQuota && Number(pct.toFixed(2)) === 100 ? '>100' : pct.toLocaleString('es-CO', { maximumFractionDigits: overQuota ? 2 : 1 });
    const usedGB = (used / 1024).toFixed(1);
    const totalGB = (total / 1024).toFixed(1);
    const usageColor = storageUsageColor(pct);
    const lastCheck = acc.lastCheckAt ? new Date(acc.lastCheckAt) : null;
    const formattedDate = lastCheck && !Number.isNaN(lastCheck.getTime())
        ? `${lastCheck.getDate().toString().padStart(2, '0')}/${(lastCheck.getMonth() + 1).toString().padStart(2, '0')}/${String(lastCheck.getFullYear()).slice(2)} ${lastCheck.getHours().toString().padStart(2, '0')}:${lastCheck.getMinutes().toString().padStart(2, '0')}`
        : 'Sin revisar';
    const statusLabel = acc.status === 'CONNECTED' ? 'OK'
        : acc.status === 'ERROR' ? 'ERR'
            : acc.status === 'EXPIRED' ? 'EXP' : acc.status || '?';
    const statusDescription = acc.status === 'CONNECTED' ? 'Conectada'
        : acc.status === 'ERROR' ? 'Error de conexión'
            : acc.status === 'EXPIRED' ? 'Sesión vencida' : acc.status || 'Estado desconocido';
    const statusColor = acc.status === 'CONNECTED' ? '#78b59a'
        : acc.status === 'ERROR' ? '#f08080'
            : acc.status === 'EXPIRED' ? '#d8b26c' : '#929cab';

    return (
        <Box
            onClick={() => onClick(acc)}
            sx={{
                cursor: 'pointer',
                position: 'relative',
                minWidth: 0,
                borderRadius: '8px',
                background: '#171d26',
                border: '1px solid',
                borderColor: overQuota ? '#ff183b' : failed ? '#ff4d5e' : 'rgba(148,163,184,0.17)',
                animation: overQuota ? `${quotaPulse} 1.8s ease-in-out infinite` : 'none',
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                boxShadow: failed ? '0 0 0 1px rgba(255,77,94,.28), 0 0 14px rgba(255,45,70,.24), inset 0 0 12px rgba(255,45,70,.06)' : 'none',
                transition: 'border-color .15s, background-color .15s',
                '&:hover': { background: failed || overQuota ? '#2a1922' : '#1b222d', borderColor: failed || overQuota ? '#ff455f' : 'rgba(148,163,184,0.4)' },
                overflow: 'hidden',
                p: 1.2,
            }}
        >
            {isPending && (
                <Box
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                        position: 'absolute', inset: 0, zIndex: 2,
                        bgcolor: 'rgba(14,18,25,0.86)', display: 'flex',
                        flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                    }}
                >
                    <CircularProgress size={22} aria-label="Validando cuenta" sx={{ color: '#aebaca' }} />
                    <Tooltip title="Detener validación" arrow>
                        <IconButton
                            size="small"
                            aria-label="Detener validación"
                            onClick={(e) => { e.stopPropagation(); onCancelTest?.(); }}
                            sx={{
                                color: '#f08080', bgcolor: 'rgba(240,128,128,0.1)', width: 24, height: 24,
                                '&:hover': { bgcolor: 'rgba(240,128,128,0.2)' },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

            {/* Alias first; the ID lives with the secondary metadata. */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3 }}>
                <Tooltip title={acc.alias || acc.email} arrow>
                    <Box component="span" sx={{
                        fontSize: '0.875rem', fontWeight: 600, color: '#e5e9ef',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0,
                    }}>
                        {acc.alias || acc.email}
                    </Box>
                </Tooltip>
                <Tooltip title={statusDescription} arrow>
                    <Box component="span" aria-label={statusDescription} sx={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.6rem', fontWeight: 700, lineHeight: 1,
                        color: '#fff', flexShrink: 0, borderRadius: '3px', px: .55, py: .35,
                        bgcolor: acc.status === 'CONNECTED' ? '#23744f' : failed ? '#b83347' : '#475569',
                    }}>
                        {statusLabel}
                    </Box>
                </Tooltip>
                {pct >= 99 && onCleanup && <Tooltip title="Depurar exceso" arrow>
                    <IconButton size="small" aria-label={`Depurar exceso de ${acc.alias || acc.id}`} disabled={isPending || loadingAny || testing}
                        onClick={event => { event.stopPropagation(); onCleanup(acc); }} sx={{ color: '#fb923c', width: 28, height: 28, flexShrink: 0 }}>
                        <CleaningServicesOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>}
                <Tooltip title="Comprobar cuenta" arrow>
                    <IconButton
                        size="small"
                        aria-label={`Comprobar cuenta ${acc.id}`}
                        onClick={(e) => { e.stopPropagation(); onTest(acc.id); }}
                        disabled={isPending || loadingAny || testing}
                        sx={{
                            flexShrink: 0, color: '#929eaf', width: 30, height: 30,
                            '&:hover': { color: '#e5e9ef', bgcolor: 'rgba(148,163,184,0.1)' },
                            '&.Mui-disabled': { color: '#475569' },
                        }}
                    >
                        <RefreshIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Tooltip title={acc.email} arrow>
                    <Box component="span" sx={{
                        fontSize: '0.75rem', color: '#9aa6b7', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0,
                    }}>
                        {acc.email}
                    </Box>
                </Tooltip>
                {isMainWithoutBackup && (
                    <Box component="span" sx={{
                        color: '#d8b26c', fontSize: '0.65rem', flexShrink: 0, whiteSpace: 'nowrap',
                    }}>
                        Sin backup
                    </Box>
                )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <Box component="span" sx={{
                    fontSize: '0.7rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums',
                    color: '#cbd3df', flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                    {usedGB} <Box component="span" sx={{ color: '#929eaf' }}>/ {totalGB} GB</Box>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={Math.min(100, pct)}
                    aria-label="Almacenamiento utilizado"
                    sx={{
                        flex: 1, minWidth: 12, height: 4, borderRadius: 3, bgcolor: '#2b3441',
                        '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: usageColor },
                    }}
                />
                <Box component="span" title={overQuota ? `Capacidad superada: ${used.toLocaleString()} MB usados de ${total.toLocaleString()} MB. Revisar cuenta.` : `${displayedPct}% utilizado`} sx={{
                    fontSize: '0.65rem', fontWeight: 500, fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0, color: usageColor, minWidth: 26, textAlign: 'right',
                }}>
                    {overQuota && <WarningAmberOutlinedIcon sx={{ fontSize: 11, mr: .25, verticalAlign: 'text-bottom' }} />}{displayedPct}%
                </Box>
            </Box>

            <Box sx={{
                display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 0.75, rowGap: 0.25,
                color: '#929eaf', fontSize: '0.65rem', fontVariantNumeric: 'tabular-nums',
            }}>
                <Box component="span" sx={{ whiteSpace: 'nowrap' }}>#{acc.id}</Box>
                    <Tooltip title={`${acc.fileCount ?? 0} archivos`} arrow>
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                            <InsertDriveFileOutlinedIcon sx={{ fontSize: 12 }} />
                            {acc.fileCount ?? 0}
                        </Box>
                    </Tooltip>
                    <Tooltip title={`${acc.folderCount ?? 0} carpetas`} arrow>
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                            <FolderOutlinedIcon sx={{ fontSize: 12 }} />
                            {acc.folderCount ?? 0}
                        </Box>
                    </Tooltip>
                <Box component="span" sx={{ ml: 'auto', whiteSpace: 'nowrap' }}>
                    {formattedDate}
                </Box>
            </Box>
        </Box>
    );
}
