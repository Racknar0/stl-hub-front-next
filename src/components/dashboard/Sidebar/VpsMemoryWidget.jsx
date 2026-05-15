"use client"

import React, { useEffect, useMemo, useState } from 'react'
import HttpService from '@/services/HttpService'
import styles from './VpsMemoryWidget.module.scss'

const POLL_MS = 3000

function buildWindowsPreviewMemory() {
  const totalBytes = 240 * 1024 * 1024 * 1024
  const usagePct = 57.4
  const usedBytes = Math.round((usagePct / 100) * totalBytes)
  const availableBytes = Math.max(0, totalBytes - usedBytes)

  const ramTotalBytes = 16 * 1024 * 1024 * 1024
  const ramUsagePct = 42.1
  const ramUsedBytes = Math.round((ramUsagePct / 100) * ramTotalBytes)
  const ramFreeBytes = Math.max(0, ramTotalBytes - ramUsedBytes)

  return {
    supported: true,
    platform: 'win32-preview',
    totalBytes,
    availableBytes,
    usedBytes,
    usagePct,
    dangerThresholdPct: 90,
    ramTotalBytes,
    ramFreeBytes,
    ramUsedBytes,
    ramUsagePct,
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

  const diskPct = useMemo(() => {
    const n = Number(memory?.usagePct || 0)
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.min(100, n))
  }, [memory])

  const ramPct = useMemo(() => {
    const n = Number(memory?.ramUsagePct || 0)
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

  const diskDanger = diskPct >= 90
  const diskTotalText = toGB(memory?.totalBytes)
  const diskFreeText = toGB(memory?.availableBytes)
  const diskUsedText = toGB(memory?.usedBytes)

  const ramDanger = ramPct >= 90
  const ramTotalText = toGB(memory?.ramTotalBytes)
  const ramFreeText = toGB(memory?.ramFreeBytes)
  const ramUsedText = toGB(memory?.ramUsedBytes)

  return (
    <div className={styles.widget} role="status" aria-label="Recursos del VPS">
      <div className={styles.header}>Servidor VPS</div>
      
      <div className={styles.metricBlock}>
        <div className={styles.meta}>
          <strong>Disco:</strong> {diskUsedText} GB de {diskTotalText} GB <span>({diskPct.toFixed(1)}%)</span>
        </div>
        <div className={styles.track}>
          <div className={[styles.fill, diskDanger ? styles.fillDanger : ''].filter(Boolean).join(' ')} style={{ width: `${diskPct}%` }} />
        </div>
        <div className={styles.footer}>Libre: {diskFreeText} GB</div>
      </div>

      <div className={styles.metricBlock}>
        <div className={styles.meta}>
          <strong>RAM:</strong> {ramUsedText} GB de {ramTotalText} GB <span>({ramPct.toFixed(1)}%)</span>
        </div>
        <div className={styles.track}>
          <div className={[styles.fill, styles.fillRam, ramDanger ? styles.fillDanger : ''].filter(Boolean).join(' ')} style={{ width: `${ramPct}%` }} />
        </div>
        <div className={styles.footer}>Libre: {ramFreeText} GB</div>
      </div>
    </div>
  )
}
