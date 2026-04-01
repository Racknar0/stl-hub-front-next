// ╔══════════════════════════════════════════════════════════════════════╗
// ║ BatchTable.jsx — ORQUESTADOR                                       ║
// ║ Estado central, hooks, callbacks y composición de sub-componentes  ║
// ╚══════════════════════════════════════════════════════════════════════╝
'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Box, Dialog, Snackbar, Alert } from '@mui/material'
import HttpService from '@/services/HttpService'
import { successAlert } from '@/helpers/alerts'

// ─── Componentes propios ───
import MetaCreateDialog from './MetaCreateDialog'
import ProfilesModal from './ProfilesModal'
import BatchControlPanel from './components/BatchControlPanel'
import BatchProgressBars from './components/BatchProgressBars'
import BatchStorageBars from './components/BatchStorageBars'
import BatchSummaryBar from './components/BatchSummaryBar'
import BatchDataTable from './components/BatchDataTable'
import BatchFooter from './components/BatchFooter'
import ScpUploadDialog from './components/ScpUploadDialog'
import SimilaritySidebar from './components/SimilaritySidebar'

// ─── Constantes ───
import {
  MAX_SIMILARITY_HASH_IMAGES, UI_ACCOUNT_LIMIT_MB, BACKEND_SAFETY_LIMIT_MB,
  DISTRIBUTION_HEADROOM_MB, AUTO_DISTRIBUTION_LIMIT_MB, MIN_SELECTOR_FREE_MB,
  REVIEW_ROW_HEIGHT, REVIEW_VIEWPORT_HEIGHT, RIGHT_SIDEBAR_WIDTH,
} from './constants'


export default function BatchTable() {
  const [rows, setRows] = useState([])
  const [cuentas, setCuentas] = useState([]) // Fetch MEGA accounts logic needed
  const [isRefreshingAccounts, setIsRefreshingAccounts] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState(null)
  const [isApplyingAiMetadata, setIsApplyingAiMetadata] = useState(false)
  const [isRetryingAi, setIsRetryingAi] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isStoppingAll, setIsStoppingAll] = useState(false)
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
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewScrollTop, setReviewScrollTop] = useState(0)
  const reviewScrollRef = React.useRef(null)

  // SIMILARS SIDEBAR STATES
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

  const reviewRows = useMemo(() => {
    return rows.filter((r) => {
      const st = String(r?.estado || '').toLowerCase()
      return st === 'borrador' || st === 'error'
    })
  }, [rows])

  const visibleRows = useMemo(() => {
    const base = reviewMode ? reviewRows : rows
    // Sort active items (uploading/processing) to the top
    return [...base].sort((a, b) => {
      const priority = (r) => {
        const st = String(r?.estado || '').toLowerCase()
        const main = String(r?.mainStatus || '').toUpperCase()
        const backup = String(r?.backupStatus || '').toUpperCase()
        // Currently uploading or processing → top
        if (st === 'procesando' || main === 'UPLOADING' || backup === 'UPLOADING') return 0
        // Error → second
        if (st === 'error') return 1
        // Draft/pending → third
        if (st === 'borrador') return 2
        // Completed → bottom
        return 3
      }
      return priority(a) - priority(b)
    })
  }, [reviewMode, reviewRows, rows])

  const rowIndexById = useMemo(() => {
    const m = new Map()
    rows.forEach((r, i) => m.set(Number(r?.id || 0), i))
    return m
  }, [rows])

  const visibleEntries = useMemo(() => {
    return visibleRows
      .map((row, visibleIndex) => ({ row, visibleIndex, rowIndex: Number(rowIndexById.get(Number(row?.id || 0))) }))
      .filter((entry) => Number.isFinite(entry.rowIndex) && entry.rowIndex >= 0)
  }, [visibleRows, rowIndexById])

  const virtualizer = useVirtualizer({
    count: visibleEntries.length,
    getScrollElement: () => reviewScrollRef.current,
    estimateSize: () => reviewMode ? REVIEW_ROW_HEIGHT : 110,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  const visibleColumnCount = reviewMode ? 2 : 8

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

  const scrollReviewToVisible = useCallback((index) => {
    if (!reviewMode) return
    const el = reviewScrollRef.current
    if (!el) return

    const safeIndex = Math.max(0, Number(index || 0))
    const rowSelector = `tr[data-index="${safeIndex}"]`

    const ensureVisible = () => {
      const rowEl = el.querySelector(rowSelector)
      if (rowEl?.scrollIntoView) {
        rowEl.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        return
      }

      const rowTop = Math.max(0, safeIndex * REVIEW_ROW_HEIGHT)
      const rowBottom = rowTop + REVIEW_ROW_HEIGHT
      const viewTop = Number(el.scrollTop || 0)
      const viewBottom = viewTop + Number(el.clientHeight || REVIEW_VIEWPORT_HEIGHT)

      if (rowTop < viewTop) {
        el.scrollTop = Math.max(0, rowTop)
      } else if (rowBottom > viewBottom) {
        el.scrollTop = Math.max(0, rowBottom - Number(el.clientHeight || REVIEW_VIEWPORT_HEIGHT))
      }
    }

    ensureVisible()
    requestAnimationFrame(ensureVisible)
  }, [reviewMode])

  const openSimilarAtVisibleIndex = useCallback((index) => {
    const total = visibleEntries.length
    if (!total) return
    const safeIndex = Math.max(0, Math.min(total - 1, Number(index || 0)))
    const target = visibleEntries[safeIndex]?.row
    if (!target) return
    setSimilaritySelectedId(target.id)
    void startSimilarityCheck(target)
    scrollReviewToVisible(safeIndex)
  }, [visibleEntries, startSimilarityCheck, scrollReviewToVisible])

  const moveReviewFocus = useCallback((delta) => {
    if (!reviewMode) return
    const ids = visibleEntries.map((entry) => Number(entry?.row?.id || 0)).filter((n) => Number.isFinite(n) && n > 0)
    if (!ids.length) return

    const currentIdx = ids.findIndex((id) => id === Number(similaritySelectedId || 0))
    let nextIdx = 0
    if (currentIdx >= 0) {
      nextIdx = Math.max(0, Math.min(ids.length - 1, currentIdx + Number(delta || 0)))
      if (nextIdx === currentIdx) return
    } else {
      nextIdx = Number(delta || 0) < 0 ? ids.length - 1 : 0
    }

    openSimilarAtVisibleIndex(nextIdx)
  }, [reviewMode, visibleEntries, similaritySelectedId, openSimilarAtVisibleIndex])

  useEffect(() => {
    if (!reviewMode) return
    if (!similaritySelectedId) return
    const exists = visibleEntries.some((entry) => Number(entry?.row?.id || 0) === Number(similaritySelectedId || 0))
    if (!exists) setSimilaritySelectedId(null)
  }, [reviewMode, similaritySelectedId, visibleEntries])

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
          limitMB: c.storageTotalMB > 0 ? Math.min(UI_ACCOUNT_LIMIT_MB, Number(c.storageTotalMB)) : UI_ACCOUNT_LIMIT_MB,
          usedMB: Number(c.storageUsedMB || 0),
          totalMB: Number(c.storageTotalMB || 0),
        }))
        .filter(c => Number(c.id) > 0 && Number(c.usedMB || 0) < Number(c.limitMB || UI_ACCOUNT_LIMIT_MB))

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

  const handleSetPrimaryImage = useCallback((rowIdx, imageIdx) => {
    const targetRowIdx = Number(rowIdx)
    const targetImageIdx = Number(imageIdx)
    if (!Number.isInteger(targetRowIdx) || !Number.isInteger(targetImageIdx)) return

    setRows((prev) => {
      if (!Array.isArray(prev) || targetRowIdx < 0 || targetRowIdx >= prev.length) return prev
      const row = prev[targetRowIdx]
      const images = Array.isArray(row?.imagenes) ? row.imagenes : []
      if (!images.length || targetImageIdx < 0 || targetImageIdx >= images.length || targetImageIdx === 0) return prev

      const nextImages = [...images]
      const [selected] = nextImages.splice(targetImageIdx, 1)
      nextImages.unshift(selected)

      const nextRows = [...prev]
      nextRows[targetRowIdx] = {
        ...row,
        imagenes: nextImages,
      }
      return nextRows
    })
  }, [])

  const handleRemoverFila = async (idx, options = {}) => {
    const nextFocusId = Number(options?.nextFocusId || 0)
    const row = rows[idx]
    if (!row || !row.id) return

    try {
      const res = await http.deleteData('/batch-imports/items', row.id)
      if (res.data?.success) {
        setToast({ open: true, msg: 'Asset eliminado correctamente', type: 'success' })
        const updated = [...rows]
        updated.splice(idx, 1)
        setRows(updated)
        if (Number(similaritySelectedId || 0) === Number(row.id || 0)) {
          if (nextFocusId > 0) {
            setSimilaritySelectedId(nextFocusId)
            const nextRow = updated.find((r) => Number(r?.id || 0) === nextFocusId)
            if (nextRow) void startSimilarityCheck(nextRow)
          } else {
            setSimilaritySelectedId(null)
          }
        }
      } else {
        setToast({ open: true, msg: `Error: ${res.data?.message || 'No se pudo eliminar'}`, type: 'error' })
      }
    } catch (e) {
      console.error(e)
      setToast({ open: true, msg: 'Error de red al eliminar el asset', type: 'error' })
    }
  }

  const deleteFocusedReviewItem = useCallback(async () => {
    if (!reviewMode) return
    const ids = visibleEntries.map((entry) => Number(entry?.row?.id || 0)).filter((n) => Number.isFinite(n) && n > 0)
    if (!ids.length) return
    const currentIdx = ids.findIndex((id) => id === Number(similaritySelectedId || 0))
    if (currentIdx < 0) return
    const targetEntry = visibleEntries[currentIdx]
    if (!targetEntry || targetEntry.rowIndex < 0) return

    const nextFocusId = ids[currentIdx + 1] || ids[currentIdx - 1] || null
    await handleRemoverFila(targetEntry.rowIndex, { nextFocusId })
  }, [reviewMode, visibleEntries, similaritySelectedId])

  useEffect(() => {
    if (!reviewMode) return

    const onKeyDown = (ev) => {
      const tag = String(ev?.target?.tagName || '').toLowerCase()
      const isEditable = Boolean(ev?.target?.isContentEditable) || ['input', 'textarea', 'select'].includes(tag)
      if (isEditable) return

      const key = String(ev?.key || '').toLowerCase()
      if (key === 'd') {
        ev.preventDefault()
        moveReviewFocus(1)
      } else if (key === 'a') {
        ev.preventDefault()
        moveReviewFocus(-1)
      } else if (key === 'f') {
        ev.preventDefault()
        void deleteFocusedReviewItem()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [reviewMode, moveReviewFocus, deleteFocusedReviewItem])

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

  const rowsPendingDistribution = useMemo(() => {
    return rows.filter((r) => {
      const st = String(r?.estado || '').toLowerCase()
      return st !== 'completado' && st !== 'procesando'
    })
  }, [rows])

  const minPendingAssetMb = useMemo(() => {
    const sizes = rowsPendingDistribution
      .map((r) => Math.max(0, Number(r?.pesoMB || 0)))
      .filter((n) => n > 0)
    if (!sizes.length) return 0
    return Math.min(...sizes)
  }, [rowsPendingDistribution])

  const accountSelectionMeta = useMemo(() => {
    const selectedSet = new Set(
      (Array.isArray(distributionAccountIds) ? distributionAccountIds : [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    )

    const minRequiredFreeMb = Math.max(0, Math.max(Number(minPendingAssetMb || 0), MIN_SELECTOR_FREE_MB))

    const enriched = (Array.isArray(cuentas) ? cuentas : []).map((c) => {
      const limitMb = Number(c?.limitMB || BACKEND_SAFETY_LIMIT_MB)
      const usedMb = Math.max(0, Number(c?.usedMB || 0))
      const freeMb = Math.max(0, limitMb - usedMb)
      const effectiveLimitMb = Math.max(0, limitMb - DISTRIBUTION_HEADROOM_MB)
      const effectiveFreeMb = Math.max(0, effectiveLimitMb - usedMb)
      const checked = selectedSet.has(Number(c?.id || 0))
      const canFitMinPending = effectiveFreeMb >= minRequiredFreeMb
      return {
        ...c,
        limitMb,
        usedMb,
        freeMb,
        effectiveLimitMb,
        effectiveFreeMb,
        checked,
        canFitMinPending,
      }
    })

    const selectable = enriched.filter((c) => c.canFitMinPending || c.checked)
    const selectableIdSet = new Set(selectable.map((c) => Number(c.id)))
    const blockedCount = Math.max(0, enriched.length - selectable.length)

    return {
      selectable,
      selectableIdSet,
      blockedCount,
      minRequiredFreeMb,
    }
  }, [cuentas, distributionAccountIds, minPendingAssetMb])

  // --- LOGICA DE AUTO DISTRIBUCION ---
  const handleAutoDistribute = async ({ preferredAccountIds = [] } = {}) => {
    const LIMIT_MB = Math.max(0, AUTO_DISTRIBUTION_LIMIT_MB - DISTRIBUTION_HEADROOM_MB)
    const LIMIT_GB = LIMIT_MB / 1024

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

    const pendingRows = rows.filter((r) => {
      const st = String(r?.estado || '').toLowerCase()
      return st !== 'completado' && st !== 'procesando'
    })

    if (!pendingRows.length) {
      setToast({ open: true, msg: 'No hay items en borrador/error para redistribuir.', type: 'info' })
      return
    }

    const minPendingMb = pendingRows
      .map((r) => Math.max(0, Number(r?.pesoMB || 0)))
      .filter((n) => n > 0)
      .reduce((min, n) => Math.min(min, n), Number.POSITIVE_INFINITY)
    const minRequiredFreeMb = Math.max(
      MIN_SELECTOR_FREE_MB,
      Number.isFinite(minPendingMb) ? Math.max(0, Number(minPendingMb || 0)) : 0
    )

    let accountsStatus = freshAccounts
      .map(c => ({
        ...c,
        simulatedUsedMB: Math.max(0, Number(c?.usedMB || 0)),
      }))
      .filter((a) => Number(a.simulatedUsedMB || 0) < LIMIT_MB)

    accountsStatus = accountsStatus.filter((a) => {
      const freeMb = Math.max(0, LIMIT_MB - Number(a.simulatedUsedMB || 0))
      return freeMb >= minRequiredFreeMb
    })

    if (preferredSet.size > 0) {
      accountsStatus = accountsStatus.filter((a) => preferredSet.has(Number(a.id)))
    }

    if (accountsStatus.length === 0) {
      setToast({
        open: true,
        msg: preferredSet.size > 0
          ? `Las cuentas seleccionadas no cumplen el mínimo libre (${(minRequiredFreeMb / 1024).toFixed(2)} GB).`
          : `No hay cuentas con espacio suficiente. Mínimo requerido: ${(minRequiredFreeMb / 1024).toFixed(2)} GB libres.`,
        type: 'warning',
      })
      return
    }

    accountsStatus = accountsStatus.sort((a, b) => a.simulatedUsedMB - b.simulatedUsedMB)

    const updatedRows = [...rows]
    const candidatesBySize = updatedRows
      .map((row, index) => ({ row, index, pesoMb: Math.max(0, Number(row?.pesoMB || 0)) }))
      .filter(({ row }) => {
        const st = String(row?.estado || '').toLowerCase()
        return st !== 'completado' && st !== 'procesando'
      })
      .sort((a, b) => b.pesoMb - a.pesoMb)

    let unassignedCount = 0

    for (const { index, pesoMb } of candidatesBySize) {
      const row = updatedRows[index]
      const fitCandidates = accountsStatus
        .filter((a) => (Number(a.simulatedUsedMB || 0) + pesoMb) <= LIMIT_MB)
        .sort((a, b) => {
          const remA = LIMIT_MB - (Number(a.simulatedUsedMB || 0) + pesoMb)
          const remB = LIMIT_MB - (Number(b.simulatedUsedMB || 0) + pesoMb)
          return remA - remB
        })

      const bestAccount = fitCandidates[0]

      if (bestAccount) {
        row.cuenta = bestAccount.id
        bestAccount.simulatedUsedMB = Number(bestAccount.simulatedUsedMB || 0) + pesoMb
      } else {
        row.cuenta = ''
        unassignedCount++
      }
    }

    setRows(updatedRows)
    
    if (unassignedCount > 0) {
       setToast({ open: true, msg: `Alerta: ${unassignedCount} assets no caben en las cuentas disponibles (tope auto-distribución ${(AUTO_DISTRIBUTION_LIMIT_MB / 1024).toFixed(2)}GB, margen ${(DISTRIBUTION_HEADROOM_MB / 1024).toFixed(2)}GB, operativo ${LIMIT_GB.toFixed(2)}GB).`, type: 'warning' })
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
        .filter((n) => Number.isFinite(n) && n > 0 && accountSelectionMeta.selectableIdSet.has(n))
    ))
    distributionSelectionDirtyRef.current = true
    distributionAccountIdsRef.current = normalized
    setDistributionAccountIds(normalized)
  }

  useEffect(() => {
    const allowed = accountSelectionMeta.selectableIdSet
    setDistributionAccountIds((prev) => {
      const pruned = (Array.isArray(prev) ? prev : [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0 && allowed.has(n))
      
      // ROMPEMOS EL BUCLE INFINITO DE REACT
      if (pruned.length === prev.length && pruned.every((val, i) => val === prev[i])) {
        return prev
      }

      distributionAccountIdsRef.current = pruned
      return pruned
    })
  }, [accountSelectionMeta.selectableIdSet])

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

  const handleDistributionSelectorOpen = () => {
    void refreshBatchAccounts({ silent: true })
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
      if (projectedMb > BACKEND_SAFETY_LIMIT_MB) {
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
      const readyRowsSorted = [...readyRows].sort((a, b) => {
        const accA = Number(a?.cuenta || 0)
        const accB = Number(b?.cuenta || 0)
        if (accA !== accB) return accA - accB
        return Number(a?.id || 0) - Number(b?.id || 0)
      })

      const savePromises = readyRowsSorted.map(row => 
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
      const itemIds = readyRowsSorted.map(r => r.id)
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

  const handleStopAndResetToDraft = async () => {
    const hasResettable = rows.some((r) => String(r?.estado || '').toLowerCase() !== 'borrador')
    if (!hasResettable) {
      setToast({ open: true, msg: 'No hay items activos para reiniciar.', type: 'info' })
      return
    }

    if (!confirm('¿Detener todo y pasar la cola a borrador? Si MAIN ya se subió, backup quedará en error para identificar.')) return

    setIsStoppingAll(true)
    setWatchBatchRun({ active: false, trackedIds: [], sawInFlight: false })

    try {
      const res = await http.postData('/batch-imports/stop-and-draft', {})
      if (res?.data?.success) {
        setToast({ open: true, msg: res.data.message || 'Cola reiniciada a borrador.', type: 'success' })
        await fetchQueue({ forceBackendDraft: true })
      } else {
        setToast({ open: true, msg: res?.data?.message || 'No se pudo detener/reiniciar la cola.', type: 'error' })
      }
    } catch (e) {
      console.error(e)
      setToast({ open: true, msg: 'Error de red al detener/reiniciar la cola.', type: 'error' })
    } finally {
      setIsStoppingAll(false)
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

  const distributionSelectionSummary = useMemo(() => {
    const selectedIds = Array.from(new Set(
      (Array.isArray(distributionAccountIds) ? distributionAccountIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    ))

    if (!selectedIds.length) return null

    const selectedSet = new Set(selectedIds)
    const candidateRows = rows.filter((row) => {
      const st = String(row?.estado || '').toLowerCase()
      return st === 'borrador' || st === 'error'
    })

    const totalAssets = candidateRows.length
    const totalMb = candidateRows.reduce((acc, row) => acc + Math.max(0, Number(row?.pesoMB || 0)), 0)

    const assignedRows = candidateRows.filter((row) => selectedSet.has(Number(row?.cuenta || 0)))
    const assignedAssets = assignedRows.length
    const assignedMb = assignedRows.reduce((acc, row) => acc + Math.max(0, Number(row?.pesoMB || 0)), 0)

    const pendingAssets = Math.max(0, totalAssets - assignedAssets)
    const pendingMb = Math.max(0, totalMb - assignedMb)
    const pct = totalAssets > 0 ? Math.round((assignedAssets / totalAssets) * 100) : 0

    return {
      selectedCount: selectedIds.length,
      totalAssets,
      assignedAssets,
      pendingAssets,
      totalGb: totalMb / 1024,
      assignedGb: assignedMb / 1024,
      pendingGb: pendingMb / 1024,
      pct,
    }
  }, [rows, distributionAccountIds])



  return (
    <Box
      sx={{
        pb: 10,
        pr: searchSidebarSide === 'right' ? `${RIGHT_SIDEBAR_WIDTH}px` : 0,
        transition: 'padding 180ms ease'
      }}
    >
      {/* ═══════════ PANEL DE CONTROL SUPERIOR ═══════════ */}
      <BatchControlPanel
        scpPickerRef={scpPickerRef}
        scpDropActive={scpDropActive}
        scpIndexedFile={scpIndexedFile}
        formatBytes={formatBytes}
        handleScpPick={handleScpPick}
        handleScpDrop={handleScpDrop}
        setScpDropActive={setScpDropActive}
        isScanning={isScanning}
        isApplyingAiMetadata={isApplyingAiMetadata}
        isRetryingAi={isRetryingAi}
        isProcessing={isProcessing}
        isStoppingAll={isStoppingAll}
        aiRetryCandidateIds={aiRetryCandidateIds}
        handleScanLocal={handleScanLocal}
        handleApplyAiMetadata={handleApplyAiMetadata}
        handleRetryFailedAi={handleRetryFailedAi}
        handleAutoDistribute={handleAutoDistribute}
        distributionAccountIdsRef={distributionAccountIdsRef}
        distributionAccountIds={distributionAccountIds}
        handleDistributionAccountsChange={handleDistributionAccountsChange}
        handleDistributionSelectorClose={handleDistributionSelectorClose}
        handleDistributionSelectorOpen={handleDistributionSelectorOpen}
        accountSelectionMeta={accountSelectionMeta}
        minPendingAssetMb={minPendingAssetMb}
        cuentas={cuentas}
        activeUploadingRow={activeUploadingRow}
        handleRotateProxyGlobal={handleRotateProxyGlobal}
        rows={rows}
        handleStopAndResetToDraft={handleStopAndResetToDraft}
        reviewMode={reviewMode}
        setReviewMode={setReviewMode}
        http={http}
        setToast={setToast}
        setRows={setRows}
        fetchQueue={fetchQueue}
        compactActionBtnSx={compactActionBtnSx}
      />

      {/* ═══════════ BARRAS DE PROGRESO (IA, Escaneo, Main/Backup) ═══════════ */}
      <BatchProgressBars
        isApplyingAiMetadata={isApplyingAiMetadata}
        isRetryingAi={isRetryingAi}
        isScanning={isScanning}
        scanStatusUi={scanStatusUi}
        mainProgressStats={mainProgressStats}
        backupProgressStats={backupProgressStats}
        distributionSelectionSummary={distributionSelectionSummary}
      />

      {/* ═══════════ BARRAS DE ALMACENAMIENTO POR CUENTA ═══════════ */}
      <BatchStorageBars rows={rows} cuentas={cuentas} />

      {/* ═══════════ RESUMEN DE TABLA ═══════════ */}
      <BatchSummaryBar tableSummary={tableSummary} />

      {/* ═══════════ TABLA DE DATOS VIRTUALIZADA ═══════════ */}
      <BatchDataTable
        reviewScrollRef={reviewScrollRef}
        reviewMode={reviewMode}
        virtualizer={virtualizer}
        virtualItems={virtualItems}
        visibleEntries={visibleEntries}
        visibleColumnCount={visibleColumnCount}
        categoriesCatalog={categoriesCatalog}
        tagsCatalog={tagsCatalog}
        cuentas={cuentas}
        similaritySelectedId={similaritySelectedId}
        handleNombreChange={handleNombreChange}
        handleNombreEnChange={handleNombreEnChange}
        handleDescriptionChange={handleDescriptionChange}
        handleDescriptionEnChange={handleDescriptionEnChange}
        handleCategoriasChange={handleCategoriasChange}
        handleTagsChange={handleTagsChange}
        handleCuentaChange={handleCuentaChange}
        openCreateModal={openCreateModal}
        handleOpenPerfilModal={handleOpenPerfilModal}
        setPreviewImage={setPreviewImage}
        handleSetPrimaryImage={handleSetPrimaryImage}
        handleOpenSimilar={handleOpenSimilar}
        handleRemoverFila={handleRemoverFila}
      />

      {/* ═══════════ PIE: TOTAL GB + BOTÓN SUBIR ═══════════ */}
      <BatchFooter
        rows={rows}
        isProcessing={isProcessing}
        isStoppingAll={isStoppingAll}
        handleProcessBatch={handleProcessBatch}
      />

      {/* ═══════════ MODALES ═══════════ */}
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

      {/* ═══════════ DIALOG SCP ═══════════ */}
      <ScpUploadDialog
        open={scpModalOpen}
        onClose={() => setScpModalOpen(false)}
        scpIndexedFile={scpIndexedFile}
        scpCommandData={scpCommandData}
        scpCommandError={scpCommandError}
        scpCommandLoading={scpCommandLoading}
        scpUploadProbe={scpUploadProbe}
        fetchBatchScpCommand={fetchBatchScpCommand}
        formatBytes={formatBytes}
      />

      {/* ═══════════ PREVIEW DE IMAGEN ═══════════ */}
      <Dialog open={!!previewImage} onClose={() => setPreviewImage(null)} maxWidth="lg" PaperProps={{ sx: { background: 'transparent', boxShadow: 'none' } }}>
        {previewImage && (
          <Box onClick={() => setPreviewImage(null)} sx={{ cursor: 'zoom-out', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          </Box>
        )}
      </Dialog>

      {/* ═══════════ SIDEBAR DE SIMILARES ═══════════ */}
      <SimilaritySidebar
        searchSidebarSide={searchSidebarSide}
        toggleSearchSidebarSide={toggleSearchSidebarSide}
        similaritySelectedId={similaritySelectedId}
        setSimilaritySelectedId={setSimilaritySelectedId}
        sidebarQueueItem={sidebarQueueItem}
        sidebarSimilarity={sidebarSimilarity}
        startSimilarityCheck={startSimilarityCheck}
        makeUploadsUrl={makeUploadsUrl}
        setPreviewImage={setPreviewImage}
      />

      {/* ═══════════ TOAST NOTIFICATIONS ═══════════ */}
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
