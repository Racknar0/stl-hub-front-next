"use client"
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import './SocialMetrics.scss'
import HttpService from '@/services/HttpService'
import SocialCharts, { Sparkline, Delta } from './SocialCharts'

const NETWORKS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'threads', label: 'Threads' },
  { key: 'bluesky', label: 'Bluesky' },
  { key: 'tumblr', label: 'Tumblr' },
  { key: 'mastodon', label: 'Mastodon' },
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
  if (network === 'mastodon') {
    return (
      <svg {...common}>
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#6364FF" />
        <path fill="#fff" transform="translate(2.4 2.6) scale(0.8)" d="M20.9 8.2c0-4-2.6-5.2-2.6-5.2C17 2.4 14.7 2.1 12.3 2.1h-.1c-2.4 0-4.7.3-6 .9 0 0-2.6 1.2-2.6 5.2v3c.1 3.9.7 7.7 4.3 8.7 1.6.4 3 .5 4.2.5 2.1-.1 3.3-.8 3.3-.8l-.1-1.5s-1.5.5-3.2.4c-1.7-.1-3.5-.2-3.8-2.3v-.6s1.7.4 3.8.5c1.3.1 2.5-.1 3.7-.2 2.4-.3 4.4-1.7 4.7-3 .4-2.1.4-5.1.4-5.1zm-3.2 5.3h-2V8.6c0-1-.4-1.6-1.3-1.6-1 0-1.5.6-1.5 1.9v2.7h-2V8.9c0-1.3-.5-1.9-1.5-1.9-.9 0-1.3.6-1.3 1.6v4.9h-2V8.4c0-1 .3-1.9.8-2.5.5-.6 1.3-.9 2.2-.9 1 0 1.8.4 2.3 1.2l.5.8.5-.8c.5-.8 1.3-1.2 2.3-1.2.9 0 1.7.3 2.2.9.5.6.8 1.5.8 2.5v5.1z" />
      </svg>
    )
  }
  if (network === 'tumblr') {
    return (
      <svg {...common}>
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#001935" />
        <path fill="#fff" d="M13.9 18.6c-2.1 0-3.6-1.1-3.6-3.6v-4.1H8.4V8.7c2.1-.5 3-2.3 3.1-3.9h2.2v3.6h2.6v2.5h-2.6v3.6c0 1.1.5 1.5 1.4 1.5h1.3v2.6h-2.5z" />
      </svg>
    )
  }
  if (network === 'bluesky') {
    return (
      <svg {...common}>
        <rect x="1" y="1" width="22" height="22" rx="6" fill="#1185FE" />
        <path fill="#fff" transform="translate(4 5.2) scale(0.0267)" d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
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
  const [history, setHistory] = useState(null)
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

  // Evolución (fotos periódicas guardadas por el servidor); no consulta las redes
  const loadHistory = useCallback(async () => {
    if (bounds.to < bounds.from) return
    try {
      const res = await http.getData(`/reels/metrics/history?from=${encodeURIComponent(bounds.from.toISOString())}&to=${encodeURIComponent(bounds.to.toISOString())}`)
      setHistory(res.data)
    } catch { setHistory(null) }
  }, [bounds, http])
  useEffect(() => { loadHistory() }, [loadHistory])

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
      // La foto de "Actualizar" se guarda en el servidor un instante después
      if (fresh) setTimeout(loadHistory, 5000)
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'No se pudieron cargar las métricas')
    } finally {
      setLoading(false)
    }
  }, [bounds, http, range, loadHistory])

  // Al entrar o cambiar de rango se usa lo que el servidor ya tiene guardado; solo "Actualizar" consulta las redes en vivo
  useEffect(() => { load(false) }, [load])

  const ageMin = data?.dataAt ? Math.max(0, Math.round((Date.now() - new Date(data.dataAt).getTime()) / 60000)) : null
  const ageLabel = ageMin === null ? '' : ageMin < 1 ? 'recién actualizado' : ageMin < 60 ? `hace ${ageMin} min` : `hace ${Math.round(ageMin / 60)} h`

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
    // Las vistas de Pinterest (impresiones) no se suman al total salvo que se filtre solo Pinterest
    const viewsOf = network === 'pinterest' ? all : all.filter(r => r.network !== 'pinterest')
    return { views: sum(viewsOf, 'views'), likes: sum(all, 'likes'), comments: sum(all, 'comments'), shares: sum(all, 'shares'), saves: sum(all, 'saves') }
  }, [rows, pin, network])

  const rangeDays = Math.max(1, Math.round((bounds.to - bounds.from) / 86400000))
  // Qué redes cuentan en cada tarjeta: la elegida, o todas; las vistas de Pinterest solo si se filtra Pinterest
  const counts = (n, k) => (network === 'all' ? !(k === 'views' && n === 'pinterest') : network === n)
  // Serie y total ganado de cada métrica (según la red elegida) para las tarjetas
  const kpiHistory = useMemo(() => {
    const pts = history?.points || []
    const pick = (p, k) => Object.entries(p.byNetwork).reduce((t, [n, v]) => t + (counts(n, k) ? v[k] || 0 : 0), 0)
    return Object.fromEntries(['views', 'likes', 'comments', 'shares', 'saves'].map(k => [k, { series: pts.map(p => pick(p, k)), gained: pts.reduce((t, p) => t + pick(p, k), 0) }]))
  }, [history, network])
  // Periodo anterior con el mismo criterio (red elegida y sin Pinterest en las vistas)
  const prevFor = (k) => {
    const byNet = history?.previousByNetwork
    if (!byNet) return history?.previousTotals ? history.previousTotals[k] : null
    return Object.entries(byNet).reduce((t, [n, v]) => t + (counts(n, k) ? v[k] || 0 : 0), 0)
  }

  const toggleSort = (key) => setSort(s => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))
  const arrow = (key) => (sort.key === key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : '')
  const hasThreadsError = (data?.rows || []).some(r => r.network === 'threads' && r.error)

  // Una sección por red (todo Facebook junto, todo Instagram junto...) con sus totales
  const groups = useMemo(() => NETWORKS.map(n => {
    const list = rows.filter(r => r.network === n.key)
    const summary = n.key === 'pinterest' && pin ? pin : null
    const all = [...list, ...(summary && !summary.error ? [summary] : [])]
    return {
      ...n,
      list,
      summary,
      totals: Object.fromEntries(COLUMNS.filter(c => c.key !== 'avgWatchSec').map(c => [c.key, all.some(x => x[c.key] != null) ? sum(all, c.key) : null])),
    }
  }).filter(g => g.list.length || g.summary), [rows, pin])

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
        {[['views', 'Visualizaciones'], ['likes', 'Me gusta'], ['comments', 'Comentarios'], ['shares', 'Compartidos'], ['saves', 'Guardados']].map(([k, label]) => (
          <div className="sm-kpi" key={k}>
            <span>{label}</span>
            <strong>{fmt(totals[k])}</strong>
            <Sparkline values={kpiHistory[k].series} color={k === 'views' ? '#ff3366' : '#4da3ff'} />
            <Delta current={kpiHistory[k].gained} previous={prevFor(k)} />
          </div>
        ))}
      </div>

      <SocialCharts rows={rows} pin={pin} history={history} network={network} rangeDays={rangeDays} hourly={rangeDays <= 2} NetworkLogo={NetworkLogo} />

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
              <th className="sm-left">Publicación</th>
              <th className="sm-left sortable sm-col-date" onClick={() => toggleSort('publishedAt')}>Fecha{arrow('publishedAt')}</th>
              {COLUMNS.map(c => (
                <th key={c.key} className="sortable" title={c.tip || ''} onClick={() => toggleSort(c.key)}>{c.label}{arrow(c.key)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <React.Fragment key={g.key}>
                <tr className={`sm-group sm-row-${g.key}`}>
                  <td className="sm-left" colSpan={3}>
                    <span className="sm-group-title">
                      <NetworkLogo network={g.key} size={22} />
                      <strong>{g.label}</strong>
                      <small>{g.key === 'pinterest' && g.summary ? `${fmt(g.summary.pins)} pines del piloto + ${g.list.length} de reels` : `${g.list.length} ${g.list.length === 1 ? 'publicación' : 'publicaciones'}`}</small>
                    </span>
                  </td>
                  {COLUMNS.map(c => <td key={c.key}>{c.key === 'avgWatchSec' ? '' : fmt(g.totals[c.key])}</td>)}
                </tr>
                {g.summary && (
                  <tr className={`sm-row sm-row-${g.key}`}>
                    <td className="sm-left sm-channel"><span className="sm-channel-name">Cuenta</span></td>
                    <td className="sm-left sm-title">
                      <span className="sm-title-text">Todos los pines (piloto automático agrupado)</span>
                      {g.summary.error && <small className="sm-bad" title={g.summary.error}>⚠ sin datos</small>}
                    </td>
                    <td className="sm-left">—</td>
                    <td>{fmt(g.summary.views)}</td><td>{fmt(g.summary.views)}</td><td>—</td><td>—</td><td>—</td>
                    <td>{fmt(g.summary.saves)}</td><td>{fmt(g.summary.clicks)}</td><td>—</td>
                  </tr>
                )}
                {g.list.map((r, i) => (
                  <tr key={`${r.postId}-${r.account}-${i}`} className={`sm-row sm-row-${r.network}`}>
                    <td className="sm-left sm-channel"><span className="sm-channel-name" title={r.account}>{r.account}</span></td>
                    <td className="sm-left sm-title">
                      <div className="sm-title-wrap">
                        {r.long && <span className="sm-long" title="Video largo (recopilación horizontal)">Largo</span>}
                        {r.trend && <span className="sm-trend" title={`Textos con tendencia: ${r.trend}`}>🔥</span>}
                        {r.url
                          ? <a className="sm-title-link" href={r.url} target="_blank" rel="noopener noreferrer" title={`Abrir en ${NETWORKS.find(n => n.key === r.network)?.label || 'la red'}: ${r.title}`}><span className="sm-title-text">{r.title}</span><span className="sm-ext" aria-hidden="true">↗</span></a>
                          : <span className="sm-title-text" title={r.title}>{r.title}</span>}
                        {r.error && <small className="sm-bad" title={r.error}>⚠ sin datos</small>}
                      </div>
                    </td>
                    <td className="sm-left sm-date">{new Date(r.publishedAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    {COLUMNS.map(c => <td key={c.key}>{c.key === 'avgWatchSec' ? fmtSec(r[c.key]) : fmt(r[c.key])}</td>)}
                  </tr>
                ))}
              </React.Fragment>
            ))}
            {!loading && rows.length === 0 && !pin && (
              <tr className="sm-row"><td colSpan={3 + COLUMNS.length} className="sm-empty">No hay publicaciones en este rango.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="sm-foot">Las cifras de cada publicación son las acumuladas hasta ahora.{ageLabel && ` Datos de ${ageLabel}: se guardan 30 min para no saturar las APIs; pulsa Actualizar para consultarlos en vivo.`}</p>
    </div>
  )
}
