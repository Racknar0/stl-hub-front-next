'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Chip, Stack, Typography, LinearProgress, Link as MUILink, Box, TextField, Dialog, DialogTitle, DialogContent, IconButton, Button, FormControl, InputLabel, Select, MenuItem, Autocomplete, FormControlLabel, Switch } from '@mui/material'
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table'
import LinkIcon from '@mui/icons-material/Link'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import ImagesSection from './uploader/ImagesSection'
import HttpService from '@/services/HttpService'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import { successAlert, errorAlert, confirmAlert } from '@/helpers/alerts'

const statusColor = (s) => ({
  DRAFT: 'default',
  PROCESSING: 'info',
  PUBLISHED: 'success',
  FAILED: 'error',
}[s] || 'default')

export default function AssetsAdminPage() {
  const http = new HttpService()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [rowCount, setRowCount] = useState(0)
  const [refreshTick, setRefreshTick] = useState(0)
  const [editForm, setEditForm] = useState({ title: '', category: '', tags: [], isPremium: false })
  const [categories, setCategories] = useState([])
  const [allTags, setAllTags] = useState([])
  const [editImageFiles, setEditImageFiles] = useState([])
  const [editPreviewIndex, setEditPreviewIndex] = useState(0)
  const fileInputRef = useRef(null)

  const loadMeta = async () => {
    try {
      const [cats, tgs] = await Promise.all([
        http.getData('/categories'),
        http.getData('/tags')
      ])
      setCategories((cats.data?.items || []).map(c => ({ id: c.id, name: c.name })))
      setAllTags((tgs.data?.items || []).map(t => t.name))
    } catch (e) {
      console.error('meta load error', e)
    }
  }

  const resetObjectUrls = () => {
    try { editImageFiles.forEach(it => { if (it.url && it.revoke) URL.revokeObjectURL(it.url) }) } catch {}
  }
  const resetEdit = () => {
    resetObjectUrls()
    setEditForm({ title: '', category: '', tags: [], isPremium: false })
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

  // Cargar datos desde el backend con paginación
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await http.getData(`/assets?q=${encodeURIComponent(searchTerm)}&pageIndex=${pageIndex}&pageSize=${pageSize}`)
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
  }, [searchTerm, pageIndex, pageSize, refreshTick])

  // Quitar filtrado local; el backend ya filtra por q
  const filtered = assets

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
          <Typography variant="body2" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cell.getValue()}</Typography>
        )
      },
      { header: 'Categoría', accessorKey: 'category', size: 140 },
      {
        id: 'tags',
        header: 'Tags',
        accessorFn: (row) => Array.isArray(row.tags) ? row.tags.join(',') : '',
        Cell: ({ row }) => {
          const tags = Array.isArray(row.original.tags) ? row.original.tags : []
          return (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
              {tags.map((t, i) => <Chip key={`${t}-${i}`} size="small" label={t} variant="outlined" />)}
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
        <TextField size="small" placeholder="Buscar por nombre" value={q} onChange={(e)=>setQ(e.target.value)} sx={{ minWidth: 260 }} onKeyDown={(e)=>{ if(e.key==='Enter'){ setSearchTerm(q); setPageIndex(0) } }} />
        <Button variant="outlined" onClick={()=>{ setSearchTerm(q); setPageIndex(0); }}>Buscar</Button>
        <Box sx={{ flex: 1 }} />
      </Box>
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton aria-label="Ver" onClick={() => { setSelected(row.original); setPreviewOpen(true); }}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label="Editar" onClick={() => openEdit(row.original)}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label="Borrar" color="error" onClick={() => { /* pending delete */ }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    ),
  })

  const openEdit = async (asset) => {
    setSelected(asset)
    setEditForm({
      title: asset.title || '',
      category: asset.category || '',
      tags: Array.isArray(asset.tags) ? asset.tags : [],
      isPremium: !!asset.isPremium,
    })
    setEditImageFiles([])
    setEditPreviewIndex(0)
    setEditOpen(true)
    await loadMeta()
  }

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

  const handleSaveEdit = async () => {
    if (!selected) return
    const ok = await confirmAlert('Confirmar cambios', '¿Deseas aplicar las modificaciones a este STL?', 'Sí, guardar', 'Cancelar', 'question')
    if (!ok) return
    try {
      setLoading(true)
      await http.putData('/assets', selected.id, {
        title: editForm.title,
        category: editForm.category,
        tags: editForm.tags,
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

  return (
    <div className="p-3">
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <MaterialReactTable table={table} />
      </Box>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {selected?.title || 'Detalle del asset'}
          <IconButton onClick={() => setPreviewOpen(false)} aria-label="Cerrar"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Stack spacing={2}>
              <Box>
                {Array.isArray(selected.images) && selected.images.length > 0 ? (
                  <Swiper modules={[Navigation]} navigation spaceBetween={10} slidesPerView={1} style={{ width: '100%', height: 320 }}>
                    {selected.images.map((rel, idx) => (
                      <SwiperSlide key={idx}>
                        <img src={imgUrl(rel)} alt={`img-${idx}`} style={{ width: '100%', height: 320, objectFit: 'contain', borderRadius: 8 }} />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                ) : (
                  <Box sx={{ width: '100%', height: 320, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
                )}
              </Box>

              <Stack direction="row" spacing={2}>
                <Chip size="small" label={selected.category || 'Sin categoría'} />
                {selected.isPremium && <Chip size="small" color="warning" label="Premium" />}
                <Chip size="small" label={selected.status} color={statusColor(selected.status)} />
              </Stack>

              {Array.isArray(selected.tags) && selected.tags.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                  {selected.tags.map((t, i) => <Chip key={`${t}-${i}`} size="small" label={t} variant="outlined" />)}
                </Stack>
              )}

              <Typography variant="body2">Cuenta: {selected.accountId}</Typography>
              <Typography variant="body2">Tamaño: {formatMBfromB(selected.fileSizeB ?? selected.archiveSizeB)}</Typography>
              <Typography variant="body2">Creado: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '-'}</Typography>
              {selected.megaLink && (
                <Typography variant="body2">
                  <LinkIcon fontSize="small" style={{ verticalAlign: 'middle' }} />{' '}
                  <MUILink href={selected.megaLink} target="_blank" rel="noreferrer" underline="hover">Enlace MEGA</MUILink>
                </Typography>
              )}
              {selected.description && (
                <Typography variant="body2" color="text.secondary">{selected.description}</Typography>
              )}
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onClose={() => { setEditOpen(false); resetEdit() }} maxWidth="md" fullWidth
        slotProps={{
          backdrop: { sx: { zIndex: 1500 } },
          paper: { sx: { zIndex: 1600 } },
        }}
      >
        <DialogTitle>Editar STL</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Nombre" value={editForm.title} onChange={(e)=>setEditForm(f=>({...f, title: e.target.value}))} fullWidth size="small" />

            <Stack direction="row" spacing={1} alignItems="stretch">
              <FormControl fullWidth size="small">
                <InputLabel id="cat-edit">Categoría</InputLabel>
                <Select labelId="cat-edit" label="Categoría" value={editForm.category} onChange={(e)=>setEditForm(f=>({...f, category: e.target.value}))}>
                  {categories.map(c => (
                    <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Autocomplete
              multiple
              freeSolo
              options={allTags}
              value={editForm.tags}
              onChange={(_, v) => setEditForm(f=>({...f, tags: v}))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option+index} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} size="small" label="Tags" placeholder="Añadir tag" />
              )}
            />

            <FormControlLabel control={<Switch checked={editForm.isPremium} onChange={(e)=>setEditForm(f=>({...f, isPremium: e.target.checked}))} />} label={editForm.isPremium ? 'Premium' : 'Free'} />

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
