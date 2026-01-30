'use client'
import React from 'react'
import { Box, TextField, Button, Typography } from '@mui/material'

export default function ToolbarBusqueda({ q, setQ, onBuscar, accountQ, setAccountQ, onBuscarCuenta, assetIdQ, setAssetIdQ, onBuscarId, onDropManyFiles, showFreeOnly, onToggleFreeOnly }) {
  const normalizeFilenameToQuery = (name) => {
    const raw = String(name || '').trim()
    if (!raw) return ''
    // Solo el nombre del archivo (sin path) y sin extensión, para que coincida mejor con búsquedas.
    const baseName = raw.replace(/^.*[\\/]/, '')
    return baseName.replace(/\.[^/.]+$/, '')
  }

  const normalizeBase = (name) => String(name || '').replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '').trim().toLowerCase()

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
      <TextField
        size="small"
        placeholder="Buscar por nombre o archivo"
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        sx={{ minWidth: 260 }}
        onKeyDown={(e)=>{ if(e.key==='Enter'){ onBuscar() } }}
        inputProps={{
          onDragOver: (e) => {
            // Permite el drop
            e.preventDefault()
          },
          onDrop: (e) => {
            e.preventDefault()
            const f = e.dataTransfer?.files?.[0]
            if (!f?.name) return
            setQ(normalizeFilenameToQuery(f.name))
          },
        }}
      />
      <Button variant="outlined" onClick={onBuscar}>Buscar</Button>
      {/* Buscar por cuenta (alias o ID) */}
      <TextField size="small" placeholder="Cuenta (alias o ID)" value={accountQ} onChange={(e)=>setAccountQ(e.target.value)} sx={{ minWidth: 200 }} onKeyDown={(e)=>{ if(e.key==='Enter'){ onBuscarCuenta() } }} />
      <Button variant="outlined" onClick={onBuscarCuenta}>Por cuenta</Button>
      {/* Buscar por ID exacto */}
      <TextField size="small" placeholder="Asset ID" type="number" value={assetIdQ} onChange={(e)=>setAssetIdQ(e.target.value)} sx={{ width: 140 }} onKeyDown={(e)=>{ if(e.key==='Enter'){ onBuscarId() } }} />
      <Button variant="outlined" onClick={onBuscarId}>Por ID</Button>

      {/* Filtro rápido: solo freebies */}
      <Button
        variant={showFreeOnly ? 'contained' : 'outlined'}
        color={showFreeOnly ? 'success' : 'inherit'}
        onClick={() => onToggleFreeOnly?.()}
        sx={{ ml: 1 }}
      >
        {showFreeOnly ? 'Mostrando FREE' : 'Solo FREE'}
      </Button>
      <Box sx={{ flex: 1 }} />

      {/* Cajita separada: arrastrar varios archivos para listar coincidencias */}
      <Box
        sx={{
          minWidth: 320,
          border: '1px dashed rgba(255,255,255,0.35)',
          borderRadius: 2,
          px: 1.25,
          py: 1,
          bgcolor: 'rgba(255,255,255,0.04)',
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const files = Array.from(e.dataTransfer?.files || [])
          if (!files.length) return
          const names = files.map((f) => String(f?.name || '').trim()).filter(Boolean)
          if (!names.length) return
          onDropManyFiles?.(names)
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Arrastra <b>varios</b> archivos aquí para buscarlos por nombre de archivo
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          (se compara por <code>archiveName</code> y por nombre base)
        </Typography>
      </Box>
    </Box>
  )
}
