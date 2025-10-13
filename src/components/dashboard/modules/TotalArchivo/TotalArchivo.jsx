"use client"
import React, { useEffect, useState } from 'react'
import './TotalArchivo.scss'
import HttpService from '@/services/HttpService'

export default function TotalArchivo({ value }) {
  const [total, setTotal] = useState(typeof value === 'number' ? value : null)
  const [loading, setLoading] = useState(false)
  const http = new HttpService()

  useEffect(() => {
    let mounted = true
    const fetchTotal = async () => {
      setLoading(true)
      try {
  const res = await http.getData('/metrics/uploads')
  if (mounted) setTotal(res.data?.all ?? 0)
      } catch (e) {
        console.error('TotalArchivo fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchTotal()
    const onUploaded = () => { if (mounted) fetchTotal() }
    window.addEventListener('assets:uploaded', onUploaded)
    return () => { mounted = false; window.removeEventListener('assets:uploaded', onUploaded) }
  }, [])

  return (
    <div className="stat-card total-archivo">
      <div className="label">Total STL'S</div>
      <div className="value">{loading ? '...' : (total ?? 0).toLocaleString()}</div>
    </div>
  )
}
