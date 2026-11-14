'use client'

import React from 'react'
import emailMarketingService from '../../../../services/EmailMarketingService'
import useMarketingData from './useMarketingData'
import MarketingStatus from './MarketingStatus'
import Ayuda from './Ayuda'

const pct = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0)
const rate = (valor, hayEnvios) => (hayEnvios ? `${valor}%` : '—')

export default function MarketingResumen() {
  const { data, error, loading, reload } = useMarketingData(() => emailMarketingService.overview(), [])

  if (!data) return <MarketingStatus loading={loading} error={error} onRetry={reload} />

  const { contacts, stages, premium, windows, daily, last30 } = data
  const hayEnvios = last30.sent > 0

  const CICLO = [
    {
      key: 'nuevos',
      clase: 's-new',
      nombre: 'Nuevos',
      cantidad: stages.NEW,
      ayuda: `Personas registradas hace menos de ${windows.NEW_DAYS} días. Están recibiendo el embudo de bienvenida (4 correos). Todavía no se les puede considerar activos ni dormidos.`,
    },
    {
      key: 'activos',
      clase: 's-active',
      nombre: 'Activos',
      cantidad: stages.ACTIVE,
      ayuda: `Dieron alguna señal de vida en los últimos ${windows.ACTIVE_DAYS} días: abrieron o hicieron clic en un correo, iniciaron sesión o descargaron un modelo. Reciben las novedades periódicas.`,
    },
    {
      key: 'dormidos',
      clase: 's-sleep',
      nombre: 'Dormidos',
      cantidad: stages.DORMANT,
      ayuda: `Llevan más de ${windows.ACTIVE_DAYS} días sin ninguna señal (ni correo, ni sesión, ni descarga) y más de ${windows.DORMANT_MIN_AGE_DAYS} días registrados. Son los que reciben el correo de reenganche para ver si siguen interesados.`,
    },
    {
      key: 'fuera',
      clase: 's-out',
      nombre: 'Fuera',
      cantidad: stages.OPTED_OUT,
      ayuda: `Ya no reciben promociones: no reaccionaron al reenganche en ${windows.REENGAGE_GRACE_DAYS} días, se dieron de baja, marcaron spam o su correo rebota. No se borran: conservan su cuenta y siguen recibiendo correos de activación y contraseña.`,
    },
  ]

  return (
    <>
      <MarketingStatus loading={loading} error={error} onRetry={reload} />

      {data.queue?.failed > 0 && (
        <div className="mk-note is-warn" style={{ marginBottom: '1.5rem' }}>
          <span>
            <b>{data.queue.failed} correo(s) fallido(s).</b> Brevo los rechazó 3 veces. Mira el motivo en la pestaña Embudos.
          </span>
        </div>
      )}

      {/* ---------- Métricas ---------- */}
      <section className="mk-stats">
        <article className="mk-stat">
          <span className="label">
            Contactos
            <Ayuda texto="Todos los usuarios registrados en la web. Cada uno está en una sola etapa del ciclo de vida." />
          </span>
          <span className="value">{contacts}</span>
        </article>

        <article className="mk-stat is-warn">
          <span className="label">
            Envíos hoy
            <Ayuda texto={`Correos enviados hoy sobre el tope diario de ${daily.limit} del plan de Brevo. Lo que no cabe espera al día siguiente.`} />
          </span>
          <span className="value">
            {daily.sentToday}
            <small style={{ fontSize: '1rem', color: '#a0aec0' }}> / {daily.limit}</small>
          </span>
          <div className="mk-bar is-good"><i style={{ width: `${pct(daily.sentToday, daily.limit)}%` }} /></div>
        </article>

        <article className="mk-stat">
          <span className="label">
            En cola
            <Ayuda texto="Correos del embudo ya programados que aún no salen. Se envían a la hora que les toca, sin pasar del tope diario." />
          </span>
          <span className="value">{data.queue?.queued ?? 0}</span>
          <span className="hint">
            {data.queue?.engineEnabled ? 'Motor encendido' : 'Motor apagado'}
            {data.queue?.nextAt && ` · próximo ${new Date(data.queue.nextAt).toLocaleString()}`}
          </span>
        </article>

        <article className="mk-stat">
          <span className="label">
            Premium
            <Ayuda texto="Usuarios con una suscripción activa. No reciben los correos de venta de Premium." />
          </span>
          <span className="value">{premium}</span>
        </article>

        <article className="mk-stat">
          <span className="label">
            Apertura
            <Ayuda texto="Porcentaje de correos abiertos en los últimos 30 días. Es solo orientativo: falla si el lector bloquea imágenes y Apple Mail abre los correos por su cuenta. Muestra un guion mientras no haya envíos registrados." />
          </span>
          <span className="value">{rate(last30.openRate, hayEnvios)}</span>
          <span className="hint">{hayEnvios ? `${last30.sent} correos en 30 días` : '30 días'}</span>
        </article>

        <article className="mk-stat">
          <span className="label">
            Clics
            <Ayuda texto="Porcentaje de correos con al menos un clic en los últimos 30 días. Es la señal de correo más fiable. Debajo se cuentan las bajas y las quejas de spam del mismo periodo." />
          </span>
          <span className="value">{rate(last30.clickRate, hayEnvios)}</span>
          <span className="hint">{last30.unsubscribes} bajas · {last30.spamComplaints} spam</span>
        </article>
      </section>

      {/* ---------- Ciclo de vida ---------- */}
      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>
            Ciclo de vida del contacto
            <Ayuda texto="Cada persona está en una sola etapa, que se recalcula con sus señales de la web y del correo. Quien reacciona al reenganche vuelve a Activos. Nadie se borra: salir del marketing solo corta las promociones." />
          </h2>
        </div>

        <div className="mk-lifecycle">
          {CICLO.map((etapa, i) => (
            <React.Fragment key={etapa.key}>
              <article className={`mk-stage ${etapa.clase}`}>
                <div className="stage-name">
                  {etapa.nombre}
                  <Ayuda texto={etapa.ayuda} />
                </div>
                <div className="stage-count">{etapa.cantidad}</div>
              </article>
              {i < CICLO.length - 1 && <span className="mk-arrow" aria-hidden>→</span>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ---------- Señales ---------- */}
      <section className="mk-card">
        <div className="mk-card-title">
          <h2>
            Señales que usamos
            <Ayuda texto="Lo que se mira para decidir en qué etapa está cada contacto. Alguien solo es dormido si no dio ninguna de estas señales, por eso la apertura nunca decide sola." />
          </h2>
        </div>
        <table className="mk-table">
          <thead>
            <tr>
              <th>Señal</th>
              <th>Origen</th>
              <th>
                Fiable
                <Ayuda texto="Qué tanto se puede confiar en la señal. La apertura falla cuando el lector bloquea imágenes y se dispara sola en Apple Mail." />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Abrió un correo</td>
              <td>Brevo</td>
              <td><span className="mk-tag t-wait">A medias</span></td>
            </tr>
            <tr>
              <td>Hizo clic</td>
              <td>Brevo</td>
              <td><span className="mk-tag t-on">Sí</span></td>
            </tr>
            <tr>
              <td>Inició sesión</td>
              <td>STL Gratis</td>
              <td><span className="mk-tag t-on">Sí</span></td>
            </tr>
            <tr>
              <td>Descargó un modelo</td>
              <td>STL Gratis</td>
              <td><span className="mk-tag t-on">Sí</span></td>
            </tr>
            <tr>
              <td>Compró Premium</td>
              <td>STL Gratis</td>
              <td><span className="mk-tag t-on">Sí</span></td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  )
}
