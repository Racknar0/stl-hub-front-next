'use client'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import useStore from '../../../store/useStore'
import './LanguageOverlay.scss'

const FLAG_ES_64 = '/spain-flag-button-round-icon-32.png'
const FLAG_EN_64 = '/united-states-of-america-flag-button-round-icon-32.png'

export default function LanguageOverlay() {
  const setLanguage = useStore((s) => s.setLanguage)
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  // Mostrar solo si no hay idioma guardado
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('lang')
    setShow(!saved)
  }, [])

  const choose = (lang) => {
    setLanguage(lang)
    setShow(false)
    if (lang === 'en') router.push('/en')
    // ES: ya está en /, no navega
  }

  // Bloquear scroll cuando está visible
  useEffect(() => {
    if (!mounted) return
    const html = document.documentElement
    const body = document.body
    if (show) {
      const prevHtml = html.style.overflow
      const prevBody = body.style.overflow
      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      return () => { html.style.overflow = prevHtml; body.style.overflow = prevBody }
    }
  }, [show, mounted])

  if (!mounted || !show) return null

  const overlay = (
    <div className="lang-overlay" role="dialog" aria-modal="true" aria-label="Language selector">
      <div className="lang-card">
        <img className="brand" src="/nuevo_horizontal.png" alt="STL HUB" />
        <h2>Selecciona tu idioma</h2>
        <p className="hint">Choose your language</p>
        <div className="options">
          <button className="opt es" onClick={() => choose('es')}>
            <img src={FLAG_ES_64} alt="Español" />
            <span>Español</span>
          </button>
          <button className="opt en" onClick={() => choose('en')}>
            <img src={FLAG_EN_64} alt="English" />
            <span>English</span>
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}
