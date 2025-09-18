'use client'

import React from 'react'
import Link from 'next/link'
import './Header.scss'
import Button from '../Buttons/Button'
import useStore from '../../../store/useStore'
import { useRouter } from 'next/navigation'
import { confirmAlert } from '../../../helpers/alerts'

const Header = () => {
  const token = useStore((s) => s.token)
  const roleId = useStore((s) => s.roleId)
  const logout = useStore((s) => s.logout)
  const router = useRouter()

  const handleLogout = async () => {
    const ok = await confirmAlert('Cerrar sesión', '¿Deseas cerrar sesión?', 'Cerrar sesión', 'Cancelar', 'warning')
    if (!ok) return
    await logout()
    router.push('/')
  }

  const isAdmin = roleId === 2

  return (
    <header className="app-header">
      <div className="container-narrow">
        <nav className="navbar d-flex align-items-center justify-content-between">
          <Link href="/" className="brand d-flex align-items-center" aria-label="STL HUB home">
            <img src="/logo_horizontal_final.png" alt="STL HUB" className="brand-logo" />
          </Link>

          {/* Botón flotante Explorar (desktop) */}
          <div className="explore-wrap d-none d-lg-block">
            <button type="button" className="explore-btn" aria-haspopup="true" aria-expanded="false">
              <span className="icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              Explorar
            </button>

            <div className="mega-menu" role="menu" aria-label="Explorar">
              <div className="mega-container">
                <div className="col">
                  <div className="col-title">Categorías</div>
                  <ul>
                    <li>Todo</li>
                    <li>Arte</li>
                    <li>Moda</li>
                    <li>Joyería</li>
                    <li>Casa</li>
                    <li>Arquitectura</li>
                    <li>Artilugios</li>
                    <li>Juegos</li>
                    <li>Herramientas</li>
                    <li>Pícaro</li>
                    <li>Variado</li>
                  </ul>
                </div>

                <div className="col">
                  <div className="col-title">CNC & Láser</div>
                  <ul>
                    <li>Todos los modelos</li>
                    <li>Mejores archivos</li>
                  </ul>

                  <div className="col-title mt-3">Concursos actuales</div>
                  <ul>
                    <li>Libros y Lectura</li>
                  </ul>
                </div>

                <div className="col">
                  <div className="col-title">Colecciones del momento</div>
                  <ul>
                    <li>Colgadores de pared</li>
                    <li>Muebles</li>
                    <li>Cosplay</li>
                    <li>Marcos</li>
                    <li>Halloween</li>
                  </ul>
                </div>

                <div className="col">
                  <div className="col-title">Tops</div>
                  <ul>
                    <li>Selección STL Hub</li>
                    <li>Diseños más populares</li>
                    <li>Top diseños</li>
                    <li>Más vendidos</li>
                    <li>Archivos más descargados</li>
                  </ul>
                </div>

                <div className="col">
                  <div className="col-title">Explorar</div>
                  <ul>
                    <li>Ideas para impresión 3D</li>
                    <li>Búsquedas frecuentes</li>
                    <li>Glosario de impresión 3D</li>
                    <li>Modelos 3D tendencia</li>
                    <li>Últimos modelos 3D</li>
                    <li>Al azar</li>
                  </ul>

                  <div className="col-title mt-3">Comunidad</div>
                  <ul>
                    <li>Diseños Seguidos</li>
                    <li>Actividad</li>
                    <li>Mejores diseñadores</li>
                    <li>Marcas</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Búsqueda inline solo en desktop */}
          <div className="search-inline d-none d-lg-flex flex-grow-1 px-3" role="search">
            <form className="search-form w-100" onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                placeholder="Buscar modelos, categorías o etiquetas..."
                aria-label="Buscar"
              />
              <button type="submit" className="search-btn" aria-label="Buscar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>
          </div>

          <div className="header-cta d-flex gap-2">
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
                    aria-label="Cuenta"
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
                  aria-label="Cerrar sesión"
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
                aria-label="Login"
                icon={(
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M17 11V8a5 5 0 10-10 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              >
                Login
              </Button>
            )}
          </div>
        </nav>

        {/* Búsqueda móvil (debajo), visible solo en < lg */}
        <div className="search-panel d-lg-none" role="search">
          <form className="search-form" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Buscar modelos, categorías o etiquetas..."
              aria-label="Buscar"
            />
            <button type="submit" className="search-btn" aria-label="Buscar">
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
