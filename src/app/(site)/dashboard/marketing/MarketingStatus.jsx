'use client'

import React from 'react'
import CircularProgress from '@mui/material/CircularProgress'

// Estado de carga / error común a las pantallas de Marketing.
export default function MarketingStatus({ loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="mk-note" style={{ alignItems: 'center' }}>
        <CircularProgress size={16} />
        <div>Cargando…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mk-note is-warn" style={{ alignItems: 'center' }}>
        <span aria-hidden>!</span>
        <div style={{ flex: 1 }}>{error}</div>
        {onRetry && (
          <button type="button" className="mk-btn" onClick={onRetry}>Reintentar</button>
        )}
      </div>
    )
  }

  return null
}
