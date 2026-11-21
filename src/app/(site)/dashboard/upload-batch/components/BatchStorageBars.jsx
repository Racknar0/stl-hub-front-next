// ╔════════════════════════════════════════════════════════════╗
// ║ BatchStorageBars.jsx                                       ║
// ║ Reparto por cuenta MEGA, en tarjetas compactas              ║
// ║ Muestra ocupado (morado) + entrando (naranja) por cuenta    ║
// ╚════════════════════════════════════════════════════════════╝
'use client'

import React from 'react'
import { Box, Stack, Typography, Collapse } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { UI_ACCOUNT_LIMIT_MB } from '../constants'

const gb = (mb) => (Number(mb || 0) / 1024).toFixed(1)
const OPEN_STORAGE_KEY = 'uploadBatch.storageBarsOpen'

export default function BatchStorageBars({ rows, cuentas }) {
  // Acordeón contraído por defecto; se recuerda por navegador
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    try { setOpen(window.localStorage.getItem(OPEN_STORAGE_KEY) === '1') } catch { /* storage no disponible */ }
  }, [])
  const toggleOpen = () => {
    setOpen((prev) => {
      try { window.localStorage.setItem(OPEN_STORAGE_KEY, prev ? '0' : '1') } catch { /* storage no disponible */ }
      return !prev
    })
  }

  // Peso asignado por cuenta. Lo completado ya cuenta como ocupado; "pendiente" es lo aún sin encolar.
  const byAccount = {}
  rows.forEach(r => {
    if (!r.cuenta) return
    const estado = String(r.estado || '').toLowerCase()
    if (estado === 'completado') return
    if (!byAccount[r.cuenta]) byAccount[r.cuenta] = { incoming: 0, pending: 0 }
    byAccount[r.cuenta].incoming += (r.pesoMB || 0)
    if (estado !== 'procesando') byAccount[r.cuenta].pending += (r.pesoMB || 0)
  })

  const accountIds = Object.keys(byAccount)
  if (!accountIds.length) return null

  const totalIncomingMB = accountIds.reduce((sum, id) => sum + byAccount[id].incoming, 0)
  const overCount = accountIds.filter((id) => {
    const acc = cuentas.find(c => c.id === Number(id))
    return acc && byAccount[id].pending > Math.max(0, Number(acc.usableFreeMB || 0)) + 0.5
  }).length

  return (
    <Box sx={{ mb: 2, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.35)' }}>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        onClick={toggleOpen}
        sx={{ px: 1.25, py: 0.75, cursor: 'pointer', userSelect: 'none', '&:hover': { background: 'rgba(255,255,255,0.03)' } }}
      >
        <ExpandMoreIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease' }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
          Reparto · {accountIds.length} cuentas · {gb(totalIncomingMB)} GB entrando
        </Typography>
        {overCount > 0 && (
          <Typography variant="caption" sx={{ color: '#ff8a80', fontWeight: 700 }}>
            ⚠️ {overCount} cuenta(s) sin espacio suficiente
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box sx={{ width: 10, height: 10, borderRadius: 2, background: '#8b6fff' }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Ocupado</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box sx={{ width: 10, height: 10, borderRadius: 2, background: '#ffa726' }} />
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Entrando (batch)</Typography>
        </Stack>
      </Stack>

      <Collapse in={open} unmountOnExit>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1, px: 1.25, pb: 1.25 }}>
        {accountIds.map(accId => {
          const acc = cuentas.find(c => c.id === Number(accId))
          if (!acc) return null
          const usedMB = acc.usedMB || 0
          const { incoming: incomingMB, pending: pendingMB } = byAccount[accId]
          // Tope de la cuenta: 95 % de su tamaño real
          const LIMIT_MB = Number(acc.limitMB) > 0 ? Number(acc.limitMB) : UI_ACCOUNT_LIMIT_MB
          const usedPct = Math.min(100, (usedMB / LIMIT_MB) * 100)
          const incomingPct = Math.min(100 - usedPct, (incomingMB / LIMIT_MB) * 100)
          // Lo que realmente cabe (incluye el límite del backup y lo ya encolado)
          const usableMB = Math.max(0, Number(acc.usableFreeMB || 0))
          const over = pendingMB > usableMB + 0.5

          return (
            <Box key={accId} sx={{ px: 1, py: 0.75, borderRadius: 1.5, background: 'rgba(255,255,255,0.04)', border: '1px solid', borderColor: over ? 'rgba(255,82,82,0.7)' : 'rgba(255,255,255,0.08)', minWidth: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                <Typography variant="caption" noWrap sx={{ fontWeight: 700, color: '#fff', minWidth: 0 }}>{acc.alias}</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', fontSize: 11 }}>
                  {gb(usedMB + incomingMB)} / {gb(LIMIT_MB)} GB
                </Typography>
              </Stack>
              <Box sx={{ width: '100%', height: 6, my: 0.5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
                <Box sx={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${usedPct}%`, background: '#8b6fff', transition: 'width 300ms ease' }} />
                <Box sx={{ position: 'absolute', left: `${usedPct}%`, top: 0, height: '100%', width: `${incomingPct}%`, background: '#ffa726', transition: 'width 300ms ease' }} />
              </Box>
              <Typography variant="caption" noWrap sx={{ display: 'block', fontSize: 10.5, color: over ? '#ff8a80' : 'rgba(255,255,255,0.5)' }}>
                {over
                  ? `⚠️ Asignado ${gb(pendingMB)} GB · caben ${gb(usableMB)} GB`
                  : `${gb(usedMB)} ocupado + ${gb(incomingMB)} entrando`}
              </Typography>
            </Box>
          )
        })}
      </Box>
      </Collapse>
    </Box>
  )
}
