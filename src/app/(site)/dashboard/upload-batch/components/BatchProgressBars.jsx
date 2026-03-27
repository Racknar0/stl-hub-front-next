// ╔════════════════════════════════════════════════════════════╗
// ║ BatchProgressBars.jsx                                      ║
// ║ Barras de progreso superiores:                              ║
// ║  - Banner IA en proceso (indeterminate)                     ║
// ║  - Banner de escaneo en vivo (determinado con fases)        ║
// ║  - Barras Main upload progress + Backup upload progress     ║
// ╚════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import { Box, Stack, Typography, LinearProgress, CircularProgress } from '@mui/material'

export default function BatchProgressBars({
  // ─── IA en proceso ───
  isApplyingAiMetadata,
  isRetryingAi,
  // ─── Escaneo en vivo ───
  isScanning,
  scanStatusUi,
  // ─── Main/Backup upload progress ───
  mainProgressStats,
  backupProgressStats,
  // ─── Distribución summary ───
  distributionSelectionSummary,
}) {
  return (
    <>
      {/* ── Banner IA en proceso ── */}
      {(isApplyingAiMetadata || isRetryingAi) && (
        <Box
          sx={{
            mb: 2, p: 2, borderRadius: 2,
            border: '1px solid rgba(94,234,212,0.55)',
            background: 'linear-gradient(90deg, rgba(13,148,136,0.26), rgba(20,184,166,0.18))',
            boxShadow: '0 10px 22px rgba(13,148,136,0.25)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Typography variant="h5" sx={{ color: '#ccfbf1', fontWeight: 900, lineHeight: 1.15 }}>
              IA en proceso
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(236,253,245,0.95)', fontWeight: 600 }}>
              {isRetryingAi
                ? 'Reintentando sugerencias fallidas. Los campos se actualizarán automáticamente al terminar.'
                : 'Generando nombres, categorías, tags y descripciones sugeridas para el batch.'}
            </Typography>
          </Stack>
          <LinearProgress
            variant="indeterminate"
            sx={{
              mt: 1.4, height: 12, borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #2dd4bf, #5eead4)' },
            }}
          />
        </Box>
      )}

      {/* ── Banner escaneo en vivo ── */}
      {isScanning && (
        <Box
          sx={{
            mb: 2, px: 1.25, py: 1.1, borderRadius: 2,
            border: '1px solid rgba(59,130,246,0.45)',
            background: 'linear-gradient(90deg, rgba(29,78,216,0.2), rgba(37,99,235,0.14))',
            boxShadow: '0 10px 20px rgba(29,78,216,0.18)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
              <CircularProgress size={18} thickness={5} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: '#dbeafe', fontWeight: 800 }}>
                  Escaneo en vivo · {scanStatusUi.phaseLabel}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(219,234,254,0.92)', display: 'block' }}>
                  {scanStatusUi.message || 'Procesando escaneo de carpetas...'}
                </Typography>
              </Box>
            </Stack>
            <Typography variant="caption" sx={{ color: '#bfdbfe', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Paso {scanStatusUi.current}/{scanStatusUi.total || 0} · {scanStatusUi.percent}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={scanStatusUi.percent}
            sx={{
              mt: 1, height: 9, borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.15)',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #60a5fa, #3b82f6)' },
            }}
          />
        </Box>
      )}

      {/* ── Barras Main + Backup upload progress ── */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        {/* Main progress */}
        <Box sx={{ flex: 1, p: 1.4, borderRadius: 2, border: '1px solid rgba(56,189,248,0.35)', background: 'linear-gradient(180deg, rgba(15,23,42,0.6), rgba(15,23,42,0.4))' }}>
          <Typography variant="body2" sx={{ color: '#bae6fd', fontWeight: 800, mb: 0.5 }}>
            📤 Main Upload — {mainProgressStats.pct}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, Number(mainProgressStats.pct || 0)))}
            sx={{
              height: 10, borderRadius: 999,
              backgroundColor: 'rgba(30,41,59,0.6)',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)' },
            }}
          />
          <Typography variant="caption" sx={{ color: 'rgba(186,230,253,0.88)', mt: 0.75, display: 'block' }}>
            OK: {mainProgressStats.ok}/{mainProgressStats.total} · Subiendo: {mainProgressStats.uploading} · Error: {mainProgressStats.error}
          </Typography>
        </Box>

        {/* Backup progress */}
        <Box sx={{ flex: 1, p: 1.4, borderRadius: 2, border: '1px solid rgba(192,132,252,0.35)', background: 'linear-gradient(180deg, rgba(15,23,42,0.6), rgba(15,23,42,0.4))' }}>
          <Typography variant="body2" sx={{ color: '#e9d5ff', fontWeight: 800, mb: 0.5 }}>
            🛡️ Backup Upload — {backupProgressStats.pct}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, Number(backupProgressStats.pct || 0)))}
            sx={{
              height: 10, borderRadius: 999,
              backgroundColor: 'rgba(30,41,59,0.6)',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #c084fc, #a855f7)' },
            }}
          />
          <Typography variant="caption" sx={{ color: 'rgba(245,208,254,0.88)', mt: 0.75, display: 'block' }}>
            OK: {backupProgressStats.ok}/{backupProgressStats.total} · Subiendo: {backupProgressStats.uploading} · Error: {backupProgressStats.error}
          </Typography>
        </Box>
      </Box>
    </>
  )
}
