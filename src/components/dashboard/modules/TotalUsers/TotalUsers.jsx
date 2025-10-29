"use client"
import React, { useEffect, useState } from 'react'
import './TotalUsers.scss'
import HttpService from '@/services/HttpService'

export default function TotalUsers({ value }) {
  const [total, setTotal] = useState(typeof value === 'number' ? value : null)
  const [loading, setLoading] = useState(false)
  const http = new HttpService()

  useEffect(() => {
    let mounted = true
    const fetchTotal = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/users')
        if (mounted) setTotal(res.data?.total ?? res.data?.all ?? 0)
      } catch (e) {
        console.error('TotalUsers fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchTotal()
    return () => { mounted = false }
  }, [])

  return (
    <div className="stat-card total-users">
      <div className="label">Total usuarios</div>
      <div className="value">{loading ? '...' : (total ?? 0).toLocaleString()}</div>
    </div>
  )
}
