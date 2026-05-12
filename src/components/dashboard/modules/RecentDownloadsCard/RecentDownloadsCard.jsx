'use client'

import React, { useEffect, useState } from 'react'
import './RecentDownloadsCard.scss'
import HttpService from '@/services/HttpService'
import UserDetailModal from '../UserDetailModal/UserDetailModal'

const RecentDownloadsCard = () => {
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
        const res = await http.getData('/metrics/recent-downloads?limit=50')
        if (!mounted) return
        setData(res.data?.data || [])
      } catch (e) {
        console.error('RecentDownloads fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchRecent()
    const onUploaded = () => fetchRecent()
    window.addEventListener('assets:uploaded', onUploaded)
    return () => { mounted = false; window.removeEventListener('assets:uploaded', onUploaded) }
  }, [])

  const handleUserClick = (userId) => {
    if (!userId) return;
    setSelectedUserId(userId);
    setModalOpen(true);
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div className={`recent-downloads-card ${open ? 'open' : 'collapsed'}`}>
        <div className="card-header">
          <h6>Últimas 50 descargas</h6>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
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
          <ul className="downloads-list">
            {loading ? (
              <li className="download-item">Cargando…</li>
            ) : data.length === 0 ? (
              <li className="download-item">No hay descargas recientes</li>
            ) : (
              data.map((it, idx) => {
                const dateObj = new Date(it.downloadedAt);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' });
                
                return (
                <li key={idx} className="download-item">
                  <div className="left-info">
                    <span className="time">{dateStr} {timeStr}</span>
                    <span className="name">{it.assetTitle}</span>
                  </div>
                  <div className="right-info">
                    <span 
                        className={`user-email ${it.userActive ? 'active' : 'inactive'}`} 
                        onClick={() => handleUserClick(it.userId)}
                        role="button"
                        tabIndex={0}
                        title="Ver detalle del usuario"
                    >
                        {it.userEmail}
                    </span>
                  </div>
                </li>
              )})
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

export default RecentDownloadsCard
