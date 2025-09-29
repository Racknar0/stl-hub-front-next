"use client"
import React from 'react'
import './TotalArchivo.scss'

export default function TotalArchivo({ value = 1234 }) {
  return (
    <div className="stat-card total-archivo">
      <div className="label">Total archivos</div>
      <div className="value">{value.toLocaleString()}</div>
    </div>
  )
}
