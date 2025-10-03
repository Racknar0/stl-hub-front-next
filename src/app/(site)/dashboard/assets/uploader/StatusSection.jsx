import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Typography, Box, LinearProgress, Stack } from '@mui/material'
import HttpService from '@/services/HttpService'

const http = new HttpService()

const StatusSection = forwardRef(function StatusSection(props, ref) {
  const { getFormData, onDone, onUploadingChange, onProgressUpdate } = props
  const [serverProgress, setServerProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  // Estado principal MEGA
  const [megaStatus, setMegaStatus] = useState('idle') // idle | processing | published | failed
  const [megaProgress, setMegaProgress] = useState(0)
  // Réplicas
  const [replicas, setReplicas] = useState([]) // [{id, accountId, alias, status, progress}]
  const [overallProgress, setOverallProgress] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const pollRef = useRef(null)

  const [serverDone, setServerDone] = useState(false)
  const [megaDone, setMegaDone] = useState(false)

  const clearPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  const startUpload = async () => {
    if (uploading) return
    try {
      setUploading(true)
      onUploadingChange?.(true)
      setServerProgress(0)
  setMegaStatus('idle')
  setMegaProgress(0)
  setReplicas([])
  setOverallProgress(0)
  setAllDone(false)
      setServerDone(false)
      setMegaDone(false)

      const { archiveFile, title, titleEn, categories, tags, isPremium, accountId, images } = getFormData?.() || {}
      if (!archiveFile) throw new Error('Selecciona el archivo del asset')
      if (!accountId) throw new Error('Selecciona una cuenta')

      // Un solo request con archivo + imágenes
      const fd = new FormData()
      fd.append('archive', archiveFile)
      ;(images || []).forEach((f) => fd.append('images', f))
      fd.append('title', title || '')
      if (titleEn) fd.append('titleEn', titleEn)
      // Enviar categorías como slugs
      if (Array.isArray(categories) && categories.length) {
        const slugs = categories.map(c => String(c.slug || c).toLowerCase())
        fd.append('categories', JSON.stringify(slugs))
      }
      fd.append('tags', JSON.stringify((tags || []).map(t => String(t).trim().toLowerCase())))
      fd.append('isPremium', String(Boolean(isPremium)))
      fd.append('accountId', String(accountId))

      const resp = await http.postFormData('/assets/upload', fd, {
        onUploadProgress: (evt) => {
          if (!evt.total) return
          const pct = Math.round((evt.loaded * 100) / evt.total)
          setServerProgress(Math.min(99, pct))
          try { onProgressUpdate?.({ stage: 'server', percent: Math.min(99, pct) }) } catch {}
        }
      })

      // Archivo e imágenes ya en backend, asset creado y MEGA encolado
  setServerProgress(100)
      setServerDone(true)
  try { onProgressUpdate?.({ stage: 'server', percent: 100 }) } catch {}
      const created = resp.data
      setMegaStatus('processing')

      // Polling de progreso completo (main + réplicas)
      clearPoll()
      pollRef.current = setInterval(async () => {
        try {
          const r = await http.getData(`/assets/${created.id}/full-progress`)
          // main
          const main = r.data?.main || { status: 'PROCESSING', progress: 0 }
          // DEBUG opcional (se puede retirar luego)
          // console.log('[FULL-PROGRESS]', r.data)
          const repArrRaw = Array.isArray(r.data?.replicas) ? r.data.replicas : []
          const repArr = repArrRaw.map(it => ({ ...it, progress: Math.min(100, Math.max(0, it.progress || 0)) }))
          // expected replicas (from main account backups) to create placeholders
          const expected = Array.isArray(r.data?.expectedReplicas) ? r.data.expectedReplicas : []
          let merged = repArr
          if (expected.length) {
            merged = expected.map(exp => {
              const found = repArr.find(rp => rp.accountId === exp.accountId)
              return found || { id: `expected-${exp.accountId}`, accountId: exp.accountId, alias: exp.alias, status: 'PENDING', progress: 0 }
            })
          }
          setMegaProgress(main.progress ?? 0)
          setReplicas(merged)
          const mainStatus = (main.status || '').toLowerCase()
          if (mainStatus === 'published') setMegaStatus('published')
          else if (mainStatus === 'failed') setMegaStatus('failed')
          else setMegaStatus('processing')
          setMegaDone(mainStatus === 'published')
          const overall = r.data?.overallPercent ?? main.progress ?? 0
          setOverallProgress(overall)

          // Notificar etapa activa: mega principal o primer backup en PROCESO
          try {
            const mainStatus = (main.status || '').toLowerCase()
            if (mainStatus === 'processing' && (main.progress ?? 0) < 100) {
              onProgressUpdate?.({ stage: 'mega', percent: Math.max(0, Math.min(100, Math.round(main.progress ?? 0))) })
            } else {
              const activeReplica = merged.find(rp => (rp.status || '').toLowerCase() === 'processing')
              if (activeReplica) {
                onProgressUpdate?.({ stage: 'backup', percent: Math.max(0, Math.min(100, Math.round(activeReplica.progress || 0))), alias: activeReplica.alias || String(activeReplica.accountId || '') })
              } else if (doneFlag) {
                onProgressUpdate?.({ stage: 'idle', percent: 100 })
              }
            }
          } catch {}
            
          const doneFlag = !!r.data?.allDone
          setAllDone(doneFlag)
          if (doneFlag) {
            clearPoll()
            setUploading(false)
            onUploadingChange?.(false)
            onDone?.(created)
          }
        } catch (e) {
          // mantener último estado y seguir intentando unos ciclos
          console.warn('[UPLOAD][poll] error', e?.message)
        }
      }, 1200)
    } catch (e) {
      console.error('[UPLOAD] error:', e)
      setUploading(false)
      onUploadingChange?.(false)
    } finally {
      // no finalizar "uploading" aquí; se hará al terminar MEGA o en error
    }
  }

  useImperativeHandle(ref, () => ({ startUpload, isAllDone: () => allDone, isUploading: () => uploading }))
  useEffect(() => () => { clearPoll() }, [])

  const ProgressRow = ({ label, value, status, height = 26 }) => {
    const isIndeterminate = status === 'processing' && value === 0
    const color = status === 'failed' ? 'error' : (status === 'published' || status === 'completed' || status === 'success' ? 'success' : 'primary')
    return (
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>{label}</Typography>
          {status === 'failed' && <Typography variant="caption" color="error.main">Fallo</Typography>}
          {(status === 'published' || status === 'completed') && <Typography variant="caption" color="success.main">OK</Typography>}
        </Stack>
        <Box sx={{ position: 'relative', width: '100%', borderRadius: 999, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)' }}>
          <LinearProgress
            color={color}
            variant={isIndeterminate ? 'indeterminate' : 'determinate'}
            value={isIndeterminate ? undefined : value}
            sx={{ height, borderRadius: 999, [`& .MuiLinearProgress-bar`]: { borderRadius: 999 } }}
          />
          {!isIndeterminate && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Typography variant="caption" sx={{ opacity: 0.9, color: '#fff', fontSize: '0.9rem' }}>{value}%</Typography>
            </Box>
          )}
        </Box>
      </Box>
    )
  }

  const serverColor = serverDone ? 'success' : 'primary'

  return (
    <Box>
      <ProgressRow label="Subida al servidor" value={serverProgress} status={serverDone ? 'completed' : 'processing'} height={30} />
      <ProgressRow label="MEGA principal" value={megaProgress} status={megaStatus} height={30} />
      {replicas.length > 0 && replicas.map(r => (
        <ProgressRow
          key={r.id}
            label={`Replica ${r.alias || r.accountId}`}
            value={r.progress || 0}
            status={(r.status || '').toLowerCase()}
            height={24}
          />
        ))}
      {replicas.length > 0 && (
        <ProgressRow label="Total" value={overallProgress} status={allDone ? 'completed' : 'processing'} height={28} />
      )}
    </Box>
  )
})

export default StatusSection
