"use client"
import React, { useEffect, useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import HttpService from '@/services/HttpService'
import './TrafficCharts.scss'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Title,
  Tooltip,
  Legend
)

const CHART_TYPES = [
  { value: 'traffic', label: 'Tráfico Diario' },
  { value: 'top-pages', label: 'Páginas más visitadas' },
  { value: 'visitors-vs-sessions', label: 'Visitantes vs Sesiones' },
  { value: 'plan-clicks', label: 'Clicks en Elegir Plan' },
]

function formatDateForInput(date) {
  return date.toISOString().slice(0, 10)
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function formatLabel(dateStr, granularity) {
  if (!dateStr) return ''
  if (granularity === 'hour') {
    // "2026-04-26T14:00" → "14:00"
    const parts = dateStr.split('T')
    return parts[1] || dateStr.slice(11, 16) || dateStr
  }
  // "2026-04-26" → "26 Abr"
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return dateStr
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

const chartColors = {
  pv: { border: '#4facfe', bg: 'rgba(79,172,254,0.15)' },
  sessions: { border: '#00f2fe', bg: 'rgba(0,242,254,0.15)' },
  visitors: { border: '#ff0844', bg: 'rgba(255,8,68,0.15)' },
}

const commonLineOpts = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'top',
      labels: { color: 'rgba(255,255,255,0.7)', usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } },
    },
    tooltip: {
      backgroundColor: 'rgba(20,20,30,0.95)',
      titleColor: '#fff',
      bodyColor: 'rgba(255,255,255,0.85)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      ticks: { color: 'rgba(255,255,255,0.5)', maxRotation: 45, font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
    y: {
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.06)' },
      beginAtZero: true,
    },
  },
}

const barOpts = {
  ...commonLineOpts,
  indexAxis: 'y',
  plugins: {
    ...commonLineOpts.plugins,
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
      grid: { color: 'rgba(255,255,255,0.06)' },
      beginAtZero: true,
    },
    y: {
      ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 11 } },
      grid: { display: false },
    },
  },
}

export default function TrafficCharts() {
  const [chartType, setChartType] = useState('traffic')
  const [fromDate, setFromDate] = useState(() => formatDateForInput(daysAgo(30)))
  const [toDate, setToDate] = useState(() => formatDateForInput(new Date()))
  const [loading, setLoading] = useState(false)
  const [tsData, setTsData] = useState(null)
  const [topPagesData, setTopPagesData] = useState(null)
  const [planClicksData, setPlanClicksData] = useState(null)
  const [activePreset, setActivePreset] = useState('30d')

  const http = useMemo(() => new HttpService(), [])

  const applyPreset = (preset) => {
    const today = formatDateForInput(new Date())
    setActivePreset(preset)
    setToDate(today)
    if (preset === '7d') setFromDate(formatDateForInput(daysAgo(7)))
    else if (preset === '30d') setFromDate(formatDateForInput(daysAgo(30)))
    else if (preset === '1y') setFromDate(formatDateForInput(daysAgo(365)))
  }

  // Fetch data when dates or chart type change
  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        if (chartType === 'top-pages') {
          const res = await http.getData(`/metrics/site-visits/top-pages?from=${fromDate}&to=${toDate}`)
          if (mounted && res?.data) setTopPagesData(res.data)
        } else if (chartType === 'plan-clicks') {
          const res = await http.getData(`/metrics/plan-clicks/timeseries?from=${fromDate}&to=${toDate}`)
          if (mounted && res?.data) setPlanClicksData(res.data)
        } else {
          const res = await http.getData(`/metrics/site-visits/timeseries?from=${fromDate}&to=${toDate}`)
          if (mounted && res?.data) setTsData(res.data)
        }
      } catch (e) {
        console.error('TrafficCharts fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    return () => { mounted = false }
  }, [fromDate, toDate, chartType])

  // Handle manual date change (clear active preset)
  const onFromChange = (e) => { setFromDate(e.target.value); setActivePreset(null) }
  const onToChange = (e) => { setToDate(e.target.value); setActivePreset(null) }

  // Build chart data
  const trafficChartData = useMemo(() => {
    if (!tsData?.series?.length) return null
    const labels = tsData.series.map((s) => formatLabel(s.date, tsData.granularity))
    return {
      labels,
      datasets: [
        {
          label: 'Vistas de Página',
          data: tsData.series.map((s) => s.pv),
          borderColor: chartColors.pv.border,
          backgroundColor: chartColors.pv.bg,
          fill: true,
          tension: 0.35,
          pointRadius: tsData.series.length > 60 ? 0 : 3,
          pointHoverRadius: 5,
        },
        {
          label: 'Sesiones',
          data: tsData.series.map((s) => s.sessions),
          borderColor: chartColors.sessions.border,
          backgroundColor: chartColors.sessions.bg,
          fill: true,
          tension: 0.35,
          pointRadius: tsData.series.length > 60 ? 0 : 3,
          pointHoverRadius: 5,
        },
        {
          label: 'Visitantes',
          data: tsData.series.map((s) => s.visitors),
          borderColor: chartColors.visitors.border,
          backgroundColor: chartColors.visitors.bg,
          fill: true,
          tension: 0.35,
          pointRadius: tsData.series.length > 60 ? 0 : 3,
          pointHoverRadius: 5,
        },
      ],
    }
  }, [tsData])

  const visitorsVsSessionsData = useMemo(() => {
    if (!tsData?.series?.length) return null
    const labels = tsData.series.map((s) => formatLabel(s.date, tsData.granularity))
    return {
      labels,
      datasets: [
        {
          label: 'Sesiones',
          data: tsData.series.map((s) => s.sessions),
          borderColor: chartColors.sessions.border,
          backgroundColor: chartColors.sessions.bg,
          fill: true,
          tension: 0.35,
          pointRadius: tsData.series.length > 60 ? 0 : 3,
          pointHoverRadius: 5,
        },
        {
          label: 'Visitantes Únicos',
          data: tsData.series.map((s) => s.visitors),
          borderColor: chartColors.visitors.border,
          backgroundColor: chartColors.visitors.bg,
          fill: true,
          tension: 0.35,
          pointRadius: tsData.series.length > 60 ? 0 : 3,
          pointHoverRadius: 5,
        },
      ],
    }
  }, [tsData])

  const topPagesChartData = useMemo(() => {
    if (!topPagesData?.pages?.length) return null
    const pages = topPagesData.pages.slice(0, 50)
    return {
      labels: pages.map((p) => p.path.length > 50 ? p.path.slice(0, 47) + '...' : p.path),
      datasets: [
        {
          label: 'Visitas',
          data: pages.map((p) => p.count),
          backgroundColor: [
            'rgba(79,172,254,0.7)',
            'rgba(0,242,254,0.7)',
            'rgba(255,8,68,0.6)',
            'rgba(168,85,247,0.6)',
            'rgba(250,204,21,0.6)',
            'rgba(34,197,94,0.6)',
            'rgba(251,146,60,0.6)',
            'rgba(56,189,248,0.6)',
            'rgba(244,114,182,0.6)',
            'rgba(163,230,53,0.6)',
          ],
          borderColor: 'transparent',
          borderRadius: 4,
          barThickness: 16,
        },
      ],
    }
  }, [topPagesData])

  const planClicksChartData = useMemo(() => {
    if (!planClicksData?.series?.length) return null
    const labels = planClicksData.series.map((s) => formatLabel(s.date, planClicksData.granularity))
    return {
      labels,
      datasets: [
        {
          label: 'Total',
          data: planClicksData.series.map((s) => s.total),
          borderColor: 'transparent',
          backgroundColor: 'rgba(167,139,250,0.85)',
          borderRadius: 4,
        },
        {
          label: '30 días',
          data: planClicksData.series.map((s) => s['1m']),
          borderColor: 'transparent',
          backgroundColor: 'rgba(79,172,254,0.7)',
          borderRadius: 4,
        },
        {
          label: '90 días',
          data: planClicksData.series.map((s) => s['3m']),
          borderColor: 'transparent',
          backgroundColor: 'rgba(0,242,254,0.7)',
          borderRadius: 4,
        },
        {
          label: '180 días',
          data: planClicksData.series.map((s) => s['6m']),
          borderColor: 'transparent',
          backgroundColor: 'rgba(52,211,153,0.7)',
          borderRadius: 4,
        },
        {
          label: '365 días',
          data: planClicksData.series.map((s) => s['12m']),
          borderColor: 'transparent',
          backgroundColor: 'rgba(251,191,36,0.7)',
          borderRadius: 4,
        },
      ],
    }
  }, [planClicksData])

  const CHART_DESCRIPTIONS = {
    'traffic': (
      <>
        <strong style={{ color: '#f8fafc' }}>Visión General del Tráfico:</strong> Mide los 3 pilares de tu sitio web día a día:<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#ff0844' }}>Visitantes:</strong> Personas reales o dispositivos únicos que entraron.</li>
          <li><strong style={{ color: '#00f2fe' }}>Sesiones:</strong> Visitas totales (una misma persona puede entrar varias veces y generar varias sesiones).</li>
          <li><strong style={{ color: '#4facfe' }}>Vistas de Página:</strong> La suma de todos los modelos o páginas que cargaron en esas sesiones.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Si 1 persona entra 2 veces al día y mira 5 modelos en total = 1 Visitante, 2 Sesiones, 5 Vistas.<br/>
        <span style={{ color: '#34d399' }}>🚀 Ventaja:</span> Detectas picos de viralidad. Si lanzas una campaña, aquí verás el impacto directo.
      </>
    ),
    'top-pages': (
      <>
        <strong style={{ color: '#f8fafc' }}>El Ranking de Popularidad:</strong> Descubre qué URLs o partes de tu sitio se roban toda la atención.<br/>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Podrás ver si la página de inicio o un modelo específico de "Busto de Batman" tiene más visitas que el resto.<br/>
        <span style={{ color: '#34d399' }}>🚀 Ventaja:</span> Sabrás exactamente qué tipo de contenido demanda tu audiencia para que puedas subir más modelos de ese estilo.
      </>
    ),
    'visitors-vs-sessions': (
      <>
        <strong style={{ color: '#f8fafc' }}>Termómetro de Fidelidad:</strong> Compara a las personas únicas (Visitantes) frente a las veces totales que entran (Sesiones).<br/>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Si tienes 100 visitantes pero 300 sesiones en una semana, significa que tu audiencia es súper fiel y vuelven casi 3 veces por persona.<br/>
        <span style={{ color: '#34d399' }}>🚀 Ventaja:</span> Te ayuda a medir tu "retención". Sabrás si tu página logra enganchar a la gente para que regresen constantemente.
      </>
    ),
    'plan-clicks': (
      <>
        <strong style={{ color: '#f8fafc' }}>Intención de Compra:</strong> Mide el interés por tus suscripciones midiendo cuántas veces le dan clic al botón "Elegir Plan".<br/>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Puedes descubrir que el plan de "180 días" recibe el doble de clics que los demás porque les parece una mejor oferta.<br/>
        <span style={{ color: '#34d399' }}>🚀 Ventaja:</span> Descubres cuál es tu plan "Estrella" y puedes optimizar tus precios o saber qué promocionar en tus redes sociales.
      </>
    )
  }

  const renderChart = () => {
    if (loading) {
      return <div className="chart-loading"><span className="chart-spinner" />Cargando datos...</div>
    }

    if (chartType === 'traffic') {
      if (!trafficChartData) return <div className="chart-empty">Sin datos para este rango</div>
      return <Line data={trafficChartData} options={commonLineOpts} />
    }

    if (chartType === 'visitors-vs-sessions') {
      if (!visitorsVsSessionsData) return <div className="chart-empty">Sin datos para este rango</div>
      return <Line data={visitorsVsSessionsData} options={commonLineOpts} />
    }

    if (chartType === 'top-pages') {
      if (!topPagesChartData) return <div className="chart-empty">Sin datos para este rango</div>
      return <Bar data={topPagesChartData} options={barOpts} />
    }

    if (chartType === 'plan-clicks') {
      if (!planClicksChartData) return <div className="chart-empty">Sin datos para este rango</div>
      return <Bar data={planClicksChartData} options={{...commonLineOpts, interaction: { mode: 'index', intersect: false } }} />
    }

    return null
  }

  return (
    <div className="traffic-charts-module">
      <div className="charts-header" style={{ marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '4px' }}>Gráficas de Tráfico</h3>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.4 }}>
          {CHART_DESCRIPTIONS[chartType]}
        </div>
      </div>

      <div className="charts-controls">
        <div className="charts-controls-left">
          <label className="chart-type-label">
            Tipo:
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="chart-type-select"
            >
              {CHART_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="charts-controls-right">
          <div className="preset-btns">
            {[{ key: '7d', label: '7D' }, { key: '30d', label: '30D' }, { key: '1y', label: '1A' }].map(({ key, label }) => (
              <button
                key={key}
                className={`preset-btn ${activePreset === key ? 'active' : ''}`}
                onClick={() => applyPreset(key)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="date-range-picker">
            <input
              type="date"
              value={fromDate}
              onChange={onFromChange}
              className="date-input"
              max={toDate}
            />
            <span className="date-separator">→</span>
            <input
              type="date"
              value={toDate}
              onChange={onToChange}
              className="date-input"
              min={fromDate}
              max={formatDateForInput(new Date())}
            />
          </div>
        </div>
      </div>

      <div 
        className="chart-canvas-wrap" 
        style={chartType === 'top-pages' ? { minHeight: `${Math.max(450, (topPagesData?.pages?.slice(0,50).length || 0) * 26)}px`, maxHeight: 'none' } : {}}
      >
        {renderChart()}
      </div>
    </div>
  )
}
