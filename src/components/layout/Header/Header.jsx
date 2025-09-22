'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import './Header.scss'
import Button from '../Buttons/Button'
import useStore from '../../../store/useStore'
import { useRouter } from 'next/navigation'
import { confirmAlert } from '../../../helpers/alerts'
import HttpService from '../../../services/HttpService'
import GlobalLoader from '../../common/GlobalLoader/GlobalLoader'
import { useI18n } from '../../../i18n'

const Header = () => {
  const token = useStore((s) => s.token)
  const roleId = useStore((s) => s.roleId)
  const logout = useStore((s) => s.logout)
  const language = useStore((s) => s.language)
  const setLanguage = useStore((s) => s.setLanguage)
  const router = useRouter()
  const http = new HttpService()
  const { t } = useI18n()

  const [categories, setCategories] = useState([])
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)

  // Hidratar idioma desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('lang')
      if (saved) setLanguage(saved)
    }
  }, [setLanguage])

  useEffect(() => {
    let mounted = true
    const loadCats = async () => {
      try {
        const res = await http.getData('/categories')
        const items = res.data?.items || []
        if (mounted) setCategories(items)
      } catch (e) {
        console.error('header categories load error', e)
      }
    }
    loadCats()
    return () => { mounted = false }
  }, [])

  // Cerrar dropdown idioma al hacer click fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (!langRef.current) return
      if (!langRef.current.contains(e.target)) setLangOpen(false)
    }
    if (langOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [langOpen])

  const handleLogout = async () => {
    const ok = await confirmAlert(t('alerts.logout.title'), t('alerts.logout.text'), t('alerts.logout.confirm'), t('alerts.logout.cancel'), 'warning')
    if (!ok) return
    await logout()
    router.push('/')
  }

  const isAdmin = roleId === 2

  const onSearchSubmit = (e) => {
    e.preventDefault()
    const input = e.currentTarget.querySelector('input[type="text"]')
    const val = input?.value?.trim() || ''
    router.push(val ? `/search?q=${encodeURIComponent(val)}` : '/search')
  }

  const selectLang = (l) => { setLanguage(l); setLangOpen(false) }

  // Imágenes de banderas en /public (32px)
  const FLAG_ES_32 = '/spain-flag-button-round-icon-32.png'
  const FLAG_EN_32 = '/united-states-of-america-flag-button-round-icon-32.png'

  return (
    <header className="app-header">
      {/* Loader global disponible en toda la app */}
      <GlobalLoader />
      <div className="container-narrow">
        <nav className="navbar d-flex align-items-center justify-content-between">
          <Link href="/" className="brand d-flex align-items-center" aria-label={t('header.homeAria')}>
            <img src="/nuevo_horizontal.png" alt="STL HUB" className="brand-logo" />
          </Link>

          {/* Botón flotante Explorar (desktop) */}
          <div className="explore-wrap d-none d-lg-block">
            <button type="button" className="explore-btn" aria-haspopup="true" aria-expanded="false">
              <span className="icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              {t('header.explore')}
            </button>

            <div className="mega-menu" role="menu" aria-label={t('header.explore')}>
              <div className="mega-container">
                <div className="col">
                  <div className="col-title">{t('header.categories')}</div>
                  <ul>
                    {categories.length > 0 ? (
                      categories.map((c) => (
                        <li key={c.id}>
                          <a href={`/search?categories=${encodeURIComponent(c.name)}`}>#{c.name}</a>
                        </li>
                      ))
                    ) : (
                      <>
                        <li>{t('header.loading')}</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="col">
                  <div className="col-title">{t('header.collectionsNow')}</div>
                  <ul>
                    <li>{t('header.wallHooks')}</li>
                    <li>{t('header.furniture')}</li>
                    <li>{t('header.cosplay')}</li>
                    <li>{t('header.frames')}</li>
                    <li>{t('header.halloween')}</li>
                  </ul>
                </div>

                <div className="col">
                  <div className="col-title">{t('header.tops')}</div>
                  <ul>
                    <li>{t('header.pick')}</li>
                    <li>{t('header.popularDesigns')}</li>
                    <li>{t('header.topDesigns')}</li>
                    <li>{t('header.bestSellers')}</li>
                    <li>{t('header.mostDownloaded')}</li>
                  </ul>
                </div>

                <div className="col">
                  <div className="col-title">{t('header.exploreTitle')}</div>
                  <ul>
                    <li>{t('header.exploreIdeas')}</li>
                    <li>{t('header.frequentSearches')}</li>
                    <li>{t('header.glossary')}</li>
                    <li>{t('header.trendingModels')}</li>
                    <li>{t('header.latestModels')}</li>
                    <li>{t('header.random')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Búsqueda inline solo en desktop */}
          <div className="search-inline d-none d-lg-flex flex-grow-1 px-3" role="search">
            <form className="search-form w-100" onSubmit={onSearchSubmit}>
              <input
                type="text"
                placeholder={t('header.searchPlaceholder')}
                aria-label={t('header.searchAria')}
              />
              <button type="submit" className="search-btn" aria-label={t('header.searchAria')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>

          <div className="header-cta d-flex gap-2 align-items-center">
            {token ? (
              <>
                {isAdmin ? (
                  <Button
                    as={Link}
                    href="/dashboard"
                    variant="cyan"
                    width="lg"
                    aria-label="Dashboard"
                    icon={(
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      </svg>
                    )}
                  >
                  </Button>
                ) : (
                  <Button
                    as={Link}
                    href="/account"
                    variant="cyan"
                    width="lg"
                    aria-label={t('header.account')}
                    icon={(
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M21 22a9 9 0 1 0-18 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                  >
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={handleLogout}
                  variant="dangerOutline"
                  width="lg"
                  aria-label={t('header.logout')}
                  icon={(
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M10 17l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M10 21h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  )}
                ></Button>
              </>
            ) : (
              <Button
                as={Link}
                href="/login"
                variant="purple"
                width="lg"
                aria-label={t('header.login')}
                icon={(
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M17 11V8a5 5 0 10-10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              >
                {t('header.login')}
              </Button>
            )}

            {/* Selector de idioma con imagen 32px */}
            <div ref={langRef} className={`language-dropdown ${langOpen ? 'open' : ''}`}>
              <button
                type="button"
                className={`lang-flag ${language === 'en' ? 'lang-en' : 'lang-es'}`}
                title={language === 'en' ? 'English' : 'Español'}
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                onClick={() => setLangOpen((v) => !v)}
              >
                <img
                  className="flag-img"
                  src={language === 'en' ? FLAG_EN_32 : FLAG_ES_32}
                  alt={language === 'en' ? 'English' : 'Español'}
                  width={22}
                  height={22}
                />
              </button>
              <ul className="lang-list" role="listbox">
                <li
                  role="option"
                  aria-selected={language === 'es'}
                  className={`lang lang-es ${language === 'es' ? 'selected' : ''}`}
                  onClick={() => selectLang('es')}
                  title="Español"
                >
                  <img className="flag-img" src={FLAG_ES_32} alt="Español" width={20} height={20} />
                  <span className="code">ES</span>
                </li>
                <li
                  role="option"
                  aria-selected={language === 'en'}
                  className={`lang lang-en ${language === 'en' ? 'selected' : ''}`}
                  onClick={() => selectLang('en')}
                  title="English"
                >
                  <img className="flag-img" src={FLAG_EN_32} alt="English" width={20} height={20} />
                  <span className="code">EN</span>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Búsqueda móvil (debajo), visible solo en < lg */}
        <div className="search-panel d-lg-none" role="search">
          <form className="search-form" onSubmit={onSearchSubmit}>
            <input
              type="text"
              placeholder={t('header.searchPlaceholder')}
              aria-label={t('header.searchAria')}
            />
            <button type="submit" className="search-btn" aria-label={t('header.searchAria')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}

export default Header
