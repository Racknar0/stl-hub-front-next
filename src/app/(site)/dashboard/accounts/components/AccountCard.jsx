import React from 'react';
import {
    Box,
    LinearProgress,
    CircularProgress,
    Tooltip,
    IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
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
    const shortDate = acc.lastCheckAt
        ? (() => {
              const d = new Date(acc.lastCheckAt);
              return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
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
            ? '#4caf50'
            : acc.status === 'ERROR'
              ? '#f44336'
              : acc.status === 'EXPIRED'
                ? '#ff9800'
                : '#888';

    return (
        <Box
            onClick={() => onClick(acc)}
            sx={{
                cursor: 'pointer',
                position: 'relative',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(12px)',
                border: isHigh
                    ? '1px solid rgba(255, 17, 0, 0.5)'
                    : acc.status === 'CONNECTED'
                      ? '1px solid rgba(0, 255, 13, 0.35)'
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
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '10px',
                    }}
                >
                    <CircularProgress size={22} sx={{ color: '#fff' }} />
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
                        color: '#e2e8f0',
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
                        color: isHigh ? '#f44336' : '#8b5cf6',
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
                                ? 'linear-gradient(90deg, #f44336, #ff1744)'
                                : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
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
                            color: checkedToday ? '#4caf50' : '#64748b',
                        }}
                    />
                    <Box
                        component="span"
                        sx={{
                            fontSize: '0.65rem',
                            color: checkedToday ? '#4caf50' : '#cbd5e1',
                            fontWeight: checkedToday ? 700 : 400,
                        }}
                    >
                        {shortDate}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
