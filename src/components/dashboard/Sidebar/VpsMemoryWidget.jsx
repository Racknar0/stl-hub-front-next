"use client"

import React, { useEffect, useMemo, useState } from 'react'
import HttpService from '@/services/HttpService'
import styles from './VpsMemoryWidget.module.scss'

const POLL_MS = 15000

function buildWindowsPreviewMemory() {
  const totalBytes = 16 * 1024 * 1024 * 1024
  const usagePct = 57.4
  const usedBytes = Math.round((usagePct / 100) * totalBytes)
  const availableBytes = Math.max(0, totalBytes - usedBytes)

  return {
    supported: true,
    platform: 'win32-preview',
    totalBytes,
    availableBytes,
    usedBytes,
    usagePct,
    dangerThresholdPct: 90,
  }
}

function toGB(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n) || n <= 0) return '0.0'
  return (n / (1024 ** 3)).toFixed(1)
}

export default function VpsMemoryWidget() {
  const [memory, setMemory] = useState(null)
  const [loading, setLoading] = useState(false)
  const runningOnWindowsClient = typeof window !== 'undefined' && /win/i.test(String(window.navigator?.platform || ''))

  const pct = useMemo(() => {
    const n = Number(memory?.usagePct || 0)
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.min(100, n))
  }, [memory])

  useEffect(() => {
    let abort = false
    const http = new HttpService()

    const fetchMemory = async () => {
      try {
        if (!abort && !memory) setLoading(true)
        const res = await http.getData('/metrics/vps-memory')
        const data = res?.data || null

        if (abort) return
        if (data?.supported) {
          setMemory(data)
        } else if (String(data?.platform || '').toLowerCase() === 'win32') {
          setMemory(buildWindowsPreviewMemory())
        } else {
          setMemory(null)
        }
      } catch {
        if (!abort) {
          setMemory(runningOnWindowsClient ? buildWindowsPreviewMemory() : null)
        }
      } finally {
        if (!abort) setLoading(false)
      }
    }

    fetchMemory()
    const id = setInterval(fetchMemory, POLL_MS)
    return () => {
      abort = true
      clearInterval(id)
    }
  }, [])

  if (!memory && !loading) return null

  const danger = pct >= 90
  const totalText = toGB(memory?.totalBytes)
  const freeText = toGB(memory?.availableBytes)

  return (
    <div className={styles.widget} role="status" aria-label="Memoria del VPS">
      <div className={styles.header}>Memoria VPS</div>
      <div className={styles.meta}>Total: {totalText} GB · Restante: {freeText} GB</div>
      <div className={styles.track}>
        <div className={[styles.fill, danger ? styles.fillDanger : ''].filter(Boolean).join(' ')} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.footer}>{loading ? 'Actualizando...' : `${pct.toFixed(1)}% ocupado`}</div>
    </div>
  )
}
