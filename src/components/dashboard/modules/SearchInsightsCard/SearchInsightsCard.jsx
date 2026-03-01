'use client'

import React, { useEffect, useMemo, useState } from 'react'
import './SearchInsightsCard.scss'
import HttpService from '@/services/HttpService'

const RANGES = ['1d', '1w', '1m', '1y', 'all']

const SearchInsightsCard = () => {
  const [range, setRange] = useState('1w')
  const [view, setView] = useState('top') // top | zero | clicks
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({})
  const http = new HttpService()

  useEffect(() => {
    let mounted = true

    const fetchInsights = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/search-insights')
        if (!mounted) return
        setData(res.data || {})
      } catch (e) {
        console.error('SearchInsightsCard fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchInsights()
    return () => {
      mounted = false
    }
  }, [])

  const bucket = data?.[range] || { totals: { searches: 0, clicks: 0 }, topQueries: [], zeroQueries: [], topClickedAssets: [] }

  const items = useMemo(() => {
    if (loading) return []
    if (view === 'zero') return bucket.zeroQueries || []
    if (view === 'clicks') return bucket.topClickedAssets || []
    return bucket.topQueries || []
  }, [bucket, loading, view])

  const summary = loading
    ? '...'
    : (view === 'clicks'
      ? Number(bucket?.totals?.clicks || 0).toLocaleString()
      : Number(bucket?.totals?.searches || 0).toLocaleString())

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', maxWidth: '360px' }}>
      <div style={{ width: '100%' }}>
        <div className={`search-insights-card ${open ? 'open' : 'collapsed'}`}>
          <div className="card-header">
            <h6>Búsquedas</h6>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ textAlign: 'right', marginLeft: 8 }}>
                <div className="summary-value">{summary}</div>
              </div>
              <button
                type="button"
                className="collapse-btn"
                aria-expanded={open}
                aria-label={open ? 'Contraer' : 'Expandir'}
                onClick={() => setOpen((v) => !v)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={open ? 'rot-0' : 'rot-180'}
                >
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <div className="card-body">
            <div className="range-controls">
              <div className="group">
                {RANGES.map((r) => (
                  <button key={r} className={`range-btn ${r === range ? 'active' : ''}`} onClick={() => setRange(r)}>
                    {r}
                  </button>
                ))}
              </div>

              <div className="group">
                <button className={`range-btn ${view === 'top' ? 'active' : ''}`} onClick={() => setView('top')} title="Top queries">
                  Top
                </button>
                <button className={`range-btn ${view === 'zero' ? 'active' : ''}`} onClick={() => setView('zero')} title="Búsquedas sin resultados">
                  0 res
                </button>
                <button className={`range-btn ${view === 'clicks' ? 'active' : ''}`} onClick={() => setView('clicks')} title="Assets más clickeados desde búsqueda">
                  Clicks
                </button>
              </div>
            </div>

            <ul className="items-list" style={{ marginTop: 8 }}>
              {loading ? (
                <li className="item-row">Cargando…</li>
              ) : items.length === 0 ? (
                <li className="item-row">Sin datos.</li>
              ) : view === 'clicks' ? (
                items.map((it) => (
                  <li key={it.assetId} className="item-row d-flex justify-content-between align-items-center">
                    <span className="name" title={it.title}>{it.title}</span>
                    <span className="count">{Number(it.count || 0).toLocaleString()}</span>
                  </li>
                ))
              ) : view === 'zero' ? (
                items.map((it) => (
                  <li key={it.query} className="item-row d-flex justify-content-between align-items-center">
                    <span className="name" title={it.query}>{it.query}</span>
                    <span className="count">{Number(it.count || 0).toLocaleString()}</span>
                  </li>
                ))
              ) : (
                items.map((it) => (
                  <li key={it.query} className="item-row">
                    <div className="row-main">
                      <span className="name" title={it.query}>{it.query}</span>
                      <span className="count">{Number(it.count || 0).toLocaleString()}</span>
                    </div>
                    <div className="row-sub">
                      <span>0res: {Number(it.zeroCount || 0).toLocaleString()}</span>
                      <span>avg: {Number(it.avgResults || 0).toLocaleString()}</span>
                      <span>clicks: {Number(it.clicks || 0).toLocaleString()}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchInsightsCard
