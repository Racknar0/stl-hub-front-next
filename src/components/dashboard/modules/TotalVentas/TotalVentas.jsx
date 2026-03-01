"use client"
import React, { useState } from 'react'
import '../TopDownloadsCard/TopDownloadsCard.scss'

export default function TotalVentas() {
  const [range, setRange] = useState('all')
  const [open, setOpen] = useState(true)

  const DATA = {
    '1d': [
      { method: 'Paypal', amount: 49.99, date: '2025-09-29', url: '#' },
      { method: 'Stripe', amount: 19.99, date: '2025-09-29', url: '#' },
    ],
    '1w': [
      { method: 'Paypal', amount: 149.99, date: '2025-09-28', url: '#' },
      { method: 'Stripe', amount: 79.99, date: '2025-09-27', url: '#' },
      { method: 'Paypal', amount: 29.99, date: '2025-09-25', url: '#' },
    ],
    '1y': [
      { method: 'Paypal', amount: 1200.00, date: '2025-08-10', url: '#' },
      { method: 'Stripe', amount: 899.50, date: '2025-06-02', url: '#' },
      { method: 'Paypal', amount: 450.00, date: '2025-02-14', url: '#' },
    ],
    all: [
      { method: 'Paypal', amount: 5000.00, date: '2024-12-31', url: '#' },
      { method: 'Stripe', amount: 3200.00, date: '2024-10-10', url: '#' },
    ],
  }

  const items = DATA[range] || []
  const totalAmount = items.reduce((s, it) => s + (it.amount || 0), 0)

  return (
    <div className={`top-downloads-card ${open ? 'open' : 'collapsed'}`} style={{ width: '100%', height: '100%' }}>
      <div className="card-header">
        <h6>Total ventas</h6>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{textAlign:'right',marginLeft:8}}>
            <div className="summary-value">${totalAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
          </div>
          <button
            type="button"
            className="collapse-btn"
            aria-expanded={open}
            aria-label={open ? 'Contraer' : 'Expandir'}
            onClick={() => setOpen(v => !v)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={open ? 'rot-0' : 'rot-180'}>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="range-controls">
          {['1d','1w','1m','1y','all'].map(r => (
            <button key={r} className={`range-btn ${r === range ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>

        <ul className="downloads-list" style={{marginTop:8}}>
          {items.map((it, idx) => (
            <li key={idx} className="download-item d-flex justify-content-between align-items-center">
              <div className="d-flex flex-column">
                <div className="name">{it.method}</div>
                <div className="meta text-muted small">{it.date}</div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="count fw-bold">${it.amount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <a className="btn btn-link btn-sm" href={it.url}>Ver</a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
