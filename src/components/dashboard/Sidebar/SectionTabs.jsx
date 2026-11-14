'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import SellOutlinedIcon from '@mui/icons-material/SellOutlined'
import PushPinOutlined from '@mui/icons-material/PushPinOutlined'
import VideoLibraryOutlined from '@mui/icons-material/VideoLibraryOutlined'
import DownloadOutlined from '@mui/icons-material/DownloadOutlined'
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined'
import PanoramaOutlined from '@mui/icons-material/PanoramaOutlined'

const sections = [
  { title: 'Taxonomía', tabs: [['Categorías', '/dashboard/categories'], ['Tags', '/dashboard/tags']] },
  { title: 'Publicaciones', tabs: [['Pinterest', '/dashboard/pinterest'], ['Reels', '/dashboard/reels'], ['Banners del home', '/dashboard/hero-banners']] },
  { title: 'Telegram', tabs: [['Descargas', '/dashboard/telegram-downloader'], ['Organizador', '/dashboard/telegram-organizer']] },
]

export default function SectionTabs() {
  const pathname = usePathname()
  const section = sections.find(item => item.tabs.some(([, href]) => pathname === href))
  if (!section) return null

  return (
    <div className="dashboard-section-tabs">
      <nav aria-label={`Apartados de ${section.title}`}>
        {section.tabs.map(([label, href]) => (
          <Link key={href} href={href} className={pathname === href ? 'is-active' : undefined} aria-current={pathname === href ? 'page' : undefined}>
            {href === '/dashboard/categories' && <CategoryOutlinedIcon sx={{ fontSize: 19 }} />}
            {href === '/dashboard/tags' && <SellOutlinedIcon sx={{ fontSize: 19 }} />}
            {href === '/dashboard/pinterest' && <PushPinOutlined />}
            {href === '/dashboard/reels' && <VideoLibraryOutlined />}
            {href === '/dashboard/hero-banners' && <PanoramaOutlined />}
            {href === '/dashboard/telegram-downloader' && <DownloadOutlined />}
            {href === '/dashboard/telegram-organizer' && <AccountTreeOutlined />}
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
