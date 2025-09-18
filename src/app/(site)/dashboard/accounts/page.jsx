'use client'

import React, { useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  Chip,
  Button,
  Tooltip,
  Divider,
  Link as MUILink,
  Drawer,
  TextField,
  Alert,
} from '@mui/material'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

const Status = ({s}) => s==='connected' ? <Chip label="Conectada" color="success" size="small" /> : s==='expired' ? <Chip label="Expirada" color="warning" size="small" /> : <Chip label="Error" color="error" size="small" />

export default function AccountsOverviewPage(){
  const [accounts, setAccounts] = useState([
    { id:1, alias:'MEGA-01 (EU)', email:'eu@mega.com', status:'connected', used:48, total:200, bandwidth:'3.2 GB/día', mirrors:120, errors24h:1, lastCheck:'2025-09-12 10:34', base:'/STLHUB/EU', priority:1 },
    { id:2, alias:'MEGA-02 (US)', email:'us@mega.com', status:'expired', used:160, total:200, bandwidth:'5.1 GB/día', mirrors:86, errors24h:4, lastCheck:'2025-09-12 09:10', base:'/STLHUB/US', priority:2 },
    { id:3, alias:'MEGA-03 (LATAM)', email:'latam@mega.com', status:'error', used:20, total:100, bandwidth:'1.2 GB/día', mirrors:44, errors24h:7, lastCheck:'2025-09-11 20:05', base:'/STLHUB/LA', priority:3 },
  ])

  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  // Formulario para nueva cuenta (demo)
  const [form, setForm] = useState({ alias: '', email: '', base: '/STLHUB/', priority: 1 })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // 'success' | 'error'
  const [msg, setMsg] = useState(null)

  const testConnection = () => {
    setTesting(true); setTestResult(null); setMsg(null)
    setTimeout(() => {
      setTesting(false)
      setTestResult('success') // demo: siempre OK
      setMsg({ type: 'success', text: 'Conexión verificada.' })
    }, 800)
  }

  const addAccount = () => {
    if (!form.alias || !form.email) { setMsg({ type:'warning', text:'Alias y correo son obligatorios.' }); return }
    if (testResult !== 'success') { setMsg({ type:'warning', text:'Primero prueba la conexión.' }); return }
    const id = (accounts[accounts.length-1]?.id || 0) + 1
    const now = new Date()
    const newAcc = {
      id,
      alias: form.alias,
      email: form.email,
      status: 'connected',
      used: 0,
      total: 100,
      bandwidth: '0 GB/día',
      mirrors: 0,
      errors24h: 0,
      lastCheck: now.toISOString().slice(0,16).replace('T',' '),
      base: form.base || '/STLHUB',
      priority: Number(form.priority) || 1,
    }
    setAccounts(prev => [...prev, newAcc])
    setMsg({ type:'success', text:'Cuenta añadida.' })
    setForm({ alias:'', email:'', base:'/STLHUB/', priority:1 })
    setTestResult(null)
  }

  const openDetail = (acc) => { setSelected(acc); setOpen(true) }

  return (
    <div className="dashboard-content p-3">
      {/* Panel: Añadir cuenta MEGA */}
      <Card className="glass" sx={{ mb: 2 }}>
        <CardHeader title="Añadir cuenta MEGA" />
        <CardContent>
          {msg && <Alert severity={msg.type} onClose={()=>setMsg(null)} sx={{ mb: 2 }}>{msg.text}</Alert>}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField label="Alias" fullWidth value={form.alias} onChange={(e)=>setForm(f=>({...f, alias:e.target.value}))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField type="email" label="Correo" fullWidth value={form.email} onChange={(e)=>setForm(f=>({...f, email:e.target.value}))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField label="Carpeta base" fullWidth value={form.base} onChange={(e)=>setForm(f=>({...f, base:e.target.value}))} />
            </Grid>
            <Grid item xs={6} md={1}>
              <TextField type="number" label="Prioridad" fullWidth value={form.priority} onChange={(e)=>setForm(f=>({...f, priority:e.target.value}))} />
            </Grid>
            <Grid item xs={6} md={2}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" onClick={testConnection} disabled={testing}>{testing ? 'Probando...' : 'Probar'}</Button>
                <Button variant="contained" onClick={addAccount} disabled={testing}>Agregar</Button>
              </Stack>
            </Grid>
          </Grid>
          {testResult === 'success' && <Typography variant="caption" color="success.main">Conexión OK</Typography>}
          {testResult === 'error' && <Typography variant="caption" color="error.main">Error de conexión</Typography>}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {accounts.map(acc => (
          <Grid item xs={12} md={4} key={acc.id}>
            <Card className="glass" onClick={()=>openDetail(acc)} sx={{ cursor:'pointer' }}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">{acc.alias}</Typography>
                    <Status s={acc.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{acc.email}</Typography>
                  <Box>
                    <Typography variant="caption">Uso de almacenamiento</Typography>
                    <LinearProgress variant="determinate" value={(acc.used/acc.total)*100} sx={{ my: .5 }} />
                    <Typography variant="caption">{acc.used} GB / {acc.total} GB</Typography>
                  </Box>
                  <Grid container spacing={1}>
                    <Grid item xs={6}><Typography variant="caption">Bandwidth</Typography><Typography variant="body2">{acc.bandwidth}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption">Mirrors activos</Typography><Typography variant="body2">{acc.mirrors}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption">Errores 24–72h</Typography><Typography variant="body2" color={acc.errors24h? 'error':'inherit'}>{acc.errors24h}</Typography></Grid>
                    <Grid item xs={6}><Typography variant="caption">Última verificación</Typography><Typography variant="body2">{acc.lastCheck}</Typography></Grid>
                  </Grid>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined">Probar conexión</Button>
                    <Button size="small" variant="outlined">Refrescar</Button>
                    <Button size="small" variant="outlined">Suspender</Button>
                    <Button size="small" variant="outlined">Reactivar</Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Detalle */}
      <Drawer anchor="right" open={open} onClose={()=>setOpen(false)} sx={{ '& .MuiDrawer-paper': { width: 520 } }}>
        <Box sx={{ p: 2 }}>
          {selected && (
            <>
              <Typography variant="h6" sx={{ mb: 1 }}>{selected.alias}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{selected.email}</Typography>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2">Credenciales / Token</Typography>
              <Typography variant="caption" color="text.secondary">No se muestran en claro. Estado: {selected.status}</Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">Carpeta base</Typography>
              <Typography variant="body2"><code>{selected.base}</code></Typography>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">Política de asignación</Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}><Typography variant="caption">Peso máx por asset</Typography><Typography variant="body2">2.5 GB</Typography></Grid>
                <Grid item xs={6}><Typography variant="caption">Límite de assets/día</Typography><Typography variant="body2">20</Typography></Grid>
                <Grid item xs={12}><Typography variant="caption">Prioridad</Typography><Typography variant="body2">{selected.priority}</Typography></Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">Salud de mirrors</Typography>
              <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                <Chip size="small" label="OK: 120" color="success" />
                <Chip size="small" label="LIMITED: 8" color="warning" />
                <Chip size="small" label="BROKEN: 2" color="error" />
              </Stack>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">Top assets alojados</Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">Asset #12 · 1.3k descargas</Typography>
                <Typography variant="body2">Asset #3 · 1.1k descargas</Typography>
                <Typography variant="body2">Asset #7 · 980 descargas</Typography>
              </Stack>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">Alertas</Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">Cuota al 80%</Typography>
                <Typography variant="body2">Errores de subida elevados</Typography>
              </Stack>

              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button variant="outlined">Revalidar sesión</Button>
                <Button variant="outlined">Mover assets nuevos a otra cuenta</Button>
                <Button variant="outlined">Sincronizar índice</Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>
    </div>
  )
}
