'use client'

import React, { useEffect } from 'react'
import Header from '../Header/Header'
import Footer from '../Footer/Footer'
import SubscribeBar from '../BottomBar/SubscribeBar'
import useStore from '../../../store/useStore'
import { usePathname } from 'next/navigation'

const Layout = ({ children }) => {
  const token = useStore((s) => s.token)
  const hydrateToken = useStore((s) => s.hydrateToken)
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard')

  useEffect(() => {
    hydrateToken()
  }, [hydrateToken])

  return (
    <div className="app-layout">
      <Header />
      <main className="app-main">{children}</main>
      {!token && !isDashboard && <SubscribeBar />}
      {!isDashboard && <Footer />}
    </div>
  )
}

export default Layout
