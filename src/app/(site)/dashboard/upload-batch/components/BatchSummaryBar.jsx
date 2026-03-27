// ╔════════════════════════════════════════════════════════════════╗
// ║ BatchSummaryBar.jsx                                            ║
// ║ Resumen de la tabla: totales, barra de progreso, chips estado  ║
// ╚════════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import { Box, Stack, Typography, LinearProgress, Chip } from '@mui/material'

export default function BatchSummaryBar({ tableSummary }) {
  return (
    <Box
      sx={{
        mb: 2, p: 1.4, borderRadius: 2,
        border: '1px solid rgba(148,163,184,0.35)',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.65), rgba(15,23,42,0.45))',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
        <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 700 }}>
          Resumen de Tabla: {tableSummary.total} archivos
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.8)' }}>
          Listos para subir: {tableSummary.ready}/{tableSummary.retryable} · {tableSummary.readyGb.toFixed(2)} GB
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, Number(tableSummary.readyPct || 0)))}
        sx={{
          mt: 1, mb: 1, height: 8, borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.12)',
          '& .MuiLinearProgress-bar': {
            background: tableSummary.readyPct >= 100
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
          },
        }}
      />

      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
        <Chip size="small" label={`Total: ${tableSummary.total}`} sx={{ bgcolor: 'rgba(148,163,184,0.2)', color: '#e2e8f0' }} />
        <Chip size="small" label={`Listos: ${tableSummary.ready}`} sx={{ bgcolor: 'rgba(34,197,94,0.2)', color: '#bbf7d0' }} />
        <Chip size="small" label={`Pendientes: ${tableSummary.missing}`} sx={{ bgcolor: 'rgba(245,158,11,0.2)', color: '#fde68a' }} />
        <Chip size="small" label={`En proceso: ${tableSummary.processing}`} sx={{ bgcolor: 'rgba(56,189,248,0.2)', color: '#bae6fd' }} />
        <Chip size="small" label={`Completados: ${tableSummary.completed}`} sx={{ bgcolor: 'rgba(16,185,129,0.2)', color: '#a7f3d0' }} />
        <Chip size="small" label={`Error: ${tableSummary.error}`} sx={{ bgcolor: 'rgba(239,68,68,0.2)', color: '#fecaca' }} />
      </Stack>
    </Box>
  )
}
