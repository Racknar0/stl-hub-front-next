'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Chip, Stack, Typography, LinearProgress, Link as MUILink, Box, TextField, Dialog, DialogTitle, DialogContent, IconButton, Button, Autocomplete, FormControlLabel, Switch } from '@mui/material'
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
import CachedIcon from '@mui/icons-material/Cached';

// Nuevos componentes
import ToolbarBusqueda from './componentes/ToolbarBusqueda'
import ModalDetalle from './componentes/ModalDetalle'
import ModalEditar from './componentes/ModalEditar'
import ModalResultadosDrop from './componentes/ModalResultadosDrop'

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
  // Nuevos filtros: por cuenta y por ID
  const [accountQ, setAccountQ] = useState('')
  const [assetIdQ, setAssetIdQ] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [rowCount, setRowCount] = useState(0)
  const [refreshTick, setRefreshTick] = useState(0)
  // filtro plan (se mantiene en backend, pero aquí no exponemos UI adicional salvo búsqueda normal)
  const [showFreeOnly, setShowFreeOnly] = useState(false)

  // Estado: modales
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [dropResultsOpen, setDropResultsOpen] = useState(false)
  const [dropFound, setDropFound] = useState([])
  const [dropNotFound, setDropNotFound] = useState([])

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

  // (Randomizar freebies se movió a otra pantalla del dashboard)

  // Cargar catálogos (categorías y tags)
  const loadMeta = async () => {
    try {
      const [cats, tgs] = await Promise.all([
        http.getData('/categories'),
        http.getData('/tags')
      ])
      setCategories((cats.data?.items || []).map(c => ({ id: c.id, name: c.name, slug: c.slug })))
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

  const normalizeBase = (name) => String(name || '').replace(/^.*[\\/]/, '').replace(/\.[^/.]+$/, '').trim().toLowerCase()

  // Drop múltiple: busca assets por archiveName (exacto) y por nombre base como fallback.
  const handleDropManyFiles = async (fileNames) => {
    const names = Array.from(fileNames || []).map((n) => String(n || '').trim()).filter(Boolean)
    if (!names.length) return

    try {
      setLoading(true)

      // 1) Traer una ventana grande (pero limitada) de assets para poder matchear localmente.
      // Si necesitas más de 1000, más adelante podemos iterar por páginas.
      const res = await http.getData(`/assets?pageIndex=0&pageSize=1000`) // admin route
      const payload = res.data
      const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : []

      const byArchiveLower = new Map()
      const byBaseLower = new Map()
      items.forEach((a) => {
        const an = String(a?.archiveName || '').trim()
        if (an) byArchiveLower.set(an.toLowerCase(), a)
        const bn = normalizeBase(an)
        if (bn) byBaseLower.set(bn, a)
      })

      const found = []
      const notFound = []
      const seenAssetIds = new Set()

      names.forEach((n) => {
        const key = n.toLowerCase()
        const base = normalizeBase(n)
        const asset = byArchiveLower.get(key) || (base ? byBaseLower.get(base) : null)
        if (asset?.id) {
          found.push({ name: n, match: asset.archiveName || '' , assetId: asset.id })
          seenAssetIds.add(asset.id)
        } else {
          notFound.push(n)
        }
      })

      // 2) Mostrar en tabla los assets encontrados (sin duplicados)
      const foundAssets = items.filter((a) => seenAssetIds.has(a.id))
      setAssets(foundAssets)
      setRowCount(foundAssets.length)
      setPageIndex(0)

      // 3) Mostrar modal con resumen
      setDropFound(found)
      setDropNotFound(notFound)
      setDropResultsOpen(true)
    } catch (e) {
      console.error('drop many search error', e)
      setDropFound([])
      setDropNotFound(Array.from(fileNames || []))
      setDropResultsOpen(true)
    } finally {
      setLoading(false)
    }
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
        // Añadir filtros nuevos si están presentes
        const accTrim = String(accountQ || '').trim()
        if (accTrim) {
          // si es número, tomar como accountId; si no, alias
          const asNum = Number(accTrim)
          if (Number.isFinite(asNum) && asNum > 0) params.set('accountId', String(asNum))
          else params.set('accountAlias', accTrim)
        }
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
  const StatusDot = ({ status }) => {
    const s = String(status || '').toUpperCase()
    const map = { DRAFT: '#9e9e9e', PROCESSING: '#29b6f6', PUBLISHED: '#66bb6a', FAILED: '#ef5350' }
    const color = map[s] || '#9e9e9e'
    return <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, display: 'inline-block' }} />
  }
  const columns = useMemo(() => ([
      // ID
      { header: 'ID', accessorKey: 'id', size: 60,
        Cell: ({ cell }) => <Typography variant="body2" sx={{ width: 50, textAlign: 'right' }}>{cell.getValue()}</Typography>
      },
      {
        header: ' ', accessorKey: 'thumbnail', size: 0, enableSorting: false,
        Cell: ({ row }) => {
          const imgs = Array.isArray(row.original.images) ? row.original.images : []
          const first = imgs[0]
          return first ? (
            <img
              src={imgUrl(first)}
              alt="thumb"
              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
              onClick={() => { setSelected(row.original); setPreviewOpen(true); }}
              title="Ver imágenes"
            />
          ) : (
            <Box sx={{ width: 64, height: 40, borderRadius: 6, bgcolor: 'rgba(255,255,255,0.06)' }} />
          )
        }
      },
      { header: 'Nombre', accessorKey: 'title',
        Cell: ({ row, cell }) => {
          const titleEs = cell.getValue()
          const titleEn = row?.original?.titleEn || ''
          const archiveName = row?.original?.archiveName || ''
          return (
            <Box sx={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>es:</Typography>
                {titleEs}
              </Typography>
              {titleEn ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>en:</Typography>
                  {titleEn}
                </Typography>
              ) : null}
              {archiveName ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>file:</Typography>
                  {archiveName}
                </Typography>
              ) : null}
            </Box>
          )
        },
        size: 300,
      },
      // {
      //   id: 'categoriesEs',
      //   header: 'Categorías',
      //   accessorFn: (row) => {
      //     const cats = Array.isArray(row.categories) ? row.categories : []
      //     const names = cats.map(c => c?.name).filter(Boolean)
      //     return names.length ? names.join(', ') : ''
      //   },
      //   Cell: ({ row }) => {
      //     const cats = Array.isArray(row.original.categories) ? row.original.categories : []
      //     const names = cats.map(c => c?.name).filter(Boolean)
      //     const toShow = names
      //     return (
      //       <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      //         {toShow.length ? toShow.map((n, i) => <Chip key={`${n}-${i}`} size="small" label={n} variant="outlined" />) : <Typography variant="body2" color="text.secondary">-</Typography>}
      //       </Stack>
      //     )
      //   },
      //   size: 200,
      // },
      // {
      //   id: 'tags',
      //   header: 'Tags',
      //   accessorFn: (row) => Array.isArray(row.tags) ? row.tags.map(t=>t?.name||t?.slug).join(',') : '',
      //   Cell: ({ row }) => {
      //     const tags = Array.isArray(row.original.tags) ? row.original.tags : []
      //     return (
      //       <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      //         {tags.map((t, i) => <Chip key={`${t?.slug||t}-${i}`} size="small" label={t?.name || t?.slug || t} variant="outlined" />)}
      //       </Stack>
      //     )
      //   },
      // },
      {
        header: 'Plan', accessorKey: 'isPremium', size: 40,
        Cell: ({ cell }) => {
          const isPrem = !!cell.getValue()
          const bg = isPrem ? '#ffeb3b33' : '#4caf5033' // amarillo suave para P, verde suave para F
          const fg = isPrem ? '#fbc02d' : '#43a047'
          return (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 26, height: 22, px: 0.5, borderRadius: 8, bgcolor: bg }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: fg }}>
                {isPrem ? 'P' : 'F'}
              </Typography>
            </Box>
          )
        },
      },
      {
        header: 'Estado', accessorKey: 'status', size: 60,
        Cell: ({ cell }) => <StatusDot status={cell.getValue()} />,
      },
      {
        id: 'sizeB',
        header: 'Tamaño',
        accessorFn: (row) => row.fileSizeB ?? row.archiveSizeB ?? 0,
        Cell: ({ cell }) => <Typography variant="body2">{formatMBfromB(cell.getValue())}</Typography>,
        size: 100,
      },
      { header: 'Cuenta', accessorFn: (row) => row.account?.alias || row.accountId, size: 140,
        Cell: ({ row }) => <Typography variant="body2" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.original.account?.alias || row.original.accountId}</Typography>
      },
      {
        header: 'Subido',
        accessorKey: 'createdAt',
        size: 150,
        Cell: ({ cell }) => {
          const v = cell.getValue()
          if (!v) return <Typography variant="body2" color="text.secondary">-</Typography>
          const d = new Date(v)
          const text = Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('es-ES')
          return <Typography variant="body2">{text}</Typography>
        },
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
    muiTableContainerProps: { sx: { height: { xs: 'calc(100vh - 220px)', md: 'calc(100vh - 240px)' }, overflowX: 'auto' } },
    muiTopToolbarProps: { sx: { position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.default' } },
    muiBottomToolbarProps: { sx: { position: 'sticky', bottom: 0, zIndex: 2, bgcolor: 'background.default' } },
    muiTablePaperProps: { sx: { width: '100%' } },
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableRowActions: true,
    positionActionsColumn: 'first',
    displayColumnDefOptions: { 'mrt-row-actions': { size: 80 } },
    renderTopToolbarCustomActions: ({ table }) => (
      <ToolbarBusqueda
        q={q}
        setQ={setQ}
        onBuscar={() => { setSearchTerm(q); setPageIndex(0); setShowFreeOnly(false) }}
        accountQ={accountQ}
        setAccountQ={setAccountQ}
        onBuscarCuenta={() => { setSearchTerm(''); setPageIndex(0); setShowFreeOnly(false); setRefreshTick(n=>n+1) }}
        assetIdQ={assetIdQ}
        setAssetIdQ={setAssetIdQ}
        showFreeOnly={showFreeOnly}
        onToggleFreeOnly={() => { setShowFreeOnly(v => !v); setPageIndex(0) }}
        onBuscarId={async () => {
          const idNum = Number(assetIdQ)
          if (!Number.isFinite(idNum) || idNum <= 0) return
          try {
            setLoading(true)
            const res = await http.getData(`/assets/${idNum}`)
            const item = res.data
            setAssets(item ? [item] : [])
            setRowCount(item ? 1 : 0)
            setPageIndex(0)
          } catch (e) {
            setAssets([])
            setRowCount(0)
          } finally {
            setLoading(false)
          }
        }}
        onDropManyFiles={handleDropManyFiles}
      />
    ),
    renderRowActions: ({ row }) => (
      <Box sx={{ display: 'flex', gap: 0 }}>
        <IconButton aria-label="Ver" size="small" onClick={() => { setSelected(row.original); setPreviewOpen(true); }} sx={{ p: 0.2 }} title="Ver detalle del STL">
          <VisibilityIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label="Editar" size="small" onClick={() => openEdit(row.original)} sx={{ p: 0.2 }} title="Editar STL">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label="Borrar" size="small" color="error" onClick={() => handleDelete(row.original)} sx={{ p: 0.2 }} title="Eliminar STL">
          <DeleteIcon fontSize="small" />
        </IconButton>
        <IconButton aria-label="Refrescar link" size="small" onClick={() => handleRestoreLink(row.original)} sx={{ p: 0.2 }} title="Verificar y restaurar link MEGA">
          <CachedIcon fontSize="small" />
        </IconButton>
      </Box>
    ),
    muiTableBodyRowProps: ({ row }) => {
      // Cambia el color de fondo si el link está caído
      return row.original.megaLinkAlive === false
        ? { sx: { backgroundColor: '#fc8282' } } // rojo claro, puedes ajustar el color
        : {};
    },
  })

  // Abrir editor con datos del asset (sin categoría legacy)
  const openEdit = async (asset) => {
    setSelected(asset)
    setEditForm({
      title: asset.title || '',
      titleEn: asset.titleEn || '',
      categories: Array.isArray(asset.categories) ? asset.categories.map(c=>({ ...c })) : [],
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
        categories: editForm.categories?.length ? editForm.categories.map(c => String(c.slug).toLowerCase()) : [],
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

  // Recuperar link MEGA desde BACKUP
  const handleRestoreLink = async (asset) => {
    const ok = await confirmAlert('Restaurar link MEGA', `¿Deseas restaurar el link MEGA para "${asset.title}"?`, 'Sí, restaurar', 'Cancelar', 'warning')
    if (!ok) return
    try {
      setLoading(true)
      await http.postData(`/assets/${asset.id}/restore-link`)
      await successAlert('Restaurado', 'El link MEGA fue restaurado correctamente')
    } catch (e) {
      console.error('Error restaurando link MEGA', e)
      await errorAlert('Error', 'No se pudo restaurar el link MEGA')
    } finally {
      // refresh de la tabla para ver cambios
      setRefreshTick(n=>n+1)

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
      <ModalDetalle
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        detail={detail}
        selected={selected}
        imgUrl={imgUrl}
        formatMBfromB={formatMBfromB}
        loadingDetail={loadingDetail}
      />

      {/* Modal: encontrados / no encontrados por drag&drop */}
      <ModalResultadosDrop
        open={dropResultsOpen}
        onClose={() => setDropResultsOpen(false)}
        found={dropFound}
        notFound={dropNotFound}
      />

      {/* Modal: Edición (sin categoría legacy) */}
      <ModalEditar
        open={editOpen}
        onClose={() => { setEditOpen(false); resetEdit() }}
        selected={selected}
        editForm={editForm}
        setEditForm={setEditForm}
        categories={categories}
        allTags={allTags}
        editImageFiles={editImageFiles}
        setEditImageFiles={setEditImageFiles}
        editPreviewIndex={editPreviewIndex}
        setEditPreviewIndex={setEditPreviewIndex}
        fileInputRef={fileInputRef}
        onSelectFiles={onSelectFiles}
        onOpenFilePicker={onOpenFilePicker}
        onPrev={onPrev}
        onNext={onNext}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onRemove={onRemove}
        onSelectPreview={onSelectPreview}
        loading={loading}
        onSave={handleSaveEdit}
        imgUrl={imgUrl}
      />
    </div>
  )
}
