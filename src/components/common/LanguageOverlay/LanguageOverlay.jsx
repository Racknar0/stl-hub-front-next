'use client'
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import useStore from '../../../store/useStore'
import { usePromo } from '@/hooks/usePromo'
import './LanguageOverlay.scss'

const FLAG_ES_64 = '/spain-flag-button-round-icon-32.png'
const FLAG_EN_64 = '/united-states-of-america-flag-button-round-icon-32.png'

export default function LanguageOverlay() {
  const setLanguage = useStore((s) => s.setLanguage)
  const promo = usePromo()
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  // Mostrar solo si el usuario nunca eligió idioma manualmente y no es un bot de búsqueda
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const ua = navigator.userAgent || '';
    const isBot = /bot|google|baidu|bing|msn|duckduckgo|teoma|slurp|yandex|spider|crawl|inspection/i.test(ua);
    
    if (isBot) {
      setShow(false);
      return;
    }

    const chosen = window.localStorage.getItem('lang_chosen')
    setShow(!chosen)
  }, [])

  const choose = (lang) => {
    setLanguage(lang)
    window.localStorage.setItem('lang_chosen', 'true')
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
      <div className={`lang-card ${promo.active ? 'promo-active' : ''}`}>
        <img className="brand" src="/nuevo_horizontal.png" alt="STL HUB" />
        
        {promo.active && (
          <div className="lang-promo-banner">
            <strong>🎉 ¡Premium Free Pass!</strong>
            <span>Descarga TODOS los modelos gratis hoy. / Download ALL models for free today.</span>
            {!promo.daysLeft && (
              <span style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '2px', fontWeight: '800' }}>
                Válido por tiempo limitado / Valid for a limited time
              </span>
            )}
          </div>
        )}

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
