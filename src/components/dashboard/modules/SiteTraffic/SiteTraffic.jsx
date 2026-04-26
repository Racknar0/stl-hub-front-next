"use client"
import React, { useEffect, useState } from 'react'
import './SiteTraffic.scss'
import HttpService from '@/services/HttpService'

export default function SiteTraffic() {
  const [range, setRange] = useState('1d')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    pv: { '1d': 0, '1w': 0, '1m': 0, '1y': 0, all: 0 },
    sessions: { '1d': 0, '1w': 0, '1m': 0, '1y': 0, all: 0 },
    visitors: { '1d': 0, '1w': 0, '1m': 0, '1y': 0, all: 0 },
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

  return (
    <div className="site-traffic-module">
      <div className="traffic-header">
        <h2>Tráfico General</h2>
        <div className="range-controls">
          {['1d', '1w', '1m', '1y', 'all'].map((r) => (
            <button 
              key={r} 
              className={`range-btn ${r === range ? 'active' : ''}`} 
              onClick={() => setRange(r)}
            >
              {r === '1d' ? 'Hoy' : r === '1w' ? '7D' : r === '1m' ? '30D' : r === '1y' ? '1A' : 'Todos'}
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
      </div>
    </div>
  )
}
