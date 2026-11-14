'use client'

import React, { useState } from 'react'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'

const PAGE_SIZE = 25

const fecha = (valor) => (valor ? new Date(valor).toLocaleDateString('es') : '—')

const ETAPAS = [
  { key: 'NEW', nombre: 'Nuevos' },
  { key: 'ACTIVE', nombre: 'Activos' },
  { key: 'DORMANT', nombre: 'Dormidos' },
  { key: 'OPTED_OUT', nombre: 'Bloqueados' },
]

export default function MarketingAudiencias() {
  const [etapa, setEtapa] = useState('DORMANT')
  const [pagina, setPagina] = useState(1)

  const resumen = useMarketingData(() => emailMarketingService.audiences(), [])
  const lista = useMarketingData(
    () => emailMarketingService.audience(etapa, pagina, PAGE_SIZE),
    [etapa, pagina]
  )

  if (!resumen.data) {
    return <MarketingStatus loading={resumen.loading} error={resumen.error} onRetry={resumen.reload} />
  }

  const { stages, premium, windows } = resumen.data

  const AUDIENCIAS = [
    {
      nombre: 'Activos',
      regla: `Abrió, hizo clic, inició sesión o descargó · últimos ${windows.ACTIVE_DAYS} días`,
      contactos: stages.ACTIVE,
    },
    {
      nombre: 'Dormidos',
      regla: `Sin ninguna señal · ${windows.ACTIVE_DAYS} días · registro hace más de ${windows.DORMANT_MIN_AGE_DAYS} días`,
      contactos: stages.DORMANT,
    },
    {
      nombre: 'Nuevos',
      regla: `Registrados en los últimos ${windows.NEW_DAYS} días`,
      contactos: stages.NEW,
    },
    {
      nombre: 'Premium',
      regla: 'Con suscripción activa · excluidos de los correos de venta',
      contactos: premium,
    },
    {
      nombre: 'Bloqueados',
      regla: 'Baja voluntaria, rebote duro, queja de spam o sin reacción al reenganche',
      contactos: stages.OPTED_OUT,
    },
  ]

  const totalPaginas = lista.data ? Math.max(1, Math.ceil(lista.data.total / PAGE_SIZE)) : 1

  const elegir = (key) => {
    setEtapa(key)
    setPagina(1)
  }

  return (
    <>
      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>Audiencias</h2>
          <small>Se calculan solas con las señales de la web y del correo</small>
        </div>

        <table className="mk-table">
          <thead>
            <tr>
              <th>Audiencia</th>
              <th>Regla</th>
              <th className="num">Contactos</th>
            </tr>
          </thead>
          <tbody>
            {AUDIENCIAS.map((a) => (
              <tr key={a.nombre}>
                <td><b>{a.nombre}</b></td>
                <td style={{ color: '#a0aec0' }}>{a.regla}</td>
                <td className="num">{a.contactos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>Contactos</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ETAPAS.map((e) => (
              <button
                key={e.key}
                type="button"
                className={`mk-btn${etapa === e.key ? ' is-primary' : ''}`}
                onClick={() => elegir(e.key)}
              >
                {e.nombre}
              </button>
            ))}
          </div>
        </div>

        <MarketingStatus loading={lista.loading} error={lista.error} onRetry={lista.reload} />

        {lista.data && (
          <>
            <table className="mk-table">
              <thead>
                <tr>
                  <th>Correo</th>
                  <th>Registro</th>
                  <th>Última señal</th>
                  <th>Plan</th>
                </tr>
              </thead>
              <tbody>
                {lista.data.items.map((c) => (
                  <tr key={c.userId ?? c.email}>
                    <td>{c.email}</td>
                    <td>{fecha(c.createdAt)}</td>
                    <td>{fecha(c.lastSignal)}</td>
                    <td>
                      <span className={`mk-tag ${c.isPremium ? 't-on' : 't-off'}`}>
                        {c.isPremium ? 'Premium' : 'Gratis'}
                      </span>
                    </td>
                  </tr>
                ))}
                {lista.data.items.length === 0 && (
                  <tr><td colSpan={4} style={{ color: '#a0aec0' }}>No hay contactos en esta etapa.</td></tr>
                )}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <small style={{ color: '#a0aec0' }}>
                {lista.data.total} contactos · página {pagina} de {totalPaginas}
              </small>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="mk-btn"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="mk-btn"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="mk-grid-2">
        <article className="mk-card">
          <div className="mk-card-title"><h2>Cuándo pasa a Dormido</h2></div>
          <p style={{ color: '#a0aec0', fontSize: '0.88rem', lineHeight: 1.6 }}>
            Tienen que cumplirse <b style={{ color: '#fff' }}>todas</b> a la vez durante {windows.ACTIVE_DAYS} días:
          </p>
          <ul style={{ color: '#cbd5e0', fontSize: '0.88rem', lineHeight: 1.9, paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
            <li>No abrió ningún correo</li>
            <li>No hizo clic en ningún enlace</li>
            <li>No inició sesión en la web</li>
            <li>No descargó ningún modelo</li>
          </ul>
          <p style={{ color: '#a0aec0', fontSize: '0.82rem', marginTop: '0.75rem' }}>
            Además tiene que llevar más de {windows.DORMANT_MIN_AGE_DAYS} días registrado, para no
            perseguir a quien acaba de llegar.
          </p>
        </article>

        <article className="mk-card">
          <div className="mk-card-title"><h2>Cuándo sale del marketing</h2></div>
          <p style={{ color: '#a0aec0', fontSize: '0.88rem', lineHeight: 1.6 }}>
            Solo después de haber recibido el reenganche y no haber reaccionado en {windows.REENGAGE_GRACE_DAYS} días.
            También sale al instante si:
          </p>
          <ul style={{ color: '#cbd5e0', fontSize: '0.88rem', lineHeight: 1.9, paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
            <li>Pulsa «darme de baja»</li>
            <li>Marca el correo como spam</li>
            <li>Su dirección rebota de forma permanente</li>
          </ul>
          <div className="mk-note" style={{ marginTop: '1rem' }}>
            <span aria-hidden>i</span>
            <div>Sigue teniendo cuenta y recibiendo activación y contraseña. Solo deja de recibir promociones.</div>
          </div>
        </article>
      </section>
    </>
  )
}
