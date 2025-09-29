"use client"
import React, { useState } from 'react'
import './TotalVisitas.scss'

export default function TotalVisitas({ value = 54321 }) {
  const [range, setRange] = useState('all')

  // valores demo por rango
  const VALUES = {
    '1d': Math.round(value * 0.02),
    '1w': Math.round(value * 0.1),
    '1y': Math.round(value * 0.6),
    all: value,
  }

  return (
    <div className="stat-card total-visitas">
      <div className="label">Total visitas</div>

      <div className="range-controls">
        {['1d','1w','1y','all'].map((r) => (
          <button key={r} className={`range-btn ${r === range ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>

      <div className="value">{VALUES[range].toLocaleString()}</div>
    </div>
  )
}
