"use client"
import React, { useEffect, useMemo, useState } from 'react'
import './LastChecksCard.scss'
import HttpService from '@/services/HttpService'

function formatDateTime(value) {
  if (!value) return 'Nunca'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function sortByLastCheckDesc(list) {
  const safe = Array.isArray(list) ? list : []
  return [...safe].sort((a, b) => {
    const ta = a?.lastCheckAt ? new Date(a.lastCheckAt).getTime() : -1
    const tb = b?.lastCheckAt ? new Date(b.lastCheckAt).getTime() : -1
    return tb - ta
  })
}

export default function LastChecksCard({ refreshMs = 60000, maxHeight = 260 }) {
  const [tab, setTab] = useState('main')
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState([])

  const http = new HttpService()

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const res = await http.getData('/accounts')
      setAccounts(res?.data || [])
    } catch (e) {
      console.error('LastChecksCard fetch error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const run = async () => {
      if (!mounted) return
      await fetchAccounts()
    }

    run()

    const id = window.setInterval(() => {
      run()
    }, Math.max(15000, Number(refreshMs) || 60000))

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run()
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mounted = false
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [refreshMs])

  const filtered = useMemo(() => {
    const type = tab === 'backup' ? 'backup' : 'main'
    return sortByLastCheckDesc((accounts || []).filter(a => a?.type === type))
  }, [accounts, tab])

  return (
    <div className="stat-card last-checks-card" style={{ width: '100%', maxWidth: '420px' }}>
      <div className="lc-header">
        <div className="lc-title">Últimas revisiones</div>
        <button
          type="button"
          className="lc-refresh"
          onClick={fetchAccounts}
          disabled={loading}
          aria-label="Refrescar"
          title="Refrescar"
        >
          {loading ? '…' : 'Refrescar'}
        </button>
      </div>

      <div className="lc-tabs">
        <button
          type="button"
          className={`lc-tab ${tab === 'main' ? 'active' : ''}`}
          onClick={() => setTab('main')}
        >
          MAIN
        </button>
        <button
          type="button"
          className={`lc-tab ${tab === 'backup' ? 'active' : ''}`}
          onClick={() => setTab('backup')}
        >
          BACKUP
        </button>
        <div className="lc-count">{filtered.length.toLocaleString()}</div>
      </div>

      <ul className="lc-list" style={{ maxHeight, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <li className="lc-empty">{loading ? 'Cargando…' : 'Sin datos'}</li>
        ) : (
          filtered.map((a) => (
            <li key={a.id} className="lc-item">
              <div className="lc-alias">{a.alias || `Cuenta #${a.id}`}</div>
              <div className="lc-meta">Última validación: {formatDateTime(a.lastCheckAt)}</div>
            </li>
          ))
        )}
      </ul>

      <div className="lc-footer">Auto-refresco ~{Math.round((Math.max(15000, Number(refreshMs) || 60000)) / 1000)}s</div>
    </div>
  )
}
