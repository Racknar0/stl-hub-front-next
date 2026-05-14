'use client'

import React, { useEffect, useState } from 'react'
import './RecentSearchesCard.scss'
import HttpService from '@/services/HttpService'
import UserDetailModal from '../UserDetailModal/UserDetailModal'

const RecentSearchesCard = () => {
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const http = new HttpService()

  useEffect(() => {
    let mounted = true
    const fetchRecent = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/recent-searches?limit=50')
        if (!mounted) return
        setData(res.data?.data || [])
      } catch (e) {
        console.error('RecentSearches fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchRecent()
    return () => { mounted = false }
  }, [])

  const handleUserClick = (userId) => {
    if (!userId) return
    setSelectedUserId(userId)
    setModalOpen(true)
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div className={`recent-searches-card ${open ? 'open' : 'collapsed'}`}>
        <div className="card-header">
          <h6>🔍 Últimas 50 búsquedas</h6>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="summary-value">{loading ? '...' : data.length}</span>
            <button
              type="button"
              className="collapse-btn"
              aria-expanded={open}
              aria-label={open ? 'Contraer' : 'Expandir'}
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={open ? 'rot-0' : 'rot-180'}>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="card-body">
          <ul className="searches-list">
            {loading ? (
              <li className="search-item">Cargando…</li>
            ) : data.length === 0 ? (
              <li className="search-item">No hay búsquedas recientes</li>
            ) : (
              data.map((it) => {
                const dateObj = new Date(it.createdAt)
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                const dateStr = dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' })

                return (
                  <li key={it.id} className="search-item">
                    <div className="item-header">
                      <span className="query-text" title={it.query}>
                        {it.isAiSearch && <span className="ai-badge" title="Búsqueda IA">🤖</span>}
                        {it.query}
                      </span>
                      <span className="time">{timeStr} · {dateStr}</span>
                    </div>
                    <div className="item-footer">
                      <span className={`result-badge ${it.resultCount === 0 ? 'zero' : ''}`}>
                        {it.resultCount} resultado{it.resultCount !== 1 ? 's' : ''}
                      </span>
                      {it.clickCount > 0 && (
                        <span className="click-badge">{it.clickCount} click{it.clickCount !== 1 ? 's' : ''}</span>
                      )}
                      {it.userEmail ? (
                        <span
                          className={`user-email ${it.userActive ? 'active' : 'inactive'}`}
                          onClick={() => handleUserClick(it.userId)}
                          role="button"
                          tabIndex={0}
                          title="Ver detalle del usuario"
                        >
                          {it.userEmail}
                        </span>
                      ) : (
                        <span className="anon-label">anónimo</span>
                      )}
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </div>

      <UserDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={selectedUserId}
      />
    </div>
  )
}

export default RecentSearchesCard
