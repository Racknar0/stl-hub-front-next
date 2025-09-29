"use client"
import React from 'react'
import './ConexionesHoy.scss'

export default function ConexionesHoy({ value = 42 }){
  return (
    <div className="stat-card conexiones-hoy">
      <div className="label">Conexiones hoy</div>
      <div className="value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  )
}
