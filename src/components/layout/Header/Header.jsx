'use client'

import React, { useEffect, useState, useRef } from 'react'
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

const Header = () => {
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
  const searchParams = useSearchParams()
  const http = new HttpService()
  const { t } = useI18n()

  const [categories, setCategories] = useState([])
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)
  // Nuevo: estado para abrir/cerrar Explorar (soporta mobile por click)
  const [exploreOpen, setExploreOpen] = useState(false)
  const exploreRef = useRef(null)
  // Loading local para buscador (no bloquea toda la pantalla)
  const [searchLoading, setSearchLoading] = useState(false)

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

  // Resetear spinner local al cambiar de ruta o de querystring (importante en /search)
  useEffect(() => {
    // cualquier cambio de path o de parámetros de búsqueda libera el loading
    setSearchLoading(false)
  }, [pathname, searchParams?.toString()])

  // Cerrar dropdown idioma al hacer click fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (!langRef.current) return
      if (!langRef.current.contains(e.target)) setLangOpen(false)
    }
    if (langOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
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
      const input = e.currentTarget.querySelector('input[type="text"]')
      const val = input?.value?.trim() || ''
      setSearchLoading(true)
      // await router.push para poder resetear el loading aunque la URL no cambie
      await router.push(val ? `/search?q=${encodeURIComponent(val)}` : '/search')
    } catch (err) {
      console.error('Navigation error on search submit', err)
    } finally {
      // Aseguramos que el spinner local siempre se resetea
      setSearchLoading(false)
    }
  }

  const selectLang = async (l) => {
    try {
      setLanguage(l);
      setLangOpen(false);
      // Si hay token, actualizar en backend (ruta protegida)
      if (token) {
        // axiosInstance ya tiene interceptor con token
        
        console.log('Language updated on server');
        await http.patchData('/me/language', '', { language: l });
      }
    } catch (e) {
      console.error('Error updating language on server', e);
      // No revertimos el cambio en UI; opcional: mostrar mensaje
    }
  }

  // Imágenes de banderas en /public (32px)
  const FLAG_ES_32 = '/spain-flag-button-round-icon-32.png'
  const FLAG_EN_32 = '/united-states-of-america-flag-button-round-icon-32.png'

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
      {/* Eliminado loader global del layout */}
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
              <button type="submit" className="search-btn" aria-label={t('header.searchAria')} disabled={searchLoading}>
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
                        as={Link} href="/account" 
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
            <button type="submit" className="search-btn" aria-label={t('header.searchAria')} disabled={searchLoading}>
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
