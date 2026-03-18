import React from 'react'
import { Card, CardContent, Typography, Chip, Box, Button, TextField } from '@mui/material'

export default function ProfilesBar({
  profiles = [],
  onApply,
  onDelete,
  onImport,
  onExport,
  addProfileOpen,
  setAddProfileOpen,
  newProfileName,
  setNewProfileName,
  onSaveCurrent,
}) {
  return (
    <Card
      className="glass"
      sx={{
        mt: 2,
        background: '#1d1e26 !important',
        color: '#adafb8 !important',
        border: '1px solid rgba(173,175,184,0.2)',
        '& .MuiTypography-root': { color: '#adafb8 !important' },
        '& .MuiChip-root': {
          background: 'rgba(173,175,184,0.13)',
          color: '#adafb8',
          border: '1px solid rgba(173,175,184,0.24)',
        },
        '& .MuiButton-outlined': {
          color: '#adafb8',
          borderColor: 'rgba(173,175,184,0.35)',
        },
        '& .MuiInputBase-root': {
          color: '#adafb8',
          background: 'rgba(23,24,31,0.92)',
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(173,175,184,0.3)',
        },
      }}
    >
      <CardContent sx={{ display:'flex', flexWrap:'wrap', gap: 1, alignItems:'center' }}>
        <Typography variant="subtitle2" sx={{ mr: 1, opacity: 0.9 }}>Perfiles:</Typography>
        {profiles.length === 0 && (
          <Typography variant="caption" sx={{ opacity: 0.6 }}>No hay perfiles. Crea uno con tus categorías y tags frecuentes.</Typography>
        )}
        {[...(profiles||[])].sort((a,b)=> String(a?.name||'').localeCompare(String(b?.name||''), 'es', { sensitivity:'base' })).map((p) => (
          <Chip
            key={p.name}
            label={p.name}
            size="small"
            onClick={() => onApply?.(p)}
            onDelete={() => onDelete?.(p.name)}
            sx={{ cursor:'pointer' }}
          />
        ))}
        <Box sx={{ display:'inline-flex', gap: 1, alignItems:'center', ml:'auto', flexWrap:'wrap' }}>
          <Button size="small" variant="outlined" onClick={() => onExport?.()} disabled={profiles.length === 0}>
            Exportar JSON
          </Button>
          <Button size="small" variant="outlined" onClick={() => onImport?.()}>
            Importar JSON
          </Button>
          {!addProfileOpen ? (
            <Button size="small" variant="outlined" onClick={() => setAddProfileOpen?.(true)}>Añadir perfil</Button>
          ) : (
            <>
              <TextField size="small" placeholder="Nombre del perfil" value={newProfileName} onChange={(e)=>setNewProfileName?.(e.target.value)} sx={{ minWidth: 200 }} />
              <Button size="small" variant="contained" onClick={onSaveCurrent} disabled={!String(newProfileName||'').trim()}>Guardar</Button>
              <Button size="small" onClick={()=>{ setAddProfileOpen?.(false); setNewProfileName?.('') }}>Cancelar</Button>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
