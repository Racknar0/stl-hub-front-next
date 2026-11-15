'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined'
import axios from '@/services/AxiosInterceptor'

// Origen de cada enlace corto (dónde se publicó)
const SOURCES = {
  youtube_horizontal: { label: 'Videos horizontales', icon: '📺' },
  facebook: { label: 'Comentario de Facebook', icon: '📘' },
  youtube_short: { label: 'Shorts de YouTube', icon: '▶️' },
  threads: { label: 'Threads', icon: '🧵' },
  instagram_bio: { label: 'Bio de Instagram', icon: '📸' },
}

const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')

// Destino legible: ruta del modelo sin dominio ni UTM, más la campaña
function describeTarget(url) {
  try {
    const u = new URL(url)
    const campaign = u.searchParams.get('utm_campaign')
    return { path: decodeURIComponent(u.pathname), campaign }
  } catch {
    return { path: url, campaign: null }
  }
}

export default function EnlacesCortosPage() {
  const [data, setData] = useState(null)
  const [source, setSource] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get('/admin/short-links', { params: { source: source || undefined, q: query || undefined } })
      setData(res.data)
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [source, query])

  useEffect(() => {
    const t = setTimeout(load, query ? 350 : 0)
    return () => clearTimeout(t)
  }, [load, query])

  const copy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(''), 1500)
  }

  const totals = data?.totals
  const cards = [
    { key: '', label: 'Todos', icon: '🔗', links: totals?.links || 0, clicks: totals?.clicks || 0 },
    ...(totals?.bySource || []).map(s => ({ key: s.source, label: SOURCES[s.source]?.label || s.source, icon: SOURCES[s.source]?.icon || '🔗', links: s.links, clicks: s.clicks })),
  ]

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Enlaces cortos</Typography>
          <Typography variant="body2" color="text.secondary">
            Clics de personas en los enlaces stlgratis.com/v/… publicados en cada red (no cuenta bots ni vistas previas).
          </Typography>
        </Box>
        <Tooltip title="Actualizar">
          <span>
            <IconButton onClick={load} disabled={loading}><RefreshOutlined /></IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Totales por origen: al pulsar filtra la tabla */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(6, 1fr)' }, gap: 1.5 }}>
        {cards.map(c => (
          <Paper
            key={c.key || 'all'}
            onClick={() => setSource(c.key)}
            sx={{
              p: 1.5, cursor: 'pointer', borderRadius: 2,
              border: '1px solid', borderColor: source === c.key ? 'primary.main' : 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary">{c.icon} {c.label}</Typography>
            <Typography variant="h5" fontWeight={700}>{c.clicks.toLocaleString('es-CO')}</Typography>
            <Typography variant="caption" color="text.secondary">clics · {c.links} enlaces</Typography>
          </Paper>
        ))}
      </Box>

      <TextField
        size="small"
        placeholder="Buscar por modelo, canal, página o código…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        sx={{ maxWidth: 420 }}
      />

      {error && <Alert severity="error">{error}</Alert>}

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Enlace</TableCell>
              <TableCell>Dónde</TableCell>
              <TableCell>Qué es</TableCell>
              <TableCell>Lleva a</TableCell>
              <TableCell align="right">Clics</TableCell>
              <TableCell>Último clic</TableCell>
              <TableCell>Creado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && !data && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            )}
            {data && data.links.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Aún no hay enlaces cortos. Se crean solos al publicar reels y videos horizontales.
                </TableCell>
              </TableRow>
            )}
            {data?.links.map(l => {
              const t = describeTarget(l.targetUrl)
              return (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography component="span" variant="body2" fontFamily="monospace">/v/{l.code}</Typography>
                    <Tooltip title={copied === l.shortUrl ? '¡Copiado!' : 'Copiar enlace corto'}>
                      <IconButton size="small" onClick={() => copy(l.shortUrl)}><ContentCopyOutlined fontSize="inherit" /></IconButton>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{SOURCES[l.source]?.icon} {SOURCES[l.source]?.label || l.source}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>{l.label || '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 340 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" noWrap title={l.targetUrl}>{t.path}</Typography>
                      <IconButton size="small" component="a" href={l.targetUrl} target="_blank" rel="noreferrer"><OpenInNewOutlined fontSize="inherit" /></IconButton>
                    </Box>
                    {t.campaign && <Typography variant="caption" color="text.secondary">campaña: {t.campaign}</Typography>}
                  </TableCell>
                  <TableCell align="right"><Typography fontWeight={700}>{l.clicks}</Typography></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(l.lastClickAt)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(l.createdAt)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
