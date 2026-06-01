'use client'
import React from 'react'
import {
  Box,
  TextField,
  Button,
  Chip,
  Autocomplete,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material'
import ClearIcon from '@mui/icons-material/Clear'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'PROCESSING', label: 'Procesando' },
  { value: 'FAILED', label: 'Fallido' },
]

const SEO_FILTER_OPTIONS = [
  { value: '', label: 'Sin filtro SEO' },
  { value: 'noDescription', label: 'Sin descripción (ES)' },
  { value: 'noDescriptionEn', label: 'Sin descripción (EN)' },
  { value: 'noTags', label: 'Sin tags' },
  { value: 'noCategories', label: 'Sin categorías' },
  { value: 'noImages', label: 'Sin imágenes' },
]

export default function ToolbarBusqueda({
  q, setQ, onBuscar,
  accountQ, setAccountQ, onBuscarCuenta,
  assetIdQ, setAssetIdQ, onBuscarId,
  showFreeOnly, onToggleFreeOnly,
  categories, allTags,
  categoryFilter, setCategoryFilter,
  categoryExcludeFilter, setCategoryExcludeFilter,
  tagFilter, setTagFilter,
  tagExcludeFilter, setTagExcludeFilter,
  statusFilter, setStatusFilter,
  seoFilter, setSeoFilter,
  onClearAll,
}) {
  const acSx = {
    minWidth: 160,
    maxWidth: 200,
    '& .MuiOutlinedInput-root': {
      bgcolor: 'rgba(15,23,42,0.6)',
      borderRadius: '8px',
      fontSize: '.8rem',
      color: '#e2e8f0',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
      '&:hover fieldset': { borderColor: 'rgba(139,92,246,0.3)' },
      '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
    },
  }

  const acExcludeCategorySx = {
    minWidth: 160,
    maxWidth: 200,
    '& .MuiOutlinedInput-root': {
      bgcolor: 'rgba(15,23,42,0.6)',
      borderRadius: '8px',
      fontSize: '.8rem',
      color: '#e2e8f0',
      '& fieldset': { 
        borderColor: categoryExcludeFilter ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)' 
      },
      '&:hover fieldset': { borderColor: 'rgba(239,68,68,0.7)' },
      '&.Mui-focused fieldset': { borderColor: '#ef4444' },
    },
  }

  const acExcludeTagSx = {
    minWidth: 160,
    maxWidth: 200,
    '& .MuiOutlinedInput-root': {
      bgcolor: 'rgba(15,23,42,0.6)',
      borderRadius: '8px',
      fontSize: '.8rem',
      color: '#e2e8f0',
      '& fieldset': { 
        borderColor: tagExcludeFilter ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)' 
      },
      '&:hover fieldset': { borderColor: 'rgba(239,68,68,0.7)' },
      '&.Mui-focused fieldset': { borderColor: '#ef4444' },
    },
  }

  const selectSx = {
    bgcolor: 'rgba(15,23,42,0.6)',
    borderRadius: '8px',
    fontSize: '.8rem',
    color: '#e2e8f0',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(139,92,246,0.3)' },
    '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
  }

  // Build list of active filter chips
  const activeFilters = []
  if (q) activeFilters.push({ key: 'q', label: `Buscar: "${q}"`, onDelete: () => { setQ(''); onBuscar?.('') } })
  if (accountQ) activeFilters.push({ key: 'account', label: `Cuenta: ${accountQ}`, onDelete: () => setAccountQ('') })
  if (categoryFilter) activeFilters.push({ key: 'category', label: `Cat: ${categoryFilter.name || categoryFilter.slug}`, onDelete: () => setCategoryFilter(null) })
  if (categoryExcludeFilter) {
    activeFilters.push({
      key: 'categoryExclude',
      label: `Excluir Cat: ${categoryExcludeFilter.name || categoryExcludeFilter.slug}`,
      onDelete: () => setCategoryExcludeFilter(null),
      isExclude: true,
    })
  }
  if (tagFilter) activeFilters.push({ key: 'tag', label: `Tag: ${tagFilter.name || tagFilter.slug}`, onDelete: () => setTagFilter(null) })
  if (tagExcludeFilter) {
    activeFilters.push({
      key: 'tagExclude',
      label: `Excluir Tag: ${tagExcludeFilter.name || tagExcludeFilter.slug}`,
      onDelete: () => setTagExcludeFilter(null),
      isExclude: true,
    })
  }
  if (statusFilter) {
    const statusLabel = STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || statusFilter
    activeFilters.push({ key: 'status', label: `Estado: ${statusLabel}`, onDelete: () => setStatusFilter('') })
  }
  if (showFreeOnly) activeFilters.push({ key: 'free', label: 'Solo FREE', onDelete: () => onToggleFreeOnly?.() })
  if (seoFilter) {
    const seoLabel = SEO_FILTER_OPTIONS.find(o => o.value === seoFilter)?.label || seoFilter
    activeFilters.push({ key: 'seo', label: seoLabel, onDelete: () => setSeoFilter?.('') })
  }

  return (
    <Stack spacing={1}>
      {/* Row 1: Search fields */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o archivo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ minWidth: 260 }}
          onKeyDown={(e) => { if (e.key === 'Enter') { onBuscar() } }}
        />
        <Button variant="outlined" onClick={onBuscar}>Buscar</Button>

        {/* Buscar por cuenta */}
        <TextField size="small" placeholder="Cuenta (alias o ID)" value={accountQ} onChange={(e) => setAccountQ(e.target.value)} sx={{ minWidth: 200 }} onKeyDown={(e) => { if (e.key === 'Enter') { onBuscarCuenta() } }} />
        <Button variant="outlined" onClick={onBuscarCuenta}>Por cuenta</Button>

        {/* Buscar por ID */}
        <TextField size="small" placeholder="Asset ID" type="number" value={assetIdQ} onChange={(e) => setAssetIdQ(e.target.value)} sx={{ width: 140 }} onKeyDown={(e) => { if (e.key === 'Enter') { onBuscarId() } }} />
        <Button variant="outlined" onClick={onBuscarId}>Por ID</Button>

        {/* Filtro categoría */}
        <Autocomplete
          size="small"
          options={Array.isArray(categories) ? categories : []}
          getOptionLabel={(o) => o?.name || o?.slug || ''}
          value={categoryFilter}
          onChange={(_, v) => setCategoryFilter?.(v)}
          isOptionEqualToValue={(o, v) => o?.slug === v?.slug}
          renderInput={(params) => (
            <TextField {...params} placeholder="Categoría…" />
          )}
          sx={acSx}
        />

        {/* Filtro excluir categoría */}
        <Autocomplete
          size="small"
          options={Array.isArray(categories) ? categories : []}
          getOptionLabel={(o) => o?.name || o?.slug || ''}
          value={categoryExcludeFilter}
          onChange={(_, v) => setCategoryExcludeFilter?.(v)}
          isOptionEqualToValue={(o, v) => o?.slug === v?.slug}
          renderInput={(params) => (
            <TextField {...params} placeholder="Excluir Cat. 🚫" />
          )}
          sx={acExcludeCategorySx}
        />

        {/* Filtro tag */}
        <Autocomplete
          size="small"
          options={Array.isArray(allTags) ? allTags : []}
          getOptionLabel={(o) => o?.name || o?.slug || ''}
          value={tagFilter}
          onChange={(_, v) => setTagFilter?.(v)}
          isOptionEqualToValue={(o, v) => o?.slug === v?.slug}
          renderInput={(params) => (
            <TextField {...params} placeholder="Tag…" />
          )}
          sx={acSx}
        />

        {/* Filtro excluir tag */}
        <Autocomplete
          size="small"
          options={Array.isArray(allTags) ? allTags : []}
          getOptionLabel={(o) => o?.name || o?.slug || ''}
          value={tagExcludeFilter}
          onChange={(_, v) => setTagExcludeFilter?.(v)}
          isOptionEqualToValue={(o, v) => o?.slug === v?.slug}
          renderInput={(params) => (
            <TextField {...params} placeholder="Excluir Tag 🚫" />
          )}
          sx={acExcludeTagSx}
        />

        {/* Filtro estado */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter?.(e.target.value)}
            displayEmpty
            sx={selectSx}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Filtro SEO */}
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select
            value={seoFilter || ''}
            onChange={(e) => setSeoFilter?.(e.target.value)}
            displayEmpty
            sx={{
              ...selectSx,
              ...(seoFilter ? { borderColor: '#a855f7', '& fieldset': { borderColor: '#a855f7 !important' } } : {}),
            }}
          >
            {SEO_FILTER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Solo FREE */}
        <Button
          variant={showFreeOnly ? 'contained' : 'outlined'}
          color={showFreeOnly ? 'success' : 'inherit'}
          onClick={() => onToggleFreeOnly?.()}
          sx={{ ml: 0.5 }}
        >
          {showFreeOnly ? 'Mostrando FREE' : 'Solo FREE'}
        </Button>
      </Box>

      {/* Row 2: Active filter chips */}
      {activeFilters.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
          {activeFilters.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              onDelete={f.onDelete}
              size="small"
              variant="outlined"
              sx={f.isExclude ? {
                borderColor: 'rgba(239, 68, 68, 0.5)',
                color: '#fca5a5',
                bgcolor: 'rgba(239, 68, 68, 0.05)',
                '& .MuiChip-deleteIcon': { color: 'rgba(239, 68, 68, 0.7)', '&:hover': { color: '#ef4444' } },
              } : {
                borderColor: 'rgba(168, 85, 247, 0.5)',
                color: '#e2e8f0',
                '& .MuiChip-deleteIcon': { color: 'rgba(168, 85, 247, 0.7)', '&:hover': { color: '#e879f9' } },
              }}
            />
          ))}
          <Button
            size="small"
            variant="text"
            startIcon={<ClearIcon fontSize="small" />}
            onClick={onClearAll}
            sx={{
              color: 'rgba(248, 113, 113, 0.9)',
              fontSize: '.75rem',
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(248, 113, 113, 0.1)' },
            }}
          >
            Limpiar todo
          </Button>
        </Box>
      )}
    </Stack>
  )
}
