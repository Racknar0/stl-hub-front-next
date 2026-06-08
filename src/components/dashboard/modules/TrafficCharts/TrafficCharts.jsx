"use client"
import React, { useEffect, useState, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import HttpService from '@/services/HttpService'
import './TrafficCharts.scss'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
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
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - (offset * 60 * 1000))
  return localDate.toISOString().slice(0, 10)
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function formatLabel(dateStr, granularity) {
  if (!dateStr) return ''
  if (granularity === 'hour') {
    const parts = dateStr.split('T')
    return parts[1] || dateStr.slice(11, 16) || dateStr
  }
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return dateStr
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  
  if (granularity === 'month') {
     return months[d.getMonth()]
  }
  if (granularity === 'week') {
     return `Sem ${d.getDate()} ${months[d.getMonth()]}`
  }
  
  return `${d.getDate()} ${months[d.getMonth()]}`
}

function fillMissingBuckets(series, fromStr, toStr, granularity) {
  if (!series) return [];
  if (granularity === 'hour') return series;

  const result = [];
  let current = new Date(fromStr + 'T00:00:00');
  const end = new Date(toStr + 'T00:00:00');
  
  // Alinear la fecha inicial al inicio de la semana o mes para que coincida con MySQL
  if (granularity === 'week') {
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Lunes como inicio
    current.setDate(diff);
  } else if (granularity === 'month') {
    current.setDate(1);
  }
  
  let limit = 0;
  // Avanzamos hasta end + un pequeño margen proporcional para asegurar el último bucket
  const finalBoundary = new Date(end.getTime());
  if (granularity === 'day') {
    finalBoundary.setDate(finalBoundary.getDate() + 2);
  } else if (granularity === 'week') {
    finalBoundary.setDate(finalBoundary.getDate() + 14); // 2 semanas
  } else if (granularity === 'month') {
    finalBoundary.setMonth(finalBoundary.getMonth() + 1); // 1 mes suele ser suficiente para padding
  } else {
    finalBoundary.setDate(finalBoundary.getDate() + 2);
  }
  
  while (current <= finalBoundary && limit < 400) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${d}`;
    const existing = series.find(s => s.date === dStr);
    
    if (existing) {
      result.push(existing);
    } else {
      result.push({ 
        date: dStr, 
        pv: 0, sessions: 0, visitors: 0,
        total: 0, '1m': 0, '3m': 0, '6m': 0, '12m': 0,
        count: 0, registrations: 0, searchCount: 0
      });
    }

    if (granularity === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (granularity === 'week') {
      current.setDate(current.getDate() + 7);
    } else if (granularity === 'month') {
      current.setMonth(current.getMonth() + 1);
    }
    limit++;
  }
  
  // Asegurarnos de que no falte ningún elemento extra devuelto por la BD
  const mappedDates = new Set(result.map(r => r.date));
  for (const s of series) {
    if (!mappedDates.has(s.date)) {
      result.push(s);
    }
  }
  
  // Ordenar de más antiguo a más reciente
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

const chartColors = {
  pv: { border: '#4facfe', bg: 'rgba(79,172,254,0.15)' },
  sessions: { border: '#00f2fe', bg: 'rgba(0,242,254,0.15)' },
  visitors: { border: '#ff0844', bg: 'rgba(255,8,68,0.15)' },
  registrations: { border: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  downloads: { border: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
  searches: { border: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
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

const stackedBarOpts = {
  ...commonLineOpts,
  interaction: { mode: 'index', intersect: false },
  scales: {
    ...commonLineOpts.scales,
    x: { ...commonLineOpts.scales.x, stacked: true },
    y: { ...commonLineOpts.scales.y, stacked: true },
  },
}

const barOpts = {
  ...commonLineOpts,
  indexAxis: 'y',
  interaction: { mode: 'nearest', intersect: true },
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
      ticks: { 
        color: 'rgba(255,255,255,0.7)', 
        font: { size: 11 },
        callback: function(value) {
          const label = this.getLabelForValue(value);
          if (typeof label === 'string' && label.length > 20) {
            return label.slice(0, 17) + '...';
          }
          return label;
        }
      },
      grid: { display: false },
    },
  },
}


const CHART_DESCRIPTIONS = {
    'traffic': (
      <>
        <strong style={{ color: '#f8fafc' }}>Visión General del Tráfico y Registros:</strong> Mide la actividad y el crecimiento de tu comunidad día a día:<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#ff0844' }}>Visitantes:</strong> Personas reales o dispositivos únicos que entraron.</li>
          <li><strong style={{ color: '#00f2fe' }}>Sesiones:</strong> Visitas totales.</li>
          <li><strong style={{ color: '#4facfe' }}>Vistas de Página:</strong> La suma de todos los modelos o páginas que cargaron.</li>
          <li><strong style={{ color: '#f59e0b' }}>Registros:</strong> Nuevos usuarios que crearon una cuenta.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Si 1 visitante entra 2 veces, mira 5 modelos y finalmente se registra = 1 Visitante, 2 Sesiones, 5 Vistas, 1 Registro.
      </>
    ),
    'top-pages': (
      <>
        <strong style={{ color: '#f8fafc' }}>Ranking de Popularidad (Top 50):</strong> Mide exactamente qué partes de tu plataforma atraen más la atención.<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#4facfe' }}>Ruta de la Página (URL):</strong> Te muestra si es el Inicio, la página de búsqueda, o un modelo en específico.</li>
          <li><strong style={{ color: '#00f2fe' }}>Vistas Acumuladas:</strong> La cantidad exacta de veces que esa página fue abierta.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Si ves que un modelo de "Busto de Batman" tiene 300 visitas y el de "Spiderman" solo 50, ya sabes cuál franquicia está más de moda.<br/>
        <span style={{ color: '#34d399' }}>🚀 Cómo sacarle partido:</span> Detecta tendencias reales. Si ves que un modelo se vuelve sorpresivamente popular aquí, úsalo para tus anuncios principales o sube colecciones similares porque eso es lo que la gente quiere comprar.
      </>
    ),
    'visitors-vs-sessions': (
      <>
        <strong style={{ color: '#f8fafc' }}>Termómetro de Fidelidad (Retención):</strong> Compara a las personas únicas frente a las veces totales que regresan a la web.<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#ff0844' }}>Visitantes Únicos:</strong> La línea roja te dice cuántos "humanos" distintos pisaron la web.</li>
          <li><strong style={{ color: '#00f2fe' }}>Sesiones:</strong> La línea azul suma las veces que esos "humanos" entraron al sitio.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Si tienes 1,000 Visitantes pero 2,500 Sesiones, tienes una comunidad súper fiel que entra en promedio 2.5 veces. ¡Los tienes enganchados!<br/>
        <span style={{ color: '#34d399' }}>🚀 Cómo sacarle partido:</span> Si ves que las sesiones casi empatan a los visitantes (ej. 1,000 y 1,050), significa que entran, miran un rato y casi no regresan. Esto te indica que debes usar tácticas como correos electrónicos o notificaciones para recordarles que vuelvan.
      </>
    ),
    'plan-clicks': (
      <>
        <strong style={{ color: '#f8fafc' }}>Intención de Compra Real:</strong> Mide cuántas veces tus usuarios sienten el impulso de presionar "Elegir Plan" (antes de sacar la tarjeta).<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#a78bfa' }}>Total:</strong> Clics globales sumados de todos tus planes.</li>
          <li><strong style={{ color: '#4facfe' }}>Por Plan (30, 90, 180, 365 días):</strong> Desglose en barras individuales para ver qué oferta les resultó más atractiva visualmente.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Notas que casi nadie le da clic a "30 días", pero el de "180 días" se lleva el 80% de los clics.<br/>
        <span style={{ color: '#34d399' }}>🚀 Cómo sacarle partido:</span> Si tienes muchísimos clics en los planes pero pocas ventas reales, significa que el precio es atractivo, pero tal vez la gente desconfía al momento de pagar o la pasarela falla. Te indica exactamente dónde está el "cuello de botella" de tu negocio.
      </>
    ),
    'top-searches': (
      <>
        <strong style={{ color: '#f8fafc' }}>Top Búsquedas:</strong> Descubre qué está intentando encontrar tu comunidad en el buscador.<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#ec4899' }}>Términos más buscados:</strong> Las palabras exactas que la gente escribe buscando modelos.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Si mucha gente busca "Pokemon" y tú no tienes esos modelos, la barra será muy alta y sabrás que ahí hay dinero.<br/>
        <span style={{ color: '#34d399' }}>🚀 Cómo sacarle partido:</span> Si ves términos populares que no tienes en tu tienda, ¡crea o sube esos modelos urgente! Estás perdiendo ventas.
      </>
    ),
    'top-downloads': (
      <>
        <strong style={{ color: '#f8fafc' }}>Top Descargas (Éxitos Reales):</strong> Qué modelos fueron realmente descargados y llevados a producción.<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#38bdf8' }}>Descargas Totales:</strong> Cuántas veces un usuario o suscriptor se descargó tu archivo STL.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> El modelo "Casco Iron Man" se descargó 50 veces esta semana.<br/>
        <span style={{ color: '#34d399' }}>🚀 Cómo sacarle partido:</span> Identifica a tus "Best Sellers" y promuévelos en redes sociales o úsalos como gancho principal en tus anuncios.
      </>
    ),
    'sales-revenue': (
      <>
        <strong style={{ color: '#f8fafc' }}>Ingresos por Pasarela (COP):</strong> Cuánto dinero entró a tu plataforma y de qué manera.<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#3b82f6' }}>PayPal:</strong> Pagos internacionales procesados.</li>
          <li><strong style={{ color: '#0ea5e9' }}>MercadoPago:</strong> Pagos locales y por tarjeta.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Notas que el 90% de tu dinero entra por MercadoPago y casi nada por PayPal.<br/>
        <span style={{ color: '#34d399' }}>🚀 Cómo sacarle partido:</span> Te ayuda a ver si te conviene abrirte más a publicidad internacional (PayPal) o si el mercado local es tu fuerte absoluto.
      </>
    ),
    'user-registrations': (
      <>
        <strong style={{ color: '#f8fafc' }}>Crecimiento de Comunidad (Registros):</strong> La cantidad de personas reales que crearon una cuenta.<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#f59e0b' }}>Nuevos Usuarios:</strong> La cantidad exacta de registros en el rango de fechas.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Entraron 120 usuarios nuevos este mes.<br/>
        <span style={{ color: '#34d399' }}>🚀 Cómo sacarle partido:</span> Si tu tráfico es alto pero tus registros son bajos, necesitas optimizar la página de creación de cuenta o regalar algo a cambio de su registro.
      </>
    ),
    'downloads-timeseries': (
      <>
        <strong style={{ color: '#f8fafc' }}>Histórico de Descargas y Búsquedas:</strong> Mide el interés y la conversión de los usuarios día a día:<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#38bdf8' }}>Descargas:</strong> Cantidad de archivos STL que los usuarios descargaron.</li>
          <li><strong style={{ color: '#ec4899' }}>Búsquedas:</strong> Cantidad de búsquedas totales realizadas en la web.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Si ves un pico alto de búsquedas pero pocas descargas, puede significar que los usuarios buscan modelos que aún no tienes.<br/>
        <span style={{ color: '#34d399' }}>🚀 Cómo sacarle partido:</span> Compara la tendencia. Si el volumen de búsquedas sube pero las descargas no, tienes una oportunidad de subir los modelos que el mercado está pidiendo.
      </>
    ),
    'traffic-sources': (
      <>
        <strong style={{ color: '#f8fafc' }}>Fuentes de Tráfico (Distribución de Visitas):</strong> Descubre de qué canales provienen tus visitas generales (orgánicas, directas y campañas publicitarias) en el rango de fechas:<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#4facfe' }}>Directo:</strong> Usuarios que ingresaron escribiendo la URL o sin procedencia registrada (favoritos, etc.).</li>
          <li><strong style={{ color: '#ec4899' }}>Pinterest:</strong> Tráfico orgánico de pines.</li>
          <li><strong style={{ color: '#10b981' }}>Google:</strong> Búsquedas gratuitas orgánicas.</li>
          <li><strong style={{ color: '#f59e0b' }}>Redes Sociales:</strong> Tráfico orgánico de Facebook, Telegram, Instagram, YouTube, etc.</li>
          <li><strong style={{ color: '#a78bfa' }}>Otros / Campañas:</strong> Campañas específicas creadas por ti.</li>
        </ul>
        <span style={{ color: '#34d399' }}>🚀 Cómo sacarle partido:</span> Identifica cuál canal te está dando mayor visibilidad gratuita y enfoca tus esfuerzos de contenido orgánico en él.
      </>
    )
  }


// Map active preset to backend key
const getPresetKey = (preset) => preset

// --- ChartContainer Component ---
function ChartContainer({ id, title, supportsDynamicDates, expandable, fetchFn, renderChart }) {
  const [fromDate, setFromDate] = useState(() => formatDateForInput(daysAgo(7)))
  const [toDate, setToDate] = useState(() => formatDateForInput(new Date()))
  const [activePreset, setActivePreset] = useState('7d')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const applyPreset = (preset) => {
    const today = formatDateForInput(new Date())
    setActivePreset(preset)
    setToDate(today)
    if (preset === 'hoy') setFromDate(today)
    else if (preset === '2d') setFromDate(formatDateForInput(daysAgo(2)))
    else if (preset === '3d') setFromDate(formatDateForInput(daysAgo(3)))
    else if (preset === '7d') setFromDate(formatDateForInput(daysAgo(7)))
    else if (preset === '15d') setFromDate(formatDateForInput(daysAgo(15)))
    else if (preset === '1m') setFromDate(formatDateForInput(daysAgo(30)))
    else if (preset === '1y') setFromDate(formatDateForInput(daysAgo(365)))
    else if (preset === 'all') setFromDate(formatDateForInput(daysAgo(3650)))
  }

  const onFromChange = (e) => { setFromDate(e.target.value); setActivePreset(null) }
  const onToChange = (e) => { setToDate(e.target.value); setActivePreset(null) }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const result = await fetchFn(fromDate, toDate, getPresetKey(activePreset || '30d'))
        if (mounted) setData(result)
      } catch (e) {
        console.error(`Error loading chart ${id}`, e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [fromDate, toDate, activePreset, fetchFn, id])

  return (
    <div className="chart-block" style={{ marginBottom: '60px', paddingBottom: '50px', borderBottom: '2px dashed rgba(255,255,255,0.2)' }}>
      
      {/* Container header with specific controls */}
      <div className="charts-controls" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5, background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px' }}>
            {CHART_DESCRIPTIONS[id]}
          </div>
        </div>

        <div className="charts-controls-right" style={{ flexShrink: 0 }}>
          <div className="preset-btns">
            {[
              { key: 'hoy', label: 'Hoy' },
              { key: '2d', label: '2D' },
              { key: '3d', label: '3D' },
              { key: '7d', label: '7D' },
              { key: '15d', label: '15D' },
              { key: '1m', label: '1M' },
              { key: '1y', label: '1A' },
              { key: 'all', label: 'Todos' }
            ].map(({ key, label }) => (
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

          {supportsDynamicDates && (
            <div className="date-range-picker">
              <input type="date" value={fromDate} onChange={onFromChange} className="date-input" max={toDate} />
              <span className="date-separator">→</span>
              <input type="date" value={toDate} onChange={onToChange} className="date-input" min={fromDate} max={formatDateForInput(new Date())} />
            </div>
          )}
        </div>
      </div>

      {/* Render Area */}
      <div className="chart-canvas-wrap" style={['top-pages', 'top-searches', 'top-downloads', 'traffic-sources'].includes(id) ? { height: 'auto', maxHeight: 'none', minHeight: id === 'traffic-sources' ? 'unset' : `${Math.max(450, ((expanded ? data?.labels?.length : Math.min(20, data?.labels?.length || 0)) || 0) * 32)}px`, transition: 'height 0.3s ease' } : {}}>
        {loading ? (
          <div className="chart-loading"><span className="chart-spinner" />Cargando datos...</div>
        ) : !data ? (
          <div className="chart-empty">Sin datos para este rango</div>
        ) : (
          renderChart(data, expanded)
        )}
      </div>

      {expandable && data && data.labels?.length > 20 && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#a78bfa', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            {expanded ? '▲ Ver menos' : `▼ Ver más (${data.labels.length})`}
          </button>
        </div>
      )}
    </div>
  )
}

// --- Main Component ---
export default function TrafficCharts() {
  const http = useMemo(() => new HttpService(), [])
  const [copiedToast, setCopiedToast] = useState(null)

  const handleBarClick = (evt, elements, chart) => {
    if (elements && elements.length > 0) {
      const idx = elements[0].index
      const label = chart.data.labels[idx]
      navigator.clipboard.writeText(label)
      setCopiedToast(label)
      setTimeout(() => setCopiedToast(null), 2000)
    }
  }

  const dynamicBarOpts = {
    ...barOpts,
    maintainAspectRatio: false,
    onClick: handleBarClick,
    onHover: (evt, elements) => {
      if (evt.native && evt.native.target) {
        evt.native.target.style.cursor = elements && elements.length ? 'pointer' : 'default'
      }
    }
  }

  // 1. Traffic Fetcher
  const fetchTraffic = React.useCallback(async (from, to) => {
    const res = await http.getData(`/metrics/site-visits/timeseries?from=${from}&to=${to}`)
    const tsData = res?.data
    if (!tsData?.series?.length && !tsData?.granularity) return null
    
    const filledSeries = fillMissingBuckets(tsData.series || [], from, to, tsData.granularity || 'day')
    if (!filledSeries.length) return null

    return {
      labels: filledSeries.map((s) => formatLabel(s.date, tsData.granularity)),
      datasets: [
        { label: 'Vistas de Página', data: filledSeries.map((s) => s.pv), borderColor: chartColors.pv.border, backgroundColor: chartColors.pv.bg, fill: true, tension: 0.35, pointRadius: filledSeries.length > 60 ? 0 : 3, pointHoverRadius: 5 },
        { label: 'Sesiones', data: filledSeries.map((s) => s.sessions), borderColor: chartColors.sessions.border, backgroundColor: chartColors.sessions.bg, fill: true, tension: 0.35, pointRadius: filledSeries.length > 60 ? 0 : 3, pointHoverRadius: 5 },
        { label: 'Visitantes', data: filledSeries.map((s) => s.visitors), borderColor: chartColors.visitors.border, backgroundColor: chartColors.visitors.bg, fill: true, tension: 0.35, pointRadius: filledSeries.length > 60 ? 0 : 3, pointHoverRadius: 5 },
        { label: 'Registros', data: filledSeries.map((s) => s.registrations || 0), borderColor: chartColors.registrations.border, backgroundColor: chartColors.registrations.bg, fill: true, tension: 0.35, pointRadius: filledSeries.length > 60 ? 0 : 3, pointHoverRadius: 5 },
      ]
    }
  }, [http])

  // 2. Visitors vs Sessions Fetcher
  const fetchVisitorsVsSessions = React.useCallback(async (from, to) => {
    const res = await http.getData(`/metrics/site-visits/timeseries?from=${from}&to=${to}`)
    const tsData = res?.data
    if (!tsData?.series?.length && !tsData?.granularity) return null
    
    const filledSeries = fillMissingBuckets(tsData.series || [], from, to, tsData.granularity || 'day')
    if (!filledSeries.length) return null

    return {
      labels: filledSeries.map((s) => formatLabel(s.date, tsData.granularity)),
      datasets: [
        { label: 'Sesiones', data: filledSeries.map((s) => s.sessions), borderColor: chartColors.sessions.border, backgroundColor: chartColors.sessions.bg, fill: true, tension: 0.35, pointRadius: filledSeries.length > 60 ? 0 : 3, pointHoverRadius: 5 },
        { label: 'Visitantes Únicos', data: filledSeries.map((s) => s.visitors), borderColor: chartColors.visitors.border, backgroundColor: chartColors.visitors.bg, fill: true, tension: 0.35, pointRadius: filledSeries.length > 60 ? 0 : 3, pointHoverRadius: 5 },
      ]
    }
  }, [http])

  // 3. Plan Clicks Fetcher
  const fetchPlanClicks = React.useCallback(async (from, to) => {
    const res = await http.getData(`/metrics/plan-clicks/timeseries?from=${from}&to=${to}`)
    const planClicksData = res?.data
    if (!planClicksData?.series?.length && !planClicksData?.granularity) return null
    
    const filledSeries = fillMissingBuckets(planClicksData.series || [], from, to, planClicksData.granularity || 'day')
    if (!filledSeries.length) return null

    return {
      labels: filledSeries.map((s) => formatLabel(s.date, planClicksData.granularity)),
      datasets: [
        { type: 'line', label: 'Total', data: filledSeries.map((s) => s.total), borderColor: 'rgba(167,139,250,1)', backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: filledSeries.length > 60 ? 0 : 3, pointHoverRadius: 5 },
        { type: 'bar', label: '30 días', data: filledSeries.map((s) => s['1m']), borderColor: 'transparent', backgroundColor: 'rgba(79,172,254,0.7)', borderRadius: 4 },
        { type: 'bar', label: '90 días', data: filledSeries.map((s) => s['3m']), borderColor: 'transparent', backgroundColor: 'rgba(0,242,254,0.7)', borderRadius: 4 },
        { type: 'bar', label: '180 días', data: filledSeries.map((s) => s['6m']), borderColor: 'transparent', backgroundColor: 'rgba(52,211,153,0.7)', borderRadius: 4 },
        { type: 'bar', label: '365 días', data: filledSeries.map((s) => s['12m']), borderColor: 'transparent', backgroundColor: 'rgba(251,191,36,0.7)', borderRadius: 4 },
      ]
    }
  }, [http])

  // 4. Top Pages Fetcher
  const fetchTopPages = React.useCallback(async (from, to) => {
    const res = await http.getData(`/metrics/site-visits/top-pages?from=${from}&to=${to}`)
    const topPagesData = res?.data
    if (!topPagesData?.pages?.length) return null
    const pages = topPagesData.pages.slice(0, 50)
    return {
      labels: pages.map((p) => p.path),
      datasets: [{
        label: 'Visitas',
        data: pages.map((p) => p.count),
        backgroundColor: ['rgba(79,172,254,0.7)','rgba(0,242,254,0.7)','rgba(255,8,68,0.6)','rgba(168,85,247,0.6)','rgba(250,204,21,0.6)','rgba(34,197,94,0.6)','rgba(251,146,60,0.6)','rgba(56,189,248,0.6)','rgba(244,114,182,0.6)','rgba(163,230,53,0.6)'],
        borderColor: 'transparent', borderRadius: 4, barThickness: 16
      }]
    }
  }, [http])

  // 5. Sales Fetcher
  const fetchSales = React.useCallback(async (from, to, presetKey) => {
    const res = await http.getData('/metrics/sales')
    const salesData = res?.data
    const itemsArr = salesData?.items?.[presetKey]
    if (!itemsArr?.length) return null
    let paypal = 0, mp = 0, other = 0
    itemsArr.forEach(i => {
      if (i.method === 'PayPal') paypal += i.amountCop
      else if (i.method === 'MercadoPago') mp += i.amountCop
      else other += i.amountCop
    })
    return {
      labels: ['PayPal', 'MercadoPago', 'Otros'].filter((_, i) => [paypal, mp, other][i] > 0),
      datasets: [{
        data: [paypal, mp, other].filter(v => v > 0),
        backgroundColor: ['rgba(59, 130, 246, 0.8)','rgba(14, 165, 233, 0.8)','rgba(100, 116, 139, 0.8)'],
        borderColor: 'rgba(15, 23, 42, 0.8)', borderWidth: 2
      }]
    }
  }, [http])

  // 6. Registrations Fetcher (Ahora usa Timeseries)
  const fetchRegistrations = React.useCallback(async (from, to) => {
    const res = await http.getData(`/metrics/registrations/timeseries?from=${from}&to=${to}`)
    const tsData = res?.data
    if (!tsData?.series?.length && !tsData?.granularity) return null
    
    const filledSeries = fillMissingBuckets(tsData.series || [], from, to, tsData.granularity || 'day')
    if (!filledSeries.length) return null

    return {
      labels: filledSeries.map((s) => formatLabel(s.date, tsData.granularity)),
      datasets: [
        { 
          type: 'line', 
          label: 'Tendencia', 
          data: filledSeries.map((s) => s.count), 
          borderColor: 'rgba(245,158,11,1)', 
          backgroundColor: 'transparent', 
          borderWidth: 2, 
          tension: 0.3, 
          pointRadius: filledSeries.length > 60 ? 0 : 3, 
          pointHoverRadius: 5 
        },
        {
          type: 'bar',
          label: 'Registros',
          data: filledSeries.map((s) => s.count),
          backgroundColor: 'rgba(245,158,11,0.7)',
          borderColor: 'transparent',
          borderRadius: 4
        }
      ]
    }
  }, [http])

  // 7. Top Searches Fetcher
  const fetchSearches = React.useCallback(async (from, to, presetKey) => {
    const res = await http.getData('/metrics/search-insights')
    const searchData = res?.data
    const dataObj = searchData?.[presetKey]
    if (!dataObj?.topQueries?.length) return null
    const queries = dataObj.topQueries
    return {
      labels: queries.map((q) => q.query),
      datasets: [{
        label: 'Búsquedas', data: queries.map((q) => q.count),
        backgroundColor: 'rgba(236, 72, 153, 0.7)', borderColor: 'transparent', borderRadius: 4, barThickness: 16
      }]
    }
  }, [http])

  // 8. Top Downloads Fetcher
  const fetchDownloads = React.useCallback(async (from, to, presetKey) => {
    const res = await http.getData('/metrics/top-downloads')
    const topDownloadsData = res?.data
    const arr = topDownloadsData?.[presetKey]
    if (!arr?.length) return null
    const downloads = arr
    return {
      labels: downloads.map((d) => d.name.replace(/^STL\s*-\s*/i, '').trim()),
      datasets: [{
        label: 'Descargas', data: downloads.map((d) => d.count),
        backgroundColor: 'rgba(56, 189, 248, 0.7)', borderColor: 'transparent', borderRadius: 4, barThickness: 16
      }]
    }
  }, [http])

  // 9. Downloads Timeseries Fetcher
  const fetchDownloadsTimeseries = React.useCallback(async (from, to) => {
    const res = await http.getData(`/metrics/downloads/timeseries?from=${from}&to=${to}`)
    const tsData = res?.data
    if (!tsData?.series?.length && !tsData?.granularity) return null
    
    const filledSeries = fillMissingBuckets(tsData.series || [], from, to, tsData.granularity || 'day')
    if (!filledSeries.length) return null

    return {
      labels: filledSeries.map((s) => formatLabel(s.date, tsData.granularity)),
      datasets: [
        { 
          label: 'Descargas', 
          data: filledSeries.map((s) => s.count), 
          borderColor: chartColors.downloads.border, 
          backgroundColor: chartColors.downloads.bg, 
          fill: true,
          tension: 0.35, 
          pointRadius: filledSeries.length > 60 ? 0 : 3, 
          pointHoverRadius: 5 
        },
        { 
          label: 'Búsquedas', 
          data: filledSeries.map((s) => s.searchCount || 0), 
          borderColor: chartColors.searches.border, 
          backgroundColor: chartColors.searches.bg, 
          fill: true,
          tension: 0.35, 
          pointRadius: filledSeries.length > 60 ? 0 : 3, 
          pointHoverRadius: 5 
        }
      ]
    }
  }, [http])

  // 10. Traffic Sources Fetcher — returns raw data for custom panel
  const fetchTrafficSources = React.useCallback(async (from, to) => {
    const res = await http.getData(`/metrics/site-visits/sources?from=${from}&to=${to}`)
    const sourcesData = res?.data
    if (!sourcesData?.visits?.length) return null
    // Return raw rows enriched with label/color/icon
    const SOURCE_META = {
      direct:    { label: 'Directo',             icon: '🔗', color: '#4facfe' },
      google:    { label: 'Google (Orgánico)',    icon: '🔍', color: '#34d399' },
      pinterest: { label: 'Pinterest (Orgánico)', icon: '📌', color: '#ec4899' },
      facebook:  { label: 'Facebook (Orgánico)',  icon: '👥', color: '#60a5fa' },
      instagram: { label: 'Instagram (Orgánico)', icon: '📷', color: '#f472b6' },
      telegram:  { label: 'Telegram (Orgánico)',  icon: '✈️',  color: '#38bdf8' },
      youtube:   { label: 'YouTube (Orgánico)',   icon: '▶️',  color: '#f87171' },
      twitter:   { label: 'Twitter/X (Orgánico)', icon: '🐦', color: '#94a3b8' },
      organic:   { label: 'Orgánico (Otro)',       icon: '🌿', color: '#a3e635' },
    }
    const COLORS = ['#4facfe','#f59e0b','#ec4899','#34d399','#a78bfa','#ef4444','#06b6d4','#f97316','#94a3b8']
    const totalSessions = sourcesData.visits.reduce((s, v) => s + Number(v.sessions || 0), 0)
    const rows = sourcesData.visits.map((v, i) => {
      const key = String(v.source || '').toLowerCase()
      const meta = SOURCE_META[key] || { label: v.source, icon: '📊', color: COLORS[i % COLORS.length] }
      const sessions = Number(v.sessions || 0)
      const pct = totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0
      return { ...v, ...meta, sessions, pct }
    })
    return { rows, totalSessions }
  }, [http])


  return (
    <div className="traffic-charts-module">
      {/* Title Header removed global controls */}
      <div className="charts-controls" style={{ marginBottom: '30px' }}>
        <div className="charts-controls-left">
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-color)' }}>
            Métricas Analíticas
          </h3>
        </div>
      </div>

      <div className="charts-list">
        <ChartContainer id="traffic" supportsDynamicDates={true} fetchFn={fetchTraffic} renderChart={(data) => <Line data={data} options={commonLineOpts} />} />
        
        <ChartContainer id="traffic-sources" supportsDynamicDates={true} fetchFn={fetchTrafficSources} renderChart={(data) => (
          <div style={{ width: '100%' }}>
            {/* Summary KPIs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 160px', background: 'rgba(79,172,254,0.08)', border: '1px solid rgba(79,172,254,0.2)', borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Sesiones Totales</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#f8fafc' }}>{Number(data.totalSessions || 0).toLocaleString()}</div>
              </div>
              <div style={{ flex: '1 1 160px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Canales Detectados</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '700', color: '#f8fafc' }}>{data.rows.length}</div>
              </div>
              <div style={{ flex: '1 1 160px', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: '10px', padding: '14px 18px' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Canal Principal</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{data.rows[0]?.icon}</span>
                  <span>{data.rows[0]?.label || '—'}</span>
                </div>
              </div>
            </div>

            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 80px 80px 54px', gap: '10px', alignItems: 'center', padding: '0 4px 10px 4px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '8px' }}>
              <div />
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Canal</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Sesiones</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Visitantes</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Visitas</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>%</div>
            </div>

            {/* Rows */}
            {data.rows.map((row, i) => (
              <div key={row.source} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 80px 80px 54px', gap: '10px', alignItems: 'center', padding: '10px 4px', borderRadius: '8px', transition: 'background 0.15s', background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent' }}>
                {/* Icon */}
                <div style={{ fontSize: '1.1rem', textAlign: 'center' }}>{row.icon}</div>

                {/* Label + bar */}
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#e2e8f0', marginBottom: '5px' }}>{row.label}</div>
                  <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${row.pct}%`, borderRadius: '99px', background: `linear-gradient(90deg, ${row.color}, ${row.color}bb)`, transition: 'width 0.6s ease', minWidth: row.pct > 0 ? '4px' : '0' }} />
                  </div>
                </div>

                {/* Sessions */}
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#cbd5e1', textAlign: 'right' }}>{Number(row.sessions || 0).toLocaleString()}</div>

                {/* Unique Visitors */}
                <div style={{ fontSize: '0.9rem', color: '#94a3b8', textAlign: 'right' }}>{Number(row.uniqueVisitors || 0).toLocaleString()}</div>

                {/* Total count */}
                <div style={{ fontSize: '0.9rem', color: '#64748b', textAlign: 'right' }}>{Number(row.count || 0).toLocaleString()}</div>

                {/* Percentage badge */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: '700', color: row.color, background: `${row.color}22`, border: `1px solid ${row.color}44` }}>
                    {row.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )} />
        
        <ChartContainer id="downloads-timeseries" supportsDynamicDates={true} fetchFn={fetchDownloadsTimeseries} renderChart={(data) => <Line data={data} options={commonLineOpts} />} />

        <ChartContainer id="plan-clicks" supportsDynamicDates={true} fetchFn={fetchPlanClicks} renderChart={(data) => <Bar data={data} options={stackedBarOpts} />} />
        
        <ChartContainer id="sales-revenue" supportsDynamicDates={false} fetchFn={fetchSales} renderChart={(data) => (
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <Doughnut data={data} options={{ plugins: { legend: { position: 'right', labels: { color: 'rgba(255,255,255,0.7)', font: { size: 13 } } }, tooltip: { backgroundColor: 'rgba(20,20,30,0.95)', titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.85)' } } }} />
          </div>
        )} />
        
        <ChartContainer 
          id="top-searches" 
          supportsDynamicDates={false} 
          expandable={true} 
          fetchFn={fetchSearches} 
          renderChart={(data, expanded) => {
            const limit = expanded ? 100 : 20;
            const limitedData = {
              ...data,
              labels: data.labels.slice(0, limit),
              datasets: data.datasets.map(d => ({ ...d, data: d.data.slice(0, limit) }))
            };
            return <Bar data={limitedData} options={dynamicBarOpts} />
          }} 
        />
        
        <ChartContainer 
          id="top-downloads" 
          supportsDynamicDates={false} 
          expandable={true}
          fetchFn={fetchDownloads} 
          renderChart={(data, expanded) => {
            const limit = expanded ? 100 : 20;
            const limitedData = {
              ...data,
              labels: data.labels.slice(0, limit),
              datasets: data.datasets.map(d => ({ ...d, data: d.data.slice(0, limit) }))
            };
            return <Bar data={limitedData} options={dynamicBarOpts} />
          }} 
        />
        
        <ChartContainer id="visitors-vs-sessions" supportsDynamicDates={true} fetchFn={fetchVisitorsVsSessions} renderChart={(data) => <Line data={data} options={commonLineOpts} />} />
        
        <ChartContainer 
          id="top-pages" 
          supportsDynamicDates={true} 
          expandable={true}
          fetchFn={fetchTopPages} 
          renderChart={(data, expanded) => {
            const limit = expanded ? 50 : 20;
            const limitedData = {
              ...data,
              labels: data.labels.slice(0, limit),
              datasets: data.datasets.map(d => ({ ...d, data: d.data.slice(0, limit) }))
            };
            return <Bar data={limitedData} options={dynamicBarOpts} />
          }} 
        />
      </div>

      {copiedToast && (
        <div style={{
          position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(52, 211, 153, 0.95)', color: '#0f172a', padding: '12px 24px',
          borderRadius: '30px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
          zIndex: 9999, fontWeight: '700', fontSize: '1rem',
          display: 'flex', alignItems: 'center', gap: '8px',
          backdropFilter: 'blur(4px)'
        }}>
          <span style={{ fontSize: '1.2rem' }}>✓</span> ¡Copiado! {copiedToast.length > 25 ? copiedToast.substring(0, 25) + '...' : copiedToast}
        </div>
      )}
    </div>
  )
}
