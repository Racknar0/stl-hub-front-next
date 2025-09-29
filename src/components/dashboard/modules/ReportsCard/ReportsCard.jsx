"use client"
import React, { useState } from 'react'
import './ReportsCard.scss'

export default function ReportsCard() {
  const [open, setOpen] = useState(true)

  const DATA = Array.from({ length: 20 }).map((_, i) => ({
    name: `Recurso Roto #${i + 1}`,
    count: Math.max(1, 10 - (i % 5)),
    last: new Date(Date.now() - i * 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
    url: '#'
  }))

  return (
    <div className={`reports-card ${open ? 'open' : 'collapsed'}`} style={{width:'100%', maxWidth: '320px'}}>
      <div className="card-header d-flex justify-content-between align-items-center gap-5">
        <h6>Reportes caídos</h6>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
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
        <ul className="reports-list">
          {DATA.map((it, idx) => (
            <li key={idx} className="report-item d-flex justify-content-between align-items-center">
              <div className="left d-flex flex-column">
                <div className="name">{it.name}</div>
                <div className="meta">Último: {it.last}</div>
              </div>
              <div className="right">
                <div className="count">{it.count}</div>
                <a className="link" href={it.url}>Ver</a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
