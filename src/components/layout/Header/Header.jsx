'use client'

import React, { useEffect, useState, useRef, Suspense, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Tooltip from '@mui/material/Tooltip'
import './Header.scss'
import Button from '../Buttons/Button'
import axiosInstance from '../../../services/AxiosInterceptor';
import useStore from '../../../store/useStore'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { confirmAlert } from '../../../helpers/alerts'
import HttpService from '../../../services/HttpService'
// import GlobalLoader from '../../common/GlobalLoader/GlobalLoader'
import { useI18n } from '../../../i18n'
import useResolvedLanguage from '../../../hooks/useResolvedLanguage'
import { sendGTMEvent } from '@next/third-parties/google'

/**
 * Inner component that safely reads useSearchParams inside Suspense.
 * Resets the search loading state when pathname/searchParams change.
 */
function SearchParamsWatcher({ onReset }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    onReset()
  }, [pathname, searchParams?.toString()])

  return null
}

const Header = () => {
  // (storage key removed — searchMode is ephemeral state only)
  const token = useStore((s) => s.token)
  const roleId = useStore((s) => s.roleId)
  const logout = useStore((s) => s.logout)
  const resolvedLanguage = useResolvedLanguage()
  const language = resolvedLanguage
  const setImageSearchResults = useStore((s) => s.setImageSearchResults)
  const [profile, setProfile] = React.useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const profileMenuRef = useRef(null);
  const isEn = resolvedLanguage === 'en';


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
  const [seasonalCollections, setSeasonalCollections] = useState([])
  const [megaStats, setMegaStats] = useState({ totalAssets: 0, totalSizeBytes: 0 })
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef(null)
  const [exploreOpen, setExploreOpen] = useState(false)
  const exploreRef = useRef(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchMode, setSearchMode] = useState('normal')
  const [aiVisualSearching, setAiVisualSearching] = useState(false)
  const aiVisualTimerRef = useRef(null)
  const [imageSearchFile, setImageSearchFile] = useState(null)
  const [imageSearchPreview, setImageSearchPreview] = useState('')
  const [imageDragActive, setImageDragActive] = useState(false)
  const [globalDragActive, setGlobalDragActive] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [headerHidden, setHeaderHidden] = useState(false)
  const [aiDropzoneOpen, setAiDropzoneOpen] = useState(false)
  const [aiRingsVisible, setAiRingsVisible] = useState(false)
  const lastScrollY = useRef(0)
  const headerRef = useRef(null)

  const onDropGlobal = useCallback((acceptedFiles) => {
    const file = acceptedFiles?.[0];
    if (file && file.type.startsWith('image/')) {
      setSearchMode('ai');
      handleImageFile(file);
    }
  }, []);

  useEffect(() => {
    let dragCounter = 0;
    const onEnter = (e) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) setGlobalDragActive(true);
    };
    const onOver = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    };
    const onLeave = () => {
      dragCounter--;
      if (dragCounter <= 0) { dragCounter = 0; setGlobalDragActive(false); }
    };
    const onDrop = (e) => {
      e.preventDefault();
      dragCounter = 0;
      setGlobalDragActive(false);
    };
    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragover', onOver);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragover', onOver);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, []);
  const imagePickerRef = useRef(null)
  const isSearchBusy = searchLoading || aiVisualSearching

  useEffect(() => {
    let mounted = true
    const loadMegaMenu = async () => {
      try {
        const res = await http.getData('/assets/menu/mega')
        const nextCategories = Array.isArray(res?.data?.categories) ? res.data.categories : []
        const nextSeasonalCollections = Array.isArray(res?.data?.seasonalCollections)
          ? res.data.seasonalCollections
          : []
        if (!mounted) return
        setCategories(nextCategories)
        setSeasonalCollections(nextSeasonalCollections)
        setMegaStats({
          totalAssets: Number(res?.data?.totalAssets || 0),
          totalSizeBytes: Number(res?.data?.totalSizeBytes || 0),
          weeklyAssets: Number(res?.data?.weeklyAssets || 0),
        })
      } catch (e) {
        console.error('header mega menu load error', e)
      } finally {
        if (mounted) setMegaMenuLoaded(true)
      }
    }
    loadMegaMenu()
    return () => { mounted = false }
  }, [token])

  // Limpiar estados de búsqueda al cambiar de ruta (la nueva página ya cargó)
  useEffect(() => {
    setSearchLoading(false)
    setAiVisualSearching(false)
    if (aiVisualTimerRef.current) {
      clearTimeout(aiVisualTimerRef.current)
      aiVisualTimerRef.current = null
    }
  }, [pathname])

  // Limpiar imagen al salir de modo IA
  useEffect(() => {
    if (searchMode !== 'ai') {
      setImageSearchFile(null)
      setImageSearchPreview('')
      setImageDragActive(false)
      setAiDropzoneOpen(false)
      setAiRingsVisible(false)
    } else {
      setAiDropzoneOpen(true)
      setAiRingsVisible(true)
      const timer = setTimeout(() => setAiRingsVisible(false), 800)
      return () => clearTimeout(timer)
    }
  }, [searchMode])

  // Auto-hide header on scroll — uses capture to catch scroll on ANY container
  useEffect(() => {
    const onScroll = (e) => {
      // Read scroll position from whichever element is actually scrolling
      const target = e.target === document ? document.documentElement : e.target
      const currentScrollY = target.scrollTop ?? window.scrollY ?? 0

      if (currentScrollY <= 0) {
        if (headerRef.current) headerRef.current.style.top = '0px'
        lastScrollY.current = 0
        return
      }

      const diff = currentScrollY - lastScrollY.current

      if (diff > 5 && currentScrollY > 60) {
        if (headerRef.current) {
          const h = headerRef.current.offsetHeight || 120
          headerRef.current.style.top = `-${h + 10}px`
        }
        lastScrollY.current = currentScrollY
      } else if (diff < -5) {
        if (headerRef.current) headerRef.current.style.top = '0px'
        lastScrollY.current = currentScrollY
      }
    }

    // capture: true intercepts scroll events from ANY element (scroll doesn't bubble)
    document.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])
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

      if (val || imageSearchFile) {
        sendGTMEvent({ event: 'search_performed',
          search_term: val || 'image_search',
          search_type: searchMode
        });
      }

      if (searchMode === 'ai') {
        if (aiVisualTimerRef.current) clearTimeout(aiVisualTimerRef.current)
        setAiVisualSearching(true)
        aiVisualTimerRef.current = setTimeout(() => {
          setAiVisualSearching(false)
          aiVisualTimerRef.current = null
        }, 8000)

        // Si hay imagen cargada, hacer búsqueda visual por API
        if (imageSearchFile) {
          try {
            const formData = new FormData()
            formData.append('image', imageSearchFile)
            if (val) formData.append('text', val)
            formData.append('limit', '200')

            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'
            const res = await fetch(`${apiBase}/api/ai/search-by-image`, {
              method: 'POST',
              body: formData,
            })
            const data = await res.json()

            if (res.ok && Array.isArray(data?.items)) {
              // Store results in Zustand for the search page
              setImageSearchResults({
                items: data.items,
                total: data.total || data.items.length,
                query: val || imageSearchFile.name,
              })
              // 1-second delay for elegance so the user sees the animation and success state
              await new Promise(r => setTimeout(r, 1000))
              
              // Close dropzone without flipping searchMode (avoids re-animation jump)
              setAiDropzoneOpen(false)
              let url = `/search?image_search=true`
              if (val) url += `&q=${encodeURIComponent(val)}`
              router.push(url)
            } else {
              console.error('Image search error:', data?.message)
              // Fallback to text AI search
              let url = val ? `/search?q=${encodeURIComponent(val)}` : '/search'
              url += (url.includes('?') ? '&' : '?') + 'is_ai_search=true'
              router.push(url)
            }
          } catch (fetchErr) {
            console.error('Image search fetch error:', fetchErr)
            let url = val ? `/search?q=${encodeURIComponent(val)}` : '/search'
            url += (url.includes('?') ? '&' : '?') + 'is_ai_search=true'
            router.push(url)
          }
          return
        }
        
        // Navegación para búsqueda IA (solo texto)
        setAiDropzoneOpen(false)
        let url = val ? `/search?q=${encodeURIComponent(val)}` : '/search';
        url += (url.includes('?') ? '&' : '?') + 'is_ai_search=true';
        router.push(url)
        return
      }
      setSearchLoading(true)
      let url = val ? `/search?q=${encodeURIComponent(val)}` : '/search';
      router.push(url)
    } catch (err) {
      console.error('Navigation error on search submit', err)
      setSearchLoading(false)
      setAiVisualSearching(false)
      if (aiVisualTimerRef.current) {
        clearTimeout(aiVisualTimerRef.current)
        aiVisualTimerRef.current = null
      }
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

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageSearchFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImageSearchPreview(ev.target?.result || '')
    reader.readAsDataURL(file)
  }

  const handleImageDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setImageDragActive(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleImageFile(file)
  }

  const handleImagePick = (e) => {
    const file = e.target?.files?.[0]
    if (file) handleImageFile(file)
    if (e.target) e.target.value = ''
  }

  const handleImageRemove = () => {
    setImageSearchFile(null)
    setImageSearchPreview('')
  }

  const imageDropzoneElement = useMemo(() => (
    <div
      className={`ai-image-dropzone ${imageDragActive ? 'drag-active' : ''} ${imageSearchPreview ? 'has-image' : ''}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setImageDragActive(true) }}
      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setImageDragActive(false) }}
      onDrop={handleImageDrop}
      onClick={() => !imageSearchPreview && imagePickerRef.current?.click()}
    >
      <button
        type="button"
        className="dropzone-close"
        onClick={(e) => { e.stopPropagation(); setAiDropzoneOpen(false) }}
        aria-label="Close"
      >✕</button>
      <input ref={imagePickerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />
      {!imageSearchPreview ? (
        <div className="dropzone-content">
          <div className="dropzone-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="dropzone-text">
            <span className="dropzone-title">{isEn ? 'Search by image' : 'Busca por imagen'}</span>
            <span className="dropzone-subtitle">
              {isEn ? 'Drag here or ' : 'Arrastra aquí o '}
              <button type="button" className="browse-link" onClick={(e) => { e.stopPropagation(); imagePickerRef.current?.click() }}>
                {isEn ? 'browse' : 'examinar'}
              </button>
            </span>
          </div>
        </div>
      ) : (
        <div className="ai-image-preview">
          <img src={imageSearchPreview} alt="preview" />
          <div className="preview-info">
            <span className="preview-name">{imageSearchFile?.name}</span>
            <span className="preview-size">{((imageSearchFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
          <span className="preview-badge">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
            {isEn ? 'Visual AI' : 'IA Visual'}
          </span>
          <button type="button" className="preview-remove" onClick={(e) => { e.stopPropagation(); handleImageRemove() }} aria-label="Remove">✕</button>
        </div>
      )}
    </div>
  ), [imageDragActive, imageSearchPreview, imageSearchFile, isEn])

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
    <>
      <div
          {...{
            onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); },
            onDrop: (e) => {
              e.preventDefault();
              e.stopPropagation();
              setGlobalDragActive(false);
              const file = e.dataTransfer?.files?.[0];
              if (file && file.type.startsWith('image/')) {
                onDropGlobal([file]);
              }
            },
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            transition: 'opacity 0.2s ease',
            opacity: globalDragActive ? 1 : 0,
            pointerEvents: globalDragActive ? 'all' : 'none',
          }}
        >
          <div style={{
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            border: '3px dashed rgba(255, 75, 130, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '32px',
            background: 'radial-gradient(circle, rgba(255, 75, 130, 0.08) 0%, transparent 70%)',
            animation: globalDragActive ? 'globalDropPulse 2s ease-in-out infinite' : 'none',
          }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#ff4b82', filter: 'drop-shadow(0 0 20px rgba(255, 75, 130, 0.5))' }}>
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', textShadow: '0 4px 20px rgba(0,0,0,0.8)', letterSpacing: '-0.02em' }}>
            {isEn ? 'Drop your image here' : 'Suelta tu imagen aqu\u00ed'}
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.55)', fontWeight: 500, margin: 0 }}>
            {isEn ? 'AI Multimodal Search will start automatically' : 'La B\u00fasqueda Multimodal (IA) se activar\u00e1 autom\u00e1ticamente'}
          </p>
          <style>{`@keyframes globalDropPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.85; } }`}</style>
        </div>
      <header ref={headerRef} className="app-header">
      {/* Suspense boundary for useSearchParams — required for static pre-rendering */}
      <Suspense fallback={null}>
        <SearchParamsWatcher
          onReset={() => {
            setSearchLoading(false)
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

          {/* Botón Explorar (solo desktop) */}
          <div ref={exploreRef} className={`explore-wrap desktop-only ${exploreOpen ? 'open' : ''}`}>
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

            {exploreOpen && (
              <div
                className="mega-backdrop"
                onClick={() => setExploreOpen(false)}
              />
            )}
            <div className="mega-menu" role="menu" aria-label={t('header.explore')}>
              {/* Stats ribbon */}
              {megaStats.totalAssets > 0 && (
                <div className="mega-stats-bar">
                  <div className="mega-stat">
                    <span className="mega-stat-icon">✨</span>
                    <span className="mega-stat-value">{(megaStats.totalAssets * 2).toLocaleString()}+</span>
                    <span className="mega-stat-label">{isEn ? 'Premium Assets' : 'Assets Premium'}</span>
                  </div>
                  <div className="mega-stat-divider" />
                  <div className="mega-stat">
                    <span className="mega-stat-icon">📦</span>
                    <span className="mega-stat-value">
                      {(() => {
                        const bytes = megaStats.totalSizeBytes * 3;
                        if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
                        if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(0)} GB`;
                        return `${(bytes / 1e6).toFixed(0)} MB`;
                      })()}
                    </span>
                    <span className="mega-stat-label">{isEn ? 'of 3D Models' : 'en Modelos 3D'}</span>
                  </div>
                  <div className="mega-stat-divider" />
                  <div className="mega-stat">
                    <span className="mega-stat-icon">🎯</span>
                    <span className="mega-stat-value">{categories.length}+</span>
                    <span className="mega-stat-label">{isEn ? 'Categories' : 'Categorías'}</span>
                  </div>
                  {megaStats.totalAssets > 0 && (
                    <>
                      <div className="mega-stat-divider" />
                      <div className="mega-stat">
                        <span className="mega-stat-icon mega-stat-arrow">↑</span>
                        <span className="mega-stat-value mega-stat-green">{(Math.max(100, megaStats.weeklyAssets) * 2).toLocaleString()}</span>
                        <span className="mega-stat-label">{isEn ? 'New This Week' : 'Nuevos Esta Semana'}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="mega-container">
                {/* ── Zone 1: Categories with icons ── */}
                <div className="mega-zone mega-zone-categories">
                  <div className="mega-zone-title">{t('header.categories')}</div>
                  {!token && (
                    <a href="/login" className="nsfw-catalog-notice">
                      <span className="nsfw-notice-icon">🔒</span>
                      <span>{isEn ? 'Log in to see the full catalog' : 'Inicia sesión para ver el catálogo completo'}</span>
                    </a>
                  )}
                  <div className="mega-cat-grid">
                    {categories.length > 0 ? (
                      categories.map((c) => {
                        const raw = isEn && c.nameEn ? c.nameEn : c.name;
                        const href = `/search?categories=${encodeURIComponent(raw)}`;
                        const name = String(raw || '')
                          .replace(/[_-]/g, ' ')
                          .replace(/\b\w/g, (ch) => ch.toUpperCase());
                        return (
                          <a
                            key={c.id}
                            href={href}
                            className="mega-cat-item"
                            onClick={() => {
                              sendGTMEvent({ event: 'category_viewed', category_name: raw });
                              setExploreOpen(false);
                            }}
                          >
                            <span className="mega-cat-name">{name}</span>
                          </a>
                        );
                      })
                    ) : (
                      <span className="mega-loading">{t('header.loading')}</span>
                    )}
                  </div>
                </div>

                {/* ── Zone 2: Spotlight / Featured ── */}
                <div className="mega-zone mega-zone-spotlight">
                  <div className="mega-spotlight-card">
                    <div className="spotlight-glow" />
                    <div className="spotlight-content">
                      <span className="spotlight-badge">🤖 {isEn ? 'NEW' : 'NUEVO'}</span>
                      <h4>{isEn ? 'AI-Powered Search' : 'Búsqueda con IA'}</h4>
                      <p>{isEn
                        ? 'Describe what you need or drop an image. Our AI finds the perfect model for you.'
                        : 'Describe lo que necesitas o sube una imagen. Nuestra IA encuentra el modelo perfecto.'
                      }</p>
                      <button
                        type="button"
                        className="spotlight-cta"
                        onClick={() => { setExploreOpen(false); setSearchMode('ai'); }}
                      >
                        {isEn ? 'Try it now' : 'Pruébalo ahora'} →
                      </button>
                    </div>
                  </div>

                  {/* Seasonal collections as chips */}
                  <div className="mega-seasonal">
                    <div className="mega-zone-title">{t('header.collectionsNow')}</div>
                    <div className="mega-seasonal-chips">
                      {megaMenuLoaded ? (
                        seasonalCollections.slice(0, 6).map((it, idx) => {
                          const label = isEn
                            ? (it?.labelEn || it?.labelEs || it?.slug || '')
                            : (it?.labelEs || it?.labelEn || it?.slug || '');
                          const query = encodeURIComponent(label);
                          const href = `${isEn ? '/en/search' : '/search'}?q=${query}&is_ai_search=true`;
                          return (
                            <a
                              key={`${it?.slug || 'seasonal'}-${idx}`}
                              href={href}
                              className="mega-chip"
                              onClick={() => setExploreOpen(false)}
                            >
                              {label}
                            </a>
                          );
                        })
                      ) : (
                        <span className="mega-loading">{t('header.loading')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Zone 3: Quick Access ── */}
                <div className="mega-zone mega-zone-quick">
                  <div className="mega-quick-section">
                    <div className="mega-zone-title">{t('header.tops')}</div>
                    <ul>
                      <li>
                        <a href={(isEn ? '/en/search' : '/search') + '?order=downloads'} onClick={() => setExploreOpen(false)}>
                          <span className="mega-quick-icon">🔥</span> {isEn ? 'Most downloaded' : 'Más descargados'}
                        </a>
                      </li>
                      <li>
                        <a href={isEn ? '/en/search' : '/search'} onClick={() => setExploreOpen(false)}>
                          <span className="mega-quick-icon">✨</span> {isEn ? 'Latest models' : 'Últimos modelos'}
                        </a>
                      </li>
                      <li>
                        <a href={`${isEn ? '/en/search' : '/search'}?q=${encodeURIComponent('anime')}&is_ai_search=true`} onClick={() => setExploreOpen(false)}>
                          <span className="mega-quick-icon">⚔️</span> Anime
                        </a>
                      </li>
                      <li>
                        <a href={`${isEn ? '/en/search' : '/search'}?q=${encodeURIComponent('video game')}&is_ai_search=true`} onClick={() => setExploreOpen(false)}>
                          <span className="mega-quick-icon">🎮</span> {isEn ? 'Video games' : 'Videojuegos'}
                        </a>
                      </li>
                    </ul>
                  </div>

                  <div className="mega-quick-divider" />

                  <div className="mega-quick-section">
                    <div className="mega-zone-title">{t('header.exploreTitle')}</div>
                    <ul>
                      <li>
                        <a href={`${isEn ? '/en/search' : '/search'}?randomizer=true`} onClick={() => setExploreOpen(false)}>
                          <span className="mega-quick-icon">🎲</span> Randomizer
                        </a>
                      </li>
                      <li>
                        <a href={isEn ? '/en/suscripcion' : '/suscripcion'} onClick={() => setExploreOpen(false)}>
                          <span className="mega-quick-icon">💎</span> {isEn ? 'Premium Plans' : 'Planes Premium'}
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* ── Quick Search Tags ── */}
              <div className="mega-quick-tags">
                {['Warhammer', 'Dragon Ball', 'Mandalorian', 'Cosplay', 'Pokemon', 'Marvel', 'Naruto', 'Zelda'].map((tag) => (
                  <a
                    key={tag}
                    href={`${isEn ? '/en/search' : '/search'}?q=${encodeURIComponent(tag)}&is_ai_search=true`}
                    className="mega-tag"
                    onClick={() => setExploreOpen(false)}
                  >
                    {tag}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Búsqueda inline solo en desktop */}
          <div className={`search-inline d-none d-lg-flex flex-grow-1 px-3 ${searchMode === 'ai' && aiDropzoneOpen ? 'ai-dropzone-open' : ''}`} role="search">
            <form className={`search-form w-100 ${searchMode === 'ai' ? 'ai-mode' : ''} ${aiVisualSearching || searchLoading ? 'ai-searching' : ''}`} onSubmit={onSearchSubmit}>
              {aiRingsVisible && (
                <>
                  <div className="ai-ring ai-ring-1" />
                  <div className="ai-ring ai-ring-2" />
                  <div className="ai-ring ai-ring-3" />
                </>
              )}
              <div className="search-mode-toggle" role="group" aria-label={searchModeTitle}>
                <Tooltip title={isEn ? "Standard keyword search" : "Búsqueda estándar por palabras clave"} arrow placement="bottom">
                  <button
                    type="button"
                    className={`mode-btn ${searchMode === 'normal' ? 'active' : ''}`}
                    aria-pressed={searchMode === 'normal'}
                    aria-label={normalSearchTitle}
                    disabled={isSearchBusy}
                    onClick={() => setSearchMode('normal')}
                  >
                    {normalModeLabel}
                  </button>
                </Tooltip>
                <Tooltip title={isEn ? "Semantic & image search powered by AI" : "Búsqueda semántica y visual potenciada por IA"} arrow placement="bottom">
                  <button
                    type="button"
                    className={`mode-btn mode-btn-ai ${searchMode === 'ai' ? 'active' : ''}`}
                    aria-pressed={searchMode === 'ai'}
                    aria-label={aiSearchTitle}
                    disabled={isSearchBusy}
                    onClick={() => setSearchMode('ai')}
                  >
                    {aiModeLabel}
                  </button>
                </Tooltip>
              </div>
              <input
                type="text"
                placeholder={imageSearchPreview ? (isEn ? 'Add context... (optional)' : 'Agrega contexto... (opcional)') : searchPlaceholder}
                aria-label={t('header.searchAria')}
              />
              {searchMode === 'ai' && !aiDropzoneOpen && (
                <button
                  type="button"
                  className="dropzone-toggle-btn"
                  onClick={() => setAiDropzoneOpen(true)}
                  aria-label={isEn ? 'Open image search' : 'Abrir búsqueda por imagen'}
                  title={isEn ? 'Search by image' : 'Buscar por imagen'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
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
            {searchMode === 'ai' && aiDropzoneOpen && imageDropzoneElement}
          </div>

          <div className="header-cta d-flex gap-2 align-items-center desktop-only">


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
              onClick={() => sendGTMEvent({ event: 'whatsapp_contact_clicked', source: 'header' })}
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

          {/* Hamburger button — mobile only */}
          <button
            type="button"
            className={`mobile-hamburger ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </nav>

        {/* Búsqueda móvil (debajo), visible solo en < lg */}
        <div className={`search-panel d-lg-none ${searchMode === 'ai' && aiDropzoneOpen ? 'ai-dropzone-open' : ''}`} role="search">
          <form className={`search-form ${searchMode === 'ai' ? 'ai-mode' : ''} ${aiVisualSearching || searchLoading ? 'ai-searching' : ''}`} onSubmit={onSearchSubmit}>
            <div className="search-mode-toggle" role="group" aria-label={searchModeTitle}>
              <Tooltip title={isEn ? "Standard keyword search" : "Búsqueda estándar por palabras clave"} arrow placement="bottom">
                <button
                  type="button"
                  className={`mode-btn ${searchMode === 'normal' ? 'active' : ''}`}
                  aria-pressed={searchMode === 'normal'}
                  aria-label={normalSearchTitle}
                  disabled={isSearchBusy}
                  onClick={() => setSearchMode('normal')}
                >
                  {normalModeLabel}
                </button>
              </Tooltip>
              <Tooltip title={isEn ? "Semantic & image search powered by AI" : "Búsqueda semántica y visual potenciada por IA"} arrow placement="bottom">
                <button
                  type="button"
                  className={`mode-btn mode-btn-ai ${searchMode === 'ai' ? 'active' : ''}`}
                  aria-pressed={searchMode === 'ai'}
                  aria-label={aiSearchTitle}
                  disabled={isSearchBusy}
                  onClick={() => setSearchMode('ai')}
                >
                  {aiModeLabel}
                </button>
              </Tooltip>
            </div>
            <input
              type="text"
              placeholder={imageSearchPreview ? (isEn ? 'Add context... (optional)' : 'Agrega contexto... (opcional)') : searchPlaceholder}
              aria-label={t('header.searchAria')}
            />
            {searchMode === 'ai' && !aiDropzoneOpen && (
              <button
                type="button"
                className="dropzone-toggle-btn"
                onClick={() => setAiDropzoneOpen(true)}
                aria-label={isEn ? 'Open image search' : 'Abrir búsqueda por imagen'}
                title={isEn ? 'Search by image' : 'Buscar por imagen'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="8.5" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
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
          {searchMode === 'ai' && aiDropzoneOpen && imageDropzoneElement}
        </div>
      </div>
    </header>

    {/* Mobile drawer overlay */}
    <div className={`mobile-drawer-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />
    <aside className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
      <div className="mobile-drawer-header">
        <img src="/nuevo_horizontal.png" alt="STL HUB" style={{ height: 28 }} />
        <button type="button" className="mobile-drawer-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div className="mobile-drawer-body">
        {/* Stats ribbon */}
        {megaStats.totalAssets > 0 && (
          <div className="mega-stats-bar" style={{ marginBottom: 12 }}>
            <div className="mega-stat">
              <span className="mega-stat-icon">✨</span>
              <span className="mega-stat-value">{(megaStats.totalAssets * 2).toLocaleString()}+</span>
              <span className="mega-stat-label">Assets</span>
            </div>
            <div className="mega-stat-divider" />
            <div className="mega-stat">
              <span className="mega-stat-icon">📦</span>
              <span className="mega-stat-value">
                {(() => {
                  const bytes = megaStats.totalSizeBytes * 3;
                  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
                  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(0)} GB`;
                  return `${(bytes / 1e6).toFixed(0)} MB`;
                })()}
              </span>
              <span className="mega-stat-label">3D</span>
            </div>
            <div className="mega-stat-divider" />
            <div className="mega-stat">
              <span className="mega-stat-icon">🎯</span>
              <span className="mega-stat-value">{categories.length}+</span>
              <span className="mega-stat-label">{isEn ? 'Categories' : 'Categorías'}</span>
            </div>
            <div className="mega-stat-divider" />
            <div className="mega-stat">
              <span className="mega-stat-icon mega-stat-arrow">↑</span>
              <span className="mega-stat-value mega-stat-green">{(Math.max(100, megaStats.weeklyAssets) * 2).toLocaleString()}</span>
              <span className="mega-stat-label">{isEn ? 'New This Week' : 'Nuevos'}</span>
            </div>
          </div>
        )}
        {/* AI Spotlight Card */}
        <div className="drawer-section">
          <div className="mega-spotlight-card" style={{ margin: '0 0 8px' }}>
            <div className="spotlight-glow" />
            <div className="spotlight-content">
              <span className="spotlight-badge">🤖 {isEn ? 'NEW' : 'NUEVO'}</span>
              <h4>{isEn ? 'AI-Powered Search' : 'Búsqueda con IA'}</h4>
              <p>{isEn
                ? 'Describe what you need or drop an image. Our AI finds the perfect model.'
                : 'Describe lo que necesitas o sube una imagen. Nuestra IA encuentra el modelo perfecto.'
              }</p>
              <button
                type="button"
                className="spotlight-cta"
                onClick={() => { setMobileMenuOpen(false); setSearchMode('ai'); }}
              >
                {isEn ? 'Try it now' : 'Pruébalo ahora'} →
              </button>
            </div>
          </div>
        </div>

        {/* Explorar — categories */}
        <div className="drawer-section">
          <div className="drawer-section-title">{t('header.categories')}</div>
          {!token && (
            <a href="/login" className="nsfw-catalog-notice">
              <span className="nsfw-notice-icon">🔒</span>
              <span>{isEn ? 'Log in to see the full catalog' : 'Inicia sesión para ver el catálogo completo'}</span>
            </a>
          )}
          <div className="drawer-links-grid">
            {categories.map((c) => {
              const name = isEn && c.nameEn ? c.nameEn : c.name;
              return (
                <a key={c.id} href={`/search?categories=${encodeURIComponent(name)}`} onClick={() => setMobileMenuOpen(false)}>
                  {name}
                </a>
              );
            })}
          </div>
        </div>

        <div className="drawer-section">
          <div className="drawer-section-title">{t('header.tops')}</div>
          <div className="drawer-links">
            <a href={(isEn ? '/en/search' : '/search') + '?order=downloads'} onClick={() => setMobileMenuOpen(false)}>{isEn ? 'Most downloaded' : 'Más descargados'}</a>
            <a href={isEn ? '/en/search' : '/search'} onClick={() => setMobileMenuOpen(false)}>{isEn ? 'Latest 3D models' : 'Últimos modelos 3D'}</a>
            <a href={`${isEn ? '/en/search' : '/search'}?q=${encodeURIComponent('anime')}&is_ai_search=true`} onClick={() => setMobileMenuOpen(false)}>Anime</a>
            <a href={`${isEn ? '/en/search' : '/search'}?randomizer=true`} onClick={() => setMobileMenuOpen(false)}>Randomizer</a>
          </div>
        </div>

        {seasonalCollections.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-section-title">{t('header.collectionsNow')}</div>
            <div className="drawer-links">
              {seasonalCollections.slice(0, 6).map((it, idx) => {
                const label = isEn ? (it?.labelEn || it?.labelEs || it?.slug || '') : (it?.labelEs || it?.labelEn || it?.slug || '');
                return (
                  <a key={idx} href={`${isEn ? '/en/search' : '/search'}?q=${encodeURIComponent(label)}&is_ai_search=true`} onClick={() => setMobileMenuOpen(false)}>{label}</a>
                );
              })}
            </div>
          </div>
        )}

        {/* User actions */}
        <div className="drawer-section drawer-actions">
          {token ? (
            <>
              <a href={accountHref} className="drawer-btn" onClick={() => setMobileMenuOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20c0-2.5 3.5-4.5 8-4.5s8 2 8 4.5" stroke="currentColor" strokeWidth="2"/></svg>
                {isEn ? 'My profile' : 'Mi perfil'}
              </a>
              {isAdmin && (
                <a href="/dashboard" className="drawer-btn" onClick={() => setMobileMenuOpen(false)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 13h8V3H3v10Zm10 8h8V3h-8v18ZM3 21h8v-6H3v6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
                  Dashboard
                </a>
              )}
              <button type="button" className="drawer-btn drawer-btn-danger" onClick={() => { setMobileMenuOpen(false); handleLogout(); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10 17l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                {t('header.logout')}
              </button>
            </>
          ) : (
            <a href="/login" className="drawer-btn drawer-btn-primary" onClick={() => setMobileMenuOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 11V8a5 5 0 10-10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/></svg>
              {t('header.login')}
            </a>
          )}
        </div>

        {/* Language + WhatsApp */}
        <div className="drawer-section drawer-footer">
          <div className="drawer-lang-row">
            <button type="button" className={`drawer-lang ${language === 'es' ? 'active' : ''}`} onClick={() => { selectLang('es'); setMobileMenuOpen(false); }}>
              <img src={FLAG_ES_32} alt="ES" width={20} height={20} /> ES
            </button>
            <button type="button" className={`drawer-lang ${language === 'en' ? 'active' : ''}`} onClick={() => { selectLang('en'); setMobileMenuOpen(false); }}>
              <img src={FLAG_EN_32} alt="EN" width={20} height={20} /> EN
            </button>
          </div>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="drawer-btn drawer-btn-whatsapp" onClick={() => setMobileMenuOpen(false)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.77.46 3.43 1.27 4.88L2 22l5.23-1.24C8.7 21.56 10.3 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm.02 3c3.86 0 6.98 3.14 6.98 7s-3.12 7-6.98 7c-1.27 0-2.46-.35-3.48-.94l-.65-.38-2.84.67.74-2.72-.42-.67A6.94 6.94 0 0 1 5.04 12c0-3.86 3.12-7 6.98-7Zm-3.06 3.85c-.17 0-.44.06-.67.32s-.86.84-.86 2.05.88 2.38 1 2.55c.13.17 1.72 2.62 4.16 3.67.58.25 1.04.4 1.39.52.59.19 1.12.16 1.54.1.47-.07 1.45-.59 1.65-1.17.2-.58.2-1.07.14-1.17s-.22-.16-.46-.28c-.25-.12-1.45-.72-1.67-.8-.23-.08-.39-.12-.55.12-.17.25-.65.8-.79.97-.15.17-.3.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.3.37-.44.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42-.14-.01-.31-.01-.48-.01Z"/></svg>
            WhatsApp
          </a>
        </div>
      </div>
    </aside>
    </>
  )
}

export default Header
