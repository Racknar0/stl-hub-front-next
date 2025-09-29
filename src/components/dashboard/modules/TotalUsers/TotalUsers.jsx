"use client"
import React from 'react'
import './TotalUsers.scss'

export default function TotalUsers({ value = 256 }) {
  return (
    <div className="stat-card total-users">
      <div className="label">Total usuarios</div>
      <div className="value">{value.toLocaleString()}</div>
    </div>
  )
}
