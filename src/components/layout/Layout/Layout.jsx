'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Header from '../Header/Header'
import Footer from '../Footer/Footer'
import SubscribeBar from '../BottomBar/SubscribeBar'
import useStore from '../../../store/useStore'
import { usePathname, useSearchParams } from 'next/navigation'
import LanguageOverlay from '../../common/LanguageOverlay/LanguageOverlay'
import StickyNote from '../../common/StickyNote';
import VantaBackground from '../VantaBackground/VantaBackground'
import SplashCursor from '../SplashCursor/SplashCursor'
import GlobalLoader from '../../common/GlobalLoader/GlobalLoader'

/**
 * Apaga el loader global cuando la ruta termina de cambiar.
 * Vive en su propio componente porque useSearchParams() saca del render en
 * servidor a todo lo que comparta su Suspense: si se llama en Layout, las
 * páginas prerenderizadas salen con el <body> vacío.
 */
function RouteChangeLoaderReset() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const setGlobalLoading = useStore((s) => s.setGlobalLoading)
  const search = searchParams?.toString()

  useEffect(() => {
    const doneTimer = setTimeout(() => setGlobalLoading(false), 120)
    return () => clearTimeout(doneTimer)
  }, [pathname, search, setGlobalLoading])

  return null
}

const Layout = ({ children }) => {
  const [hydrated, setHydrated] = useState(false)
  const token = useStore((s) => s.token)
  const hydrateToken = useStore((s) => s.hydrateToken)
  const hydrateLanguage = useStore((s) => s.hydrateLanguage)
  const globalLoading = useStore((s) => s.globalLoading)
  const setGlobalLoading = useStore((s) => s.setGlobalLoading)
  const pathname = usePathname()
  const isDashboard = pathname?.includes('/dashboard') || pathname?.includes('/admin')

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    hydrateToken()
    hydrateLanguage()
    setHydrated(true)
  }, [hydrateToken, hydrateLanguage])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 992 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Failsafe para evitar overlay "pegado" si una navegación no completa.
  useEffect(() => {
    if (!globalLoading) return
    const safetyTimer = setTimeout(() => setGlobalLoading(false), 8000)
    return () => clearTimeout(safetyTimer)
  }, [globalLoading, setGlobalLoading])

  // Mientras hidrata, evitar flicker en dashboard
  if (isDashboard && !hydrated) return null

  const showLanguageOverlay = !isDashboard

  return (
    <div className="app-layout">
      <GlobalLoader />
      <Suspense fallback={null}>
        <RouteChangeLoaderReset />
      </Suspense>

      {/* Ambient Background */}
      {!isDashboard && !isMobile && (
        <>
          <VantaBackground />
          <SplashCursor />
        </>
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
