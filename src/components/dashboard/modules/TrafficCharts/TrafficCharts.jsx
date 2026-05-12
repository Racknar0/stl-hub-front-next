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
        count: 0
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
        <strong style={{ color: '#f8fafc' }}>Visión General del Tráfico:</strong> Mide los 3 pilares de tu sitio web día a día:<br/>
        <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#cbd5e1' }}>
          <li><strong style={{ color: '#ff0844' }}>Visitantes:</strong> Personas reales o dispositivos únicos que entraron.</li>
          <li><strong style={{ color: '#00f2fe' }}>Sesiones:</strong> Visitas totales (una misma persona puede entrar varias veces y generar varias sesiones).</li>
          <li><strong style={{ color: '#4facfe' }}>Vistas de Página:</strong> La suma de todos los modelos o páginas que cargaron en esas sesiones.</li>
        </ul>
        <span style={{ color: '#a78bfa' }}>💡 Ejemplo:</span> Si 1 persona entra 2 veces al día y mira 5 modelos en total = 1 Visitante, 2 Sesiones, 5 Vistas.<br/>
        <span style={{ color: '#34d399' }}>🚀 Cómo sacarle partido:</span> Úsalo para medir el impacto inmediato de tus anuncios. Si haces un video de TikTok y sube el pico rojo y azul, el anuncio funcionó y trajo gente nueva.
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
    )
  }


// Map active preset to backend key (solo para los que no usan timeseries como sales)
const getPresetKey = (preset) => preset === '1D' ? '1w' : preset === '7D' ? '1m' : '1y'

// --- ChartContainer Component ---
function ChartContainer({ id, title, supportsDynamicDates, fetchFn, renderChart }) {
  const [fromDate, setFromDate] = useState(() => formatDateForInput(daysAgo(7)))
  const [toDate, setToDate] = useState(() => formatDateForInput(new Date()))
  const [activePreset, setActivePreset] = useState('1D')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  const applyPreset = (preset) => {
    const today = formatDateForInput(new Date())
    setActivePreset(preset)
    setToDate(today)
    if (preset === '1D') setFromDate(formatDateForInput(daysAgo(7))) // Diario: ultimos 7 dias
    else if (preset === '7D') setFromDate(formatDateForInput(daysAgo(70))) // Semanal: ultimas 10 semanas
    else if (preset === '30D') setFromDate(formatDateForInput(daysAgo(365))) // Mensual: ultimos 12 meses
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
            {[{ key: '1D', label: '1D (Diario)' }, { key: '7D', label: '7D (Semanal)' }, { key: '30D', label: '30D (Mensual)' }].map(({ key, label }) => (
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
      <div className="chart-canvas-wrap" style={id === 'top-pages' ? { minHeight: `${Math.max(450, (data?.datasets?.[0]?.data?.length || 0) * 26)}px`, maxHeight: 'none' } : {}}>
        {loading ? (
          <div className="chart-loading"><span className="chart-spinner" />Cargando datos...</div>
        ) : !data ? (
          <div className="chart-empty">Sin datos para este rango</div>
        ) : (
          renderChart(data)
        )}
      </div>
    </div>
  )
}

// --- Main Component ---
export default function TrafficCharts() {
  const http = useMemo(() => new HttpService(), [])

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
    const queries = dataObj.topQueries.slice(0, 15)
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
    const downloads = arr.slice(0, 15)
    return {
      labels: downloads.map((d) => d.name),
      datasets: [{
        label: 'Descargas', data: downloads.map((d) => d.count),
        backgroundColor: 'rgba(56, 189, 248, 0.7)', borderColor: 'transparent', borderRadius: 4, barThickness: 16
      }]
    }
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
        
        <ChartContainer id="plan-clicks" supportsDynamicDates={true} fetchFn={fetchPlanClicks} renderChart={(data) => <Bar data={data} options={stackedBarOpts} />} />
        
        <ChartContainer id="sales-revenue" supportsDynamicDates={false} fetchFn={fetchSales} renderChart={(data) => (
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <Doughnut data={data} options={{ plugins: { legend: { position: 'right', labels: { color: 'rgba(255,255,255,0.7)', font: { size: 13 } } }, tooltip: { backgroundColor: 'rgba(20,20,30,0.95)', titleColor: '#fff', bodyColor: 'rgba(255,255,255,0.85)' } } }} />
          </div>
        )} />
        
        <ChartContainer id="user-registrations" supportsDynamicDates={true} fetchFn={fetchRegistrations} renderChart={(data) => (
          <Bar data={data} options={commonLineOpts} />
        )} />
        
        <ChartContainer id="top-searches" supportsDynamicDates={false} fetchFn={fetchSearches} renderChart={(data) => <Bar data={data} options={barOpts} />} />
        
        <ChartContainer id="top-downloads" supportsDynamicDates={false} fetchFn={fetchDownloads} renderChart={(data) => <Bar data={data} options={barOpts} />} />
        
        <ChartContainer id="visitors-vs-sessions" supportsDynamicDates={true} fetchFn={fetchVisitorsVsSessions} renderChart={(data) => <Line data={data} options={commonLineOpts} />} />
        
        <ChartContainer id="top-pages" supportsDynamicDates={true} fetchFn={fetchTopPages} renderChart={(data) => <Bar data={data} options={barOpts} />} />
      </div>
    </div>
  )
}
