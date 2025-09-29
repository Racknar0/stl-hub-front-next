"use client"
import React, { useState } from 'react'
import './TotalRegistros.scss'

export default function TotalRegistros({ value = 4321 }) {
  const [range, setRange] = useState('all')

  const VALUES = {
    '1d': Math.round(value * 0.02),
    '1w': Math.round(value * 0.1),
    '1m': Math.round(value * 0.25),
    '1y': Math.round(value * 0.6),
    all: value,
  }

  return (
    <div className="stat-card total-registros">
      <div className="label">Total registros</div>

      <div className="value">{VALUES[range].toLocaleString()}</div>

      <div className="range-controls">
        {['1d','1w','1m','1y','all'].map((r) => (
          <button key={r} className={`range-btn ${r === range ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
        ))}
      </div>
    </div>
  )
}
