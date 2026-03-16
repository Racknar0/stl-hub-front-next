import React, { useState, useRef } from 'react'
import {
  Card,
  CardContent,
  Grid,
  FormControl,
  Box,
  Typography,
  Button,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export default function HeaderBar({ selectedAcc, megaStatusNode, accStatus, usedPct, usedMB, totalMB, queueSummaryText, onOpenModal, onTest, uploadQueue = [] }) {
  const backups = Array.isArray(selectedAcc?.backups) ? selectedAcc.backups : []
  const firstBackup = backups[0]
  const backupLabel = firstBackup?.alias
    ? (backups.length > 1 ? `${firstBackup.alias} (+${backups.length - 1})` : firstBackup.alias)
    : null
  const [dragging, setDragging] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const normalize = (s) => String(s || '').trim().toLowerCase()

  const validateAgainstQueue = (files) => {
    const selFiles = Array.from(files || [])
    const selMap = {}
    selFiles.forEach((f) => { selMap[normalize(f.name)] = f })

    const queueMap = {};
    (uploadQueue || []).forEach((it) => {
      const name = normalize(it?.archiveFile?.name || it?.meta?.title || '')
      if (name) queueMap[name] = it
    })

    // Faltan en cola: vienen en lo arrastrado pero no existen en la cola actual
    const missingInQueueKeys = Object.keys(selMap).filter(k => !queueMap[k])
    // Archivos de más: existen en cola pero no vienen en lo arrastrado
    const extraInQueueKeys = Object.keys(queueMap).filter(k => !selMap[k])

    const missingInQueueFiles = missingInQueueKeys.map(k => selMap[k]?.name || k)
    const extraInQueueFiles = extraInQueueKeys.map(k => queueMap[k]?.archiveFile?.name || queueMap[k]?.meta?.title || k)

    const result = {
      missingInQueueFiles,
      extraInQueueFiles,
      totalSelected: selFiles.length,
      totalInQueue: (uploadQueue || []).length,
    }
    setValidationResult(result)
    setDialogOpen(true)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    const files = Array.from(e.dataTransfer?.files || [])
    if (!files.length) return
    validateAgainstQueue(files)
  }

  const openFilePicker = () => fileInputRef.current?.click()
  const handleFilePick = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    validateAgainstQueue(files)
    try { e.target.value = null } catch {}
  }

  return (
    <Card className="glass mb-3" sx={{ maxWidth: 1600, ms: 'auto' }}>
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small">
              <Box sx={{ p: 0, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1, minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Cuenta MEGA</Typography>
                  <Typography variant="body2">{selectedAcc ? selectedAcc.alias : 'Ninguna seleccionada'}</Typography>
                  {selectedAcc && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.25, fontSize: '0.72rem', opacity: 0.85 }}
                    >
                      backup: {backupLabel || '—'}
                    </Typography>
                  )}
                </Box>
                <Button sx={{ marginLeft: '10px' }} variant="contained" onClick={onOpenModal}>
                  Cuenta
                </Button>
              </Box>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              {megaStatusNode}
              <Button variant="outlined" onClick={onTest} disabled={!selectedAcc || accStatus === 'connecting'}>
                Conectar
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={5}>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="caption">Espacio usado / disponible</Typography>
                <LinearProgress variant="determinate" value={usedPct} sx={{ mt: 0.5 }} />
                <Typography variant="caption">{usedMB} MB / {totalMB} MB</Typography>
              </Box>
              {queueSummaryText ? (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      opacity: 0.85,
                      whiteSpace: 'nowrap',
                      fontWeight: 800,
                      color: 'text.secondary',
                    }}
                  >
                    {queueSummaryText}
                  </Typography>
                </Box>
              ) : null}
              <Box
                sx={{
                  border: '2px dashed #4a90e2',
                  borderRadius: 0,
                  padding: '20px 80px',
                  textAlign: 'center',
                  color: '#4a90e2',
                  backgroundColor: dragging ? 'rgba(74, 144, 226, 0.2)' : 'rgba(74, 144, 226, 0.1)',
                  transition: 'background-color 0.3s ease',
                  marginLeft: 'auto',
                  cursor: 'pointer',
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={openFilePicker}
              >
                <Typography variant="caption">Validar Archivos en Cola</Typography>
                <input ref={fileInputRef} type="file" multiple onChange={handleFilePick} style={{ display: 'none' }} />
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid rgba(120, 160, 255, 0.35)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#eaf2ff',
            background: 'linear-gradient(135deg, #153a7a 0%, #1f5cb8 100%)',
          }}
        >
          <span>Validacion de archivos vs cola</span>
          <IconButton size="small" onClick={() => setDialogOpen(false)} aria-label="Cerrar" sx={{ color: '#eaf2ff' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: '#0f1724' }}>
          {validationResult ? (
            <Box>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
                <Chip label={`Seleccionados: ${validationResult.totalSelected}`} size="small" sx={{ background: '#1f2b40', color: '#d6e4ff' }} />
                <Chip label={`En cola: ${validationResult.totalInQueue}`} size="small" sx={{ background: '#1f2b40', color: '#d6e4ff' }} />
                <Chip
                  label={validationResult.missingInQueueFiles.length || validationResult.extraInQueueFiles.length ? 'Con diferencias' : 'Todo coincide'}
                  size="small"
                  sx={{
                    background: validationResult.missingInQueueFiles.length || validationResult.extraInQueueFiles.length ? '#4d1f25' : '#1f4d2b',
                    color: validationResult.missingInQueueFiles.length || validationResult.extraInQueueFiles.length ? '#ffd7dc' : '#d7ffe3',
                    fontWeight: 700,
                  }}
                />
              </Stack>

              <Box sx={{ mb: 1.5, border: '1px solid rgba(255, 99, 132, 0.35)', borderRadius: 1.5, background: 'rgba(255, 99, 132, 0.08)' }}>
                <Typography variant="subtitle2" sx={{ px: 1.5, pt: 1.25, color: '#ffc6cf', fontWeight: 800 }}>
                  Faltan en la cola ({validationResult.missingInQueueFiles.length})
                </Typography>
                <List dense sx={{ pt: 0.5, pb: 0.75 }}>
                  {validationResult.missingInQueueFiles.length ? validationResult.missingInQueueFiles.map((n, i) => (
                    <ListItem key={`missing-in-queue-${i}`} sx={{ py: 0.25 }}>
                      <ListItemText primaryTypographyProps={{ sx: { color: '#ffe3e8', fontSize: 13 } }} primary={n} />
                    </ListItem>
                  )) : (
                    <ListItem sx={{ py: 0.25 }}>
                      <ListItemText primaryTypographyProps={{ sx: { color: '#b5f3c6', fontSize: 13 } }} primary="Ninguno" />
                    </ListItem>
                  )}
                </List>
              </Box>

              <Box sx={{ border: '1px solid rgba(255, 193, 7, 0.35)', borderRadius: 1.5, background: 'rgba(255, 193, 7, 0.08)' }}>
                <Typography variant="subtitle2" sx={{ px: 1.5, pt: 1.25, color: '#ffe29b', fontWeight: 800 }}>
                  Archivos de mas ({validationResult.extraInQueueFiles.length})
                </Typography>
                <List dense sx={{ pt: 0.5, pb: 0.75 }}>
                  {validationResult.extraInQueueFiles.length ? validationResult.extraInQueueFiles.map((n, i) => (
                    <ListItem key={`extra-in-queue-${i}`} sx={{ py: 0.25 }}>
                      <ListItemText primaryTypographyProps={{ sx: { color: '#fff0c7', fontSize: 13 } }} primary={n} />
                    </ListItem>
                  )) : (
                    <ListItem sx={{ py: 0.25 }}>
                      <ListItemText primaryTypographyProps={{ sx: { color: '#b5f3c6', fontSize: 13 } }} primary="Ninguno" />
                    </ListItem>
                  )}
                </List>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#d6e4ff' }}>
              Arrastra o selecciona archivos para validar contra la cola.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ backgroundColor: '#0f1724', borderTop: '1px solid rgba(120, 160, 255, 0.2)' }}>
          <Button onClick={() => setDialogOpen(false)} variant="contained" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}
