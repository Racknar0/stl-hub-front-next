"use client"
import React, { useEffect, useState } from 'react'
import './AssetsSubidos.scss'
import HttpService from '@/services/HttpService'

export default function AssetsSubidos({ initial }){
  const [range, setRange] = useState('1d')
  const [data, setData] = useState(initial || { '1d':0,'2d':0,'3d':0,'1w':0,'1m':0,'2m':0,'3m':0,'1y':0,'all':0 })
  const [sizeGB, setSizeGB] = useState({ '1d':0,'2d':0,'3d':0,'1w':0,'1m':0,'2m':0,'3m':0,'1y':0,'all':0 })
  const [loading, setLoading] = useState(false)
  const http = new HttpService()

  const formatValue = (count, gb) => {
    const n = Number(count || 0)
    const g = Number(gb || 0)
    const left = Number.isFinite(n) ? n.toLocaleString() : '0'
    if (!Number.isFinite(g) || g <= 0) return left
    return `${left} (${g.toFixed(1)}GB)`
  }

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/uploads')
        const d = res.data || {}
        const mapped = {
          '1d': d.today ?? 0,
          '2d': d.last2d ?? 0,
          '3d': d.last3d ?? 0,
          '1w': d.lastWeek ?? 0,
          '1m': d.month ?? 0,
          '2m': d.months2 ?? 0,
          '3m': d.months3 ?? 0,
          '1y': d.lastYear ?? 0,
          'all': d.all ?? 0,
        }
        const mappedSize = {
          '1d': d?.sizeGB?.today ?? 0,
          '2d': d?.sizeGB?.last2d ?? 0,
          '3d': d?.sizeGB?.last3d ?? 0,
          '1w': d?.sizeGB?.lastWeek ?? 0,
          '1m': d?.sizeGB?.month ?? 0,
          '2m': d?.sizeGB?.months2 ?? 0,
          '3m': d?.sizeGB?.months3 ?? 0,
          '1y': d?.sizeGB?.lastYear ?? 0,
          'all': d?.sizeGB?.all ?? 0,
        }
        if (mounted) setData(mapped)
        if (mounted) setSizeGB(mappedSize)
      } catch (e) {
        console.error('AssetsSubidos metrics error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchData()
    const onUploaded = () => { if (mounted) fetchData() }
    window.addEventListener('assets:uploaded', onUploaded)
    return () => { mounted = false; window.removeEventListener('assets:uploaded', onUploaded) }
  }, [])

  return (
    <div className="stat-card assets-subidos">
      <div className="label">STL's subidos</div>
      <div className="value">{loading ? '...' : formatValue(data[range] || 0, sizeGB[range] || 0)}</div>
      <div className="range-controls">
        {['1d','2d','3d','1w','1m','2m','3m','1y','all'].map(r=> (
          <button key={r} className={`range-btn ${range===r? 'active':''}`} onClick={()=>setRange(r)}>{r}</button>
        ))}
      </div>
    </div>
  )
}
