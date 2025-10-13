"use client"
import React, { useEffect, useState } from 'react'
import './ConexionesHoy.scss'
import HttpService from '@/services/HttpService'

export default function ConexionesHoy({ value }){
  const [count, setCount] = useState(typeof value === 'number' ? value : null)
  const [loading, setLoading] = useState(false)
  const http = new HttpService()

  useEffect(() => {
    let mounted = true
    const fetchCount = async () => {
      setLoading(true)
      try {
  const res = await http.getData('/metrics/connections-today')
  if (mounted) setCount(res.data?.today ?? 0)
      } catch (e) {
        console.error('ConexionesHoy fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchCount()
    return () => { mounted = false }
  }, [])

  return (
    <div className="stat-card conexiones-hoy">
      <div className="label">Conexiones hoy</div>
      <div className="value">{loading ? '...' : (count ?? 0).toLocaleString()}</div>
    </div>
  )
}
