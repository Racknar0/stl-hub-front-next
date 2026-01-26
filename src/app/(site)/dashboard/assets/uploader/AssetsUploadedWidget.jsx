"use client"

import React, { useEffect, useState } from 'react'
import styles from './AssetsUploadedWidget.module.scss'
import HttpService from '@/services/HttpService'

const AssetsUploadedWidget = ({ counts: initialCounts }) => {
  const [counts, setCounts] = useState(initialCounts || null)
  const [loading, setLoading] = useState(false)
  const http = new HttpService()

  const formatCount = (count) => {
    const n = Number(count || 0)
    return Number.isFinite(n) ? n.toLocaleString() : '0'
  }

  const formatSize = (gb) => {
    const g = Number(gb || 0)
    if (!Number.isFinite(g) || g <= 0) return ''
    return `${g.toFixed(1)}GB`
  }

  const renderRow = (label, count, gb, opts = {}) => {
    const { highlight = false, strong = false } = opts
    const countText = counts ? formatCount(count) : '---'
    const sizeText = counts ? formatSize(gb) : ''

    return (
      <div className={[styles.row, highlight ? styles.rowHighlight : '', strong ? styles.rowStrong : ''].filter(Boolean).join(' ')}>
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>{countText}</span>
        <span className={styles.size}>{sizeText || '\u00A0'}</span>
      </div>
    )
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
      {loading && (
        <div className={styles.row}>
          <span className={styles.label}>Cargando…</span>
          <span className={styles.count}> </span>
          <span className={styles.size}> </span>
        </div>
      )}
      {renderRow('Hoy', counts?.today, counts?.sizeGB?.today, { highlight: true })}
      {renderRow('2 días', counts?.last2d, counts?.sizeGB?.last2d)}
      {renderRow('3 días', counts?.last3d, counts?.sizeGB?.last3d)}
      {renderRow('Semana', counts?.lastWeek, counts?.sizeGB?.lastWeek)}
      {renderRow('Mes', counts?.month, counts?.sizeGB?.month)}
      {renderRow('2 meses', counts?.months2, counts?.sizeGB?.months2)}
      {renderRow('3 meses', counts?.months3, counts?.sizeGB?.months3)}
      {renderRow('Total', counts?.all, counts?.sizeGB?.all, { strong: true })}
    </div>
  )
}

export default AssetsUploadedWidget
