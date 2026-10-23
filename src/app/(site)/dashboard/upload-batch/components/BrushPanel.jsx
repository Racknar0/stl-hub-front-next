// ╔══════════════════════════════════════════════════════════════╗
// ║ BrushPanel.jsx                                               ║
// ║ Panel flotante "Pincel": categorías y tags extra que se      ║
// ║ suman a una fila con el botón morado o con Shift+D en        ║
// ║ modo revisión.                                               ║
// ╚══════════════════════════════════════════════════════════════╝
'use client'

import React, { useState } from 'react'
import { Box, Autocomplete, TextField, Chip, IconButton, Tooltip, Typography, Stack } from '@mui/material'
import LabelIcon from '@mui/icons-material/Label'
import RemoveIcon from '@mui/icons-material/Remove'
import ClearAllIcon from '@mui/icons-material/ClearAll'

export const BRUSH_COLOR = '#a855f7'

const chipSx = {
  color: '#fff',
  backgroundColor: BRUSH_COLOR,
  fontWeight: 600,
  m: '2px',
  '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.85)' },
}

const fieldSx = {
  '& .MuiInputBase-root': {
    color: '#f8fafc',
    bgcolor: 'rgba(30, 41, 59, 0.55)',
    borderRadius: 1.5,
    minHeight: 38,
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(168,85,247,0.45)' },
  '& .MuiSvgIcon-root': { color: '#e9d5ff' },
  '& input::placeholder': { color: 'rgba(233,213,255,0.7)', opacity: 1 },
}

const tagLabel = (o) => (typeof o === 'string' ? o : o?.name || o?.es || o?.nameEn || o?.en || o?.slug || '')

export default function BrushPanel({
  categoriesCatalog = [],
  tagsCatalog = [],
  brushCategories = [],
  brushTags = [],
  onBrushCategoriesChange = () => {},
  onBrushTagsChange = () => {},
  brushedCount = 0,
  reviewMode = false,
}) {
  const [minimized, setMinimized] = useState(false)
  const isEmpty = brushCategories.length === 0 && brushTags.length === 0
  const summary = [...brushCategories.map((c) => c.name || c.slug), ...brushTags.map(tagLabel)].join(', ')

  const containerSx = {
    position: 'fixed',
    left: 24,
    bottom: 24,
    zIndex: 1400,
    bgcolor: 'rgba(15, 10, 30, 0.94)',
    border: `1px solid ${BRUSH_COLOR}`,
    boxShadow: '0 8px 28px rgba(0,0,0,0.55), 0 0 12px rgba(168,85,247,0.35)',
    backdropFilter: 'blur(6px)',
    borderRadius: 3,
  }

  if (minimized) {
    return (
      <Box
        onClick={() => setMinimized(false)}
        sx={{ ...containerSx, px: 1.5, py: 0.75, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, maxWidth: 360 }}
      >
        <LabelIcon sx={{ color: BRUSH_COLOR }} />
        <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: '#f3e8ff' }}>
          {isEmpty ? 'Pincel vacío' : summary}
        </Typography>
        <Chip size="small" label={brushedCount} sx={{ ...chipSx, m: 0, height: 20 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ ...containerSx, p: 1.5, width: 380 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <LabelIcon sx={{ color: BRUSH_COLOR }} />
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#f3e8ff', flex: 1 }}>
          Pincel
        </Typography>
        <Tooltip title="Vaciar pincel">
          <span>
            <IconButton
              size="small"
              disabled={isEmpty}
              onClick={() => { onBrushCategoriesChange([]); onBrushTagsChange([]) }}
              sx={{ color: '#e9d5ff' }}
            >
              <ClearAllIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Minimizar">
          <IconButton size="small" onClick={() => setMinimized(true)} sx={{ color: '#e9d5ff' }}>
            <RemoveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack spacing={1}>
        <Autocomplete
          multiple
          size="small"
          options={categoriesCatalog}
          getOptionLabel={(o) => o.name || o.slug || ''}
          isOptionEqualToValue={(a, b) => (a.slug || a.name) === (b.slug || b.name)}
          value={brushCategories}
          onChange={(_, v) => onBrushCategoriesChange(v)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index })
              return <Chip key={key} size="small" label={option.name || option.slug} {...tagProps} sx={chipSx} />
            })
          }
          renderInput={(params) => (
            <TextField {...params} placeholder={brushCategories.length ? '' : 'Categorías extra...'} sx={fieldSx} />
          )}
        />
        <Autocomplete
          multiple
          freeSolo
          size="small"
          options={tagsCatalog}
          getOptionLabel={tagLabel}
          value={brushTags}
          onChange={(_, v) => onBrushTagsChange(v)}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index })
              return <Chip key={key} size="small" label={tagLabel(option)} {...tagProps} sx={chipSx} />
            })
          }
          renderInput={(params) => (
            <TextField {...params} placeholder={brushTags.length ? '' : 'Tags extra...'} sx={fieldSx} />
          )}
        />
      </Stack>

      <Typography sx={{ mt: 1, fontSize: 12, color: 'rgba(233,213,255,0.8)' }}>
        Aplicado a <b style={{ color: '#fff' }}>{brushedCount}</b> filas
        {reviewMode ? ' · Shift+D = aplicar y pasar' : ' · botón morado en cada fila'}
      </Typography>
    </Box>
  )
}
