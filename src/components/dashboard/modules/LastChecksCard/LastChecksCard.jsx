"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import './LastChecksCard.scss'
import HttpService from '@/services/HttpService'
import { fireAlert } from '@/helpers/alerts'

function formatDateTime(value) {
  if (!value) return 'Nunca'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

function formatRelativeFromNow(value) {
  if (!value) return ''
  const d = new Date(value)
  const t = d.getTime()
  if (Number.isNaN(t)) return ''

  const now = Date.now()
  let diffMs = now - t
  if (!Number.isFinite(diffMs)) return ''
  if (diffMs < 0) diffMs = 0

  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `hace ${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr} ${hr === 1 ? 'hora' : 'horas'}`
  const day = Math.floor(hr / 24)
  return `hace ${day} ${day === 1 ? 'día' : 'días'}`
}

function sortByLastCheckDesc(list) {
  const safe = Array.isArray(list) ? list : []
  return [...safe].sort((a, b) => {
    const ta = a?.lastCheckAt ? new Date(a.lastCheckAt).getTime() : -1
    const tb = b?.lastCheckAt ? new Date(b.lastCheckAt).getTime() : -1
    return tb - ta
  })
}

function sortByOldestFirst(list) {
  const safe = Array.isArray(list) ? list : []
  return [...safe].sort((a, b) => {
    const ta = a?.lastCheckAt ? new Date(a.lastCheckAt).getTime() : 0
    const tb = b?.lastCheckAt ? new Date(b.lastCheckAt).getTime() : 0
    // primero los que nunca se revisaron
    if (!a?.lastCheckAt && b?.lastCheckAt) return -1
    if (a?.lastCheckAt && !b?.lastCheckAt) return 1
    return ta - tb
  })
}

export default function LastChecksCard({
  refreshMs = 60000,
  maxHeight,
  // Parametrizable (para pruebas: 50). También se puede setear por env.
  staleDays = Number(process.env.NEXT_PUBLIC_LASTCHECKS_STALE_DAYS) || 50,
}) {
  const [tab, setTab] = useState('main')
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState([])
  const prevStaleCountRef = useRef(0)

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

  const staleAccounts = useMemo(() => {
    const days = Math.max(1, Number(staleDays) || 50)
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000

    const isStale = (a) => {
      const v = a?.lastCheckAt
      if (!v) return true
      const t = new Date(v).getTime()
      if (Number.isNaN(t)) return true
      const diffDays = Math.floor((now - t) / dayMs)
      return diffDays > days
    }

    return sortByOldestFirst((accounts || []).filter(isStale))
  }, [accounts, staleDays])

  const staleCount = staleAccounts.length

  useEffect(() => {
    const days = Math.max(1, Number(staleDays) || 50)
    // Dispara la alerta solo cuando pasa de 0 -> >0
    if (staleCount > 0 && prevStaleCountRef.current === 0) {
      void fireAlert({
        title: 'Alerta!',
        text: `hay cuentas con mas de ${days} dias sin verificarse`,
        icon: 'warning',
        confirmButtonText: 'Ok',
        zIndex: 2000,
      })
    }
    prevStaleCountRef.current = staleCount
  }, [staleCount, staleDays])

  const filtered = useMemo(() => {
    if (tab === 'alert') return staleAccounts
    const type = tab === 'backup' ? 'backup' : 'main'
    return sortByLastCheckDesc((accounts || []).filter(a => a?.type === type))
  }, [accounts, tab, staleAccounts])

  useEffect(() => {
    // Si el tab de alerta desaparece (ya no hay stale), volvemos a main
    if (tab === 'alert' && staleCount === 0) setTab('main')
  }, [tab, staleCount])

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
        {staleCount > 0 ? (
          <button
            type="button"
            className={`lc-tab lc-tab-alert ${tab === 'alert' ? 'active' : ''}`}
            onClick={() => setTab('alert')}
            aria-label={`Alerta: ${staleCount} cuentas sin revisar`}
            title={`Alerta: ${staleCount} cuentas sin revisar`}
          >
            <span className="lc-alert-dot" aria-hidden="true" />
            ALERTA
          </button>
        ) : null}
        <div className="lc-count">{filtered.length.toLocaleString()}</div>
      </div>

      <ul
        className="lc-list"
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'auto',
          ...(maxHeight ? { maxHeight } : {}),
        }}
      >
        {filtered.length === 0 ? (
          <li className="lc-empty">{loading ? 'Cargando…' : 'Sin datos'}</li>
        ) : (
          filtered.map((a) => (
            <li key={a.id} className="lc-item">
              <div className="lc-alias">{a.alias || `Cuenta #${a.id}`}</div>
              <div className="lc-meta">
                <div className="lc-meta-date">Última validación: {formatDateTime(a.lastCheckAt)}</div>
                {a.lastCheckAt ? (
                  <div className="lc-meta-rel">{formatRelativeFromNow(a.lastCheckAt)}</div>
                ) : null}
                {tab === 'alert' ? (
                  <div className="lc-meta-type">tipo: {String(a?.type || '—').toUpperCase()}</div>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="lc-footer">Auto-refresco ~{Math.round((Math.max(15000, Number(refreshMs) || 60000)) / 1000)}s</div>
    </div>
  )
}
