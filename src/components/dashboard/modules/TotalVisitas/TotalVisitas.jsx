"use client"
import React, { useState, useEffect } from 'react'
import './TotalVisitas.scss'
import HttpService from '@/services/HttpService'

export default function TotalVisitas({ value }) {
  const [range, setRange] = useState('1d')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({ '1d': 0, '1w': 0, '1m': 0, '1y': 0, all: value || 0 })
  const http = new HttpService()

  useEffect(() => {
    let mounted = true
    const fetchMetrics = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/site-visits')
        if (!mounted) return
        if (res.data && res.data.pv) {
          setData(res.data.pv)
        } else {
          setData({ '1d': 0, '1w': 0, '1m': 0, '1y': 0, all: 0 })
        }
      } catch (e) {
        console.error('TotalVisitas fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchMetrics()
    return () => { mounted = false }
  }, [])

  const VALUES = loading ? { '1d':'...', '1w':'...', '1m':'...', '1y':'...', all:'...' } : data

  return (
    <div className="stat-card total-visitas">
      <div className="label">Total visitas</div>

      <div className="value">{(VALUES[range] === '...' ? '...' : Number(VALUES[range]).toLocaleString())}</div>

      <div className="range-controls">
        {['1d','1w','1m','1y','all'].map((r) => (
          <button key={r} className={`range-btn ${r === range ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>
    </div>
  )
}
