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
} from '@mui/material'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import LinkIcon from '@mui/icons-material/Link'

const MegaStatus = ({ status, reason }) => {
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

export default function UploadAssetPage() {
  // Data quemada
  const accounts = useMemo(() => ([
    { id: 1, alias: 'MEGA-01 (EU)', status: 'connected' },
    { id: 2, alias: 'MEGA-02 (US)', status: 'failed', reason: 'Credenciales inválidas' },
    { id: 3, alias: 'MEGA-03 (LATAM)', status: 'connecting' },
  ]), [])

  const [selectedAcc, setSelectedAcc] = useState(accounts[0])
  const [accStatus, setAccStatus] = useState(selectedAcc.status)
  const [accReason, setAccReason] = useState(selectedAcc.reason)

  // Simular test ligero al cambiar de cuenta
  useEffect(() => {
    setAccStatus('connecting')
    setAccReason(undefined)
    const t = setTimeout(() => {
      if (selectedAcc.id === 2) {
        setAccStatus('failed')
        setAccReason('Credenciales inválidas')
      } else {
        setAccStatus('connected')
      }
    }, 1000)
    return () => clearTimeout(t)
  }, [selectedAcc])

  const canUpload = accStatus === 'connected'

  // Mock imágenes y progreso
  const images = useMemo(() => ([
    { id: 1, url: 'https://picsum.photos/seed/a1/600/400', name: 'img_01.jpg', progress: 100 },
    { id: 2, url: 'https://picsum.photos/seed/a2/600/400', name: 'img_02.jpg', progress: 100 },
    { id: 3, url: 'https://picsum.photos/seed/a3/600/400', name: 'img_03.jpg', progress: 42 },
  ]), [])

  const zipFile = { name: 'my-model-pack.zip', size: '1.2 GB', md5: 'c4ca4238a0b923820dcc509a6f75849b', sha1: '356a192b7913b04c54574d18c28d46e6395428ab', progress: 68, speed: '12 MB/s', eta: '01:23' }
  const remotePath = '/STLHUB/assets/slug-demo/'

  // Form metadata (mock)
  const [title, setTitle] = useState('StormTrooper Helmet')
  const [category, setCategory] = useState('Props')
  const [tags, setTags] = useState(['helmet', 'star-wars'])
  const [isPremium, setIsPremium] = useState(true)
  const [description, setDescription] = useState('Modelo detallado de casco con soportes opcionales.')
  const [pieces, setPieces] = useState('12')
  const [supportsIncluded, setSupportsIncluded] = useState('Sí')
  const [recommendedPrinter, setRecommendedPrinter] = useState('Prusa i3 MK3S')
  const [dimensions, setDimensions] = useState('220x180x250 mm')
  const [status, setStatus] = useState('processing') // draft | processing | published | failed

  const quickStat = {
    used: '48 GB',
    total: '200 GB',
    bandwidth: '3.2 GB / día',
    uploadFails24h: 1,
  }

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
      <Card className="glass mb-3">
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="mega-acc">Cuenta MEGA</InputLabel>
                <Select
                  labelId="mega-acc"
                  label="Cuenta MEGA"
                  value={selectedAcc.id}
                  onChange={(e) => {
                    const acc = accounts.find(a => a.id === e.target.value)
                    setSelectedAcc(acc)
                  }}
                >
                  {accounts.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">{a.alias}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <MegaStatus status={accStatus} reason={accReason} />
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                <Box sx={{ minWidth: 180 }}>
                  <Typography variant="caption">Espacio usado / disponible</Typography>
                  <LinearProgress variant="determinate" value={24} sx={{ mt: 0.5 }} />
                  <Typography variant="caption">{quickStat.used} / {quickStat.total}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Límite diario</Typography>
                  <Typography variant="body2">{quickStat.bandwidth}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Fails 24h</Typography>
                  <Typography variant="body2" color={quickStat.uploadFails24h ? 'error' : 'inherit'}>{quickStat.uploadFails24h}</Typography>
                </Box>
                <Button variant="contained" startIcon={<CloudUploadIcon />} disabled={!canUpload}>Subir</Button>
                {!canUpload && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button size="small" variant="outlined">Reintentar</Button>
                    <Typography variant="caption" color="text.secondary">o cambia de cuenta</Typography>
                  </Stack>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 2) Layout de carga */}
      <Grid container spacing={2}>
        {/* Izquierda */}
        <Grid item xs={12} md={7}>
          <Stack spacing={2}>
            <Card className="glass">
              <CardHeader title="Imágenes" subheader="Previews para tu front (S3/R2 recomendado)" />
              <CardContent>
                <Box className="scroll-x" sx={{ mb: 2 }}>
                  {images.map(img => (
                    <div key={img.id} className="img-thumb">
                      <img src={img.url} alt={img.name} />
                    </div>
                  ))}
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                  <Button variant="outlined">Agregar imágenes</Button>
                  <Button variant="outlined">Seleccionar archivos</Button>
                </Stack>
                <Box sx={{ p: 2, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 2, mb: 2 }}>
                  <Typography variant="body2">Arrastra y suelta aquí (jpg/png/webp). Máx 10MB c/u. Máximo 10 archivos.</Typography>
                </Box>
                <Typography variant="subtitle2" gutterBottom>Progreso</Typography>
                <Stack spacing={1}>
                  {images.map(img => (
                    <Box key={img.id}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">{img.name}</Typography>
                        <Typography variant="body2">{img.progress}%</Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={img.progress} />
                    </Box>
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Retries automáticos con backoff exponencial en fallos intermitentes (demo).
                </Typography>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader title="Archivo del asset (ZIP/RAR/7z)" />
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                  <Button variant="outlined">Seleccionar archivo</Button>
                  <Box sx={{ flex: 1 }} />
                </Stack>
                <Typography variant="body2" gutterBottom>
                  Seleccionado: <strong>{zipFile.name}</strong> · {zipFile.size}
                </Typography>
                <Typography variant="caption" display="block">MD5: {zipFile.md5}</Typography>
                <Typography variant="caption" display="block" gutterBottom>SHA1: {zipFile.sha1}</Typography>
                <Typography variant="body2" gutterBottom>Destino: <code>{remotePath}</code></Typography>

                <Box sx={{ mt: 1 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Subida</Typography>
                    <Typography variant="body2">{zipFile.progress}% · {zipFile.speed} · ETA {zipFile.eta}</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={zipFile.progress} />
                </Box>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" disabled>Cancelar</Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Derecha */}
        <Grid item xs={12} md={5}>
          <Stack spacing={2}>
            <Card className="glass">
              <CardHeader title="Metadatos" />
              <CardContent>
                <Stack spacing={2}>
                  <TextField label="Nombre del asset" value={title} onChange={(e)=>setTitle(e.target.value)} fullWidth />
                  <FormControl fullWidth>
                    <InputLabel id="cat">Categoría</InputLabel>
                    <Select labelId="cat" label="Categoría" value={category} onChange={(e)=>setCategory(e.target.value)}>
                      <MenuItem value="Props">Props</MenuItem>
                      <MenuItem value="Figuras">Figuras</MenuItem>
                      <MenuItem value="Escenografía">Escenografía</MenuItem>
                    </Select>
                  </FormControl>

                  <Autocomplete
                    multiple
                    freeSolo
                    options={['helmet', 'armor', 'cosplay', 'star-wars']}
                    value={tags}
                    onChange={(_, v) => setTags(v)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} key={option+index} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Tags" placeholder="Añadir tag" />
                    )}
                  />

                  <FormControlLabel control={<Switch checked={isPremium} onChange={(e)=>setIsPremium(e.target.checked)} />} label={isPremium ? 'Premium' : 'Free'} />

                  <TextField label="Descripción" multiline minRows={3} value={description} onChange={(e)=>setDescription(e.target.value)} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><TextField label="Piezas" value={pieces} onChange={(e)=>setPieces(e.target.value)} fullWidth /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="Soportes incluidos" value={supportsIncluded} onChange={(e)=>setSupportsIncluded(e.target.value)} fullWidth /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="Impresora recomendada" value={recommendedPrinter} onChange={(e)=>setRecommendedPrinter(e.target.value)} fullWidth /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="Dimensiones" value={dimensions} onChange={(e)=>setDimensions(e.target.value)} fullWidth /></Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader title="Estado" />
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip label="Draft" color={status==='draft'?'default':'default'} variant={status==='draft'?'filled':'outlined'} />
                  <Chip label="Processing" color={status==='processing'?'info':'default'} variant={status==='processing'?'filled':'outlined'} />
                  <Chip label="Published" color={status==='published'?'success':'default'} variant={status==='published'?'filled':'outlined'} />
                  <Chip label="Failed" color={status==='failed'?'error':'default'} variant={status==='failed'?'filled':'outlined'} />
                </Stack>

                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" gutterBottom>Resumen de subida</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="body2">Cuenta MEGA objetivo: <strong>{selectedAcc.alias}</strong></Typography>
                  <Typography variant="body2">Ruta remota: <code>{remotePath}</code></Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LinkIcon fontSize="small" />
                    <MUILink href="#" underline="hover" color="inherit" sx={{ pointerEvents: 'none', opacity: 0.6 }}>Link MEGA (pendiente)</MUILink>
                  </Stack>
                </Stack>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button variant="outlined">Guardar borrador</Button>
                  <Button variant="contained" color="success">Guardar y publicar</Button>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </div>
  )
}
