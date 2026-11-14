'use client'
import React, { useState, useEffect } from 'react'
import { Box, TextField, Button, Chip, Autocomplete, Select, MenuItem, FormControl, InputLabel, Stack, Collapse, FormControlLabel, Switch, Checkbox } from '@mui/material'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import FilterListOutlined from '@mui/icons-material/FilterListOutlined'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' }, { value: 'PUBLISHED', label: 'Publicado' },
  { value: 'DRAFT', label: 'Borrador' }, { value: 'PROCESSING', label: 'Procesando' }, { value: 'FAILED', label: 'Fallido' },
]
const SEO_OPTIONS = [
  { value: '', label: 'Sin filtro SEO' }, { value: 'noDescription', label: 'Sin descripción (ES)' },
  { value: 'noDescriptionEn', label: 'Sin descripción (EN)' }, { value: 'noTags', label: 'Sin tags' },
  { value: 'noCategories', label: 'Sin categorías' }, { value: 'noImages', label: 'Sin imágenes' },
]

export default function ToolbarBusqueda({
  q, setQ, onBuscar, accountQ, setAccountQ, onBuscarCuenta, assetIdQ, setAssetIdQ, onBuscarId,
  showFreeOnly, onToggleFreeOnly, categories, allTags, categoryFilter, setCategoryFilter,
  categoryExcludeFilter, setCategoryExcludeFilter, tagFilter, setTagFilter, tagExcludeFilter, setTagExcludeFilter,
  statusFilter, setStatusFilter, seoFilter, setSeoFilter, onClearAll, lexicalSort, onLexicalSortChange, sizeRange = { min: '', max: '' }, onSizeRangeChange,
}) {
  const [sizeDraft, setSizeDraft] = useState(sizeRange)
  const [sizeError, setSizeError] = useState('')
  useEffect(() => { setSizeDraft(sizeRange); setSizeError('') }, [sizeRange])
  const [mode, setMode] = useState('name')
  const [expanded, setExpanded] = useState(false)
  const [localQ, setLocalQ] = useState(q || '')
  const [localAccount, setLocalAccount] = useState(accountQ || '')
  const [localId, setLocalId] = useState(assetIdQ || '')
  useEffect(() => setLocalQ(q || ''), [q])
  useEffect(() => setLocalAccount(accountQ || ''), [accountQ])
  useEffect(() => setLocalId(assetIdQ || ''), [assetIdQ])

  const submit = (event) => {
    event.preventDefault()
    if (mode === 'id') {
      const id = Number(localId)
      if (!Number.isSafeInteger(id) || id <= 0) return
      onClearAll?.()
      setAssetIdQ(String(id))
      onBuscarId?.(String(id))
    } else if (mode === 'account') {
      setQ(''); setAssetIdQ(''); setAccountQ(localAccount.trim()); onBuscarCuenta?.(localAccount.trim())
    } else {
      setAccountQ(''); setAssetIdQ(''); setQ(localQ.trim()); onBuscar?.(localQ.trim())
    }
  }
  const chips = []
  if (q) chips.push({ key: 'q', label: `Buscar: ${q}`, clear: () => { setQ(''); onBuscar?.('') } })
  if (accountQ) chips.push({ key: 'account', label: `Cuenta: ${accountQ}`, clear: () => setAccountQ('') })
  if (assetIdQ) chips.push({ key: 'id', label: `ID: ${assetIdQ}`, clear: () => setAssetIdQ('') })
  const classification = [
    { key: 'category', label: 'Categoría', value: categoryFilter, set: setCategoryFilter, options: categories },
    { key: 'tag', label: 'Tag', value: tagFilter, set: setTagFilter, options: allTags },
    { key: 'exclude-category', label: 'Excluir categoría', value: categoryExcludeFilter, set: setCategoryExcludeFilter, options: categories, exclude: true },
    { key: 'exclude-tag', label: 'Excluir tag', value: tagExcludeFilter, set: setTagExcludeFilter, options: allTags, exclude: true },
  ]
  classification.forEach(f => { if (f.value) chips.push({ key: f.key, label: `${f.label}: ${f.value.name || f.value.slug}`, clear: () => f.set(null), exclude: f.exclude }) })
  if (statusFilter) chips.push({ key: 'status', label: STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || statusFilter, clear: () => setStatusFilter('') })
  if (seoFilter) chips.push({ key: 'seo', label: SEO_OPTIONS.find(o => o.value === seoFilter)?.label || seoFilter, clear: () => setSeoFilter('') })
  if (showFreeOnly) chips.push({ key: 'free', label: 'Solo gratuitos', clear: onToggleFreeOnly })
  if (sizeRange.min !== '') chips.push({ key: 'min-size', label: `Desde ${sizeRange.min} MB`, clear: () => onSizeRangeChange?.({ ...sizeRange, min: '' }) })
  if (sizeRange.max !== '') chips.push({ key: 'max-size', label: `Hasta ${sizeRange.max} MB`, clear: () => onSizeRangeChange?.({ ...sizeRange, max: '' }) })
  const filterCount = chips.filter(c => !['q','account','id'].includes(c.key)).length
  const controlSx = { '& .MuiInputBase-root': { fontSize: 12 }, minWidth: 0 }

  return (
    <Stack spacing={1.25} className="assets-filter-toolbar">
      <Box component="form" onSubmit={submit} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 170 }, ...controlSx }}>
          <InputLabel id="asset-search-mode">Buscar por</InputLabel>
          <Select labelId="asset-search-mode" label="Buscar por" value={mode} onChange={e => setMode(e.target.value)}>
            <MenuItem value="name">Nombre / archivo</MenuItem><MenuItem value="account">Cuenta</MenuItem><MenuItem value="id">ID del modelo</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" sx={{ flex: '1 1 240px', maxWidth: { sm: 560 }, ...controlSx }}
          placeholder={mode === 'name' ? 'Nombre del modelo o archivo…' : mode === 'account' ? 'Alias o ID de la cuenta…' : 'ID del modelo…'}
          inputProps={{ 'aria-label': mode === 'name' ? 'Nombre o archivo' : mode === 'account' ? 'Alias o ID de cuenta' : 'ID del modelo', ...(mode === 'id' ? { min: 1, step: 1 } : {}) }}
          type={mode === 'id' ? 'number' : 'text'} required={mode === 'id'}
          value={mode === 'name' ? localQ : mode === 'account' ? localAccount : localId}
          onChange={e => { if (mode === 'name') setLocalQ(e.target.value); else if (mode === 'account') setLocalAccount(e.target.value); else setLocalId(e.target.value) }} />
        <Button type="submit" variant="contained" startIcon={<SearchOutlined />} sx={{ textTransform: 'none', boxShadow: 'none' }}>Buscar</Button>
        <Button variant="outlined" startIcon={<FilterListOutlined />} endIcon={expanded ? <ExpandLess /> : <ExpandMore />} aria-expanded={expanded} aria-controls="asset-advanced-filters" onClick={() => setExpanded(v => !v)} sx={{ textTransform: 'none' }}>Filtros{filterCount ? ` · ${filterCount}` : ''}</Button>
        <FormControlLabel sx={{ ml: { sm: 'auto' }, mr: 0, '& .MuiFormControlLabel-label': { fontSize: 12, color: '#a7b7cb' } }} label="Agrupar similares" control={<Switch size="small" checked={Boolean(lexicalSort)} onChange={e => onLexicalSortChange?.(e.target.checked)} />} />
      </Box>
      <Collapse in={expanded} id="asset-advanced-filters">
        <Box sx={{ p: 2, border: '1px solid rgba(148,163,184,.18)', borderRadius: 2, bgcolor: '#101a29', display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(0,2fr) minmax(0,1fr)' }, gap: 3 }}>
          <Box>
            <Box component="h3" sx={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, mb: 1.5 }}>Clasificación</Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))' }, gap: 1.5 }}>
              {classification.map(f => <Autocomplete key={f.key} size="small" options={Array.isArray(f.options) ? f.options : []} value={f.value || null} getOptionLabel={o => o?.name || o?.slug || ''} isOptionEqualToValue={(o,v) => o?.slug === v?.slug} onChange={(_,value) => f.set?.(value)} renderInput={params => <TextField {...params} label={f.label} />} sx={controlSx} />)}
            </Box>
          </Box>
          <Box>
            <Box component="h3" sx={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, mb: 1.5 }}>Estado y disponibilidad</Box>
            <Stack spacing={1.5}>
              <FormControl size="small" sx={controlSx}><InputLabel id="asset-status-filter">Estado</InputLabel><Select labelId="asset-status-filter" label="Estado" value={statusFilter || ''} onChange={e => setStatusFilter?.(e.target.value)}>{STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}</Select></FormControl>
              <FormControl size="small" sx={controlSx}><InputLabel id="asset-seo-filter">SEO</InputLabel><Select labelId="asset-seo-filter" label="SEO" value={seoFilter || ''} onChange={e => setSeoFilter?.(e.target.value)}>{SEO_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}</Select></FormControl>
              <FormControlLabel sx={{ '& .MuiFormControlLabel-label': { fontSize: 12 } }} label="Solo gratuitos" control={<Checkbox size="small" checked={Boolean(showFreeOnly)} onChange={() => onToggleFreeOnly?.()} />} />
            </Stack>
          </Box>
        </Box>
        <Box component="form" onSubmit={event => {
          event.preventDefault();
          if (sizeDraft.min !== '' && sizeDraft.max !== '' && Number(sizeDraft.min) > Number(sizeDraft.max)) { setSizeError('El mínimo no puede superar el máximo'); return }
          onSizeRangeChange?.(sizeDraft);
        }} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
          <TextField size="small" type="number" label="Tamaño mínimo (MB)" value={sizeDraft.min} inputProps={{ min: 0, step: 'any' }} onChange={event => { setSizeDraft(previous => ({ ...previous, min: event.target.value })); setSizeError('') }} sx={{ width: 190, ...controlSx }} />
          <TextField size="small" type="number" label="Tamaño máximo (MB)" value={sizeDraft.max} inputProps={{ min: 0, step: 'any' }} onChange={event => { setSizeDraft(previous => ({ ...previous, max: event.target.value })); setSizeError('') }} sx={{ width: 190, ...controlSx }} />
          <Button type="submit" size="small" variant="outlined" sx={{ textTransform: 'none' }}>Aplicar tamaño</Button>
          {sizeError && <Box role="alert" sx={{ fontSize: 11, color: '#fb7185' }}>{sizeError}</Box>}
        </Box>
      </Collapse>
      {chips.length > 0 && <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: .75 }}>
        {chips.map(c => <Chip key={c.key} label={c.label} onDelete={c.clear} size="small" variant="outlined" sx={{ maxWidth: '100%', fontSize: 11, borderColor: c.exclude ? '#9b5555' : '#37546e', color: c.exclude ? '#f0aaaa' : '#c3d8ea' }} />)}
        <Button size="small" onClick={onClearAll} sx={{ textTransform: 'none', color: '#94a3b8', fontSize: 11 }}>Limpiar todo</Button>
      </Box>}
    </Stack>
  )
}
