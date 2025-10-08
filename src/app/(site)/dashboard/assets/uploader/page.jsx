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
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material'
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
  const LS_PROFILES_KEY = 'uploader_profiles_v1'
  const [profiles, setProfiles] = useState([]) // [{ name, categories: string[], tags: string[] }]
  const [categoriesCatalog, setCategoriesCatalog] = useState([]) // para mapear slugs -> objetos
  const [addProfileOpen, setAddProfileOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')

  const listProfiles = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(LS_PROFILES_KEY)) || [] } catch { return [] }
  }, [])
  const saveProfiles = useCallback((arr) => {
    localStorage.setItem(LS_PROFILES_KEY, JSON.stringify(arr))
  }, [])
  const addProfile = useCallback((name, catsSlugs = [], tagsList = []) => {
    const trimmed = String(name || '').trim()
    if (!trimmed) return
    const all = listProfiles()
    const idx = all.findIndex(p => String(p.name).toLowerCase() === trimmed.toLowerCase())
    const next = { name: trimmed, categories: Array.from(new Set(catsSlugs)), tags: Array.from(new Set(tagsList)) }
    if (idx >= 0) all[idx] = next; else all.push(next)
    saveProfiles(all)
    setProfiles(all)
  }, [listProfiles, saveProfiles])
  const removeProfile = useCallback((name) => {
    const all = listProfiles()
    const next = all.filter(p => String(p.name).toLowerCase() !== String(name||'').toLowerCase())
    saveProfiles(next)
    setProfiles(next)
  }, [listProfiles, saveProfiles])

  // ==== Cola de subidas (solo frontend) ====
  const [uploadQueue, setUploadQueue] = useState([]) // [{id, archiveFile, images:File[], meta:{...}, sizeBytes, status}]
  const [isProcessingQueue, setIsProcessingQueue] = useState(false)
  const [queueIndex, setQueueIndex] = useState(-1)
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
  const [scpHost, setScpHost] = useState(process.env.NEXT_PUBLIC_SCP_HOST || '')
  const [scpUser, setScpUser] = useState(process.env.NEXT_PUBLIC_SCP_USER || '')
  const [scpPort, setScpPort] = useState(String(process.env.NEXT_PUBLIC_SCP_PORT || '22'))
  const [scpRemoteBase, setScpRemoteBase] = useState(process.env.NEXT_PUBLIC_SCP_REMOTE_BASE || '/var/www')

  // Derivados de estado para la cola
  const queueActive = isProcessingQueue || cooldown > 0
  const hasQueuedItems = uploadQueue.some(it => it.status === 'queued')
  const allCompleted = uploadQueue.length > 0 && uploadQueue.every(it => it.status === 'success' || it.status === 'error')
  const hasActiveQueued = uploadQueue.some(it => it.status === 'queued' || it.status === 'running')
  const shouldBlockNav = isUploading || queueActive || hasActiveQueued
  const navBypassRef = React.useRef(false)

  const remotePath = '/STLHUB/assets/slug-demo/'

  // Eliminado: formatMB y fetchAccountAssets aquí

  const fetchAccounts = async () => {
    try {
      const res = await http.getData(API_BASE)
      const list = res.data || []
      setAccounts(list)
      if (selectedAcc) {
        const updated = list.find(a => a.id === selectedAcc.id)
        if (updated) {
          setSelectedAcc(updated)
          // Importante: NO actualizar accStatus automáticamente aquí para no simular conexión
          // Mantener el estado actual (idle/disconnected/connecting/connected) controlado por acciones del usuario
        }
      }
    } catch (e) {
      console.error('fetchAccounts error', e)
    }
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

  // Actualizar título del tab con el progreso de la cola (x/y completo)
  const [activeStage, setActiveStage] = useState({ stage: 'idle', percent: 0, alias: '' })
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
    setProfiles(listProfiles())
    ;(async () => {
      try {
        const resCats = await http.getData('/categories')
        const items = (resCats.data?.items || []).map(c => ({ id: c.id, name: c.name, nameEn: c.nameEn, slug: c.slug, slugEn: c.slugEn }))
        setCategoriesCatalog(items)
      } catch (e) { setCategoriesCatalog([]) }
    })()
  }, [listProfiles])

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
    try {
      setAccStatus('connecting')
      setAccReason(undefined)
      await http.postData(`${API_BASE}/${selectedAcc.id}/test`, {})
      await fetchAccounts()
      const acc = accounts.find(a => a.id === selectedAcc.id) || selectedAcc
      console.log('testSelectedAccount acc:', acc)
      setSelectedAcc(acc)
      setAccStatus(mapBackendToUiStatus(acc.status))
      setAccReason(acc.statusMessage || undefined)
    } catch (e) {
      console.error(e)
      await fetchAccounts()
      const acc = accounts.find(a => a.id === selectedAcc.id) || selectedAcc
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
    if (!archiveFile) list.push('Selecciona el archivo principal (.zip/.rar)')
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
    // snapshot rápido del formulario y archivos
    if (!archiveFile || imageFiles.length < 1) return;
    if (accStatus !== 'connected' || !selectedAcc) return;
    if (!Array.isArray(selectedCategories) || selectedCategories.length < 1) return;
    if (!(tagsCleanCount >= 2)) return;
    const unique = await ensureUniqueSlugOrSetError()
    if (!unique) return
    const sizeBytes = (archiveFile?.size || 0) + imageFiles.reduce((s, f) => s + (f.file?.size || f.size || 0), 0)
    const item = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      archiveFile,
      images: imageFiles.map((f) => f.file || f),
      meta: { title, titleEn, categories: selectedCategories, tags, isPremium, accountId: selectedAcc?.id || null, },
      sizeBytes,
      status: 'queued', // queued | running | success | error
    }
    setUploadQueue((q) => [...q, item])
    // limpiar el formulario para permitir agregar otro
    resetForm()
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
    let q = uploadQueue
    if (!q.length || startAt >= q.length) {
      setIsProcessingQueue(false)
      setQueueIndex(-1)
      return
    }
    // En modo SCP: detectar si hay algún archivo del batch que ya esté subiendo (size > 0) y priorizarlo
    let chosenIndex = startAt
    if (queueMode === 'scp') {
      try {
        const id = batchId || `batch_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
        if (!batchId) setBatchId(id)
        const pending = q
          .map((it, idx) => ({ it, idx }))
          .filter(({ it }) => it.status === 'queued' || it.status === 'running')
        let best = { idx: chosenIndex, percent: -1 }
        for (const { it, idx } of pending) {
          const name = it.archiveFile?.name
          const expected = it.archiveFile?.size || 0
          if (!name || !expected) continue
          const dirRel = `tmp/${id}`
          try {
            const r = await http.getData(`/assets/staged-status?path=${encodeURIComponent(`${dirRel}/${name}`)}&expectedSize=${expected}`)
            const pct = Number.isFinite(r?.data?.percent) ? Number(r.data.percent) : 0
            if (pct > best.percent) best = { idx, percent: pct }
          } catch {}
        }
        if (best.percent > 0 && best.idx !== chosenIndex) {
          chosenIndex = best.idx
        }
      } catch {}
    }

    setQueueIndex(chosenIndex)
    const item = q[chosenIndex]
    // Pre-flight: validar unicidad del slug del título del item
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
    // marcar running y poblar el formulario
    setUploadQueue(arr => arr.map((it, idx) => idx === chosenIndex ? { ...it, status: 'running' } : it))
    populateFormFromQueueItem(item)
    // pequeña espera para que React pinte el formulario antes de subir
    setTimeout(() => {
      if (queueMode === 'scp') {
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
    // countdown de 10s antes del siguiente
    let remain = 10
    setCooldown(remain)
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    cooldownTimerRef.current = setInterval(() => {
      remain -= 1
      setCooldown(remain)
      if (remain <= 0) {
        clearInterval(cooldownTimerRef.current)
        cooldownTimerRef.current = null
        const next = idx + 1
        startNextFromQueue(next)
      }
    }, 1000)
  }

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
    // Resetear cronómetro
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
    startTimeRef.current = null
    setElapsedMs(0)
    resetForm()
  }

  const usedMB = selectedAcc ? Math.max(0, selectedAcc.storageUsedMB || 0) : 0
  const totalMB = selectedAcc ? (selectedAcc.storageTotalMB > 0 ? selectedAcc.storageTotalMB : FREE_QUOTA_MB) : FREE_QUOTA_MB
  const usedPct = Math.min(100, totalMB ? (usedMB / totalMB) * 100 : 0)

  // Selección de cuenta desde el modal
  const handleSelectAccount = useCallback((acc, pct) => {
    setSelectedAcc(acc)
    setAccStatus('disconnected')
    setAccReason(undefined)
    setModalOpen(false)
    if (pct >= 80) {
      setTimeout(() => {
        window.alert('Esta cuenta ha superado el 80% de su almacenamiento. Considera usar otra cuenta o liberar espacio.')
      }, 0)
    }
  }, [])

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

  return (
    <div className="dashboard-content p-3">
      <style jsx global>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .scroll-x { overflow-x: auto; white-space: nowrap; }
        .img-thumb { display:inline-block; margin-right:8px; border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.12); }
        .img-thumb img { display:block; height:120px; }
      `}</style>

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

      <ProfilesBar
        profiles={profiles}
        onApply={applyProfile}
        onDelete={(name) => removeProfile(name)}
        addProfileOpen={addProfileOpen}
        setAddProfileOpen={setAddProfileOpen}
        newProfileName={newProfileName}
        setNewProfileName={setNewProfileName}
        onSaveCurrent={handleSaveProfileFromCurrent}
      />

      {/* Barra de acciones (debajo de perfiles): cola primero y luego subida individual */}
      <Card className="glass" sx={{ mt: 2, mb: 2 }}>
        <CardContent sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
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
              } else {
                setBatchId('')
              }
            }}
            variant={queueMode === 'scp' ? 'purple' : 'cyan'}
            width="260px"
            styles={{ color: '#fff' }}
            disabled={queueActive || isUploading}
          >
            {queueMode === 'scp' ? 'Modo SCP (activo)' : 'Activar modo SCP (beta)'}
          </AppButton>

          <AppButton
            type="button"
            onClick={handleAddToQueue}
            variant={canEnqueue ? 'cyan' : 'dangerOutline'}
            width="220px"
            styles={{ color: '#fff' }}
            disabled={!canEnqueue || isUploading}
          >
            Añadir a la cola
          </AppButton>
          {allCompleted ? (
            <AppButton
              type="button"
              onClick={handleResetQueue}
              variant={'cyan'}
              width="220px"
              styles={{ color: '#fff' }}
              disabled={queueActive || isUploading}
            >
              Limpiar e iniciar nueva cola
            </AppButton>
          ) : (
            <AppButton
              type="button"
              onClick={handleStartQueue}
              variant={uploadQueue.length > 0 && hasQueuedItems && !queueActive && !isUploading && accStatus === 'connected' && selectedAcc ? 'cyan' : 'dangerOutline'}
              width="220px"
              styles={{ color: '#fff' }}
              disabled={uploadQueue.length === 0 || !hasQueuedItems || queueActive || isUploading || accStatus !== 'connected' || !selectedAcc}
            >
              {queueMode === 'scp' ? 'Iniciar cola (SCP)' : 'Iniciar cola'} {cooldown > 0 ? `(siguiente en ${cooldown}s)` : ''}
            </AppButton>
          )}
          <AppButton
            type="button"
            onClick={handleRestartFromCurrent}
            variant={accStatus === 'connected' && selectedAcc && (isProcessingQueue || isUploading) ? 'cyan' : 'dangerOutline'}
            width="300px"
            styles={{ color: '#fff' }}
            disabled={accStatus !== 'connected' || !selectedAcc || (!isProcessingQueue && !isUploading)}
          >
            Reiniciar cola desde este punto
          </AppButton>
          {queueMode === 'scp' && (
            <AppButton
              type="button"
              onClick={() => setScpModalOpen(true)}
              variant={'cyan'}
              width="220px"
              styles={{ color: '#fff' }}
              disabled={isUploading}
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
            width="300px"
            styles={canUpload ? { color: '#fff' } : undefined}
            aria-label={canUpload ? 'Subir' : 'No permitido'}
            disabled={!canUpload || isUploading || queueActive}
          >
            {queueMode === 'scp' ? (canUpload ? 'Registrar desde SCP' : 'Completa los campos') : (canUpload ? 'Subir' : 'Completa los campos')}
          </AppButton>
        </CardContent>
        {queueMode === 'scp' && batchId && (
          <Box sx={{ mt: 1, mb: 1, px: 2 }}>
            <Typography variant="caption" sx={{ color: 'info.light', display: 'block', lineHeight: 1.6 }}>
              Modo SCP activo: Copia el archivo principal de cada ítem al servidor en la ruta <b>uploads/tmp/{batchId}/&lt;NOMBRE_DEL_ARCHIVO&gt;</b>.
              Puedes usar WinSCP/SFTP o scp. Una vez esté completo, pulsa "Registrar desde SCP" para crear el asset y encolarlo a MEGA.
            </Typography>
          </Box>
        )}
          {(!canUpload || slugConflict.conflict) && (
          <Box sx={{ mt: 1, mb: 1, px: 2 }}>
            {missingReasons.map((m, idx) => (
              <Typography key={idx} variant="caption" sx={{ color: 'error.main', display: 'block', lineHeight: 1.6 }}>
                • {m}
              </Typography>
            ))}
          </Box>
        )}
      </Card>
      

      {/* 2) Layout de carga */}
      <Box sx={{ ms: 'auto' }}>
  <Grid container spacing={2} alignItems="stretch" sx={{ display: 'flex', alignItems: 'stretch' }}>
          {/* Izquierda: 5/12 → AssetFileSection arriba, Metadata abajo */}
            <Grid item sx={{ width: '100%', ['@media (min-width:768px)']: { width: '30%' }, display: 'flex', flexDirection: 'column' }}>

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
              />

          </Grid>

          {/* Derecha: 7/12 → selector de imágenes (ocupa el resto) */}
            <Grid item sx={{ width: '100%', ['@media (min-width:768px)']: { width: '67%' }, display: 'flex', flexDirection: 'column' }}>
            <Stack spacing={2} sx={{ flex: 1 }}>
              <ImagesSection
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
              onDone={async () => {
                setUploadFinished(true)
                try {
                  if (selectedAcc?.id) {
                    await http.postData(`${API_BASE}/${selectedAcc.id}/test`, {})
                    await fetchAccounts()
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
        <Card className="glass" sx={{ mt: 2 }}>
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
                        <td style={{ padding:'8px' }}>{it.images?.length || 0}</td>
                        <td style={{ padding:'8px', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {(it.meta?.categories || []).map((c,i)=> (typeof c === 'string' ? c : (c?.name || c?.nameEn || c?.slug))).filter(Boolean).slice(0,3).join(', ')}{(it.meta?.categories?.length||0) > 3 ? ` +${(it.meta.categories.length-3)}` : ''}
                        </td>
                        <td style={{ padding:'8px', maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {(it.meta?.tags || []).map(t=>String(t)).filter(Boolean).slice(0,3).join(', ')}{(it.meta?.tags?.length||0) > 3 ? ` +${(it.meta.tags.length-3)}` : ''}
                        </td>
                        <td style={{ padding:'8px' }}>{formatBytes(it.sizeBytes)}</td>
                        <td style={{ padding:'8px' }}>
                          <span style={statusPillStyle(it.status)}>{it.status}</span>
                        </td>
                        <td style={{ padding:'8px' }}>
                          {it.status === 'queued' ? (
                            <Button size="small" color="warning" variant="outlined" onClick={() => setUploadQueue(arr => arr.filter(x => x.id !== it.id))}>Eliminar</Button>
                          ) : it.status === 'error' ? (
                            <Button size="small" color="primary" variant="outlined" 
                              onClick={() => handleRetrySingle(idx)}
                              disabled={accStatus !== 'connected' || !selectedAcc}
                            >
                              Reintentar este
                            </Button>
                          ) : null}
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
      <Dialog open={scpModalOpen} onClose={() => setScpModalOpen(false)} maxWidth="md" fullWidth>
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
            <div># Crear carpeta del batch (una vez)</div>
            <div>{`ssh ${scpUser || 'user'}@${scpHost || 'host'} "mkdir -p ${scpRemoteBase.replace(/\\/g,'/').replace(/\/$/, '')}/uploads/tmp/${batchId || '<batchId>'}"`}</div>
            <br />
            <div># Ejemplo un archivo (adapta la ruta local)</div>
            <div>{`scp -P ${scpPort || 22} "C:\\ruta\\a\\tu\\archivo.zip" ${scpUser || 'user'}@${scpHost || 'host'}:${scpRemoteBase.replace(/\\/g,'/').replace(/\/$/, '')}/uploads/tmp/${batchId || '<batchId>'}/`}</div>
            <br />
            <div># Ejemplo por carpeta local (recomendado para varios):</div>
            <div>{`scp -P ${scpPort || 22} -r "C:\\stl-hub\\cola-${batchId || '<batchId>'}\\" ${scpUser || 'user'}@${scpHost || 'host'}:${scpRemoteBase.replace(/\\/g,'/').replace(/\/$/, '')}/uploads/tmp/${batchId || '<batchId>'}/`}</div>
          </Box>
          <Typography variant="caption" sx={{ display:'block', mt: 1, opacity: 0.8 }}>
            Tip: crea la carpeta local C:\stl-hub\cola-{batchId || '<batchId>'} con todos los .zip/.rar y usa el comando con -r.
          </Typography>
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
  )
}
