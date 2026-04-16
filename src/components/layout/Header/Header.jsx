'use client'

import React, { useEffect, useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import './Header.scss'
import Button from '../Buttons/Button'
import axiosInstance from '../../../services/AxiosInterceptor';
import useStore from '../../../store/useStore'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { confirmAlert } from '../../../helpers/alerts'
import HttpService from '../../../services/HttpService'
// import GlobalLoader from '../../common/GlobalLoader/GlobalLoader'
import { useI18n } from '../../../i18n'

/**
 * Inner component that safely reads useSearchParams inside Suspense.
 * Resets the search loading state when pathname/searchParams change.
 */
function SearchParamsWatcher({ onReset }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    onReset({
      isAiSearch: String(searchParams?.get('is_ai_search') || '').toLowerCase() === 'true'
    })
  }, [pathname, searchParams?.toString()])

  return null
}

const Header = () => {
  const SEARCH_MODE_STORAGE_KEY = 'stlhub:header-search-mode:v1'
  const token = useStore((s) => s.token)
  const roleId = useStore((s) => s.roleId)
  const logout = useStore((s) => s.logout)
  const language = useStore((s) => s.language)
  const [profile, setProfile] = React.useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const profileMenuRef = useRef(null);
  const isEn = String(language || 'es').toLowerCase() === 'en';


  // Cargar perfil solo si hay token
  React.useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        if (token) {
          const res = await axiosInstance.get('/me/profile');
          if (mounted) setProfile(res.data);
        } else {
          setProfile(null);
        }
      } catch (e) {
        setProfile(null);
      }
    }
    loadProfile();
    return () => { mounted = false };
  }, [token]);

  // Cerrar el menú al hacer click fuera
  React.useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);
  const setLanguage = useStore((s) => s.setLanguage)
  const router = useRouter()
  const pathname = usePathname()
  const http = new HttpService()
  const { t } = useI18n()

  const [categories, setCategories] = useState([])
  const [megaMenuLoaded, setMegaMenuLoaded] = useState(false)
  const [mostDownloadedItems, setMostDownloadedItems] = useState([])
  const [seasonalCollections, setSeasonalCollections] = useState([])
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)
  // Nuevo: estado para abrir/cerrar Explorar (soporta mobile por click)
  const [exploreOpen, setExploreOpen] = useState(false)
  const exploreRef = useRef(null)
  // Loading local para buscador (no bloquea toda la pantalla)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchMode, setSearchMode] = useState('normal')
  const [aiVisualSearching, setAiVisualSearching] = useState(false)
  const aiVisualTimerRef = useRef(null)
  const isSearchBusy = searchLoading || aiVisualSearching

  useEffect(() => {
    let mounted = true
    const loadMegaMenu = async () => {
      try {
        const res = await http.getData('/assets/menu/mega')
        const nextCategories = Array.isArray(res?.data?.categories) ? res.data.categories : []
        const nextMostDownloaded = Array.isArray(res?.data?.mostDownloaded) ? res.data.mostDownloaded : []
        const nextSeasonalCollections = Array.isArray(res?.data?.seasonalCollections)
          ? res.data.seasonalCollections
          : []
        if (!mounted) return
        setCategories(nextCategories)
        setMostDownloadedItems(nextMostDownloaded)
        setSeasonalCollections(nextSeasonalCollections)
      } catch (e) {
        console.error('header mega menu load error', e)
      } finally {
        if (mounted) setMegaMenuLoaded(true)
      }
    }
    loadMegaMenu()
    return () => { mounted = false }
  }, [])

  // Restaurar modo del buscador desde storage (persistencia entre rutas).
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const savedMode = String(window.localStorage.getItem(SEARCH_MODE_STORAGE_KEY) || '').toLowerCase()
      if (savedMode === 'ai' || savedMode === 'normal') {
        setSearchMode(savedMode)
      }
    } catch {
      // noop
    }
  }, [])

  // Persistir modo elegido por el usuario.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      window.localStorage.setItem(SEARCH_MODE_STORAGE_KEY, searchMode)
    } catch {
      // noop
    }
  }, [searchMode])

  // Si la URL pide búsqueda IA, ese estado tiene prioridad sobre storage.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      const isAiFromUrl = String(params.get('is_ai_search') || '').toLowerCase() === 'true'
      if (isAiFromUrl) setSearchMode('ai')
    } catch {
      // noop
    }
  }, [pathname])
  // Cerrar dropdown idioma al hacer click fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (!langRef.current) return
      if (!langRef.current.contains(e.target)) setLangOpen(false)
    }
    if (langOpen) document.addEventListener('mousedown', onDocClick)
    return () => { document.removeEventListener('mousedown', onDocClick) }
  }, [langOpen])

  // Cerrar Explorar al hacer click fuera o presionar Escape
  useEffect(() => {
    const onDocClick = (e) => {
      if (!exploreRef.current) return
      if (!exploreRef.current.contains(e.target)) setExploreOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setExploreOpen(false) }
    if (exploreOpen) {
      document.addEventListener('mousedown', onDocClick)
      document.addEventListener('keydown', onKey)
    }
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [exploreOpen])

  const handleLogout = async () => {
    const ok = await confirmAlert(t('alerts.logout.title'), t('alerts.logout.text'), t('alerts.logout.confirm'), t('alerts.logout.cancel'), 'warning')
    if (!ok) return
    await logout()
    router.push('/')
  }

  const isAdmin = roleId === 2

  const onSearchSubmit = async (e) => {
    try {
      e.preventDefault()
      if (isSearchBusy) return
      const input = e.currentTarget.querySelector('input[type="text"]')
      const val = input?.value?.trim() || ''
      if (searchMode === 'ai') {
        if (aiVisualTimerRef.current) clearTimeout(aiVisualTimerRef.current)
        setAiVisualSearching(true)
        aiVisualTimerRef.current = setTimeout(() => {
          setAiVisualSearching(false)
          aiVisualTimerRef.current = null
        }, 4000)

        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(SEARCH_MODE_STORAGE_KEY, 'ai')
          }
        } catch {
          // noop
        }
        
        // Navegación para búsqueda IA
        let url = val ? `/search?q=${encodeURIComponent(val)}` : '/search';
        url += (url.includes('?') ? '&' : '?') + 'is_ai_search=true';
        await router.push(url)
        return
      }
      setSearchLoading(true)
      // await router.push para poder resetear el loading aunque la URL no cambie
      let url = val ? `/search?q=${encodeURIComponent(val)}` : '/search';
      await router.push(url)
    } catch (err) {
      console.error('Navigation error on search submit', err)
    } finally {
      // Aseguramos que el spinner local siempre se resetea
      setSearchLoading(false)
    }
  }

  const normalSearchTitle = isEn ? 'Normal search' : 'Búsqueda normal'
  const aiSearchTitle = isEn ? 'AI search' : 'Búsqueda con IA'
  const normalModeLabel = isEn ? 'Normal' : 'Normal'
  const aiModeLabel = 'IA'
  const accountHref = isEn ? '/en/account' : '/account'
  const searchModeTitle = isEn ? 'Search mode' : 'Modo de búsqueda'
  const searchPlaceholder = searchMode === 'ai'
    ? (isEn 
      ? 'Ex: scene with carnivorous dinosaurs hunting...'
      : 'Ej: escena con dinosaurios carnívoros...')
    : t('header.searchPlaceholder');

  useEffect(() => {
    return () => {
      if (aiVisualTimerRef.current) clearTimeout(aiVisualTimerRef.current)
    }
  }, [])

  const selectLang = async (l) => {
    try {
      setLanguage(l);
      setLangOpen(false);

      // Navegar a la URL del idioma correcto
      const isEnTarget = l === 'en';
      let targetPath = pathname || '/';

      if (isEnTarget) {
        // Si no está ya en /en/*, añadir prefijo
        if (!targetPath.startsWith('/en')) {
          targetPath = '/en' + (targetPath === '/' ? '' : targetPath);
        }
      } else {
        // Si está en /en/*, quitar el prefijo
        if (targetPath.startsWith('/en/')) {
          targetPath = targetPath.slice(3); // quita "/en"
        } else if (targetPath === '/en') {
          targetPath = '/';
        }
      }

      router.push(targetPath);

      // Si hay token, actualizar en backend
      if (token) {
        await http.patchData('/me/language', '', { language: l }).catch(() => {});
      }
    } catch (e) {
      console.error('Error updating language', e);
    }
  }

  // Imágenes de banderas en /public (32px)
  const FLAG_ES_32 = '/spain-flag-button-round-icon-32.png'
  const FLAG_EN_32 = '/united-states-of-america-flag-button-round-icon-32.png'
  const whatsappNumber = '573132588093'
  const whatsappMessage = isEn
    ? 'Hello, I am contacting you from stl-hub.com and I would like more information.'
    : 'Hola, te contacto desde stl-hub.com y quiero mas informacion.'
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`

  const SpinnerMini = () => (
    <div className="sk-circle" style={{ width: 16, height: 16 }}>
      <div className="sk-circle1 sk-child"></div>
      <div className="sk-circle2 sk-child"></div>
      <div className="sk-circle3 sk-child"></div>
      <div className="sk-circle4 sk-child"></div>
      <div className="sk-circle5 sk-child"></div>
      <div className="sk-circle6 sk-child"></div>
      <div className="sk-circle7 sk-child"></div>
      <div className="sk-circle8 sk-child"></div>
      <div className="sk-circle9 sk-child"></div>
      <div className="sk-circle10 sk-child"></div>
      <div className="sk-circle11 sk-child"></div>
      <div className="sk-circle12 sk-child"></div>
    </div>
  )


  return (
    <header className="app-header">
      {/* Suspense boundary for useSearchParams — required for static pre-rendering */}
      <Suspense fallback={null}>
        <SearchParamsWatcher
          onReset={({ isAiSearch } = {}) => {
            setSearchLoading(false)
            if (isAiSearch) setSearchMode('ai')
          }}
        />
      </Suspense>
      <div className="container-narrow">
        <nav className="navbar d-flex align-items-center justify-content-between">
          <Link
            href="/"
            className="brand d-flex align-items-center"
            aria-label={t('header.homeAria')}
          >
            <img
              src="/nuevo_horizontal.png"
              alt="STL HUB"
              className="brand-logo"
              onClick={(e) => {
                // Defensa extra: si por algún motivo el Link no navega (overlay/captura), forzamos home.
                // No hacemos preventDefault para no romper el comportamiento normal del Link.
                try { router.push('/') } catch {}
              }}
            />
          </Link>

          {/* Botón Explorar (desktop + mobile) */}
          <div ref={exploreRef} className={`explore-wrap ${exploreOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="explore-btn"
              aria-haspopup="true"
              aria-expanded={exploreOpen}
              onClick={() => setExploreOpen((v) => !v)}
            >
              <span className="icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              {t('header.explore')}
            </button>

            <div className="mega-menu" role="menu" aria-label={t('header.explore')}>
              <div className="mega-container">
                <div className="col col-categories">
                  <div className="col-title">{t('header.categories')}</div>
                  <ul>
                    {categories.length > 0 ? (
                      categories.map((c) => {

                        const name = isEn && c.nameEn ? c.nameEn : c.name;
                        const dinamycHref = `/search?categories=${encodeURIComponent(name)}`;

                        return (
                            <li key={c.id}>
                                <a
                                    href={dinamycHref}
                                    onClick={() => setExploreOpen(false)}
                                >
                                    {isEn ? `${c.nameEn}` : `${c.name}`}
                                </a>
                            </li>
                        );
                      })
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
                    {megaMenuLoaded ? (
                      <>
                        <li className={mostDownloadedItems.length ? '' : 'is-empty'}>
                          <a
                            href={(isEn ? '/en/search' : '/search') + '?order=downloads'}
                            onClick={() => setExploreOpen(false)}
                          >
                            {t('header.mostDownloaded')}
                          </a>
                        </li>
                        {seasonalCollections.slice(0, 6).map((it, idx) => {
                          const label = isEn
                            ? (it?.labelEn || it?.labelEs || it?.slug || '')
                            : (it?.labelEs || it?.labelEn || it?.slug || '');
                          const query = encodeURIComponent(label);
                          const href = `${isEn ? '/en/search' : '/search'}?q=${query}&is_ai_search=true`;

                          return (
                            <li key={`${it?.slug || 'seasonal'}-${idx}`}>
                              <a
                                href={href}
                                onClick={() => setExploreOpen(false)}
                              >
                                {label}
                              </a>
                            </li>
                          );
                        })}
                      </>
                    ) : (
                      <li>{t('header.loading')}</li>
                    )}
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
            <form className={`search-form w-100 ${searchMode === 'ai' ? 'ai-mode' : ''} ${aiVisualSearching ? 'ai-searching' : ''}`} onSubmit={onSearchSubmit}>
              <div className="search-mode-toggle" role="group" aria-label={searchModeTitle}>
                <button
                  type="button"
                  className={`mode-btn ${searchMode === 'normal' ? 'active' : ''}`}
                  aria-pressed={searchMode === 'normal'}
                  title={normalSearchTitle}
                  disabled={isSearchBusy}
                  onClick={() => setSearchMode('normal')}
                >
                  {normalModeLabel}
                </button>
                <button
                  type="button"
                  className={`mode-btn mode-btn-ai ${searchMode === 'ai' ? 'active' : ''}`}
                  aria-pressed={searchMode === 'ai'}
                  title={aiSearchTitle}
                  disabled={isSearchBusy}
                  onClick={() => setSearchMode('ai')}
                >
                  {aiModeLabel}
                </button>
              </div>
              <input
                type="text"
                placeholder={searchPlaceholder}
                aria-label={t('header.searchAria')}
              />
              <button
                type="submit"
                className="search-btn"
                aria-label={t('header.searchAria')}
                title={searchMode === 'ai' ? aiSearchTitle : normalSearchTitle}
                disabled={isSearchBusy}
              >
                {searchLoading ? (
                  <SpinnerMini />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </form>
          </div>

          <div className="header-cta d-flex gap-2 align-items-center">


            {token && (
              <div ref={profileMenuRef} className="profile-menu-wrap">
                <button
                  type="button"
                  className="profile-circle-btn"
                  aria-haspopup="true"
                  aria-expanded={profileMenuOpen}
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  title={profile?.email || 'Usuario'}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="8" r="4" stroke="#b59cff" strokeWidth="2"/>
                    <path d="M4 20c0-2.5 3.5-4.5 8-4.5s8 2 8 4.5" stroke="#b59cff" strokeWidth="2"/>
                  </svg>
                </button>
                {profileMenuOpen && (
                  <div className="profile-dropdown-menu">
                    <div className="profile-dropdown-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#b59cff" strokeWidth="2"/><path d="M4 20c0-2.5 3.5-4.5 8-4.5s8 2 8 4.5" stroke="#b59cff" strokeWidth="2"/></svg>
                      {profile?.email || 'Usuario'}
                    </div>
                    <div className="profile-dropdown-actions">
                      
                      
                      <Button 
                        styles={{width: '100%'}} 
                        as={Link} href={accountHref} 
                        variant="cyan" 
                        width="lg" 
                        aria-label={t('header.account')} 
                        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke="currentColor" strokeWidth="2"/><path d="M21 22a9 9 0 1 0-18 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>} >
                          {isEn ? 'My profile' : 'Mi perfil'}
                        </Button>

                        {isAdmin && (
                          <Button
                              styles={{width: '100%'}}
                            as={Link} href="/dashboard" variant="cyan" aria-label="Dashboard" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>} >
                              {isEn ? 'Dashboard' : 'Panel'}
                            </Button>
                          )}

                          <Button styles={{width: '100%'}} type="button" onClick={handleLogout} variant="dangerOutline" width="lg" aria-label={t('header.logout')} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 17l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M10 21h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>} >{t('header.logout')}</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!token && (
              <Button
                as={Link}
                href="/login"
                variant="purple"
                width="lg"
                aria-label={t('header.login')}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M17 11V8a5 5 0 10-10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/></svg>}
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
              {langOpen && (
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
              )}
            </div>

  <a
              href={whatsappHref}
              className="whatsapp-cta"
              target="_blank"
              rel="noopener noreferrer"
              title={isEn ? 'Contact on WhatsApp' : 'Contactar por WhatsApp'}
              aria-label={isEn ? 'Contact on WhatsApp' : 'Contactar por WhatsApp'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 258" aria-hidden="true">
                <defs>
                  <linearGradient id="SVGK3KZq49U" x1="50%" x2="50%" y1="100%" y2="0%">
                    <stop offset="0%" stopColor="#1faf38"/>
                    <stop offset="100%" stopColor="#60d669"/>
                  </linearGradient>
                  <linearGradient id="SVGefMkoEOd" x1="50%" x2="50%" y1="100%" y2="0%">
                    <stop offset="0%" stopColor="#f9f9f9"/>
                    <stop offset="100%" stopColor="#fff"/>
                  </linearGradient>
                </defs>
                <path fill="url(#SVGK3KZq49U)" d="M5.463 127.456c-.006 21.677 5.658 42.843 16.428 61.499L4.433 252.697l65.232-17.104a123 123 0 0 0 58.8 14.97h.054c67.815 0 123.018-55.183 123.047-123.01c.013-32.867-12.775-63.773-36.009-87.025c-23.23-23.25-54.125-36.061-87.043-36.076c-67.823 0-123.022 55.18-123.05 123.004"/>
                <path fill="url(#SVGefMkoEOd)" d="M1.07 127.416c-.007 22.457 5.86 44.38 17.014 63.704L0 257.147l67.571-17.717c18.618 10.151 39.58 15.503 60.91 15.511h.055c70.248 0 127.434-57.168 127.464-127.423c.012-34.048-13.236-66.065-37.3-90.15C194.633 13.286 162.633.014 128.536 0C58.276 0 1.099 57.16 1.071 127.416m40.24 60.376l-2.523-4.005c-10.606-16.864-16.204-36.352-16.196-56.363C22.614 69.029 70.138 21.52 128.576 21.52c28.3.012 54.896 11.044 74.9 31.06c20.003 20.018 31.01 46.628 31.003 74.93c-.026 58.395-47.551 105.91-105.943 105.91h-.042c-19.013-.01-37.66-5.116-53.922-14.765l-3.87-2.295l-40.098 10.513z"/>
                <path fill="#fff" d="M96.678 74.148c-2.386-5.303-4.897-5.41-7.166-5.503c-1.858-.08-3.982-.074-6.104-.074c-2.124 0-5.575.799-8.492 3.984c-2.92 3.188-11.148 10.892-11.148 26.561s11.413 30.813 13.004 32.94c1.593 2.123 22.033 35.307 54.405 48.073c26.904 10.609 32.379 8.499 38.218 7.967c5.84-.53 18.844-7.702 21.497-15.139c2.655-7.436 2.655-13.81 1.859-15.142c-.796-1.327-2.92-2.124-6.105-3.716s-18.844-9.298-21.763-10.361c-2.92-1.062-5.043-1.592-7.167 1.597c-2.124 3.184-8.223 10.356-10.082 12.48c-1.857 2.129-3.716 2.394-6.9.801c-3.187-1.598-13.444-4.957-25.613-15.806c-9.468-8.442-15.86-18.867-17.718-22.056c-1.858-3.184-.199-4.91 1.398-6.497c1.431-1.427 3.186-3.719 4.78-5.578c1.588-1.86 2.118-3.187 3.18-5.311c1.063-2.126.531-3.986-.264-5.579c-.798-1.593-6.987-17.343-9.819-23.64"/>
              </svg>
            </a>

          </div>
        </nav>

        {/* Búsqueda móvil (debajo), visible solo en < lg */}
        <div className="search-panel d-lg-none" role="search">
          <form className={`search-form ${searchMode === 'ai' ? 'ai-mode' : ''} ${aiVisualSearching ? 'ai-searching' : ''}`} onSubmit={onSearchSubmit}>
            <div className="search-mode-toggle" role="group" aria-label={searchModeTitle}>
              <button
                type="button"
                className={`mode-btn ${searchMode === 'normal' ? 'active' : ''}`}
                aria-pressed={searchMode === 'normal'}
                title={normalSearchTitle}
                disabled={isSearchBusy}
                onClick={() => setSearchMode('normal')}
              >
                {normalModeLabel}
              </button>
              <button
                type="button"
                className={`mode-btn mode-btn-ai ${searchMode === 'ai' ? 'active' : ''}`}
                aria-pressed={searchMode === 'ai'}
                title={aiSearchTitle}
                disabled={isSearchBusy}
                onClick={() => setSearchMode('ai')}
              >
                {aiModeLabel}
              </button>
            </div>
            <input
              type="text"
              placeholder={searchPlaceholder}
              aria-label={t('header.searchAria')}
            />
            <button
              type="submit"
              className="search-btn"
              aria-label={t('header.searchAria')}
              title={searchMode === 'ai' ? aiSearchTitle : normalSearchTitle}
              disabled={isSearchBusy}
            >
              {searchLoading ? (
                <SpinnerMini />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}

export default Header
