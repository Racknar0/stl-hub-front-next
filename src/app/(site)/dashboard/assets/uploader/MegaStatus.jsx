import React from 'react'
import { Stack, Typography, Tooltip } from '@mui/material'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

export default function MegaStatus({ status, reason }) {

  if (!status || status === 'idle') return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" color="text.secondary">Sin cuenta</Typography>
    </Stack>
  )
  if (status === 'disconnected') return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" color="text.secondary">Sin conexión</Typography>
    </Stack>
  )
  if (status === 'connecting') return (
    <Stack direction="row" spacing={1} alignItems="center">
      <AutorenewIcon color="info" fontSize="small" className="spin" />
      <Typography variant="body2">Conectando…</Typography>
    </Stack>
  )
  if (status === 'connected') return (
    <Stack direction="row" spacing={1} alignItems="center">
      <CheckCircleIcon color="success" fontSize="small" />
      <Typography variant="body2">Conectado</Typography>
    </Stack>
  )
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip title={reason || 'Fallo'}>
        <ErrorOutlineIcon color="error" fontSize="small" />
      </Tooltip>
      <Typography variant="body2">Fallo</Typography>
    </Stack>
  )
}
