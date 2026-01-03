"use client"

import React, { useEffect, useState } from 'react'
import styles from './AssetsUploadedWidget.module.scss'
import HttpService from '@/services/HttpService'

const AssetsUploadedWidget = ({ counts: initialCounts }) => {
  const [counts, setCounts] = useState(initialCounts || null)
  const [loading, setLoading] = useState(false)
  const http = new HttpService()

  const formatCell = (count, gb) => {
    const n = Number(count || 0)
    const g = Number(gb || 0)
    const left = Number.isFinite(n) ? n.toLocaleString() : '0'
    if (!Number.isFinite(g) || g <= 0) return left
    return `${left} (${g.toFixed(1)}GB)`
  }

  useEffect(() => {
    let mounted = true
    const fetchCounts = async () => {
      setLoading(true)
      try {
        const res = await http.getData('/metrics/uploads')
        if (mounted) {
          setCounts(
            res.data || {
              today: 0,
              last2d: 0,
              last3d: 0,
              lastWeek: 0,
              month: 0,
              months2: 0,
              months3: 0,
              all: 0,
              sizeGB: {
                today: 0,
                last2d: 0,
                last3d: 0,
                lastWeek: 0,
                month: 0,
                months2: 0,
                months3: 0,
                all: 0,
              },
            }
          )
        }
      } catch (e) {
        console.error('AssetsUploadedWidget fetch error', e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchCounts()
    const onUploaded = () => { if (mounted) fetchCounts() }
    window.addEventListener('assets:uploaded', onUploaded)
    return () => { mounted = false; window.removeEventListener('assets:uploaded', onUploaded) }
  }, [])

  return (
    <div className={styles.widget} role="status" aria-label="Assets subidos resumen">
      <div className={styles.header}>STL's subidos</div>
      {loading && <div className={styles.row}><span>Cargando...</span></div>}
      <div className={styles.row} style={{ color: "#e5c829", fontSize: "1.2rem" , fontWeight: "bold" }}>
        <span>Hoy</span>
        <strong>{counts ? formatCell(counts.today, counts?.sizeGB?.today) : '---'}</strong>
      </div>
      <div className={styles.row}><span>Últimos 2 días</span><strong>{counts ? formatCell(counts.last2d, counts?.sizeGB?.last2d) : '---'}</strong></div>
      <div className={styles.row}><span>Últimos 3 días</span><strong>{counts ? formatCell(counts.last3d, counts?.sizeGB?.last3d) : '---'}</strong></div>
      <div className={styles.row}><span>Última semana</span><strong>{counts ? formatCell(counts.lastWeek, counts?.sizeGB?.lastWeek) : '---'}</strong></div>
      <div className={styles.row}><span>Mes</span><strong>{counts ? formatCell(counts.month, counts?.sizeGB?.month) : '---'}</strong></div>
      <div className={styles.row}><span>2 meses</span><strong>{counts ? formatCell(counts.months2, counts?.sizeGB?.months2) : '---'}</strong></div>
      <div className={styles.row}><span>3 meses</span><strong>{counts ? formatCell(counts.months3, counts?.sizeGB?.months3) : '---'}</strong></div>
      <div className={styles.row}><span>Total subidos</span><strong>{counts ? formatCell(counts.all, counts?.sizeGB?.all) : '---'}</strong></div>
    </div>
  )
}

export default AssetsUploadedWidget
