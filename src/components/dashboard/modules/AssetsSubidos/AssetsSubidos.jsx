"use client"
import React, { useState } from 'react'
import './AssetsSubidos.scss'

export default function AssetsSubidos({ initial = { '1d':12,'1w':84,'1y':4120,'all':23840 } }){
  const [range, setRange] = useState('1d')
  const data = initial

  return (
    <div className="stat-card assets-subidos">
      <div className="label">Assets subidos</div>
      <div className="value">{(data[range] || 0).toLocaleString()}</div>
      <div className="range-controls">
        {['1d','1w','1m','1y','all'].map(r=> (
          <button key={r} className={`range-btn ${range===r? 'active':''}`} onClick={()=>setRange(r)}>{r}</button>
        ))}
      </div>
    </div>
  )
}
