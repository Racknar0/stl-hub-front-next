"use client"
import React, { useMemo, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend)

export const NET_COLORS = { facebook: '#1877f2', instagram: '#d6249f', youtube: '#ff0033', pinterest: '#e60023', threads: '#cfcfcf', bluesky: '#1185fe', tumblr: '#7c8db5' }
const NET_LABELS = { facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', pinterest: 'Pinterest', threads: 'Threads', bluesky: 'Bluesky', tumblr: 'Tumblr' }
const METRICS = [
  { key: 'views', label: 'Visualizaciones' },
  { key: 'likes', label: 'Me gusta' },
  { key: 'comments', label: 'Comentarios' },
  { key: 'shares', label: 'Compartidos' },
  { key: 'saves', label: 'Guardados' },
]
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const fmt = (v) => Number(v || 0).toLocaleString('es')
const AXIS = 'rgba(255,255,255,0.55)'
const GRID = 'rgba(255,255,255,0.06)'

const pointLabel = (iso, hourly) => {
  const d = new Date(iso)
  return hourly
    ? d.toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

/** Mini línea para las tarjetas de números */
export function Sparkline({ values, color = '#ff3366' }) {
  if (!values || values.length < 2) return <div className="sm-spark sm-spark-empty" title="Se llena con las fotos periódicas" />
  return (
    <div className="sm-spark">
      <Line
        data={{ labels: values.map((_, i) => i), datasets: [{ data: values, borderColor: color, backgroundColor: `${color}33`, fill: true, tension: 0.35, borderWidth: 1.5, pointRadius: 0 }] }}
        options={{ responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false, beginAtZero: true } } }}
      />
    </div>
  )
}

/** Porcentaje de cambio frente al periodo anterior */
export function Delta({ current, previous }) {
  if (previous === null || previous === undefined) return <small className="sm-delta">sin periodo previo</small>
  if (!previous) return <small className="sm-delta">{current ? 'nuevo' : '—'}</small>
  const pct = Math.round(((current - previous) / previous) * 100)
  return <small className={`sm-delta ${pct >= 0 ? 'up' : 'down'}`}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% vs periodo anterior</small>
}

function Bars({ items, empty }) {
  if (!items.length) return <p className="sm-chart-empty">{empty}</p>
  const max = Math.max(...items.map(i => i.value), 1)
  return (
    <ul className="sm-bars">
      {items.map(i => (
        <li key={i.key} title={i.title || i.label}>
          <span className="sm-bar-label">{i.logo}{i.label}</span>
          <span className="sm-bar-track"><span className="sm-bar-fill" style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: i.color }} /></span>
          <span className="sm-bar-value">{i.display}</span>
        </li>
      ))}
    </ul>
  )
}

export default function SocialCharts({ rows, pin, history, network, rangeDays, hourly, NetworkLogo }) {
  const [metric, setMetric] = useState('views')
  const points = history?.points || []

  // Evolución por red (lo ganado entre cada foto)
  const evolution = useMemo(() => {
    const nets = Object.keys(NET_LABELS).filter(n => (network === 'all' || network === n) && points.some(p => p.byNetwork[n]))
    return {
      labels: points.map(p => pointLabel(p.t, hourly)),
      datasets: nets.map(n => ({
        label: NET_LABELS[n], data: points.map(p => p.byNetwork[n]?.[metric] || 0),
        borderColor: NET_COLORS[n], backgroundColor: `${NET_COLORS[n]}22`, fill: true, tension: 0.35, borderWidth: 2, pointRadius: 2,
      })),
    }
  }, [points, network, metric, hourly])

  // Reparto de vistas por red
  const split = useMemo(() => {
    const totals = {}
    for (const r of rows) totals[r.network] = (totals[r.network] || 0) + (Number(r.views) || 0)
    if (pin && !pin.error) totals.pinterest = (totals.pinterest || 0) + (Number(pin.views) || 0)
    const nets = Object.keys(totals).filter(n => totals[n] > 0)
    return { nets, totals, sum: nets.reduce((t, n) => t + totals[n], 0) }
  }, [rows, pin])

  const top = useMemo(() => [...rows].filter(r => Number(r.views) > 0).sort((a, b) => b.views - a.views).slice(0, 5).map((r, i) => ({
    key: `${r.postId}-${r.account}-${i}`, label: r.title, title: `${r.title} · ${r.account}`, value: r.views, display: fmt(r.views),
    color: NET_COLORS[r.network], logo: <NetworkLogo network={r.network} size={16} />,
  })), [rows, NetworkLogo])

  // Interacción = (me gusta + comentarios + compartidos + guardados) / visualizaciones
  const engagement = useMemo(() => {
    const acc = {}
    for (const r of rows) {
      const a = (acc[r.network] ||= { views: 0, inter: 0 })
      a.views += Number(r.views) || 0
      a.inter += (Number(r.likes) || 0) + (Number(r.comments) || 0) + (Number(r.shares) || 0) + (Number(r.saves) || 0)
    }
    return Object.entries(acc).filter(([, a]) => a.views > 0).map(([n, a]) => ({
      key: n, label: NET_LABELS[n], value: (a.inter / a.views) * 100, display: `${((a.inter / a.views) * 100).toFixed(1)}%`,
      color: NET_COLORS[n], logo: <NetworkLogo network={n} size={16} />,
    })).sort((a, b) => b.value - a.value)
  }, [rows, NetworkLogo])

  // Mapa de calor: promedio de vistas por reel según día de la semana y hora de publicación
  const heat = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ sum: 0, n: 0 })))
    for (const r of rows) {
      const d = new Date(r.publishedAt)
      const c = grid[d.getDay()][d.getHours()]
      c.sum += Number(r.views) || 0
      c.n += 1
    }
    const max = Math.max(...grid.flat().map(c => (c.n ? c.sum / c.n : 0)), 1)
    return { grid, max }
  }, [rows])

  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { labels: { color: AXIS, boxWidth: 10, usePointStyle: true } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y)}` } } },
    scales: { x: { ticks: { color: AXIS, maxTicksLimit: 8 }, grid: { color: GRID } }, y: { beginAtZero: true, ticks: { color: AXIS, precision: 0 }, grid: { color: GRID } } },
  }

  return (
    <div className="sm-charts">
      <section className="sm-chart sm-chart-wide">
        <header>
          <h3>Evolución</h3>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </header>
        {evolution.datasets.length && points.length > 1
          ? <div className="sm-chart-box"><Line data={evolution} options={lineOptions} /></div>
          : <p className="sm-chart-empty">Se llena con las fotos automáticas (una cada 6 h y otra al pulsar Actualizar). Aún no hay suficientes puntos en este rango.</p>}
      </section>

      <section className="sm-chart">
        <header><h3>Vistas por red</h3></header>
        {split.nets.length ? (
          <div className="sm-donut">
            <div className="sm-chart-box sm-donut-box">
              <Doughnut
                data={{ labels: split.nets.map(n => NET_LABELS[n]), datasets: [{ data: split.nets.map(n => split.totals[n]), backgroundColor: split.nets.map(n => NET_COLORS[n]), borderWidth: 0 }] }}
                options={{ responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${fmt(c.parsed)} (${Math.round((c.parsed / split.sum) * 100)}%)` } } } }}
              />
              <div className="sm-donut-center"><strong>{fmt(split.sum)}</strong><span>vistas</span></div>
            </div>
            <ul className="sm-legend">
              {split.nets.map(n => (
                <li key={n}><NetworkLogo network={n} size={14} />{NET_LABELS[n]}<b>{Math.round((split.totals[n] / split.sum) * 100)}%</b></li>
              ))}
            </ul>
          </div>
        ) : <p className="sm-chart-empty">Sin vistas en este rango.</p>}
      </section>

      <section className="sm-chart">
        <header><h3>Top 5 publicaciones</h3></header>
        <Bars items={top} empty="Sin vistas en este rango." />
      </section>

      <section className="sm-chart">
        <header><h3>Interacción por red</h3><small>(me gusta + comentarios + compartidos + guardados) ÷ vistas</small></header>
        <Bars items={engagement} empty="Sin datos suficientes." />
      </section>

      {rangeDays >= 7 && (
        <section className="sm-chart sm-chart-wide">
          <header><h3>¿Cuándo rinde mejor publicar?</h3><small>Promedio de vistas por reel según día y hora de publicación</small></header>
          <div className="sm-heat">
            <div className="sm-heat-hours"><span />{Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 3 === 0 ? h : ''}</span>)}</div>
            {heat.grid.map((hours, d) => (
              <div className="sm-heat-row" key={d}>
                <span className="sm-heat-day">{DAYS[d]}</span>
                {hours.map((c, h) => {
                  const avg = c.n ? c.sum / c.n : 0
                  return <span key={h} className="sm-heat-cell" style={{ background: c.n ? `rgba(255, 51, 102, ${0.15 + 0.85 * (avg / heat.max)})` : 'rgba(255,255,255,0.04)' }} title={c.n ? `${DAYS[d]} ${h}:00 · ${c.n} publicaciones · ${fmt(Math.round(avg))} vistas en promedio` : `${DAYS[d]} ${h}:00 · sin publicaciones`} />
                })}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
