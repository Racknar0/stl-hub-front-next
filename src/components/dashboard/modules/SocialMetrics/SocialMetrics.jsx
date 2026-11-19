"use client"
import React, { useCallback, useEffect, useMemo, useState } from 'react'
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

  const load = useCallback(async () => {
    if (bounds.to < bounds.from) { setError('La fecha final es anterior a la inicial'); return }
    setLoading(true)
    setError('')
    try {
      const res = await http.getData(`/reels/metrics?from=${encodeURIComponent(bounds.from.toISOString())}&to=${encodeURIComponent(bounds.to.toISOString())}`)
      setData(res.data)
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'No se pudieron cargar las métricas')
    } finally {
      setLoading(false)
    }
  }, [bounds, http])

  useEffect(() => { load() }, [load])

  const rows = useMemo(() => {
    const list = (data?.rows || []).filter(r => network === 'all' || r.network === network)
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = sort.key === 'publishedAt' ? new Date(a.publishedAt).getTime() : (a[sort.key] ?? -1)
      const bv = sort.key === 'publishedAt' ? new Date(b.publishedAt).getTime() : (b[sort.key] ?? -1)
      return (av - bv) * dir
    })
  }, [data, network, sort])

  const pin = data?.pinterest && (network === 'all' || network === 'pinterest') ? data.pinterest : null
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
          <button className="sm-btn sm-refresh" onClick={load} disabled={loading} title="Volver a consultar las redes">{loading ? 'Cargando…' : 'Actualizar'}</button>
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
      {hasThreadsError && <p className="sm-note">Threads aún no entrega métricas: hay que reconectar la cuenta en Reels para darle el permiso de estadísticas.</p>}

      <div className="sm-table-wrap">
        <table className="sm-table">
          <thead>
            <tr>
              <th className="sm-left">Publicación</th>
              <th className="sm-left sortable" onClick={() => toggleSort('publishedAt')}>Fecha{arrow('publishedAt')}</th>
              {COLUMNS.map(c => (
                <th key={c.key} className="sortable" title={c.tip || ''} onClick={() => toggleSort(c.key)}>{c.label}{arrow(c.key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pin && (
              <tr className="sm-pin-row">
                <td className="sm-left">
                  <span className="sm-badge sm-net-pinterest">Pinterest</span>
                  <strong>{pin.account}</strong>
                  {!pin.error && <small>{fmt(pin.pins)} pines del piloto automático en el rango (más los videos de los reels)</small>}
                  {pin.error && <small className="sm-bad">{pin.error}</small>}
                </td>
                <td className="sm-left">—</td>
                <td>{fmt(pin.views)}</td><td>{fmt(pin.views)}</td><td>—</td><td>—</td><td>—</td>
                <td>{fmt(pin.saves)}</td><td>{fmt(pin.clicks)}</td><td>—</td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={`${r.postId}-${r.network}-${r.account}-${i}`}>
                <td className="sm-left">
                  <span className={`sm-badge sm-net-${r.network}`}>{NETWORKS.find(n => n.key === r.network)?.label}</span>
                  {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a> : r.title}
                  <small>{r.account}</small>
                  {r.error && <small className="sm-bad" title={r.error}>⚠ sin datos</small>}
                </td>
                <td className="sm-left">{new Date(r.publishedAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                {COLUMNS.map(c => <td key={c.key}>{c.key === 'avgWatchSec' ? fmtSec(r[c.key]) : fmt(r[c.key])}</td>)}
              </tr>
            ))}
            {!loading && rows.length === 0 && !pin && (
              <tr><td colSpan={2 + COLUMNS.length} className="sm-empty">No hay publicaciones en este rango.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="sm-foot">Las cifras de cada publicación son las acumuladas hasta ahora. Se actualizan cada 10 minutos.</p>
    </div>
  )
}
