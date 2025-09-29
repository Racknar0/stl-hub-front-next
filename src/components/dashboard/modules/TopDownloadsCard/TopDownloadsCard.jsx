'use client'

import React, { useState } from 'react'
import './TopDownloadsCard.scss'

const TopDownloadsCard = () => {
  const [tab, setTab] = useState('day')
  const [open, setOpen] = useState(true)

  // Datos quemados: top 30 STL por periodo
  const DATA = {
    day: Array.from({ length: 30 }).map((_, i) => ({ name: `STL Día #${i + 1}`, count: Math.max(1, 1000 - i * 7) })),
    week: Array.from({ length: 30 }).map((_, i) => ({ name: `STL Semana #${i + 1}`, count: Math.max(1, 5000 - i * 10) })),
    month: Array.from({ length: 30 }).map((_, i) => ({ name: `STL Mes #${i + 1}`, count: Math.max(1, 20000 - i * 50) })),
    year: Array.from({ length: 30 }).map((_, i) => ({ name: `STL Año #${i + 1}`, count: Math.max(1, 100000 - i * 200) })),
  }

  const items = DATA[tab] || []

  return (
    <div style={{display:'flex',gap:12,alignItems:'flex-start', width:'100%' , maxWidth: '320px'}}>
      <div style={{width: '100%'}}>

        <div className={`top-downloads-card ${open ? 'open' : 'collapsed'}`}>
          <div className="card-header">
            <h6>Top 30 descargas</h6>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div className="tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'day'} className={tab === 'day' ? 'active' : ''} onClick={() => setTab('day')}>Día</button>
              <button role="tab" aria-selected={tab === 'week'} className={tab === 'week' ? 'active' : ''} onClick={() => setTab('week')}>Semana</button>
              <button role="tab" aria-selected={tab === 'month'} className={tab === 'month' ? 'active' : ''} onClick={() => setTab('month')}>Mes</button>
              <button role="tab" aria-selected={tab === 'year'} className={tab === 'year' ? 'active' : ''} onClick={() => setTab('year')}>Año</button>
            </div>
            <button
              type="button"
              className="collapse-btn"
              aria-expanded={open}
              aria-label={open ? 'Contraer' : 'Expandir'}
              onClick={() => setOpen((v) => !v)}
            >
              {/* simple chevron icon that rotates */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={open ? 'rot-0' : 'rot-180'}>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
        </div>
      </div>

      <div className="card-body">
        <ul className="downloads-list">
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
