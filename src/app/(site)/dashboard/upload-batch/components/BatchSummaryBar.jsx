// ╔════════════════════════════════════════════════════════════════╗
// ║ BatchSummaryBar.jsx                                            ║
// ║ Resumen de la tabla: totales, barra de progreso, chips estado  ║
// ╚════════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import { Box, Stack, Typography, LinearProgress, Chip, Button } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export default function BatchSummaryBar({
  tableSummary,
  summaryFilter = 'all',
  onSummaryFilterChange,
  reviewMode = false,
  setReviewMode,
  sizeFilterGb,
  setSizeFilterGb,
}) {
  const triggerFilter = (filter) => {
    if (typeof onSummaryFilterChange === 'function') {
      onSummaryFilterChange(filter)
    }
  }

  return (
    <Box
      sx={{
        mb: 2, p: 1.4, borderRadius: 2,
        border: '1px solid rgba(148,163,184,0.35)',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.65), rgba(15,23,42,0.45))',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
        <Typography
          variant="body2"
          onClick={() => triggerFilter('all')}
          sx={{ color: '#e2e8f0', fontWeight: 700, cursor: 'pointer' }}
        >
          Resumen de Tabla: {tableSummary.total} archivos
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant="caption"
            onClick={() => triggerFilter('ready')}
            sx={{ color: 'rgba(226,232,240,0.8)', cursor: 'pointer' }}
          >
            Listos para subir: {tableSummary.ready}/{tableSummary.retryable} · {tableSummary.readyGb.toFixed(2)} GB
          </Typography>
          {reviewMode && (
            <Button
              size="small"
              variant="contained"
              startIcon={<CloseIcon fontSize="small" />}
              onClick={() => setReviewMode?.(false)}
              sx={{
                ml: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 12,
                px: 1.5,
                py: 0.4,
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(239,68,68,0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                },
              }}
            >
              Salir de Revisión
            </Button>
          )}
        </Stack>
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

      <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" alignItems="center">
        <Chip
          size="small"
          clickable
          label={`Total: ${tableSummary.total}`}
          onClick={() => triggerFilter('all')}
          aria-pressed={summaryFilter === 'all'}
          sx={{ bgcolor: 'rgba(148,163,184,0.2)', color: '#e2e8f0' }}
        />
        <Chip
          size="small"
          clickable
          label={`Listos: ${tableSummary.ready}`}
          onClick={() => triggerFilter('ready')}
          aria-pressed={summaryFilter === 'ready'}
          sx={{ bgcolor: 'rgba(34,197,94,0.2)', color: '#bbf7d0' }}
        />
        <Chip
          size="small"
          clickable
          label={`Pendientes: ${tableSummary.missing}`}
          onClick={() => triggerFilter('pending')}
          aria-pressed={summaryFilter === 'pending'}
          sx={{ bgcolor: 'rgba(245,158,11,0.2)', color: '#fde68a' }}
        />
        <Chip
          size="small"
          clickable
          label={`Activo: ${tableSummary.active}`}
          onClick={() => triggerFilter('active')}
          aria-pressed={summaryFilter === 'active'}
          sx={{ bgcolor: 'rgba(168,85,247,0.25)', color: '#e9d5ff', fontWeight: 'bold' }}
        />
        <Chip
          size="small"
          clickable
          label={`En proceso: ${tableSummary.processing}`}
          onClick={() => triggerFilter('processing')}
          aria-pressed={summaryFilter === 'processing'}
          sx={{ bgcolor: 'rgba(56,189,248,0.2)', color: '#bae6fd' }}
        />
        <Chip
          size="small"
          clickable
          label={`Completados: ${tableSummary.completed}`}
          onClick={() => triggerFilter('completed')}
          aria-pressed={summaryFilter === 'completed'}
          sx={{ bgcolor: 'rgba(16,185,129,0.2)', color: '#a7f3d0' }}
        />
        <Chip
          size="small"
          clickable
          label={`Error: ${tableSummary.error}`}
          onClick={() => triggerFilter('error')}
          aria-pressed={summaryFilter === 'error'}
          sx={{ bgcolor: 'rgba(239,68,68,0.2)', color: '#fecaca' }}
        />

        {sizeFilterGb && Number(sizeFilterGb) > 0 && (
          <Chip
            size="small"
            clickable
            label={`Pesados (>= ${sizeFilterGb} GB): ${tableSummary.heavyCount || 0}`}
            onClick={() => triggerFilter('heavy')}
            aria-pressed={summaryFilter === 'heavy'}
            sx={{
              bgcolor: 'rgba(239, 68, 68, 0.25)',
              color: '#fca5a5',
              fontWeight: 'bold',
              border: summaryFilter === 'heavy' ? '1px solid #ef4444' : 'none',
              boxShadow: summaryFilter === 'heavy' ? '0 0 8px rgba(239, 68, 68, 0.4)' : 'none',
            }}
          />
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 'auto', display: 'inline-flex' }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
            Filtrar pesado &gt;=
          </Typography>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={sizeFilterGb}
            onChange={(e) => {
              const val = e.target.value
              setSizeFilterGb(val)
              // Si se limpia el input y teníamos seleccionado el filtro de pesados, volvemos a mostrar todos
              if (!val && summaryFilter === 'heavy') {
                triggerFilter('all')
              }
            }}
            placeholder="GB"
            style={{
              width: '60px',
              height: '24px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(0,0,0,0.3)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: '800',
              textAlign: 'center',
              outline: 'none',
            }}
          />
        </Stack>
      </Stack>
    </Box>
  )
}
