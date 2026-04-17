"use client"
import React, { useEffect, useState } from 'react'
import '../TopDownloadsCard/TopDownloadsCard.scss'
import HttpService from '@/services/HttpService'

const EMPTY_DATA = {
  currency: 'COP',
  totals: { '1d': 0, '1w': 0, '1m': 0, '1y': 0, all: 0 },
  items: { '1d': [], '1w': [], '1m': [], '1y': [], all: [] },
}

const formatCop = (value) => {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatOriginal = (value, currency) => {
  const amount = Number(value || 0)
  const code = String(currency || 'USD').toUpperCase()
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${code}`
  }
}

const formatDate = (value) => {
  try {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return String(value || '')
  }
}

export default function TotalVentas() {
  const [range, setRange] = useState('all')
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [salesData, setSalesData] = useState(EMPTY_DATA)

  useEffect(() => {
    let mounted = true
    const http = new HttpService()

    const fetchSales = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/sales')
        if (!mounted) return

        const payload = res?.data || {}
        setSalesData({
          currency: String(payload?.currency || 'COP').toUpperCase(),
          totals: {
            '1d': Number(payload?.totals?.['1d'] || 0),
            '1w': Number(payload?.totals?.['1w'] || 0),
            '1m': Number(payload?.totals?.['1m'] || 0),
            '1y': Number(payload?.totals?.['1y'] || 0),
            all: Number(payload?.totals?.all || 0),
          },
          items: {
            '1d': Array.isArray(payload?.items?.['1d']) ? payload.items['1d'] : [],
            '1w': Array.isArray(payload?.items?.['1w']) ? payload.items['1w'] : [],
            '1m': Array.isArray(payload?.items?.['1m']) ? payload.items['1m'] : [],
            '1y': Array.isArray(payload?.items?.['1y']) ? payload.items['1y'] : [],
            all: Array.isArray(payload?.items?.all) ? payload.items.all : [],
          },
        })
      } catch (e) {
        console.error('TotalVentas fetch error', e)
        if (mounted) setSalesData(EMPTY_DATA)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchSales()
    return () => { mounted = false }
  }, [])

  const items = salesData.items?.[range] || []
  const totalAmount = Number(salesData.totals?.[range] || 0)

  return (
    <div className={`top-downloads-card ${open ? 'open' : 'collapsed'}`} style={{ width: '100%', height: '100%' }}>
      <div className="card-header">
        <h6>Total ventas</h6>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{textAlign:'right',marginLeft:8}}>
            <div className="summary-value">{loading ? '...' : formatCop(totalAmount)}</div>
          </div>
          <button
            type="button"
            className="collapse-btn"
            aria-expanded={open}
            aria-label={open ? 'Contraer' : 'Expandir'}
            onClick={() => setOpen(v => !v)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={open ? 'rot-0' : 'rot-180'}>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="range-controls">
          {['1d','1w','1m','1y','all'].map(r => (
            <button key={r} className={`range-btn ${r === range ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>
          ))}
        </div>

        <ul className="downloads-list" style={{marginTop:8}}>
          {items.map((it, idx) => (
            <li key={`${it.id || 'p'}-${idx}`} className="download-item d-flex justify-content-between align-items-center">
              <div className="d-flex flex-column">
                <div className="name">{it.method}</div>
                <div className="meta text-muted small">
                  {formatDate(it.createdAt || it.date)}
                  {' • '}
                  {formatOriginal(it.amountOriginal, it.currency)}
                </div>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="count fw-bold">{formatCop(it.amountCop)}</div>
              </div>
            </li>
          ))}
          {!loading && items.length === 0 && (
            <li className="download-item d-flex justify-content-between align-items-center">
              <div className="name">No hay ventas en este rango</div>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
