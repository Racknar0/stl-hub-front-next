'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Chip, Stack, Typography, LinearProgress, Link as MUILink, Box, TextField, Dialog, DialogTitle, DialogContent, IconButton, Button, Autocomplete, FormControlLabel, Switch } from '@mui/material'
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table'
import LinkIcon from '@mui/icons-material/Link'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import ShuffleIcon from '@mui/icons-material/Shuffle'
import ImagesSection from './uploader/ImagesSection'
import HttpService from '@/services/HttpService'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import { successAlert, errorAlert, confirmAlert } from '@/helpers/alerts'

// Mapea estado a color de chip
const statusColor = (s) => ({
  DRAFT: 'default',
  PROCESSING: 'info',
  PUBLISHED: 'success',
  FAILED: 'error',
}[s] || 'default')

// Helper para normalizar a slug
const slugify = (s) => String(s || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9-\s_]+/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 80)

export default function AssetsAdminPage() {
  // Servicios
  const http = new HttpService()

  // Estado: tabla y filtros
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [rowCount, setRowCount] = useState(0)
  const [refreshTick, setRefreshTick] = useState(0)
  // Nuevo: filtro solo Free
  const [showFreeOnly, setShowFreeOnly] = useState(false)

  // Estado: modales
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  // Estado: selección actual y formularios
  const [selected, setSelected] = useState(null)
  // Edit form sin categoría legacy
  const [editForm, setEditForm] = useState({ title: '', titleEn: '', categories: [], tags: [], isPremium: false })
  // Detalle bilingüe
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Catálogo meta
  const [categories, setCategories] = useState([])
  const [allTags, setAllTags] = useState([])

  // Estado: imágenes del editor
  const [editImageFiles, setEditImageFiles] = useState([])
  const [editPreviewIndex, setEditPreviewIndex] = useState(0)
  const fileInputRef = useRef(null)

  // Estado: cantidad para randomizar freebies
  const [freeCount, setFreeCount] = useState(0)

  // Cargar catálogos (categorías y tags)
  const loadMeta = async () => {
    try {
      const [cats, tgs] = await Promise.all([
        http.getData('/categories'),
        http.getData('/tags')
      ])
      setCategories((cats.data?.items || []).map(c => ({ id: c.id, name: c.name, slug: c.slug })))
      // Tags como objetos, se mostrará name y almacenaremos slugs en el form
      setAllTags((tgs.data?.items || []).map(t => ({ name: t.name, slug: t.slug })))
    } catch (e) {
      console.error('meta load error', e)
    }
  }

  // Utilidades
  const resetObjectUrls = () => {
    try { editImageFiles.forEach(it => { if (it.url && it.revoke) URL.revokeObjectURL(it.url) }) } catch {}
  }
  const resetEdit = () => {
    resetObjectUrls()
    setEditForm({ title: '', titleEn: '', categories: [], tags: [], isPremium: false })
    setEditImageFiles([])
    setEditPreviewIndex(0)
    setSelected(null)
  }

  const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads'
  const imgUrl = (rel) => {
    if (!rel) return ''
    const clean = String(rel).replace(/^\\+|^\/+/, '')
    return `${UPLOAD_BASE}/${clean}`
  }
  const formatMBfromB = (bytes) => {
    const n = Number(bytes)
    if (!n || n <= 0) return '0 MB'
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  }

  // Cargar datos de la tabla (paginación servidor)
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          q: String(searchTerm || ''),
          pageIndex: String(pageIndex),
          pageSize: String(pageSize),
        })
        if (showFreeOnly) params.set('plan', 'free')
        const res = await http.getData(`/assets?${params.toString()}`)
        const payload = res.data
        if (payload && Array.isArray(payload.items)) {
          setAssets(payload.items)
          setRowCount(Number(payload.total) || 0)
        } else if (Array.isArray(payload)) {
          setAssets(payload)
          setRowCount(payload.length)
        } else {
          setAssets([])
          setRowCount(0)
        }
      } catch (e) {
        console.error('No se pudieron cargar assets', e)
        setAssets([])
        setRowCount(0)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [searchTerm, pageIndex, pageSize, refreshTick, showFreeOnly])

  // Tabla: datos filtrados (sin filtrado local extra)
  const filtered = assets

  // Detalle: cargar bilingüe al abrir modal de vista
  useEffect(() => {
    if (previewOpen && selected?.id) {
      setLoadingDetail(true)
      http.getData(`/assets/${selected.id}`)
        .then((res) => setDetail(res.data))
        .catch((e) => { console.error('load detail error', e); setDetail(selected) })
        .finally(() => setLoadingDetail(false))
    } else {
      setDetail(null)
    }
  }, [previewOpen, selected?.id])

  // Tabla: definición de columnas (ES)
  const columns = useMemo(() => ([
      {
        header: ' ', accessorKey: 'thumbnail', size: 70, enableSorting: false,
        Cell: ({ row }) => {
          const imgs = Array.isArray(row.original.images) ? row.original.images : []
          const first = imgs[0]
          return first ? (
            <img src={imgUrl(first)} alt="thumb" style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6 }} />
          ) : (
            <Box sx={{ width: 64, height: 40, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.06)' }} />
          )
        }
      },
      { header: 'Nombre', accessorKey: 'title',
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell.getValue()}</Typography>
        )
      },
      {
        id: 'categoriesEs',
        header: 'Categorías',
        accessorFn: (row) => {
          const cats = Array.isArray(row.categories) ? row.categories : []
          const names = cats.map(c => c?.name).filter(Boolean)
          return names.length ? names.join(', ') : ''
        },
        Cell: ({ row }) => {
          const cats = Array.isArray(row.original.categories) ? row.original.categories : []
          const names = cats.map(c => c?.name).filter(Boolean)
          const toShow = names
          return (
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {toShow.length ? toShow.map((n, i) => <Chip key={`${n}-${i}`} size="small" label={n} variant="outlined" />) : <Typography variant="body2" color="text.secondary">-</Typography>}
            </Stack>
          )
        },
        size: 200,
      },
      {
        id: 'tags',
        header: 'Tags',
        accessorFn: (row) => Array.isArray(row.tags) ? row.tags.map(t=>t?.name||t?.slug).join(',') : '',
        Cell: ({ row }) => {
          const tags = Array.isArray(row.original.tags) ? row.original.tags : []
          return (
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {tags.map((t, i) => <Chip key={`${t?.slug||t}-${i}`} size="small" label={t?.name || t?.slug || t} variant="outlined" />)}
            </Stack>
          )
        },
      },
      {
        header: 'Plan', accessorKey: 'isPremium', size: 100,
        Cell: ({ cell }) => <Chip size="small" label={cell.getValue() ? 'Premium' : 'Free'} color={cell.getValue() ? 'warning' : 'default'} />,
      },
      {
        header: 'Estado', accessorKey: 'status', size: 120,
        Cell: ({ cell }) => <Chip size="small" label={cell.getValue()} color={statusColor(cell.getValue())} />,
      },
      {
        id: 'sizeB',
        header: 'Tamaño',
        accessorFn: (row) => row.fileSizeB ?? row.archiveSizeB ?? 0,
        Cell: ({ cell }) => <Typography variant="body2">{formatMBfromB(cell.getValue())}</Typography>,
        size: 100,
      },
      { header: 'Cuenta', accessorFn: (row) => row.account?.alias || row.accountId, size: 160,
        Cell: ({ row }) => <Typography variant="body2">{row.original.account?.alias || row.original.accountId}</Typography>
      },
      {
        header: 'Creado', accessorKey: 'createdAt', size: 160,
        Cell: ({ cell }) => <Typography variant="body2">{cell.getValue() ? new Date(cell.getValue()).toLocaleString() : '-'}</Typography>,
      },
      {
        header: 'MEGA', accessorKey: 'megaLink', size: 160,
        Cell: ({ cell }) => cell.getValue() ? (
          <Typography variant="body2">
            <LinkIcon fontSize="small" style={{ verticalAlign: 'middle' }} />{' '}
            <MUILink href={cell.getValue()} target="_blank" rel="noreferrer" underline="hover">Abrir</MUILink>
          </Typography>
        ) : <Typography variant="body2" color="text.secondary">-</Typography>,
      },
    ]), [])

  // Instancia de la tabla
  const table = useMaterialReactTable({
    columns,
    data: filtered,
    initialState: { density: 'compact' },
    enableStickyHeader: true,
    enablePagination: true,
    manualPagination: true,
    rowCount,
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const next = updater({ pageIndex, pageSize })
        setPageIndex(next.pageIndex)
        setPageSize(next.pageSize)
      } else if (updater && typeof updater === 'object') {
        setPageIndex(updater.pageIndex ?? 0)
        setPageSize(updater.pageSize ?? 50)
      }
    },
    state: { isLoading: loading, pagination: { pageIndex, pageSize } },
    muiPaginationProps: {
      rowsPerPageOptions: [10, 25, 50, 100, 200, 300, 400, 500, 1000],
    },
    muiTableContainerProps: { sx: { maxHeight: 620, overflowX: 'auto' } },
    muiTopToolbarProps: { sx: { position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.default' } },
    muiBottomToolbarProps: { sx: { position: 'sticky', bottom: 0, zIndex: 2, bgcolor: 'background.default' } },
    muiTablePaperProps: { sx: { width: '100%' } },
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableRowActions: true,
    positionActionsColumn: 'last',
    renderTopToolbarCustomActions: ({ table }) => (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '100%' }}>
        {/* Barra de búsqueda */}
        <TextField size="small" placeholder="Buscar por nombre" value={q} onChange={(e)=>setQ(e.target.value)} sx={{ minWidth: 260 }} onKeyDown={(e)=>{ if(e.key==='Enter'){ setSearchTerm(q); setPageIndex(0); setShowFreeOnly(false) } }} />
        <Button variant="outlined" onClick={()=>{ setSearchTerm(q); setPageIndex(0); setShowFreeOnly(false); }}>Buscar</Button>
        <Button variant={showFreeOnly ? 'contained' : 'outlined'} color={showFreeOnly ? 'success' : 'primary'} onClick={()=>{ setSearchTerm(q); setPageIndex(0); setShowFreeOnly(true); }}>Buscar Free</Button>
        <Box sx={{ flex: 1 }} />
      </Box>
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {/* Acciones: Ver / Editar / Borrar */}
        <IconButton aria-label="Ver" onClick={() => { setSelected(row.original); setPreviewOpen(true); }}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label="Editar" onClick={() => openEdit(row.original)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label="Borrar" color="error" onClick={() => handleDelete(row.original)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    ),
  })

  // Abrir editor con datos del asset (sin categoría legacy)
  const openEdit = async (asset) => {
    setSelected(asset)
    setEditForm({
      title: asset.title || '',
      titleEn: asset.titleEn || '',
      // relación categorías
      categories: Array.isArray(asset.categories) ? asset.categories.map(c=>({ ...c })) : [],
      // relación tags -> en el form trabajamos con slugs simples
      tags: Array.isArray(asset.tags) ? asset.tags.map(t=>String(t.slug||t.name||'').toLowerCase()).filter(Boolean) : [],
      isPremium: !!asset.isPremium,
    })
    setEditImageFiles([])
    setEditPreviewIndex(0)
    setEditOpen(true)
    await loadMeta()
  }

  // Helpers de imágenes para editor
  const buildItemsFromFiles = (files) => {
    const list = []
    Array.from(files || []).forEach((f, idx) => {
      const url = URL.createObjectURL(f)
      list.push({ id: `${Date.now()}_${idx}`, url, name: f.name, file: f, revoke: true })
    })
    return list
  }
  const onSelectFiles = (e) => {
    const files = e.target.files
    const items = buildItemsFromFiles(files)
    setEditImageFiles(prev => [...prev, ...items])
    if (editImageFiles.length === 0 && items.length > 0) setEditPreviewIndex(0)
  }
  const onDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files
    if (files && files.length) {
      const items = buildItemsFromFiles(files)
      setEditImageFiles(prev => [...prev, ...items])
      if (editImageFiles.length === 0 && items.length > 0) setEditPreviewIndex(0)
    }
  }
  const onDragOver = (e) => e.preventDefault()
  const onOpenFilePicker = () => fileInputRef.current?.click()
  const onPrev = () => setEditPreviewIndex(i => (i - 1 + editImageFiles.length) % Math.max(1, editImageFiles.length))
  const onNext = () => setEditPreviewIndex(i => (i + 1) % Math.max(1, editImageFiles.length))
  const onRemove = (id) => {
    setEditImageFiles(prev => {
      const idx = prev.findIndex(p => p.id === id)
      if (idx >= 0) { try { prev[idx].url && prev[idx].revoke && URL.revokeObjectURL(prev[idx].url) } catch {} }
      const arr = prev.filter(p => p.id !== id)
      if (editPreviewIndex >= arr.length) setEditPreviewIndex(Math.max(0, arr.length - 1))
      return arr
    })
  }
  const onSelectPreview = (idx) => setEditPreviewIndex(idx)

  // Guardar edición (sin categoría legacy)
  const handleSaveEdit = async () => {
    if (!selected) return
    const ok = await confirmAlert('Confirmar cambios', '¿Deseas aplicar las modificaciones a este STL?', 'Sí, guardar', 'Cancelar', 'question')
    if (!ok) return
    try {
      setLoading(true)
      await http.putData('/assets', selected.id, {
        title: editForm.title,
        titleEn: editForm.titleEn,
        // enviar categorías por slug (solo relación múltiple)
        categories: editForm.categories?.length ? editForm.categories.map(c => String(c.slug).toLowerCase()) : [],
        // tags: array de slugs (o ids si cambias el form)
        tags: (editForm.tags || []).map(t=>String(t).trim().toLowerCase()),
        isPremium: editForm.isPremium,
      })
      if (editImageFiles && editImageFiles.length > 0) {
        const fd = new FormData()
        editImageFiles.forEach((it) => fd.append('images', it.file))
        await http.postFormData(`/assets/${selected.id}/images?replace=true`, fd)
      }
      setEditOpen(false)
      resetEdit()
      setRefreshTick((n)=>n+1)
      await successAlert('Actualizado', 'El STL fue actualizado correctamente')
    } catch (e) {
      console.error('Error guardando cambios', e)
      await errorAlert('Error', 'No se pudieron guardar los cambios')
    } finally {
      setLoading(false)
    }
  }

  // Eliminar asset
  const handleDelete = async (asset) => {
    const ok = await confirmAlert('Eliminar STL', `¿Deseas eliminar "${asset.title}"? Se borrará de la base de datos y se intentará borrar de MEGA.`, 'Sí, eliminar', 'Cancelar', 'warning')
    if (!ok) return
    try {
      setLoading(true)
      const res = await http.deleteData('/assets', asset.id)
      const { dbDeleted, megaDeleted } = res.data || {}
      if (dbDeleted && megaDeleted) {
        await successAlert('Eliminado', 'Archivos borrados exitosamente de MEGA y de la base de datos')
      } else if (dbDeleted && !megaDeleted) {
        await successAlert('Parcial', 'Archivos borrados solamente de la base de datos')
      } else {
        await errorAlert('Error', 'No se pudo eliminar el STL')
      }
      setRefreshTick(n=>n+1)
    } catch (e) {
      await errorAlert('Error', e?.response?.data?.message || 'Fallo al eliminar')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="p-3">
      {/* Barra de carga superior */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}


      {/* Tabla */}
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <MaterialReactTable table={table} />
      </Box>

      {/* Modal: Detalle ES/EN */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {detail?.title || selected?.title || 'Detalle del asset'}
          <IconButton onClick={() => setPreviewOpen(false)} aria-label="Cerrar"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {(detail || selected) ? (
            <Stack spacing={2}>
              {/* Carrusel de imágenes */}
              <Box>
                {Array.isArray((detail?.images ?? selected?.images)) && (detail?.images ?? selected?.images).length > 0 ? (
                  <Swiper modules={[Navigation]} navigation spaceBetween={10} slidesPerView={1} style={{ width: '100%', height: 320 }}>
                    {(detail?.images ?? selected.images).map((rel, idx) => (
                      <SwiperSlide key={idx}>
                        <img src={imgUrl(rel)} alt={`img-${idx}`} style={{ width: '100%', height: 320, objectFit: 'contain', borderRadius: 8 }} />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                ) : (
                  <Box sx={{ width: '100%', height: 320, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
                )}
              </Box>

              {/* Estado y plan */}
              <Stack direction="row" spacing={2}>
                <Chip size="small" label={(detail?.category ?? selected?.category) || 'Sin categoría'} />
                {(detail?.isPremium ?? selected?.isPremium) && <Chip size="small" color="warning" label="Premium" />}
                <Chip size="small" label={(detail?.status ?? selected?.status)} color={statusColor(detail?.status ?? selected?.status)} />
              </Stack>

              {/* Títulos ES/EN */}
              <Box>
                <Typography variant="subtitle2">Título (ES)</Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>{detail?.title || selected?.title || '-'}</Typography>
                <Typography variant="subtitle2">Title (EN)</Typography>
                <Typography variant="body2">{detail?.titleEn || selected?.titleEn || '-'}</Typography>
              </Box>

              {/* Categorías ES/EN */}
              {(() => {
                const cats = Array.isArray(detail?.categories) ? detail.categories : []
                const catsEs = cats.length ? cats.map(c => c?.name).filter(Boolean) : ((detail?.category ?? selected?.category) ? [detail?.category ?? selected?.category] : [])
                const catsEn = cats.length ? cats.map(c => c?.nameEn || c?.name).filter(Boolean) : catsEs
                return (
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Categorías (ES)</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                      {catsEs.length ? catsEs.map((n, i) => (<Chip key={`ces-${i}`} size="small" label={n} variant="outlined" />)) : (<Typography variant="body2" color="text.secondary">-</Typography>)}
                    </Stack>
                    <Typography variant="subtitle2">Categories (EN)</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                      {catsEn.length ? catsEn.map((n, i) => (<Chip key={`cen-${i}`} size="small" label={n} variant="outlined" />)) : (<Typography variant="body2" color="text.secondary">-</Typography>)}
                    </Stack>
                  </Stack>
                )
              })()}

              {/* Tags ES/EN */}
              {(() => {
                const tagsEs = Array.isArray(detail?.tagsEs) ? detail.tagsEs : (Array.isArray(selected?.tags) ? selected.tags.map(t=>t?.slug||t) : [])
                const tagsEn = Array.isArray(detail?.tagsEn) ? detail.tagsEn : (Array.isArray(selected?.tags) ? selected.tags.map(t=>t?.nameEn||t?.name||t?.slug||t) : tagsEs)
                return (
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">Tags (ES)</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                      {tagsEs.length ? tagsEs.map((t, i) => (<Chip key={`tes-${i}`} size="small" label={t} variant="outlined" />)) : (<Typography variant="body2" color="text.secondary">-</Typography>)}
                    </Stack>
                    <Typography variant="subtitle2">Tags (EN)</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                      {tagsEn.length ? tagsEn.map((t, i) => (<Chip key={`ten-${i}`} size="small" label={t} variant="outlined" />)) : (<Typography variant="body2" color="text.secondary">-</Typography>)}
                    </Stack>
                  </Stack>
                )
              })()}

              {/* Otros metadatos */}
              <Typography variant="body2">Cuenta: {detail?.account?.alias || detail?.accountId || selected?.account?.alias || selected?.accountId}</Typography>
              <Typography variant="body2">Tamaño: {formatMBfromB((detail?.fileSizeB ?? detail?.archiveSizeB) ?? (selected?.fileSizeB ?? selected?.archiveSizeB))}</Typography>
              <Typography variant="body2">Creado: {(detail?.createdAt ?? selected?.createdAt) ? new Date(detail?.createdAt ?? selected?.createdAt).toLocaleString() : '-'}</Typography>
              {(detail?.megaLink ?? selected?.megaLink) && (
                <Typography variant="body2">
                  <LinkIcon fontSize="small" style={{ verticalAlign: 'middle' }} />{' '}
                  <MUILink href={detail?.megaLink ?? selected?.megaLink} target="_blank" rel="noreferrer" underline="hover">Enlace MEGA</MUILink>
                </Typography>
              )}
              {(detail?.description ?? selected?.description) && (
                <Typography variant="body2" color="text.secondary">{detail?.description ?? selected?.description}</Typography>
              )}

              {loadingDetail && <Typography variant="caption" color="text.secondary">Cargando detalle…</Typography>}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Modal: Edición (sin categoría legacy) */}
      <Dialog open={editOpen} onClose={() => { setEditOpen(false); resetEdit() }} maxWidth="md" fullWidth
        slotProps={{
          backdrop: { sx: { zIndex: 1500 } },
          paper: { sx: { zIndex: 1600 } },
        }}
      >
        <DialogTitle>Editar STL</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {/* Campos básicos */}
            <TextField label="Nombre (ES)" value={editForm.title} onChange={(e)=>setEditForm(f=>({...f, title: e.target.value}))} fullWidth size="small" />
            <TextField label="Nombre (EN)" value={editForm.titleEn} onChange={(e)=>setEditForm(f=>({...f, titleEn: e.target.value}))} fullWidth size="small" />

            {/* Categorías múltiples (ES) */}
            <Autocomplete
              multiple
              disableCloseOnSelect
              options={categories}
              getOptionLabel={(o)=>o?.name || ''}
              isOptionEqualToValue={(o,v)=>o.id===v.id}
              value={editForm.categories || []}
              onChange={(_, v) => setEditForm(f=>({...f, categories: v }))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option.name} {...getTagProps({ index })} key={`${option.slug}-${index}`} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} size="small" label="Categorías" placeholder="Selecciona categorías" />
              )}
            />

            {/* Tags */}
            <Autocomplete
              multiple
              freeSolo
              options={allTags}
              getOptionLabel={(o)=> (typeof o === 'string' ? o : (o?.name || o?.slug || ''))}
              value={editForm.tags}
              onChange={(_, v) => {
                const normalized = Array.from(new Set((v||[]).map(item => {
                  if (typeof item === 'string') return slugify(item)
                  return slugify(item.slug || item.name)
                }).filter(Boolean)))
                setEditForm(f=>({...f, tags: normalized}))
              }}
              slotProps={{ popper: { sx: { zIndex: 2000 } }, paper: { sx: { zIndex: 2000 } } }}
              renderTags={(value, getTagProps) =>
                (value||[]).map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option+index} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} size="small" label="Tags" placeholder="Añadir tag" />
              )}
            />

            {/* Plan */}
            <FormControlLabel control={<Switch checked={editForm.isPremium} onChange={(e)=>setEditForm(f=>({...f, isPremium: e.target.checked}))} />} label={editForm.isPremium ? 'Premium' : 'Free'} />

            {/* Imágenes (drag & drop) */}
            {editImageFiles.length > 0 ? (
              <ImagesSection
                imageFiles={editImageFiles}
                previewIndex={editPreviewIndex}
                onPrev={onPrev}
                onNext={onNext}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onOpenFilePicker={onOpenFilePicker}
                fileInputRef={fileInputRef}
                onSelectFiles={onSelectFiles}
                onRemove={onRemove}
                onSelectPreview={onSelectPreview}
              />
            ) : (
              <>
                {Array.isArray(selected?.images) && selected.images.length > 0 ? (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>Imágenes actuales</Typography>
                    <Swiper modules={[Navigation]} navigation spaceBetween={10} slidesPerView={1} style={{ width: '100%', height: 320 }}>
                      {selected.images.map((rel, idx) => (
                        <SwiperSlide key={idx}>
                          <img src={imgUrl(rel)} alt={`img-${idx}`} style={{ width: '100%', height: 320, objectFit: 'contain', borderRadius: 8 }} />
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </Box>
                ) : (
                  <Box sx={{ width: '100%', height: 320, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
                )}
                <Box sx={{ mt: 1 }}>
                  <Button variant="outlined" onClick={onOpenFilePicker}>Reemplazar imágenes</Button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onSelectFiles} />
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
          <Button onClick={() => { setEditOpen(false); resetEdit() }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
        </Box>
      </Dialog>
    </div>
  )
}
