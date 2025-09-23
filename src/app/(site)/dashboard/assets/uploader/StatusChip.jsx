import React from 'react'
import { Chip } from '@mui/material'

export default function StatusChip({ status }) {
  const map = {
    CONNECTED: { label: 'OK', color: 'success' },
    EXPIRED: { label: 'Expirada', color: 'warning' },
    ERROR: { label: 'ERROR', color: 'error' },
    SUSPENDED: { label: 'Suspendida', color: 'default' },
  }
  const { label, color } = map[status] || { label: status, color: 'default' }
  return <Chip label={label} color={color} size="small" />
}
