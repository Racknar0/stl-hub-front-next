'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard/marketing', label: 'Resumen', icon: 'M3 12h4l3 8 4-16 3 8h4' },
  { href: '/dashboard/marketing/embudos', label: 'Embudos', icon: 'M3 4h18l-7 8v6l-4 2v-8z' },
  { href: '/dashboard/marketing/audiencias', label: 'Audiencias', icon: 'M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0M22 20v-2a4 4 0 0 0-3-3.87' },
  { href: '/dashboard/marketing/campanas', label: 'Campañas', icon: 'M3 11l18-8-8 18-2-7-8-3z' },
  { href: '/dashboard/marketing/plantillas', label: 'Plantillas', icon: 'M4 4h16v5H4zM4 13h7v7H4zM15 13h5v7h-5z' },
]

export default function MarketingTabs() {
  const pathname = usePathname()

  return (
    <nav className="mk-tabs" aria-label="Secciones de Marketing">
      {TABS.map((tab) => {
        // "Resumen" solo se marca en su ruta exacta; el resto admite subrutas.
        const active =
          tab.href === '/dashboard/marketing'
            ? pathname === tab.href
            : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? 'is-active' : ''}
            aria-current={active ? 'page' : undefined}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d={tab.icon}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
