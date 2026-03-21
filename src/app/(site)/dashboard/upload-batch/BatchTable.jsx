'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Stack, Box, Typography, LinearProgress, Divider, Snackbar, Alert, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import StorageIcon from '@mui/icons-material/Storage';
import CloseIcon from '@mui/icons-material/Close';
import ReplayIcon from '@mui/icons-material/Replay';
import HttpService from '@/services/HttpService';
import BatchRow from './BatchRow';
import MetaCreateDialog from './MetaCreateDialog';
import ProfilesModal from './ProfilesModal';
import RightSidebar from '../assets/uploader/RightSidebar';
import { successAlert } from '@/helpers/alerts';

const MAX_SIMILARITY_HASH_IMAGES = 8
const ACCOUNT_LIMIT_MB = 19 * 1024
const SIMILARITY_CURRENT_IMAGE_SIZE = Math.round(144 * 1.75)
const SIMILARITY_MATCH_IMAGE_SIZE = Math.round(154 * 1.75)

export default function BatchTable() {
  const [rows, setRows] = useState([])
  const [cuentas, setCuentas] = useState([]) // Fetch MEGA accounts logic needed
  const [isRefreshingAccounts, setIsRefreshingAccounts] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState(null)
  const [isApplyingAiMetadata, setIsApplyingAiMetadata] = useState(false)
  const [isRetryingAi, setIsRetryingAi] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [categoriesCatalog, setCategoriesCatalog] = useState([])
  const [tagsCatalog, setTagsCatalog] = useState([])
  const [aiRetryCandidateIds, setAiRetryCandidateIds] = useState([])

  const [scpModalOpen, setScpModalOpen] = useState(false)
  const [scpCommandData, setScpCommandData] = useState(null)
  const [scpCommandError, setScpCommandError] = useState('')
  const [scpCommandLoading, setScpCommandLoading] = useState(false)
  const [scpDropActive, setScpDropActive] = useState(false)
  const [scpIndexedFile, setScpIndexedFile] = useState(null)
  const [scpUploadProbe, setScpUploadProbe] = useState({
    exists: false,
    percent: 0,
    sizeB: 0,
    speedMBs: 0,
    done: false,
    error: '',
  })
  const scpPickerRef = React.useRef(null)
  const scpProbeRef = React.useRef({ sizeB: 0, ts: 0 })
  const cuentasRef = React.useRef([])
  const isRefreshingAccountsRef = React.useRef(false)
  const distributionAccountIdsRef = React.useRef([])
  const distributionSelectionDirtyRef = React.useRef(false)
  const scanTerminalToastRef = React.useRef('')
  const scanTrackingSinceRef = React.useRef(0)

  const [profilesModalOpen, setProfilesModalOpen] = useState(false)
  const [selectedRowIdxPerfil, setSelectedRowIdxPerfil] = useState(null)

  const [previewImage, setPreviewImage] = useState(null)
  const [watchBatchRun, setWatchBatchRun] = useState({ active: false, trackedIds: [], sawInFlight: false })
  const [distributionAccountIds, setDistributionAccountIds] = useState([])

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
  const compactActionBtnSx = {
    borderRadius: 2,
    textTransform: 'none',
    fontWeight: 700,
    fontSize: 13,
    px: 1.4,
    py: 0.55,
    minHeight: 34,
    whiteSpace: 'nowrap',
  }

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
        ? row.tags.map((t) => String(t?.slug || t?.name || t?.es || t?.nameEn || t?.en || t || '').trim()).filter(Boolean)
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
        titleEn: String(row?.nombreEn || titleValue || '').trim(),
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
    cuentasRef.current = Array.isArray(cuentas) ? cuentas : []
  }, [cuentas])

  useEffect(() => {
    distributionAccountIdsRef.current = Array.isArray(distributionAccountIds) ? distributionAccountIds : []
  }, [distributionAccountIds])

  const formatBytes = useCallback((b) => {
    const n = Number(b || 0)
    if (!Number.isFinite(n) || n <= 0) return '0 B'
    if (n < 1024) return `${n} B`
    const kb = n / 1024
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb / 1024
    if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb / 1024
    return `${gb.toFixed(2)} GB`
  }, [])

  const pickScpFile = useCallback((filesLike) => {
    const files = Array.from(filesLike || [])
    if (!files.length) return

    const selected = files.reduce((best, curr) => {
      if (!best) return curr
      return Number(curr?.size || 0) > Number(best?.size || 0) ? curr : best
    }, null)

    if (!selected) return

    const fileMeta = {
      name: String(selected.name || '').trim(),
      size: Math.max(0, Number(selected.size || 0)),
      relPath: String(selected.webkitRelativePath || '').trim(),
    }

    if (!fileMeta.name) {
      setToast({ open: true, msg: 'Archivo inválido para SCP.', type: 'warning' })
      return
    }

    setScpIndexedFile(fileMeta)
    setScpUploadProbe({ exists: false, percent: 0, sizeB: 0, speedMBs: 0, done: false, error: '' })
    scpProbeRef.current = { sizeB: 0, ts: 0 }
    setScpModalOpen(true)
    setScpCommandData(null)
    setScpCommandError('')
  }, [])

  const handleScpDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setScpDropActive(false)
    pickScpFile(e.dataTransfer?.files)
  }, [pickScpFile])

  const handleScpPick = useCallback((e) => {
    pickScpFile(e.target?.files)
    try { e.target.value = '' } catch {}
  }, [pickScpFile])

  const refreshBatchAccounts = useCallback(async ({ silent = false } = {}) => {
    if (isRefreshingAccountsRef.current) return cuentasRef.current
    isRefreshingAccountsRef.current = true
    setIsRefreshingAccounts(true)
    try {
      const accs = await http.getData('/accounts?batchUpload=1')
      const list = Array.isArray(accs?.data) ? accs.data : []
      const normalized = list
        .filter(c => String(c?.type || '').toLowerCase() === 'main')
        .map(c => ({
          id: c.id,
          alias: c.alias || c.email || `Cuenta ${c.id}`,
          limitMB: ACCOUNT_LIMIT_MB,
          usedMB: Number(c.storageUsedMB || 0),
          totalMB: Number(c.storageTotalMB || 0),
        }))
        .filter(c => Number(c.id) > 0 && Number(c.usedMB || 0) < Number(c.limitMB || ACCOUNT_LIMIT_MB))

      const availableIds = new Set(normalized.map((c) => Number(c.id)))
      setDistributionAccountIds((prev) => {
        const keep = (Array.isArray(prev) ? prev : [])
          .map((id) => Number(id))
          .filter((id) => availableIds.has(id))
        distributionAccountIdsRef.current = keep
        return keep
      })

      setCuentas(normalized)
      if (!silent) {
        setToast({ open: true, msg: 'Cuentas refrescadas con uso real.', type: 'info' })
      }
      return normalized
    } catch (e) {
      console.error('refreshBatchAccounts error', e)
      if (!silent) {
        setToast({ open: true, msg: 'No se pudo refrescar cuentas ahora.', type: 'warning' })
      }
      return cuentasRef.current
    } finally {
      isRefreshingAccountsRef.current = false
      setIsRefreshingAccounts(false)
    }
  }, [http])

  useEffect(() => {
    async function fetchCatalogs() {
      try {
        const cats = await http.getData('/categories')
        setCategoriesCatalog(cats.data?.items || [])
        const tgs = await http.getData('/tags')
        setTagsCatalog(tgs.data?.items || [])
        await refreshBatchAccounts({ silent: true })
      } catch {}
    }
    fetchCatalogs()
  }, [http, refreshBatchAccounts])

  const fetchBatchScpCommand = useCallback(async () => {
    if (!scpIndexedFile?.name) {
      setScpCommandError('Arrastra un archivo para indexar la subida.')
      return
    }
    setScpCommandLoading(true)
    setScpCommandError('')
    try {
      const res = await http.postData('/assets/scp-command', {
        mode: 'batch',
        filename: scpIndexedFile.name,
      })
      if (res?.data?.ok && res?.data?.commands) {
        setScpCommandData(res.data)
      } else {
        setScpCommandData(null)
        setScpCommandError(res?.data?.message || 'No se pudo obtener el comando SCP')
      }
    } catch (e) {
      setScpCommandData(null)
      setScpCommandError(e?.response?.data?.message || e?.message || 'No se pudo desbloquear el comando SCP')
    } finally {
      setScpCommandLoading(false)
    }
  }, [http, scpIndexedFile])

  useEffect(() => {
    if (!scpModalOpen || !scpIndexedFile?.name) return
    if (scpCommandLoading) return
    if (scpCommandData?.commands) return
    void fetchBatchScpCommand()
  }, [scpModalOpen, scpIndexedFile, scpCommandLoading, scpCommandData, fetchBatchScpCommand])

  useEffect(() => {
    if (!scpModalOpen || !scpIndexedFile?.name) return

    let cancelled = false
    const pathRel = `batch_imports/${scpIndexedFile.name}`
    const expectedSize = Number(scpIndexedFile.size || 0)

    const poll = async () => {
      try {
        const r = await http.postData('/assets/staged-status/batch-imports', {
          paths: [pathRel],
          expectedSizes: [expectedSize],
        })
        const row = Array.isArray(r?.data?.data) ? r.data.data[0] : null
        if (cancelled || !row) return

        const sizeB = Math.max(0, Number(row.sizeB || 0))
        const rawPct = Number(row.percent)
        const pct = Number.isFinite(rawPct)
          ? Math.max(0, Math.min(100, rawPct))
          : (expectedSize > 0 ? Math.max(0, Math.min(100, Math.floor((sizeB / expectedSize) * 100))) : 0)

        const now = Date.now()
        const prev = scpProbeRef.current || { sizeB: 0, ts: 0 }
        const dt = Math.max(0, now - Number(prev.ts || 0))
        const db = Math.max(0, sizeB - Number(prev.sizeB || 0))
        const speedMBs = dt > 0 ? (db / (1024 * 1024)) / (dt / 1000) : 0

        scpProbeRef.current = { sizeB, ts: now }
        setScpUploadProbe({
          exists: !!row.exists,
          percent: pct,
          sizeB,
          speedMBs: Number.isFinite(speedMBs) ? speedMBs : 0,
          done: pct >= 100,
          error: '',
        })
      } catch {
        if (cancelled) return
        setScpUploadProbe((prev) => ({ ...prev, error: 'No se pudo leer el progreso del archivo en VPS.' }))
      }
    }

    poll()
    const id = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [scpModalOpen, scpIndexedFile, http])

  const mapEstado = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'draft' || s === 'pending') return 'borrador'
    if (s === 'queued' || s === 'processing') return 'procesando'
    if (s === 'done' || s === 'completed') return 'completado'
    if (s === 'error' || s === 'failed') return 'error'
    return s
  }

  const buildFallbackDescriptions = (titleEs, titleEn) => {
    const esBase = String(titleEs || '').trim() || 'asset'
    const enBase = String(titleEn || '').trim() || esBase
    return {
      es: `Modelo STL de ${esBase}.`,
      en: `STL model of ${enBase}.`,
    }
  }

  const mapBackendItemToRow = (item) => {
    const titleEs = item.title || item.folderName
    const titleEn = item.titleEn || item.title || item.folderName
    return {
      id: item.id,
      batchId: item.batchId,
      nombre: titleEs,
      nombreEn: titleEn,
      categorias: item.categories || [],
      tags: item.tags || [],
      description: String(item.description || '').trim() || buildFallbackDescriptions(titleEs, titleEn).es,
      descriptionEn: String(item.descriptionEn || item.description || '').trim() || buildFallbackDescriptions(titleEs, titleEn).en,
      imagenes: item.images || [],
      cuenta: item.targetAccount || '',
      estado: mapEstado(item.status),
      pesoMB: item.pesoMB || 0,
      perfiles: item.profiles || '',
      mainStatus: item.mainStatus || 'PENDING',
      backupStatus: item.backupStatus || 'PENDING',
      mainProgress: item.mainProgress || 0,
    }
  }

  const fetchQueue = async ({ forceBackendDraft = false } = {}) => {
     try {
       const res = await http.getData('/batch-imports')
       if (res.data?.success && res.data?.items) {
          setRows(prevRows => {
             return res.data.items.map(item => {
               const existing = prevRows.find(r => r.id === item.id)
               const estadoDB = mapEstado(item.status)
               const backendRow = mapBackendItemToRow(item)
               
               // Preservar ediciones locales si sigue en borrador
               if (!forceBackendDraft && existing && existing.estado === 'borrador' && estadoDB === 'borrador') {
                 const backendCats = Array.isArray(item.categories) ? item.categories : []
                 const backendTags = Array.isArray(item.tags) ? item.tags : []
                 const localCats = Array.isArray(existing.categorias) ? existing.categorias : []
                 const localTags = Array.isArray(existing.tags) ? existing.tags : []
                  const backendTitleEs = String(item.title || item.folderName || '').trim()
                  const backendTitleEn = String(item.titleEn || item.title || item.folderName || '').trim()
                  const fallbackDescriptions = buildFallbackDescriptions(backendTitleEs, backendTitleEn)
                  const backendDescription = String(item.description || '').trim() || fallbackDescriptions.es
                  const backendDescriptionEn = String(item.descriptionEn || item.description || '').trim() || fallbackDescriptions.en
                 const localDescription = String(existing.description || '').trim()
                 const localDescriptionEn = String(existing.descriptionEn || '').trim()

                 // Mantener edición local, pero no pisar sugerencias IA si local está vacío.
                 return {
                   ...existing,
                   categorias: localCats.length > 0 ? localCats : backendCats,
                   tags: localTags.length > 0 ? localTags : backendTags,
                   description: localDescription || backendDescription,
                   descriptionEn: localDescriptionEn || backendDescriptionEn,
                 }
               }
               
               return backendRow
             })
          })
       }
     } catch(e) { console.error('Error fetching queue', e) }
  }

  useEffect(() => {
     fetchQueue()
     // Poll mientras exista cualquier item en flujo (main/backup)
     const iv = setInterval(() => {
       setRows(prevRows => {
         const hasProcessing = prevRows.some(r => {
          const st = String(r.estado || '').toLowerCase()
          const backup = String(r.backupStatus || '').toUpperCase()
          return st === 'procesando' || (st === 'completado' && (backup === 'PENDING' || backup === 'UPLOADING'))
         })
         if (hasProcessing) fetchQueue()
         return prevRows
       })
     }, 3000)
     return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (!watchBatchRun?.active) return

    const trackedIds = Array.isArray(watchBatchRun.trackedIds)
      ? watchBatchRun.trackedIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
      : []
    if (!trackedIds.length) return

    const trackedRows = rows.filter((r) => trackedIds.includes(Number(r.id)))
    if (trackedRows.length < trackedIds.length) return

    const hasInFlight = trackedRows.some(r => {
      const st = String(r.estado || '').toLowerCase()
      const backup = String(r.backupStatus || '').toUpperCase()
      return st === 'procesando' || (st === 'completado' && (backup === 'PENDING' || backup === 'UPLOADING'))
    })

    if (hasInFlight) {
      if (!watchBatchRun.sawInFlight) {
        setWatchBatchRun((prev) => ({ ...prev, sawInFlight: true }))
      }
      return
    }

    const allTerminal = trackedRows.every((r) => {
      const st = String(r.estado || '').toLowerCase()
      return st === 'completado' || st === 'error'
    })
    if (!allTerminal) return

    void successAlert('Cola finalizada', 'La cola de subidas ha finalizado.')
    setWatchBatchRun({ active: false, trackedIds: [], sawInFlight: false })
  }, [rows, watchBatchRun])

  const handleScanLocal = async () => {
    const nowTs = Date.now()
    scanTrackingSinceRef.current = nowTs
    scanTerminalToastRef.current = ''
    try {
      setScanStatus(null)
      setIsScanning(true)
      setToast({ open: true, msg: 'Escaneando carpeta local uploads/batch_imports...', type: 'info' })
      const res = await http.postData('/batch-imports/scan', {}, { timeout: 0 });
      if (res.data?.success) {
        setAiRetryCandidateIds([])
        const scannedCount = Number(res.data?.scannedItemsCount || 0)
        const queuedCount = Number(res.data?.newlyQueuedCount || 0)
        setToast({
          open: true,
          msg: res.data.message || `Escaneo completo: ${scannedCount} detectados, ${queuedCount} nuevos.`,
          type: 'success'
        })
        const statusRes = await http.getData('/batch-imports/scan-status').catch(() => null)
        const scan = statusRes?.data?.scan || null
        if (scan) {
          setScanStatus(scan)
          if (Number(scan?.runId || 0) > 0) {
            scanTerminalToastRef.current = `${scan.runId}:done`
          }
        }
        setIsScanning(false)
        fetchQueue()
      } else {
        setIsScanning(false)
        setToast({ open: true, msg: `Error: ${res.data?.message}`, type: 'error' })
      }
    } catch(e) {
      if (Number(e?.response?.status) === 409) {
        const runningScan = e?.response?.data?.scan || null
        if (runningScan) {
          setScanStatus(runningScan)
          const startedAt = Number(runningScan?.startedAt || 0)
          scanTrackingSinceRef.current = startedAt > 0 ? startedAt : Date.now()
        }
        setIsScanning(true)
        setToast({
          open: true,
          msg: e?.response?.data?.message || 'Ya existe un escaneo en progreso. Mostrando estado en vivo.',
          type: 'warning'
        })
        return
      }

      const isNetworkError = !e?.response
      if (isNetworkError) {
        const statusRes = await http.getData('/batch-imports/scan-status').catch(() => null)
        const scan = statusRes?.data?.scan || null
        if (scan) {
          setScanStatus(scan)
        }
        const running = String(scan?.status || '').toLowerCase() === 'running'
        setIsScanning(running)
        setToast({
          open: true,
          msg: running
            ? 'Network Error durante el escaneo. El backend sigue procesando; mostrando progreso en vivo.'
            : 'Network Error durante el escaneo. No se pudo confirmar que siga en ejecución.',
          type: running ? 'warning' : 'error'
        })
        try {
          await fetchQueue()
          setTimeout(() => { void fetchQueue() }, 2500)
          setTimeout(() => { void fetchQueue() }, 6000)
        } catch {}
      } else {
        setIsScanning(false)
        setToast({ open: true, msg: `Excepción al escanear: ${e.response?.data?.message || e.message}`, type: 'error' })
      }
    }
  }

  useEffect(() => {
    if (!isScanning) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await http.getData('/batch-imports/scan-status')
        if (cancelled) return
        const scan = res?.data?.scan || null
        if (!scan) return

        setScanStatus(scan)

        const startedAt = Number(scan?.startedAt || 0)
        const trackingSince = Number(scanTrackingSinceRef.current || 0)
        const belongsToCurrentWatch = !trackingSince || (startedAt > 0 && startedAt >= (trackingSince - 1500))
        if (!belongsToCurrentWatch) return

        const status = String(scan?.status || '').toLowerCase()
        if (status === 'done' || status === 'error' || status === 'idle') {
          setIsScanning(false)

          const runId = Number(scan?.runId || 0)
          const toastKey = `${runId}:${status}`
          if (scanTerminalToastRef.current !== toastKey) {
            scanTerminalToastRef.current = toastKey
            if (status === 'done') {
              setToast({
                open: true,
                msg: String(scan?.message || '').trim() || 'Escaneo finalizado.',
                type: 'success',
              })
            } else if (status === 'error') {
              setToast({
                open: true,
                msg: String(scan?.message || '').trim() || 'El escaneo finalizó con error.',
                type: 'error',
              })
            }
          }

          void fetchQueue()
        }
      } catch {
        // Mantener el polling vivo para reintentar en el siguiente tick.
      }
    }

    void poll()
    const id = setInterval(() => { void poll() }, 1000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [isScanning, http])

  const scanStatusUi = useMemo(() => {
    const phase = String(scanStatus?.phase || '').toLowerCase()
    const status = String(scanStatus?.status || '').toLowerCase()
    const current = Math.max(0, Number(scanStatus?.current || 0))
    const total = Math.max(0, Number(scanStatus?.total || 0))
    const percentRaw = Number(scanStatus?.percent)
    const percent = Number.isFinite(percentRaw)
      ? Math.max(0, Math.min(100, Math.round(percentRaw)))
      : (total > 0 ? Math.round((current / total) * 100) : 0)

    const phaseLabelMap = {
      initializing: 'Inicializando',
      decompress: 'Descompresión',
      discovery: 'Discovery',
      cleanup: 'Limpieza',
      done: 'Completado',
      error: 'Error',
      idle: 'Inactivo',
    }

    const archivesDone = Math.max(0, Number(scanStatus?.counters?.archives?.done || 0))
    const archivesTotal = Math.max(0, Number(scanStatus?.counters?.archives?.total || 0))
    const foldersDone = Math.max(0, Number(scanStatus?.counters?.folders?.done || 0))
    const foldersTotal = Math.max(0, Number(scanStatus?.counters?.folders?.total || 0))
    const itemsDone = Math.max(0, Number(scanStatus?.counters?.items?.done || 0))
    const itemsTotal = Math.max(0, Number(scanStatus?.counters?.items?.total || 0))
    const updatedAtMs = Number(scanStatus?.updatedAt || 0)
    const updatedAgoSec = updatedAtMs > 0
      ? Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000))
      : null
    const staleWarnSec = 25
    const isStale = status === 'running' && Number.isFinite(updatedAgoSec) && updatedAgoSec >= staleWarnSec

    return {
      status,
      phase,
      phaseLabel: phaseLabelMap[phase] || 'Procesando',
      message: String(scanStatus?.message || '').trim(),
      current,
      total,
      percent,
      archivesDone,
      archivesTotal,
      foldersDone,
      foldersTotal,
      itemsDone,
      itemsTotal,
      updatedAgoSec,
      isStale,
    }
  }, [scanStatus, isScanning])

  const handleApplyAiMetadata = async () => {
    const ids = rows
      .filter((r) => r.estado === 'borrador' || r.estado === 'error')
      .map((r) => Number(r.id))
      .filter((n) => Number.isFinite(n) && n > 0)

    const uniqueIds = Array.from(new Set(ids))
    if (!uniqueIds.length) {
      setToast({ open: true, msg: 'No hay items borrador/error para generar metadatos IA.', type: 'info' })
      return
    }

    try {
      setIsApplyingAiMetadata(true)
      setToast({ open: true, msg: `Generando metadatos IA para ${uniqueIds.length} item(s)...`, type: 'info' })
      const res = await http.postData('/batch-imports/ai-metadata', { itemIds: uniqueIds }, { timeout: 0 })

      if (res.data?.success) {
        const aiFailedItems = Number(res.data?.aiFailedItems || 0)
        const aiRateLimitedItems = Number(res.data?.aiRateLimitedItems || 0)
        const aiRetryAttempts = Number(res.data?.aiRetryAttempts || 0)
        const aiFailedItemIds = Array.isArray(res.data?.aiFailedItemIds)
          ? Array.from(new Set(res.data.aiFailedItemIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)))
          : []

        if (!res.data?.aiTimedOut) {
          setAiRetryCandidateIds(aiFailedItemIds)
        }

        const note = []
        if (aiRetryAttempts > 0) note.push(`reintentos IA: ${aiRetryAttempts}`)
        if (aiFailedItems > 0) {
          note.push(
            aiRateLimitedItems > 0
              ? `fallidos: ${aiFailedItems} (${aiRateLimitedItems} por rate limit)`
              : `fallidos: ${aiFailedItems}`
          )
        }

        const baseMsg = res.data?.message || 'Metadatos IA finalizados.'
        const finalMsg = note.length ? `${baseMsg} ${note.join(' · ')}` : baseMsg
        const finalType = (res.data?.aiTimedOut || aiFailedItems > 0) ? 'warning' : 'success'
        setToast({ open: true, msg: finalMsg, type: finalType })

        fetchQueue({ forceBackendDraft: true })
        if (res.data?.aiApplyDeferred) {
          setTimeout(() => { void fetchQueue({ forceBackendDraft: true }) }, 2500)
          setTimeout(() => { void fetchQueue({ forceBackendDraft: true }) }, 6000)
          setTimeout(() => { void fetchQueue({ forceBackendDraft: true }) }, 10000)
        }
      } else {
        setToast({ open: true, msg: res.data?.message || 'No se pudo generar metadatos IA.', type: 'error' })
      }
    } catch (e) {
      setToast({ open: true, msg: `Error generando metadatos IA: ${e.response?.data?.message || e.message}`, type: 'error' })
    } finally {
      setIsApplyingAiMetadata(false)
    }
  }

  const handleRetryFailedAi = async () => {
    const ids = Array.from(new Set(aiRetryCandidateIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)))
    if (!ids.length) {
      setToast({ open: true, msg: 'No hay items fallidos de IA para reintentar.', type: 'info' })
      return
    }

    try {
      setIsRetryingAi(true)
      setToast({ open: true, msg: `Reintentando IA para ${ids.length} item(s) fallidos...`, type: 'info' })
      const res = await http.postData('/batch-imports/retry-ai', { itemIds: ids }, { timeout: 0 })

      if (res.data?.success) {
        const aiFailedItems = Number(res.data?.aiFailedItems || 0)
        const aiRateLimitedItems = Number(res.data?.aiRateLimitedItems || 0)
        const aiRetryAttempts = Number(res.data?.aiRetryAttempts || 0)
        const aiFailedItemIds = Array.isArray(res.data?.aiFailedItemIds)
          ? Array.from(new Set(res.data.aiFailedItemIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)))
          : []

        if (!res.data?.aiTimedOut) {
          setAiRetryCandidateIds(aiFailedItemIds)
        }

        const note = []
        if (aiRetryAttempts > 0) note.push(`reintentos IA: ${aiRetryAttempts}`)
        if (aiFailedItems > 0) {
          note.push(
            aiRateLimitedItems > 0
              ? `fallidos: ${aiFailedItems} (${aiRateLimitedItems} por rate limit)`
              : `fallidos: ${aiFailedItems}`
          )
        }

        const baseMsg = res.data?.message || 'Reintento IA finalizado.'
        const finalMsg = note.length ? `${baseMsg} ${note.join(' · ')}` : baseMsg
        const finalType = (res.data?.aiTimedOut || aiFailedItems > 0) ? 'warning' : 'success'
        setToast({ open: true, msg: finalMsg, type: finalType })

        fetchQueue({ forceBackendDraft: true })
        if (res.data?.aiApplyDeferred) {
          setTimeout(() => { void fetchQueue({ forceBackendDraft: true }) }, 2500)
          setTimeout(() => { void fetchQueue({ forceBackendDraft: true }) }, 6000)
          setTimeout(() => { void fetchQueue({ forceBackendDraft: true }) }, 10000)
        }
      } else {
        setToast({ open: true, msg: res.data?.message || 'No se pudo reintentar IA.', type: 'error' })
      }
    } catch (e) {
      setToast({ open: true, msg: `Error reintentando IA: ${e.response?.data?.message || e.message}`, type: 'error' })
    } finally {
      setIsRetryingAi(false)
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

  const handleNombreEnChange = (idx, value) => {
    const updated = [...rows]
    updated[idx].nombreEn = value
    setRows(updated)
  }

  const handleDescriptionChange = (idx, value) => {
    const updated = [...rows]
    updated[idx].description = value
    setRows(updated)
  }

  const handleDescriptionEnChange = (idx, value) => {
    const updated = [...rows]
    updated[idx].descriptionEn = value
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

  const handleRetryWithOtherProxy = async (row) => {
    const id = Number(row?.id || 0)
    if (!id) return
    try {
      const res = await http.postData(`/batch-imports/items/${id}/retry-proxy`, {})
      if (res.data?.success) {
        setToast({ open: true, msg: 'Cancelando subida actual y cambiando a otro proxy...', type: 'warning' })
        fetchQueue()
      } else {
        setToast({ open: true, msg: res.data?.message || 'No se pudo forzar cambio de proxy', type: 'error' })
      }
    } catch (e) {
      setToast({ open: true, msg: `Error al cambiar proxy: ${e.message}`, type: 'error' })
    }
  }

  const activeUploadingRow = useMemo(() => {
    return rows.find((r) => {
      const main = String(r?.mainStatus || '').toUpperCase()
      const backup = String(r?.backupStatus || '').toUpperCase()
      return main === 'UPLOADING' || backup === 'UPLOADING'
    }) || null
  }, [rows])

  const handleRotateProxyGlobal = async () => {
    if (!activeUploadingRow) {
      setToast({ open: true, msg: 'No hay ninguna subida activa para rotar proxy.', type: 'warning' })
      return
    }
    await handleRetryWithOtherProxy(activeUploadingRow)
  }

  const mainProgressStats = useMemo(() => {
    const eligible = rows.filter((r) => String(r.estado || '').toLowerCase() !== 'borrador')
    const total = eligible.length
    if (!total) return { total: 0, pct: 0, ok: 0, error: 0, uploading: 0 }

    let units = 0
    let ok = 0
    let error = 0
    let uploading = 0

    for (const r of eligible) {
      const st = String(r.mainStatus || 'PENDING').toUpperCase()
      if (st === 'OK') {
        ok += 1
        units += 1
      } else if (st === 'ERROR') {
        error += 1
        units += 1
      } else if (st === 'UPLOADING') {
        uploading += 1
        const p = Math.max(0, Math.min(100, Number(r.mainProgress || 0)))
        units += p / 100
      }
    }

    return {
      total,
      pct: Math.round((units / total) * 100),
      ok,
      error,
      uploading,
    }
  }, [rows])

  const backupProgressStats = useMemo(() => {
    const eligible = rows.filter((r) => {
      const isDraft = String(r.estado || '').toLowerCase() === 'borrador'
      const backup = String(r.backupStatus || 'PENDING').toUpperCase()
      return !isDraft && backup !== 'N/A'
    })
    const total = eligible.length
    if (!total) return { total: 0, pct: 0, ok: 0, error: 0, uploading: 0 }

    let units = 0
    let ok = 0
    let error = 0
    let uploading = 0

    for (const r of eligible) {
      const st = String(r.backupStatus || 'PENDING').toUpperCase()
      if (st === 'OK') {
        ok += 1
        units += 1
      } else if (st === 'ERROR') {
        error += 1
        units += 1
      } else if (st === 'UPLOADING') {
        uploading += 1
        units += 0.5
      }
    }

    return {
      total,
      pct: Math.round((units / total) * 100),
      ok,
      error,
      uploading,
    }
  }, [rows])

  // --- LOGICA DE AUTO DISTRIBUCION ---
  const handleAutoDistribute = async ({ preferredAccountIds = [] } = {}) => {
    const LIMIT_GB = 19
    const LIMIT_MB = LIMIT_GB * 1024  // 18944 MB

    const freshAccounts = await refreshBatchAccounts({ silent: true })
    if (!Array.isArray(freshAccounts) || freshAccounts.length === 0) {
      setToast({ open: true, msg: 'No hay cuentas disponibles para distribuir.', type: 'warning' })
      return
    }

    const preferredSet = new Set(
      (Array.isArray(preferredAccountIds) ? preferredAccountIds : [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    )

    // Clonar cuentas y ordenar ASCENDENTE por espacio usado (la menos llena primero)
    let accountsStatus = freshAccounts
      .map(c => ({ ...c, simulatedUsedMB: c.usedMB || 0 }))
      .filter((a) => Number(a.simulatedUsedMB || 0) < LIMIT_MB)

    if (preferredSet.size > 0) {
      accountsStatus = accountsStatus.filter((a) => preferredSet.has(Number(a.id)))
    }

    if (accountsStatus.length === 0) {
      setToast({
        open: true,
        msg: preferredSet.size > 0
          ? 'Las cuentas seleccionadas no tienen espacio disponible.'
          : 'No hay cuentas con espacio disponible para distribuir.',
        type: 'warning',
      })
      return
    }

    accountsStatus = accountsStatus.sort((a, b) => a.simulatedUsedMB - b.simulatedUsedMB)

    const assignableRows = rows.filter((r) => r.estado !== 'completado' && r.estado !== 'procesando')
    if (!assignableRows.length) {
      setToast({ open: true, msg: 'No hay items en borrador/error para redistribuir.', type: 'info' })
      return
    }

    const updatedRows = [...rows]
    let unassignedCount = 0

    for (let i = 0; i < updatedRows.length; i++) {
       const row = updatedRows[i]
       if (row.estado === 'completado' || row.estado === 'procesando') continue;
       
       const peso = row.pesoMB || 0;
       
      // Buscar la primera cuenta donde (usado + peso) NO supere 19GB
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
       const scopedMsg = preferredSet.size > 0
         ? `Distribución completada usando ${accountsStatus.length} cuenta(s) seleccionadas.`
         : 'Distribución inteligente completada con éxito. Revisa el balance.'
       setToast({ open: true, msg: scopedMsg, type: 'success' })
    }
  }

  const handleDistributionAccountsChange = (event) => {
    const rawValue = event?.target?.value
    const list = Array.isArray(rawValue) ? rawValue : []
    const normalized = Array.from(new Set(
      list
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    ))
    distributionSelectionDirtyRef.current = true
    distributionAccountIdsRef.current = normalized
    setDistributionAccountIds(normalized)
  }

  const handleDistributionSelectorClose = () => {
    if (!distributionSelectionDirtyRef.current) return
    distributionSelectionDirtyRef.current = false
    const selected = distributionAccountIdsRef.current
    if (!Array.isArray(selected) || selected.length === 0) {
      setToast({ open: true, msg: 'Sin selección de cuentas: no se redistribuyó.', type: 'info' })
      return
    }
    void handleAutoDistribute({ preferredAccountIds: selected })
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

  const hasRowCategories = (row) => {
    return Array.isArray(row?.categorias) && row.categorias.some((c) => {
      const id = Number(c?.id || 0)
      const key = String(c?.slug || c?.name || '').trim()
      return (Number.isFinite(id) && id > 0) || !!key
    })
  }

  const hasRowTags = (row) => {
    return Array.isArray(row?.tags) && row.tags.some((t) => {
      if (typeof t === 'string') return !!String(t).trim()
      const id = Number(t?.id || 0)
      const key = String(t?.slug || t?.name || t?.es || t?.nameEn || t?.en || '').trim()
      return (Number.isFinite(id) && id > 0) || !!key
    })
  }

  const isRowReadyForQueue = (row) => {
    const accountId = Number(row?.cuenta || 0)
    return Number.isFinite(accountId) && accountId > 0 && hasRowCategories(row) && hasRowTags(row)
  }

  const handleProcessBatch = async () => {
    const retryableRows = rows.filter(r => r.estado === 'borrador' || r.estado === 'error')
    if (retryableRows.length === 0) return

    const readyRows = retryableRows.filter(isRowReadyForQueue)
    const pendingRows = retryableRows.filter((r) => !isRowReadyForQueue(r))
    if (readyRows.length === 0) {
      setToast({
        open: true,
        msg: 'No hay assets listos. Completa cuenta, categoría y tags para al menos un item.',
        type: 'warning'
      })
      return
    }

    const incomingByAccount = new Map()
    for (const row of readyRows) {
      const accountId = Number(row.cuenta || 0)
      if (!accountId) continue
      const sizeMb = Number(row.pesoMB || 0)
      incomingByAccount.set(accountId, (incomingByAccount.get(accountId) || 0) + sizeMb)
    }

    const overflowAccounts = []
    for (const [accountId, incomingMb] of incomingByAccount.entries()) {
      const account = cuentas.find(c => Number(c.id) === Number(accountId))
      if (!account) continue
      const usedMb = Number(account.usedMB || 0)
      const projectedMb = usedMb + Number(incomingMb || 0)
      if (projectedMb > ACCOUNT_LIMIT_MB) {
        overflowAccounts.push(`${account.alias} (${(projectedMb / 1024).toFixed(2)} GB)`)
      }
    }
    if (overflowAccounts.length > 0) {
      setToast({
        open: true,
        msg: `Límite 19GB excedido en: ${overflowAccounts.join(', ')}. Reasigna antes de confirmar.`,
        type: 'error'
      })
      return
    }

    setIsProcessing(true)
    setToast({ open: true, msg: 'Guardando datos e iniciando subida...', type: 'info' })

    try {
      // 1. Guardar cambios (nombre, cuenta, categorias, tags)
      const savePromises = readyRows.map(row => 
        http.patchData('/batch-imports/items', row.id, {
          title: row.nombre,
          titleEn: row.nombreEn,
          description: row.description,
          descriptionEn: row.descriptionEn,
          targetAccount: row.cuenta,
          categories: row.categorias,
          tags: row.tags
        })
      )
      await Promise.all(savePromises)

      // 2. Confirmar items para pasarlos a QUEUED en el Worker
      const itemIds = readyRows.map(r => r.id)
      const res = await http.postData('/batch-imports/confirm', { itemIds })
      
      if (res.data?.success) {
        const rejected = Array.isArray(res.data?.rejectedOverLimit) ? res.data.rejectedOverLimit.length : 0
        if (rejected > 0) {
          setToast({ open: true, msg: `Se bloquearon ${rejected} assets por límite 19GB. Revisa asignaciones.`, type: 'warning' })
        }
        const renamedCount = Array.isArray(res.data?.renamed) ? res.data.renamed.length : 0
        const renameMsg = renamedCount > 0 ? ` · renombrados por duplicado: ${renamedCount}` : ''
        const confirmedCount = Number(res.data?.confirmed || 0)
        const pendingMsg = pendingRows.length > 0
          ? ` · pendientes por completar: ${pendingRows.length}`
          : ''
        const confirmedMsg = confirmedCount > 0
          ? `¡${confirmedCount} assets enviados a la cola de subida!${renameMsg}${pendingMsg}`
          : 'No se enviaron assets: revisa límites y cuentas asignadas.'
        setToast({ open: true, msg: confirmedMsg, type: confirmedCount > 0 ? 'success' : 'warning' })
        if (confirmedCount > 0) {
          const confirmedIds = Array.isArray(res.data?.confirmedIds)
            ? res.data.confirmedIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
            : []
          setWatchBatchRun({ active: true, trackedIds: confirmedIds, sawInFlight: false })
        }
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

  const tableSummary = useMemo(() => {
    const total = rows.length
    const retryableRows = rows.filter((r) => r.estado === 'borrador' || r.estado === 'error')
    const retryable = retryableRows.length

    const hasCategories = (row) => {
      const arr = Array.isArray(row?.categorias) ? row.categorias : []
      return arr.some((c) => {
        const id = Number(c?.id || 0)
        const key = String(c?.slug || c?.name || '').trim()
        return (Number.isFinite(id) && id > 0) || !!key
      })
    }

    const hasTags = (row) => {
      const arr = Array.isArray(row?.tags) ? row.tags : []
      return arr.some((t) => {
        if (typeof t === 'string') return !!String(t).trim()
        const id = Number(t?.id || 0)
        const key = String(t?.slug || t?.name || t?.es || t?.nameEn || t?.en || '').trim()
        return (Number.isFinite(id) && id > 0) || !!key
      })
    }

    const readyRows = retryableRows.filter((row) => {
      const accountId = Number(row?.cuenta || 0)
      return Number.isFinite(accountId) && accountId > 0 && hasCategories(row) && hasTags(row)
    })

    const ready = readyRows.length
    const missing = Math.max(0, retryable - ready)
    const processing = rows.filter((r) => r.estado === 'procesando').length
    const completed = rows.filter((r) => r.estado === 'completado').length
    const error = rows.filter((r) => r.estado === 'error').length
    const readyPct = retryable > 0 ? Math.round((ready / retryable) * 100) : 0
    const readyGb = readyRows.reduce((acc, r) => acc + Number(r.pesoMB || 0), 0) / 1024

    return {
      total,
      retryable,
      ready,
      missing,
      processing,
      completed,
      error,
      readyPct,
      readyGb,
    }
  }, [rows])



  return (
    <Box 
      sx={{ 
         pb: 10,
         pr: searchSidebarSide === 'right' ? `${RIGHT_SIDEBAR_WIDTH}px` : 0,
         transition: 'padding 180ms ease'
      }}
    >
       {/* PANEL DE CONTROL SUPERIOR */}
       <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
         <input
           ref={scpPickerRef}
           type="file"
           style={{ display: 'none' }}
           onChange={handleScpPick}
         />
         <Box
           onClick={() => scpPickerRef.current?.click()}
           onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setScpDropActive(true) }}
           onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setScpDropActive(false) }}
           onDrop={handleScpDrop}
           sx={{
             minWidth: { xs: '100%', md: 360 },
             maxWidth: 420,
             borderRadius: 2,
             px: 2,
             py: 1.25,
             border: '1px solid',
             borderColor: scpDropActive ? '#38bdf8' : 'rgba(148,163,184,0.7)',
             background: scpDropActive ? 'rgba(56,189,248,0.12)' : 'rgba(15,23,42,0.35)',
             cursor: 'pointer',
             userSelect: 'none',
           }}
         >
           <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 700, lineHeight: 1.2 }}>
             Arrastra para preparar comando de subida
           </Typography>
           <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.78)', display: 'block', mt: 0.45 }}>
             {scpIndexedFile?.name
               ? `${scpIndexedFile.name} · ${formatBytes(scpIndexedFile.size)}`
               : 'Suelta aquí el archivo pesado (o haz clic para elegir)'}
           </Typography>
         </Box>
         <Button 
            variant="outlined" 
            color="primary"
            size="small"
            onClick={handleScanLocal}
            disabled={isScanning || isApplyingAiMetadata || isRetryingAi}
            sx={compactActionBtnSx}
         >
           {isScanning ? 'Escaneando...' : 'Escanear Carpetas'}
         </Button>
         <Button
            variant="outlined"
            size="small"
            startIcon={<AutoFixHighIcon />}
            onClick={handleApplyAiMetadata}
            disabled={isApplyingAiMetadata || isScanning || isRetryingAi}
            sx={{
              ...compactActionBtnSx,
              borderColor: '#5eead4',
              color: '#5eead4',
              '&:hover': { borderColor: '#99f6e4', color: '#99f6e4', background: 'rgba(45,212,191,0.12)' }
            }}
         >
           {isApplyingAiMetadata ? 'Metadatos IA...' : 'Metadatos IA'}
         </Button>
         <Button
            variant="outlined"
            size="small"
            startIcon={<ReplayIcon />}
            onClick={handleRetryFailedAi}
            disabled={isRetryingAi || isScanning || isApplyingAiMetadata || aiRetryCandidateIds.length === 0}
            sx={compactActionBtnSx}
         >
           {isRetryingAi ? 'Reintentando IA...' : `Reintentar IA fallidos (${aiRetryCandidateIds.length})`}
         </Button>
         <Button 
            variant="outlined" 
            size="small"
            startIcon={<AutoAwesomeIcon />} 
            onClick={() => void handleAutoDistribute({ preferredAccountIds: distributionAccountIdsRef.current })}
            sx={{ ...compactActionBtnSx, borderColor: '#b388ff', color: '#b388ff', '&:hover': { borderColor: '#d1c4e9', color: '#d1c4e9' } }}
         >
           Distribuir Automáticamente
         </Button>
         <FormControl
           size="small"
           sx={{
             minWidth: { xs: '100%', md: 330 },
             maxWidth: 460,
           }}
         >
           <InputLabel id="batch-distribution-accounts-label" sx={{ color: 'rgba(226,232,240,0.88)' }}>
             Cuentas para distribución
           </InputLabel>
           <Select
             labelId="batch-distribution-accounts-label"
             multiple
             displayEmpty
             value={distributionAccountIds}
             onChange={handleDistributionAccountsChange}
             onClose={handleDistributionSelectorClose}
             input={<OutlinedInput label="Cuentas para distribución" />}
             renderValue={(selected) => {
               const ids = Array.isArray(selected) ? selected.map(Number) : []
               if (!ids.length) return 'Selecciona cuentas y cierra para redistribuir'
               const labels = cuentas
                 .filter((c) => ids.includes(Number(c.id)))
                 .map((c) => c.alias)
               return labels.join(', ')
             }}
             sx={{
               color: '#f8fbff',
               bgcolor: 'rgba(30,41,59,0.55)',
               borderRadius: 2,
               '& .MuiSelect-icon': { color: '#e2e8f0' },
               '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.45)' },
               '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(191,219,254,0.72)' },
             }}
           >
             {cuentas.map((c) => {
               const freeMb = Math.max(0, Number(c.limitMB || ACCOUNT_LIMIT_MB) - Number(c.usedMB || 0))
               const freeGb = (freeMb / 1024).toFixed(2)
               const checked = distributionAccountIds.includes(Number(c.id))
               return (
                 <MenuItem key={c.id} value={c.id} sx={{ color: '#e2e8f0', bgcolor: '#0f172a' }}>
                   <Checkbox checked={checked} size="small" sx={{ color: '#93c5fd', '&.Mui-checked': { color: '#60a5fa' } }} />
                   <ListItemText
                     primary={c.alias}
                     secondary={`${freeGb} GB libres`}
                     primaryTypographyProps={{ fontWeight: 700, color: '#e2e8f0' }}
                     secondaryTypographyProps={{ color: 'rgba(203,213,225,0.82)' }}
                   />
                 </MenuItem>
               )
             })}
           </Select>
         </FormControl>
        <Button
          variant="outlined"
          color="warning"
          size="small"
          onClick={handleRotateProxyGlobal}
          disabled={!activeUploadingRow}
          sx={compactActionBtnSx}
        >
          Rotar Proxy
        </Button>
         <Button 
            variant="outlined" 
            size="small"
            onClick={async () => {
              if (!confirm('¿Eliminar todos los items COMPLETADOS del batch?')) return
              try {
                const res = await http.deleteRaw('/batch-imports/completed')
                if (res.data?.success) {
                  setToast({ open: true, msg: res.data.message || 'Completados eliminados', type: 'success' })
                  fetchQueue()
                } else {
                  setToast({ open: true, msg: 'Error al eliminar completados', type: 'error' })
                }
              } catch (e) {
                console.error(e)
                setToast({ open: true, msg: 'Error de red al eliminar completados', type: 'error' })
              }
            }}
            sx={{ ...compactActionBtnSx, borderColor: '#f59e0b', color: '#f59e0b', '&:hover': { borderColor: '#fbbf24', color: '#fbbf24', background: 'rgba(245,158,11,0.08)' } }}
         >
           ✅ Eliminar Completados
         </Button>
         <Button 
            variant="outlined" 
            size="small"
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
            sx={{ ...compactActionBtnSx, borderColor: '#ff5252', color: '#ff5252', '&:hover': { borderColor: '#ff8a80', color: '#ff8a80', background: 'rgba(255,82,82,0.08)' } }}
         >
           🗑️ Eliminar Todo
         </Button>
       </Stack>

       {(isApplyingAiMetadata || isRetryingAi) && (
         <Box
           sx={{
             mb: 2,
             p: 2,
             borderRadius: 2,
             border: '1px solid rgba(94,234,212,0.55)',
             background: 'linear-gradient(90deg, rgba(13,148,136,0.26), rgba(20,184,166,0.18))',
             boxShadow: '0 10px 22px rgba(13,148,136,0.25)',
           }}
         >
           <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'flex-start', md: 'center' }}>
             <Typography variant="h5" sx={{ color: '#ccfbf1', fontWeight: 900, lineHeight: 1.15 }}>
               IA en proceso
             </Typography>
             <Typography variant="body1" sx={{ color: 'rgba(236,253,245,0.95)', fontWeight: 600 }}>
               {isRetryingAi
                 ? 'Reintentando sugerencias fallidas. Los campos se actualizarán automáticamente al terminar.'
                 : 'Generando nombres, categorías, tags y descripciones sugeridas para el batch.'}
             </Typography>
           </Stack>
           <LinearProgress
             variant="indeterminate"
             sx={{
               mt: 1.4,
               height: 12,
               borderRadius: 999,
               backgroundColor: 'rgba(255,255,255,0.2)',
               '& .MuiLinearProgress-bar': {
                 background: 'linear-gradient(90deg, #2dd4bf, #5eead4)',
               },
             }}
           />
         </Box>
       )}

       {isScanning && (
         <Box
           sx={{
             mb: 2,
             px: 1.25,
             py: 1.1,
             borderRadius: 2,
             border: '1px solid rgba(59,130,246,0.45)',
             background: 'linear-gradient(90deg, rgba(29,78,216,0.2), rgba(37,99,235,0.14))',
             boxShadow: '0 10px 20px rgba(29,78,216,0.18)',
           }}
         >
           <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'flex-start', md: 'center' }}>
             <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
               <CircularProgress size={18} thickness={5} />
               <Box sx={{ minWidth: 0 }}>
                 <Typography variant="body2" sx={{ color: '#dbeafe', fontWeight: 800 }}>
                   Escaneo en vivo · {scanStatusUi.phaseLabel}
                 </Typography>
                 <Typography variant="caption" sx={{ color: 'rgba(219,234,254,0.92)', display: 'block' }}>
                   {scanStatusUi.message || 'Procesando escaneo de carpetas...'}
                 </Typography>
               </Box>
             </Stack>
             <Typography variant="caption" sx={{ color: '#bfdbfe', fontWeight: 700, whiteSpace: 'nowrap' }}>
               Paso {scanStatusUi.current}/{scanStatusUi.total || 0} · {scanStatusUi.percent}%
             </Typography>
           </Stack>

           <LinearProgress
             variant="determinate"
             value={scanStatusUi.percent}
             sx={{
               mt: 1,
               height: 9,
               borderRadius: 999,
               backgroundColor: 'rgba(30,41,59,0.5)',
               '& .MuiLinearProgress-bar': {
                 background: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
               },
             }}
           />

           <Typography variant="caption" sx={{ color: 'rgba(191,219,254,0.95)', mt: 0.75, display: 'block' }}>
             Comprimidos: {scanStatusUi.archivesDone}/{scanStatusUi.archivesTotal} · Lotes: {scanStatusUi.foldersDone}/{scanStatusUi.foldersTotal} · Items: {scanStatusUi.itemsDone}/{scanStatusUi.itemsTotal}
           </Typography>
           <Typography
             variant="caption"
             sx={{
               color: scanStatusUi.isStale ? '#facc15' : 'rgba(191,219,254,0.9)',
               mt: 0.35,
               display: 'block',
               fontWeight: scanStatusUi.isStale ? 700 : 500,
             }}
           >
             Última señal: {Number.isFinite(scanStatusUi.updatedAgoSec) ? `${scanStatusUi.updatedAgoSec}s` : '--'}
             {scanStatusUi.isStale ? ' · posible espera larga, revisa consola para detalle.' : ''}
           </Typography>
         </Box>
       )}

       <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
         <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(125,211,252,0.35)' }}>
           <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
             <Typography variant="body2" sx={{ fontWeight: 700, color: '#e0f2fe' }}>Progreso Main</Typography>
             <Typography variant="caption" sx={{ color: '#bae6fd' }}>{mainProgressStats.pct}%</Typography>
           </Stack>
           <LinearProgress
             variant="determinate"
             value={mainProgressStats.pct}
             sx={{
               height: 10,
               borderRadius: 999,
               backgroundColor: 'rgba(30,41,59,0.6)',
               '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #38bdf8, #0ea5e9)' },
             }}
           />
           <Typography variant="caption" sx={{ color: 'rgba(224,242,254,0.85)', mt: 0.75, display: 'block' }}>
             OK: {mainProgressStats.ok}/{mainProgressStats.total} · Subiendo: {mainProgressStats.uploading} · Error: {mainProgressStats.error}
           </Typography>
         </Box>

         <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(216,180,254,0.35)' }}>
           <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
             <Typography variant="body2" sx={{ fontWeight: 700, color: '#f5d0fe' }}>Progreso Backup</Typography>
             <Typography variant="caption" sx={{ color: '#e9d5ff' }}>{backupProgressStats.pct}%</Typography>
           </Stack>
           <LinearProgress
             variant="determinate"
             value={backupProgressStats.pct}
             sx={{
               height: 10,
               borderRadius: 999,
               backgroundColor: 'rgba(30,41,59,0.6)',
               '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #c084fc, #a855f7)' },
             }}
           />
           <Typography variant="caption" sx={{ color: 'rgba(245,208,254,0.88)', mt: 0.75, display: 'block' }}>
             OK: {backupProgressStats.ok}/{backupProgressStats.total} · Subiendo: {backupProgressStats.uploading} · Error: {backupProgressStats.error}
           </Typography>
         </Box>
       </Box>

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

         const LIMIT_MB = ACCOUNT_LIMIT_MB // 19GB

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

      <Box
        sx={{
          mb: 2,
          p: 1.4,
          borderRadius: 2,
          border: '1px solid rgba(148,163,184,0.35)',
          background: 'linear-gradient(180deg, rgba(15,23,42,0.65), rgba(15,23,42,0.45))',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 700 }}>
            Resumen de Tabla: {tableSummary.total} archivos
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(226,232,240,0.8)' }}>
            Listos para subir: {tableSummary.ready}/{tableSummary.retryable} · {tableSummary.readyGb.toFixed(2)} GB
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={Math.max(0, Math.min(100, Number(tableSummary.readyPct || 0)))}
          sx={{
            mt: 1,
            mb: 1,
            height: 8,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.12)',
            '& .MuiLinearProgress-bar': {
              background: tableSummary.readyPct >= 100
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
            },
          }}
        />

        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
          <Chip size="small" label={`Total: ${tableSummary.total}`} sx={{ bgcolor: 'rgba(148,163,184,0.2)', color: '#e2e8f0' }} />
          <Chip size="small" label={`Listos: ${tableSummary.ready}`} sx={{ bgcolor: 'rgba(34,197,94,0.2)', color: '#bbf7d0' }} />
          <Chip size="small" label={`Pendientes: ${tableSummary.missing}`} sx={{ bgcolor: 'rgba(245,158,11,0.2)', color: '#fde68a' }} />
          <Chip size="small" label={`En proceso: ${tableSummary.processing}`} sx={{ bgcolor: 'rgba(56,189,248,0.2)', color: '#bae6fd' }} />
          <Chip size="small" label={`Completados: ${tableSummary.completed}`} sx={{ bgcolor: 'rgba(16,185,129,0.2)', color: '#a7f3d0' }} />
          <Chip size="small" label={`Error: ${tableSummary.error}`} sx={{ bgcolor: 'rgba(239,68,68,0.2)', color: '#fecaca' }} />
        </Stack>
      </Box>

      <TableContainer
        component={Paper}
        elevation={0}
        variant="outlined"
        sx={{
          borderRadius: 2,
          background: 'linear-gradient(180deg, rgba(15,23,42,0.82), rgba(17,24,39,0.78))',
          borderColor: 'rgba(148,163,184,0.32)',
          boxShadow: '0 10px 24px rgba(2,6,23,0.35)',
          '& .MuiTableCell-root': {
            color: '#edf3ff',
            borderBottom: '1px solid rgba(148,163,184,0.24)',
          },
        }}
      >
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Acciones</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Asset (ES / EN)</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Categorías</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Tags (IA)</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Descripción (ES / EN)</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Perfil Rápido</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Cuenta MEGA Asignada</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Main</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Backup</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: '#f8fbff', borderBottom: '1px solid rgba(191,219,254,0.45)' }}>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    <Typography variant="h6" sx={{ color: 'rgba(226,232,240,0.95)', fontWeight: 600 }}>No hay assets en /uploads/batch_imports/</Typography>
                 </TableCell>
              </TableRow>
            )}
            {rows.map((row, idx) => (
              <BatchRow
                key={row.id || idx}
                row={row}
                idx={idx}
                isSimilarityFocused={Number(row?.id || 0) > 0 && Number(row?.id || 0) === Number(similaritySelectedId || 0)}
                categoriesCatalog={categoriesCatalog}
                tagsCatalog={tagsCatalog}
                cuentas={cuentas}
                onNombreChange={handleNombreChange}
                onNombreEnChange={handleNombreEnChange}
                onDescriptionChange={handleDescriptionChange}
                onDescriptionEnChange={handleDescriptionEnChange}
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
            Arrastraste: <strong>{scpIndexedFile?.name || '—'}</strong>. El comando se genera desde backend sin bloqueo por PIN.
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', display: 'block', mb: 1.3 }}>
            Tamaño indexado: {formatBytes(scpIndexedFile?.size || 0)}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={fetchBatchScpCommand}
              disabled={scpCommandLoading}
              sx={{ minWidth: 170, textTransform: 'none', fontWeight: 700 }}
            >
              {scpCommandLoading ? 'Generando…' : 'Regenerar comandos'}
            </Button>
          </Stack>

          {scpCommandError ? (
            <Alert severity="error" sx={{ mb: 2 }}>{scpCommandError}</Alert>
          ) : null}

          {!scpCommandData?.commands ? null : (
          <Box sx={{ p: 2, borderRadius: 2, background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace', fontSize: 13, border: '1px solid rgba(255,255,255,0.1)' }}>
            {scpCommandData.commands.rsyncWslFileCmd || scpCommandData.commands.rsyncWslFolderCmd ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#93c5fd' }}>Comando WSL rsync (recomendado para masivo):</div>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', mt: 0.6 }}>
                  Ejecuta en Linux/WSL. Lee archivos en Windows desde /mnt/c/stl-hub/super-batch y reanuda cortes.
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, mb: 1.2, p: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
                    {scpCommandData.commands.rsyncWslFileCmd || scpCommandData.commands.rsyncWslFolderCmd}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(scpCommandData.commands.rsyncWslFileCmd || scpCommandData.commands.rsyncWslFolderCmd)}>Copiar</Button>
                </Stack>
              </>
            ) : null}

            {scpCommandData.commands.winscpKeepupCmd ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#ffd54f' }}>Comando recomendado (reanuda si se corta):</div>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', mt: 0.6 }}>
                  Ideal para archivos muy grandes. Mantiene estado local y reintenta sin perder el avance completado.
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, mb: 1.8, p: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
                    {scpCommandData.commands.winscpKeepupCmd}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(scpCommandData.commands.winscpKeepupCmd)}>Copiar</Button>
                </Stack>
              </>
            ) : null}

            <div style={{ fontWeight: 700, fontSize: 15, color: '#69f0ae' }}>Comando SCP Directo:</div>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1, mb: 1.5, p: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
                {scpCommandData.commands.singleFileCmd || scpCommandData.commands.folderContentCmd}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(scpCommandData.commands.singleFileCmd || scpCommandData.commands.folderContentCmd)}>Copiar</Button>
            </Stack>

            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', mb: 1 }}>
              Crear carpeta remota (solo si hace falta):
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
                {scpCommandData.commands.mkdirCmd}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(scpCommandData.commands.mkdirCmd)}>Copiar</Button>
            </Stack>

            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 1.25 }}>
              Ruta destino fija: {scpCommandData.commands.remoteBatchImportsDir}
            </Typography>
          </Box>
          )}

          {scpIndexedFile?.name ? (
            <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(56,189,248,0.35)' }}>
              <Typography variant="body2" sx={{ color: '#e0f2fe', fontWeight: 700, mb: 0.8 }}>
                Progreso de subida detectado en VPS
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, Number(scpUploadProbe.percent || 0)))}
                sx={{
                  height: 12,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  '& .MuiLinearProgress-bar': {
                    background: scpUploadProbe.percent >= 100
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: 'rgba(224,242,254,0.92)', display: 'block', mt: 0.65 }}>
                {Math.max(0, Math.min(100, Number(scpUploadProbe.percent || 0))).toFixed(0)}% · {formatBytes(scpUploadProbe.sizeB)} / {formatBytes(scpIndexedFile?.size || 0)}
                {scpUploadProbe.speedMBs > 0 ? ` · ${scpUploadProbe.speedMBs.toFixed(2)} MB/s` : ''}
              </Typography>
              {!scpUploadProbe.exists ? (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.68)', display: 'block', mt: 0.4 }}>
                  Esperando que inicie la transferencia SCP...
                </Typography>
              ) : null}
              {scpUploadProbe.done ? (
                <Typography variant="caption" sx={{ color: '#86efac', display: 'block', mt: 0.4, fontWeight: 700 }}>
                  Archivo recibido completo en el VPS.
                </Typography>
              ) : null}
              {scpUploadProbe.error ? (
                <Typography variant="caption" sx={{ color: '#fecaca', display: 'block', mt: 0.4 }}>
                  {scpUploadProbe.error}
                </Typography>
              ) : null}
            </Box>
          ) : null}
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

            {(sidebarQueueItem?.imagenes || []).length > 0 && (
              <Box sx={{ mt: 0.9 }}>
                <Typography variant="caption" sx={{ opacity: 0.82, display: 'block', mb: 0.55 }}>
                  Imágenes del ítem actual
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.25 }}>
                  {(sidebarQueueItem?.imagenes || []).map((src, i) => {
                    const safeSrc = makeUploadsUrl(src)
                    if (!safeSrc) return null
                    return (
                      <img
                        key={`current-${i}`}
                        src={safeSrc}
                        alt={`current-${i}`}
                        style={{
                          width: SIMILARITY_CURRENT_IMAGE_SIZE,
                          height: SIMILARITY_CURRENT_IMAGE_SIZE,
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '1px solid rgba(173, 175, 184, 0.45)',
                          cursor: 'pointer',
                          background: 'rgba(255,255,255,0.06)'
                        }}
                        onClick={() => setPreviewImage(safeSrc)}
                      />
                    )
                  })}
                </Box>
              </Box>
            )}

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
                             <img
                               key={i}
                               src={safeSrc}
                               style={{
                                 width: SIMILARITY_MATCH_IMAGE_SIZE,
                                 height: SIMILARITY_MATCH_IMAGE_SIZE,
                                 objectFit: 'cover',
                                 borderRadius: 6,
                                 border: '1px solid rgba(148,163,184,0.45)',
                                 cursor: 'pointer'
                               }}
                               onClick={() => setPreviewImage(safeSrc)}
                             />
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

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 1.5 }}
      >
        <Alert severity={toast.type} variant="filled" sx={{ width: '100%', borderRadius: 2, fontWeight: 'bold' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
