'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Button,
  IconButton,
  Stack,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import HttpService from '@/services/HttpService'
import HeaderBar from './HeaderBar'
import ImagesSection from './ImagesSection'
import AssetFileSection from './AssetFileSection'
import MetadataSection from './MetadataSection'
import StatusSection from './StatusSection'
import AppButton from '@/components/layout/Buttons/Button'
import MegaStatus from './MegaStatus'
import AssetsUploadedWidget from './AssetsUploadedWidget'
import SelectMegaAccountModal from './SelectMegaAccountModal'
import ProfilesBar from './ProfilesBar'
import RightSidebar from './RightSidebar'

const http = new HttpService()
const API_BASE = '/accounts'
const FREE_QUOTA_MB = Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480

// Mapea estado del backend (CONNECTED/ERROR/SUSPENDED/EXPIRED) a estados de UI (connected/failed)
const mapBackendToUiStatus = (s) => {
  switch (s) {
    case 'CONNECTED':
      return 'connected'
    case 'ERROR':
    case 'SUSPENDED':
    case 'EXPIRED':
      return 'failed'
    default:
      return 'failed'
  }
}

export default function UploadAssetPage() {
  const router = useRouter()
  const RIGHT_SIDEBAR_WIDTH = 340

  const ACTION_BTN_STYLES = {
    height: '32px',
    padding: '0 10px',
    fontSize: 12,
    fontWeight: 800,
    width: 'auto',
    margin: 0,
  }

  // ==== Similaridad (no bloqueante) por ítem de cola ==== 
  const [similarityMap, setSimilarityMap] = useState({}) // { [queueItemId]: { status, query, base, tokens, items, error } }
  const [similaritySelectedId, setSimilaritySelectedId] = useState(null)
  const [queueItemThumbs, setQueueItemThumbs] = useState([]) // [{ src, name }]
  const [imgPreviewOpen, setImgPreviewOpen] = useState(false)
  const [imgPreviewSrc, setImgPreviewSrc] = useState('')

  const [accounts, setAccounts] = useState([])
  const [selectedAcc, setSelectedAcc] = useState(null)
  const [accStatus, setAccStatus] = useState('idle')
  const [accReason, setAccReason] = useState(undefined)
  const [modalOpen, setModalOpen] = useState(false)

  // Form metadata (mock)
  const [title, setTitle] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [category, setCategory] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [tags, setTags] = useState([])
  const [isPremium, setIsPremium] = useState(true)
  const [description, setDescription] = useState('Modelo detallado de casco con soportes opcionales.')
  const [pieces, setPieces] = useState('12')
  const [supportsIncluded, setSupportsIncluded] = useState('Sí')
  const [recommendedPrinter, setRecommendedPrinter] = useState('Prusa i3 MK3S')
  const [dimensions, setDimensions] = useState('220x180x250 mm')
  const [status, setStatus] = useState('processing') // draft | processing | published | failed

  const [imageFiles, setImageFiles] = useState([]) // {id, url, file, name}
  const [previewIndex, setPreviewIndex] = useState(-1)
  const statusRef = React.useRef(null)
  const [archiveFile, setArchiveFile] = useState(null)
  const [uploadFinished, setUploadFinished] = useState(false)
  const [statusKey, setStatusKey] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  // Error de unicidad de slug
  const [slugConflict, setSlugConflict] = useState({ conflict: false, suggestion: '', checking: false })
  // Título original de la pestaña para restaurar al finalizar
  const originalTitleRef = React.useRef('')
  // Eliminado: estados de listado de assets en este modal

  // ==== Perfiles locales (categorías + tags) ====
  const LS_PROFILES_KEY = 'uploader_profiles_v1' // legacy: migración desde localStorage -> DB
  const [profiles, setProfiles] = useState([]) // [{ name, categories: string[], tags: string[] }]
  const [categoriesCatalog, setCategoriesCatalog] = useState([]) // para mapear slugs -> objetos
  const [addProfileOpen, setAddProfileOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [importProfilesOpen, setImportProfilesOpen] = useState(false)
  const [importProfilesText, setImportProfilesText] = useState('')
  const [profilesModalOpen, setProfilesModalOpen] = useState(false)
  const [profilesSearch, setProfilesSearch] = useState('')
  const sortProfilesByName = useCallback((arr=[]) => {
    return [...(arr||[])].sort((a,b)=> String(a?.name||'').localeCompare(String(b?.name||''), 'es', { sensitivity: 'base' }))
  }, [])

  const normSearch = useCallback((value = '') => {
    try {
      return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    } catch {
      return String(value || '').toLowerCase().trim()
    }
  }, [])

  const filteredProfiles = useMemo(() => {
    const q = normSearch(profilesSearch)
    if (!q) return profiles
    const terms = q.split(/\s+/).filter(Boolean)
    if (terms.length === 0) return profiles

    return (profiles || []).filter((p) => {
      const hay = normSearch(`${p?.name || ''} ${(p?.categories || []).join(' ')} ${(p?.tags || []).join(' ')}`)
      return terms.every(t => hay.includes(t))
    })
  }, [profiles, profilesSearch, normSearch])

  const readLegacyProfilesFromLocalStorage = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(LS_PROFILES_KEY)) || [] } catch { return [] }
  }, [])

  const saveProfilesToDb = useCallback(async (arr) => {
    const ordered = sortProfilesByName(arr)
    try {
      await http.postData('/me/uploader-profiles', { profiles: ordered })
    } catch (e) {
      console.error('saveProfilesToDb error', e)
    }
    return ordered
  }, [http, sortProfilesByName])

  const loadProfilesFromDb = useCallback(async () => {
    try {
      const res = await http.getData('/me/uploader-profiles')
      const arr = Array.isArray(res?.data?.profiles) ? res.data.profiles : []

      // Migración 1 vez: si DB está vacía pero LS tiene datos, subirlos
      if (arr.length === 0) {
        const legacy = readLegacyProfilesFromLocalStorage()
        if (Array.isArray(legacy) && legacy.length > 0) {
          const ordered = await saveProfilesToDb(legacy)
          setProfiles(ordered)
          return ordered
        }
      }

      const ordered = sortProfilesByName(arr)
      setProfiles(ordered)
      return ordered
    } catch (e) {
      console.error('loadProfilesFromDb error', e)
      setProfiles([])
      return []
    }
  }, [http, readLegacyProfilesFromLocalStorage, saveProfilesToDb, sortProfilesByName])

  const addProfile = useCallback((name, catsSlugs = [], tagsList = []) => {
    const trimmed = String(name || '').trim()
    if (!trimmed) return

    setProfiles((prev) => {
      const all = Array.isArray(prev) ? [...prev] : []
      const idx = all.findIndex(p => String(p?.name || '').toLowerCase() === trimmed.toLowerCase())
      const next = { name: trimmed, categories: Array.from(new Set(catsSlugs)), tags: Array.from(new Set(tagsList)) }
      if (idx >= 0) all[idx] = next
      else all.push(next)
      const ordered = sortProfilesByName(all)
      void saveProfilesToDb(ordered)
      return ordered
    })
  }, [saveProfilesToDb, sortProfilesByName])

  const removeProfile = useCallback((name) => {
    const target = String(name || '').toLowerCase()
    setProfiles((prev) => {
      const all = Array.isArray(prev) ? prev : []
      const next = all.filter(p => String(p?.name || '').toLowerCase() !== target)
      const ordered = sortProfilesByName(next)
      void saveProfilesToDb(ordered)
      return ordered
    })
  }, [saveProfilesToDb, sortProfilesByName])

  const exportProfiles = useCallback(async () => {
    try {
      const json = JSON.stringify(profiles || [], null, 2)
      await navigator.clipboard.writeText(json)
      window.alert('Perfiles copiados al portapapeles')
    } catch (e) {
      console.error('exportProfiles error', e)
      window.alert('No pude copiar al portapapeles')
    }
  }, [profiles])

  const importProfiles = useCallback(() => {
    setImportProfilesText(JSON.stringify(profiles || [], null, 2))
    setImportProfilesOpen(true)
  }, [profiles])

  const applyImportedProfiles = useCallback(async () => {
    let parsed
    try {
      parsed = JSON.parse(importProfilesText)
    } catch {
      window.alert('JSON inválido')
      return
    }
    if (!Array.isArray(parsed)) {
      window.alert('El JSON debe ser un array de perfiles')
      return
    }
    const ordered = sortProfilesByName(parsed)
    setProfiles(ordered)
    await saveProfilesToDb(ordered)
    setImportProfilesOpen(false)
  }, [importProfilesText, saveProfilesToDb, sortProfilesByName])

  // ==== Cola de subidas (solo frontend) ====
  const [uploadQueue, setUploadQueue] = useState([]) // [{id, archiveFile, images:File[], meta:{...}, sizeBytes, status}]
  const uploadQueueRef = React.useRef([])
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const [queueIndex, setQueueIndex] = useState(-1)
  const queueIndexRef = React.useRef(-1)
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimerRef = React.useRef(null)
  // Cronómetro de subida/cola
  const [elapsedMs, setElapsedMs] = useState(0)
  const elapsedTimerRef = React.useRef(null)
  const startTimeRef = React.useRef(null)

  // Modo de cola: 'http' (por defecto) o 'scp' (staging en uploads/tmp)
  const [queueMode, setQueueMode] = useState('http')
  const [batchId, setBatchId] = useState('')
  const [scpModalOpen, setScpModalOpen] = useState(false)
  const [scpHost, setScpHost] = useState('')
  const [scpUser, setScpUser] = useState('')
  const [scpPort, setScpPort] = useState('22')
  const [scpRemoteBase, setScpRemoteBase] = useState('')
  const [copiedNameMap, setCopiedNameMap] = useState({}) // feedback de copiado por item
  // Overlay oscuro manual (switch flotante)
  const [darkOverlay, setDarkOverlay] = useState(false)

  // Evitar doble click/ejecuciones paralelas al encolar
  const addToQueueLockRef = React.useRef(false)

  // Hold de uploads-active para sesiones largas en modo SCP (evita que el cron toque MEGAcmd)
  const [scpHoldId, setScpHoldId] = useState('')
  const [scpHoldUntilMs, setScpHoldUntilMs] = useState(0)
  const scpHoldStartRef = React.useRef(0)
  const scpHoldCreatedAtRef = React.useRef(0)
  const LS_SCP_HOLD_KEY = 'uploader_scp_hold_v1'
  const LS_BATCH_QUIET_HOLD_KEY = 'uploader_batch_quiet_hold_v1'

  const readScpHoldFromLs = useCallback(() => {
    try {
      if (typeof window === 'undefined') return null
      const raw = window.localStorage.getItem(LS_SCP_HOLD_KEY)
      if (!raw) return null
      const obj = JSON.parse(raw)
      const holdId = String(obj?.holdId || '').trim()
      const untilMs = Number(obj?.untilMs || 0)
      if (!holdId || !Number.isFinite(untilMs) || untilMs <= 0) return null
      return { holdId, untilMs }
    } catch {
      return null
    }
  }, [])

  const writeScpHoldToLs = useCallback((holdId, untilMs) => {
    try {
      if (typeof window === 'undefined') return
      if (!holdId) {
        window.localStorage.removeItem(LS_SCP_HOLD_KEY)
        return
      }
      window.localStorage.setItem(LS_SCP_HOLD_KEY, JSON.stringify({ holdId, untilMs }))
    } catch {}
  }, [])

  const readBatchQuietHoldFromLs = useCallback(() => {
    try {
      if (typeof window === 'undefined') return null
      const raw = window.localStorage.getItem(LS_BATCH_QUIET_HOLD_KEY)
      if (!raw) return null
      const obj = JSON.parse(raw)
      const mainAccountId = Number(obj?.mainAccountId || 0)
      const untilMs = Number(obj?.untilMs || 0)
      if (!Number.isFinite(mainAccountId) || mainAccountId <= 0) return null
      if (!Number.isFinite(untilMs) || untilMs <= 0) return null
      return { mainAccountId, untilMs }
    } catch {
      return null
    }
  }, [])

  const writeBatchQuietHoldToLs = useCallback((mainAccountId, untilMs) => {
    try {
      if (typeof window === 'undefined') return
      if (!mainAccountId) {
        window.localStorage.removeItem(LS_BATCH_QUIET_HOLD_KEY)
        return
      }
      window.localStorage.setItem(LS_BATCH_QUIET_HOLD_KEY, JSON.stringify({ mainAccountId, untilMs }))
    } catch {}
  }, [])

  // Rehidratar hold tras refresh (evita que quede huérfano 6h sin forma de liberarlo)
  useEffect(() => {
    try {
      const saved = readScpHoldFromLs()
      if (!saved) return
      const now = Date.now()
      if (saved.untilMs < now - 60_000) {
        writeScpHoldToLs('', 0)
        return
      }
      setScpHoldId(saved.holdId)
      setScpHoldUntilMs(saved.untilMs)
    } catch {}
  }, [readScpHoldFromLs, writeScpHoldToLs])

  // ==== Hold batch-quiet (MEGA): evita pasar a BACKUP mientras sigues encolando por SCP ====
  const [batchQuietHoldUntilMs, setBatchQuietHoldUntilMs] = useState(0)
  const batchQuietHoldMainIdRef = React.useRef(0)
  const batchQuietRenewTimerRef = React.useRef(null)

  const startBatchQuietHold = useCallback(async (mainAccountId, minutes = 20) => {
    const id = Number(mainAccountId || 0)
    if (!Number.isFinite(id) || id <= 0) return 0
    try {
      const r = await http.postData('/assets/hold-mega-batch-quiet', {
        action: 'start',
        mainAccountId: id,
        minutes,
        label: 'uploader-scp',
      })
      const untilMs = Number(r?.data?.untilMs || 0)
      if (Number.isFinite(untilMs) && untilMs > 0) {
        batchQuietHoldMainIdRef.current = id
        setBatchQuietHoldUntilMs(untilMs)
        writeBatchQuietHoldToLs(id, untilMs)
        return untilMs
      }
    } catch (e) {
      console.warn('[BATCH-QUIET][HOLD] no pude iniciar/renovar:', e?.message)
    }
    return 0
  }, [writeBatchQuietHoldToLs])

  const releaseBatchQuietHold = useCallback(async (mainAccountId) => {
    const id = Number(mainAccountId || batchQuietHoldMainIdRef.current || 0)
    if (!Number.isFinite(id) || id <= 0) return
    try {
      await http.postData('/assets/hold-mega-batch-quiet', {
        action: 'release',
        mainAccountId: id,
      })
    } catch (e) {
      console.warn('[BATCH-QUIET][HOLD] no pude liberar:', e?.message)
    } finally {
      if (batchQuietHoldMainIdRef.current === id) batchQuietHoldMainIdRef.current = 0
      setBatchQuietHoldUntilMs(0)
      writeBatchQuietHoldToLs(0, 0)
    }
  }, [writeBatchQuietHoldToLs])

  // Rehidratar hold batch-quiet tras refresh (TTL corto, pero evita que arranquen backups si refrescas a mitad)
  useEffect(() => {
    try {
      const saved = readBatchQuietHoldFromLs()
      if (!saved) return
      const now = Date.now()
      if (saved.untilMs < now - 60_000) {
        writeBatchQuietHoldToLs(0, 0)
        return
      }
      batchQuietHoldMainIdRef.current = saved.mainAccountId
      setBatchQuietHoldUntilMs(saved.untilMs)
    } catch {}
  }, [readBatchQuietHoldFromLs, writeBatchQuietHoldToLs])

  // Renovación automática: mientras estés en SCP y haya ítems por stagear (queued/running), mantener hold.
  useEffect(() => {
    const mainId = Number(selectedAcc?.id || 0)
    const hasStaging = uploadQueue.some(it => it.status === 'queued' || it.status === 'running')
    const shouldHold = queueMode === 'scp' && mainId > 0 && (scpModalOpen || hasStaging)

    // Si cambió la cuenta, liberar hold anterior
    const prevMainId = Number(batchQuietHoldMainIdRef.current || 0)
    if (prevMainId && mainId && prevMainId !== mainId) {
      void releaseBatchQuietHold(prevMainId)
    }

    if (!shouldHold) {
      if (prevMainId) void releaseBatchQuietHold(prevMainId)
      if (batchQuietRenewTimerRef.current) {
        try { clearInterval(batchQuietRenewTimerRef.current) } catch {}
        batchQuietRenewTimerRef.current = null
      }
      return
    }

    // Iniciar/renovar ahora y luego cada 5 min. TTL=20 min (si cierras ventana, expira solo).
    void startBatchQuietHold(mainId, 20)
    if (!batchQuietRenewTimerRef.current) {
      batchQuietRenewTimerRef.current = setInterval(() => {
        void startBatchQuietHold(mainId, 20)
      }, 5 * 60 * 1000)
    }

    return () => {
      // no liberar aquí: sólo detener timer si cambia deps
      if (batchQuietRenewTimerRef.current) {
        try { clearInterval(batchQuietRenewTimerRef.current) } catch {}
        batchQuietRenewTimerRef.current = null
      }
    }
  }, [queueMode, selectedAcc?.id, scpModalOpen, uploadQueue, startBatchQuietHold, releaseBatchQuietHold])

  const startScpHold = useCallback(async (minutes = 360) => {
    try {
      // si ya tenemos hold, no duplicar
      if (scpHoldId) {
        writeScpHoldToLs(scpHoldId, scpHoldUntilMs || 0)
        return scpHoldId
      }
      const r = await http.postData('/assets/hold-uploads-active', {
        minutes,
        label: 'scp-session',
      })
      const id = r?.data?.holdId
      if (id) {
        setScpHoldId(id)
        setScpHoldUntilMs(Number(r?.data?.untilMs || 0))
        scpHoldStartRef.current = Date.now()
        scpHoldCreatedAtRef.current = Date.now()
        writeScpHoldToLs(String(id), Number(r?.data?.untilMs || 0))
        return id
      }
    } catch (e) {
      console.warn('[SCP][HOLD] no pude iniciar hold:', e?.message)
    }
    return null
  }, [scpHoldId, scpHoldUntilMs, writeScpHoldToLs])

  const releaseScpHold = useCallback(async () => {
    try {
      const id = scpHoldId
      if (!id) return
      await http.postData('/assets/hold-uploads-active', { action: 'release', holdId: id })
    } catch (e) {
      console.warn('[SCP][HOLD] no pude liberar hold:', e?.message)
    } finally {
      setScpHoldId('')
      setScpHoldUntilMs(0)
      scpHoldStartRef.current = 0
      scpHoldCreatedAtRef.current = 0
      writeScpHoldToLs('', 0)
    }
  }, [scpHoldId, writeScpHoldToLs])

  const scpHoldLabel = useMemo(() => {
    if (!scpHoldId) return ''
    try {
      const ts = scpHoldUntilMs || (scpHoldStartRef.current ? (scpHoldStartRef.current + 360 * 60 * 1000) : 0)
      if (!ts) return '🛡️ Protección anti-cron activa'
      const d = new Date(ts)
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `🛡️ Protección anti-cron activa (hasta ${hh}:${mm})`
    } catch {
      return '🛡️ Protección anti-cron activa'
    }
  }, [scpHoldId, scpHoldUntilMs])

  // Derivados de estado para la cola
  const queueActive = isProcessingQueue || cooldown > 0
  const hasQueuedItems = uploadQueue.some(it => it.status === 'queued')
  const allCompleted = uploadQueue.length > 0 && uploadQueue.every(it => it.status === 'success' || it.status === 'error')
  const hasActiveQueued = uploadQueue.some(it => it.status === 'queued' || it.status === 'running' || it.status === 'enqueued')
  const shouldBlockNav = isUploading || queueActive || hasActiveQueued
  const navBypassRef = React.useRef(false)

  const remotePath = '/STLHUB/assets/slug-demo/'

  // Eliminado: formatMB y fetchAccountAssets aquí

  const fetchAccounts = async () => {
    try {
      const res = await http.getData(API_BASE)
      const list = res.data || []
      setAccounts(list)
      return list
    } catch (e) {
      console.error('fetchAccounts error', e)
    }
    return []
  }

  useEffect(() => { fetchAccounts() }, [])

  // Guardar título original al montar y restaurar al desmontar
  useEffect(() => {
    if (typeof document !== 'undefined') {
      originalTitleRef.current = document.title
    }
    return () => {
      try { if (typeof document !== 'undefined' && originalTitleRef.current) document.title = originalTitleRef.current } catch {}
    }
  }, [])

  // Cleanup: si el usuario navega fuera, liberar hold SCP
  // IMPORTANTE: en dev, React StrictMode puede montar/desmontar dos veces y disparar este cleanup.
  // Para evitar liberar inmediatamente tras activarlo, aplicamos un "guard" temporal y por modo.
  useEffect(() => {
    return () => {
      try {
        const justCreatedMs = Date.now() - (scpHoldCreatedAtRef.current || 0)
        const justCreated = scpHoldCreatedAtRef.current && justCreatedMs < 4000
        if (queueMode === 'scp') return
        if (justCreated) return
        releaseScpHold()
      } catch {}
    }
  }, [releaseScpHold, queueMode])

  // Actualizar título del tab con el progreso de la cola (x/y completo)
  const [activeStage, setActiveStage] = useState({ stage: 'idle', percent: 0, alias: '' })

  const queueProgress = useMemo(() => {
    const total = uploadQueue.length
    if (!isProcessingQueue || total <= 0) return { enabled: false }

    const clamp = (n) => Math.max(0, Math.min(100, Number(n || 0)))
    const q = uploadQueue

    // 1) Servidor: contamos ítems ya "encolados" (server completo) + el progreso del ítem actual (server/staging)
    const serverDoneCount = q.filter(it => it.status === 'enqueued' || it.status === 'success' || it.status === 'error').length
    const serverRunningPct = activeStage?.stage === 'server' ? clamp(activeStage.percent) : 0
    const serverPercent = clamp((serverDoneCount * 100 + serverRunningPct) / total)

    // 2) MAIN: usamos estado/pista del backend (main published o ya está en backup)
    const isMainDone = (it) => {
      if (it.status === 'success') return true
      const ms = String(it?.backend?.mainStatus || '')
      if (ms === 'published') return true
      const st = String(it?.backend?.batch?.asset?.stage || '')
      if (st.startsWith('backup-') || st === 'completed') return true
      return false
    }
    const mainDoneCount = q.filter(isMainDone).length
    const mainPartialSum = q.reduce((sum, it) => {
      if (isMainDone(it)) return sum
      const st = String(it?.backend?.batch?.asset?.stage || '')
      if (st === 'main-uploading') {
        const mp = Number(it?.backend?.mainProgress)
        return sum + (Number.isFinite(mp) ? clamp(mp) : 0)
      }
      return sum
    }, 0)
    const mainPercent = clamp((mainDoneCount * 100 + mainPartialSum) / total)

    // 3) BACKUP: consideramos allDone como backup completado. Si está en backup, usamos overallPercent para animar.
    const backupPoints = q.reduce((sum, it) => {
      if (it.status === 'success') return sum + 100
      if (it.status === 'error') return sum + 100
      const st = String(it?.backend?.batch?.asset?.stage || '')
      const op = Number(it?.backend?.overallPercent)
      if (st.startsWith('backup-') && Number.isFinite(op)) return sum + clamp(op)
      return sum
    }, 0)
    const backupPercent = clamp(backupPoints / total)

    const serverLabel = queueMode === 'scp' ? `Staging SCP (cola)` : `Subida HTTP (cola)`
    const mainLabel = `MEGA principal (cola)`
    const backupLabel = `Backups (cola)`
    const hint = 'En modo cola, el servidor sigue encolando mientras MEGA procesa en segundo plano.'

    return { enabled: true, total, serverPercent, mainPercent, backupPercent, serverLabel, mainLabel, backupLabel, hint }
  }, [uploadQueue, isProcessingQueue, activeStage, queueMode])
  // Batch status map para uso interno (incluye percent y size por path) - solo SCP
  const scpStatusMapRef = React.useRef({})
  const scpBatchPaths = React.useMemo(() => {
    if (queueMode !== 'scp' || !batchId) return []
    const dirRel = `tmp/${batchId}`
    return uploadQueue
      .filter(it => it.status === 'queued' || it.status === 'running')
      .map(it => it?.archiveFile?.name ? `${dirRel}/${it.archiveFile.name}` : null)
      .filter(Boolean)
  }, [queueMode, batchId, uploadQueue])
  const scpBatchExpectedSizes = React.useMemo(() => {
    if (queueMode !== 'scp' || !batchId) return []
    return uploadQueue
      .filter(it => it.status === 'queued' || it.status === 'running')
      .map(it => it?.archiveFile?.size || 0)
  }, [queueMode, batchId, uploadQueue])
  useEffect(() => {
    if (typeof document === 'undefined') return
    const total = uploadQueue.length
    const completed = uploadQueue.filter(it => it.status === 'success').length
    const busy = isUploading || isProcessingQueue || queueActive
    if (busy && total > 0) {
      const base = originalTitleRef.current || document.title
      const pct = Math.max(0, Math.min(100, Math.round(activeStage.percent || 0)))
      let stageLabel = ''
      if (activeStage.stage === 'server') stageLabel = `Srv${pct}%`
      else if (activeStage.stage === 'mega') stageLabel = `Mga${pct}%`
      else if (activeStage.stage === 'backup') {
        const alias = activeStage.alias ? String(activeStage.alias).slice(0, 10) : ''
        stageLabel = `Bkc_${alias}_${pct}%`
      } else stageLabel = ''

      const label = stageLabel ? `${completed}/${total} - ${stageLabel}` : `${completed}/${total}`
      document.title = `${label} · ${base}`
    } else {
      if (originalTitleRef.current) document.title = originalTitleRef.current
    }
  }, [uploadQueue, isUploading, isProcessingQueue, queueActive, activeStage])

  // Cargar perfiles y catálogo de categorías al montar
  useEffect(() => {
    void loadProfilesFromDb()
    ;(async () => {
      try {
        const resCats = await http.getData('/categories')
        const items = (resCats.data?.items || []).map(c => ({ id: c.id, name: c.name, nameEn: c.nameEn, slug: c.slug, slugEn: c.slugEn }))
        setCategoriesCatalog(items)
      } catch (e) { setCategoriesCatalog([]) }
    })()
  }, [loadProfilesFromDb])

  // Solo cuentas MAIN para selección en uploader; ordenar: más recientes primero
  const orderedMainAccounts = useMemo(() => {
    const mains = (accounts || []).filter(a => a.type === 'main')
    mains.sort((a,b) => {
      const ad = a.lastCheckAt ? new Date(a.lastCheckAt).getTime() : 0
      const bd = b.lastCheckAt ? new Date(b.lastCheckAt).getTime() : 0
      if (ad === 0 && bd === 0) return (a.id||0) - (b.id||0)
      if (ad === 0) return 1
      if (bd === 0) return -1
      return bd - ad
    })
    return mains
  }, [accounts])

  const testSelectedAccount = async () => {
    if (!selectedAcc) return
    const id = selectedAcc.id
    const prevAcc = selectedAcc
    try {
      setAccStatus('connecting')
      setAccReason(undefined)
      await http.postData(`${API_BASE}/${id}/test`, {})
      const list = await fetchAccounts()
      const acc = (list || []).find(a => a.id === id) || prevAcc
      console.log('testSelectedAccount acc:', acc)
      setSelectedAcc(acc)
      setAccStatus(mapBackendToUiStatus(acc.status))
      setAccReason(acc.statusMessage || undefined)
    } catch (e) {
      console.error(e)
      const list = await fetchAccounts()
      const acc = (list || []).find(a => a.id === id) || prevAcc
      setSelectedAcc(acc)
      setAccStatus('failed')
      setAccReason('Falló la verificación')
    }
  }

  const handleFiles = (filesLike) => {
    const files = Array.from(filesLike || [])
    const imgs = files.filter(f => f.type?.startsWith('image/'))
    if (!imgs.length) return
    const mapped = imgs.map((f, i) => ({ id: `${Date.now()}_${i}`, file: f, name: f.name, url: URL.createObjectURL(f) }))
    setImageFiles(prev => {
      const arr = [...prev, ...mapped]
      if (arr.length && previewIndex < 0) setPreviewIndex(0)
      return arr
    })
  }
  const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); handleFiles(e.dataTransfer.files) }
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation() }
  const fileInputRef = React.useRef(null)
  const openFilePicker = () => fileInputRef.current?.click()
  const onSelectFiles = (e) => handleFiles(e.target.files)

  const removeImage = (id) => {
    setImageFiles(prev => {
      const idx = prev.findIndex(it => it.id === id)
      if (idx >= 0) { try { URL.revokeObjectURL(prev[idx].url) } catch {}
      }
      const arr = prev.filter(it => it.id !== id)
      if (!arr.length) setPreviewIndex(-1)
      else if (previewIndex >= arr.length) setPreviewIndex(arr.length - 1)
      else if (idx >= 0 && idx < previewIndex) setPreviewIndex(previewIndex - 1)
      return arr
    })
  }

  const onReorderImages = (from, to) => {
    setImageFiles(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return arr
    })
    setPreviewIndex((i) => {
      if (i === from) return to
      if (from < i && to >= i) return i - 1
      if (from > i && to <= i) return i + 1
      return i
    })
  }

  // Navegación de previews (circular)
  const prevSlide = useCallback(() => {
    setPreviewIndex((i) => {
      const len = imageFiles.length
      if (!len) return -1
      return i <= 0 ? (len - 1) : (i - 1)
    })
  }, [imageFiles.length])

  const nextSlide = useCallback(() => {
    setPreviewIndex((i) => {
      const len = imageFiles.length
      if (!len) return -1
      return i >= len - 1 ? 0 : i + 1
    })
  }, [imageFiles.length])

  // Validaciones y errores para pintar inputs y mostrar mensajes
  const tagsCleanCount = useMemo(() => (Array.isArray(tags) ? tags.filter(t => String(t).trim().length > 0).length : 0), [tags])
  const fieldErrors = useMemo(() => ({
    title: !(title && String(title).trim().length > 0),
    titleEn: !(titleEn && String(titleEn).trim().length > 0),
    categories: !(Array.isArray(selectedCategories) && selectedCategories.length >= 1),
    tags: !(tagsCleanCount >= 2),
  }), [title, titleEn, selectedCategories, tagsCleanCount])

  const missingReasons = useMemo(() => {
    const list = []
    if (accStatus !== 'connected' || !selectedAcc) list.push('Conecta una cuenta MEGA')
    if (!archiveFile) list.push('Selecciona (.zip/.rar)')
    if (imageFiles.length < 1) list.push('Añade al menos 1 imagen')
    if (fieldErrors.title) list.push('Nombre (ES) requerido')
    if (fieldErrors.titleEn) list.push('Nombre (EN) requerido')
    if (fieldErrors.categories) list.push('Selecciona al menos 1 categoría')
    if (fieldErrors.tags) list.push('Agrega al menos 2 tags')
    if (slugConflict.conflict) list.push(`Ya existe un asset con esta carpeta. Prueba con: ${slugConflict.suggestion}`)
    return list
  }, [accStatus, selectedAcc, archiveFile, imageFiles.length, fieldErrors, slugConflict.conflict, slugConflict.suggestion])

  // Limpiar error de conflicto al cambiar el título (sin llamadas en vivo)
  useEffect(() => { setSlugConflict({ conflict:false, suggestion:'', checking:false }) }, [title])

  // Helper: verificar unicidad del slug al intentar subir/añadir
  const slugifyTitle = useCallback((s) => String(s||'').toLowerCase().trim().replace(/[^a-z0-9-\s_]+/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,80), [])
  const ensureUniqueSlugOrSetError = useCallback(async () => {
    const base = slugifyTitle(title)
    if (!base) return false
    try {
      const res = await http.getData(`/assets/check-unique?slug=${encodeURIComponent(base)}`)
      const data = res.data || {}
      if (data.conflict) {
        setSlugConflict({ conflict: true, suggestion: data.suggestion || base, checking: false })
        return false
      }
      return true
    } catch (e) {
      // En caso de fallo del endpoint, permitimos continuar y que el backend real decida.
      return true
    }
  }, [http, title, slugifyTitle])

  const canUpload = (
    accStatus === 'connected' &&
    !!selectedAcc &&
    !!archiveFile &&
    imageFiles.length >= 1 &&
    !!(title && String(title).trim().length > 0) &&
    !!(titleEn && String(titleEn).trim().length > 0) &&
    Array.isArray(selectedCategories) && selectedCategories.length >= 1 &&
    tagsCleanCount >= 2 &&
    !isUploading
  )

  const resetForm = () => {
    // Liberar URLs previas
    setImageFiles(prev => {
      prev.forEach(it => { try { URL.revokeObjectURL(it.url) } catch {} })
      return []
    })
    setPreviewIndex(-1)
    setArchiveFile(null)
    setTitle('')
    setTitleEn('')
    setCategory('')
    setSelectedCategories([])
    setTags([])
    setIsPremium(true)
    setUploadFinished(false)
    setStatusKey(k => k + 1) // fuerza remount de StatusSection para limpiar progresos
  }

  const formatBytes = (b) => {
    const n = Number(b||0)
    if (n < 1024) return `${n} B`
    const kb = n/1024; if (kb < 1024) return `${kb.toFixed(1)} KB`
    const mb = kb/1024; if (mb < 1024) return `${mb.toFixed(1)} MB`
    const gb = mb/1024; return `${gb.toFixed(2)} GB`
  }

  const uploadsBase = process.env.NEXT_PUBLIC_UPLOADS_BASE || 'http://localhost:3001/uploads'
  const makeUploadsUrl = (rel) => {
    const s = String(rel || '').trim()
    if (!s) return ''
    if (s.startsWith('http')) return s
    return `${uploadsBase}/${s.replace(/\\/g,'/').replace(/^\/+/, '')}`
  }

  const startSimilarityCheck = useCallback((queueItem) => {
    const id = queueItem?.id
    const filename = queueItem?.archiveFile?.name
    const sizeB = Number(queueItem?.sizeBytes || 0)
    if (!id || !filename) return

    setSimilarityMap((m) => {
      const prev = m?.[id]
      if (prev?.status === 'loading') return m
      return {
        ...(m || {}),
        [id]: {
          status: 'loading',
          query: filename,
          base: '',
          tokens: [],
          items: [],
          error: '',
          startedAt: Date.now(),
        },
      }
    })

    ;(async () => {
      try {
        const qsSize = Number.isFinite(sizeB) && sizeB > 0 ? `&sizeB=${encodeURIComponent(String(Math.floor(sizeB)))}` : ''
        const r = await http.getData(`/assets/similar?filename=${encodeURIComponent(filename)}&limit=8${qsSize}`)
        const data = r?.data || {}
        const items = Array.isArray(data?.items) ? data.items : []
        setSimilarityMap((m) => ({
          ...(m || {}),
          [id]: {
            status: 'done',
            query: String(data?.query || filename),
            base: String(data?.base || ''),
            tokens: Array.isArray(data?.tokens) ? data.tokens : [],
            items,
            error: '',
            finishedAt: Date.now(),
          },
        }))
      } catch (e) {
        console.error('similarity check error', e)
        setSimilarityMap((m) => ({
          ...(m || {}),
          [id]: {
            status: 'error',
            query: filename,
            base: '',
            tokens: [],
            items: [],
            error: 'No se pudo buscar similares',
            finishedAt: Date.now(),
          },
        }))
      }
    })()
  }, [http])

  const openImgPreview = useCallback((src) => {
    const s = String(src || '').trim()
    if (!s) return
    setImgPreviewSrc(s)
    setImgPreviewOpen(true)
  }, [])

  const formatDuration = (ms) => {
    const total = Math.max(0, Math.floor((ms||0)/1000))
    const h = Math.floor(total/3600)
    const m = Math.floor((total%3600)/60)
    const s = total%60
    const pad = (n) => String(n).padStart(2,'0')
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  }

  const statusPillStyle = (s) => {
    const base = { display:'inline-block', padding:'2px 8px', borderRadius:999, fontSize:12, fontWeight:600, letterSpacing:.2 }
    switch(String(s)){
      case 'success':
        return { ...base, color:'#2e7d32', background:'rgba(46,125,50,0.15)', border:'1px solid rgba(46,125,50,0.25)', textTransform:'none' }
      case 'enqueued':
        return { ...base, color:'#6a5acd', background:'rgba(106,90,205,0.16)', border:'1px solid rgba(106,90,205,0.35)', textTransform:'none' }
      case 'queued':
        return { ...base, color:'#8d6e00', background:'rgba(255,193,7,0.18)', border:'1px solid rgba(255,193,7,0.35)', textTransform:'none' }
      case 'running':
        return { ...base, color:'#1565c0', background:'rgba(21,101,192,0.14)', border:'1px solid rgba(21,101,192,0.3)', textTransform:'none' }
      case 'error':
        return { ...base, color:'#d32f2f', background:'rgba(244,67,54,0.16)', border:'1px solid rgba(244,67,54,0.35)', textTransform:'none' }
      default:
        return { ...base, color:'#9aa4c7', background:'rgba(154,164,199,0.15)', border:'1px solid rgba(154,164,199,0.3)', textTransform:'none' }
    }
  }

  const statusLabel = (it) => {
    const s = String(it?.status || '')
    if (s === 'enqueued') {
      const pct = it?.backend?.overallPercent
      const extra = Number.isFinite(pct) ? ` ${Math.round(pct)}%` : ''
      return `EN BACKEND${extra}`
    }
    if (s === 'running') return 'SUBIENDO SERVIDOR'
    if (s === 'queued') return 'EN COLA'
    if (s === 'success') return 'OK'
    if (s === 'error') return 'ERROR'
    return s || '-'
  }

  useEffect(() => { uploadQueueRef.current = uploadQueue }, [uploadQueue])
  useEffect(() => { queueIndexRef.current = queueIndex }, [queueIndex])

  const canEnqueue = (
    accStatus === 'connected' &&
    !!selectedAcc &&
    !!archiveFile && 
    imageFiles.length >= 1 &&
    Array.isArray(selectedCategories) && selectedCategories.length >= 1 &&
    tagsCleanCount >= 2
  )

  const titleErrorMessage = slugConflict.conflict
    ? `Ya existe un asset con esta carpeta. Prueba con: ${slugConflict.suggestion}`
    : undefined

  const handleAddToQueue = async () => {
    if (addToQueueLockRef.current) return
    addToQueueLockRef.current = true

    // snapshot rápido del formulario y archivos
    try {
      if (!archiveFile || imageFiles.length < 1) return;
      if (accStatus !== 'connected' || !selectedAcc) return;
      if (!Array.isArray(selectedCategories) || selectedCategories.length < 1) return;
      if (!(tagsCleanCount >= 2)) return;

      // Evitar duplicados por nombre de archivo principal en la cola actual
      const normalizeName = (n) => String(n || '').trim().toLowerCase();
      const incomingName = normalizeName(archiveFile?.name);
      if (incomingName) {
        const dup = uploadQueue.some(
          (it) => normalizeName(it?.archiveFile?.name) === incomingName && (it?.status === 'queued' || it?.status === 'running')
        );
        if (dup) {
          window.alert(`Ya hay un archivo en la cola con el mismo nombre: ${archiveFile.name}`);
          return;
        }
      }

      const unique = await ensureUniqueSlugOrSetError()
      if (!unique) return
      const sizeBytes = (archiveFile?.size || 0) + imageFiles.reduce((s, f) => s + (f.file?.size || f.size || 0), 0)
      const item = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        createdAssetId: null,
        archiveFile,
        images: imageFiles.map((f) => f.file || f),
        meta: { title, titleEn, categories: selectedCategories, tags, isPremium, accountId: selectedAcc?.id || null, },
        sizeBytes,
        status: 'queued', // queued | running | success | error
      }
      setUploadQueue((q) => [...q, item])
      setSimilaritySelectedId(item.id)
      startSimilarityCheck(item)
      // limpiar el formulario para permitir agregar otro
      resetForm()
    } finally {
      addToQueueLockRef.current = false
    }
  }

  const populateFormFromQueueItem = (item) => {
    // Cargar estados del snapshot en el formulario para que StatusSection use getFormData()
    const acc = accounts.find(a => a.id === item.meta.accountId)
    if (acc) setSelectedAcc(acc)
    setTitle(item.meta.title || '')
    setTitleEn(item.meta.titleEn || '')
    setSelectedCategories(Array.isArray(item.meta.categories) ? item.meta.categories : [])
    setTags(Array.isArray(item.meta.tags) ? item.meta.tags : [])
    setIsPremium(!!item.meta.isPremium)
    setArchiveFile(item.archiveFile)
    // mapear files a estructura de ImagesSection
    const mapped = (item.images||[]).map((f, i) => ({ id: `${Date.now()}_${i}`, file: f, name: f.name, url: URL.createObjectURL(f) }))
    // liberar previas y fijar nuevas
    setImageFiles((prev) => {
      prev.forEach(it => { try { URL.revokeObjectURL(it.url) } catch {} })
      return mapped
    })
    setPreviewIndex(mapped.length ? 0 : -1)
    // reiniciar StatusSection
    setStatusKey(k => k + 1)
  }

  // Aplicar un perfil (categorías por slug -> objetos del catálogo, tags como strings)
  const applyProfile = useCallback((profile) => {
    if (!profile) return
    const slugs = Array.isArray(profile.categories) ? profile.categories.map(s=>String(s).toLowerCase()) : []
    const mappedCats = (categoriesCatalog || []).filter(c => slugs.includes(String(c.slug||'').toLowerCase()) || slugs.includes(String(c.slugEn||'').toLowerCase()))
    setSelectedCategories(mappedCats)
    setTags(Array.isArray(profile.tags) ? profile.tags : [])
  }, [categoriesCatalog])

  const handleSaveProfileFromCurrent = useCallback(() => {
    const name = String(newProfileName||'').trim()
    if (!name) return
    const catsSlugs = (selectedCategories || []).map(c => String(c?.slug || c?.slugEn || '').toLowerCase()).filter(Boolean)
    const tagsList = Array.isArray(tags) ? tags.map(t=>String(t).toLowerCase()) : []
    addProfile(name, catsSlugs, tagsList)
    setNewProfileName('')
    setAddProfileOpen(false)
  }, [newProfileName, selectedCategories, tags, addProfile])

  const startNextFromQueue = async (startAt = 0) => {
    const q = uploadQueueRef.current || []
    // Construir lista de pendientes (solo 'queued')
    const pendingIdxs = q.map((it, idx) => (it?.status === 'queued' ? idx : null)).filter((v) => v !== null)
    if (!pendingIdxs.length) {
      // Si ya no hay queued pero hay enqueued, la cola sigue activa (MEGA procesa en backend)
      const hasEnqueued = q.some(it => it?.status === 'enqueued')
      if (hasEnqueued) {
        setQueueIndex(-1)
        return
      }
      setIsProcessingQueue(false)
      setQueueIndex(-1)
      return
    }

    // Selección del siguiente
    let chosenIndex = null
    if (queueMode === 'scp') {
      // Si el ítem ya fue creado en backend (assetId), no depende de staging; elegirlo primero
      const ready = pendingIdxs.find((i) => Number.isFinite(q[i]?.createdAssetId) && q[i]?.createdAssetId)
      if (typeof ready === 'number') {
        chosenIndex = ready
      } else {
      // En SCP elegimos el que más avanzado esté en staging (siempre reevaluando)
      try {
        const id = batchId || `batch_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
        if (!batchId) setBatchId(id)
        const dirRel = `tmp/${id}`
        // Usar endpoint batch para evitar múltiples llamadas individuales
        const candidates = pendingIdxs
          .map((idx) => {
            const it = q[idx]
            const name = it?.archiveFile?.name
            const expected = it?.archiveFile?.size || 0
            return name && expected ? { idx, path: `${dirRel}/${name}`, expected } : null
          })
          .filter(Boolean)
        if (candidates.length > 0) {
          try {
            const r = await http.postData(`/assets/staged-status/batch`, {
              paths: candidates.map(c => c.path),
              expectedSizes: candidates.map(c => c.expected),
            })
            const arr = r?.data?.data || []
            let best = { idx: candidates[0].idx, percent: -1 }
            for (let i = 0; i < arr.length; i++) {
              const itStatus = arr[i]
              const pct = Number.isFinite(itStatus?.percent) ? Number(itStatus.percent) : 0
              if (pct > best.percent) best = { idx: candidates[i].idx, percent: pct }
            }
            chosenIndex = best.idx
          } catch {
            // Fallback: el primero pendiente si falla la llamada batch
            chosenIndex = pendingIdxs[0]
          }
        } else {
          chosenIndex = pendingIdxs[0]
        }
      } catch {
        // Fallback: el primero pendiente
        chosenIndex = pendingIdxs[0]
      }
      }
    } else {
      // HTTP: respetar orden, buscar primero >= startAt, si no hay, el primero pendiente
      const after = pendingIdxs.find((i) => i >= startAt)
      chosenIndex = typeof after === 'number' ? after : pendingIdxs[0]
    }
    if (chosenIndex === null || typeof chosenIndex !== 'number') {
      setIsProcessingQueue(false)
      setQueueIndex(-1)
      return
    }

    setQueueIndex(chosenIndex)
    const item = q[chosenIndex]
    // Pre-flight: validar unicidad del slug SOLO si aún no se creó el asset
    if (!(Number.isFinite(item?.createdAssetId) && item?.createdAssetId)) {
      const base = String(item?.meta?.title || '').toLowerCase().trim().replace(/[^a-z0-9-\s_]+/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,80)
      if (!base) {
        // sin título válido -> marcar error y continuar
        setUploadQueue(arr => arr.map((it, idx) => idx === chosenIndex ? { ...it, status: 'error' } : it))
        handleItemFinished(false)
        return
      }
      try {
        const res = await http.getData(`/assets/check-unique?slug=${encodeURIComponent(base)}`)
        if (res?.data?.conflict) {
          // conflicto -> marcar error y continuar
          setUploadQueue(arr => arr.map((it, idx) => idx === chosenIndex ? { ...it, status: 'error' } : it))
          handleItemFinished(false)
          return
        }
      } catch (e) {
        // si el check falla, por seguridad seguimos y dejamos que el backend decida
      }
    }
    // marcar running y poblar el formulario
    setUploadQueue(arr => arr.map((it, idx) => idx === chosenIndex ? { ...it, status: 'running' } : it))
    populateFormFromQueueItem(item)
    // pequeña espera para que React pinte el formulario antes de subir
    setTimeout(() => {
      if (queueMode === 'scp') {
        const existingId = item?.createdAssetId
        if (Number.isFinite(existingId) && existingId) {
          statusRef.current?.resumeExistingAsset?.(existingId)
          return
        }
        let id = batchId
        if (!id) {
          id = `batch_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
          setBatchId(id)
        }
        const dirRel = `tmp/${id}`
        statusRef.current?.startUploadScp?.({ scpDirRel: dirRel })
      } else {
        statusRef.current?.startUpload?.()
      }
    }, 50)
  }

  // --- Detección pasiva del ítem activo por SCP (solo visual) ---
  const [scpActiveIndex, setScpActiveIndex] = useState(null)
  useEffect(() => {
    if (queueMode !== 'scp' || !isProcessingQueue || !batchId) {
      setScpActiveIndex(null)
      return
    }
    let cancelled = false
    const tick = async () => {
      try {
        const id = batchId
        const pending = uploadQueue
          .map((it, idx) => ({ it, idx }))
          .filter(({ it }) => it.status === 'queued' || it.status === 'running')
        const dirRel = `tmp/${id}`
        const paths = []
        const expectedSizes = []
        const idxMap = []
        for (const { it, idx } of pending) {
          const name = it.archiveFile?.name
          const expected = it.archiveFile?.size || 0
          if (!name || !expected) continue
          paths.push(`${dirRel}/${name}`)
          expectedSizes.push(expected)
          idxMap.push(idx)
        }
        let best = { idx: null, percent: -1 }
        if (paths.length > 0) {
          try {
            const r = await http.postData(`/assets/staged-status/batch`, {
              paths,
              expectedSizes,
            })
            const arr = r?.data?.data || []
            for (let i = 0; i < arr.length; i++) {
              const itStatus = arr[i]
              const pct = Number.isFinite(itStatus?.percent) ? Number(itStatus.percent) : 0
              if (pct > best.percent) best = { idx: idxMap[i], percent: pct }
            }
          } catch {}
        }
        if (!cancelled) setScpActiveIndex(best.percent > 0 ? best.idx : null)
      } catch {
        if (!cancelled) setScpActiveIndex(null)
      }
    }
    const h = setInterval(tick, 2000)
    tick()
    return () => { cancelled = true; clearInterval(h) }
  }, [queueMode, isProcessingQueue, batchId, uploadQueue])

  const handleStartQueue = () => {
    if (isUploading) return
    if (accStatus !== 'connected' || !selectedAcc) return
    if (isProcessingQueue || uploadQueue.length === 0) return
    setIsProcessingQueue(true)
    setCooldown(0)
    if (cooldownTimerRef.current) { clearInterval(cooldownTimerRef.current); cooldownTimerRef.current = null }
    startNextFromQueue(0)
  }

  // Eliminado: reintentar desde el último completo

  // Reintentar un item puntual con error: repoblar formulario y lanzar upload
  const handleRetrySingle = (index) => {
    if (isUploading) return
    if (accStatus !== 'connected' || !selectedAcc) return
    const item = uploadQueue[index]
    if (!item || item.status !== 'error') return
    // resetear cooldown
    if (cooldownTimerRef.current) { clearInterval(cooldownTimerRef.current); cooldownTimerRef.current = null }
    setCooldown(0)
    // marcar como queued y preparar formulario
    setUploadQueue(arr => arr.map((it, idx) => idx === index ? { ...it, status: 'queued' } : it))
    setIsProcessingQueue(true)
    startNextFromQueue(index)
  }

  const handleItemFinished = (ok = true) => {
    const idx = queueIndex
    if (idx < 0) return
    // marcar estado del item
    setUploadQueue(arr => arr.map((it, i) => i === idx ? { ...it, status: ok ? 'success' : 'error' } : it))
    // countdown de 2s antes del siguiente
    let remain = 2
    setCooldown(remain)
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    cooldownTimerRef.current = setInterval(() => {
      remain -= 1
      setCooldown(remain)
      if (remain <= 0) {
        clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = null
        if (queueMode === 'scp') {
          // En SCP siempre reevaluamos el mejor candidato (puede ser fuera de orden)
          startNextFromQueue(0)
        } else {
          const next = idx + 1
          startNextFromQueue(next)
        }
      }
    }, 1000)
  }

  const handleItemEnqueued = (created) => {
    const id = Number(created?.id || 0)
    if (!id || !Number.isFinite(id)) return
    const idx = queueIndexRef.current
    if (!(Number.isFinite(idx) && idx >= 0)) return

    setUploadQueue(prev => {
      const next = (prev || []).map((it, i) => (i === idx ? { ...it, createdAssetId: id, status: 'enqueued' } : it))
      uploadQueueRef.current = next
      return next
    })

    // pasar al siguiente rápidamente (sin esperar MAIN/BACKUP)
    const nextStartAt = queueMode === 'scp' ? 0 : (idx + 1)
    setTimeout(() => { void startNextFromQueue(nextStartAt) }, 150)
  }

  // Polling liviano de progreso por ítem (para la tabla) usando /assets/:id/full-progress
  const backendPollInFlightRef = React.useRef(false)
  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      if (backendPollInFlightRef.current) return
      backendPollInFlightRef.current = true
      try {
        const q = uploadQueueRef.current || []
        const toPoll = q
          .filter(it => Number.isFinite(it?.createdAssetId) && it?.createdAssetId && it.status !== 'success' && it.status !== 'error')
          .slice(0, 12)

        if (!toPoll.length) return

        const updatesByItemId = {}

        for (const it of toPoll) {
          if (cancelled) return
          const assetId = it.createdAssetId
          try {
            const r = await http.getData(`/assets/${assetId}/full-progress`)
            const main = r?.data?.main || {}
            const mainStatus = String(main.status || '').toLowerCase()
            const overallPercentRaw = Number(r?.data?.overallPercent)
            const overallPercent = Number.isFinite(overallPercentRaw) ? Math.max(0, Math.min(100, overallPercentRaw)) : undefined
            const allDone = !!r?.data?.allDone
            const batch = r?.data?.batch || null

            let nextStatus = it.status
            if (mainStatus === 'failed') nextStatus = 'error'
            else if (allDone) nextStatus = 'success'
            else if (nextStatus === 'queued' || nextStatus === 'running') nextStatus = 'enqueued'

            updatesByItemId[it.id] = {
              status: nextStatus,
              backend: {
                mainStatus: mainStatus || undefined,
                mainProgress: Number.isFinite(Number(main.progress)) ? Math.max(0, Math.min(100, Number(main.progress))) : undefined,
                overallPercent,
                allDone,
                batch,
              },
            }
          } catch {
            // ignorar fallos transitorios de polling
          }
        }

        const keys = Object.keys(updatesByItemId)
        if (keys.length) {
          setUploadQueue(prev => prev.map(it => {
            const upd = updatesByItemId[it.id]
            return upd ? { ...it, ...upd } : it
          }))
        }
      } finally {
        backendPollInFlightRef.current = false
      }
    }

    const h = setInterval(() => { void tick() }, 2500)
    void tick()
    return () => { cancelled = true; clearInterval(h) }
  }, [])

  // Cancelar la subida actual y reiniciar desde el índice en curso
  const handleRestartFromCurrent = () => {
    if (accStatus !== 'connected' || !selectedAcc) return
    const idx = queueIndex
    // Si hay algo subiendo, cancelar
    try { statusRef.current?.cancelUpload?.() } catch {}
    // Limpiar cooldown
    if (cooldownTimerRef.current) { clearInterval(cooldownTimerRef.current); cooldownTimerRef.current = null }
    setCooldown(0)
    // Marcar item actual como 'queued' de nuevo si estaba running
    if (idx >= 0 && uploadQueue[idx]?.status === 'running') {
      setUploadQueue(arr => arr.map((it, i) => i === idx ? { ...it, status: 'queued' } : it))
      setIsProcessingQueue(true)
      startNextFromQueue(idx)
    } else if (idx >= 0) {
      // si no estaba running, igualmente reintentar desde idx
      setIsProcessingQueue(true)
      startNextFromQueue(idx)
    }
  }

  const handleResetQueue = () => {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current)
      cooldownTimerRef.current = null
    }
    setCooldown(0)
    setIsProcessingQueue(false)
    setQueueIndex(-1)
    setUploadQueue([])
    setSimilarityMap({})
    setSimilaritySelectedId(null)
    // Resetear cronómetro
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
    startTimeRef.current = null
    setElapsedMs(0)
    setActiveStage({ stage: 'idle', percent: 0, alias: '' })
    resetForm()
  }

  // Cuando la cola está activa, finalizarla automáticamente cuando todo esté success/error
  useEffect(() => {
    if (!isProcessingQueue) return
    if (uploadQueue.length > 0 && uploadQueue.every(it => it.status === 'success' || it.status === 'error')) {
      setIsProcessingQueue(false)
      setQueueIndex(-1)
    }
  }, [isProcessingQueue, uploadQueue])

  const usedMB = selectedAcc ? Math.max(0, selectedAcc.storageUsedMB || 0) : 0
  const totalMB = selectedAcc ? (selectedAcc.storageTotalMB > 0 ? selectedAcc.storageTotalMB : FREE_QUOTA_MB) : FREE_QUOTA_MB
  const usedPct = Math.min(100, totalMB ? (usedMB / totalMB) * 100 : 0)

  // Selección de cuenta desde el modal
  const handleSelectAccount = useCallback((acc, pct) => {
    setSelectedAcc(acc)
    setAccStatus('disconnected')
    setAccReason(undefined)
    setModalOpen(false)

    // Refrescar inmediatamente desde backend para evitar backups/estado stale
    const id = acc?.id
    if (id) {
      ;(async () => {
        const list = await fetchAccounts()
        const updated = (list || []).find(a => a.id === id)
        if (updated) {
          setSelectedAcc(prev => (prev && prev.id === id ? updated : prev))
        }
      })()
    }

    if (pct >= 80) {
      setTimeout(() => {
        window.alert('Esta cuenta ha superado el 80% de su almacenamiento. Considera usar otra cuenta o liberar espacio.')
      }, 0)
    }
  }, [fetchAccounts])

  // Bloqueo de navegación/recarga si hay cola o subida activa
  useEffect(() => {
    const message = 'Hay subidas en curso o elementos en cola. Si sales, podrías perder el progreso. ¿Deseas salir?'

    const handleBeforeUnload = (e) => {
      if (!shouldBlockNav) return
      e.preventDefault()
      e.returnValue = message
      return message
    }

    const handleDocumentClick = (e) => {
      if (!shouldBlockNav) return
      const anchor = e.target && e.target.closest ? e.target.closest('a[href]') : null
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      if (anchor.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      // sólo navegación interna
      try {
        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return
        e.preventDefault()
        const ok = window.confirm(message)
        if (ok) {
          navBypassRef.current = true
          router.push(url.pathname + url.search + url.hash)
          setTimeout(() => { navBypassRef.current = false }, 1000)
        }
      } catch { /* ignore */ }
    }

    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState
    const patchHistory = (original) => function (...args) {
      try {
        const url = args[2]
        const dest = typeof url === 'string' ? new URL(url, window.location.origin) : url
        if (shouldBlockNav && !navBypassRef.current && dest && dest.href && dest.pathname !== window.location.pathname) {
          const ok = window.confirm(message)
          if (!ok) return
        }
      } catch { /* ignore */ }
      return original.apply(this, args)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleDocumentClick, true)
    history.pushState = patchHistory(originalPushState)
    history.replaceState = patchHistory(originalReplaceState)

    const onPopState = (e) => {
      if (!shouldBlockNav) return
      const ok = window.confirm(message)
      if (!ok) {
        // revertir la navegación
        history.forward()
      }
    }
    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleDocumentClick, true)
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
      window.removeEventListener('popstate', onPopState)
    }
  }, [shouldBlockNav, router])

  // Arranque/parada del cronómetro cuando hay actividad (subida o cola activa)
  useEffect(() => {
    const anyActive = isUploading || queueActive
    if (anyActive) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now()
        setElapsedMs(0)
      }
      if (!elapsedTimerRef.current) {
        elapsedTimerRef.current = setInterval(() => {
          if (startTimeRef.current) setElapsedMs(Date.now() - startTimeRef.current)
        }, 1000)
      }
    } else {
      if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
      // no reiniciamos elapsedMs; queda congelado hasta próximo inicio
    }
    return () => {
      // cleanup si el efecto se re-ejecuta o desmonta
      // no limpiamos si sigue activo; el bloque superior lo gestiona
    }
  }, [isUploading, queueActive])

  const sidebarQueueItem = useMemo(() => {
    if (similaritySelectedId) {
      return (uploadQueue || []).find((it) => it?.id === similaritySelectedId) || null
    }
    if (queueIndex >= 0 && (uploadQueue || [])[queueIndex]) return uploadQueue[queueIndex]
    return uploadQueue?.length ? uploadQueue[uploadQueue.length - 1] : null
  }, [uploadQueue, similaritySelectedId, queueIndex])

  const sidebarSimilarity = sidebarQueueItem ? similarityMap?.[sidebarQueueItem.id] : null

  // Informar a la ConsoleBar global que este dashboard tiene un sidebar derecho fijo
  useEffect(() => {
    try {
      document.documentElement.style.setProperty('--dash-right-offset', `${RIGHT_SIDEBAR_WIDTH}px`)
    } catch {}
    return () => {
      try { document.documentElement.style.setProperty('--dash-right-offset', '0px') } catch {}
    }
  }, [RIGHT_SIDEBAR_WIDTH])

  // Thumbs para el ítem en cola (File -> objectURL). Se regeneran por cambio de ítem.
  useEffect(() => {
    const files = Array.isArray(sidebarQueueItem?.images) ? sidebarQueueItem.images : []
    if (!files.length) {
      setQueueItemThumbs([])
      return
    }

    const created = files
      .map((f) => {
        try {
          const src = URL.createObjectURL(f)
          return { src, name: f?.name || '' }
        } catch {
          return null
        }
      })
      .filter(Boolean)

    setQueueItemThumbs(created)
    return () => {
      created.forEach((t) => {
        try { URL.revokeObjectURL(t.src) } catch {}
      })
    }
  }, [sidebarQueueItem?.id])

  return (
    <div
      className="p-3"
      style={{
        display: 'grid',
        gridTemplateColumns: `minmax(0, 1fr) ${RIGHT_SIDEBAR_WIDTH}px`,
        gap: 0,
        alignItems: 'start',
      }}
    >
      <style jsx global>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .scroll-x { overflow-x: auto; white-space: nowrap; }
        .img-thumb { display:inline-block; margin-right:8px; border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.12); }
        .img-thumb img { display:block; height:120px; }
        .floating-overlay-btn { position:fixed; z-index:9999; background:#7b61ff; color:#fff; border:none; padding:5px 18px; border-radius:32px; font-weight:600; box-shadow:0 6px 18px -4px rgba(0,0,0,0.5); cursor:pointer; transition:background .25s, transform .15s; }
        .floating-overlay-btn:hover { background:#927dff; }
        .floating-overlay-btn:active { transform:scale(.94); }
        .floating-overlay-btn:focus-visible { outline:3px solid #fff; outline-offset:3px; }
        .dark-overlay-root { position:fixed; inset:0; z-index:10000; background:rgba(0, 0, 0, 0.863); display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 24px; }
        .dark-overlay-close { background:#222; color:#fff; border:1px solid #555; padding:14px 26px; font-size:16px; font-weight:600; border-radius:10px; cursor:pointer; letter-spacing:.5px; box-shadow:0 4px 14px -2px rgba(0,0,0,.6); transition:background .2s, transform .15s; }
        .dark-overlay-close:hover { background:#333; }
        .dark-overlay-close:active { transform:scale(.95); }
        .dark-overlay-close:focus-visible { outline:3px solid #7b61ff; outline-offset:3px; }
      `}</style>

      {/* Botón flotante para activar/desactivar overlay oscuro */}
      <button
        type="button"
        className="floating-overlay-btn"
        style={{ left: 10 , bottom: 10 }}
        aria-label={darkOverlay ? 'Ocultar overlay oscuro' : 'Mostrar overlay oscuro'}
        onClick={() => setDarkOverlay(v => !v)}
      >
        {darkOverlay ? 'Cerrar overlay' : 'Oscurecer pantalla'}
      </button>

      {/* Overlay oscuro superpuesto */}
      {darkOverlay && (
        <div className="dark-overlay-root" role="dialog" aria-modal="true" aria-label="Overlay oscuro">
          <div style={{ maxWidth:680, width:'100%', textAlign:'center' }}>
            <h2 style={{ margin:'0 0 24px', fontSize:34, fontWeight:700, color:'#7e7e7e' }}>Overlay oscuro activo</h2>
            <p style={{ margin:'0 0 36px', fontSize:16, lineHeight:1.6, color:'#888888' }}>
              Has activado el modo de oscurecimiento manual. Usa esto para centrar tu atención en otra ventana o evitar distracciones temporales.
            </p>
            <button
              type="button"
              className="dark-overlay-close"
              onClick={() => setDarkOverlay(false)}
            >
              Cerrar overlay
            </button>
          </div>
        </div>
      )}

      <div style={{ minWidth: 0 }}>
      {/* 1) Cabecera */}
      <HeaderBar
        selectedAcc={selectedAcc}
        megaStatusNode={<MegaStatus status={accStatus} reason={accReason} />}
        accStatus={accStatus}
        usedPct={usedPct}
        usedMB={usedMB}
        totalMB={totalMB}
        onOpenModal={() => setModalOpen(true)}
        onTest={testSelectedAccount}
      />

      <Dialog
        open={profilesModalOpen}
        onClose={() => setProfilesModalOpen(false)}
        fullWidth
        maxWidth="md"
        sx={{
          zIndex: 22500,
        }}
      >
        <DialogTitle sx={{ pr: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography fontWeight={800}>Perfiles</Typography>
            <IconButton onClick={() => setProfilesModalOpen(false)} size="small" aria-label="Cerrar">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
            <Box sx={{ mb: 1 }}>
              <TextField
                value={profilesSearch}
                onChange={(e) => setProfilesSearch(e.target.value)}
                fullWidth
                size="small"
                label="Buscar perfiles"
                placeholder="Nombre, categorías o tags..."
              />
            </Box>
          <ProfilesBar
              profiles={filteredProfiles}
            onApply={(p) => {
              applyProfile?.(p)
              setProfilesModalOpen(false)
            }}
            onDelete={(name) => removeProfile(name)}
            onImport={importProfiles}
            onExport={exportProfiles}
            addProfileOpen={addProfileOpen}
            setAddProfileOpen={setAddProfileOpen}
            newProfileName={newProfileName}
            setNewProfileName={setNewProfileName}
            onSaveCurrent={handleSaveProfileFromCurrent}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={importProfilesOpen} onClose={() => setImportProfilesOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Importar perfiles (JSON)</DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Pega un array JSON de perfiles con formato: {'{'}"name","categories":[],"tags":[]{'}'}
          </Typography>
          <TextField
            value={importProfilesText}
            onChange={(e) => setImportProfilesText(e.target.value)}
            multiline
            minRows={10}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportProfilesOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={applyImportedProfiles}>Guardar en DB</Button>
        </DialogActions>
      </Dialog>

      {/* Barra de acciones (debajo de perfiles): cola primero y luego subida individual */}
      <Card className="glass" sx={{ mt: 2, mb: 2 }}>
        <CardContent
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: 1,
          }}
        >
          {/* Botón para alternar modo HTTP/SCP */}
          <AppButton
            type="button"
            onClick={() => {
              if (queueActive || isUploading) return
              const next = queueMode === 'http' ? 'scp' : 'http'
              setQueueMode(next)
              if (next === 'scp') {
                const id = `batch_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
                setBatchId(id)
                // Iniciar hold largo al activar SCP (usuario puede tardar horas en scp + rellenar)
                startScpHold(360)
              } else {
                setBatchId('')
                // Volver a HTTP: liberar hold SCP
                releaseScpHold()
              }
            }}
            variant={queueMode === 'scp' ? 'purple' : 'cyan'}
            styles={{ color: '#fff', ...ACTION_BTN_STYLES }}
            disabled={queueActive || isUploading}
          >
            {queueMode === 'scp' ? 'Modo SCP (activo)' : 'Activar modo SCP'}
          </AppButton>

          <AppButton
            type="button"
            onClick={handleAddToQueue}
            variant={canEnqueue ? 'cyan' : 'dangerOutline'}
            styles={{ color: '#fff', ...ACTION_BTN_STYLES }}
            disabled={!canEnqueue || isUploading}
          >
            Añadir a la cola
          </AppButton>

          {queueMode === 'scp' && scpHoldId && (
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                background: 'rgba(0, 180, 255, 0.14)',
                border: '1px solid rgba(0, 180, 255, 0.35)',
                color: 'info.light',
                fontSize: 12,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
              title="Mientras esto esté activo, el cron evita mega-logout/reset para no interferir con tus subidas."
            >
              {scpHoldLabel}
            </Box>
          )}
          {queueMode === 'scp' && scpHoldId && (
            <AppButton
              type="button"
              onClick={releaseScpHold}
              variant={'dangerOutline'}
              styles={{ color: '#fff', ...ACTION_BTN_STYLES }}
              disabled={queueActive || isUploading}
              title="Libera la protección anti-cron. Útil si ya terminaste (o quieres testear cuentas) y no vas a seguir haciendo SCP ahora mismo."
            >
              Liberar protección
            </AppButton>
          )}
          {allCompleted ? (
            <AppButton
              type="button"
              onClick={handleResetQueue}
              variant={'cyan'}
              styles={{ color: '#fff', ...ACTION_BTN_STYLES }}
              disabled={queueActive || isUploading}
            >
              Limpiar e iniciar nueva cola
            </AppButton>
          ) : (
            <AppButton
              type="button"
              onClick={handleStartQueue}
              variant={uploadQueue.length > 0 && hasQueuedItems && !queueActive && !isUploading && accStatus === 'connected' && selectedAcc ? 'cyan' : 'dangerOutline'}
              styles={{ color: '#fff', ...ACTION_BTN_STYLES }}
              disabled={uploadQueue.length === 0 || !hasQueuedItems || queueActive || isUploading || accStatus !== 'connected' || !selectedAcc}
            >
              {queueMode === 'scp' ? 'Iniciar cola (SCP)' : 'Iniciar cola'} {cooldown > 0 ? `(siguiente en ${cooldown}s)` : ''}
            </AppButton>
          )}
          <AppButton
            type="button"
            onClick={handleRestartFromCurrent}
            variant={accStatus === 'connected' && selectedAcc && (isProcessingQueue || isUploading) ? 'cyan' : 'dangerOutline'}
            styles={{ color: '#fff', ...ACTION_BTN_STYLES }}
            disabled={accStatus !== 'connected' || !selectedAcc || (!isProcessingQueue && !isUploading)}
          >
            Reiniciar cola desde este punto
          </AppButton>
          {queueMode === 'scp' && (
            <AppButton
              type="button"
              onClick={async () => {
                // Asegurar hold mientras el usuario copia/usa el comando y hace scp en otra terminal
                await startScpHold(360)
                try {
                  const r = await http.getData('/assets/scp-config')
                  const cfg = r?.data || {}
                  if (cfg.host) setScpHost(cfg.host)
                  if (cfg.user) setScpUser(cfg.user)
                  if (cfg.port) setScpPort(String(cfg.port))
                  if (cfg.remoteBase) setScpRemoteBase(cfg.remoteBase)
                } catch {}
                setScpModalOpen(true)
              }}
              variant={'cyan'}
              styles={{ color: '#fff', ...ACTION_BTN_STYLES }}
            >
              Ver comando SCP
            </AppButton>
          )}
          <AppButton
            type="button"
            onClick={async () => {
              const ok = await ensureUniqueSlugOrSetError()
              if (!ok) return
              if (queueMode === 'scp') {
                if (!batchId) {
                  window.alert('Activa el modo SCP primero')
                  return
                }
                // Directorio relativo a uploads/ para staging via SCP
                const dirRel = `tmp/${batchId}`
                statusRef.current?.startUploadScp?.({ scpDirRel: dirRel })
              } else {
                statusRef.current?.startUpload()
              }
            }}
            variant={canUpload ? 'purple' : 'dangerOutline'}
            styles={{ ...(canUpload ? { color: '#fff' } : undefined), ...ACTION_BTN_STYLES }}
            aria-label={canUpload ? 'Subir' : 'No permitido'}
            disabled={!canUpload || isUploading || queueActive}
          >
            {queueMode === 'scp' ? (canUpload ? 'Registrar desde SCP' : 'Completa los campos') : (canUpload ? 'Subir' : 'Completa los campos')}
          </AppButton>
        </CardContent>
        {/* {queueMode === 'scp' && batchId && (
          <Box sx={{ mt: 1, mb: 1, px: 2 }}>
            <Typography variant="caption" sx={{ color: 'info.light', display: 'block', lineHeight: 1.6 }}>
              Modo SCP activo: Copia el archivo principal de cada ítem al servidor en la ruta <b>uploads/tmp/{batchId}/&lt;NOMBRE_DEL_ARCHIVO&gt;</b>.
              Puedes usar WinSCP/SFTP o scp. Una vez esté completo, pulsa "Registrar desde SCP" para crear el asset y encolarlo a MEGA.
            </Typography>
          </Box>
        )} */}
          {(!canUpload || slugConflict.conflict) && (
            <Box
              sx={{
                mt: 1,
                mb: 1,
                px: 2,
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(4, minmax(0, 1fr))',
                },
                columnGap: 2,
                rowGap: 0.25,
              }}
            >
              {missingReasons.map((m, idx) => (
                <Typography
                  key={idx}
                  variant="caption"
                  sx={{ color: 'error.main', lineHeight: 1.2, fontSize: 12 }}
                >
                  • {m}
                </Typography>
              ))}
            </Box>
          )}
      </Card>
      

      {/* 2) Layout de carga */}
      <Box sx={{ ms: 'auto' }}>
  <Grid
    container
    spacing={0}
    alignItems="stretch"
    sx={{
      display: 'flex',
      alignItems: 'stretch',
      gap: 2,
      flexWrap: { xs: 'wrap', md: 'nowrap' },
    }}
  >
          {/* Izquierda: 5/12 → AssetFileSection arriba, Metadata abajo */}
            <Grid
              item
              sx={{
                width: '100%',
                ['@media (min-width:768px)']: {
                  width: 'auto',
                  flex: '0 0 30%',
                  maxWidth: '30%',
                },
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >

              <AssetFileSection
                setTitle={setTitle}
                setTitleEn={setTitleEn}
                onFileSelected={setArchiveFile}
                disabled={isUploading}
              />

              <MetadataSection
                title={title} setTitle={setTitle}
                titleEn={titleEn} setTitleEn={setTitleEn}
                selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories}
                tags={tags} setTags={setTags}
                isPremium={isPremium} setIsPremium={setIsPremium}
                disabled={isUploading}
                errors={{...fieldErrors, titleMessage: titleErrorMessage}}
                onOpenProfiles={() => setProfilesModalOpen(true)}
              />

          </Grid>

          {/* Derecha: 7/12 → selector de imágenes (ocupa el resto) */}
            <Grid
              item
              sx={{
                width: '100%',
                ['@media (min-width:768px)']: {
                  width: 'auto',
                  flex: '1 1 0',
                  minWidth: 0,
                },
                display: 'flex',
                flexDirection: 'column',
              }}
            >
            <Stack spacing={2} sx={{ flex: 1 }}>
              <ImagesSection
                scpBatchPaths={scpBatchPaths}
                scpBatchExpectedSizes={scpBatchExpectedSizes}
                imageFiles={imageFiles}
                previewIndex={previewIndex}
                onPrev={prevSlide}
                onNext={nextSlide}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onOpenFilePicker={openFilePicker}
                fileInputRef={fileInputRef}
                onSelectFiles={onSelectFiles}
                onRemove={removeImage}
                onSelectPreview={(idx)=>setPreviewIndex(idx)}
                onReorder={onReorderImages}
                disabled={isUploading}
              />
            </Stack>
          </Grid>
        </Grid>

        {/* Abajo: barra/estado a lo ancho */}
        <Card className="glass" sx={{ mt: 2 }}>
          <CardHeader title="Estado" />
          <CardContent>
            <StatusSection
              key={statusKey}
              ref={statusRef}
              finishOnEnqueued={isProcessingQueue}
              queueProgress={queueProgress}
              getFormData={() => ({
                archiveFile,
                title,
                titleEn,
                // enviar categorías seleccionadas para el FormData
                categories: selectedCategories,
                // mantener category legacy en blanco
                category: '',
                tags,
                isPremium,
                accountId: selectedAcc?.id,
                images: imageFiles.map(f => f.file)
              })}
              onUploadingChange={setIsUploading}
              onProgressUpdate={(p) => setActiveStage(p)}
              onAssetCreated={(created) => {
                const id = Number(created?.id || 0)
                if (!id || !Number.isFinite(id)) return
                // Guardar en el ítem actual para poder reanudar sin depender del staging SCP
                setUploadQueue(arr => arr.map((it, i) => (i === queueIndex ? { ...it, createdAssetId: id } : it)))
              }}
              onEnqueued={(created) => {
                if (isProcessingQueue) handleItemEnqueued(created)
              }}
              onDone={async () => {
                setUploadFinished(true)
                try {
                  if (selectedAcc?.id) {
                    const id = selectedAcc.id
                    const prevAcc = selectedAcc
                    await http.postData(`${API_BASE}/${id}/test`, {})
                    const list = await fetchAccounts()
                    const acc = (list || []).find(a => a.id === id) || prevAcc
                    setSelectedAcc(acc)
                    setAccStatus(mapBackendToUiStatus(acc.status))
                    setAccReason(acc.statusMessage || undefined)
                  }
                } catch (e) {
                  console.error('refresh account after upload failed', e)
                }
                try {
                  // Notificar a widgets interesados que hubo una subida exitosa
                  window.dispatchEvent(new CustomEvent('assets:uploaded'))
                } catch {}
                // Si estamos procesando la cola, pasar al siguiente tras 10s
                if (isProcessingQueue) {
                  handleItemFinished(true)
                }
              }}
            />
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {uploadFinished && (
                <AppButton
                  type="button"
                  onClick={resetForm}
                  variant="purple"
                  width="300px"
                  styles={{ color: '#fff' }}
                  aria-label="Subir otro STL"
                  disabled={queueActive}
                >
                  Subir otro STL
                </AppButton>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Listado de la cola */}
        <Card className="glass" sx={{ mt: 2, mb: 3 }}>
          <CardHeader
            title="Cola de subidas"
            subheader={
              queueActive
                ? (cooldown > 0 ? `Procesando… (siguiente en ${cooldown}s)` : 'Procesando…')
                : (allCompleted
                    ? 'Completada'
                    : (uploadQueue.length ? `${uploadQueue.length} en cola` : 'Vacía'))
            }
            action={(() => {
              const totalBytes = (uploadQueue||[]).reduce((s, it) => s + (it.sizeBytes || 0), 0)
              const totalMB = totalBytes / (1024 * 1024)
              const showTime = (isUploading || queueActive) || elapsedMs > 0
              return (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  {`Total: ${totalMB.toFixed(1)} MB`}
                  {showTime ? ` • Tiempo: ${formatDuration(elapsedMs)}` : ''}
                </Typography>
              )
            })()}
          />
          <CardContent>
            {uploadQueue.length === 0 ? (
              <Typography variant="body2" sx={{ opacity: 0.7 }}>No hay elementos en la cola</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderSpacing: 0, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color:'#9aa4c7' }}>
                      <th style={{ padding:'6px 8px' }}>#</th>
                      <th style={{ padding:'6px 8px' }}>Nombre</th>
                      <th style={{ padding:'6px 8px' }}>Archivo</th>
                      <th style={{ padding:'6px 8px' }}>Imágenes</th>
                      <th style={{ padding:'6px 8px' }}>Categorías</th>
                      <th style={{ padding:'6px 8px' }}>Tags</th>
                      <th style={{ padding:'6px 8px' }}>Peso</th>
                      <th style={{ padding:'6px 8px' }}>Estado</th>
                      <th style={{ padding:'6px 8px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadQueue.map((it, idx) => (
                      <tr key={it.id} style={{ background: idx === queueIndex ? 'rgba(181,156,255,0.08)' : 'transparent' }}>
                        <td style={{ padding:'8px' }}>{idx+1}</td>
                        <td style={{ padding:'8px' }}>{it.meta?.title || '-'}</td>
                        <td style={{ padding:'8px', maxWidth:300 }}>
                          {it?.archiveFile?.name ? (
                            <div style={{ display:'flex', alignItems:'center', gap:8, maxWidth:380 }}>
                              <div
                                role="button"
                                title="Click para copiar"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard?.writeText(it.archiveFile.name)
                                    setCopiedNameMap((m)=>({ ...m, [it.id]: true }))
                                    setTimeout(()=> setCopiedNameMap((m)=>({ ...m, [it.id]: false })), 1200)
                                  } catch {}
                                }}
                                style={{
                                  cursor:'pointer',
                                  maxWidth:320,
                                  overflow:'hidden',
                                  textOverflow:'ellipsis',
                                  whiteSpace:'nowrap',
                                  padding:'2px 6px',
                                  borderRadius:6,
                                  border:'1px solid rgba(255,255,255,0.15)',
                                  background:'rgba(255,255,255,0.06)'
                                }}
                              >
                                {it.archiveFile.name}
                              </div>
                              {copiedNameMap[it.id] && (
                                <span style={{ color:'#98e6b5', fontSize:12 }}>Copiado</span>
                              )}
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                        <td style={{ padding:'8px' }}>{it.images?.length || 0}</td>
                        <td style={{ padding:'8px', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {(it.meta?.categories || []).map((c,i)=> (typeof c === 'string' ? c : (c?.name || c?.nameEn || c?.slug))).filter(Boolean).slice(0,3).join(', ')}{(it.meta?.categories?.length||0) > 3 ? ` +${(it.meta.categories.length-3)}` : ''}
                        </td>
                        <td style={{ padding:'8px', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {(it.meta?.tags || []).map(t=>String(t)).filter(Boolean).slice(0,3).join(', ')}{(it.meta?.tags?.length||0) > 3 ? ` +${(it.meta.tags.length-3)}` : ''}
                        </td>
                        <td style={{ padding:'8px' }}>{formatBytes(it.sizeBytes)}</td>
                        <td style={{ padding:'8px' }}>
                          <span style={statusPillStyle(it.status)}>{statusLabel(it)}</span>
                          {it.status === 'enqueued' && it?.backend?.batch?.asset?.stage && (
                            <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.85, color: '#b8a7ff' }}>
                              {String(it.backend.batch.asset.stage).replace(/-/g, ' ')}
                            </span>
                          )}
                          {queueMode === 'scp' && scpActiveIndex === idx && (
                            <span style={{
                              marginLeft: 8,
                              padding: '2px 6px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: 'rgba(123,97,255,0.15)',
                              color: '#b8a7ff',
                              border: '1px solid rgba(123,97,255,0.35)'
                            }}>SCP activo</span>
                          )}
                        </td>
                        <td style={{ padding:'8px' }}>
                          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                            <Button
                              size="small"
                              color={it.approved ? 'success' : 'secondary'}
                              variant="outlined"
                              onClick={() => {
                                setSimilaritySelectedId(it.id)
                                const st = similarityMap?.[it.id]?.status
                                if (st !== 'done' && st !== 'loading') startSimilarityCheck(it)
                              }}
                              sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: 12, lineHeight: 1.1 }}
                            >
                              {it.approved ? 'Aprobado' : 'Similares'}
                            </Button>

                            {it.status === 'queued' ? (
                              <Button
                                size="small"
                                color="warning"
                                variant="outlined"
                                onClick={() => {
                                  setUploadQueue(arr => arr.filter(x => x.id !== it.id))
                                  setSimilarityMap(m => {
                                    const next = { ...(m || {}) }
                                    delete next[it.id]
                                    return next
                                  })
                                  setSimilaritySelectedId(prev => (prev === it.id ? null : prev))
                                }}
                                sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: 12, lineHeight: 1.1 }}
                              >
                                Eliminar
                              </Button>
                            ) : it.status === 'error' ? (
                              <Button size="small" color="primary" variant="outlined" 
                                onClick={() => handleRetrySingle(idx)}
                                disabled={accStatus !== 'connected' || !selectedAcc}
                              >
                                Reintentar este
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Modal: comando SCP */}
      <Dialog
        open={scpModalOpen}
        onClose={() => {
          setScpModalOpen(false)
          // Si el usuario ya no está en SCP y no hay cola activa, liberar hold
          if (queueMode !== 'scp' && !queueActive && !isUploading) {
            releaseScpHold()
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Subida por SCP</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Configura tu destino y copia el comando. Ruta remota calculada: {`${scpRemoteBase.replace(/\\/g,'/').replace(/\/$/, '')}/uploads/tmp/${batchId || '<batchId>'}/`}
          </Typography>
          <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField label="Host" value={scpHost} onChange={e=>setScpHost(e.target.value)} fullWidth />
            <TextField label="Usuario" value={scpUser} onChange={e=>setScpUser(e.target.value)} fullWidth />
            <TextField label="Puerto" value={scpPort} onChange={e=>setScpPort(e.target.value)} fullWidth />
          </Stack>
          <TextField label="Ruta remota base" value={scpRemoteBase} onChange={e=>setScpRemoteBase(e.target.value)} fullWidth sx={{ mb:2 }} />
          <Box sx={{ p: 1.5, borderRadius: 1, background: 'rgba(255,255,255,0.06)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 13 }}>
            {/* Nombre de carpeta recomendado (local) */}
            {(() => {
              const folderName = `batch_${batchId || '<batchId>'}`
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div><span style={{ fontWeight: 700, fontSize: 15 }}>Nombre de carpeta recomendado (local):</span> {folderName}</div>
                  <Button size="small" onClick={() => navigator.clipboard?.writeText(folderName)}>Copiar</Button>
                </div>
              )
            })()}

            <div style={{ fontWeight: 700, fontSize: 15 }}>Crear carpeta del batch (una vez)</div>
            {(() => {
              const cmd = `ssh ${scpUser || 'user'}@${scpHost || 'host'} "mkdir -p ${scpRemoteBase.replace(/\\/g,'/').replace(/\/$/, '')}/uploads/tmp/${batchId || '<batchId>'}"`
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>{cmd}</div>
                  <Button size="small" onClick={() => navigator.clipboard?.writeText(cmd)}>Copiar</Button>
                </div>
              )
            })()}
            <br />
            <div style={{ fontWeight: 700, fontSize: 15 }}>Ejemplo un archivo (adapta la ruta local)</div>
            {(() => {
              const cmd = `scp -P ${scpPort || 22} "C:\\ruta\\a\\tu\\archivo.zip" ${scpUser || 'user'}@${scpHost || 'host'}:${scpRemoteBase.replace(/\\/g,'/').replace(/\/$/, '')}/uploads/tmp/${batchId || '<batchId>'}/`
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>{cmd}</div>
                  <Button size="small" onClick={() => navigator.clipboard?.writeText(cmd)}>Copiar</Button>
                </div>
              )
            })()}
            <br />
            <div style={{ fontWeight: 700, fontSize: 15 }}>Subir SOLO el contenido de una carpeta (evita subir la carpeta raíz)</div>
            {(() => {
              const cmd = `cd C:\\stl-hub\\batch_${batchId || '<batchId>'}; scp -P ${scpPort || 22} -r .\\* ${scpUser || 'user'}@${scpHost || 'host'}:${scpRemoteBase.replace(/\\/g,'/').replace(/\/$/, '')}/uploads/tmp/${batchId || '<batchId>'}/`
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>{cmd}</div>
                  <Button size="small" onClick={() => navigator.clipboard?.writeText(cmd)}>Copiar</Button>
                </div>
              )
            })()} 
          </Box>
          {/* Tip de PowerShell eliminado a pedido */}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScpModalOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de selección de cuenta extraído */}
      <SelectMegaAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        accounts={orderedMainAccounts}
        freeQuotaMB={FREE_QUOTA_MB}
        onSelectAccount={handleSelectAccount}
      />
      </div>

      <RightSidebar
        side="right"
        collapsible={false}
        inFlow={false}
        open
        width={RIGHT_SIDEBAR_WIDTH}
        title="Búsqueda"
      >
        {!sidebarQueueItem ? (
          <Typography variant="body2" sx={{ opacity: 0.8, px: 1 }}>
            Selecciona un ítem de la cola y pulsa “Similares”.
          </Typography>
        ) : (
          <Box sx={{ px: 1 }}>
            <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Ítem en cola</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5, wordBreak: 'break-word' }}>
              {sidebarQueueItem?.archiveFile?.name || '(sin archivo)'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75, display: 'block' }}>
              {formatBytes(sidebarQueueItem?.sizeBytes || 0)} • {(sidebarQueueItem?.images || []).length} imágenes
            </Typography>

            {queueItemThumbs.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, mt: 0.9, flexWrap: 'wrap' }}>
                {queueItemThumbs.slice(0, 12).map((t, i) => (
                  <Box
                    key={`${sidebarQueueItem?.id}_qimg_${i}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openImgPreview(t.src)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openImgPreview(t.src) }}
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      outline: 'none',
                      '&:focus-visible': { boxShadow: '0 0 0 2px rgba(123,97,255,0.55)' },
                    }}
                    title={t.name || 'Ver'}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.src}
                      alt={t.name || ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                  </Box>
                ))}
              </Box>
            )}

            <Divider sx={{ my: 1.25, opacity: 0.2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Assets similares</Typography>
              {sidebarSimilarity?.status === 'loading' && (
                <CircularProgress size={14} />
              )}
              <Box sx={{ flex: 1 }} />
              {sidebarQueueItem?.approved ? (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'success.main',
                    fontWeight: 800,
                    letterSpacing: 0.2,
                    px: 0.9,
                    py: 0.35,
                    borderRadius: 999,
                    border: '1px solid rgba(76, 175, 80, 0.35)',
                    background: 'rgba(76, 175, 80, 0.10)',
                    lineHeight: 1.1,
                  }}
                >
                  Aprobado
                </Typography>
              ) : (
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={() => {
                    if (!sidebarQueueItem?.id) return
                    if (sidebarQueueItem?.status !== 'queued') return
                    setUploadQueue(arr => arr.map(x => x.id === sidebarQueueItem.id ? { ...x, approved: true } : x))
                  }}
                  disabled={sidebarQueueItem?.status !== 'queued' || sidebarSimilarity?.status === 'loading'}
                  sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: 12, lineHeight: 1.1 }}
                >
                  Aprobar
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => {
                  if (!sidebarQueueItem?.id) return
                  if (sidebarQueueItem?.status !== 'queued') return
                  setUploadQueue(arr => arr.filter(x => x.id !== sidebarQueueItem.id))
                  setSimilarityMap(m => {
                    const next = { ...(m || {}) }
                    delete next[sidebarQueueItem.id]
                    return next
                  })
                  setSimilaritySelectedId(prev => (prev === sidebarQueueItem.id ? null : prev))
                }}
                disabled={sidebarQueueItem?.status !== 'queued' || sidebarSimilarity?.status === 'loading'}
                sx={{ minWidth: 'auto', px: 1, py: 0.25, fontSize: 12, lineHeight: 1.1 }}
              >
                Eliminar
              </Button>
            </Box>

            {sidebarSimilarity?.status === 'error' && (
              <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.75 }}>
                {sidebarSimilarity?.error || 'No se pudo buscar'}
              </Typography>
            )}

            {sidebarSimilarity?.status === 'done' && (
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.75 }}>
                {(sidebarSimilarity?.items || []).length} encontrados
              </Typography>
            )}

            {!sidebarSimilarity && (
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.75 }}>
                Aún no se ha ejecutado la búsqueda para este ítem.
              </Typography>
            )}

            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.1 }}>
              {(sidebarSimilarity?.items || []).map((a) => {
                const imgs = Array.isArray(a?.images) ? a.images : []
                const size = a?.fileSizeB ?? a?.archiveSizeB ?? 0
                const titleText = a?.title || a?.titleEn || a?.slug || `#${a?.id}`
                return (
                  <Box
                    key={a?.id || a?.slug || Math.random()}
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                      {titleText}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.25, wordBreak: 'break-word' }}>
                      {a?.archiveName || '(sin archiveName)'}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.25 }}>
                      {formatBytes(size)} • {imgs.length} imágenes
                    </Typography>
                    {imgs.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                        {imgs.slice(0, 6).map((rel, i) => {
                          const src = makeUploadsUrl(rel)
                          if (!src) return null
                          return (
                            <Box
                              key={`${a?.id || a?.slug}_${i}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => openImgPreview(src)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openImgPreview(src) }}
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.12)',
                                background: 'rgba(0,0,0,0.2)',
                                cursor: 'pointer',
                                outline: 'none',
                                '&:focus-visible': { boxShadow: '0 0 0 2px rgba(123,97,255,0.55)' },
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                loading="lazy"
                              />
                            </Box>
                          )
                        })}
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>

            {sidebarSimilarity?.status === 'done' && (sidebarSimilarity?.items || []).length === 0 && (
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 1 }}>
                No se encontraron coincidencias.
              </Typography>
            )}
          </Box>
        )}

        {/* Modal de previsualización de imagen */}
        <Dialog
          open={imgPreviewOpen}
          onClose={() => setImgPreviewOpen(false)}
          maxWidth="lg"
          fullWidth
          sx={{
            zIndex: 22000,
            '& .MuiBackdrop-root': { zIndex: -1 },
          }}
        >
          <DialogTitle>Vista previa</DialogTitle>
          <DialogContent>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 320,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgPreviewSrc}
                alt=""
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImgPreviewOpen(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      </RightSidebar>
    </div>
  )
}
