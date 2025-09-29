'use client'

import React, { useState } from 'react'
import './TopDownloadsCard.scss'

const TopDownloadsCard = () => {
  const [tab, setTab] = useState('1d')
  const [open, setOpen] = useState(true)

  // Datos quemados: top 30 STL por periodo
  const DATA = {
    '1d': Array.from({ length: 30 }).map((_, i) => ({ name: `STL Día #${i + 1}`, count: Math.max(1, 1000 - i * 7) })),
    '1w': Array.from({ length: 30 }).map((_, i) => ({ name: `STL Semana #${i + 1}`, count: Math.max(1, 5000 - i * 10) })),
    '1m': Array.from({ length: 30 }).map((_, i) => ({ name: `STL Mes #${i + 1}`, count: Math.max(1, 20000 - i * 50) })),
    '1y': Array.from({ length: 30 }).map((_, i) => ({ name: `STL Año #${i + 1}`, count: Math.max(1, 100000 - i * 200) })),
    all: Array.from({ length: 30 }).map((_, i) => ({ name: `STL Total #${i + 1}`, count: Math.max(1, 200000 - i * 400) })),
  }

  const items = DATA[tab] || []

  const total = items.reduce((s, it) => s + (it.count || 0), 0)

  return (
    <div style={{display:'flex',gap:12,alignItems:'flex-start', width:'100%' , maxWidth: '320px'}}>
      <div style={{width: '100%'}}>

        <div className={`top-downloads-card ${open ? 'open' : 'collapsed'}`}>
          <div className="card-header">
            <h6>Top 30 descargas</h6>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{textAlign:'right',marginLeft:8}}>
                <div className="summary-value">{total.toLocaleString()}</div>
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
              {items.map((it, idx) => (
                <li key={idx} className="download-item d-flex justify-content-between align-items-center">
                  <span className="name">{it.name}</span>
                  <span className="count">{it.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

    </div>
  )
}

export default TopDownloadsCard
