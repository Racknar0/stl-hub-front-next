"use client"
import React, { useEffect, useState } from 'react'
import './TotalDescargas.scss'
import HttpService from '@/services/HttpService'

export default function TotalDescargas({ value }) {
  const [range, setRange] = useState('all')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({ '1d': 0, '1w': 0, '1m': 0, '1y': 0, all: value || 0 })
  const http = new HttpService()

  useEffect(() => {
    let mounted = true
    const fetchMetrics = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/downloads')
        if (!mounted) return
        setData(res.data || { '1d': 0, '1w': 0, '1m': 0, '1y': 0, all: 0 })
      } catch (e) {
        console.error('TotalDescargas fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchMetrics()
    // actualizar si hay subidas (aunque descargas no dependen de uploads, mantener patrón)
    const onUploaded = () => fetchMetrics()
    window.addEventListener('assets:uploaded', onUploaded)
    return () => { mounted = false; window.removeEventListener('assets:uploaded', onUploaded) }
  }, [])

  const VALUES = loading ? { '1d':'...', '1w':'...', '1m':'...', '1y':'...', all:'...' } : data

  return (
    <div className="stat-card total-descargas">
      <div className="label">Total descargas</div>

      <div className="value">{(VALUES[range] === '...' ? '...' : Number(VALUES[range]).toLocaleString())}</div>

      <div className="range-controls">
        {['1d','1w','1m','1y','all'].map((r) => (
          <button key={r} className={`range-btn ${r === range ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>
    </div>
  )
}
