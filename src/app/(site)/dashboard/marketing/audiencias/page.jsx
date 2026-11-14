'use client'

import React, { useState } from 'react'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'
import Ayuda from '../Ayuda'

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
      regla: `Señal de vida en ${windows.ACTIVE_DAYS} días`,
      ayuda: `Abrieron o hicieron clic en un correo, iniciaron sesión o descargaron un modelo en los últimos ${windows.ACTIVE_DAYS} días. Reciben las novedades periódicas.`,
      contactos: stages.ACTIVE,
    },
    {
      nombre: 'Dormidos',
      regla: `Sin señales en ${windows.ACTIVE_DAYS} días`,
      ayuda: `Tienen que cumplirse todas a la vez durante ${windows.ACTIVE_DAYS} días: no abrieron ni hicieron clic en ningún correo, no iniciaron sesión y no descargaron nada. Además llevan más de ${windows.DORMANT_MIN_AGE_DAYS} días registrados, para no perseguir a quien acaba de llegar. Reciben el reenganche.`,
      contactos: stages.DORMANT,
    },
    {
      nombre: 'Nuevos',
      regla: `Registro hace menos de ${windows.NEW_DAYS} días`,
      ayuda: 'Están recorriendo el embudo de bienvenida. Mientras tanto no se evalúan como activos ni dormidos.',
      contactos: stages.NEW,
    },
    {
      nombre: 'Premium',
      regla: 'Suscripción activa',
      ayuda: 'Usuarios con suscripción activa. Es independiente de la etapa y se usa para no enviarles los correos de venta de Premium.',
      contactos: premium,
    },
    {
      nombre: 'Bloqueados',
      regla: 'Sin marketing',
      ayuda: `Salen del marketing si no reaccionan al reenganche en ${windows.REENGAGE_GRACE_DAYS} días, o al instante si se dan de baja, marcan el correo como spam o su dirección rebota de forma permanente. Siguen teniendo cuenta y reciben correos de activación y contraseña.`,
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
          <h2>
            Audiencias
            <Ayuda texto="Grupos de contactos que se calculan solos con las señales de la web y del correo. Sirven para elegir a quién va cada campaña." />
          </h2>
        </div>

        <table className="mk-table">
          <thead>
            <tr>
              <th>Audiencia</th>
              <th>Criterio</th>
              <th className="num">Contactos</th>
            </tr>
          </thead>
          <tbody>
            {AUDIENCIAS.map((a) => (
              <tr key={a.nombre}>
                <td>
                  <b>{a.nombre}</b>
                  <Ayuda texto={a.ayuda} />
                </td>
                <td style={{ color: '#a0aec0' }}>{a.regla}</td>
                <td className="num">{a.contactos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mk-card">
        <div className="mk-card-title">
          <h2>
            Contactos
            <Ayuda texto="Lista de personas de la etapa elegida, de la más reciente a la más antigua en su última señal." />
          </h2>
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
                  <th>
                    Última señal
                    <Ayuda texto="Su actividad más reciente entre iniciar sesión, descargar un modelo, abrir un correo o hacer clic. Un guion significa que nunca dio ninguna." />
                  </th>
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
    </>
  )
}
