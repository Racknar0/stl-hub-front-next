import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Typography, Box, LinearProgress } from '@mui/material'
import HttpService from '@/services/HttpService'

const http = new HttpService()

const StatusSection = forwardRef(function StatusSection(props, ref) {
  const { getFormData, onDone, onUploadingChange } = props
  const [serverProgress, setServerProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const [megaStatus, setMegaStatus] = useState('idle') // idle | processing | published | failed
  const [megaProgress, setMegaProgress] = useState(0)
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
        }
      })

      // Archivo e imágenes ya en backend, asset creado y MEGA encolado
      setServerProgress(100)
      setServerDone(true)
      const created = resp.data
      setMegaStatus('processing')

      // Polling a estado de MEGA hasta published/failed
      clearPoll()
      pollRef.current = setInterval(async () => {
        try {
          const r = await http.getData(`/assets/${created.id}/progress`)
          const st = r.data?.status
          const p = r.data?.progress ?? 0
          setMegaProgress(p)
          if (st === 'PUBLISHED') {
            setMegaStatus('published')
            setMegaDone(true)
            clearPoll()
            setUploading(false)
            onUploadingChange?.(false)
            onDone?.(created)
          } else if (st === 'FAILED') {
            setMegaStatus('failed')
            clearPoll()
            setUploading(false)
            onUploadingChange?.(false)
          } else {
            setMegaStatus('processing')
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

  useImperativeHandle(ref, () => ({ startUpload }))
  useEffect(() => () => { clearPoll() }, [])

  const MegaBar = () => {
    const isIndeterminate = megaStatus === 'processing' && megaProgress === 0
    const value = isIndeterminate ? undefined : megaProgress
    const megaColor = megaStatus === 'failed' ? 'error' : (megaDone ? 'success' : 'primary')
    return (
      <Box sx={{ mt: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Subida a MEGA</Typography>
        <Box sx={{ position: 'relative', width: '100%', borderRadius: 999, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)' }}>
          <LinearProgress
            color={megaColor}
            variant={isIndeterminate ? 'indeterminate' : 'determinate'}
            value={value}
            sx={{ height: 30, borderRadius: 999, [`& .MuiLinearProgress-bar`]: { borderRadius: 999 } }}
          />
          {!isIndeterminate && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Typography variant="caption" sx={{ opacity: 0.9, color: '#fff', fontSize: '1rem' }}>{megaProgress}%</Typography>
            </Box>
          )}
        </Box>
        {megaDone && <Typography variant="caption" color="success.main">OK</Typography>}
        {megaStatus === 'failed' && <Typography variant="caption" color="error.main">Error</Typography>}
      </Box>
    )
  }

  const serverColor = serverDone ? 'success' : 'primary'

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Subida al servidor</Typography>
      <Box sx={{ position: 'relative', width: '100%', borderRadius: 999, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)' }}>
        <LinearProgress
          color={serverColor}
          variant="determinate"
          value={serverProgress}
          sx={{ height: 30, borderRadius: 999, [`& .MuiLinearProgress-bar`]: { borderRadius: 999 } }}
        />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <Typography variant="caption" sx={{ opacity: 0.9, color: '#fff', fontSize: '1rem' }}>{serverProgress}%</Typography>
        </Box>
      </Box>
      {serverDone && <Typography variant="caption" color="success.main">OK</Typography>}

      <MegaBar />
    </Box>
  )
})

export default StatusSection
