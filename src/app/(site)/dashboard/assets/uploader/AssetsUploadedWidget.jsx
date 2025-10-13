"use client"

import React, { useEffect, useState } from 'react'
import styles from './AssetsUploadedWidget.module.scss'
import HttpService from '@/services/HttpService'

const AssetsUploadedWidget = ({ counts: initialCounts }) => {
  const [counts, setCounts] = useState(initialCounts || null)
  const [loading, setLoading] = useState(false)
  const http = new HttpService()

  useEffect(() => {
    let mounted = true
    const fetchCounts = async () => {
      setLoading(true)
      try {
  const res = await http.getData('/metrics/uploads')
  if (mounted) setCounts(res.data || { today: 0, last3d: 0, lastWeek: 0, month: 0 })
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


  console.log('AssetsUploadedWidget render', counts, loading)

  return (
    <div className={styles.widget} role="status" aria-label="Assets subidos resumen">
      <div className={styles.header}>STL's subidos</div>
      {loading && <div className={styles.row}><span>Cargando...</span></div>}
      <div className={styles.row} style={{ color: "#e5c829", fontSize: "1.2rem" , fontWeight: "bold" }}><span>Hoy</span><strong>{counts ? counts.today : '---'}</strong></div>
      <div className={styles.row}><span>Últimos 3 días</span><strong>{counts ? counts.last3d : '---'}</strong></div>
      <div className={styles.row}><span>Última semana</span><strong>{counts ? counts.lastWeek : '---'}</strong></div>
      <div className={styles.row}><span>Mes</span><strong>{counts ? counts.month : '---'}</strong></div>
    </div>
  )
}

export default AssetsUploadedWidget
