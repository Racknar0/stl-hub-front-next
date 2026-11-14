'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import HomeOutlined from '@mui/icons-material/HomeOutlined'
import ViewInArOutlined from '@mui/icons-material/ViewInArOutlined'
import CategoryOutlined from '@mui/icons-material/CategoryOutlined'
import CloudOutlined from '@mui/icons-material/CloudOutlined'
import FolderOutlined from '@mui/icons-material/FolderOutlined'
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined'
import CampaignOutlined from '@mui/icons-material/CampaignOutlined'
import Telegram from '@mui/icons-material/Telegram'
import PeopleOutline from '@mui/icons-material/PeopleOutline'
import MailOutline from '@mui/icons-material/MailOutline'
import CardGiftcardOutlined from '@mui/icons-material/CardGiftcardOutlined'
import NotificationsNone from '@mui/icons-material/NotificationsNone'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import Menu from '@mui/icons-material/Menu'
import Close from '@mui/icons-material/Close'
import HttpService from '@/services/HttpService'
import './Sidebar.scss'

const groups = [
  { label: 'Catálogo', items: [
    { label: 'Modelos', href: '/dashboard/assets', icon: ViewInArOutlined },
    { label: 'Taxonomía', href: '/dashboard/categories', paths: ['/dashboard/categories', '/dashboard/tags'], icon: CategoryOutlined },
    { label: 'Cuentas MEGA', href: '/dashboard/accounts', icon: CloudOutlined },
  ] },
  { label: 'Herramientas', items: [
    { label: 'Upload Batch', href: '/dashboard/upload-batch', icon: FileUploadOutlined },
    { label: 'Publicaciones', href: '/dashboard/pinterest', paths: ['/dashboard/pinterest', '/dashboard/reels', '/dashboard/hero-banners'], icon: CampaignOutlined },
    { label: 'Telegram', href: '/dashboard/telegram-downloader', paths: ['/dashboard/telegram-downloader', '/dashboard/telegram-organizer'], icon: Telegram },
    { label: 'Explorador de archivos', href: '/dashboard/file-explorer', icon: FolderOutlined },
  ] },
  { label: 'Gestión', items: [
    { label: 'Usuarios', href: '/dashboard/users', icon: PeopleOutline },
    ...(process.env.NODE_ENV !== 'production' ? [{ label: 'Marketing', href: '/dashboard/marketing', icon: MailOutline }] : []),
    { label: 'Publicidad', href: '/dashboard?tab=campaigns', tab: 'campaigns', icon: CampaignOutlined },
    { label: 'Códigos regalo', href: '/dashboard?tab=gift-codes', tab: 'gift-codes', icon: CardGiftcardOutlined },
  ] },
  { label: 'Sistema', items: [
    { label: 'Notificaciones', href: '/dashboard/notifications', icon: NotificationsNone, notifications: true },
    { label: 'Configuración', href: '/dashboard/system-config', icon: SettingsOutlined },
  ] },
]

function SidebarContents() {
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const pathname = usePathname()
  const params = useSearchParams()

  useEffect(() => {
    let mounted = true
    const http = new HttpService()
    const fetchUnread = async () => {
      try {
        const res = await http.getData('/admin/notifications?status=UNREAD&take=1')
        if (mounted) setHasUnread((res.data?.notifications || []).length > 0)
      } catch {}
    }
    fetchUnread()
    const timer = setInterval(fetchUnread, 15000)
    return () => { mounted = false; clearInterval(timer) }
  }, [])

  const renderItem = (item) => {
    const Icon = item.icon
    const active = item.tab
      ? pathname === '/dashboard' && params.get('tab') === item.tab
      : item.href === '/dashboard'
        ? pathname === '/dashboard' && !['campaigns', 'gift-codes'].includes(params.get('tab'))
        : (item.paths || [item.href]).some(path => pathname === path || pathname.startsWith(path + '/'))
    return (
      <li key={item.href}>
        <Link href={item.href} className={`item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}>
          <Icon className="nav-icon" aria-hidden="true" />
          <span>{item.label}</span>
          {item.notifications && hasUnread && <span className="notif-dot" aria-label="Hay notificaciones sin leer" />}
        </Link>
      </li>
    )
  }

  return (
    <>
      <button type="button" className="dash-toggle" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} aria-controls="dashboard-navigation" onClick={() => setOpen(v => !v)}>
        {open ? <Close fontSize="small" /> : <Menu fontSize="small" />}
      </button>
      <aside id="dashboard-navigation" className={`dash-sidebar dash-sidebar-grouped${open ? ' open' : ''}`} aria-label="Menú de administración">
        <div className="brand"><Link href="/"><img src="/nuevo_horizontal.png" alt="STL HUB" /></Link></div>
        <nav className="menu" aria-label="Secciones de administración">
          <ul>{renderItem({ label: 'Dashboard', href: '/dashboard', icon: HomeOutlined })}</ul>
          {groups.map(group => (
            <section className="nav-section" key={group.label} aria-label={group.label}>
              <h2 className="nav-section-label">{group.label}</h2>
              <ul>{group.items.map(renderItem)}</ul>
            </section>
          ))}
        </nav>
      </aside>
    </>
  )
}

export default function Sidebar() {
  return <Suspense fallback={<aside className="dash-sidebar" aria-label="Cargando navegación" />}><SidebarContents /></Suspense>
}
