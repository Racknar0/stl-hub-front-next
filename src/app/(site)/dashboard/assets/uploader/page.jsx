'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tooltip,
  Button,
  TextField,
  LinearProgress,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
  Link as MUILink,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import LinkIcon from '@mui/icons-material/Link'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import HttpService from '@/services/HttpService'
import HeaderBar from './HeaderBar'
import ImagesSection from './ImagesSection'
import AssetFileSection from './AssetFileSection'
import MetadataSection from './MetadataSection'
import StatusSection from './StatusSection'
import AppButton from '@/components/layout/Buttons/Button'
import NotInterestedIcon from '@mui/icons-material/NotInterested'

const http = new HttpService()
const API_BASE = '/accounts'
const FREE_QUOTA_MB = Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480

const StatusChip = ({ status }) => {
  const map = {
    CONNECTED: { label: 'OK', color: 'success' },
    EXPIRED: { label: 'Expirada', color: 'warning' },
    ERROR: { label: 'ERROR', color: 'error' },
    SUSPENDED: { label: 'Suspendida', color: 'default' },
  }
  const { label, color } = map[status] || { label: status, color: 'default' }
  return <Chip label={label} color={color} size="small" />
}

const MegaStatus = ({ status, reason }) => {
  if (!status || status === 'idle') return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" color="text.secondary">Sin cuenta</Typography>
    </Stack>
  )
  if (status === 'disconnected') return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" color="text.secondary">Sin conexión</Typography>
    </Stack>
  )
  if (status === 'connecting') return (
    <Stack direction="row" spacing={1} alignItems="center">
      <AutorenewIcon color="info" fontSize="small" className="spin" />
      <Typography variant="body2">Conectando…</Typography>
    </Stack>
  )
  if (status === 'connected') return (
    <Stack direction="row" spacing={1} alignItems="center">
      <CheckCircleIcon color="success" fontSize="small" />
      <Typography variant="body2">Conectado</Typography>
    </Stack>
  )
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip title={reason || 'Fallo'}>
        <ErrorOutlineIcon color="error" fontSize="small" />
      </Tooltip>
      <Typography variant="body2">Fallo</Typography>
    </Stack>
  )
}

function mapBackendToUiStatus(s) {
  if (s === 'CONNECTED') return 'connected'
  if (s === 'ERROR' || s === 'SUSPENDED') return 'failed'
  return 'failed'
}

export default function UploadAssetPage() {
  const [accounts, setAccounts] = useState([])
  const [selectedAcc, setSelectedAcc] = useState(null)
  const [accStatus, setAccStatus] = useState('idle')
  const [accReason, setAccReason] = useState(undefined)
  const [modalOpen, setModalOpen] = useState(false)

  // Form metadata (mock)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
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
  const [expandedAccId, setExpandedAccId] = useState(null)
  // Eliminado: estados de listado de assets en este modal

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

  const testSelectedAccount = async () => {
    if (!selectedAcc) return
    try {
      setAccStatus('connecting')
      setAccReason(undefined)
      await http.postData(`${API_BASE}/${selectedAcc.id}/test`, {})
      await fetchAccounts()
      const acc = accounts.find(a => a.id === selectedAcc.id) || selectedAcc
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
  const prevSlide = () => setPreviewIndex(p => (imageFiles.length ? (p - 1 + imageFiles.length) % imageFiles.length : -1))
  const nextSlide = () => setPreviewIndex(p => (imageFiles.length ? (p + 1) % imageFiles.length : -1))

  const canUpload = (
    accStatus === 'connected' &&
    !!selectedAcc &&
    !!archiveFile &&
    imageFiles.length >= 1 &&
    !!(title && String(title).trim().length > 0) &&
    !!(category && String(category).trim().length > 0) &&
    Array.isArray(tags) && tags.filter(t => String(t).trim().length > 0).length >= 2 &&
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
    setCategory('')
    setTags([])
    setIsPremium(true)
    setUploadFinished(false)
    setStatusKey(k => k + 1) // fuerza remount de StatusSection para limpiar progresos
  }

  const usedMB = selectedAcc ? Math.max(0, selectedAcc.storageUsedMB || 0) : 0
  const totalMB = selectedAcc ? (selectedAcc.storageTotalMB > 0 ? selectedAcc.storageTotalMB : FREE_QUOTA_MB) : FREE_QUOTA_MB
  const usedPct = Math.min(100, totalMB ? (usedMB / totalMB) * 100 : 0)

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

      {/* 2) Layout de carga */}
      <Box sx={{ maxWidth: 1600, ms: 'auto' }}>
        <Grid  spacing={2} >
          {/* Izquierda */}
          <Grid item >
            <Stack spacing={2}>
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
                disabled={isUploading}
              />

              <AssetFileSection setTitle={setTitle} onFileSelected={setArchiveFile} disabled={isUploading} />
            </Stack>
          </Grid>

          {/* Derecha */}
          <Grid item xs={12} md={5}>
            <Stack spacing={2}>
              <MetadataSection
                title={title} setTitle={setTitle}
                category={category} setCategory={setCategory}
                tags={tags} setTags={setTags}
                isPremium={isPremium} setIsPremium={setIsPremium}
                disabled={isUploading}
              />

              <Card className="glass">
                <CardHeader title="Estado" />
                <CardContent>
                  <StatusSection
                    key={statusKey}
                    ref={statusRef}
                    getFormData={() => ({
                      archiveFile,
                      title,
                      category,
                      tags,
                      isPremium,
                      accountId: selectedAcc?.id,
                      images: imageFiles.map(f => f.file)
                    })}
                    onUploadingChange={setIsUploading}
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
                    }}
                  />
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
                    {uploadFinished ? (
                      <AppButton
                        type="button"
                        onClick={resetForm}
                        variant="purple"
                        width="300px"
                        styles={{ color: '#fff' }}
                        aria-label="Subir otro STL"
                      >
                        Subir otro STL
                      </AppButton>
                    ) : (
                      <AppButton
                        type="button"
                        onClick={() => statusRef.current?.startUpload()
                        }
                        variant={canUpload ? 'purple' : 'dangerOutline'}
                        width="300px"
                        styles={canUpload ? { color: '#fff' } : undefined}
                        aria-label={canUpload ? 'Subir' : 'No permitido'}
                        disabled={!canUpload || isUploading}
                      >
                        {canUpload ? 'Subir' : <NotInterestedIcon fontSize="small" />}
                      </AppButton>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* Modal de selección de cuenta */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Seleccionar cuenta MEGA</DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
            <Grid container spacing={2}>
              {accounts.map((acc) => (
                <Grid item xs={12} md={4} key={acc.id}>
                  <Card
                    className="glass"
                    sx={{
                      cursor: 'pointer',
                      border: '2px solid rgba(255,255,255,0.28)',
                      borderRadius: 2,
                      position: 'relative',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.05s ease',
                      '&:hover': {
                        borderColor: '#7C4DFF',
                        boxShadow: '0 0 0 3px rgba(124,77,255,0.25)'
                      },
                      '&:active': { transform: 'scale(0.997)' }
                    }}
                  >
                    {/* Barra verde si se verificó hoy */}
                    {(() => { const dt = acc.lastCheckAt && new Date(acc.lastCheckAt); const now = new Date(); return dt && !isNaN(dt) && dt.getFullYear()===now.getFullYear() && dt.getMonth()===now.getMonth() && dt.getDate()===now.getDate(); })() && (
                      <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, bgcolor: 'success.main', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, zIndex: 1 }} />
                    )}
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6">{acc.alias}</Typography>
                          <StatusChip status={acc.status} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">{acc.email}</Typography>
                        <Box>
                          <Typography variant="caption">Uso de almacenamiento</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(() => {
                              const total = acc.storageTotalMB > 0 ? acc.storageTotalMB : FREE_QUOTA_MB
                              const used = Math.max(0, acc.storageUsedMB || 0)
                              return Math.min(100, (used / total) * 100)
                            })()}
                            sx={{ my: 0.5 }}
                          />
                          <Typography variant="caption">{acc.storageUsedMB} MB / {acc.storageTotalMB > 0 ? `${acc.storageTotalMB} MB` : `${FREE_QUOTA_MB} MB`}</Typography>
                        </Box>
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption">Archivos</Typography>
                            <Typography variant="body2">{acc.fileCount ?? 0}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption">Carpetas</Typography>
                            <Typography variant="body2">{acc.folderCount ?? 0}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="caption">Última verificación</Typography>
                            <Typography variant="body2">{acc.lastCheckAt ? new Date(acc.lastCheckAt).toLocaleString() : '-'}</Typography>
                          </Grid>
                        </Grid>
                        <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1}>
                          <Button
                            variant="contained"
                            onClick={() => {
                              setSelectedAcc(acc)
                              setAccStatus('disconnected')
                              setAccReason(undefined)
                              setModalOpen(false)
                            }}
                          >
                            Seleccionar
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
      </Dialog>
    </div>
  )
}
