'use client'

import React from 'react'
import { TableRow, TableCell, TextField, Box, Autocomplete, Chip, IconButton, Avatar, Stack, Select, MenuItem, Typography, Tooltip, CircularProgress, Button } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';

export default function BatchRow({
  row,
  idx,
  categoriesCatalog = [],
  tagsCatalog = [],
  cuentas = [],
  onNombreChange = () => {},
  onCategoriasChange = () => {},
  onTagsChange = () => {},
  onCuentaChange = () => {},
  onOpenCreateModal = () => {},
  onOpenProfiles = () => {},
  onOpenImagePreview = () => {},
  onOpenSimilar = () => {},
  onRemoverFila = () => {},
  onRetryWithOtherProxy = () => {}
}) {
  const isProcesso = row.estado === 'procesando';
  const isOk = row.estado === 'completado';
  const isError = row.estado === 'error';
  const mainStatus = String(row.mainStatus || 'PENDING').toUpperCase();
  const backupStatus = String(row.backupStatus || 'PENDING').toUpperCase();
  const rowInFlight = isProcesso || (isOk && ['PENDING', 'UPLOADING'].includes(backupStatus));

  return (
    <TableRow key={idx} hover sx={{ backgroundColor: isError ? 'rgba(244, 67, 54, 0.15)' : isOk ? 'rgba(76, 175, 80, 0.15)' : 'transparent', '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' } }}>
      {/* Acciones */}
      <TableCell sx={{ minWidth: 100, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Stack direction="row" spacing={1} justifyContent="flex-start" alignItems="center">
          <Button
            size="small"
            variant="contained"
            onClick={() => onOpenSimilar?.(row)}
            sx={{
              minWidth: 'auto', px: 1.5, py: 0.35, fontSize: 12, lineHeight: 1.1,
              whiteSpace: 'nowrap', borderRadius: 6, textTransform: 'none', fontWeight: 600,
              background: 'linear-gradient(135deg, #00b4d8, #0077b6)',
              color: '#fff', boxShadow: '0 1px 6px rgba(0,180,216,0.35)',
              '&:hover': { background: 'linear-gradient(135deg, #0096c7, #005f8a)', boxShadow: '0 2px 10px rgba(0,180,216,0.5)' }
            }}
          >
            Similares
          </Button>
          <Tooltip title="Eliminar borrador">
             <IconButton color="error" onClick={() => onRemoverFila(idx)} size="small">
                <DeleteIcon fontSize="small" />
             </IconButton>
          </Tooltip>
          {(mainStatus === 'UPLOADING' || backupStatus === 'UPLOADING') && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => onRetryWithOtherProxy?.(row)}
              sx={{
                minWidth: 'auto', px: 1.2, py: 0.35, fontSize: 11, lineHeight: 1.1,
                whiteSpace: 'nowrap', borderRadius: 6, textTransform: 'none', fontWeight: 700,
              }}
            >
              Otro proxy
            </Button>
          )}
        </Stack>
      </TableCell>

      {/* Asset */}
      <TableCell sx={{ minWidth: 250, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Stack direction="row" spacing={-1.5} sx={{ mr: 1, '&:hover .MuiAvatar-root': { zIndex: 1 } }}>
             {Array.isArray(row.imagenes) && row.imagenes.length > 0 ? row.imagenes.slice(0, 3).map((img, i) => {
               const srcUrl = img.startsWith('http') ? img : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/uploads/${img}`
               return (
                 <Avatar 
                   key={i} 
                   src={srcUrl} 
                   sx={{ 
                     width: 44, height: 44, 
                     border: '2px solid rgba(255,255,255,0.15)', 
                     cursor: 'pointer',
                     transition: 'transform 0.2s',
                     '&:hover': { transform: 'scale(1.15)', zIndex: 10 }
                   }} 
                   onClick={() => onOpenImagePreview?.(srcUrl)}
                 />
               )
             }) : (
                <Avatar sx={{ width: 44, height: 44, border: '2px solid rgba(255,255,255,0.1)' }} variant="rounded" />
             )}
          </Stack>
          <Box flex={1}>
             <TextField
               value={row.nombre}
               size="small"
               onChange={e => onNombreChange(idx, e.target.value)}
               variant="standard"
               fullWidth
               InputProps={{ disableUnderline: isOk || isProcesso, sx: { color: '#fff' } }}
               sx={{ '& input': { color: '#fff' }, '& input::placeholder': { color: 'rgba(255,255,255,0.7)', opacity: 1 } }}
               disabled={isOk || isProcesso}
             />
             <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'rgba(255,255,255,0.6)' }}>
               Peso: {(row.pesoMB / 1024).toFixed(2)} GB
             </Typography>
          </Box>
        </Stack>
      </TableCell>
      <TableCell sx={{ minWidth: 200, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Autocomplete
            multiple
            options={categoriesCatalog}
            getOptionLabel={o => o.name || o.slug || ''}
            value={row.categorias}
            disabled={isOk || isProcesso}
            onChange={(_, v) => onCategoriasChange(idx, v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index })
                return <Chip key={key} label={option.name || option.slug} size="small" {...tagProps} color="primary" variant={option.iaSuggested ? 'filled' : 'outlined'} />
              })
            }
            renderInput={params => (
              <TextField 
                {...params} 
                size="small" 
                placeholder={row.categorias.length === 0 ? "Categorías..." : ""} 
                variant="standard" 
                sx={{ '& input': { color: '#fff' }, '& input::placeholder': { color: 'rgba(255,255,255,0.7)', opacity: 1 } }}
              />
            )}
            sx={{ flex: 1, '& .MuiSvgIcon-root': { color: '#fff' } }}
          />
          {!isOk && !isProcesso && (
             <IconButton size="small" sx={{ ml: 0.5, color: '#4fc3f7' }} onClick={() => onOpenCreateModal('cat', idx)}><AddIcon fontSize="small" /></IconButton>
          )}
        </Box>
      </TableCell>
      <TableCell sx={{ minWidth: 300, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Autocomplete
            multiple
            freeSolo
            options={tagsCatalog}
            getOptionLabel={o => o.name || o.slug || ''}
            value={row.tags}
            disabled={isOk || isProcesso}
            onChange={(_, v) => onTagsChange(idx, v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                 const { key, ...tagProps } = getTagProps({ index })
                 return <Chip key={key} size="small" label={option.name || option.slug || option} {...tagProps} variant={option.iaSuggested ? 'filled' : 'outlined'} color="secondary" />
              })
            }
            renderInput={params => (
              <TextField 
                {...params} 
                size="small" 
                placeholder={row.tags.length === 0 ? "+ Inteligencia Artificial (Tags)" : ""} 
                variant="standard" 
                sx={{ '& input': { color: '#fff' }, '& input::placeholder': { color: 'rgba(255,255,255,0.7)', opacity: 1 } }}
              />
            )}
            sx={{ flex: 1, '& .MuiSvgIcon-root': { color: '#fff' } }}
          />
          {!isOk && !isProcesso && (
             <IconButton size="small" sx={{ ml: 0.5, color: '#4fc3f7' }} onClick={() => onOpenCreateModal('tag', idx)}><AddIcon fontSize="small" /></IconButton>
          )}
        </Box>
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Button 
          variant="outlined" 
          size="small" 
          color="secondary"
          onClick={() => onOpenProfiles(idx)}
          disabled={isOk || isProcesso}
          sx={{ textTransform: 'none', borderRadius: 4, minWidth: 90, color: '#b388ff', borderColor: '#b388ff', '&:hover': { color: '#d1c4e9', borderColor: '#d1c4e9' } }}
        >
          {row.perfiles || 'Perfiles'}
        </Button>
      </TableCell>
      <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Select
          value={row.cuenta || ''}
          displayEmpty
          onChange={e => onCuentaChange(idx, e.target.value)}
          size="small"
          variant="outlined"
          sx={{ minWidth: 120, bgcolor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 1, '& .MuiSelect-icon': { color: '#fff' } }}
          disabled={isOk || isProcesso}
        >
          <MenuItem value="" disabled sx={{ color: 'rgba(255,255,255,0.7)' }}>Selecciona...</MenuItem>
          {cuentas.map(c => (
            <MenuItem key={c.id} value={c.id}>{c.alias}</MenuItem>
          ))}
        </Select>
      </TableCell>
      {/* ─── Main Status ─── */}
      <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {(() => {
          const s = mainStatus
          if (s === 'OK') return <Chip label="✅ OK" size="small" sx={{ bgcolor: 'rgba(76,175,80,0.25)', color: '#81c784', fontWeight: 700, fontSize: 11 }} />
          if (s === 'UPLOADING') return <Chip label={`⬆️ ${row.mainProgress || 0}%`} size="small" sx={{ bgcolor: 'rgba(33,150,243,0.25)', color: '#64b5f6', fontWeight: 700, fontSize: 11 }} />
          if (s === 'EXTRACTING') return <Chip label="🔓 Extrayendo" size="small" sx={{ bgcolor: 'rgba(255,152,0,0.2)', color: '#ffb74d', fontWeight: 700, fontSize: 11 }} />
          if (s === 'COMPRESSING') return <Chip label="📦 Comprimiendo" size="small" sx={{ bgcolor: 'rgba(255,152,0,0.2)', color: '#ffb74d', fontWeight: 700, fontSize: 11 }} />
          if (s === 'ERROR') return <Chip label="❌ Error" size="small" sx={{ bgcolor: 'rgba(244,67,54,0.2)', color: '#e57373', fontWeight: 700, fontSize: 11 }} />
          return <Chip label="⏳" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
        })()}
      </TableCell>
      {/* ─── Backup Status ─── */}
      <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {(() => {
          const s = backupStatus
          if (s === 'OK') return <Chip label="✅ OK" size="small" sx={{ bgcolor: 'rgba(76,175,80,0.25)', color: '#81c784', fontWeight: 700, fontSize: 11 }} />
          if (s === 'UPLOADING') return <Chip label="⬆️ Subiendo" size="small" sx={{ bgcolor: 'rgba(33,150,243,0.25)', color: '#64b5f6', fontWeight: 700, fontSize: 11 }} />
          if (s === 'N/A') return <Chip label="— N/A" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
          if (s === 'ERROR') return <Chip label="❌ Error" size="small" sx={{ bgcolor: 'rgba(244,67,54,0.2)', color: '#e57373', fontWeight: 700, fontSize: 11 }} />
          return <Chip label="⏳" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
        })()}
      </TableCell>
      <TableCell align="center" sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
         {rowInFlight && <CircularProgress size={24} />}
         {isOk && <CheckCircleOutlineIcon color="success" />}
         {isError && (
           <Tooltip title="Fallo al subir a MEGA">
             <ErrorOutlineIcon color="error" />
           </Tooltip>
         )}
         {row.estado === 'borrador' && <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Borrador</Typography>}
      </TableCell>
    </TableRow>
  )
}
