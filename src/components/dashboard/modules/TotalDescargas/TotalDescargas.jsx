"use client"
import React, { useState } from 'react'
import './TotalDescargas.scss'

export default function TotalDescargas({ value = 98765 }) {
  const [range, setRange] = useState('all')

  // valores demo por rango
  const VALUES = {
    '1d': Math.round(value * 0.02),
    '1w': Math.round(value * 0.1),
    '1y': Math.round(value * 0.6),
    all: value,
  }

  return (
    <div className="stat-card total-descargas">
      <div className="label">Total descargas</div>

      <div className="range-controls">
        {['1d','1w','1y','all'].map((r) => (
          <button key={r} className={`range-btn ${r === range ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>

      <div className="value">{VALUES[range].toLocaleString()}</div>
    </div>
  )
}
