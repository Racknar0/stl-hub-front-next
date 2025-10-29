"use client"
import React, { useEffect, useState } from 'react'
import './Storage.scss'
import HttpService from '@/services/HttpService'

export default function Storage({ used: usedProp, total: totalProp }) {
  const [used, setUsed] = useState(typeof usedProp === 'number' ? usedProp : null)
  const [total, setTotal] = useState(typeof totalProp === 'number' ? totalProp : null)
  const [loading, setLoading] = useState(false)
  const http = new HttpService()
  const FREE_QUOTA_MB = Number(process.env.NEXT_PUBLIC_MEGA_FREE_QUOTA_MB) || 20480

  useEffect(() => {
    let mounted = true
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/accounts')
        const list = res.data || []
        const ok = (list || []).filter((a) => a.status === 'CONNECTED' && a.type === 'main')
        let u = 0
        let t = 0
        for (const a of ok) {
          const tt = a.storageTotalMB && a.storageTotalMB > 0 ? a.storageTotalMB : FREE_QUOTA_MB
          const uu = Math.max(0, a.storageUsedMB || 0)
          u += uu
          t += tt
        }
        if (mounted) {
          setUsed(u)
          setTotal(t)
        }
      } catch (e) {
        console.error('Storage fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetch()
    const onUploaded = () => fetch()
    window.addEventListener('assets:uploaded', onUploaded)
    return () => { mounted = false; window.removeEventListener('assets:uploaded', onUploaded) }
  }, [])

  const displayUsed = loading ? '...' : (used ?? 0)
  const displayTotal = loading ? '...' : (total ?? 0)

  const formatGB = (mb) => {
    if (typeof mb !== 'number') return '...'
    return (mb / 1024).toFixed(1)
  }

  return (
    <div className="stat-card storage-card">
      <div className="label">Almacenamiento</div>
      <div className="value">{loading ? '...' : `${Math.round(displayUsed)} MB (${formatGB(displayUsed)} GB)`}</div>
      <div className="sub">de {loading ? '...' : `${Math.round(displayTotal)} MB (${formatGB(displayTotal)} GB)`}</div>
    </div>
  )
}
