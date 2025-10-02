import React from 'react'
import { Card, CardContent, Typography, Chip, Box, Button, TextField } from '@mui/material'

export default function ProfilesBar({
  profiles = [],
  onApply,
  onDelete,
  addProfileOpen,
  setAddProfileOpen,
  newProfileName,
  setNewProfileName,
  onSaveCurrent,
}) {
  return (
    <Card className="glass" sx={{ mt: 2 }}>
      <CardContent sx={{ display:'flex', flexWrap:'wrap', gap: 1, alignItems:'center' }}>
        <Typography variant="subtitle2" sx={{ mr: 1, opacity: 0.9 }}>Perfiles:</Typography>
        {profiles.length === 0 && (
          <Typography variant="caption" sx={{ opacity: 0.6 }}>No hay perfiles. Crea uno con tus categorías y tags frecuentes.</Typography>
        )}
        {profiles.map((p) => (
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
