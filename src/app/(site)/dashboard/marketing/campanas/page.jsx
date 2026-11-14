'use client'

import React from 'react'
import emailMarketingService from '../../../../../services/EmailMarketingService'
import useMarketingData from '../useMarketingData'
import MarketingStatus from '../MarketingStatus'
import { CAMPANAS, ETIQUETAS_ESTADO } from '../demoData'

// Reparto del reenganche en tandas crecientes: 100, 200 y el resto.
const repartirTandas = (total) => {
  const tandas = []
  let restante = total
  for (const tope of [100, 200, Infinity]) {
    if (restante <= 0) break
    const cantidad = Math.min(restante, tope)
    tandas.push({ dia: `Día ${tandas.length + 1}`, cantidad })
    restante -= cantidad
  }
  return tandas
}

export default function MarketingCampanas() {
  const { data, error, loading, reload } = useMarketingData(() => emailMarketingService.audiences(), [])

  if (!data) return <MarketingStatus loading={loading} error={error} onRetry={reload} />

  const destinatarios = {
    Dormidos: data.stages.DORMANT,
    Activos: data.stages.ACTIVE,
  }
  const tandas = repartirTandas(data.stages.DORMANT)

  return (
    <>
      <MarketingStatus loading={loading} error={error} onRetry={reload} />

      <section className="mk-card" style={{ marginBottom: '1.5rem' }}>
        <div className="mk-card-title">
          <h2>Campañas</h2>
          <small>Planificadas: se activarán con el motor de envíos propio</small>
        </div>

        <table className="mk-table">
          <thead>
            <tr>
              <th>Campaña</th>
              <th>Tipo</th>
              <th>Audiencia</th>
              <th className="num">Destinatarios</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {CAMPANAS.map((c) => {
              const estado = ETIQUETAS_ESTADO[c.estado]
              return (
                <tr key={c.nombre}>
                  <td>
                    <b>{c.nombre}</b>
                    <div style={{ color: '#a0aec0', fontSize: '0.78rem', marginTop: 2 }}>{c.nota}</div>
                  </td>
                  <td>{c.tipo}</td>
                  <td>{c.audiencia}</td>
                  <td className="num">{destinatarios[c.audiencia] ?? 0}</td>
                  <td><span className={`mk-tag ${estado.clase}`}>{estado.texto}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="mk-grid-2">
        <article className="mk-card">
          <div className="mk-card-title">
            <h2>Reenganche · plan de envío</h2>
            <small>{data.stages.DORMANT} destinatarios</small>
          </div>

          <table className="mk-table">
            <thead>
              <tr>
                <th>Tanda</th>
                <th className="num">Correos</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {tandas.map((t) => (
                <tr key={t.dia}>
                  <td>{t.dia}</td>
                  <td className="num">{t.cantidad}</td>
                  <td><span className="mk-tag t-wait">Pendiente</span></td>
                </tr>
              ))}
              {tandas.length === 0 && (
                <tr><td colSpan={3} style={{ color: '#a0aec0' }}>No hay contactos dormidos.</td></tr>
              )}
            </tbody>
          </table>

          <div className="mk-note is-warn" style={{ marginTop: '1rem' }}>
            <span aria-hidden>!</span>
            <div>
              Se reparte en tandas crecientes porque el dominio es nuevo. Soltar todo de golpe es
              la forma más rápida de acabar en spam.
            </div>
          </div>
        </article>

        <article className="mk-card">
          <div className="mk-card-title"><h2>Qué pasa después del reenganche</h2></div>

          <div className="mk-lifecycle" style={{ flexDirection: 'column', gap: 10 }}>
            <article className="mk-stage s-active">
              <div className="stage-name">Reaccionó</div>
              <p className="stage-rule">Abrió o hizo clic. Vuelve a Activos y entra en las novedades.</p>
            </article>

            <article className="mk-stage s-out">
              <div className="stage-name">No reaccionó</div>
              <p className="stage-rule">
                Pasa a bloqueado tras {data.windows.REENGAGE_GRACE_DAYS} días. Deja de contar en las estadísticas.
              </p>
            </article>
          </div>
        </article>
      </section>
    </>
  )
}
