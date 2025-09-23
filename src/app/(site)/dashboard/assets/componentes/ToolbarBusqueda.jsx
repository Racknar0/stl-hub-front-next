'use client'
import React from 'react'
import { Box, TextField, Button } from '@mui/material'
import ShuffleIcon from '@mui/icons-material/Shuffle'

export default function ToolbarBusqueda({ q, setQ, onBuscar, onBuscarFree, freeCount, setFreeCount, onRandomize }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
      <TextField size="small" placeholder="Buscar por nombre" value={q} onChange={(e)=>setQ(e.target.value)} sx={{ minWidth: 260 }} onKeyDown={(e)=>{ if(e.key==='Enter'){ onBuscar() } }} />
      <Button variant="outlined" onClick={onBuscar}>Buscar</Button>
      <Button variant="contained" color="success" onClick={onBuscarFree}>Buscar Free</Button>
      <Box sx={{ flex: 1 }} />
      <TextField type="number" size="small" label="N freebies" value={freeCount} onChange={(e)=>setFreeCount(Number(e.target.value||0))} sx={{ width: 140 }} inputProps={{ min: 0 }} />
      <Button variant="outlined" startIcon={<ShuffleIcon />} onClick={onRandomize}>Randomizar</Button>
    </Box>
  )
}
