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
  isSimilarityFocused = false,
  categoriesCatalog = [],
  tagsCatalog = [],
  cuentas = [],
  onNombreChange = () => {},
  onNombreEnChange = () => {},
  onDescriptionChange = () => {},
  onDescriptionEnChange = () => {},
  onCategoriasChange = () => {},
  onTagsChange = () => {},
  onCuentaChange = () => {},
  onOpenCreateModal = () => {},
  onOpenProfiles = () => {},
  onOpenImagePreview = () => {},
  onOpenSimilar = () => {},
  onRemoverFila = () => {}
}) {
  const isProcesso = row.estado === 'procesando';
  const isOk = row.estado === 'completado';
  const isError = row.estado === 'error';
  const mainStatus = String(row.mainStatus || 'PENDING').toUpperCase();
  const backupStatus = String(row.backupStatus || 'PENDING').toUpperCase();
  const rowInFlight = isProcesso || (isOk && ['PENDING', 'UPLOADING'].includes(backupStatus));
  const primaryText = '#eef4ff';
  const secondaryText = 'rgba(220,232,255,0.82)';
  const cellBorder = '1px solid rgba(148,163,184,0.24)';
  const baseRowBg = isError
    ? 'rgba(239, 68, 68, 0.22)'
    : isOk
      ? 'rgba(22, 163, 74, 0.18)'
      : 'rgba(15, 23, 42, 0.38)';
  const focusedBg = 'rgba(8, 145, 178, 0.26)';

  return (
    <TableRow
      key={idx}
      hover
      sx={{
        backgroundColor: isSimilarityFocused ? focusedBg : baseRowBg,
        boxShadow: isSimilarityFocused
          ? 'inset 4px 0 0 rgba(34, 211, 238, 0.95), inset 0 0 0 1px rgba(34, 211, 238, 0.45)'
          : 'none',
        transition: 'background-color 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          backgroundColor: isSimilarityFocused ? 'rgba(14, 165, 233, 0.32)' : 'rgba(51, 65, 85, 0.42)'
        },
      }}
    >
      {/* Acciones */}
      <TableCell sx={{ minWidth: 100, borderBottom: cellBorder, color: primaryText }}>
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
          {isSimilarityFocused && (
            <Chip
              size="small"
              label="En foco"
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 700,
                color: '#083344',
                backgroundColor: 'rgba(165,243,252,0.95)',
                border: '1px solid rgba(34,211,238,0.9)'
              }}
            />
          )}
          <Tooltip title="Eliminar borrador">
             <IconButton color="error" onClick={() => onRemoverFila(idx)} size="small">
                <DeleteIcon fontSize="small" />
             </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>

      {/* Asset */}
      <TableCell sx={{ minWidth: 250, borderBottom: cellBorder, color: primaryText }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Stack direction="row" spacing={-1.5} sx={{ mr: 1, '&:hover .MuiAvatar-root': { zIndex: 1 } }}>
             {Array.isArray(row.imagenes) && row.imagenes.length > 0 ? row.imagenes.slice(0, 3).map((img, i) => {
               const srcUrl = img.startsWith('http') ? img : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/uploads/${img}`
               return (
                 <Avatar 
                   key={i} 
                   src={srcUrl} 
                   sx={{ 
                     width: 56, height: 56,
                     border: '2px solid rgba(255,255,255,0.15)', 
                     cursor: 'pointer',
                     transition: 'transform 0.2s',
                     '&:hover': { transform: 'scale(1.12)', zIndex: 10 }
                   }} 
                   onClick={() => onOpenImagePreview?.(srcUrl)}
                 />
               )
             }) : (
                <Avatar sx={{ width: 56, height: 56, border: '2px solid rgba(255,255,255,0.1)' }} variant="rounded" />
             )}
          </Stack>
          <Box flex={1}>
             <Typography variant="caption" sx={{ display: 'block', color: secondaryText, mb: 0.25 }}>
               Nombre ES
             </Typography>
             <TextField
               value={row.nombre}
               size="small"
               onChange={e => onNombreChange(idx, e.target.value)}
               variant="standard"
               fullWidth
               InputProps={{ disableUnderline: isOk || isProcesso, sx: { color: '#fff' } }}
               sx={{
                 '& input': { color: primaryText, fontWeight: 500 },
                 '& input::placeholder': { color: secondaryText, opacity: 1 },
                 '& .MuiInputBase-input.Mui-disabled': {
                   color: '#f8fbff',
                   WebkitTextFillColor: '#f8fbff',
                   opacity: 1,
                 },
               }}
               disabled={isOk || isProcesso}
             />
             <Typography variant="caption" sx={{ display: 'block', color: secondaryText, mt: 0.6, mb: 0.25 }}>
               Name EN
             </Typography>
             <TextField
               value={row.nombreEn || ''}
               size="small"
               onChange={e => onNombreEnChange(idx, e.target.value)}
               variant="standard"
               fullWidth
               InputProps={{ disableUnderline: isOk || isProcesso, sx: { color: '#fff' } }}
               sx={{
                 '& input': { color: primaryText, fontWeight: 500 },
                 '& input::placeholder': { color: secondaryText, opacity: 1 },
                 '& .MuiInputBase-input.Mui-disabled': {
                   color: '#f8fbff',
                   WebkitTextFillColor: '#f8fbff',
                   opacity: 1,
                 },
               }}
               disabled={isOk || isProcesso}
             />
             <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: secondaryText }}>
               Peso: {(row.pesoMB / 1024).toFixed(2)} GB
             </Typography>
          </Box>
        </Stack>
      </TableCell>
      <TableCell sx={{ minWidth: 200, borderBottom: cellBorder, color: primaryText }}>
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
                return (
                  <Chip
                    key={key}
                    label={option.name || option.slug}
                    size="small"
                    {...tagProps}
                    sx={{
                      color: '#111827',
                      backgroundColor: '#d8bb00',
                      border: '1px solid rgba(148,163,184,0.52)',
                      fontWeight: 400,
                      '& .MuiChip-label': { px: 0.75 },
                      '& .MuiChip-deleteIcon': { color: '#111827' },
                      '&.Mui-disabled': { opacity: 1, color: '#111827' },
                    }}
                  />
                )
              })
            }
            renderInput={params => (
              <TextField 
                {...params} 
                size="small" 
                placeholder={row.categorias.length === 0 ? "Categorías..." : ""} 
                variant="standard" 
                sx={{
                  '& input': { color: primaryText },
                  '& input::placeholder': { color: secondaryText, opacity: 1 },
                }}
              />
            )}
            sx={{
              flex: 1,
              '& .MuiSvgIcon-root': { color: primaryText },
              '& .MuiChip-root': { opacity: 1 },
              '&.Mui-disabled': { opacity: 1 },
              '& .MuiInputBase-input.Mui-disabled': {
                color: '#e6f4ff',
                WebkitTextFillColor: '#e6f4ff',
                opacity: 1,
              },
            }}
          />
          {!isOk && !isProcesso && (
             <IconButton size="small" sx={{ ml: 0.5, color: '#4fc3f7' }} onClick={() => onOpenCreateModal('cat', idx)}><AddIcon fontSize="small" /></IconButton>
          )}
        </Box>
      </TableCell>
      <TableCell sx={{ minWidth: 300, borderBottom: cellBorder, color: primaryText }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Autocomplete
            multiple
            freeSolo
            options={tagsCatalog}
            getOptionLabel={o => o.name || o.es || o.nameEn || o.en || o.slug || ''}
            value={row.tags}
            disabled={isOk || isProcesso}
            onChange={(_, v) => onTagsChange(idx, v)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                 const { key, ...tagProps } = getTagProps({ index })
                 return (
                   <Chip
                     key={key}
                     size="small"
                     label={option.name || option.es || option.nameEn || option.en || option.slug || option}
                     {...tagProps}
                     sx={{
                       color: '#111827',
                       backgroundColor: option.iaSuggested ? 'rgba(187,247,208,0.95)' : 'rgba(220,252,231,0.95)',
                       border: '1px solid rgba(134,239,172,0.9)',
                       fontWeight: 400,
                       '& .MuiChip-label': { px: 0.75 },
                       '& .MuiChip-deleteIcon': { color: '#111827' },
                       '&.Mui-disabled': { opacity: 1, color: '#111827' },
                     }}
                   />
                 )
              })
            }
            renderInput={params => (
              <TextField 
                {...params} 
                size="small" 
                placeholder={row.tags.length === 0 ? "+ Inteligencia Artificial (Tags)" : ""} 
                variant="standard" 
                sx={{
                  '& input': { color: primaryText },
                  '& input::placeholder': { color: secondaryText, opacity: 1 },
                }}
              />
            )}
            sx={{
              flex: 1,
              '& .MuiSvgIcon-root': { color: primaryText },
              '& .MuiChip-root': { opacity: 1 },
              '&.Mui-disabled': { opacity: 1 },
              '& .MuiInputBase-input.Mui-disabled': {
                color: '#f8e8ff',
                WebkitTextFillColor: '#f8e8ff',
                opacity: 1,
              },
            }}
          />
          {!isOk && !isProcesso && (
             <IconButton size="small" sx={{ ml: 0.5, color: '#4fc3f7' }} onClick={() => onOpenCreateModal('tag', idx)}><AddIcon fontSize="small" /></IconButton>
          )}
        </Box>
      </TableCell>
      <TableCell sx={{ minWidth: 320, borderBottom: cellBorder, color: primaryText }}>
        <Typography variant="caption" sx={{ display: 'block', color: secondaryText, mb: 0.25 }}>
          Descripción ES
        </Typography>
        <TextField
          value={row.description || ''}
          size="small"
          fullWidth
          multiline
          minRows={2}
          onChange={e => onDescriptionChange(idx, e.target.value)}
          variant="standard"
          InputProps={{ disableUnderline: isOk || isProcesso, sx: { color: '#fff' } }}
          sx={{
            '& textarea': { color: primaryText, lineHeight: 1.3 },
            '& textarea::placeholder': { color: secondaryText, opacity: 1 },
            '& .MuiInputBase-input.Mui-disabled': {
              color: '#f8fbff',
              WebkitTextFillColor: '#f8fbff',
              opacity: 1,
            },
          }}
          disabled={isOk || isProcesso}
        />

        <Typography variant="caption" sx={{ display: 'block', color: secondaryText, mt: 0.9, mb: 0.25 }}>
          Description EN
        </Typography>
        <TextField
          value={row.descriptionEn || ''}
          size="small"
          fullWidth
          multiline
          minRows={2}
          onChange={e => onDescriptionEnChange(idx, e.target.value)}
          variant="standard"
          InputProps={{ disableUnderline: isOk || isProcesso, sx: { color: '#fff' } }}
          sx={{
            '& textarea': { color: primaryText, lineHeight: 1.3 },
            '& textarea::placeholder': { color: secondaryText, opacity: 1 },
            '& .MuiInputBase-input.Mui-disabled': {
              color: '#f8fbff',
              WebkitTextFillColor: '#f8fbff',
              opacity: 1,
            },
          }}
          disabled={isOk || isProcesso}
        />
      </TableCell>
      <TableCell sx={{ borderBottom: cellBorder, color: primaryText }}>
        <Button 
          variant="outlined" 
          size="small" 
          color="secondary"
          onClick={() => onOpenProfiles(idx)}
          disabled={isOk || isProcesso}
          sx={{
            textTransform: 'none',
            borderRadius: 4,
            minWidth: 90,
            color: '#f5e8ff',
            borderColor: 'rgba(221, 214, 254, 0.7)',
            backgroundColor: 'rgba(109, 40, 217, 0.28)',
            fontWeight: 700,
            '&:hover': {
              color: '#f5e8ff',
              borderColor: 'rgba(233, 213, 255, 0.92)',
              backgroundColor: 'rgba(126, 34, 206, 0.42)',
            },
            '&.Mui-disabled': {
              color: '#f5e8ff',
              borderColor: 'rgba(221, 214, 254, 0.55)',
              backgroundColor: 'rgba(109, 40, 217, 0.2)',
              opacity: 1,
            },
          }}
        >
          {row.perfiles || 'Perfiles'}
        </Button>
      </TableCell>
      <TableCell sx={{ borderBottom: cellBorder, color: primaryText }}>
        <Select
          value={row.cuenta || ''}
          displayEmpty
          onChange={e => onCuentaChange(idx, e.target.value)}
          size="small"
          variant="outlined"
          sx={{
            minWidth: 120,
            bgcolor: 'rgba(51, 65, 85, 0.65)',
            color: primaryText,
            borderRadius: 1,
            '& .MuiSelect-icon': { color: primaryText },
            '& .MuiSelect-select': {
              color: '#f8fbff',
              fontWeight: 700,
            },
            '& .MuiSelect-select.Mui-disabled': {
              color: '#f8fbff',
              WebkitTextFillColor: '#f8fbff',
              opacity: 1,
            },
            '&.Mui-disabled': {
              color: '#f8fbff',
              opacity: 1,
            },
            '&.Mui-disabled .MuiSvgIcon-root': {
              color: '#e2e8f0',
              opacity: 1,
            },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.42)' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(191,219,254,0.7)' },
          }}
          disabled={isOk || isProcesso}
        >
          <MenuItem value="" disabled sx={{ color: '#94a3b8' }}>Selecciona...</MenuItem>
          {cuentas.map(c => (
            <MenuItem key={c.id} value={c.id} sx={{ color: '#e2e8f0', bgcolor: '#0f172a', fontWeight: 700 }}>{c.alias}</MenuItem>
          ))}
        </Select>
      </TableCell>
      {/* ─── Main Status ─── */}
      <TableCell align="center" sx={{ borderBottom: cellBorder, color: primaryText }}>
        {(() => {
          const s = mainStatus
          if (s === 'OK') return <Chip label="✅ OK" size="small" sx={{ bgcolor: 'rgba(22,163,74,0.35)', color: '#dcfce7', border: '1px solid rgba(134,239,172,0.7)', fontWeight: 700, fontSize: 11 }} />
          if (s === 'UPLOADING') return <Chip label={`⬆️ ${row.mainProgress || 0}%`} size="small" sx={{ bgcolor: 'rgba(14,165,233,0.35)', color: '#e0f2fe', border: '1px solid rgba(125,211,252,0.72)', fontWeight: 700, fontSize: 11 }} />
          if (s === 'EXTRACTING') return <Chip label="🔓 Extrayendo" size="small" sx={{ bgcolor: 'rgba(245,158,11,0.33)', color: '#fff7ed', border: '1px solid rgba(253,186,116,0.75)', fontWeight: 700, fontSize: 11 }} />
          if (s === 'COMPRESSING') return <Chip label="📦 Comprimiendo" size="small" sx={{ bgcolor: 'rgba(249,115,22,0.33)', color: '#fff7ed', border: '1px solid rgba(251,146,60,0.75)', fontWeight: 700, fontSize: 11 }} />
          if (s === 'ERROR') return <Chip label="❌ Error" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.35)', color: '#fee2e2', border: '1px solid rgba(252,165,165,0.72)', fontWeight: 700, fontSize: 11 }} />
          return <Chip label="⏳" size="small" sx={{ bgcolor: 'rgba(100,116,139,0.32)', color: '#e2e8f0', border: '1px solid rgba(148,163,184,0.68)', fontSize: 11 }} />
        })()}
      </TableCell>
      {/* ─── Backup Status ─── */}
      <TableCell align="center" sx={{ borderBottom: cellBorder, color: primaryText }}>
        {(() => {
          const s = backupStatus
          if (s === 'OK') return <Chip label="✅ OK" size="small" sx={{ bgcolor: 'rgba(22,163,74,0.35)', color: '#dcfce7', border: '1px solid rgba(134,239,172,0.7)', fontWeight: 700, fontSize: 11 }} />
          if (s === 'UPLOADING') return <Chip label="⬆️ Subiendo" size="small" sx={{ bgcolor: 'rgba(14,165,233,0.35)', color: '#e0f2fe', border: '1px solid rgba(125,211,252,0.72)', fontWeight: 700, fontSize: 11 }} />
          if (s === 'N/A') return <Chip label="— N/A" size="small" sx={{ bgcolor: 'rgba(100,116,139,0.32)', color: '#e2e8f0', border: '1px solid rgba(148,163,184,0.68)', fontSize: 11 }} />
          if (s === 'ERROR') return <Chip label="❌ Error" size="small" sx={{ bgcolor: 'rgba(239,68,68,0.35)', color: '#fee2e2', border: '1px solid rgba(252,165,165,0.72)', fontWeight: 700, fontSize: 11 }} />
          return <Chip label="⏳" size="small" sx={{ bgcolor: 'rgba(100,116,139,0.32)', color: '#e2e8f0', border: '1px solid rgba(148,163,184,0.68)', fontSize: 11 }} />
        })()}
      </TableCell>
      <TableCell align="center" sx={{ borderBottom: cellBorder, color: primaryText }}>
         {rowInFlight && <CircularProgress size={24} />}
         {isOk && <CheckCircleOutlineIcon color="success" />}
         {isError && (
           <Tooltip title="Fallo al subir a MEGA">
             <ErrorOutlineIcon color="error" />
           </Tooltip>
         )}
         {row.estado === 'borrador' && <Typography variant="caption" sx={{ color: secondaryText }}>Borrador</Typography>}
      </TableCell>
    </TableRow>
  )
}
