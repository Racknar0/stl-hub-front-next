'use client'
import React from 'react'
import { Box, TextField, Button } from '@mui/material'
import ShuffleIcon from '@mui/icons-material/Shuffle'

export default function ToolbarBusqueda({ q, setQ, onBuscar, onBuscarFree, freeCount, setFreeCount, onRandomize, accountQ, setAccountQ, onBuscarCuenta, assetIdQ, setAssetIdQ, onBuscarId }) {
  const normalizeFilenameToQuery = (name) => {
    const raw = String(name || '').trim()
    if (!raw) return ''
    // Solo el nombre del archivo (sin path) y sin extensión, para que coincida mejor con búsquedas.
    const baseName = raw.replace(/^.*[\\/]/, '')
    return baseName.replace(/\.[^/.]+$/, '')
  }

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
      <Button variant="contained" color="success" onClick={onBuscarFree}>Buscar Free</Button>
      {/* Buscar por cuenta (alias o ID) */}
      <TextField size="small" placeholder="Cuenta (alias o ID)" value={accountQ} onChange={(e)=>setAccountQ(e.target.value)} sx={{ minWidth: 200 }} onKeyDown={(e)=>{ if(e.key==='Enter'){ onBuscarCuenta() } }} />
      <Button variant="outlined" onClick={onBuscarCuenta}>Por cuenta</Button>
      {/* Buscar por ID exacto */}
      <TextField size="small" placeholder="Asset ID" type="number" value={assetIdQ} onChange={(e)=>setAssetIdQ(e.target.value)} sx={{ width: 140 }} onKeyDown={(e)=>{ if(e.key==='Enter'){ onBuscarId() } }} />
      <Button variant="outlined" onClick={onBuscarId}>Por ID</Button>
      <Box sx={{ flex: 1 }} />
      <TextField type="number" size="small" label="N freebies" value={freeCount} onChange={(e)=>setFreeCount(Number(e.target.value||0))} sx={{ width: 140 }} inputProps={{ min: 0 }} />
      <Button variant="outlined" startIcon={<ShuffleIcon />} onClick={onRandomize}>Randomizar</Button>
    </Box>
  )
}
