'use client'
import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeProvider } from '@mui/material/styles'
import Sidebar from '../../../components/dashboard/Sidebar/Sidebar'
import dynamic from 'next/dynamic'
import dashboardTheme from './dashboardTheme'
import './dashboard.scss'

// Carga dinámica para evitar problemas SSR y sólo en cliente
const ConsoleBar = dynamic(() => import('../../../components/dashboard/ConsoleBar/ConsoleBar'), { ssr: false })
import useStore from '../../../store/useStore'
import StickyNote from '../../../components/common/StickyNote'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const token = useStore((s) => s.token)
  const roleId = useStore((s) => s.roleId)
  const hydrateToken = useStore((s) => s.hydrateToken)
  const hydrated = useStore((s) => s.hydrated)

  useEffect(() => { hydrateToken() }, [hydrateToken])

  useEffect(() => {
    if (!hydrated) return // esperar hidratación
    if (!token || roleId !== 2) {
      console.log('Redirigiendo al login desde el layout del dashboard')
      router.replace('/login')
    }
  }, [hydrated, token, roleId, router])

  if (!hydrated) return null
  if (!token || roleId !== 2) return null

  return (
    <ThemeProvider theme={dashboardTheme}>
      <div className="dashboard-page">
        <Sidebar />
        <main className="dashboard-content p-3">
          {children}
        </main>
        <ConsoleBar />
        <StickyNote />
      </div>
    </ThemeProvider>
  )
}
