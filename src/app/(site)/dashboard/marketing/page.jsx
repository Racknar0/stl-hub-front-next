'use client'

import React from 'react'
import emailMarketingService from '../../../../services/EmailMarketingService'
import useMarketingData from './useMarketingData'
import MarketingStatus from './MarketingStatus'

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
      regla: `Registrados hace menos de ${windows.NEW_DAYS} días. Están recorriendo el embudo.`,
    },
    {
      key: 'activos',
      clase: 's-active',
      nombre: 'Activos',
      cantidad: stages.ACTIVE,
      regla: `Abrieron, hicieron clic, entraron o descargaron en los últimos ${windows.ACTIVE_DAYS} días.`,
    },
    {
      key: 'dormidos',
      clase: 's-sleep',
      nombre: 'Dormidos',
      cantidad: stages.DORMANT,
      regla: `Sin señal de vida en ${windows.ACTIVE_DAYS} días. Reciben el correo de reenganche.`,
    },
    {
      key: 'fuera',
      clase: 's-out',
      nombre: 'Fuera',
      cantidad: stages.OPTED_OUT,
      regla: 'No reaccionaron al reenganche o se dieron de baja. Sin marketing, conservan su cuenta.',
    },
  ]

  return (
    <>
      <MarketingStatus loading={loading} error={error} onRetry={reload} />

      {/* ---------- Métricas ---------- */}
      <section className="mk-stats">
        <article className="mk-stat">
          <span className="label">Contactos</span>
          <span className="value">{contacts}</span>
          <span className="hint">Usuarios registrados en la web</span>
        </article>

        <article className="mk-stat is-warn">
          <span className="label">Envíos hoy</span>
          <span className="value">
            {daily.sentToday}
            <small style={{ fontSize: '1rem', color: '#a0aec0' }}> / {daily.limit}</small>
          </span>
          <div className="mk-bar is-good"><i style={{ width: `${pct(daily.sentToday, daily.limit)}%` }} /></div>
        </article>

        <article className="mk-stat">
          <span className="label">Premium</span>
          <span className="value">{premium}</span>
          <span className="hint">Con suscripción activa</span>
        </article>

        <article className="mk-stat">
          <span className="label">Apertura (30 días)</span>
          <span className="value">{rate(last30.openRate, hayEnvios)}</span>
          <span className="hint">{hayEnvios ? `${last30.sent} correos enviados` : 'Sin envíos registrados aún'}</span>
        </article>

        <article className="mk-stat">
          <span className="label">Clics (30 días)</span>
          <span className="value">{rate(last30.clickRate, hayEnvios)}</span>
          <span className="hint">{last30.unsubscribes} bajas · {last30.spamComplaints} quejas de spam</span>
        </article>
      </section>

      <div className="mk-note" style={{ marginBottom: '1.5rem' }}>
        <span aria-hidden>⚙</span>
        <div>
          <b>Las automatizaciones correrán en nuestro servidor.</b> Brevo solo entrega los correos
          y nos avisa de aperturas, clics y rebotes. Hoy el embudo de bienvenida todavía corre en
          Brevo, así que las métricas de envío se llenarán cuando el motor propio empiece a enviar.
        </div>
      </div>

      {/* ---------- Ciclo de vida ---------- */}
      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>Ciclo de vida del contacto</h2>
          <small>Cada persona está en una sola etapa</small>
        </div>

        <div className="mk-lifecycle">
          {CICLO.map((etapa, i) => (
            <React.Fragment key={etapa.key}>
              <article className={`mk-stage ${etapa.clase}`}>
                <div className="stage-name">{etapa.nombre}</div>
                <div className="stage-count">{etapa.cantidad}</div>
                <p className="stage-rule">{etapa.regla}</p>
              </article>
              {i < CICLO.length - 1 && <span className="mk-arrow" aria-hidden>→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="mk-note" style={{ marginTop: '1.25rem' }}>
          <span aria-hidden>↩</span>
          <div>
            Quien reacciona al reenganche <b>vuelve a Activos</b>. Nadie se borra: salir del
            marketing solo significa dejar de recibir promociones, la cuenta y los correos de
            activación siguen funcionando.
          </div>
        </div>
      </section>

      {/* ---------- Qué decide cada cosa ---------- */}
      <section className="mk-grid-2">
        <article className="mk-card">
          <div className="mk-card-title"><h2>Señales que usamos</h2></div>
          <table className="mk-table">
            <thead>
              <tr>
                <th>Señal</th>
                <th>Origen</th>
                <th>Fiable</th>
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
          <div className="mk-note is-warn" style={{ marginTop: '1rem' }}>
            <span aria-hidden>!</span>
            <div>
              La apertura falla cuando el lector bloquea imágenes y se dispara sola en Apple Mail.
              Por eso un contacto solo cuenta como dormido si <b>tampoco entra ni descarga</b>.
            </div>
          </div>
        </article>

        <article className="mk-card">
          <div className="mk-card-title"><h2>Próximos pasos</h2></div>
          <table className="mk-table">
            <thead>
              <tr>
                <th>Paso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Webhook de Brevo a este panel</td>
                <td><span className="mk-tag t-on">Activo</span></td>
              </tr>
              <tr>
                <td>Motor de envíos propio (cola + cupo diario)</td>
                <td><span className="mk-tag t-draft">Planificado</span></td>
              </tr>
              <tr>
                <td>Embudo de bienvenida desde el servidor</td>
                <td><span className="mk-tag t-draft">Planificado</span></td>
              </tr>
              <tr>
                <td>Reenganche y limpieza de dormidos</td>
                <td><span className="mk-tag t-draft">Planificado</span></td>
              </tr>
              <tr>
                <td>Novedades periódicas</td>
                <td><span className="mk-tag t-draft">Planificado</span></td>
              </tr>
            </tbody>
          </table>
        </article>
      </section>
    </>
  )
}
