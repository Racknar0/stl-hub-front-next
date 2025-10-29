'use client'

import React, { useEffect, useState } from 'react'
import './TopDownloadsCard.scss'
import HttpService from '@/services/HttpService'

const TopDownloadsCard = () => {
  const [tab, setTab] = useState('1d')
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({ '1d': [], '1w': [], '1m': [], '1y': [], all: [] })
  const http = new HttpService()

  useEffect(() => {
    let mounted = true
    const fetchTop = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/top-downloads')
        if (!mounted) return
        setData(res.data || { '1d': [], '1w': [], '1m': [], '1y': [], all: [] })
      } catch (e) {
        console.error('TopDownloads fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchTop()
    const onUploaded = () => fetchTop()
    window.addEventListener('assets:uploaded', onUploaded)
    return () => { mounted = false; window.removeEventListener('assets:uploaded', onUploaded) }
  }, [])

  const items = loading ? [] : (data[tab] || [])
  const total = items.reduce((s, it) => s + (it.count || 0), 0)

  return (
    <div style={{display:'flex',gap:12,alignItems:'flex-start', width:'100%' , maxWidth: '320px'}}>
      <div style={{width: '100%'}}>

        <div className={`top-downloads-card ${open ? 'open' : 'collapsed'}`}>
          <div className="card-header">
            <h6>Top 30 descargas</h6>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{textAlign:'right',marginLeft:8}}>
                <div className="summary-value">{loading ? '...' : total.toLocaleString()}</div>
              </div>
              <button
                type="button"
                className="collapse-btn"
                aria-expanded={open}
                aria-label={open ? 'Contraer' : 'Expandir'}
                onClick={() => setOpen((v) => !v)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={open ? 'rot-0' : 'rot-180'}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="card-body">
            <div className="label small"> </div>
            <div className="value"> </div>
            <div className="range-controls">
              {['1d','1w','1m','1y','all'].map(r => (
                <button key={r} className={`range-btn ${r === tab ? 'active' : ''}`} onClick={() => setTab(r)}>{r}</button>
              ))}
            </div>

            <ul className="downloads-list" style={{marginTop:8}}>
              {loading ? (
                <li className="download-item">Cargando…</li>
              ) : (
                items.map((it, idx) => (
                  <li key={idx} className="download-item d-flex justify-content-between align-items-center">
                    <span className="name">{it.name}</span>
                    <span className="count">{it.count.toLocaleString()}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

    </div>
  )
}

export default TopDownloadsCard
