'use client'

import { useEffect, useState } from 'react'
import { Box, Stack, Typography, TextField, Chip, Autocomplete, FormControlLabel, Switch } from '@mui/material'

const dateText = value => {
  if (!value) return 'Sin dato'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('es-ES')
}
const field = (label, value) => <Box key={label} sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 10, color: '#8fa3bd', mb: .5 }}>{label}</Typography><Typography sx={{ fontSize: 12, color: '#dbe5f2', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{value ?? 'Sin dato'}</Typography></Box>
const chipText = item => typeof item === 'string' ? item : [item?.name || item?.slug, item?.nameEn].filter(Boolean).join(' / ')
const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9-\s_]+/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)

export default function AssetDetailSections({ asset, editing, editForm, setEditForm, categories = [], allTags = [], formatMBfromB }) {
  const [tab, setTab] = useState(editing ? 1 : 0)
  useEffect(() => setTab(editing ? 1 : 0), [asset?.id, editing])
  const status = { PUBLISHED: 'Publicado', DRAFT: 'Borrador', PROCESSING: 'Procesando', FAILED: 'Error' }[asset?.status] || asset?.status || 'Sin estado'
  const tabs = ['Resumen', 'Contenido', 'Archivo']
  return <>
    <Box role="tablist" aria-label="Información del modelo" sx={{ display: 'flex', gap: 2.5, px: 2.5, borderBottom: '1px solid #334155', flexShrink: 0 }}>
      {tabs.map((label, index) => <Box component="button" type="button" role="tab" key={label} id={`model-info-tab-${index}`} aria-controls={`model-info-panel-${index}`} aria-selected={tab === index} onClick={() => setTab(index)} onKeyDown={event => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3; setTab(next); event.currentTarget.parentElement.querySelectorAll('button')[next]?.focus() }} sx={{ py: 1.5, px: 0, bgcolor: 'transparent', border: 0, borderBottom: '2px solid', borderColor: tab === index ? '#38bdf8' : 'transparent', color: tab === index ? '#7dd3fc' : '#94a3b8', fontSize: 12, cursor: 'pointer' }}>{label}</Box>)}
    </Box>
    <Box role="tabpanel" id={`model-info-panel-${tab}`} aria-labelledby={`model-info-tab-${tab}`} sx={{ overflowY: 'auto', minHeight: 0, flex: 1, p: 2.5 }}>
      {tab === 0 && <Stack spacing={2.5}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 2.5 }}>
          {field('ID', asset?.id)}{field('Estado', status)}{field('Plan', asset?.isPremium ? 'Premium' : 'Gratuito')}{field('Cuenta', asset?.account?.alias || asset?.accountId)}{field('Creado', dateText(asset?.createdAt))}{field('Actualizado', dateText(asset?.updatedAt))}
        </Box>
        {editing && <FormControlLabel label="Modelo Premium" control={<Switch checked={Boolean(editForm.isPremium)} onChange={event => setEditForm(form => ({ ...form, isPremium: event.target.checked }))} />} />}
      </Stack>}
      {tab === 1 && <Stack spacing={2.5}>
        {editing ? <>
          <TextField size="small" label="Nombre (ES)" value={editForm.title || ''} onChange={event => setEditForm(form => ({ ...form, title: event.target.value }))} fullWidth />
          <TextField size="small" label="Nombre (EN)" value={editForm.titleEn || ''} onChange={event => setEditForm(form => ({ ...form, titleEn: event.target.value }))} fullWidth />
          <Autocomplete multiple disableCloseOnSelect size="small" options={categories} getOptionLabel={item => item?.name || item?.slug || ''} isOptionEqualToValue={(a,b) => a.id === b.id} value={editForm.categories || []} onChange={(_,value) => setEditForm(form => ({ ...form, categories: value }))} renderInput={params => <TextField {...params} label="Categorías" />} />
          <Autocomplete multiple freeSolo size="small" options={allTags} getOptionLabel={chipText} value={editForm.tags || []} onChange={(_,value) => setEditForm(form => ({ ...form, tags: [...new Set(value.map(item => slugify(typeof item === 'string' ? item : item.slug || item.name)).filter(Boolean))] }))} renderInput={params => <TextField {...params} label="Tags" />} />
        </> : <>
          {field('Título ES', asset?.title)}{field('Título EN', asset?.titleEn || 'Sin traducción')}
          {['categories','tags'].map(key => <Box key={key}><Typography sx={{ fontSize: 10, color: '#8fa3bd', mb: .75 }}>{key === 'categories' ? 'Categorías' : 'Tags'}</Typography><Stack direction="row" sx={{ gap: .5, flexWrap: 'wrap' }}>{asset?.[key]?.length ? asset[key].map((item,index) => <Chip key={item.id || index} label={chipText(item)} size="small" variant="outlined" sx={{ fontSize: 11 }} />) : <Typography sx={{ fontSize: 12 }}>Sin asignar</Typography>}</Stack></Box>)}
        </>}
        {field('Descripción ES', asset?.description || 'Sin descripción')}{field('Descripción EN', asset?.descriptionEn || 'Sin descripción')}
      </Stack>}
      {tab === 2 && <Stack spacing={2.5}>
        {field('Archivo completo', asset?.archiveName)}{field('Tamaño', formatMBfromB(asset?.fileSizeB ?? asset?.archiveSizeB))}
        {field('Slug ES', asset?.slug)}{field('Slug EN', asset?.slugEn || 'Sin traducción')}
        {field('Estado del enlace', asset?.megaLinkAlive === true ? 'Disponible' : asset?.megaLinkAlive === false ? 'Caído' : 'Sin verificar')}
        {field('Enlace MEGA', asset?.megaLink ? <a href={asset.megaLink} target="_blank" rel="noopener noreferrer" style={{ color: '#7dd3fc' }}>{asset.megaLink}</a> : 'Sin enlace')}
      </Stack>}
    </Box>
  </>
}
