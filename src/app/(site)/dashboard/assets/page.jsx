'use client'

import React, { useMemo, useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Divider,
  Drawer,
  LinearProgress,
  Grid,
  Alert,
  Link as MUILink,
} from '@mui/material'
import { MaterialReactTable, useMaterialReactTable } from 'material-react-table'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import UnpublishedIcon from '@mui/icons-material/Unpublished'
import ReplayIcon from '@mui/icons-material/Replay'
import LinkIcon from '@mui/icons-material/Link'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'

const statusColor = (s) => ({
  draft: 'default',
  processing: 'info',
  published: 'success',
  failed: 'error',
}[s] || 'default')

const healthColor = (h) => ({ OK: 'success', LIMITED: 'warning', BROKEN: 'error', REMOVED: 'default' }[h] || 'default')

export default function AssetsAdminPage() {
  // Data quemada
  const accounts = useMemo(() => ([
    { id: 1, alias: 'MEGA-01 (EU)', email: 'eu@mega.com', status: 'connected' },
    { id: 2, alias: 'MEGA-02 (US)', email: 'us@mega.com', status: 'connected' },
    { id: 3, alias: 'MEGA-03 (LATAM)', email: 'latam@mega.com', status: 'error' },
  ]), [])

  const assets = useMemo(() => {
    const cats = ['Props', 'Figuras', 'Escenografía']
    const tagsPool = ['helmet', 'star-wars', 'armor', 'cosplay', 'print', 'stl']
    const pick = (arr, n=2) => Array.from({length:n}, () => arr[Math.floor(Math.random()*arr.length)])
    const rnd = (min, max) => Math.floor(Math.random()*(max-min+1))+min
    return Array.from({ length: 20 }).map((_, i) => {
      const status = ['draft','processing','published','failed'][i%4]
      const account = accounts[i%accounts.length]
      const mirrors = [
        { id: `m${i}-1`, accountId: account.id, accountAlias: account.alias, link: '#', health: ['OK','LIMITED','BROKEN'][i%3], lastCheck: '2025-09-12 10:34', priority: 1 },
        { id: `m${i}-2`, accountId: accounts[(i+1)%accounts.length].id, accountAlias: accounts[(i+1)%accounts.length].alias, link: '#', health: 'OK', lastCheck: '2025-09-12 10:33', priority: 2 },
      ]
      return {
        id: i+1,
        thumbnail: `https://picsum.photos/seed/asset${i}/200/120`,
        name: `Asset #${i+1}`,
        category: cats[i%cats.length],
        tags: Array.from(new Set(pick(tagsPool, rnd(2,3)))).slice(0,3),
        status,
        mirrors,
        downloads7: rnd(10, 500),
        downloads30: rnd(50, 3000),
        updatedAt: `2025-09-${(i%28)+1}`,
        premium: i%3!==0,
        accountId: account.id,
      }
    })
  }, [accounts])

  // Filtros
  const [fStatus, setFStatus] = useState('all')
  const [fCategory, setFCategory] = useState('all')
  const [fPremium, setFPremium] = useState('all')
  const [fAccount, setFAccount] = useState('all')
  const [fDate, setFDate] = useState('30d')
  const [fText, setFText] = useState('')

  const [topBanner, setTopBanner] = useState(null)

  const filtered = useMemo(() => {
    return assets.filter(a => {
      if (fStatus !== 'all' && a.status !== fStatus) return false
      if (fCategory !== 'all' && a.category !== fCategory) return false
      if (fPremium !== 'all' && ((fPremium==='premium') !== !!a.premium)) return false
      if (fAccount !== 'all' && a.accountId !== Number(fAccount)) return false
      if (fText && !(`${a.name} ${a.tags.join(' ')}`.toLowerCase().includes(fText.toLowerCase()))) return false
      // fDate: mock, no cambia datos
      return true
    })
  }, [assets, fStatus, fCategory, fPremium, fAccount, fDate, fText])

  // Panel lateral
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  const openDetail = (row) => { setSelected(row.original); setDetailOpen(true) }

  // Health-check simulado
  const runHealthCheck = () => {
    setTopBanner({ type: 'info', msg: 'Ejecutando health-check a mirrors...' })
    setTimeout(() => {
      setTopBanner({ type: 'warning', msg: 'Se detectaron mirrors en estado LIMITED; monitoreando.' })
      setTimeout(() => {
        setTopBanner({ type: 'success', msg: 'Health-check completado. No se detectaron enlaces rotos.' })
        setTimeout(() => setTopBanner(null), 2500)
      }, 1500)
    }, 1200)
  }

  // Columnas
  const columns = useMemo(() => ([
    {
      header: 'Thumbnail', accessorKey: 'thumbnail', size: 100,
      Cell: ({ cell }) => <img src={cell.getValue()} alt="thumb" style={{ width: 80, height: 48, objectFit: 'cover', borderRadius: 6 }} />,
      enableSorting: false,
    },
    { header: 'Nombre', accessorKey: 'name' },
    {
      header: 'Categoría / Tags',
      accessorFn: (row) => `${row.category} ${row.tags.join(',')}`,
      Cell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={row.original.category} />
          <Stack direction="row" spacing={0.5}>
            {row.original.tags.map((t) => <Chip key={t} size="small" label={t} variant="outlined" />)}
          </Stack>
        </Stack>
      ),
    },
    {
      header: 'Estado', accessorKey: 'status', size: 120,
      Cell: ({ cell }) => <Chip label={cell.getValue()} color={statusColor(cell.getValue())} size="small" />,
    },
    {
      header: 'Mirrors', accessorFn: (row) => row.mirrors.map(m=>m.accountAlias).join(','),
      Cell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          {row.original.mirrors.map((m) => (
            <Tooltip key={m.id} title={`${m.accountAlias} · ${m.health}`}>
              <Chip size="small" label={m.accountAlias} color={healthColor(m.health)} variant="outlined" />
            </Tooltip>
          ))}
        </Stack>
      ),
    },
    {
      header: 'Descargas', accessorFn: (row) => `${row.downloads7}/${row.downloads30}`,
      Cell: ({ row }) => <Typography variant="body2">{row.original.downloads7} / {row.original.downloads30}</Typography>,
      size: 120,
    },
    { header: 'Actualizado', accessorKey: 'updatedAt', size: 120 },
  ]), [])

  const table = useMaterialReactTable({
    columns,
    data: filtered,
    enableRowActions: true,
    positionActionsColumn: 'last',
    initialState: { density: 'compact' },
    renderTopToolbarCustomActions: () => (
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ width: '100%' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Estado</InputLabel>
          <Select label="Estado" value={fStatus} onChange={(e)=>setFStatus(e.target.value)}>
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="processing">Processing</MenuItem>
            <MenuItem value="published">Published</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Categoría</InputLabel>
          <Select label="Categoría" value={fCategory} onChange={(e)=>setFCategory(e.target.value)}>
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="Props">Props</MenuItem>
            <MenuItem value="Figuras">Figuras</MenuItem>
            <MenuItem value="Escenografía">Escenografía</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Plan</InputLabel>
          <Select label="Plan" value={fPremium} onChange={(e)=>setFPremium(e.target.value)}>
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="free">Free</MenuItem>
            <MenuItem value="premium">Premium</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Cuenta MEGA</InputLabel>
          <Select label="Cuenta MEGA" value={fAccount} onChange={(e)=>setFAccount(e.target.value)}>
            <MenuItem value="all">Todas</MenuItem>
            {accounts.map(a => <MenuItem key={a.id} value={String(a.id)}>{a.alias}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Fecha</InputLabel>
          <Select label="Fecha" value={fDate} onChange={(e)=>setFDate(e.target.value)}>
            <MenuItem value="7d">Últimos 7 días</MenuItem>
            <MenuItem value="30d">Últimos 30 días</MenuItem>
            <MenuItem value="all">Todo</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" placeholder="Nombre o tag" value={fText} onChange={(e)=>setFText(e.target.value)} sx={{ minWidth: 220 }} />
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<HealthAndSafetyIcon />} onClick={runHealthCheck}>Health-check</Button>
        {/* Botón de nuevo asset eliminado; ahora está en el sidenav */}
      </Stack>
    ),
    renderRowActions: ({ row }) => (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Ver"><Button size="small" onClick={() => openDetail(row)}><VisibilityIcon fontSize="small" /></Button></Tooltip>
        <Tooltip title="Editar"><Button size="small"><EditIcon fontSize="small" /></Button></Tooltip>
        <Tooltip title="Duplicar"><Button size="small"><ContentCopyIcon fontSize="small" /></Button></Tooltip>
        <Tooltip title="Despublicar"><Button size="small"><UnpublishedIcon fontSize="small" /></Button></Tooltip>
        <Tooltip title="Reintentar subida"><Button size="small"><ReplayIcon fontSize="small" /></Button></Tooltip>
        <Tooltip title="Probar link"><Button size="small"><LinkIcon fontSize="small" /></Button></Tooltip>
      </Stack>
    ),
    muiTableContainerProps: { sx: { maxHeight: 620 } },
    enableStickyHeader: true,
  })

  return (
    <div className="dashboard-content p-3">
      {topBanner && (
        <Alert severity={topBanner.type} sx={{ mb: 2 }}>{topBanner.msg}</Alert>
      )}
      <Card className="glass">
        <CardContent>
          <MaterialReactTable table={table} />
        </CardContent>
      </Card>

      {/* Panel lateral de detalle */}
      <Drawer anchor="right" open={detailOpen} onClose={() => setDetailOpen(false)} sx={{ '& .MuiDrawer-paper': { width: 480 } }}>
        <Box sx={{ p: 2 }}>
          {selected ? (
            <>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <img src={selected.thumbnail} alt="thumb" style={{ width: 120, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                <Box>
                  <Typography variant="h6" sx={{ lineHeight: 1 }}>{selected.name}</Typography>
                  <Chip size="small" label={selected.status} color={statusColor(selected.status)} />
                </Box>
              </Stack>

              <Typography variant="subtitle2">Metadatos</Typography>
              <Divider sx={{ mb: 1 }} />
              <Grid container spacing={1}>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Categoría</Typography><Typography variant="body2">{selected.category}</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption" color="text.secondary">Plan</Typography><Typography variant="body2">{selected.premium ? 'Premium' : 'Free'}</Typography></Grid>
                <Grid item xs={12}><Typography variant="caption" color="text.secondary">Tags</Typography><Stack direction="row" spacing={0.5} sx={{ mt: .5 }}>{selected.tags.map(t=> <Chip key={t} size="small" label={t} />)}</Stack></Grid>
                <Grid item xs={12}><Typography variant="caption" color="text.secondary">Actualizado</Typography><Typography variant="body2">{selected.updatedAt}</Typography></Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Mirrors</Typography>
                <Divider sx={{ mb: 1 }} />
                <Stack spacing={1}>
                  {selected.mirrors.map((m) => (
                    <Card key={m.id} variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                          <Box>
                            <Typography variant="body2"><strong>{m.accountAlias}</strong> · prioridad {m.priority}</Typography>
                            <Typography variant="caption" color="text.secondary">Último check: {m.lastCheck}</Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip size="small" label={m.health} color={healthColor(m.health)} />
                            <Button size="small" variant="outlined">Probar</Button>
                          </Stack>
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <LinkIcon fontSize="small" style={{ verticalAlign: 'middle' }} />{' '}
                          <MUILink href={m.link} onClick={(e)=>e.preventDefault()} underline="hover">{m.link || 'link-demo'}</MUILink>
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Historial</Typography>
                <Divider sx={{ mb: 1 }} />
                <Stack spacing={1}>
                  <Typography variant="body2">2025-09-10 · creado por admin</Typography>
                  <Typography variant="body2">2025-09-11 · publicación aprobada por editor</Typography>
                  <Typography variant="body2">2025-09-12 · health-check OK</Typography>
                </Stack>
              </Box>

              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button variant="outlined">Generar link temporal de prueba</Button>
                <Button variant="contained" color="success">Guardar</Button>
              </Box>
            </>
          ) : (
            <Typography>Selecciona un asset para ver detalle</Typography>
          )}
        </Box>
      </Drawer>
    </div>
  )
}
