'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import HttpService from '@/services/HttpService'
import './Sidebar.scss'
import AssetsUploadedWidget from '@/app/(site)/dashboard/assets/uploader/AssetsUploadedWidget'
import VpsMemoryWidget from './VpsMemoryWidget'

const Sidebar = () => {
  const [open, setOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(()=>{
    let abort=false
    const http = new HttpService()
    async function fetchUnread(){
      try {
        const res = await http.getData('/admin/notifications?status=UNREAD&take=1')
        if(!abort) setHasUnread((res.data?.notifications||[]).length>0)
      } catch{}
    }
    fetchUnread()
    const id = setInterval(fetchUnread, 15000)
    return ()=>{ abort=true; clearInterval(id) }
  },[])

  return (
    <>
      <button
        type="button"
        className="dash-toggle"
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      <aside className={`dash-sidebar ${open ? 'open' : ''}`} aria-label="Dashboard menu">
        <div className="brand">
          <Link href="/">
            <img src="/nuevo_horizontal.png" alt="STL HUB" />
          </Link>
        </div>
        <nav className="menu mt-5">
          <ul>
            <li>
              <Link href="/dashboard" className="item" onClick={() => setOpen(false)}>
                <span className="icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-5H10v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Dashboard
              </Link>
            </li>
            <li className="submenu-group" tabIndex={0}>
              <div className="item submenu-parent" role="button" aria-haspopup="true" aria-expanded="false">
                <span className="icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                Upload
                <span className="submenu-caret" aria-hidden>▾</span>
              </div>
              <ul className="submenu" aria-label="Submenu Upload">
                <li>
                  <Link href="/dashboard/assets/uploader" className="item submenu-item" onClick={() => setOpen(false)}>
                    Subir Stl
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/upload-batch" className="item submenu-item" onClick={() => setOpen(false)}>
                    Upload Batch
                  </Link>
                </li>
              </ul>
            </li>

            <li className="submenu-group" tabIndex={0}>
              <div className="item submenu-parent" role="button" aria-haspopup="true" aria-expanded="false">
                <span className="icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                Meta Info
                <span className="submenu-caret" aria-hidden>▾</span>
              </div>
              <ul className="submenu" aria-label="Submenu Meta Info">
                <li>
                  <Link href="/dashboard/categories" className="item submenu-item" onClick={() => setOpen(false)}>
                    Categorías
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/tags" className="item submenu-item" onClick={() => setOpen(false)}>
                    Tags
                  </Link>
                </li>
              </ul>
            </li>

            <li className="submenu-group" tabIndex={0}>
              <div className="item submenu-parent" role="button" aria-haspopup="true" aria-expanded="false">
                <span className="icon" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
                Informacion
                {hasUnread && <span className="notif-dot" aria-label="Hay notificaciones sin leer" />}
                <span className="submenu-caret" aria-hidden>▾</span>
              </div>
              <ul className="submenu" aria-label="Submenu Informacion">
                <li>
                  <Link href="/dashboard/assets" className="item submenu-item" onClick={() => setOpen(false)}>
                    Asset
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/users" className="item submenu-item" onClick={() => setOpen(false)}>
                    Usuarios
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/accounts" className="item submenu-item" onClick={() => setOpen(false)}>
                    Cuentas MEGA
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/notifications" className="item submenu-item" onClick={() => setOpen(false)}>
                    Notificaciones
                  </Link>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
        <div className="sidebar-bottom">
          <VpsMemoryWidget />
          <AssetsUploadedWidget />
        </div>
      </aside>
    </>
  )
}

export default Sidebar
