"use client"
import React from 'react'
import './Storage.scss'

export default function Storage({ used = 5120, total = 20480 }) {
  return (
    <div className="stat-card storage-card">
      <div className="label">Almacenamiento</div>
      <div className="value">{Math.round(used).toLocaleString()} MB</div>
      <div className="sub">de {Math.round(total).toLocaleString()} MB</div>
    </div>
  )
}
