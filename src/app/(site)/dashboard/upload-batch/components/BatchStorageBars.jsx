// ╔════════════════════════════════════════════════════════════╗
// ║ BatchStorageBars.jsx                                       ║
// ║ Barras de almacenamiento por cuenta MEGA                    ║
// ║ Muestra ocupado (morado) + entrando (naranja) por cuenta    ║
// ╚════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { BACKEND_SAFETY_LIMIT_MB } from '../constants'

export default function BatchStorageBars({ rows, cuentas }) {
  // Agrupar items asignados por cuenta
  const byAccount = {}
  rows.forEach(r => {
    if (!r.cuenta) return
    if (!byAccount[r.cuenta]) byAccount[r.cuenta] = 0
    byAccount[r.cuenta] += (r.pesoMB || 0)
  })

  const accountIds = Object.keys(byAccount)
  if (!accountIds.length) return null

  const LIMIT_MB = BACKEND_SAFETY_LIMIT_MB // 19GB

  return (
    <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {accountIds.map(accId => {
        const acc = cuentas.find(c => c.id === Number(accId))
        if (!acc) return null
        const usedMB = acc.usedMB || 0
        const incomingMB = byAccount[accId] || 0
        const usedPct = Math.min(100, (usedMB / LIMIT_MB) * 100)
        const incomingPct = Math.min(100 - usedPct, (incomingMB / LIMIT_MB) * 100)
        const totalPct = usedPct + incomingPct

        return (
          <Box key={accId} sx={{ p: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{acc.alias}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                {(usedMB/1024).toFixed(1)} GB ocupados + {(incomingMB/1024).toFixed(1)} GB entrando = {((usedMB+incomingMB)/1024).toFixed(1)} GB / {(LIMIT_MB/1024).toFixed(0)} GB
              </Typography>
            </Stack>
            <Box sx={{ width: '100%', height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
              <Box sx={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${usedPct}%`, background: 'linear-gradient(90deg, #7b61ff, #9b7dff)', borderRadius: 5, transition: 'width 300ms ease' }} />
              <Box sx={{ position: 'absolute', left: `${usedPct}%`, top: 0, height: '100%', width: `${incomingPct}%`, background: 'linear-gradient(90deg, #ff9800, #ffb74d)', borderRadius: '0 5px 5px 0', transition: 'width 300ms ease' }} />
            </Box>
            {totalPct > 90 && (
              <Typography variant="caption" sx={{ color: '#ff5252', mt: 0.5, display: 'block' }}>
                ⚠️ Esta cuenta estará a más del 90% de capacidad
              </Typography>
            )}
          </Box>
        )
      })}
      <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box sx={{ width: 12, height: 12, borderRadius: 2, background: 'linear-gradient(90deg, #7b61ff, #9b7dff)' }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Ocupado</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box sx={{ width: 12, height: 12, borderRadius: 2, background: 'linear-gradient(90deg, #ff9800, #ffb74d)' }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Entrando (batch)</Typography>
        </Stack>
      </Stack>
    </Box>
  )
}
