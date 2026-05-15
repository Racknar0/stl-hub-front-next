"use client"
import React, { useEffect, useState } from 'react'
import './SiteTraffic.scss'
import HttpService from '@/services/HttpService'

export default function SiteTraffic() {
  const [range, setRange] = useState('hoy')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    pv: { '30m': 0, '1h': 0, '3h': 0, '6h': 0, '12h': 0, 'hoy': 0, '2d': 0, '3d': 0, '7d': 0, '15d': 0, '1m': 0, '1y': 0, all: 0 },
    sessions: { '30m': 0, '1h': 0, '3h': 0, '6h': 0, '12h': 0, 'hoy': 0, '2d': 0, '3d': 0, '7d': 0, '15d': 0, '1m': 0, '1y': 0, all: 0 },
    visitors: { '30m': 0, '1h': 0, '3h': 0, '6h': 0, '12h': 0, 'hoy': 0, '2d': 0, '3d': 0, '7d': 0, '15d': 0, '1m': 0, '1y': 0, all: 0 },
    downloads: { '30m': 0, '1h': 0, '3h': 0, '6h': 0, '12h': 0, 'hoy': 0, '2d': 0, '3d': 0, '7d': 0, '15d': 0, '1m': 0, '1y': 0, all: 0 },
  })
  const http = new HttpService()

  useEffect(() => {
    let mounted = true
    const fetchMetrics = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/site-visits')
        if (!mounted) return
        if (res.data && res.data.pv) {
          setData(res.data)
        }
      } catch (e) {
        console.error('SiteTraffic fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchMetrics()
    return () => { mounted = false }
  }, [])

  const pv = loading ? '...' : (data.pv[range] || 0)
  const sessions = loading ? '...' : (data.sessions[range] || 0)
  const visitors = loading ? '...' : (data.visitors[range] || 0)
  const downloads = loading ? '...' : (data.downloads[range] || 0)

  return (
    <div className="site-traffic-module">
      <div className="traffic-header">
        <h2>Tráfico General</h2>
        <div className="range-controls">
          {['30m', '1h', '3h', '6h', '12h', 'hoy', '2d', '3d', '7d', '15d', '1m', '1y', 'all'].map((r) => (
            <button 
              key={r} 
              className={`range-btn ${r === range ? 'active' : ''}`} 
              onClick={() => setRange(r)}
            >
              {r === '30m' ? '30Min' : r === '1h' ? '1H' : r === '3h' ? '3H' : r === '6h' ? '6H' : r === '12h' ? '12H' : r === 'hoy' ? 'Hoy' : r === '2d' ? '2D' : r === '3d' ? '3D' : r === '7d' ? '7D' : r === '15d' ? '15D' : r === '1m' ? '1M' : r === '1y' ? '1A' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      <div className="traffic-grid">
        <div className="traffic-card pv">
          <div className="label">Vistas de Página</div>
          <div className="value">{pv === '...' ? '...' : Number(pv).toLocaleString()}</div>
          <div className="desc">Total de páginas cargadas</div>
        </div>

        <div className="traffic-card sessions">
          <div className="label">Sesiones Únicas</div>
          <div className="value">{sessions === '...' ? '...' : Number(sessions).toLocaleString()}</div>
          <div className="desc">Visitas por pestaña activa</div>
        </div>

        <div className="traffic-card visitors">
          <div className="label">Visitantes Únicos</div>
          <div className="value">{visitors === '...' ? '...' : Number(visitors).toLocaleString()}</div>
          <div className="desc">Usuarios únicos (Cookies)</div>
        </div>

        <div className="traffic-card downloads">
          <div className="label">Descargas</div>
          <div className="value">{downloads === '...' ? '...' : Number(downloads).toLocaleString()}</div>
          <div className="desc">Archivos descargados</div>
        </div>
      </div>
    </div>
  )
}
