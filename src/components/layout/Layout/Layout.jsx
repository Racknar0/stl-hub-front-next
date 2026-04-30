'use client'

import React, { useEffect, useState } from 'react'
import Header from '../Header/Header'
import Footer from '../Footer/Footer'
import SubscribeBar from '../BottomBar/SubscribeBar'
import useStore from '../../../store/useStore'
import { usePathname } from 'next/navigation'
import LanguageOverlay from '../../common/LanguageOverlay/LanguageOverlay'

import StickyNote from '../../common/StickyNote';

const Layout = ({ children }) => {
  const [hydrated, setHydrated] = useState(false)
  const token = useStore((s) => s.token)
  const hydrateToken = useStore((s) => s.hydrateToken)
  const hydrateLanguage = useStore((s) => s.hydrateLanguage)
  const pathname = usePathname()
  const isDashboard = pathname?.includes('/dashboard') || pathname?.includes('/admin')

  useEffect(() => {
    hydrateToken()
    hydrateLanguage()
    setHydrated(true)
  }, [hydrateToken, hydrateLanguage])

  // Mientras hidrata, evitar flicker en dashboard
  if (isDashboard && !hydrated) return null

  const showLanguageOverlay = !isDashboard

  return (
    <div className="app-layout">
      {/* Ambient Background */}
      {!isDashboard && (
        <div className="ambient-bg">
          <div className="glow-orb orb-1"></div>
          <div className="glow-orb orb-2"></div>
          <div className="grid-overlay"></div>
        </div>
      )}

      {/* Overlay de idioma (primera visita) */}
      {showLanguageOverlay && <LanguageOverlay />}

      <Header />
      <main className="app-main">{children}</main>

      {!isDashboard && <SubscribeBar />}
      {!isDashboard && <Footer />}
    </div>
  )
}

export default Layout
