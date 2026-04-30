import React from 'react';
import {
    Box,
    LinearProgress,
    CircularProgress,
    Tooltip,
    IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';

const FREE_QUOTA_MB =
    Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480;

export default function AccountCard({
    acc,
    onClick,
    isPending,
    onTest,
    onCancelTest,
    loadingAny,
    testing,
}) {
    const isToday = (d) => {
        if (!d) return false;
        const dt = new Date(d);
        if (isNaN(dt)) return false;
        const now = new Date();
        return (
            dt.getFullYear() === now.getFullYear() &&
            dt.getMonth() === now.getMonth() &&
            dt.getDate() === now.getDate()
        );
    };

    const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : FREE_QUOTA_MB;
    const used = Math.max(0, acc.storageUsedMB || 0);
    const pct = Math.min(100, total ? (used / total) * 100 : 0);
    const usedGB = (used / 1024).toFixed(1);
    const totalGB = (total / 1024).toFixed(1);
    const isHigh = pct >= 80;
    const checkedToday = isToday(acc.lastCheckAt);
    const formattedDate = acc.lastCheckAt
        ? (() => {
              const d = new Date(acc.lastCheckAt);
              const datePart = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
              const timePart = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
              return `${datePart} ${timePart}`;
          })()
        : '-';

    const statusLabel =
        acc.status === 'CONNECTED'
            ? 'OK'
            : acc.status === 'ERROR'
              ? 'ERR'
              : acc.status === 'EXPIRED'
                ? 'EXP'
                : acc.status || '?';
    const statusColor =
        acc.status === 'CONNECTED'
            ? '#3b82f670' // subtle blue
            : acc.status === 'ERROR'
              ? '#ef4444' // red-500
              : acc.status === 'EXPIRED'
                ? '#f59e0b' // amber-500
                : '#64748b'; // slate-500

    return (
        <Box
            onClick={() => onClick(acc)}
            sx={{
                cursor: 'pointer',
                position: 'relative',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(12px)',
                border:
                    acc.status === 'CONNECTED'
                        ? '1px solid rgba(14, 102, 19, 0.35)'
                        : acc.status === 'ERROR'
                          ? '1px solid rgba(255, 0, 0, 0.4)'
                          : '1px solid rgba(255,255,255,0.08)',
                transition: 'all .2s',
                '&:hover': {
                    borderColor: 'rgba(139, 92, 246, 0.5)',
                },
                overflow: 'hidden',
                p: 1.2,
            }}
        >
            {/* Pending overlay */}
            {isPending && (
                <Box
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 2,
                        bgcolor: 'rgba(0,0,0,0.45)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '10px',
                        gap: 0.5,
                    }}
                >
                    <CircularProgress size={22} sx={{ color: '#fff' }} />
                    <Tooltip title="Detener validación" arrow>
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancelTest?.();
                            }}
                            sx={{
                                color: '#f87171',
                                bgcolor: 'rgba(239,68,68,0.15)',
                                width: 24,
                                height: 24,
                                '&:hover': { bgcolor: 'rgba(239,68,68,0.35)' },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            )}

            {/* Row 1: Alias + status + refresh */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 0.3,
                }}
            >
                <Box
                    component="span"
                    sx={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: '#a6aab0ff', // slate-200 (less bright than #ffffff)
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    {acc.alias}
                </Box>
                <Box
                    component="span"
                    sx={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        lineHeight: 1,
                        px: 0.5,
                        py: 0.2,
                        borderRadius: '3px',
                        bgcolor: statusColor,
                        color: '#fff',
                        flexShrink: 0,
                    }}
                >
                    {statusLabel}
                </Box>
                <Tooltip title="Actualizar" arrow>
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onTest(acc.id);
                        }}
                        disabled={isPending || loadingAny || testing}
                        sx={{
                            flexShrink: 0,
                            color: '#e7b40bff',
                            width: 30,
                            height: 30,
                            ml: 0.3,
                            '&:hover': { bgcolor: 'rgba(139,92,246,0.15)' },
                            '&.Mui-disabled': { color: '#475569' },
                        }}
                    >
                        <RefreshIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Row 2: Email */}
            <Box
                sx={{
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    mb: 0.5,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}
            >
                {acc.email}
            </Box>

            {/* Row 3: Storage bar */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 0.5,
                }}
            >
                <Box
                    component="span"
                    sx={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        color: isHigh ? '#ef4444' : '#4ade80',
                        minWidth: 26,
                    }}
                >
                    {Math.round(pct)}%
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                        flex: 1,
                        height: 5,
                        borderRadius: 3,
                        bgcolor: 'rgba(255,255,255,0.08)',
                        '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            background: isHigh
                                ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                : 'linear-gradient(90deg, #22c55e, #4ade80)',
                        },
                    }}
                />
                <Box
                    component="span"
                    sx={{
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {usedGB} / {totalGB} GB
                </Box>
            </Box>

            {/* Row 4: Stats */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <InsertDriveFileOutlinedIcon
                        sx={{ fontSize: 12, color: '#64748b' }}
                    />
                    <Box
                        component="span"
                        sx={{ fontSize: '0.65rem', color: '#cbd5e1' }}
                    >
                        {acc.fileCount ?? 0}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <FolderOutlinedIcon
                        sx={{ fontSize: 12, color: '#64748b' }}
                    />
                    <Box
                        component="span"
                        sx={{ fontSize: '0.65rem', color: '#cbd5e1' }}
                    >
                        {acc.folderCount ?? 0}
                    </Box>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.3,
                        ml: 'auto',
                    }}
                >
                    <CalendarTodayOutlinedIcon
                        sx={{
                            fontSize: 11,
                            color: checkedToday ? '#a78bfa' : '#64748b',
                        }}
                    />
                    <Box
                        component="span"
                        sx={{
                            fontSize: '0.8rem',
                            color: checkedToday ? '#a78bfa' : '#bdbdbdff',
                            fontWeight: checkedToday ? 700 : 400,
                        }}
                    >
                        {formattedDate}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
