'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Stack, Box, Typography, LinearProgress, Divider, Snackbar, Alert, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import StorageIcon from '@mui/icons-material/Storage';
import CloseIcon from '@mui/icons-material/Close';
import HttpService from '@/services/HttpService';
import BatchRow from './BatchRow';
import MetaCreateDialog from './MetaCreateDialog';
import ProfilesModal from './ProfilesModal';
import RightSidebar from '../assets/uploader/RightSidebar';

const MAX_SIMILARITY_HASH_IMAGES = 8

export default function BatchTable() {
  const [rows, setRows] = useState([])
  const [cuentas, setCuentas] = useState([]) // Fetch MEGA accounts logic needed
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [categoriesCatalog, setCategoriesCatalog] = useState([])
  const [tagsCatalog, setTagsCatalog] = useState([])

  const [scpModalOpen, setScpModalOpen] = useState(false)
  const [scpHost, setScpHost] = useState('127.0.0.1')
  const [scpUser, setScpUser] = useState('root')
  const [scpPort, setScpPort] = useState('22')
  const [scpRemoteBase, setScpRemoteBase] = useState('/root')

  const [profilesModalOpen, setProfilesModalOpen] = useState(false)
  const [selectedRowIdxPerfil, setSelectedRowIdxPerfil] = useState(null)

  const [previewImage, setPreviewImage] = useState(null)

  // SIMILARS SIDEBAR STATES
  const RIGHT_SIDEBAR_WIDTH = 340
  const [searchSidebarSide, setSearchSidebarSide] = useState('right')
  const [similaritySelectedId, setSimilaritySelectedId] = useState(null)
  const [similarityMap, setSimilarityMap] = useState({})
  const http = useMemo(() => new HttpService(), [])

  const uploadsBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
  }, [])
  
  const sidebarQueueItem = rows.find(r => r.id === similaritySelectedId)
  const sidebarSimilarity = similarityMap[similaritySelectedId]
  const toggleSearchSidebarSide = () => setSearchSidebarSide(p => p==='right' ? 'left' : 'right')

  const normalizeAHashHex = useCallback((value) => {
    const h = String(value || '').trim().toLowerCase().replace(/[^0-9a-f]/g, '')
    if (h.length === 16) return h
    if (h.length > 16) return h.slice(0, 16)
    return h.padStart(16, '0')
  }, [])

  const makeUploadsUrl = useCallback((relativeOrUrl) => {
    const value = String(relativeOrUrl || '').trim()
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value
    const rel = value.replace(/^\/+/, '')
    return `${uploadsBase}/uploads/${rel}`
  }, [uploadsBase])

  const computeImageAHashFromUrl = useCallback(async (src) => {
    let objectUrl = ''
    try {
      const response = await fetch(src)
      if (!response.ok) return ''
      const blob = await response.blob()
      objectUrl = URL.createObjectURL(blob)

      const image = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('No se pudo leer imagen'))
        img.src = objectUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = 8
      canvas.height = 8
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return ''

      ctx.clearRect(0, 0, 8, 8)
      ctx.drawImage(image, 0, 0, 8, 8)
      const { data } = ctx.getImageData(0, 0, 8, 8)
      if (!data || data.length < 64 * 4) return ''

      const grays = []
      for (let i = 0; i < data.length; i += 4) {
        const r = Number(data[i] || 0)
        const g = Number(data[i + 1] || 0)
        const b = Number(data[i + 2] || 0)
        const y = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
        grays.push(y)
      }

      const avg = grays.reduce((sum, v) => sum + v, 0) / Math.max(1, grays.length)
      const bits = grays.map((v) => (v >= avg ? '1' : '0')).join('').slice(0, 64).padEnd(64, '0')
      const hex = BigInt(`0b${bits}`).toString(16).padStart(16, '0')
      return normalizeAHashHex(hex)
    } catch {
      return ''
    } finally {
      try { if (objectUrl) URL.revokeObjectURL(objectUrl) } catch {}
    }
  }, [normalizeAHashHex])

  const buildRowImageHashes = useCallback(async (row) => {
    const imgs = Array.isArray(row?.imagenes) ? row.imagenes : []
    const out = []
    for (const rel of imgs.slice(0, MAX_SIMILARITY_HASH_IMAGES)) {
      const src = makeUploadsUrl(rel)
      if (!src) continue
      const hx = await computeImageAHashFromUrl(src)
      if (hx) out.push(hx)
    }
    return Array.from(new Set(out)).slice(0, MAX_SIMILARITY_HASH_IMAGES)
  }, [computeImageAHashFromUrl, makeUploadsUrl])

  const startSimilarityCheck = useCallback(async (row) => {
    const id = Number(row?.id || 0)
    if (!id) return

    const titleValue = String(row?.nombre || '').trim()
    const archiveName = `${titleValue || `batch-${id}`}.rar`
    const sizeB = Math.max(0, Math.floor(Number(row?.pesoMB || 0) * 1024 * 1024))

    setSimilarityMap((m) => ({
      ...(m || {}),
      [id]: {
        ...(m?.[id] || {}),
        status: 'loading',
        phase: 'Analizando imágenes del item…',
        items: [],
        error: '',
        imageHashCount: 0,
      },
    }))

    try {
      const imageHashes = await buildRowImageHashes(row)

      const categoryIds = Array.isArray(row?.categorias)
        ? row.categorias.map((c) => Number(c?.id || 0)).filter((n) => Number.isFinite(n) && n > 0)
        : []
      const categorySlugs = Array.isArray(row?.categorias)
        ? row.categorias
            .flatMap((c) => [String(c?.slug || '').trim(), String(c?.slugEn || '').trim()])
            .filter(Boolean)
        : []
      const tags = Array.isArray(row?.tags)
        ? row.tags.map((t) => String(t?.slug || t?.name || t || '').trim()).filter(Boolean)
        : []

      setSimilarityMap((m) => ({
        ...(m || {}),
        [id]: {
          ...(m?.[id] || {}),
          status: 'loading',
          imageHashCount: imageHashes.length,
          phase: 'Buscando coincidencias por nombre + imagen…',
        },
      }))

      const payload = {
        filename: archiveName,
        limit: 8,
        sizeB,
        imageHashes,
        categoryIds,
        categorySlugs,
        tags,
        title: titleValue,
        titleEn: titleValue,
      }

      const r = await http.postData('/assets/similar', payload)
      const data = r?.data || {}
      const items = Array.isArray(data?.items) ? data.items : []

      setSimilarityMap((m) => ({
        ...(m || {}),
        [id]: {
          status: 'done',
          items,
          error: '',
          phase: 'Completado',
          query: String(data?.query || archiveName),
          imageHashCount: Number(data?.imageHashCount || imageHashes.length || 0),
        },
      }))
    } catch (e) {
      console.error('batch similarity check error', e)
      setSimilarityMap((m) => ({
        ...(m || {}),
        [id]: {
          status: 'error',
          items: [],
          error: 'No se pudo buscar similares',
          phase: 'Error',
          imageHashCount: 0,
        },
      }))
    }
  }, [buildRowImageHashes, http])

  const handleOpenSimilar = useCallback((row) => {
    if (!row?.id) return
    setSimilaritySelectedId(row.id)
    void startSimilarityCheck(row)
  }, [startSimilarityCheck])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (searchSidebarSide === 'left') {
      document.documentElement.style.setProperty('--dash-sidebar-width', `${RIGHT_SIDEBAR_WIDTH}px`)
    } else {
      document.documentElement.style.setProperty('--dash-sidebar-width', '240px')
    }
    // Cleanup al desmontar
    return () => {
      try { document.documentElement.style.setProperty('--dash-sidebar-width', '240px') } catch {}
    }
  }, [searchSidebarSide])

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createModalType, setCreateModalType] = useState('')
  const [createModalRowIdx, setCreateModalRowIdx] = useState(null)

  const [toast, setToast] = useState({ open: false, msg: '', type: 'info' })

  useEffect(() => {
    async function fetchCatalogs() {
      try {
        const cats = await http.getData('/categories')
        setCategoriesCatalog(cats.data?.items || [])
        const tgs = await http.getData('/tags')
        setTagsCatalog(tgs.data?.items || [])
        const accs = await http.getData('/accounts') // Load real Mega accounts
        if (accs.data?.length > 0) {
           setCuentas(accs.data
             .filter(c => c.type === 'main' && (c.storageUsedMB / 1024) < 18)
             .map(c => ({
              id: c.id, alias: c.alias || c.email, limitMB: 19500, usedMB: c.storageUsedMB || 0
           })))
        }
        
        const scpCfg = await http.getData('/assets/scp-config')
        if (scpCfg.data) {
           if (scpCfg.data.host) setScpHost(scpCfg.data.host)
           if (scpCfg.data.user) setScpUser(scpCfg.data.user)
           if (scpCfg.data.port) setScpPort(scpCfg.data.port)
           if (scpCfg.data.remoteBase) setScpRemoteBase(scpCfg.data.remoteBase)
        }
      } catch {}
    }
    fetchCatalogs()
  }, [])

  const mapEstado = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'draft' || s === 'pending') return 'borrador'
    if (s === 'queued' || s === 'processing') return 'procesando'
    if (s === 'done' || s === 'completed') return 'completado'
    if (s === 'error' || s === 'failed') return 'error'
    return s
  }

  const fetchQueue = async () => {
     try {
       const res = await http.getData('/batch-imports')
       if (res.data?.success && res.data?.items) {
          setRows(prevRows => {
             return res.data.items.map(item => {
               const existing = prevRows.find(r => r.id === item.id)
               const estadoDB = mapEstado(item.status)
               
               // Preservar ediciones locales si sigue en borrador
               if (existing && existing.estado === 'borrador' && estadoDB === 'borrador') {
                 return { ...existing }
               }
               
               return {
                 id: item.id,
                 batchId: item.batchId,
                 nombre: item.title || item.folderName,
                 categorias: item.categories || [],
                 tags: item.tags || [],
                 imagenes: item.images || [],
                 cuenta: item.targetAccount || '',
                 estado: estadoDB,
                 pesoMB: item.pesoMB || 0,
                 perfiles: item.profiles || '',
                 mainStatus: item.mainStatus || 'PENDING',
                 backupStatus: item.backupStatus || 'PENDING',
                 mainProgress: item.mainProgress || 0,
               }
             })
          })
       }
     } catch(e) { console.error('Error fetching queue', e) }
  }

  useEffect(() => {
     fetchQueue()
     // Solo poll rápido si hay items procesando
     const iv = setInterval(() => {
       setRows(prevRows => {
         const hasProcessing = prevRows.some(r => r.estado === 'procesando')
         if (hasProcessing) fetchQueue()
         return prevRows
       })
     }, 3000)
     return () => clearInterval(iv)
  }, [])

  const handleScanLocal = async () => {
    try {
      setIsScanning(true)
      setToast({ open: true, msg: `Escaneando carpeta local uploads/batch_imports...`, type: 'info' })
      const res = await http.postData('/batch-imports/scan');
      if (res.data?.success) {
        setToast({ open: true, msg: res.data.message || `Carpetas escaneadas exitosamente`, type: 'success' })
        fetchQueue()
      } else {
        setToast({ open: true, msg: `Error: ${res.data?.message}`, type: 'error' })
      }
    } catch(e) {
      setToast({ open: true, msg: `Excepción al escanear: ${e.message}`, type: 'error' })
    } finally {
      setIsScanning(false)
    }
  }

  const openCreateModal = (type, rowIdx) => {
    setCreateModalType(type)
    setCreateModalRowIdx(rowIdx)
    setCreateModalOpen(true)
  }

  const handleMetaCreated = (item) => {
    if (!item) return
    if (createModalType === 'cat') {
      setCategoriesCatalog(prev => [...prev, item])
      if (createModalRowIdx !== null && Number.isFinite(createModalRowIdx)) {
        const updated = [...rows]
        updated[createModalRowIdx].categorias = [...(updated[createModalRowIdx].categorias || []), item]
        setRows(updated)
      }
    } else {
      setTagsCatalog(prev => [...prev, item])
      if (createModalRowIdx !== null && Number.isFinite(createModalRowIdx)) {
        const updated = [...rows]
        updated[createModalRowIdx].tags = [...(updated[createModalRowIdx].tags || []), item]
        setRows(updated)
      }
    }
    setCreateModalOpen(false)
    setCreateModalRowIdx(null)
    setCreateModalType('')
  }

  const handleCuentaChange = (idx, value) => {
    const updated = [...rows]
    updated[idx].cuenta = value
    setRows(updated)
  }

  const handleNombreChange = (idx, value) => {
    const updated = [...rows]
    updated[idx].nombre = value
    setRows(updated)
  }

  const handleCategoriasChange = (idx, value) => {
    const updated = [...rows]
    updated[idx].categorias = value
    setRows(updated)
  }

  const handleTagsChange = (idx, value) => {
    const updated = [...rows]
    updated[idx].tags = value
    setRows(updated)
  }

  const handleRemoverFila = async (idx) => {
    const row = rows[idx]
    if (!row || !row.id) return

    try {
      const res = await http.deleteData('/batch-imports/items', row.id)
      if (res.data?.success) {
        setToast({ open: true, msg: 'Asset eliminado correctamente', type: 'success' })
        const updated = [...rows]
        updated.splice(idx, 1)
        setRows(updated)
      } else {
        setToast({ open: true, msg: `Error: ${res.data?.message || 'No se pudo eliminar'}`, type: 'error' })
      }
    } catch (e) {
      console.error(e)
      setToast({ open: true, msg: 'Error de red al eliminar el asset', type: 'error' })
    }
  }

  // --- LOGICA DE AUTO DISTRIBUCION ---
  const handleAutoDistribute = () => {
    const LIMIT_GB = 18.5
    const LIMIT_MB = LIMIT_GB * 1024  // 18944 MB

    // Clonar cuentas y ordenar ASCENDENTE por espacio usado (la menos llena primero)
    let accountsStatus = cuentas
      .map(c => ({ ...c, simulatedUsedMB: c.usedMB || 0 }))
      .sort((a, b) => a.simulatedUsedMB - b.simulatedUsedMB)

    const updatedRows = [...rows]
    let unassignedCount = 0

    for (let i = 0; i < updatedRows.length; i++) {
       const row = updatedRows[i]
       if (row.estado === 'completado' || row.estado === 'procesando') continue;
       
       const peso = row.pesoMB || 0;
       
       // Buscar la primera cuenta donde (usado + peso) NO supere 18.5GB
       let bestAccount = accountsStatus.find(a => (a.simulatedUsedMB + peso) <= LIMIT_MB)
       
       if (bestAccount) {
          row.cuenta = bestAccount.id
          bestAccount.simulatedUsedMB += peso
       } else {
          row.cuenta = '' // Ninguna cuenta aguanta este archivo
          unassignedCount++
       }
    }

    setRows(updatedRows)
    
    if (unassignedCount > 0) {
       setToast({ open: true, msg: `Alerta: ${unassignedCount} assets no caben en las cuentas disponibles (límite ${LIMIT_GB}GB). Añade más cuentas.`, type: 'warning' })
    } else {
       setToast({ open: true, msg: 'Distribución inteligente completada con éxito. Revisa el balance.', type: 'success' })
    }
  }

  const handleOpenPerfilModal = (rowIdx) => {
    setSelectedRowIdxPerfil(rowIdx)
    setProfilesModalOpen(true)
  }

  const handleApplyProfileToRow = (profile) => {
    if (selectedRowIdxPerfil === null) return
    const updated = [...rows]
    updated[selectedRowIdxPerfil].categorias = (profile.categories || []).map(slug => {
      return categoriesCatalog.find(c => c.slug === slug) || { slug, name: slug }
    })
    updated[selectedRowIdxPerfil].tags = (profile.tags || []).map(slug => {
      return tagsCatalog.find(t => t.slug === slug) || { slug, name: slug }
    })
    updated[selectedRowIdxPerfil].perfiles = profile.name
    setRows(updated)
    setProfilesModalOpen(false)
    setSelectedRowIdxPerfil(null)
  }

  const handleProcessBatch = async () => {
    const retryableRows = rows.filter(r => r.estado === 'borrador' || r.estado === 'error')
    const invalidRows = retryableRows.some(r => !r.cuenta)
    if (invalidRows) {
       setToast({ open: true, msg: 'Error: Hay assets sin cuenta asignada. Usa Distribuir Automáticamente.', type: 'error' })
       return
    }

    const unassignedCount = retryableRows.length
    if (unassignedCount === 0) return

    setIsProcessing(true)
    setToast({ open: true, msg: 'Guardando datos e iniciando subida...', type: 'info' })

    try {
      // 1. Guardar cambios (nombre, cuenta, categorias, tags)
      const pendingRows = retryableRows.filter(r => r.cuenta)
      
      const savePromises = pendingRows.map(row => 
        http.patchData('/batch-imports/items', row.id, {
          title: row.nombre,
          targetAccount: row.cuenta,
          categories: row.categorias,
          tags: row.tags
        })
      )
      await Promise.all(savePromises)

      // 2. Confirmar items para pasarlos a QUEUED en el Worker
      const itemIds = pendingRows.map(r => r.id)
      const res = await http.postData('/batch-imports/confirm', { itemIds })
      
      if (res.data?.success) {
        const renamedCount = Array.isArray(res.data?.renamed) ? res.data.renamed.length : 0
        const renameMsg = renamedCount > 0 ? ` · renombrados por duplicado: ${renamedCount}` : ''
        setToast({ open: true, msg: `¡${itemIds.length} assets enviados a la cola de subida!${renameMsg}`, type: 'success' })
         fetchQueue() // Refrescar del backend
      } else {
         setToast({ open: true, msg: `Error: ${res.data?.message || 'Fallo inesperado'}`, type: 'error' })
      }
    } catch (e) {
      console.error(e)
      setToast({ open: true, msg: 'Error de red al procesar', type: 'error' })
    } finally {
      setIsProcessing(false)
    }
  }



  return (
    <Box 
      sx={{ 
         pb: 10,
         pr: searchSidebarSide === 'right' ? `${RIGHT_SIDEBAR_WIDTH}px` : 0,
         transition: 'padding 180ms ease'
      }}
    >
       {/* PANEL DE CONTROL SUPERIOR */}
       <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} mb={3}>
         <Button 
            variant="contained" 
            color="secondary"
            onClick={() => setScpModalOpen(true)}
            sx={{ borderRadius: 8, textTransform: 'none', fontWeight: 'bold' }}
         >
           Subida SCP ("El Pesado")
         </Button>
         <Button 
            variant="outlined" 
            color="primary"
            onClick={handleScanLocal}
            disabled={isScanning}
            sx={{ borderRadius: 8, textTransform: 'none', fontWeight: 'bold' }}
         >
           {isScanning ? 'Escaneando...' : 'Escanear Carpetas'}
         </Button>
         <Button 
            variant="outlined" 
            startIcon={<AutoAwesomeIcon />} 
            onClick={handleAutoDistribute}
            sx={{ borderRadius: 8, textTransform: 'none', fontWeight: 'bold', borderColor: '#b388ff', color: '#b388ff', '&:hover': { borderColor: '#d1c4e9', color: '#d1c4e9' } }}
         >
           Distribuir Automáticamente
         </Button>
         <Button 
            variant="outlined" 
            onClick={async () => {
              if (!confirm('¿Estás seguro? Esto eliminará TODOS los items del batch, las carpetas y los registros de la BD.')) return
              try {
                const res = await http.deleteRaw('/batch-imports/purge-all')
                if (res.data?.success) {
                  setRows([])
                  setToast({ open: true, msg: res.data.message, type: 'success' })
                } else {
                  setToast({ open: true, msg: 'Error al purgar', type: 'error' })
                }
              } catch (e) {
                console.error(e)
                setToast({ open: true, msg: 'Error de red al purgar', type: 'error' })
              }
            }}
            sx={{ borderRadius: 8, textTransform: 'none', fontWeight: 'bold', borderColor: '#ff5252', color: '#ff5252', '&:hover': { borderColor: '#ff8a80', color: '#ff8a80', background: 'rgba(255,82,82,0.08)' } }}
         >
           🗑️ Eliminar Todo
         </Button>
       </Stack>

       {/* ─── BARRA DE ALMACENAMIENTO POR CUENTA ─── */}
       {(() => {
         // Agrupar items asignados por cuenta
         const byAccount = {}
         rows.forEach(r => {
           if (!r.cuenta) return
           if (!byAccount[r.cuenta]) byAccount[r.cuenta] = 0
           byAccount[r.cuenta] += (r.pesoMB || 0)
         })

         const accountIds = Object.keys(byAccount)
         if (!accountIds.length) return null

         const LIMIT_MB = 20480 // 20GB

         return (
           <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
             {accountIds.map(accId => {
               const acc = cuentas.find(c => c.id === Number(accId))
               if (!acc) return null
               const usedMB = acc.usedMB || 0
               const incomingMB = byAccount[accId] || 0
               const usedPct = Math.min(100, (usedMB / LIMIT_MB) * 100)
               const incomingPct = Math.min(100 - usedPct, (incomingMB / LIMIT_MB) * 100)
               const totalPct = usedPct + incomingPct

               return (
                 <Box key={accId} sx={{ p: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                   <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                     <Typography variant="body2" sx={{ fontWeight: 700, color: '#fff' }}>{acc.alias}</Typography>
                     <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                       {(usedMB/1024).toFixed(1)} GB ocupados + {(incomingMB/1024).toFixed(1)} GB entrando = {((usedMB+incomingMB)/1024).toFixed(1)} GB / {(LIMIT_MB/1024).toFixed(0)} GB
                     </Typography>
                   </Stack>
                   <Box sx={{ width: '100%', height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative' }}>
                     <Box sx={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${usedPct}%`, background: 'linear-gradient(90deg, #7b61ff, #9b7dff)', borderRadius: 5, transition: 'width 300ms ease' }} />
                     <Box sx={{ position: 'absolute', left: `${usedPct}%`, top: 0, height: '100%', width: `${incomingPct}%`, background: 'linear-gradient(90deg, #ff9800, #ffb74d)', borderRadius: '0 5px 5px 0', transition: 'width 300ms ease' }} />
                   </Box>
                   {totalPct > 90 && (
                     <Typography variant="caption" sx={{ color: '#ff5252', mt: 0.5, display: 'block' }}>
                       ⚠️ Esta cuenta estará a más del 90% de capacidad
                     </Typography>
                   )}
                 </Box>
               )
             })}
             <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
               <Stack direction="row" alignItems="center" spacing={0.5}>
                 <Box sx={{ width: 12, height: 12, borderRadius: 2, background: 'linear-gradient(90deg, #7b61ff, #9b7dff)' }} />
                 <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Ocupado</Typography>
               </Stack>
               <Stack direction="row" alignItems="center" spacing={0.5}>
                 <Box sx={{ width: 12, height: 12, borderRadius: 2, background: 'linear-gradient(90deg, #ff9800, #ffb74d)' }} />
                 <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Entrando (batch)</Typography>
               </Stack>
             </Stack>
           </Box>
         )
       })()}

      <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: 2, background: 'transparent', borderColor: 'rgba(255,255,255,0.1)' }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Acciones</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Asset (Carpeta Encontrada)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Categorías</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Tags (IA)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Perfil Rápido</TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Cuenta MEGA Asignada</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Main</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Backup</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                 <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.7)' }}>No hay assets en `/uploads/batch_imports/`</Typography>
                 </TableCell>
              </TableRow>
            )}
            {rows.map((row, idx) => (
              <BatchRow
                key={row.id || idx}
                row={row}
                idx={idx}
                categoriesCatalog={categoriesCatalog}
                tagsCatalog={tagsCatalog}
                cuentas={cuentas}
                onNombreChange={handleNombreChange}
                onCategoriasChange={handleCategoriasChange}
                onTagsChange={handleTagsChange}
                onCuentaChange={handleCuentaChange}
                onOpenCreateModal={openCreateModal}
                onOpenProfiles={handleOpenPerfilModal}
                onOpenImagePreview={setPreviewImage}
                onOpenSimilar={handleOpenSimilar}
                onRemoverFila={handleRemoverFila}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
         <Typography variant="h6" sx={{ color: '#fff', textShadow: '0px 1px 3px rgba(0,0,0,0.5)' }}>
            <strong>Total Batch:</strong> {(rows.reduce((a,b)=>a+(b.pesoMB||0),0)/1024).toFixed(2)} GB
         </Typography>
         <Button 
            variant="contained" 
            size="large"
            startIcon={<CloudUploadIcon />}
            onClick={handleProcessBatch}
          disabled={isProcessing || rows.filter(r => r.estado === 'borrador' || r.estado === 'error').length === 0}
            sx={{ 
               borderRadius: 8, 
               textTransform: 'none', 
               fontWeight: 700, 
               px: 4, 
               py: 1.5, 
               background: 'linear-gradient(45deg, #00C853 30%, #64DD17 90%)',
               color: '#fff',
               boxShadow: '0 3px 5px 2px rgba(0, 200, 83, .3)',
               '&:hover': {
                  background: 'linear-gradient(45deg, #00E676 30%, #76FF03 90%)',
               }
            }}
         >
           {isProcessing ? 'Enviando al Worker...' : 'Confirmar y Subir al Worker'}
         </Button>
      </Box>

      <MetaCreateDialog
        open={createModalOpen}
        type={createModalType}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleMetaCreated}
      />

      <ProfilesModal
        open={profilesModalOpen}
        onClose={() => { setProfilesModalOpen(false); setSelectedRowIdxPerfil(null); }}
        selectedRow={selectedRowIdxPerfil !== null ? rows[selectedRowIdxPerfil] : null}
        onApply={handleApplyProfileToRow}
      />

      <Dialog open={scpModalOpen} onClose={() => setScpModalOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { background: '#1d1e26', color: '#fff' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Comando para Subida Pesada (SCP)</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}>
            Pega este comando en tu terminal para enviar el contenido de tu súper carpeta local al servidor.
          </Typography>
          <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', fontSize: 13, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#69f0ae' }}>Comando SCP Directo:</div>
            {(() => {
              const cmd = `cd C:\\stl-hub\\super-batch; scp -r .\\* ${scpUser}@${scpHost}:${scpRemoteBase.replace(/\\/g,'/').replace(/\/$/, '')}/uploads/batch_imports/`
              return (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, mb: 1.5, p: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>{cmd}</Typography>
                  <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(cmd)}>Copiar</Button>
                </Stack>
              )
            })()}
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', display: 'block' }}>* Si en algún momento necesitas cambiar la IP del proxy o el usuario, este modal tomará los valores automáticos que configuraste en tu Uploader.</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 2 }}>
          <Button variant="contained" onClick={() => setScpModalOpen(false)}>¡Entendido!</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!previewImage} onClose={() => setPreviewImage(null)} maxWidth="lg" PaperProps={{ sx: { background: 'transparent', boxShadow: 'none' } }}>
        {previewImage && (
           <Box onClick={() => setPreviewImage(null)} sx={{ cursor: 'zoom-out', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
             <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
           </Box>
        )}
      </Dialog>
      
      <RightSidebar
        side={searchSidebarSide}
        collapsible={false}
        inFlow={false}
        open
        width={RIGHT_SIDEBAR_WIDTH}
        title="Búsqueda Similares"
        headerAction={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={toggleSearchSidebarSide} sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: 12, lineHeight: 1.1, color: '#adafb8', borderColor: 'rgba(173,175,184,0.35)' }}>
              {searchSidebarSide === 'right' ? 'A Izquierda' : 'A Derecha'}
            </Button>
            <Button size="small" variant="contained" color="error" onClick={() => setSimilaritySelectedId(null)} sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: 12, lineHeight: 1.1 }}>
              Cerrar
            </Button>
          </Stack>
        }
      >
        {!sidebarQueueItem ? (
          <Typography variant="body2" sx={{ opacity: 0.8, px: 1 }}>Selecciona un ítem para ver similares.</Typography>
        ) : (
          <Box sx={{ px: 1 }}>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Ítem Borrador</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, wordBreak: 'break-word' }}>
              {sidebarQueueItem?.nombre || '(sin nombre)'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75, display: 'block' }}>
              {sidebarQueueItem?.pesoMB} MB • {(sidebarQueueItem?.imagenes || []).length} imágenes
            </Typography>

            <Divider sx={{ my: 1.25, opacity: 0.2 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Assets similares</Typography>
              {sidebarSimilarity?.status === 'loading' && <CircularProgress size={14} />}
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant="outlined"
                onClick={() => { if (sidebarQueueItem) void startSimilarityCheck(sidebarQueueItem) }}
                disabled={!sidebarQueueItem || sidebarSimilarity?.status === 'loading'}
                sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: 12, lineHeight: 1.1 }}
              >
                Revalidar
              </Button>
            </Box>

            {sidebarSimilarity?.status === 'loading' && (
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.75 }}>
                {sidebarSimilarity?.phase || 'Buscando similares…'}
              </Typography>
            )}

            {sidebarSimilarity?.status === 'done' && (
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.5 }}>
                {(sidebarSimilarity?.items || []).length} encontrados · hashes usados: {Number(sidebarSimilarity?.imageHashCount || 0)}
              </Typography>
            )}

            {sidebarSimilarity?.status === 'error' && (
              <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
                {sidebarSimilarity?.error || 'No se pudo buscar similares'}
              </Typography>
            )}

            {sidebarSimilarity?.status === 'done' && (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.1 }}>
                {(sidebarSimilarity?.items || []).map((a) => (
                  <Box key={a.id} sx={{ p: 1, borderRadius: 2, border: '1px solid rgba(88, 214, 141, 0.65)', background: 'rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>{a.title}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.25, wordBreak: 'break-word' }}>{a.archiveName}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.25 }}>
                      {((Number(a.fileSizeB || a.archiveSizeB || 0)) / (1024*1024)).toFixed(2)} MB • {(a.images || []).length} imágenes
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.35 }}>
                      Score total: {Number(a?._similarity?.score || 0)} · nombre: {Number(a?._similarity?.name || 0)} · imagen: {Number(a?._similarity?.image || 0)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'inline-block', mt: 0.55, px: 0.8, py: 0.2, borderRadius: 999, border: '1px solid rgba(88, 214, 141, 0.55)', background: 'rgba(88, 214, 141, 0.14)', color: '#d7ffe7', fontWeight: 700 }}>
                      Coincidencia visual alta
                    </Typography>
                    {(a.images || []).length > 0 && (
                       <Box sx={{ display: 'flex', gap: 1, mt: 0.75, overflowX: 'auto' }}>
                         {(a.images || []).map((src, i) => {
                           const safeSrc = makeUploadsUrl(src)
                           if (!safeSrc) return null
                           return (
                             <img key={i} src={safeSrc} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} onClick={() => setPreviewImage(safeSrc)} />
                           )
                         })}
                       </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}

            {sidebarSimilarity?.status === 'done' && (sidebarSimilarity?.items || []).length === 0 && (
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 1 }}>
                No se encontraron coincidencias.
              </Typography>
            )}
          </Box>
        )}
      </RightSidebar>

      <Snackbar open={toast.open} autoHideDuration={6000} onClose={()=>setToast({...toast, open:false})} anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}>
        <Alert severity={toast.type} variant="filled" sx={{ width: '100%', borderRadius: 2, fontWeight: 'bold' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
