"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './SocialMetrics.scss'
import HttpService from '@/services/HttpService'

const NETWORKS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'threads', label: 'Threads' },
]
const RANGES = [
  { key: 'hoy', label: 'Hoy', days: 1 },
  { key: '2d', label: '2 días', days: 2 },
  { key: '3d', label: '3 días', days: 3 },
  { key: '7d', label: '7 días', days: 7 },
  { key: '28d', label: '28 días', days: 28 },
  { key: 'custom', label: 'Rango' },
]
const COLUMNS = [
  { key: 'views', label: 'Visualizaciones', tip: 'Reproducciones (en Pinterest, impresiones del pin de video)' },
  { key: 'reach', label: 'Alcance', tip: 'Cuentas alcanzadas (solo Instagram; en Pinterest, impresiones)' },
  { key: 'likes', label: 'Me gusta' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'shares', label: 'Compartidos' },
  { key: 'saves', label: 'Guardados' },
  { key: 'clicks', label: 'Clics' },
  { key: 'avgWatchSec', label: 'Tiempo prom.', tip: 'Tiempo promedio de reproducción' },
]

// Logos oficiales a todo color (los mismos del publicador de Reels)
function NetworkLogo({ network, size = 36 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', role: 'img', 'aria-label': network }
  if (network === 'instagram') {
    return (
      <svg {...common}>
        <defs>
          <radialGradient id="sm-ig-grad" cx="0.3" cy="1.07" r="1.2">
            <stop offset="0" stopColor="#fdf497" />
            <stop offset="0.1" stopColor="#fdf497" />
            <stop offset="0.5" stopColor="#fd5949" />
            <stop offset="0.68" stopColor="#d6249f" />
            <stop offset="1" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#sm-ig-grad)" />
        <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.8" />
        <circle cx="16.3" cy="7.7" r="1.05" fill="#fff" />
      </svg>
    )
  }
  if (network === 'facebook') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="11" fill="#1877F2" />
        <path fill="#fff" d="M13.4 23v-8.1h2.7l.4-3.2h-3.1V9.7c0-.9.3-1.6 1.6-1.6h1.7V5.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.4H7.6v3.2h2.7V23z" />
      </svg>
    )
  }
  if (network === 'pinterest') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="11" fill="#E60023" />
        <path fill="#fff" d="M12.3 5.2c-3.9 0-5.9 2.8-5.9 5.1 0 1.4.5 2.6 1.6 3.1.2.1.4 0 .4-.2l.2-.6c.1-.2 0-.3-.1-.5-.3-.4-.5-.9-.5-1.6 0-2.1 1.6-3.9 4.1-3.9 2.2 0 3.5 1.4 3.5 3.2 0 2.4-1.1 4.5-2.7 4.5-.9 0-1.5-.7-1.3-1.6.2-1.1.7-2.2.7-2.9 0-.7-.4-1.2-1.1-1.2-.9 0-1.6.9-1.6 2.2 0 .8.3 1.3.3 1.3l-1.1 4.6c-.3 1.3 0 3 0 3.1 0 .1.1.1.2 0 .1-.1 1-1.3 1.3-2.4l.5-2c.3.5 1 .9 1.8.9 2.4 0 4-2.2 4-5.1 0-2.2-1.9-4.3-4.7-4.3z" />
      </svg>
    )
  }
  if (network === 'threads') {
    return (
      <svg {...common}>
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#000" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.6" />
        <path fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round"
          d="M15.6 11.3c-.4-2.1-1.9-3.1-3.8-3.1-2.3 0-3.9 1.7-3.9 3.9 0 2.4 1.5 4.1 4 4.1 2.1 0 3.6-1.3 3.6-3.1 0-1.6-1.2-2.4-2.6-2.4-1.5 0-2.4.9-2.4 1.9 0 .9.7 1.5 1.6 1.5 1.6 0 2.4-1.3 2.4-3.3 0-2.9-1.8-4.8-4.6-4.8" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0033" />
      <path fill="#fff" d="M10 8.6v6.8l5.8-3.4z" />
    </svg>
  )
}

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
const inputDate = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
const fmt = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('es'))
const fmtSec = (v) => (v === null || v === undefined ? '—' : `${v} s`)
const sum = (rows, key) => rows.reduce((t, r) => t + (Number(r[key]) || 0), 0)

export default function SocialMetrics() {
  const [range, setRange] = useState('hoy')
  const [customFrom, setCustomFrom] = useState(() => inputDate(new Date()))
  const [customTo, setCustomTo] = useState(() => inputDate(new Date()))
  const [network, setNetwork] = useState('all')
  const [sort, setSort] = useState({ key: 'publishedAt', dir: 'desc' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const http = useMemo(() => new HttpService(), [])

  const bounds = useMemo(() => {
    const now = new Date()
    if (range === 'custom') {
      const from = startOfDay(customFrom ? new Date(`${customFrom}T00:00:00`) : now)
      const to = endOfDay(customTo ? new Date(`${customTo}T00:00:00`) : now)
      return { from, to }
    }
    const days = RANGES.find(r => r.key === range)?.days || 1
    const from = startOfDay(now)
    from.setDate(from.getDate() - (days - 1))
    return { from, to: now }
  }, [range, customFrom, customTo])

  // fresh = consultar las redes en vivo (al entrar y con "Actualizar"); al cambiar de rango se reutiliza lo ya consultado
  const load = useCallback(async (fresh = false) => {
    if (bounds.to < bounds.from) { setError('La fecha final es anterior a la inicial'); return }
    setLoading(true)
    setError('')
    try {
      const query = (from, to, f) => `/reels/metrics?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}${f ? '&fresh=1' : ''}`
      const res = await http.getData(query(bounds.from, bounds.to, fresh))
      let result = res.data
      // "Hoy" sin publicaciones todavía: se muestra el último reel publicado (con una nota)
      if (range === 'hoy' && !(result?.rows || []).length) {
        const back = startOfDay(new Date())
        back.setDate(back.getDate() - 6)
        const wider = await http.getData(query(back, bounds.to, false))
        const wRows = wider.data?.rows || []
        if (wRows.length) {
          const latestPost = [...wRows].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0].postId
          const latest = wRows.filter(r => r.postId === latestPost)
          result = { ...result, rows: latest, fallbackDate: latest[0].publishedAt }
        }
      }
      setData(result)
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'No se pudieron cargar las métricas')
    } finally {
      setLoading(false)
    }
  }, [bounds, http, range])

  const firstLoad = useRef(true)
  useEffect(() => {
    load(firstLoad.current)
    firstLoad.current = false
  }, [load])

  const rows = useMemo(() => {
    const list = (data?.rows || []).filter(r => network === 'all' || r.network === network)
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = sort.key === 'publishedAt' ? new Date(a.publishedAt).getTime() : (a[sort.key] ?? -1)
      const bv = sort.key === 'publishedAt' ? new Date(b.publishedAt).getTime() : (b[sort.key] ?? -1)
      return (av - bv) * dir
    })
  }, [data, network, sort])

  const pin = data?.pinterest && !data.fallbackDate && (network === 'all' || network === 'pinterest') ? data.pinterest : null
  const totals = useMemo(() => {
    const all = [...rows, ...(pin && !pin.error ? [pin] : [])]
    return { views: sum(all, 'views'), likes: sum(all, 'likes'), comments: sum(all, 'comments'), shares: sum(all, 'shares'), saves: sum(all, 'saves') }
  }, [rows, pin])

  const toggleSort = (key) => setSort(s => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))
  const arrow = (key) => (sort.key === key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : '')
  const hasThreadsError = (data?.rows || []).some(r => r.network === 'threads' && r.error)

  return (
    <div className="social-metrics-module">
      <div className="sm-header">
        <h2>Redes sociales</h2>
        <div className="sm-ranges">
          {RANGES.map(r => (
            <button key={r.key} className={`sm-btn ${range === r.key ? 'active' : ''}`} onClick={() => setRange(r.key)}>{r.label}</button>
          ))}
          {range === 'custom' && (
            <span className="sm-custom">
              <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
              <span>→</span>
              <input type="date" value={customTo} min={customFrom} max={inputDate(new Date())} onChange={(e) => setCustomTo(e.target.value)} />
            </span>
          )}
          <button className="sm-btn sm-refresh" onClick={() => load(true)} disabled={loading} title="Volver a consultar las redes">{loading ? 'Cargando…' : 'Actualizar'}</button>
        </div>
      </div>

      <div className="sm-filters">
        <button className={`sm-chip ${network === 'all' ? 'active' : ''}`} onClick={() => setNetwork('all')}>Todas</button>
        {NETWORKS.map(n => (
          <button key={n.key} className={`sm-chip sm-net-${n.key} ${network === n.key ? 'active' : ''}`} onClick={() => setNetwork(n.key)}>{n.label}</button>
        ))}
      </div>

      <div className="sm-kpis">
        <div className="sm-kpi"><span>Visualizaciones</span><strong>{fmt(totals.views)}</strong></div>
        <div className="sm-kpi"><span>Me gusta</span><strong>{fmt(totals.likes)}</strong></div>
        <div className="sm-kpi"><span>Comentarios</span><strong>{fmt(totals.comments)}</strong></div>
        <div className="sm-kpi"><span>Compartidos</span><strong>{fmt(totals.shares)}</strong></div>
        <div className="sm-kpi"><span>Guardados</span><strong>{fmt(totals.saves)}</strong></div>
      </div>

      {error && <p className="sm-error">{error}</p>}
      {data?.fallbackDate && (
        <p className="sm-note">Hoy aún no hay publicaciones. Se muestra el último reel publicado ({new Date(data.fallbackDate).toLocaleDateString('es', { day: 'numeric', month: 'long' })}); las cifras de arriba son solo de ese reel.</p>
      )}
      {hasThreadsError &&<p className="sm-note">Threads aún no entrega métricas: hay que reconectar la cuenta en Reels para darle el permiso de estadísticas.</p>}

      <div className="sm-table-wrap">
        <table className="sm-table">
          <thead>
            <tr>
              <th className="sm-left sm-col-channel">Canal</th>
              <th className="sm-left sortable" onClick={() => toggleSort('publishedAt')}>Publicación · fecha{arrow('publishedAt')}</th>
              {COLUMNS.map(c => (
                <th key={c.key} className="sortable" title={c.tip || ''} onClick={() => toggleSort(c.key)}>{c.label}{arrow(c.key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pin && (
              <tr className="sm-row sm-row-pinterest sm-pin-row">
                <td className="sm-left sm-channel">
                  <NetworkLogo network="pinterest" />
                  <span className="sm-channel-name">Pinterest</span>
                </td>
                <td className="sm-left">
                  <strong>Todos los pines de la cuenta</strong>
                  {!pin.error && <small>{fmt(pin.pins)} pines del piloto automático en el rango, agrupados en una sola fila</small>}
                  {pin.error && <small className="sm-bad">{pin.error}</small>}
                </td>
                <td>{fmt(pin.views)}</td><td>{fmt(pin.views)}</td><td>—</td><td>—</td><td>—</td>
                <td>{fmt(pin.saves)}</td><td>{fmt(pin.clicks)}</td><td>—</td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={`${r.postId}-${r.network}-${r.account}-${i}`} className={`sm-row sm-row-${r.network}`}>
                <td className="sm-left sm-channel">
                  <NetworkLogo network={r.network} />
                  <span className="sm-channel-name" title={r.account}>{r.account}</span>
                </td>
                <td className="sm-left">
                  {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}
                  <small>{new Date(r.publishedAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
                  {r.error && <small className="sm-bad" title={r.error}>⚠ sin datos</small>}
                </td>
                {COLUMNS.map(c => <td key={c.key}>{c.key === 'avgWatchSec' ? fmtSec(r[c.key]) : fmt(r[c.key])}</td>)}
              </tr>
            ))}
            {!loading && rows.length === 0 && !pin && (
              <tr className="sm-row"><td colSpan={2 + COLUMNS.length} className="sm-empty">No hay publicaciones en este rango.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="sm-foot">Las cifras de cada publicación son las acumuladas hasta ahora. Se consultan en vivo al entrar y al pulsar Actualizar.</p>
    </div>
  )
}
