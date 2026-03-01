'use client'

import React, { useEffect, useMemo, useState } from 'react'
import './TaxonomyCountsCard.scss'
import HttpService from '@/services/HttpService'

const TaxonomyCountsCard = () => {
  const [tab, setTab] = useState('categories')
  const [sort, setSort] = useState('asc') // asc = menos primero
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({ categories: [], tags: [] })

  const http = new HttpService()

  useEffect(() => {
    let mounted = true

    const fetchCounts = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/taxonomy-counts')
        if (!mounted) return
        setData(res.data || { categories: [], tags: [] })
      } catch (e) {
        console.error('TaxonomyCountsCard fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchCounts()
    const onUploaded = () => fetchCounts()
    window.addEventListener('assets:uploaded', onUploaded)
    return () => {
      mounted = false
      window.removeEventListener('assets:uploaded', onUploaded)
    }
  }, [])

  const rawItems = tab === 'tags' ? (data.tags || []) : (data.categories || [])

  const items = useMemo(() => {
    const safe = Array.isArray(rawItems) ? rawItems : []
    const dir = sort === 'desc' ? -1 : 1

    return [...safe].sort((a, b) => {
      const ca = Number(a?.count || 0)
      const cb = Number(b?.count || 0)
      if (ca !== cb) return (ca - cb) * dir
      const na = String(a?.name || '').toLocaleLowerCase('es')
      const nb = String(b?.name || '').toLocaleLowerCase('es')
      return na.localeCompare(nb, 'es')
    })
  }, [rawItems, sort])

  const summary = loading ? '...' : items.length.toLocaleString()

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', maxWidth: '320px' }}>
      <div style={{ width: '100%' }}>
        <div className={`taxonomy-counts-card ${open ? 'open' : 'collapsed'}`}>
          <div className="card-header">
            <h6>{tab === 'tags' ? 'Tags (conteo)' : 'Categorías (conteo)'}</h6>
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
              <button className={`range-btn ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>
                Categorías
              </button>
              <button className={`range-btn ${tab === 'tags' ? 'active' : ''}`} onClick={() => setTab('tags')}>
                Tags
              </button>

              <div className="divider" />

              <button className={`range-btn ${sort === 'asc' ? 'active' : ''}`} onClick={() => setSort('asc')} title="Menos archivos primero">
                Menos
              </button>
              <button className={`range-btn ${sort === 'desc' ? 'active' : ''}`} onClick={() => setSort('desc')} title="Más archivos primero">
                Más
              </button>
            </div>

            <ul className="items-list" style={{ marginTop: 8 }}>
              {loading ? (
                <li className="item-row">Cargando…</li>
              ) : items.length === 0 ? (
                <li className="item-row">Sin datos.</li>
              ) : (
                items.map((it) => (
                  <li key={it.id} className="item-row d-flex justify-content-between align-items-center">
                    <span className="name" title={it.name}>{it.name}</span>
                    <span className="count">{Number(it.count || 0).toLocaleString()}</span>
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

export default TaxonomyCountsCard
