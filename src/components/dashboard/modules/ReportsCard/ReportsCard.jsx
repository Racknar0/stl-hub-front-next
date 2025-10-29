"use client"
import React, { useEffect, useState } from 'react'
import './ReportsCard.scss'
import HttpService from '@/services/HttpService'

export default function ReportsCard() {
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState([])
  const [actionLoading, setActionLoading] = useState(null) // assetId being processed

  const http = new HttpService()

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await http.getData('/admin/reports/broken')
      if (res?.data?.ok) setReports(res.data.data || [])
    } catch (e) {
      console.error('Error fetching broken reports', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReports() }, [])

  const handleSolve = async (assetId) => {
    if (!confirm('Marcar como resuelto y eliminar todos los reportes de este asset?')) return
    setActionLoading(assetId)
    try {
      const res = await http.deleteRaw(`/admin/reports/broken/asset/${assetId}`)
      if (res?.data?.ok) {
        // refrescar lista
        await fetchReports()
      } else {
        alert('No se pudo eliminar los reportes')
      }
    } catch (e) {
      console.error('Error deleting reports for asset', assetId, e)
      alert('Error al eliminar reportes')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className={`reports-card ${open ? 'open' : 'collapsed'}`} style={{width:'100%', maxWidth: '420px'}}>
      <div className="card-header d-flex justify-content-between align-items-center gap-5">
        <h6>Reportes caídos</h6>
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
        {loading ? (
          <div>Loading...</div>
        ) : (
          <ul className="reports-list">
            {reports.length === 0 && <li className="empty">No hay reportes</li>}
            {reports.map((it) => (
              <li key={it.id} className="report-item d-flex justify-content-between align-items-center">
                <div className="left d-flex flex-column">
                  <div className="name">{it.assetTitle || `Asset #${it.assetId}`}</div>
                  <div className="meta">{new Date(it.createdAt).toLocaleString()} · {it.note || ''}</div>
                </div>
                <div className="right d-flex align-items-center" style={{gap:8}}>
                  <button
                    type="button"
                    className="btn-solve"
                    onClick={() => handleSolve(it.assetId)}
                    disabled={actionLoading && actionLoading !== it.assetId}
                  >
                    {actionLoading === it.assetId ? '...' : 'Solved'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
